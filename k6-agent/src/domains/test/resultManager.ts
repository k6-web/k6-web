import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import logger from '@shared/logger';
import {RESULTS_DIR, MAX_RESULT_FILES} from '@shared/configs';
import {TestResult} from '@domains/test/models/types';

async function cleanupOldResults(): Promise<void> {
  try {
    const files = await fs.readdir(RESULTS_DIR);
    const fileStats = await Promise.all(
      files
        .filter(file => file.endsWith('.json'))
        .map(async (file) => {
          const filePath = path.join(RESULTS_DIR, file);
          const stats = await fs.stat(filePath);
          return {
            name: file,
            path: filePath,
            mtime: stats.mtime.getTime(),
          };
        })
    );

    const sortedFiles = fileStats.sort((a, b) => b.mtime - a.mtime);

    if (sortedFiles.length > MAX_RESULT_FILES) {
      const filesToDelete = sortedFiles.slice(MAX_RESULT_FILES);
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

export async function saveTestResult(testId: string, result: TestResult): Promise<void> {
  const resultFile = path.join(RESULTS_DIR, `${testId}.json`);
  await fs.writeFile(resultFile, JSON.stringify(result, null, 2));
  await cleanupOldResults();
}

export function getAllTestResultsSync(): TestResult[] {
  const results: TestResult[] = [];
  try {
    const files = fsSync.readdirSync(RESULTS_DIR);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const resultFile = path.join(RESULTS_DIR, file);
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

export function getTestResultSync(testId: string): TestResult | null {
  const resultFile = path.join(RESULTS_DIR, `${testId}.json`);
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

export function deleteTestResultSync(testId: string): boolean {
  const resultFile = path.join(RESULTS_DIR, `${testId}.json`);
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
