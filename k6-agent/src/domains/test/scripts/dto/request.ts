import {K6TestConfig} from '@domains/test/models/models';

export interface CreateScriptRequest {
  scriptId?: string;
  name: string;
  script: string;
  config?: K6TestConfig;
  description?: string;
  tags?: string[];
  folderId?: string;
}

export interface UpdateScriptRequest {
  name?: string;
  script?: string;
  config?: K6TestConfig;
  description?: string;
  tags?: string[];
  folderId?: string;
}

export interface RunScriptRequest {
  config?: K6TestConfig;
}

export interface CompareTestsRequest {
  testIds: string[];
  baselineIndex?: number;
}

export interface ScriptListQuery {
  tags?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}
