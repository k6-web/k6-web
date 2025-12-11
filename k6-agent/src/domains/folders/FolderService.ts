import {Folder, FolderMetadata, Script} from '@domains/test/models/types';
import {FolderRepository} from './FolderRepository';
import {FileSystemFolderRepository} from './FileSystemFolderRepository';
import {ScriptRepository} from '@domains/scripts/ScriptRepository';
import {FileSystemScriptRepository} from '@domains/scripts/FileSystemScriptRepository';
import {BadRequestError, NotFoundError} from '@shared/errors';
import {FOLDERS_REPO_DIR, MAX_FOLDERS, MAX_SCRIPTS_PER_FOLDER, SCRIPTS_REPO_DIR} from '@shared/configs';
import logger from '@shared/logger';

export class FolderService {
  private readonly folderRepository: FolderRepository;
  private readonly scriptRepository: ScriptRepository;

  constructor(
    folderRepository?: FolderRepository,
    scriptRepository?: ScriptRepository
  ) {
    this.folderRepository = folderRepository ?? new FileSystemFolderRepository(FOLDERS_REPO_DIR);
    this.scriptRepository = scriptRepository ?? new FileSystemScriptRepository(SCRIPTS_REPO_DIR);
  }

  async saveFolder(folderId: string | undefined, metadata: FolderMetadata): Promise<Folder> {
    if (!metadata.name || metadata.name.trim().length === 0) {
      throw new BadRequestError('Folder name is required');
    }

    const now = Date.now();

    if (folderId) {
      const existing = this.folderRepository.findById(folderId);
      if (existing) {
        const updated: Folder = {
          ...existing,
          ...metadata,
          folderId,
          updatedAt: now,
        };
        await this.folderRepository.save(updated);
        logger.info(`Updated folder: ${folderId}`);
        return updated;
      }
    }

    const folderCount = this.folderRepository.count();
    if (folderCount >= MAX_FOLDERS) {
      throw new BadRequestError(`Maximum number of folders (${MAX_FOLDERS}) reached`);
    }

    const newFolderId = folderId || this.generateFolderId(metadata.name);

    if (this.folderRepository.exists(newFolderId)) {
      throw new BadRequestError(`Folder with ID '${newFolderId}' already exists`);
    }

    const newFolder: Folder = {
      folderId: newFolderId,
      name: metadata.name,
      description: metadata.description,
      createdAt: now,
      updatedAt: now,
    };

    await this.folderRepository.save(newFolder);
    logger.info(`Created folder: ${newFolderId}`);
    return newFolder;
  }

  getFolder(folderId: string): Folder {
    const folder = this.folderRepository.findById(folderId);
    if (!folder) {
      throw new NotFoundError(`Folder not found: ${folderId}`);
    }
    return folder;
  }

  getAllFolders(options?: {
    sortBy?: 'createdAt' | 'updatedAt' | 'name';
    sortOrder?: 'asc' | 'desc';
  }): Folder[] {
    return this.folderRepository.findAll(options);
  }

  deleteFolder(folderId: string, forceDelete: boolean = false): void {
    this.getFolder(folderId);

    const deletedScriptCount = this.scriptRepository.deleteByFolderId(folderId);

    if (!forceDelete && deletedScriptCount > 0) {
      logger.warn(`Force deleted ${deletedScriptCount} scripts in folder: ${folderId}`);
    }

    const success = this.folderRepository.deleteById(folderId);
    if (!success) {
      throw new NotFoundError(`Folder not found: ${folderId}`);
    }
    logger.info(`Deleted folder: ${folderId} with ${deletedScriptCount} scripts`);
  }

  getScriptsByFolder(folderId: string): Script[] {
    this.getFolder(folderId);
    return this.scriptRepository.findByFolderId(folderId);
  }

  validateScriptLimit(folderId: string): void {
    const scripts = this.getScriptsByFolder(folderId);
    if (scripts.length >= MAX_SCRIPTS_PER_FOLDER) {
      throw new BadRequestError(`Maximum number of scripts per folder (${MAX_SCRIPTS_PER_FOLDER}) reached`);
    }
  }

  private generateFolderId(name: string): string {
    const sanitized = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return `folder-${sanitized}-${timestamp}-${random}`;
  }
}

export const folderService = new FolderService();
