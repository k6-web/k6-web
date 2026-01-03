import {ChildProcess} from 'child_process';
import {TestStatus} from '@domains/test/test-enums';
import {K6TestConfig} from '@domains/test/test-models';

export interface TestMetadata {
  name?: string;
  script?: string;
  config?: K6TestConfig;
  scriptId?: string;
}

export interface LogEntry {
  type: 'stdout' | 'stderr' | 'system' | 'error';
  timestamp: number;
  message: string;
}

export type LogListener = (log: LogEntry) => void;

export interface TimeSeriesDataPoint {
  time: number;  // elapsed time in seconds
  vus: number;   // virtual users
  tps: number;   // transactions per second
}

export interface TestInfo {
  testId: string;
  scriptId?: string;
  process: ChildProcess;
  status: TestStatus;
  startTime: number;
  script: string;
  scriptPath: string;
  summaryPath: string;
  logs: LogEntry[];
  logListeners: LogListener[];
  name?: string;
  config?: K6TestConfig;
  timeSeriesData: TimeSeriesDataPoint[];  // Collect during execution
}

export interface TestResult {
  testId: string;
  scriptId?: string;
  status: TestStatus;
  startTime: number;
  endTime: number;
  duration: number;
  exitCode: number | null;
  script: string;
  name?: string;
  config?: K6TestConfig;
  summary: unknown;
  logs?: LogEntry[];
  timeSeriesSnapshot?: TimeSeriesDataPoint[];  // Sampled data points from execution
}

export interface Script {
  scriptId: string;
  script: string;
  config?: K6TestConfig;
  createdAt: number;
  updatedAt: number;
  description?: string;
  tags?: string[];
  folderId?: string;
}

export interface Folder {
  folderId: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

export interface FolderMetadata {
  name: string;
  description?: string;
}

export interface ScriptMetadata {
  script: string;
  config?: K6TestConfig;
  description?: string;
  tags?: string[];
  folderId: string;
}

export interface MetricComparison {
  metricName: string;
  baseline: number;
  current: number;
  change: number;
  changePercent: number;
  improved: boolean;
}

export interface TestComparison {
  baselineTestId: string;
  currentTestId: string;
  baselineTime: number;
  currentTime: number;
  metrics: MetricComparison[];
  summary: {
    improved: number;
    degraded: number;
    unchanged: number;
  };
}
