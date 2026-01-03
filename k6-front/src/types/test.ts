import type {K6Summary} from "./k6.ts";
import type {LogEntry} from "./log.ts";

export type TestStatus = 'running' | 'completed' | 'failed' | 'stopped';

export interface TimeSeriesDataPoint {
  time: number;  // elapsed time in seconds
  vus: number;   // virtual users
  tps: number;   // transactions per second
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
