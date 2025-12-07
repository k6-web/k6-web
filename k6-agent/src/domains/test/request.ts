import {K6TestConfig} from '@domains/test/models';

export interface CreateTestRequest {
  script: string;
  name?: string;
  config?: K6TestConfig;
}

export interface PaginationRequest {
  limit?: number;
  cursor?: number | null;
}
