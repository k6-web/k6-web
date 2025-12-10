import {Folder} from '@domains/test/models/types';

export interface FolderRepository {
  save(folder: Folder): Promise<void>;

  findById(folderId: string): Folder | null;

  findAll(options?: {
    sortBy?: 'createdAt' | 'updatedAt' | 'name';
    sortOrder?: 'asc' | 'desc';
  }): Folder[];

  deleteById(folderId: string): boolean;

  exists(folderId: string): boolean;

  count(): number;
}
