import fs from 'fs';
import path from 'path';
import logger from '../commons/logger';
import {RESULTS_DIR, MAX_RESULT_FILES} from '../commons/configs';
import {TestResult} from './types';

export function getAllTestResults(): TestResult[] {
  const results: TestResult[] = [];
  try {
    const files = fs.readdirSync(RESULTS_DIR);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const resultFile = path.join(RESULTS_DIR, file);
        const result = JSON.parse(fs.readFileSync(resultFile, 'utf8')) as TestResult;
        results.push(result);
      }
    }
  } catch (err) {
    logger.error(`Failed to read test results: ${(err as Error).message}`);
  }
  return results;
}

export function getTestResult(testId: string): TestResult | null {
  const resultFile = path.join(RESULTS_DIR, `${testId}.json`);
  if (fs.existsSync(resultFile)) {
    return JSON.parse(fs.readFileSync(resultFile, 'utf8')) as TestResult;
  }
  return null;
}

function cleanupOldResults(): void {
  try {
    const files = fs.readdirSync(RESULTS_DIR)
      .filter(file => file.endsWith('.json'))
      .map(file => ({
        name: file,
        path: path.join(RESULTS_DIR, file),
        mtime: fs.statSync(path.join(RESULTS_DIR, file)).mtime.getTime(),
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length > MAX_RESULT_FILES) {
      const filesToDelete = files.slice(MAX_RESULT_FILES);
      for (const file of filesToDelete) {
        fs.unlinkSync(file.path);
        logger.info(`Deleted old result file: ${file.name}`);
      }
      logger.info(`Cleaned up ${filesToDelete.length} old result file(s)`);
    }
  } catch (err) {
    logger.error(`Failed to cleanup old results: ${(err as Error).message}`);
  }
}

export function saveTestResult(testId: string, result: TestResult): void {
  const resultFile = path.join(RESULTS_DIR, `${testId}.json`);
  fs.writeFileSync(resultFile, JSON.stringify(result, null, 2));
  cleanupOldResults();
}

export function deleteTestResult(testId: string): boolean {
  const resultFile = path.join(RESULTS_DIR, `${testId}.json`);
  if (fs.existsSync(resultFile)) {
    fs.unlinkSync(resultFile);
    return true;
  }
  return false;
}
