import type {K6TestConfig} from './k6';
import type {Test} from './test';

export interface Script {
  scriptId: string;
  name: string;
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

export interface FolderWithScripts {
  folder: Folder;
  scripts: Script[];
  scriptCount: number;
}

export interface ScriptListResponse {
  scripts: Script[];
}

export interface ScriptHistoryResponse {
  scriptId: string;
  scriptName: string;
  tests: Test[];
  count: number;
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
