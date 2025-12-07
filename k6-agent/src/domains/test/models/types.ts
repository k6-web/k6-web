import {ChildProcess} from 'child_process';
import {TestStatus} from '@domains/test/models/enums';
import {K6TestConfig} from '@domains/test/models/models';

// Internal domain types (not exposed via API)

export interface TestMetadata {
  name?: string;
  script?: string;
  config?: K6TestConfig;
}

export interface LogEntry {
  type: 'stdout' | 'stderr' | 'system' | 'error';
  timestamp: number;
  message: string;
}

export type LogListener = (log: LogEntry) => void;

export interface TestInfo {
  testId: string;
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
}

export interface TestResult {
  testId: string;
  status: TestStatus;
  startTime: number;
  endTime: number;
  duration: number;
  exitCode: number | null;
  script: string;
  name?: string;
  config?: K6TestConfig;
  summary: unknown;
}
