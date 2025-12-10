import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import logger from '@shared/logger';
import {Folder} from '@domains/test/models/types';
import {FolderRepository} from './FolderRepository';

export class FileSystemFolderRepository implements FolderRepository {
  private readonly foldersDir: string;

  constructor(foldersDir: string) {
    this.foldersDir = foldersDir;
  }

  async save(folder: Folder): Promise<void> {
    const folderFile = path.join(this.foldersDir, `${folder.folderId}.json`);
    await fs.writeFile(folderFile, JSON.stringify(folder, null, 2));
    logger.info(`Saved folder: ${folder.folderId}`);
  }

  findById(folderId: string): Folder | null {
    const folderFile = path.join(this.foldersDir, `${folderId}.json`);
    try {
      const content = fsSync.readFileSync(folderFile, 'utf8');
      return JSON.parse(content) as Folder;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      logger.error(`Failed to read folder: ${(err as Error).message}`);
      return null;
    }
  }

  findAll(options?: {
    sortBy?: 'createdAt' | 'updatedAt' | 'name';
    sortOrder?: 'asc' | 'desc';
  }): Folder[] {
    const folders: Folder[] = [];
    try {
      if (!fsSync.existsSync(this.foldersDir)) {
        return folders;
      }

      const files = fsSync.readdirSync(this.foldersDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const folderFile = path.join(this.foldersDir, file);
          const content = fsSync.readFileSync(folderFile, 'utf8');
          const folder = JSON.parse(content) as Folder;
          folders.push(folder);
        }
      }

      const sortBy = options?.sortBy || 'updatedAt';
      const sortOrder = options?.sortOrder || 'desc';

      folders.sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'name') {
          comparison = a.name.localeCompare(b.name);
        } else {
          comparison = a[sortBy] - b[sortBy];
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    } catch (err) {
      logger.error(`Failed to read folders: ${(err as Error).message}`);
    }
    return folders;
  }

  deleteById(folderId: string): boolean {
    const folderFile = path.join(this.foldersDir, `${folderId}.json`);
    try {
      fsSync.unlinkSync(folderFile);
      logger.info(`Deleted folder: ${folderId}`);
      return true;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
      logger.error(`Failed to delete folder: ${(err as Error).message}`);
      return false;
    }
  }

  exists(folderId: string): boolean {
    const folderFile = path.join(this.foldersDir, `${folderId}.json`);
    return fsSync.existsSync(folderFile);
  }

  count(): number {
    try {
      if (!fsSync.existsSync(this.foldersDir)) {
        return 0;
      }
      const files = fsSync.readdirSync(this.foldersDir);
      return files.filter(file => file.endsWith('.json')).length;
    } catch (err) {
      logger.error(`Failed to count folders: ${(err as Error).message}`);
      return 0;
    }
  }
}
