import type {K6Summary, K6TestConfig} from "./k6.ts";
import type {LogEntry} from "./log.ts";

export type TestStatus = 'scheduled' | 'queued' | 'running' | 'completed' | 'failed' | 'stopped' | 'cancelled';

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
  createdAt?: number;
  scheduledAt?: number;
  queuedAt?: number;
  endTime?: number;
  script: string;
  config?: K6TestConfig;
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
  status?: TestStatus;
  scheduledAt?: number;
}
