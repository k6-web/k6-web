import axios from 'axios';
import type {HealthResponse, HttpTestConfig, RunTestResponse, TestInfo, TestListResponse, TestResult} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const k6Api = {
  health: async (): Promise<HealthResponse> => {
    const response = await api.get<HealthResponse>('/health');
    return response.data;
  },

  getTests: async (cursor?: number | null, limit: number = 100): Promise<TestListResponse> => {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (cursor !== null && cursor !== undefined) {
      params.append('cursor', cursor.toString());
    }
    const response = await api.get<TestListResponse>(`/tests?${params.toString()}`);
    return response.data;
  },

  getTest: async (testId: string): Promise<TestInfo> => {
    const response = await api.get<TestInfo>(`/tests/${testId}`);
    return response.data;
  },

  getTestResult: async (testId: string): Promise<TestResult> => {
    const response = await api.get<TestResult>(`/tests/${testId}/result`);
    return response.data;
  },

  runScript: async (script: string, metadata?: { name?: string; config?: HttpTestConfig }): Promise<RunTestResponse> => {
    const payload = metadata ? { script, ...metadata } : script;
    const response = await api.post<RunTestResponse>('/run', payload, {
      headers: { 'Content-Type': metadata ? 'application/json' : 'text/plain' }
    });
    return response.data;
  },
  stopTest: async (testId: string): Promise<{ testId: string; message: string; status: string }> => {
    const response = await api.post(`/stop/${testId}`);
    return response.data;
  },

  stopAllTests: async (): Promise<{ message: string; stoppedTests: string[] }> => {
    const response = await api.post('/stop-all');
    return response.data;
  },

  deleteTestResult: async (testId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/results/${testId}`);
    return response.data;
  },

  getStreamUrl: (testId: string): string => {
    return `${API_BASE_URL}/stream/${testId}`;
  },
};
