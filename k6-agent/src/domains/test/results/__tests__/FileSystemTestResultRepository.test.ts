import {describe, it, expect, beforeEach, afterEach} from '@jest/globals';
import {FileSystemTestResultRepository} from '../FileSystemTestResultRepository';
import {TestResult} from '@domains/test/models/types';
import {TestStatus} from '@domains/test/models/enums';
import fs from 'fs';
import path from 'path';

describe('FileSystemTestResultRepository', () => {
  const testResultsDir = path.join(__dirname, '__test_results__');
  let repository: FileSystemTestResultRepository;

  beforeEach(() => {
    if (!fs.existsSync(testResultsDir)) {
      fs.mkdirSync(testResultsDir, {recursive: true});
    }
    repository = new FileSystemTestResultRepository(testResultsDir, 100);
  });

  afterEach(() => {
    if (fs.existsSync(testResultsDir)) {
      const files = fs.readdirSync(testResultsDir);
      for (const file of files) {
        fs.unlinkSync(path.join(testResultsDir, file));
      }
      fs.rmdirSync(testResultsDir);
    }
  });

  describe('save', () => {
    it('should save a test result to file', async () => {
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

      const filePath = path.join(testResultsDir, 'test-123.json');
      expect(fs.existsSync(filePath)).toBe(true);

      const savedContent = fs.readFileSync(filePath, 'utf8');
      const savedResult = JSON.parse(savedContent);
      expect(savedResult).toEqual(testResult);
    });

    it('should overwrite existing result file', async () => {
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
      const smallRepo = new FileSystemTestResultRepository(testResultsDir, 3);

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
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      const allResults = smallRepo.findAll();
      expect(allResults.length).toBeLessThanOrEqual(3);
    });
  });

  describe('findById', () => {
    it('should return test result if file exists', async () => {
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

    it('should return null if file does not exist', () => {
      const result = repository.findById('non-existent');
      expect(result).toBeNull();
    });

    it('should return null if file is corrupted', async () => {
      const filePath = path.join(testResultsDir, 'corrupted.json');
      fs.writeFileSync(filePath, 'invalid json {{{');

      const result = repository.findById('corrupted');
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

    it('should skip non-json files', async () => {
      const testResult: TestResult = {
        testId: 'test-1',
        status: TestStatus.COMPLETED,
        startTime: Date.now(),
        endTime: Date.now() + 1000,
        duration: 1000,
        exitCode: 0,
        script: 'test script',
        summary: {},
      };

      await repository.save('test-1', testResult);
      fs.writeFileSync(path.join(testResultsDir, 'readme.txt'), 'not a json');

      const results = repository.findAll();
      expect(results).toHaveLength(1);
    });
  });

  describe('deleteById', () => {
    it('should delete test result file and return true', async () => {
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

      const filePath = path.join(testResultsDir, 'test-123.json');
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('should return false if file does not exist', () => {
      const deleted = repository.deleteById('non-existent');
      expect(deleted).toBe(false);
    });
  });
});
