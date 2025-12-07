import {TestMetadata, TestResult, TestInfo} from '@domains/test/types';
import {TestListResponse, TestResponse} from '@domains/test/response';
import {
  runTest as runK6Test,
  stopTest as stopK6Test,
  getRunningTest,
  getAllRunningTests,
} from '@domains/test/k6Runner';
import {
  getAllTestResultsSync,
  getTestResultSync as getStoredTestResult,
  deleteTestResultSync as deleteStoredTestResult,
} from '@domains/test/resultManager';
import {NotFoundError, BadRequestError} from '@shared/errors';

export class TestService {
  createTest(script: string, metadata: TestMetadata): string {
    if (!script || script.trim().length === 0) {
      throw new BadRequestError('Script is required and cannot be empty');
    }

    return runK6Test(script, metadata);
  }

  getTest(testId: string): TestInfo | TestResult {
    const runningTest = getRunningTest(testId);
    if (runningTest) {
      return runningTest;
    }

    const result = getStoredTestResult(testId);
    if (result) {
      return result;
    }

    throw new NotFoundError('Test not found');
  }

  getAllTests(limit: number = 100, cursor: number | null = null): TestListResponse {
    const tests: TestResponse[] = [];
    const runningTests = getAllRunningTests();

    // Add running tests
    for (const [testId, test] of runningTests.entries()) {
      tests.push({
        testId,
        status: test.status,
        startTime: test.startTime,
        script: test.script.substring(0, 100) + '...',
        name: test.name,
      });
    }

    // Add completed tests
    const fileResults = getAllTestResultsSync();
    for (const result of fileResults) {
      if (!runningTests.has(result.testId)) {
        tests.push({
          testId: result.testId,
          status: result.status,
          startTime: result.startTime,
          endTime: result.endTime,
          exitCode: result.exitCode,
          name: result.name,
          summary: result.summary,
        });
      }
    }

    // Sort by startTime descending
    const sortedTests = tests.sort((a, b) => b.startTime - a.startTime);

    // Apply cursor-based pagination
    let filteredTests = sortedTests;
    if (cursor !== null) {
      const cursorIndex = sortedTests.findIndex((t) => t.startTime === cursor);
      if (cursorIndex !== -1) {
        filteredTests = sortedTests.slice(cursorIndex + 1);
      }
    }

    // Apply limit
    const paginatedTests = filteredTests.slice(0, limit);

    // Calculate next cursor
    const hasMore = filteredTests.length > limit;
    const nextCursor = hasMore ? paginatedTests[paginatedTests.length - 1].startTime : null;

    return {
      tests: paginatedTests,
      pagination: {
        nextCursor,
        hasMore,
      },
    };
  }

  stopTest(testId: string): void {
    const test = getRunningTest(testId);
    if (!test) {
      throw new NotFoundError('Test not found or not running');
    }

    const success = stopK6Test(testId);
    if (!success) {
      throw new Error('Failed to stop test');
    }
  }

  deleteTest(testId: string): void {
    const runningTest = getRunningTest(testId);
    if (runningTest) {
      throw new BadRequestError('Cannot delete result of running test');
    }

    const success = deleteStoredTestResult(testId);
    if (!success) {
      throw new NotFoundError('Test result not found');
    }
  }
}

export const testService = new TestService();
