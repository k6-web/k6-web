import {Script, TestResult} from '@domains/test/test-types';

export interface ScriptResponse extends Script {
}

export interface ScriptHistoryResponse {
  scriptId: string;
  tests: TestResult[];
  count: number;
}
