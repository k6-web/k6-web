import {describe, it, expect, jest, beforeEach} from '@jest/globals';
import {TestService} from '../test-service';
import {NotFoundError, BadRequestError} from '@shared/http/errors';
import {TestStatus} from '../test-enums';
import {TestResultRepository} from '../../results';
import {K6Executor} from '@shared/k6/k6-executor';
import {TestQueueRepository} from '../test-queue-repository';
import {TestQueueItem} from '../test-types';

describe('TestService', () => {
  let testService: TestService;
  let mockRepository: jest.Mocked<TestResultRepository>;
  let mockExecutor: jest.Mocked<K6Executor>;
  let mockQueueRepository: jest.Mocked<TestQueueRepository>;
  let queueItems: Map<string, TestQueueItem>;

  beforeEach(() => {
    queueItems = new Map();
    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      deleteById: jest.fn(),
      findByScriptId: jest.fn(),
      cleanupScriptHistory: jest.fn(),
    } as jest.Mocked<TestResultRepository>;

    mockExecutor = {
      runTest: jest.fn(),
      stopTest: jest.fn(),
      stopAllTests: jest.fn(),
      getRunningTest: jest.fn(),
      getAllRunningTests: jest.fn(() => new Map()),
      addLogListener: jest.fn(),
      removeLogListener: jest.fn(),
      waitForTest: jest.fn(),
    } as jest.Mocked<K6Executor>;

    mockQueueRepository = {
      save: jest.fn((item: TestQueueItem) => {
        queueItems.set(item.testId, {...item});
      }),
      findById: jest.fn((testId: string) => queueItems.get(testId) ?? null),
      findAll: jest.fn(() => Array.from(queueItems.values())),
      deleteById: jest.fn((testId: string) => queueItems.delete(testId)),
    };

    testService = new TestService(mockRepository, mockExecutor, mockQueueRepository);
    jest.clearAllMocks();
  });

  describe('createTest', () => {
    it('should queue a test with valid script', async () => {
      const mockTestId = 'test-123';
      const script = 'export default function() { console.log("test"); }';

      mockExecutor.runTest.mockReturnValue(mockTestId);

      const result = testService.createTest(script, {testId: mockTestId});
      await new Promise(resolve => setImmediate(resolve));

      expect(result).toBe(mockTestId);
      expect(mockQueueRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        testId: mockTestId,
        status: TestStatus.QUEUED,
        script,
      }));
      expect(mockExecutor.runTest).toHaveBeenCalledWith(script, {testId: mockTestId});
    });

    it('should queue a test with metadata', async () => {
      const mockTestId = 'test-456';
      const script = 'export default function() {}';
      const metadata = {
        testId: mockTestId,
        name: 'My Test',
        config: {vus: 10, duration: '30s'},
      };

      mockExecutor.runTest.mockReturnValue(mockTestId);

      const result = testService.createTest(script, metadata);
      await new Promise(resolve => setImmediate(resolve));

      expect(result).toBe(mockTestId);
      expect(mockExecutor.runTest).toHaveBeenCalledWith(script, metadata);
    });

    it('should schedule a test for a future time', () => {
      const mockTestId = 'test-789';
      const script = 'export default function() {}';
      const scheduledAt = Date.now() + 60000;

      const result = testService.createTest(script, {testId: mockTestId}, scheduledAt);

      expect(result).toBe(mockTestId);
      expect(mockQueueRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        testId: mockTestId,
        status: TestStatus.SCHEDULED,
        scheduledAt,
      }));
      expect(mockExecutor.runTest).not.toHaveBeenCalled();
    });

    it('should reject invalid scheduledAt values', () => {
      const script = 'export default function() {}';

      expect(() => {
        testService.createTest(script, {testId: 'test-invalid'}, Number.NaN);
      }).toThrow(BadRequestError);

      expect(() => {
        testService.createTest(script, {testId: 'test-zero'}, 0);
      }).toThrow(BadRequestError);
    });

    it('should throw BadRequestError for empty script', () => {
      expect(() => {
        testService.createTest('', {});
      }).toThrow(BadRequestError);

      expect(() => {
        testService.createTest('   ', {});
      }).toThrow(BadRequestError);
    });

    it('should throw BadRequestError for missing script', () => {
      expect(() => {
        testService.createTest(null as any, {});
      }).toThrow(BadRequestError);

      expect(() => {
        testService.createTest(undefined as any, {});
      }).toThrow(BadRequestError);
    });
  });

  describe('getTest', () => {
    it('should return running test if exists', () => {
      const mockTestId = 'test-123';
      const mockRunningTest = {
        testId: mockTestId,
        status: TestStatus.RUNNING,
        startTime: Date.now(),
        script: 'test script',
        logs: [],
      } as any;

      mockExecutor.getRunningTest.mockReturnValue(mockRunningTest);

      const result = testService.getTest(mockTestId);

      expect(result).toEqual(mockRunningTest);
      expect(mockExecutor.getRunningTest).toHaveBeenCalledWith(mockTestId);
    });

    it('should return stored test result if not running', () => {
      const mockTestId = 'test-456';
      const mockTestResult = {
        testId: mockTestId,
        status: TestStatus.COMPLETED,
        startTime: Date.now() - 60000,
        endTime: Date.now(),
        duration: 60000,
        exitCode: 0,
        script: 'test script',
        summary: {},
      };

      mockExecutor.getRunningTest.mockReturnValue(undefined);
      mockRepository.findById.mockReturnValue(mockTestResult);

      const result = testService.getTest(mockTestId);

      expect(result).toEqual(mockTestResult);
      expect(mockRepository.findById).toHaveBeenCalledWith(mockTestId);
    });

    it('should throw NotFoundError if test does not exist', () => {
      const mockTestId = 'non-existent';

      mockExecutor.getRunningTest.mockReturnValue(undefined);
      mockRepository.findById.mockReturnValue(null);

      expect(() => {
        testService.getTest(mockTestId);
      }).toThrow(NotFoundError);
    });

    it('should return queued test info when test has not started', () => {
      const scheduledAt = Date.now() + 60000;

      testService.createTest('export default function() {}', {
        testId: 'scheduled-test',
        name: 'Scheduled test',
        scriptId: 'script-1',
        config: {vus: 5},
      }, scheduledAt);

      const result = testService.getTest('scheduled-test');

      expect(result).toEqual(expect.objectContaining({
        testId: 'scheduled-test',
        status: TestStatus.SCHEDULED,
        scheduledAt,
        name: 'Scheduled test',
        scriptId: 'script-1',
        config: {vus: 5},
      }));
      expect(result).not.toHaveProperty('metadata');
    });
  });

  describe('stopTest', () => {
    it('should stop a running test', () => {
      const mockTestId = 'test-123';
      const mockRunningTest = {
        testId: mockTestId,
        status: TestStatus.RUNNING,
      } as any;

      mockExecutor.getRunningTest.mockReturnValue(mockRunningTest);
      mockExecutor.stopTest.mockReturnValue(true);

      testService.stopTest(mockTestId);

      expect(mockExecutor.stopTest).toHaveBeenCalledWith(mockTestId);
    });

    it('should throw NotFoundError if test is not running', () => {
      const mockTestId = 'test-456';

      mockExecutor.getRunningTest.mockReturnValue(undefined);

      expect(() => {
        testService.stopTest(mockTestId);
      }).toThrow(NotFoundError);
    });

    it('should throw error if stop fails', () => {
      const mockTestId = 'test-789';
      const mockRunningTest = {
        testId: mockTestId,
        status: TestStatus.RUNNING,
      } as any;

      mockExecutor.getRunningTest.mockReturnValue(mockRunningTest);
      mockExecutor.stopTest.mockReturnValue(false);

      expect(() => {
        testService.stopTest(mockTestId);
      }).toThrow('Failed to stop test');
    });

    it('should cancel a queued test that is not running', () => {
      const scheduledAt = Date.now() + 60000;
      testService.createTest('export default function() {}', {testId: 'queued-test'}, scheduledAt);

      testService.stopTest('queued-test');

      expect(queueItems.get('queued-test')).toEqual(expect.objectContaining({
        testId: 'queued-test',
        status: TestStatus.CANCELLED,
      }));
      expect(mockExecutor.stopTest).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when cancelling an already cancelled queued test', () => {
      const scheduledAt = Date.now() + 60000;
      testService.createTest('export default function() {}', {testId: 'cancelled-test'}, scheduledAt);
      testService.stopTest('cancelled-test');

      expect(() => {
        testService.stopTest('cancelled-test');
      }).toThrow(NotFoundError);
    });
  });

  describe('deleteTest', () => {
    it('should delete a completed test', () => {
      const mockTestId = 'test-123';

      mockExecutor.getRunningTest.mockReturnValue(undefined);
      mockRepository.deleteById.mockReturnValue(true);

      testService.deleteTest(mockTestId);

      expect(mockRepository.deleteById).toHaveBeenCalledWith(mockTestId);
    });

    it('should throw BadRequestError if test is running', () => {
      const mockTestId = 'test-456';
      const mockRunningTest = {
        testId: mockTestId,
        status: TestStatus.RUNNING,
      } as any;

      mockExecutor.getRunningTest.mockReturnValue(mockRunningTest);

      expect(() => {
        testService.deleteTest(mockTestId);
      }).toThrow(BadRequestError);
    });

    it('should throw NotFoundError if test result does not exist', () => {
      const mockTestId = 'test-789';

      mockExecutor.getRunningTest.mockReturnValue(undefined);
      mockRepository.deleteById.mockReturnValue(false);

      expect(() => {
        testService.deleteTest(mockTestId);
      }).toThrow(NotFoundError);
    });

    it('should delete queued tests before deleting stored results', () => {
      const scheduledAt = Date.now() + 60000;
      testService.createTest('export default function() {}', {testId: 'queued-delete'}, scheduledAt);

      testService.deleteTest('queued-delete');

      expect(queueItems.has('queued-delete')).toBe(false);
      expect(mockRepository.deleteById).not.toHaveBeenCalled();
    });
  });

  describe('getAllTests', () => {
    it('should return paginated list of tests', () => {
      const mockRunningTests = new Map([
        ['test-1', {
          testId: 'test-1',
          status: TestStatus.RUNNING,
          startTime: 1000,
          script: 'script 1',
          name: 'Running Test',
        } as any],
      ]);

      const mockStoredResults = [
        {
          testId: 'test-2',
          status: TestStatus.COMPLETED,
          startTime: 2000,
          endTime: 3000,
          duration: 1000,
          exitCode: 0,
          script: 'script 2',
          name: 'Completed Test',
          summary: {},
        },
      ];

      mockExecutor.getAllRunningTests.mockReturnValue(mockRunningTests);
      mockRepository.findAll.mockReturnValue(mockStoredResults);

      const result = testService.getAllTests(10, null);

      expect(result.tests).toHaveLength(2);
      expect(result.tests[0].testId).toBe('test-2'); // Sorted by startTime desc
      expect(result.tests[1].testId).toBe('test-1');
      expect(result.pagination.hasMore).toBe(false);
    });

    it('should apply pagination limit', () => {
      const mockRunningTests = new Map();
      const mockStoredResults = [
        {testId: 'test-1', status: TestStatus.COMPLETED, startTime: 3000, endTime: 4000, duration: 1000, exitCode: 0, script: '', summary: {}},
        {testId: 'test-2', status: TestStatus.COMPLETED, startTime: 2000, endTime: 3000, duration: 1000, exitCode: 0, script: '', summary: {}},
        {testId: 'test-3', status: TestStatus.COMPLETED, startTime: 1000, endTime: 2000, duration: 1000, exitCode: 0, script: '', summary: {}},
      ];

      mockExecutor.getAllRunningTests.mockReturnValue(mockRunningTests);
      mockRepository.findAll.mockReturnValue(mockStoredResults);

      const result = testService.getAllTests(2, null);

      expect(result.tests).toHaveLength(2);
      expect(result.pagination.hasMore).toBe(true);
      expect(result.pagination.nextCursor).toBe(2000);
    });

    it('should apply cursor-based pagination', () => {
      const mockRunningTests = new Map();
      const mockStoredResults = [
        {testId: 'test-1', status: TestStatus.COMPLETED, startTime: 3000, endTime: 4000, duration: 1000, exitCode: 0, script: '', summary: {}},
        {testId: 'test-2', status: TestStatus.COMPLETED, startTime: 2000, endTime: 3000, duration: 1000, exitCode: 0, script: '', summary: {}},
        {testId: 'test-3', status: TestStatus.COMPLETED, startTime: 1000, endTime: 2000, duration: 1000, exitCode: 0, script: '', summary: {}},
      ];

      mockExecutor.getAllRunningTests.mockReturnValue(mockRunningTests);
      mockRepository.findAll.mockReturnValue(mockStoredResults);

      const result = testService.getAllTests(10, 3000);

      expect(result.tests).toHaveLength(2);
      expect(result.tests[0].testId).toBe('test-2');
      expect(result.tests[1].testId).toBe('test-3');
    });

    it('should include queued tests and skip queued items that already have a stored result', () => {
      const storedResult = {
        testId: 'stored-test',
        status: TestStatus.COMPLETED,
        startTime: 2000,
        endTime: 3000,
        duration: 1000,
        exitCode: 0,
        script: 'stored script',
        summary: {},
      };
      queueItems.set('queued-test', {
        testId: 'queued-test',
        status: TestStatus.SCHEDULED,
        createdAt: 1000,
        scheduledAt: 5000,
        startTime: 5000,
        script: 'queued script',
        name: 'Queued',
        metadata: {testId: 'queued-test', name: 'Queued'},
      });
      queueItems.set('stored-test', {
        testId: 'stored-test',
        status: TestStatus.QUEUED,
        createdAt: 1000,
        queuedAt: 1000,
        startTime: 1000,
        script: 'duplicate queued script',
        metadata: {testId: 'stored-test'},
      });
      mockRepository.findById.mockImplementation((testId) => testId === 'stored-test' ? storedResult : null);
      mockRepository.findAll.mockReturnValue([storedResult]);

      const result = testService.getAllTests(10, null);

      expect(result.tests.map(test => test.testId)).toEqual(['queued-test', 'stored-test']);
      expect(result.tests[0]).toEqual(expect.objectContaining({
        status: TestStatus.SCHEDULED,
        script: 'queued script...',
        name: 'Queued',
      }));
    });
  });

  describe('waitForTest', () => {
    it('should resolve stored test status immediately', async () => {
      mockRepository.findById.mockReturnValue({
        testId: 'stored-test',
        status: TestStatus.FAILED,
        startTime: 1000,
        endTime: 2000,
        duration: 1000,
        exitCode: 1,
        script: 'script',
        summary: {},
      });

      await expect(testService.waitForTest('stored-test')).resolves.toBe(TestStatus.FAILED);
      expect(mockExecutor.waitForTest).not.toHaveBeenCalled();
    });

    it('should delegate to executor for running tests', async () => {
      mockRepository.findById.mockReturnValue(null);
      mockExecutor.getRunningTest.mockReturnValue({testId: 'running-test', status: TestStatus.RUNNING} as any);
      mockExecutor.waitForTest.mockResolvedValue(TestStatus.COMPLETED);

      await expect(testService.waitForTest('running-test')).resolves.toBe(TestStatus.COMPLETED);
      expect(mockExecutor.waitForTest).toHaveBeenCalledWith('running-test');
    });

    it('should resolve terminal queued statuses immediately', async () => {
      queueItems.set('failed-test', {
        testId: 'failed-test',
        status: TestStatus.FAILED,
        createdAt: 1000,
        queuedAt: 1000,
        startTime: 1000,
        script: 'script',
        metadata: {testId: 'failed-test'},
        error: 'boom',
      });
      mockRepository.findById.mockReturnValue(null);

      await expect(testService.waitForTest('failed-test')).resolves.toBe(TestStatus.FAILED);
    });

    it('should resolve completed for unknown tests', async () => {
      mockRepository.findById.mockReturnValue(null);
      mockExecutor.getRunningTest.mockReturnValue(undefined);

      await expect(testService.waitForTest('missing-test')).resolves.toBe(TestStatus.COMPLETED);
    });
  });

  describe('queue recovery', () => {
    it('should requeue orphaned running queue items on startup', () => {
      const recoveringItems = new Map<string, TestQueueItem>([
        ['orphaned-running', {
          testId: 'orphaned-running',
          status: TestStatus.RUNNING,
          createdAt: 1000,
          queuedAt: 1000,
          startTime: 1000,
          script: 'script',
          metadata: {testId: 'orphaned-running'},
        }],
      ]);
      const recoveryQueueRepository: jest.Mocked<TestQueueRepository> = {
        save: jest.fn((item: TestQueueItem) => {
          recoveringItems.set(item.testId, {...item});
        }),
        findById: jest.fn((testId: string) => recoveringItems.get(testId) ?? null),
        findAll: jest.fn(() => Array.from(recoveringItems.values())),
        deleteById: jest.fn((testId: string) => recoveringItems.delete(testId)),
      };
      mockRepository.findById.mockReturnValue(null);

      new TestService(mockRepository, mockExecutor, recoveryQueueRepository);

      expect(recoveryQueueRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        testId: 'orphaned-running',
        status: TestStatus.QUEUED,
      }));
      expect(recoveringItems.get('orphaned-running')).toEqual(expect.objectContaining({
        status: TestStatus.QUEUED,
      }));
    });

    it('should remove recovered running queue items that already have stored results', () => {
      const recoveringItems = new Map<string, TestQueueItem>([
        ['completed-running', {
          testId: 'completed-running',
          status: TestStatus.RUNNING,
          createdAt: 1000,
          queuedAt: 1000,
          startTime: 1000,
          script: 'script',
          metadata: {testId: 'completed-running'},
        }],
      ]);
      const recoveryQueueRepository: jest.Mocked<TestQueueRepository> = {
        save: jest.fn(),
        findById: jest.fn((testId: string) => recoveringItems.get(testId) ?? null),
        findAll: jest.fn(() => Array.from(recoveringItems.values())),
        deleteById: jest.fn((testId: string) => recoveringItems.delete(testId)),
      };
      mockRepository.findById.mockReturnValue({
        testId: 'completed-running',
        status: TestStatus.COMPLETED,
        startTime: 1000,
        endTime: 2000,
        duration: 1000,
        exitCode: 0,
        script: 'script',
        summary: {},
      });

      new TestService(mockRepository, mockExecutor, recoveryQueueRepository);

      expect(recoveryQueueRepository.deleteById).toHaveBeenCalledWith('completed-running');
      expect(recoveryQueueRepository.save).not.toHaveBeenCalled();
      expect(recoveringItems.has('completed-running')).toBe(false);
    });
  });
});
