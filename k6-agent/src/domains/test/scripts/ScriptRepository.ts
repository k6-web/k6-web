import {Script} from '@domains/test/models/types';

export interface ScriptRepository {
  save(script: Script): Promise<void>;

  findById(scriptId: string): Script | null;

  findAll(options?: {
    tags?: string[];
    sortBy?: 'createdAt' | 'updatedAt' | 'name';
    sortOrder?: 'asc' | 'desc';
  }): Script[];

  deleteById(scriptId: string): boolean;

  exists(scriptId: string): boolean;
}
