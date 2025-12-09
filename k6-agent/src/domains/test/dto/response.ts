import {TestStatus} from '@domains/test/models/enums';

export interface RunTestResponse {
  testId: string;
}

export interface TestResponse {
  testId: string;
  status: TestStatus;
  startTime: number;
  endTime?: number;
  exitCode?: number | null;
  script?: string;
  name?: string;
  summary?: unknown;
  scriptId?: string;
}

export interface TestListResponse {
  tests: TestResponse[];
  pagination: {
    nextCursor: number | null;
    hasMore: boolean;
  };
}

export interface StatusResponse {
  status: 'ok';
}
