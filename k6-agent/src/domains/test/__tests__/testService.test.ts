import {describe, it, expect, jest, beforeEach} from '@jest/globals';
import {TestService} from '../testService';
import {NotFoundError, BadRequestError} from '@shared/errors';
import {TestStatus} from '../models/enums';
import {TestResultRepository} from '../repositories';

// Mock dependencies
jest.mock('../k6Runner');

import * as k6Runner from '../k6Runner';

describe('TestService', () => {
  let testService: TestService;
  let mockRepository: jest.Mocked<TestResultRepository>;

  beforeEach(() => {
    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      deleteById: jest.fn(),
    } as jest.Mocked<TestResultRepository>;

    testService = new TestService(mockRepository);
    jest.clearAllMocks();
  });

  describe('createTest', () => {
    it('should create a test with valid script', () => {
      const mockTestId = 'test-123';
      const script = 'export default function() { console.log("test"); }';

      (k6Runner.runTest as jest.Mock) = jest.fn(() => mockTestId);

      const result = testService.createTest(script, {});

      expect(result).toBe(mockTestId);
      expect(k6Runner.runTest).toHaveBeenCalledWith(script, {});
    });

    it('should create a test with metadata', () => {
      const mockTestId = 'test-456';
      const script = 'export default function() {}';
      const metadata = {
        name: 'My Test',
        config: {vus: 10, duration: '30s'},
      };

      (k6Runner.runTest as jest.Mock) = jest.fn(() => mockTestId);

      const result = testService.createTest(script, metadata);

      expect(result).toBe(mockTestId);
      expect(k6Runner.runTest).toHaveBeenCalledWith(script, metadata);
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
      };

      (k6Runner.getRunningTest as jest.Mock) = jest.fn(() => mockRunningTest);

      const result = testService.getTest(mockTestId);

      expect(result).toEqual(mockRunningTest);
      expect(k6Runner.getRunningTest).toHaveBeenCalledWith(mockTestId);
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

      (k6Runner.getRunningTest as jest.Mock) = jest.fn(() => undefined);
      mockRepository.findById.mockReturnValue(mockTestResult);

      const result = testService.getTest(mockTestId);

      expect(result).toEqual(mockTestResult);
      expect(mockRepository.findById).toHaveBeenCalledWith(mockTestId);
    });

    it('should throw NotFoundError if test does not exist', () => {
      const mockTestId = 'non-existent';

      (k6Runner.getRunningTest as jest.Mock) = jest.fn(() => undefined);
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
      };

      (k6Runner.getRunningTest as jest.Mock) = jest.fn(() => mockRunningTest);
      (k6Runner.stopTest as jest.Mock) = jest.fn(() => true);

      testService.stopTest(mockTestId);

      expect(k6Runner.stopTest).toHaveBeenCalledWith(mockTestId);
    });

    it('should throw NotFoundError if test is not running', () => {
      const mockTestId = 'test-456';

      (k6Runner.getRunningTest as jest.Mock) = jest.fn(() => undefined);

      expect(() => {
        testService.stopTest(mockTestId);
      }).toThrow(NotFoundError);
    });

    it('should throw error if stop fails', () => {
      const mockTestId = 'test-789';
      const mockRunningTest = {
        testId: mockTestId,
        status: TestStatus.RUNNING,
      };

      (k6Runner.getRunningTest as jest.Mock) = jest.fn(() => mockRunningTest);
      (k6Runner.stopTest as jest.Mock) = jest.fn(() => false);

      expect(() => {
        testService.stopTest(mockTestId);
      }).toThrow('Failed to stop test');
    });
  });

  describe('deleteTest', () => {
    it('should delete a completed test', () => {
      const mockTestId = 'test-123';

      (k6Runner.getRunningTest as jest.Mock) = jest.fn(() => undefined);
      mockRepository.deleteById.mockReturnValue(true);

      testService.deleteTest(mockTestId);

      expect(mockRepository.deleteById).toHaveBeenCalledWith(mockTestId);
    });

    it('should throw BadRequestError if test is running', () => {
      const mockTestId = 'test-456';
      const mockRunningTest = {
        testId: mockTestId,
        status: TestStatus.RUNNING,
      };

      (k6Runner.getRunningTest as jest.Mock) = jest.fn(() => mockRunningTest);

      expect(() => {
        testService.deleteTest(mockTestId);
      }).toThrow(BadRequestError);
    });

    it('should throw NotFoundError if test result does not exist', () => {
      const mockTestId = 'test-789';

      (k6Runner.getRunningTest as jest.Mock) = jest.fn(() => undefined);
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
        }],
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

      (k6Runner.getAllRunningTests as jest.Mock) = jest.fn(() => mockRunningTests);
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

      (k6Runner.getAllRunningTests as jest.Mock) = jest.fn(() => mockRunningTests);
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

      (k6Runner.getAllRunningTests as jest.Mock) = jest.fn(() => mockRunningTests);
      mockRepository.findAll.mockReturnValue(mockStoredResults);

      const result = testService.getAllTests(10, 3000);

      expect(result.tests).toHaveLength(2);
      expect(result.tests[0].testId).toBe('test-2');
      expect(result.tests[1].testId).toBe('test-3');
    });
  });
});
