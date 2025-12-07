import {describe, it, expect, jest, beforeEach} from '@jest/globals';
import fsSync from 'fs';
import {
  getAllTestResultsSync,
  getTestResultSync,
  deleteTestResultSync,
} from '../resultManager';
import {TestStatus} from '../models/enums';
import {TestResult} from '../models/types';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('fs');
jest.mock('@shared/logger');
jest.mock('@shared/configs', () => ({
  RESULTS_DIR: '/tmp/test-results',
  MAX_RESULT_FILES: 3,
}));

describe('ResultManager', () => {
  const mockTestResult: TestResult = {
    testId: 'test-123',
    status: TestStatus.COMPLETED,
    startTime: Date.now(),
    endTime: Date.now() + 1000,
    duration: 1000,
    exitCode: 0,
    script: 'export default function() {}',
    summary: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Sync operations', () => {
    describe('getAllTestResultsSync', () => {
      it('should return all test results synchronously', () => {
        const mockFiles = ['test-1.json', 'test-2.json'];
        const mockResult1 = {...mockTestResult, testId: 'test-1'};
        const mockResult2 = {...mockTestResult, testId: 'test-2'};

        (fsSync.readdirSync as jest.Mock) = jest.fn(() => mockFiles);
        (fsSync.readFileSync as jest.Mock) = jest.fn()
          .mockReturnValueOnce(JSON.stringify(mockResult1))
          .mockReturnValueOnce(JSON.stringify(mockResult2));

        const results = getAllTestResultsSync();

        expect(results).toHaveLength(2);
        expect(results[0].testId).toBe('test-1');
        expect(results[1].testId).toBe('test-2');
      });
    });

    describe('getTestResultSync', () => {
      it('should return test result synchronously', () => {
        (fsSync.readFileSync as jest.Mock) = jest.fn(() => JSON.stringify(mockTestResult));

        const result = getTestResultSync('test-123');

        expect(result).toEqual(mockTestResult);
      });

      it('should return null if file does not exist', () => {
        const error: any = new Error('File not found');
        error.code = 'ENOENT';
        (fsSync.readFileSync as jest.Mock) = jest.fn(() => {
          throw error;
        });

        const result = getTestResultSync('non-existent');

        expect(result).toBeNull();
      });
    });

    describe('deleteTestResultSync', () => {
      it('should delete test result synchronously', () => {
        (fsSync.unlinkSync as jest.Mock) = jest.fn(() => {});

        const result = deleteTestResultSync('test-123');

        expect(result).toBe(true);
      });

      it('should return false if file does not exist', () => {
        const error: any = new Error('File not found');
        error.code = 'ENOENT';
        (fsSync.unlinkSync as jest.Mock) = jest.fn(() => {
          throw error;
        });

        const result = deleteTestResultSync('non-existent');

        expect(result).toBe(false);
      });
    });
  });
});
