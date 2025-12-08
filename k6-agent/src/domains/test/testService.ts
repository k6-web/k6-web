import {TestInfo, TestMetadata, TestResult} from '@domains/test/models/types';
import {TestListResponse, TestResponse} from '@domains/test/dto/response';
import {K6TestExecutor} from '@domains/test/executors/K6TestExecutor';
import {LocalK6TestExecutor} from '@domains/test/executors/LocalK6TestExecutor';
import {FileSystemTestResultRepository, TestResultRepository} from '@domains/test/repositories';
import {BadRequestError, NotFoundError} from '@shared/errors';

export class TestService {
  private readonly repository: TestResultRepository;
  private readonly executor: K6TestExecutor;

  constructor(
    repository: TestResultRepository = new FileSystemTestResultRepository(),
    executor?: K6TestExecutor
  ) {
    this.repository = repository;
    this.executor = executor ?? new LocalK6TestExecutor(repository);
  }

  createTest(script: string, metadata: TestMetadata): string {
    if (!script || script.trim().length === 0) {
      throw new BadRequestError('Script is required and cannot be empty');
    }

    // Check if there's already a running test
    const runningTests = this.executor.getAllRunningTests();
    if (runningTests.size > 0) {
      const runningTestIds = Array.from(runningTests.keys());
      throw new BadRequestError(
        `A test is currently running (ID: ${runningTestIds[0]}). Please wait for it to complete or stop it before starting a new test.`
      );
    }

    return this.executor.runTest(script, metadata);
  }

  getTest(testId: string): TestInfo | TestResult {
    const runningTest = this.executor.getRunningTest(testId);
    if (runningTest) {
      return runningTest;
    }

    const result = this.repository.findById(testId);
    if (result) {
      return result;
    }

    throw new NotFoundError('Test not found');
  }

  getAllTests(limit: number = 100, cursor: number | null = null): TestListResponse {
    const tests: TestResponse[] = [];
    const runningTests = this.executor.getAllRunningTests();

    for (const [testId, test] of runningTests.entries()) {
      tests.push({
        testId,
        status: test.status,
        startTime: test.startTime,
        script: test.script.substring(0, 100) + '...',
        name: test.name,
      });
    }

    const fileResults = this.repository.findAll();
    for (const result of fileResults) {
      if (!runningTests.has(result.testId)) {
        tests.push({
          testId: result.testId,
          status: result.status,
          startTime: result.startTime,
          endTime: result.endTime,
          exitCode: result.exitCode,
          script: result.script,
          name: result.name,
          summary: result.summary,
        });
      }
    }

    const sortedTests = tests.sort((a, b) => b.startTime - a.startTime);

    let filteredTests = sortedTests;
    if (cursor !== null) {
      const cursorIndex = sortedTests.findIndex((t) => t.startTime === cursor);
      if (cursorIndex !== -1) {
        filteredTests = sortedTests.slice(cursorIndex + 1);
      }
    }

    const paginatedTests = filteredTests.slice(0, limit);

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
    const test = this.executor.getRunningTest(testId);
    if (!test) {
      throw new NotFoundError('Test not found or not running');
    }

    const success = this.executor.stopTest(testId);
    if (!success) {
      throw new Error('Failed to stop test');
    }
  }

  deleteTest(testId: string): void {
    const runningTest = this.executor.getRunningTest(testId);
    if (runningTest) {
      throw new BadRequestError('Cannot delete result of running test');
    }

    const success = this.repository.deleteById(testId);
    if (!success) {
      throw new NotFoundError('Test result not found');
    }
  }

  getExecutor(): K6TestExecutor {
    return this.executor;
  }
}

export const testService = new TestService();
