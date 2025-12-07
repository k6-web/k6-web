import type {K6Summary} from "./k6.ts";

export type TestStatus = 'running' | 'completed' | 'failed' | 'stopped';

export interface Test {
  testId: string;
  name?: string;
  status: TestStatus;
  startTime: number;
  endTime?: number;
  script: string;
  summary?: K6Summary;
}

export interface TestListResponse {
  tests: Test[];
  pagination: {
    nextCursor: number | null;
    hasMore: boolean;
  };
}

export interface RunTestResponse {
  testId: string;
}
