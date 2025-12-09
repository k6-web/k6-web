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
