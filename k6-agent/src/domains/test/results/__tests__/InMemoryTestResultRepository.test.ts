import {describe, it, expect, beforeEach} from '@jest/globals';
import {InMemoryTestResultRepository} from '../InMemoryTestResultRepository';
import {TestResult} from '@domains/test/models/types';
import {TestStatus} from '@domains/test/models/enums';

describe('InMemoryTestResultRepository', () => {
  let repository: InMemoryTestResultRepository;

  beforeEach(() => {
    repository = new InMemoryTestResultRepository();
  });

  describe('save', () => {
    it('should save a test result', async () => {
      const testResult: TestResult = {
        testId: 'test-123',
        status: TestStatus.COMPLETED,
        startTime: Date.now(),
        endTime: Date.now() + 1000,
        duration: 1000,
        exitCode: 0,
        script: 'test script',
        summary: {},
      };

      await repository.save('test-123', testResult);
      const result = repository.findById('test-123');

      expect(result).toEqual(testResult);
    });

    it('should overwrite existing result with same testId', async () => {
      const testResult1: TestResult = {
        testId: 'test-123',
        status: TestStatus.COMPLETED,
        startTime: Date.now(),
        endTime: Date.now() + 1000,
        duration: 1000,
        exitCode: 0,
        script: 'test script 1',
        summary: {},
      };

      const testResult2: TestResult = {
        testId: 'test-123',
        status: TestStatus.FAILED,
        startTime: Date.now(),
        endTime: Date.now() + 2000,
        duration: 2000,
        exitCode: 1,
        script: 'test script 2',
        summary: {},
      };

      await repository.save('test-123', testResult1);
      await repository.save('test-123', testResult2);

      const result = repository.findById('test-123');
      expect(result).toEqual(testResult2);
    });

    it('should cleanup old results when max limit is reached', async () => {
      const smallRepo = new InMemoryTestResultRepository(3);

      for (let i = 1; i <= 5; i++) {
        const testResult: TestResult = {
          testId: `test-${i}`,
          status: TestStatus.COMPLETED,
          startTime: Date.now() + i * 1000,
          endTime: Date.now() + i * 1000 + 100,
          duration: 100,
          exitCode: 0,
          script: `test script ${i}`,
          summary: {},
        };
        await smallRepo.save(`test-${i}`, testResult);
      }

      const allResults = smallRepo.findAll();
      expect(allResults.length).toBe(3);
      expect(smallRepo.findById('test-1')).toBeNull();
      expect(smallRepo.findById('test-2')).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return test result if exists', async () => {
      const testResult: TestResult = {
        testId: 'test-123',
        status: TestStatus.COMPLETED,
        startTime: Date.now(),
        endTime: Date.now() + 1000,
        duration: 1000,
        exitCode: 0,
        script: 'test script',
        summary: {},
      };

      await repository.save('test-123', testResult);
      const result = repository.findById('test-123');

      expect(result).toEqual(testResult);
    });

    it('should return null if test does not exist', () => {
      const result = repository.findById('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return empty array when no results exist', () => {
      const results = repository.findAll();
      expect(results).toEqual([]);
    });

    it('should return all stored results', async () => {
      const testResult1: TestResult = {
        testId: 'test-1',
        status: TestStatus.COMPLETED,
        startTime: Date.now(),
        endTime: Date.now() + 1000,
        duration: 1000,
        exitCode: 0,
        script: 'test script 1',
        summary: {},
      };

      const testResult2: TestResult = {
        testId: 'test-2',
        status: TestStatus.FAILED,
        startTime: Date.now(),
        endTime: Date.now() + 2000,
        duration: 2000,
        exitCode: 1,
        script: 'test script 2',
        summary: {},
      };

      await repository.save('test-1', testResult1);
      await repository.save('test-2', testResult2);

      const results = repository.findAll();
      expect(results).toHaveLength(2);
      expect(results).toContainEqual(testResult1);
      expect(results).toContainEqual(testResult2);
    });
  });

  describe('deleteById', () => {
    it('should delete test result and return true', async () => {
      const testResult: TestResult = {
        testId: 'test-123',
        status: TestStatus.COMPLETED,
        startTime: Date.now(),
        endTime: Date.now() + 1000,
        duration: 1000,
        exitCode: 0,
        script: 'test script',
        summary: {},
      };

      await repository.save('test-123', testResult);
      const deleted = repository.deleteById('test-123');

      expect(deleted).toBe(true);
      expect(repository.findById('test-123')).toBeNull();
    });

    it('should return false if test does not exist', () => {
      const deleted = repository.deleteById('non-existent');
      expect(deleted).toBe(false);
    });
  });
});
