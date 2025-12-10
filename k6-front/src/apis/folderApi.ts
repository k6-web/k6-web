import type {Folder, FolderWithScripts, Script} from '../types/script';
import type {K6TestConfig} from '../types/k6';
import {api} from './common';

export interface FolderListResponse {
  folders: Folder[];
}

export interface RunAllResponse {
  testIds: string[];
  message: string;
}

export const folderApi = {
  createFolder: async (data: {
    folderId?: string;
    name: string;
    description?: string;
  }): Promise<Folder> => {
    const response = await api.post<Folder>('/v1/folders', data);
    return response.data;
  },

  getFolders: async (params?: {
    sortBy?: 'createdAt' | 'updatedAt' | 'name';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Folder[]> => {
    const queryParams = new URLSearchParams();
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const queryString = queryParams.toString();
    const url = queryString ? `/v1/folders?${queryString}` : '/v1/folders';

    const response = await api.get<FolderListResponse>(url);
    return response.data.folders;
  },

  getFolder: async (folderId: string): Promise<FolderWithScripts> => {
    const response = await api.get<FolderWithScripts>(`/v1/folders/${folderId}`);
    return response.data;
  },

  updateFolder: async (folderId: string, data: {
    name?: string;
    description?: string;
  }): Promise<Folder> => {
    const response = await api.put<Folder>(`/v1/folders/${folderId}`, data);
    return response.data;
  },

  deleteFolder: async (folderId: string): Promise<void> => {
    await api.delete(`/v1/folders/${folderId}`);
  },

  runAllScripts: async (folderId: string): Promise<RunAllResponse> => {
    const response = await api.post<RunAllResponse>(`/v1/folders/${folderId}/run-all`, {});
    return response.data;
  },

  createScript: async (folderId: string, data: {
    scriptId?: string;
    name: string;
    script: string;
    config?: K6TestConfig;
    description?: string;
    tags?: string[];
  }): Promise<Script> => {
    const response = await api.post<Script>(`/v1/folders/${folderId}/scripts`, data);
    return response.data;
  },

  updateScript: async (folderId: string, scriptId: string, data: {
    name?: string;
    script?: string;
    config?: K6TestConfig;
    description?: string;
    tags?: string[];
  }): Promise<Script> => {
    const response = await api.put<Script>(`/v1/folders/${folderId}/scripts/${scriptId}`, data);
    return response.data;
  },

  deleteScript: async (folderId: string, scriptId: string): Promise<void> => {
    await api.delete(`/v1/folders/${folderId}/scripts/${scriptId}`);
  },
};
