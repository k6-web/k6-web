import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import logger from '@shared/logger/logger';
import {MAX_RESULT_FILES, RESULTS_DIR} from '@shared/configs';
import {TestResult} from '@domains/test/test-types';
import {TestResultRepository} from './test-result-repository';

/**
 * FileSystem-base implementation of the test result repository.
 */
export class TestResultFilesystemRepository implements TestResultRepository {
  private readonly resultsDir: string;
  private readonly maxResultFiles: number;

  constructor(resultsDir: string = RESULTS_DIR, maxResultFiles: number = MAX_RESULT_FILES) {
    this.resultsDir = resultsDir;
    this.maxResultFiles = maxResultFiles;
  }

  async save(testId: string, result: TestResult): Promise<void> {
    const resultFile = path.join(this.resultsDir, `${testId}.json`);
    await fs.writeFile(resultFile, JSON.stringify(result, null, 2));
    await this.cleanupOldResults();
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
    const allResults = this.findAll();
    return allResults
      .filter(result => result.scriptId === scriptId)
      .sort((a, b) => b.startTime - a.startTime);
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
      const fileStats = await Promise.all(
        files
          .filter(file => file.endsWith('.json'))
          .map(async (file) => {
            const filePath = path.join(this.resultsDir, file);
            const stats = await fs.stat(filePath);
            return {
              name: file,
              path: filePath,
              mtime: stats.mtime.getTime(),
            };
          })
      );

      const sortedFiles = fileStats.sort((a, b) => b.mtime - a.mtime);

      if (sortedFiles.length > this.maxResultFiles) {
        const filesToDelete = sortedFiles.slice(this.maxResultFiles);
        await Promise.all(
          filesToDelete.map(async (file) => {
            await fs.unlink(file.path);
            logger.info(`Deleted old result file: ${file.name}`);
          })
        );
        logger.info(`Cleaned up ${filesToDelete.length} old result file(s)`);
      }
    } catch (err) {
      logger.error(`Failed to cleanup old results: ${(err as Error).message}`);
    }
  }
}
