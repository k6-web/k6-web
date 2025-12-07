import {spawn} from 'child_process';
import fs from 'fs';
import path from 'path';
import logger from '../commons/logger';
import {SCRIPTS_DIR} from '../commons/configs';
import {TestStatus} from './enums';
import {saveTestResult} from './resultManager';
import {TestInfo, TestMetadata, LogEntry, LogListener} from './types';

const runningTests = new Map<string, TestInfo>();

export function runTest(script: string, metadata: TestMetadata = {}): string {
  const testId = `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const scriptPath = path.join(SCRIPTS_DIR, `k6-script-${testId}.js`);
  const summaryPath = path.join(SCRIPTS_DIR, `k6-summary-${testId}.json`);

  try {
    fs.writeFileSync(scriptPath, script);
  } catch (err) {
    logger.error(`Failed to write script file: ${(err as Error).message}`);
    throw new Error(`Failed to create test script: ${(err as Error).message}`);
  }

  let k6Process;
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

  runningTests.set(testId, testInfo);

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
    saveTestResult(testId, result).catch(err => {
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

    try {
      fs.unlinkSync(scriptPath);
    } catch (err) {
      logger.error(`Failed to delete script file: ${(err as Error).message}`);
    }

    try {
      if (fs.existsSync(testInfo.summaryPath)) {
        fs.unlinkSync(testInfo.summaryPath);
      }
    } catch (err) {
      logger.error(`Failed to delete summary file: ${(err as Error).message}`);
    }

    runningTests.delete(testId);
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

  return testId;
}

export function stopTest(testId: string): boolean {
  if (!runningTests.has(testId)) {
    return false;
  }

  const test = runningTests.get(testId);
  if (test) {
    test.process.kill('SIGTERM');
    test.status = TestStatus.STOPPED;
  }
  return true;
}

export function stopAllTests(): string[] {
  const stoppedTests: string[] = [];

  for (const [testId, test] of runningTests.entries()) {
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

export function getRunningTest(testId: string): TestInfo | undefined {
  return runningTests.get(testId);
}

export function getAllRunningTests(): Map<string, TestInfo> {
  return runningTests;
}

export function addLogListener(testId: string, listener: LogListener): boolean {
  const test = runningTests.get(testId);
  if (test) {
    test.logListeners.push(listener);
    return true;
  }
  return false;
}

export function removeLogListener(testId: string, listener: LogListener): boolean {
  const test = runningTests.get(testId);
  if (test) {
    const index = test.logListeners.indexOf(listener);
    if (index > -1) {
      test.logListeners.splice(index, 1);
    }
    return true;
  }
  return false;
}
