import type {Script, ScriptHistoryResponse, ScriptListResponse} from '../types/script';
import type {K6TestConfig} from '../types/k6';
import type {RunTestResponse} from '../types/test';
import {api} from './common';

export const scriptApi = {
  createScript: async (data: {
    scriptId?: string;
    name: string;
    script: string;
    config?: K6TestConfig;
    description?: string;
    tags?: string[];
    folderId?: string;
  }): Promise<Script> => {
    const response = await api.post<Script>('/v1/scripts', data);
    return response.data;
  },

  getScripts: async (params?: {
    tags?: string;
    sortBy?: 'createdAt' | 'updatedAt' | 'name';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Script[]> => {
    const queryParams = new URLSearchParams();
    if (params?.tags) queryParams.append('tags', params.tags);
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const queryString = queryParams.toString();
    const url = queryString ? `/v1/scripts?${queryString}` : '/v1/scripts';

    const response = await api.get<ScriptListResponse>(url);
    return response.data.scripts;
  },

  getScript: async (scriptId: string): Promise<Script> => {
    const response = await api.get<Script>(`/v1/scripts/${scriptId}`);
    return response.data;
  },

  updateScript: async (scriptId: string, data: {
    name?: string;
    script?: string;
    config?: K6TestConfig;
    description?: string;
    tags?: string[];
    folderId?: string;
  }): Promise<Script> => {
    const response = await api.put<Script>(`/v1/scripts/${scriptId}`, data);
    return response.data;
  },

  deleteScript: async (scriptId: string): Promise<void> => {
    await api.delete(`/v1/scripts/${scriptId}`);
  },

  runScript: async (scriptId: string, config?: K6TestConfig): Promise<RunTestResponse> => {
    const response = await api.post<RunTestResponse>(`/v1/scripts/${scriptId}/run`, {config});
    return response.data;
  },

  getScriptHistory: async (scriptId: string, limit: number = 50): Promise<ScriptHistoryResponse> => {
    const response = await api.get<ScriptHistoryResponse>(`/v1/scripts/${scriptId}/history?limit=${limit}`);
    return response.data;
  },
};
