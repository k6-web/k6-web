import {describe, it, expect, jest, beforeEach} from '@jest/globals';
import {FolderService} from '../FolderService';
import {FolderRepository} from '../FolderRepository';
import {ScriptRepository} from '@domains/scripts/ScriptRepository';
import {Folder, Script} from '@domains/test/models/types';
import {BadRequestError, NotFoundError} from '@shared/errors';

describe('FolderService', () => {
  let folderService: FolderService;
  let mockFolderRepository: jest.Mocked<FolderRepository>;
  let mockScriptRepository: jest.Mocked<ScriptRepository>;

  beforeEach(() => {
    mockFolderRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      deleteById: jest.fn(),
      exists: jest.fn(),
      count: jest.fn(),
    } as jest.Mocked<FolderRepository>;

    mockScriptRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findByFolderId: jest.fn(),
      deleteById: jest.fn(),
      deleteByFolderId: jest.fn(),
      exists: jest.fn(),
    } as jest.Mocked<ScriptRepository>;

    folderService = new FolderService(mockFolderRepository, mockScriptRepository);
    jest.clearAllMocks();
  });

  describe('saveFolder', () => {
    it('should create a new folder with valid metadata', async () => {
      const metadata = {
        name: 'Test Folder',
        description: 'A test folder',
      };

      mockFolderRepository.count.mockReturnValue(0);
      mockFolderRepository.exists.mockReturnValue(false);

      const result = await folderService.saveFolder(undefined, metadata);

      expect(result.name).toBe(metadata.name);
      expect(result.description).toBe(metadata.description);
      expect(result.folderId).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(mockFolderRepository.save).toHaveBeenCalledWith(result);
    });

    it('should update existing folder when folderId is provided', async () => {
      const existingFolder: Folder = {
        folderId: 'folder-1',
        name: 'Original Name',
        description: 'Original description',
        createdAt: 1000,
        updatedAt: 1000,
      };

      const updateMetadata = {
        name: 'Updated Name',
        description: 'Updated description',
      };

      mockFolderRepository.findById.mockReturnValue(existingFolder);

      const result = await folderService.saveFolder(existingFolder.folderId, updateMetadata);

      expect(result.folderId).toBe(existingFolder.folderId);
      expect(result.name).toBe(updateMetadata.name);
      expect(result.description).toBe(updateMetadata.description);
      expect(result.createdAt).toBe(existingFolder.createdAt);
      expect(result.updatedAt).toBeGreaterThan(existingFolder.updatedAt);
      expect(mockFolderRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestError when folder name is empty', async () => {
      await expect(
        folderService.saveFolder(undefined, {name: ''})
      ).rejects.toThrow(BadRequestError);

      await expect(
        folderService.saveFolder(undefined, {name: '   '})
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError when maximum folders limit is reached', async () => {
      const metadata = {name: 'Test Folder'};

      mockFolderRepository.count.mockReturnValue(100); // Assuming MAX_FOLDERS is 100

      await expect(
        folderService.saveFolder(undefined, metadata)
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError when folder with same ID already exists', async () => {
      const folderId = 'existing-folder';
      const metadata = {name: 'Test Folder'};

      mockFolderRepository.findById.mockReturnValue(null);
      mockFolderRepository.count.mockReturnValue(0);
      mockFolderRepository.exists.mockReturnValue(true);

      await expect(
        folderService.saveFolder(folderId, metadata)
      ).rejects.toThrow(BadRequestError);
    });

    it('should generate folder ID from name', async () => {
      const metadata = {name: 'My Test Folder'};

      mockFolderRepository.count.mockReturnValue(0);
      mockFolderRepository.exists.mockReturnValue(false);

      const result = await folderService.saveFolder(undefined, metadata);

      expect(result.folderId).toMatch(/^folder-my-test-folder-/);
    });

    it('should sanitize folder ID from special characters', async () => {
      const metadata = {name: 'Test@#$Folder!!!'};

      mockFolderRepository.count.mockReturnValue(0);
      mockFolderRepository.exists.mockReturnValue(false);

      const result = await folderService.saveFolder(undefined, metadata);

      expect(result.folderId).toMatch(/^folder-test-folder-/);
    });
  });

  describe('getFolder', () => {
    it('should return folder by id', () => {
      const folder: Folder = {
        folderId: 'folder-1',
        name: 'Test Folder',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockFolderRepository.findById.mockReturnValue(folder);

      const result = folderService.getFolder(folder.folderId);

      expect(result).toEqual(folder);
      expect(mockFolderRepository.findById).toHaveBeenCalledWith(folder.folderId);
    });

    it('should throw NotFoundError when folder does not exist', () => {
      mockFolderRepository.findById.mockReturnValue(null);

      expect(() => {
        folderService.getFolder('non-existent');
      }).toThrow(NotFoundError);
    });
  });

  describe('getAllFolders', () => {
    it('should return all folders', () => {
      const folders: Folder[] = [
        {
          folderId: 'folder-1',
          name: 'Folder 1',
          createdAt: 1000,
          updatedAt: 1000,
        },
        {
          folderId: 'folder-2',
          name: 'Folder 2',
          createdAt: 2000,
          updatedAt: 2000,
        },
      ];

      mockFolderRepository.findAll.mockReturnValue(folders);

      const result = folderService.getAllFolders();

      expect(result).toEqual(folders);
      expect(mockFolderRepository.findAll).toHaveBeenCalled();
    });

    it('should pass sort options to repository', () => {
      const options = {sortBy: 'name' as const, sortOrder: 'asc' as const};

      mockFolderRepository.findAll.mockReturnValue([]);

      folderService.getAllFolders(options);

      expect(mockFolderRepository.findAll).toHaveBeenCalledWith(options);
    });
  });

  describe('deleteFolder', () => {
    it('should delete folder and its scripts', () => {
      const folder: Folder = {
        folderId: 'folder-1',
        name: 'Test Folder',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockFolderRepository.findById.mockReturnValue(folder);
      mockScriptRepository.deleteByFolderId.mockReturnValue(3);
      mockFolderRepository.deleteById.mockReturnValue(true);

      folderService.deleteFolder(folder.folderId);

      expect(mockFolderRepository.findById).toHaveBeenCalledWith(folder.folderId);
      expect(mockScriptRepository.deleteByFolderId).toHaveBeenCalledWith(folder.folderId);
      expect(mockFolderRepository.deleteById).toHaveBeenCalledWith(folder.folderId);
    });

    it('should delete folder with force flag', () => {
      const folder: Folder = {
        folderId: 'folder-1',
        name: 'Test Folder',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockFolderRepository.findById.mockReturnValue(folder);
      mockScriptRepository.deleteByFolderId.mockReturnValue(5);
      mockFolderRepository.deleteById.mockReturnValue(true);

      folderService.deleteFolder(folder.folderId, true);

      expect(mockScriptRepository.deleteByFolderId).toHaveBeenCalledWith(folder.folderId);
      expect(mockFolderRepository.deleteById).toHaveBeenCalledWith(folder.folderId);
    });

    it('should throw NotFoundError when folder does not exist', () => {
      mockFolderRepository.findById.mockReturnValue(null);

      expect(() => {
        folderService.deleteFolder('non-existent');
      }).toThrow(NotFoundError);
    });

    it('should throw NotFoundError when deletion fails', () => {
      const folder: Folder = {
        folderId: 'folder-1',
        name: 'Test Folder',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockFolderRepository.findById.mockReturnValue(folder);
      mockScriptRepository.deleteByFolderId.mockReturnValue(0);
      mockFolderRepository.deleteById.mockReturnValue(false);

      expect(() => {
        folderService.deleteFolder(folder.folderId);
      }).toThrow(NotFoundError);
    });
  });

  describe('getScriptsByFolder', () => {
    it('should return scripts for a folder', () => {
      const folderId = 'folder-1';
      const folder: Folder = {
        folderId,
        name: 'Test Folder',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const scripts: Script[] = [
        {
          scriptId: 'script-1',
          script: 'test script 1',
          folderId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          scriptId: 'script-2',
          script: 'test script 2',
          folderId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      mockFolderRepository.findById.mockReturnValue(folder);
      mockScriptRepository.findByFolderId.mockReturnValue(scripts);

      const result = folderService.getScriptsByFolder(folderId);

      expect(result).toEqual(scripts);
      expect(mockFolderRepository.findById).toHaveBeenCalledWith(folderId);
      expect(mockScriptRepository.findByFolderId).toHaveBeenCalledWith(folderId);
    });

    it('should throw NotFoundError when folder does not exist', () => {
      mockFolderRepository.findById.mockReturnValue(null);

      expect(() => {
        folderService.getScriptsByFolder('non-existent');
      }).toThrow(NotFoundError);
    });
  });
});
