import {K6TestConfig} from '@domains/test/test-models';

export interface CreateTestRequest {
  script: string;
  name?: string;
  config?: K6TestConfig;
  scriptId?: string;
}

export interface PaginationRequest {
  limit?: number;
  cursor?: number | null;
}
