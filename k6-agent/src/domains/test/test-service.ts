import {EventEmitter} from 'events';
import {TestStatus} from './test-enums';
import {QueuedTestInfo, TestInfo, TestMetadata, TestQueueItem, TestResult} from '@domains/test/test-types';
import {TestListResponse, TestResponse} from '@domains/test/test-response';
import {K6Executor} from '@shared/k6/k6-executor';
import {K6LocalExecutor} from '@shared/k6/k6-local-executor';
import {TestResultFilesystemRepository, TestResultRepository} from '@domains/results';
import {BadRequestError, NotFoundError} from '@shared/http/errors';
import logger from '@shared/logger/logger';
import {TestQueueFilesystemRepository, TestQueueRepository} from './test-queue-repository';

const SCHEDULE_POLL_INTERVAL_MS = 1000;

export class TestService {
  private readonly repository: TestResultRepository;
  private readonly executor: K6Executor;
  private readonly queueRepository: TestQueueRepository;
  private readonly completionEmitter = new EventEmitter();
  private processing = false;
  private scheduleInterval?: NodeJS.Timeout;

  constructor(
    repository: TestResultRepository = new TestResultFilesystemRepository(),
    executor?: K6Executor,
    queueRepository: TestQueueRepository = new TestQueueFilesystemRepository()
  ) {
    this.repository = repository;
    this.executor = executor ?? new K6LocalExecutor(repository);
    this.queueRepository = queueRepository;
    this.recoverQueueState();
    this.startSchedulePoller();
    this.processQueue();
  }

  createTest(script: string, metadata: TestMetadata, scheduledAt?: number): string {
    if (!script || script.trim().length === 0) {
      throw new BadRequestError('Script is required and cannot be empty');
    }

    if (scheduledAt !== undefined && (!Number.isFinite(scheduledAt) || scheduledAt <= 0)) {
      throw new BadRequestError('scheduledAt must be a valid timestamp');
    }

    const now = Date.now();
    const testId = metadata.testId ?? this.generateTestId();
    const shouldSchedule = scheduledAt !== undefined && scheduledAt > now;
    const item: TestQueueItem = {
      testId,
      scriptId: metadata.scriptId,
      status: shouldSchedule ? TestStatus.SCHEDULED : TestStatus.QUEUED,
      createdAt: now,
      scheduledAt,
      queuedAt: shouldSchedule ? undefined : now,
      startTime: shouldSchedule ? scheduledAt : now,
      script,
      name: metadata.name,
      config: metadata.config,
      metadata: {
        ...metadata,
        testId,
      },
    };

    this.queueRepository.save(item);
    this.processQueue();
    return testId;
  }

