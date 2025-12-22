import type {RunTestResponse, Test, TestListResponse} from '../types/test.ts';
import type {K6TestConfig} from '../types/k6.ts';
import {api, API_BASE_URL} from "./common.ts";

export const k6Api = {
  getTests: async (cursor?: number | null, limit: number = 100): Promise<TestListResponse> => {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (cursor !== null && cursor !== undefined) {
      params.append('cursor', cursor.toString());
    }
    const response = await api.get<TestListResponse>(`/v1/tests?${params.toString()}`);
    return response.data;
  },

  getTest: async (testId: string): Promise<Test> => {
    const response = await api.get<Test>(`/v1/tests/${testId}`);
    return response.data;
  },

  runTest: async (script: string, metadata?: { name?: string; config?: K6TestConfig; scriptId?: string }): Promise<RunTestResponse> => {
    const payload = metadata ? {script, ...metadata} : script;
    const response = await api.post<RunTestResponse>('/v1/tests', payload, {
      headers: {'Content-Type': metadata ? 'application/json' : 'text/plain'}
    });
    return response.data;
  },

  stopTest: async (testId: string): Promise<{ testId: string; message: string; status: string }> => {
    const response = await api.put(`/v1/tests/${testId}/stop`);
    return response.data;
  },

  deleteTest: async (testId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/v1/tests/${testId}`);
    return response.data;
  },

  getTestLogStreamUrl: (testId: string): string => {
    return `${API_BASE_URL}/v1/tests/${testId}/stream`;
  },
};
