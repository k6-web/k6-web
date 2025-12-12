import {describe, it, expect, jest, beforeEach} from '@jest/globals';
import {ScriptService} from '../script-service';
import {ScriptRepository} from '../script-repository';
import {TestResultRepository} from '@domains/results';
import {Script, TestResult} from '@domains/test/test-types';
import {BadRequestError, NotFoundError} from '@shared/http/errors';
import {TestStatus} from '@domains/test/test-enums';

describe('ScriptService', () => {
  let scriptService: ScriptService;
  let mockScriptRepository: jest.Mocked<ScriptRepository>;
  let mockResultRepository: jest.Mocked<TestResultRepository>;

  beforeEach(() => {
    mockScriptRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findByFolderId: jest.fn(),
      deleteById: jest.fn(),
      deleteByFolderId: jest.fn(),
      exists: jest.fn(),
    } as jest.Mocked<ScriptRepository>;

    mockResultRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      deleteById: jest.fn(),
      findByScriptId: jest.fn(),
      cleanupScriptHistory: jest.fn(),
    } as jest.Mocked<TestResultRepository>;

    scriptService = new ScriptService(mockScriptRepository, mockResultRepository);
    jest.clearAllMocks();
  });

  describe('saveScript', () => {
    it('should create a new script with valid metadata', async () => {
      const metadata = {
        script: 'export default function() {}',
        folderId: 'folder-1',
        description: 'A test script',
        tags: ['smoke', 'api'],
      };

      mockScriptRepository.findByFolderId.mockReturnValue([]);
      mockScriptRepository.exists.mockReturnValue(false);

      const result = await scriptService.saveScript(undefined, metadata);

      expect(result.script).toBe(metadata.script);
      expect(result.folderId).toBe(metadata.folderId);
      expect(result.description).toBe(metadata.description);
      expect(result.tags).toEqual(metadata.tags);
      expect(result.scriptId).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(mockScriptRepository.save).toHaveBeenCalledWith(result);
    });

    it('should update existing script when scriptId is provided', async () => {
      const existingScript: Script = {
        scriptId: 'script-1',
        script: 'original script',
        folderId: 'folder-1',
        description: 'Original description',
        tags: ['old'],
        createdAt: 1000,
        updatedAt: 1000,
      };

      const updateMetadata = {
        script: 'updated script',
        folderId: 'folder-1',
        description: 'Updated description',
        tags: ['new'],
      };

      mockScriptRepository.findById.mockReturnValue(existingScript);

      const result = await scriptService.saveScript(existingScript.scriptId, updateMetadata);

      expect(result.scriptId).toBe(existingScript.scriptId);
      expect(result.script).toBe(updateMetadata.script);
      expect(result.description).toBe(updateMetadata.description);
      expect(result.tags).toEqual(updateMetadata.tags);
      expect(result.createdAt).toBe(existingScript.createdAt);
      expect(result.updatedAt).toBeGreaterThan(existingScript.updatedAt);
      expect(mockScriptRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestError when script content is empty', async () => {
      await expect(
        scriptService.saveScript(undefined, {
          script: '',
          folderId: 'folder-1',
        })
      ).rejects.toThrow(BadRequestError);

      await expect(
        scriptService.saveScript(undefined, {
          script: '   ',
          folderId: 'folder-1',
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError when folderId is missing', async () => {
      await expect(
        scriptService.saveScript(undefined, {
          script: 'export default function() {}',
          folderId: '',
        })
      ).rejects.toThrow(BadRequestError);

      await expect(
        scriptService.saveScript(undefined, {
          script: 'export default function() {}',
          folderId: '   ',
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError when folder script limit is reached', async () => {
      const metadata = {
        script: 'export default function() {}',
        folderId: 'folder-1',
      };

      const existingScripts = Array.from({length: 100}, (_, i) => ({
        scriptId: `script-${i}`,
        script: 'test',
        folderId: 'folder-1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }));

      mockScriptRepository.findByFolderId.mockReturnValue(existingScripts);

      await expect(
        scriptService.saveScript(undefined, metadata)
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError when script with same ID already exists', async () => {
      const scriptId = 'existing-script';
      const metadata = {
        script: 'export default function() {}',
        folderId: 'folder-1',
      };

      mockScriptRepository.findById.mockReturnValue(null);
      mockScriptRepository.findByFolderId.mockReturnValue([]);
      mockScriptRepository.exists.mockReturnValue(true);

      await expect(
        scriptService.saveScript(scriptId, metadata)
      ).rejects.toThrow(BadRequestError);
    });

    it('should generate script ID with timestamp', async () => {
      const metadata = {
        script: 'export default function() {}',
        folderId: 'folder-1',
      };

      mockScriptRepository.findByFolderId.mockReturnValue([]);
      mockScriptRepository.exists.mockReturnValue(false);

      const result = await scriptService.saveScript(undefined, metadata);

      expect(result.scriptId).toMatch(/^script-\d+$/);
    });

    it('should allow custom script ID', async () => {
      const customScriptId = 'my-custom-script';
      const metadata = {
        script: 'export default function() {}',
        folderId: 'folder-1',
      };

      mockScriptRepository.findByFolderId.mockReturnValue([]);
      mockScriptRepository.exists.mockReturnValue(false);

      const result = await scriptService.saveScript(customScriptId, metadata);

      expect(result.scriptId).toBe(customScriptId);
    });
  });

  describe('getScript', () => {
    it('should return script by id', () => {
      const script: Script = {
        scriptId: 'script-1',
        script: 'export default function() {}',
        folderId: 'folder-1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockScriptRepository.findById.mockReturnValue(script);

      const result = scriptService.getScript(script.scriptId);

      expect(result).toEqual(script);
      expect(mockScriptRepository.findById).toHaveBeenCalledWith(script.scriptId);
    });

    it('should throw NotFoundError when script does not exist', () => {
      mockScriptRepository.findById.mockReturnValue(null);

      expect(() => {
        scriptService.getScript('non-existent');
      }).toThrow(NotFoundError);
    });
  });

  describe('deleteScript', () => {
    it('should delete script by id', () => {
      mockScriptRepository.deleteById.mockReturnValue(true);

      scriptService.deleteScript('script-1');

      expect(mockScriptRepository.deleteById).toHaveBeenCalledWith('script-1');
    });

    it('should throw NotFoundError when script does not exist', () => {
      mockScriptRepository.deleteById.mockReturnValue(false);

      expect(() => {
        scriptService.deleteScript('non-existent');
      }).toThrow(NotFoundError);
    });
  });

  describe('getScriptHistory', () => {
    it('should return test results for a script', () => {
      const scriptId = 'script-1';
      const script: Script = {
        scriptId,
        script: 'export default function() {}',
        folderId: 'folder-1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const testResults: TestResult[] = [
        {
          testId: 'test-1',
          scriptId,
          status: TestStatus.COMPLETED,
          startTime: Date.now(),
          endTime: Date.now(),
          duration: 1000,
          exitCode: 0,
          script: script.script,
          summary: {},
        },
        {
          testId: 'test-2',
          scriptId,
          status: TestStatus.COMPLETED,
          startTime: Date.now(),
          endTime: Date.now(),
          duration: 1500,
          exitCode: 0,
          script: script.script,
          summary: {},
        },
        {
          testId: 'test-3',
          scriptId,
          status: TestStatus.FAILED,
          startTime: Date.now(),
          endTime: Date.now(),
          duration: 500,
          exitCode: 1,
          script: script.script,
          summary: {},
        },
      ];

      mockScriptRepository.findById.mockReturnValue(script);
      mockResultRepository.findByScriptId.mockReturnValue(testResults);

      const result = scriptService.getScriptHistory(scriptId, 10);

      expect(result).toEqual(testResults);
      expect(mockScriptRepository.findById).toHaveBeenCalledWith(scriptId);
      expect(mockResultRepository.findByScriptId).toHaveBeenCalledWith(scriptId);
    });

    it('should limit the number of results', () => {
      const scriptId = 'script-1';
      const script: Script = {
        scriptId,
        script: 'export default function() {}',
        folderId: 'folder-1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const testResults: TestResult[] = Array.from({length: 10}, (_, i) => ({
        testId: `test-${i}`,
        scriptId,
        status: TestStatus.COMPLETED,
        startTime: Date.now(),
        endTime: Date.now(),
        duration: 1000,
        exitCode: 0,
        script: script.script,
        summary: {},
      }));

      mockScriptRepository.findById.mockReturnValue(script);
      mockResultRepository.findByScriptId.mockReturnValue(testResults);

      const result = scriptService.getScriptHistory(scriptId, 5);

      expect(result).toHaveLength(5);
    });

    it('should throw NotFoundError when script does not exist', () => {
      mockScriptRepository.findById.mockReturnValue(null);

      expect(() => {
        scriptService.getScriptHistory('non-existent', 10);
      }).toThrow(NotFoundError);
    });

    it('should return empty array when no test results exist', () => {
      const scriptId = 'script-1';
      const script: Script = {
        scriptId,
        script: 'export default function() {}',
        folderId: 'folder-1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockScriptRepository.findById.mockReturnValue(script);
      mockResultRepository.findByScriptId.mockReturnValue([]);

      const result = scriptService.getScriptHistory(scriptId, 10);

      expect(result).toEqual([]);
    });
  });
});
