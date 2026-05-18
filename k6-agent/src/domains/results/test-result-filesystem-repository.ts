import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import logger from '@shared/logger/logger';
import {MAX_RESULT_FILES, RESULTS_DIR} from '@shared/configs';
import {TestResult} from '@domains/test/test-types';
import {TestResultRepository} from './test-result-repository';

export class TestResultFilesystemRepository implements TestResultRepository {
  private readonly resultsDir: string;
  private readonly maxResultFiles: number;
  private saveCount = 0;
  private readonly cleanupInterval: number;

  constructor(resultsDir: string = RESULTS_DIR, maxResultFiles: number = MAX_RESULT_FILES, cleanupInterval: number = 10) {
    this.resultsDir = resultsDir;
    this.maxResultFiles = maxResultFiles;
    this.cleanupInterval = cleanupInterval;
  }

  async save(testId: string, result: TestResult): Promise<void> {
    const resultFile = path.join(this.resultsDir, `${testId}.json`);
    await fs.writeFile(resultFile, JSON.stringify(result));
    this.saveCount++;
    if (this.saveCount % this.cleanupInterval === 0) {
      await this.cleanupOldResults();
    }
  }

  findById(testId: string): TestResult | null {
    const resultFile = path.join(this.resultsDir, `${testId}.json`);
    try {
      const content = fsSync.readFileSync(resultFile, 'utf8');
      return JSON.parse(content) as TestResult;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      logger.error(`Failed to read test result: ${(err as Error).message}`);
      return null;
    }
  }

  findAll(): TestResult[] {
    const results: TestResult[] = [];
    try {
      const files = fsSync.readdirSync(this.resultsDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const resultFile = path.join(this.resultsDir, file);
          const content = fsSync.readFileSync(resultFile, 'utf8');
          const result = JSON.parse(content) as TestResult;
          results.push(result);
        }
      }
    } catch (err) {
      logger.error(`Failed to read test results: ${(err as Error).message}`);
    }
    return results;
  }

  deleteById(testId: string): boolean {
    const resultFile = path.join(this.resultsDir, `${testId}.json`);
    try {
      fsSync.unlinkSync(resultFile);
      return true;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
      logger.error(`Failed to delete test result: ${(err as Error).message}`);
      return false;
    }
  }

  findByScriptId(scriptId: string): TestResult[] {
    const results: TestResult[] = [];
    try {
      const files = fsSync.readdirSync(this.resultsDir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const resultFile = path.join(this.resultsDir, file);
        try {
          const content = fsSync.readFileSync(resultFile, 'utf8');
          const result = JSON.parse(content) as TestResult;
          if (result.scriptId === scriptId) {
            results.push(result);
          }
        } catch {
          // skip unreadable files
        }
      }
    } catch (err) {
      logger.error(`Failed to read test results: ${(err as Error).message}`);
    }
    return results.sort((a, b) => b.startTime - a.startTime);
  }

  async cleanupScriptHistory(scriptId: string, limit: number): Promise<void> {
    const scriptResults = this.findByScriptId(scriptId);

    if (scriptResults.length > limit) {
      const resultsToDelete = scriptResults.slice(limit);
      for (const result of resultsToDelete) {
        this.deleteById(result.testId);
        logger.info(`Deleted old result ${result.testId} for script ${scriptId}`);
      }
      logger.info(`Cleaned up ${resultsToDelete.length} old result(s) for script ${scriptId}`);
    }
  }

  private async cleanupOldResults(): Promise<void> {
    try {
      const files = await fs.readdir(this.resultsDir);
      // Extract timestamp from filename pattern: test-{timestamp}-{random}.json
      const jsonFiles = files
        .filter(file => file.endsWith('.json'))
        .map(file => {
          const match = /^test-(\d+)-/.exec(file);
          return {name: file, path: path.join(this.resultsDir, file), ts: match ? parseInt(match[1], 10) : 0};
        })
        .sort((a, b) => b.ts - a.ts);

      if (jsonFiles.length > this.maxResultFiles) {
        const filesToDelete = jsonFiles.slice(this.maxResultFiles);
        await Promise.all(filesToDelete.map(async (file) => {
          await fs.unlink(file.path);
          logger.info(`Deleted old result file: ${file.name}`);
        }));
        logger.info(`Cleaned up ${filesToDelete.length} old result file(s)`);
      }
    } catch (err) {
      logger.error(`Failed to cleanup old results: ${(err as Error).message}`);
    }
  }
}
