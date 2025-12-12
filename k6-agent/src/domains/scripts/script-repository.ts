import {Script} from '@domains/test/test-types';

export interface ScriptRepository {
  save(script: Script): Promise<void>;

  findById(scriptId: string): Script | null;

  findAll(options?: {
    tags?: string[];
    sortBy?: 'createdAt' | 'updatedAt' | 'name';
    sortOrder?: 'asc' | 'desc';
  }): Script[];

  findByFolderId(folderId: string): Script[];

  deleteById(scriptId: string): boolean;

  deleteByFolderId(folderId: string): number;

  exists(scriptId: string): boolean;
}
