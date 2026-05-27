export interface CreateFolderRequest {
  folderId?: string;
  name: string;
  description?: string;
}

export interface UpdateFolderRequest {
  name?: string;
  description?: string;
}

export interface FolderListQuery {
  sortBy?: 'createdAt' | 'updatedAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export interface ImportPostmanScriptsRequest {
  collection: unknown;
  config?: {
    vusers?: number;
    duration?: number;
    rampUp?: number;
    stages?: Array<{duration: number; target: number}>;
    targetTps?: number;
    preAllocatedVUs?: number;
    maxVUs?: number;
    failureThreshold?: number;
    template?: 'constant-vus' | 'constant-tps' | 'ramp-up';
  };
  tags?: string[];
}
