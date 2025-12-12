import {K6TestConfig} from '@domains/test/test-models';

export interface RunScriptRequest {
  config?: K6TestConfig;
  name?: string;
}
