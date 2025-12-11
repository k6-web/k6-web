import {K6TestConfig} from '@domains/test/models/models';

export interface RunScriptRequest {
  config?: K6TestConfig;
  name?: string;
}
