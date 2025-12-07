import {spawn, ChildProcess} from 'child_process';
import fs from 'fs';
import path from 'path';
import logger from '@shared/logger';
import {SCRIPTS_DIR} from '@shared/configs';
import {TestStatus} from '@domains/test/models/enums';
import {TestResultRepository} from '@domains/test/repositories';
import {TestInfo, TestMetadata, LogEntry, LogListener} from '@domains/test/models/types';
import {K6TestExecutor} from './K6TestExecutor';

/**
 * Local k6 executor that runs tests on the same machine using the k6 CLI.
 * Tests are executed as child processes.
 */
export class LocalK6TestExecutor implements K6TestExecutor {
  private readonly runningTests: Map<string, TestInfo>;
  private readonly repository: TestResultRepository;
  private readonly scriptsDir: string;

  constructor(repository: TestResultRepository, scriptsDir: string = SCRIPTS_DIR) {
    this.runningTests = new Map();
    this.repository = repository;
    this.scriptsDir = scriptsDir;
  }

  runTest(script: string, metadata: TestMetadata = {}): string {
    const testId = `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const scriptPath = path.join(this.scriptsDir, `k6-script-${testId}.js`);
    const summaryPath = path.join(this.scriptsDir, `k6-summary-${testId}.json`);

    try {
      fs.writeFileSync(scriptPath, script);
    } catch (err) {
      logger.error(`Failed to write script file: ${(err as Error).message}`);
      throw new Error(`Failed to create test script: ${(err as Error).message}`);
    }

    let k6Process: ChildProcess;
    try {
      k6Process = spawn('k6', ['run', '--summary-export', summaryPath, scriptPath]);
    } catch (err) {
      logger.error(`Failed to spawn k6 process: ${(err as Error).message}`);
      try {
        fs.unlinkSync(scriptPath);
      } catch (cleanupErr) {
        logger.error(`Failed to cleanup script file: ${(cleanupErr as Error).message}`);
      }
      throw new Error(`Failed to start k6 process: ${(err as Error).message}`);
    }

    const testInfo: TestInfo = {
      testId,
      process: k6Process,
      status: TestStatus.RUNNING,
      startTime: Date.now(),
      script,
      scriptPath,
      summaryPath,
      logs: [],
      logListeners: [],
      name: metadata.name,
      config: metadata.config,
    };

    this.runningTests.set(testId, testInfo);
    this.setupProcessHandlers(testId, testInfo, scriptPath);

    return testId;
  }

  stopTest(testId: string): boolean {
    if (!this.runningTests.has(testId)) {
      return false;
    }

    const test = this.runningTests.get(testId);
    if (test) {
      test.process.kill('SIGTERM');
      test.status = TestStatus.STOPPED;
    }
    return true;
  }

  stopAllTests(): string[] {
    const stoppedTests: string[] = [];

    for (const [testId, test] of this.runningTests.entries()) {
      try {
        test.process.kill('SIGTERM');
        test.status = TestStatus.STOPPED;
        stoppedTests.push(testId);
      } catch (err) {
        logger.error(`Failed to stop test ${testId}: ${(err as Error).message}`);
      }
    }

    return stoppedTests;
  }

  getRunningTest(testId: string): TestInfo | undefined {
    return this.runningTests.get(testId);
  }

  getAllRunningTests(): Map<string, TestInfo> {
    return this.runningTests;
  }

  addLogListener(testId: string, listener: LogListener): boolean {
    const test = this.runningTests.get(testId);
    if (test) {
      test.logListeners.push(listener);
      return true;
    }
    return false;
  }

  removeLogListener(testId: string, listener: LogListener): boolean {
    const test = this.runningTests.get(testId);
    if (test) {
      const index = test.logListeners.indexOf(listener);
      if (index > -1) {
        test.logListeners.splice(index, 1);
      }
      return true;
    }
    return false;
  }

  private setupProcessHandlers(testId: string, testInfo: TestInfo, scriptPath: string): void {
    const {process: k6Process} = testInfo;

    k6Process.stdout?.on('data', (data: Buffer) => {
      const logEntry: LogEntry = {
        type: 'stdout',
        timestamp: Date.now(),
        message: data.toString(),
      };
      testInfo.logs.push(logEntry);

      for (const listener of testInfo.logListeners) {
        listener(logEntry);
      }
    });

    k6Process.stderr?.on('data', (data: Buffer) => {
      const logEntry: LogEntry = {
        type: 'stderr',
        timestamp: Date.now(),
        message: data.toString(),
      };
      testInfo.logs.push(logEntry);

      for (const listener of testInfo.logListeners) {
        listener(logEntry);
      }
    });

    k6Process.on('close', (code: number | null) => {
      this.handleProcessClose(testId, testInfo, code, scriptPath);
    });

    k6Process.on('error', (err: Error) => {
      const logEntry: LogEntry = {
        type: 'error',
        timestamp: Date.now(),
        message: `Process error: ${err.message}`,
      };
      testInfo.logs.push(logEntry);
      for (const listener of testInfo.logListeners) {
        listener(logEntry);
      }

      testInfo.status = TestStatus.FAILED;
    });
  }

  private handleProcessClose(
    testId: string,
    testInfo: TestInfo,
    code: number | null,
    scriptPath: string
  ): void {
    const endTime = Date.now();
    const duration = endTime - testInfo.startTime;

    let status = TestStatus.COMPLETED;
    if (code !== 0 && testInfo.status !== TestStatus.STOPPED) {
      status = TestStatus.FAILED;
    } else if (testInfo.status === TestStatus.STOPPED) {
      status = TestStatus.STOPPED;
    }

    let summary = null;
    try {
      if (fs.existsSync(testInfo.summaryPath)) {
        const summaryContent = fs.readFileSync(testInfo.summaryPath, 'utf-8');
        summary = JSON.parse(summaryContent);
      }
    } catch (err) {
      logger.error(`Failed to read summary JSON: ${(err as Error).message}`);
    }

    const result = {
      testId,
      status,
      startTime: testInfo.startTime,
      endTime,
      duration,
      exitCode: code,
      script: testInfo.script,
      name: testInfo.name,
      config: testInfo.config,
      summary,
    };

    // Save test result asynchronously
    this.repository.save(testId, result).catch(err => {
      logger.error(`Failed to save test result: ${(err as Error).message}`);
    });

    const logEntry: LogEntry = {
      type: 'system',
      timestamp: Date.now(),
      message: `Test completed with exit code ${code}`,
    };
    for (const listener of testInfo.logListeners) {
      listener(logEntry);
    }

    // Cleanup files
    this.cleanupTestFiles(scriptPath, testInfo.summaryPath);
    this.runningTests.delete(testId);
  }

  private cleanupTestFiles(scriptPath: string, summaryPath: string): void {
    try {
      fs.unlinkSync(scriptPath);
    } catch (err) {
      logger.error(`Failed to delete script file: ${(err as Error).message}`);
    }

    try {
      if (fs.existsSync(summaryPath)) {
        fs.unlinkSync(summaryPath);
      }
    } catch (err) {
      logger.error(`Failed to delete summary file: ${(err as Error).message}`);
    }
  }
}