  getTest(testId: string): TestInfo | TestResult | QueuedTestInfo {
    const runningTest = this.executor.getRunningTest(testId);
    if (runningTest) {
      return runningTest;
    }

    const result = this.repository.findById(testId);
    if (result) {
      return result;
    }

    const queuedTest = this.queueRepository.findById(testId);
    if (queuedTest) {
      return this.toQueuedTestInfo(queuedTest);
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
        scriptId: test.scriptId,
      });
    }

    const queuedTests = this.queueRepository.findAll();
    for (const queued of queuedTests) {
      if (!runningTests.has(queued.testId) && !this.repository.findById(queued.testId)) {
        tests.push({
          testId: queued.testId,
          status: queued.status,
          startTime: queued.startTime,
          script: queued.script.substring(0, 100) + '...',
          name: queued.name,
          scriptId: queued.scriptId,
        });
      }
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
          scriptId: result.scriptId,
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
      const queued = this.queueRepository.findById(testId);
      if (!queued || queued.status === TestStatus.CANCELLED) {
        throw new NotFoundError('Test not found or not running');
      }

      queued.status = TestStatus.CANCELLED;
      this.queueRepository.save(queued);
      this.completionEmitter.emit(`done:${testId}`, TestStatus.CANCELLED);
      return;
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

    if (this.queueRepository.deleteById(testId)) {
      return;
    }

    const success = this.repository.deleteById(testId);
    if (!success) {
      throw new NotFoundError('Test result not found');
    }
  }

  waitForTest(testId: string): Promise<TestStatus> {
    if (this.repository.findById(testId)) {
      return Promise.resolve(this.repository.findById(testId)!.status);
    }

    const running = this.executor.getRunningTest(testId);
    if (running) {
      return this.executor.waitForTest(testId);
    }

    const queued = this.queueRepository.findById(testId);
    if (!queued) {
      return Promise.resolve(TestStatus.COMPLETED);
    }

    if (queued.status === TestStatus.CANCELLED || queued.status === TestStatus.FAILED) {
      return Promise.resolve(queued.status);
    }

    return new Promise(resolve => {
      this.completionEmitter.once(`done:${testId}`, resolve);
    });
  }

  getExecutor(): K6Executor {
    return this.executor;
  }

  private processQueue(): void {
    if (this.processing) {
      return;
    }

    this.processing = true;
    setImmediate(async () => {
      try {
        await this.processDueSchedules();

        while (this.executor.getAllRunningTests().size === 0) {
          const next = this.getNextQueuedTest();
          if (!next) {
            break;
          }

          next.status = TestStatus.RUNNING;
          next.startTime = Date.now();
          this.queueRepository.save(next);

          try {
            this.executor.runTest(next.script, next.metadata);
            await this.executor.waitForTest(next.testId);
            this.queueRepository.deleteById(next.testId);
            const result = this.repository.findById(next.testId);
            this.completionEmitter.emit(`done:${next.testId}`, result?.status ?? TestStatus.COMPLETED);
          } catch (err) {
            logger.error(`Failed to run queued test ${next.testId}: ${(err as Error).message}`);
            next.status = TestStatus.FAILED;
            next.error = (err as Error).message;
            this.queueRepository.save(next);
            this.completionEmitter.emit(`done:${next.testId}`, TestStatus.FAILED);
          }
        }
      } finally {
        this.processing = false;
        if (this.hasRunnableQueueItem() && this.executor.getAllRunningTests().size === 0) {
          this.processQueue();
        }
      }
    });
  }

  private async processDueSchedules(): Promise<void> {
    const now = Date.now();
    const items = this.queueRepository.findAll();

    for (const item of items) {
      if (item.status === TestStatus.SCHEDULED && (item.scheduledAt ?? 0) <= now) {
        item.status = TestStatus.QUEUED;
        item.queuedAt = now;
        item.startTime = now;
        this.queueRepository.save(item);
      }
    }
  }

  private recoverQueueState(): void {
    for (const item of this.queueRepository.findAll()) {
      if (item.status === TestStatus.RUNNING) {
        if (this.repository.findById(item.testId)) {
          this.queueRepository.deleteById(item.testId);
          continue;
        }

        item.status = TestStatus.QUEUED;
        item.queuedAt = Date.now();
        item.startTime = item.queuedAt;
        this.queueRepository.save(item);
      }
    }
  }

  private startSchedulePoller(): void {
    this.scheduleInterval = setInterval(() => {
      this.processQueue();
    }, SCHEDULE_POLL_INTERVAL_MS);
    this.scheduleInterval.unref?.();
  }

  private getNextQueuedTest(): TestQueueItem | null {
    return this.queueRepository.findAll()
      .filter(item => item.status === TestStatus.QUEUED)
      .sort((a, b) => (a.queuedAt ?? a.createdAt) - (b.queuedAt ?? b.createdAt))[0] ?? null;
  }

  private hasRunnableQueueItem(): boolean {
    const now = Date.now();
    return this.queueRepository.findAll().some(item =>
      item.status === TestStatus.QUEUED ||
      (item.status === TestStatus.SCHEDULED && (item.scheduledAt ?? 0) <= now)
    );
  }

  private toQueuedTestInfo(item: TestQueueItem): QueuedTestInfo {
    return {
      testId: item.testId,
      scriptId: item.scriptId,
      status: item.status,
      createdAt: item.createdAt,
      scheduledAt: item.scheduledAt,
      queuedAt: item.queuedAt,
      startTime: item.startTime,
      script: item.script,
      name: item.name,
      config: item.config,
      error: item.error,
    };
  }

  private generateTestId(): string {
    return `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
}

export const testService = new TestService();
