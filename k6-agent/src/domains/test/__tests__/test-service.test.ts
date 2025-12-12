import {describe, it, expect, jest, beforeEach} from '@jest/globals';
import {TestService} from '../test-service';
import {NotFoundError, BadRequestError} from '@shared/http/errors';
import {TestStatus} from '../test-enums';
import {TestResultRepository} from '../../results';
import {K6Executor} from '@shared/k6/k6-executor';

describe('TestService', () => {
  let testService: TestService;
  let mockRepository: jest.Mocked<TestResultRepository>;
  let mockExecutor: jest.Mocked<K6Executor>;

  beforeEach(() => {
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
    } as jest.Mocked<K6Executor>;

    testService = new TestService(mockRepository, mockExecutor);
    jest.clearAllMocks();
  });

  describe('createTest', () => {
    it('should create a test with valid script', () => {
      const mockTestId = 'test-123';
      const script = 'export default function() { console.log("test"); }';

      mockExecutor.runTest.mockReturnValue(mockTestId);

      const result = testService.createTest(script, {});

      expect(result).toBe(mockTestId);
      expect(mockExecutor.runTest).toHaveBeenCalledWith(script, {});
    });

    it('should create a test with metadata', () => {
      const mockTestId = 'test-456';
      const script = 'export default function() {}';
      const metadata = {
        name: 'My Test',
        config: {vus: 10, duration: '30s'},
      };

      mockExecutor.runTest.mockReturnValue(mockTestId);

      const result = testService.createTest(script, metadata);

      expect(result).toBe(mockTestId);
      expect(mockExecutor.runTest).toHaveBeenCalledWith(script, metadata);
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
  });
});
