import type {K6Summary} from "./k6.ts";
import type {LogEntry} from "./log.ts";

export type TestStatus = 'running' | 'completed' | 'failed' | 'stopped';

export interface TimeSeriesDataPoint {
  time: number;
  vus: number;
  tps: number;
  latencyAvg?: number;
  errorRate?: number;
}

export interface Test {
  testId: string;
  scriptId?: string;
  name?: string;
  status: TestStatus;
  startTime: number;
  endTime?: number;
  script: string;
  summary?: K6Summary;
  logs?: LogEntry[];
  timeSeriesSnapshot?: TimeSeriesDataPoint[];
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
