import {Script, TestComparison, TestResult} from '@domains/test/models/types';

export interface ScriptResponse extends Script {
}

export interface ScriptListResponse {
  scripts: ScriptResponse[];
}

export interface ScriptHistoryResponse {
  scriptId: string;
  tests: TestResult[];
  count: number;
}

export interface ComparisonResponse extends TestComparison {
}
