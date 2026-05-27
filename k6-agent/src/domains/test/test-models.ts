export interface K6TestConfig {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string | object;
  vusers?: number;
  vus?: number;
  duration?: string | number;
  rampUp?: number;
  stages?: Array<{duration: number; target: number}>;
  targetTps?: number;
  preAllocatedVUs?: number;
  maxVUs?: number;
  iterations?: number;
  name?: string;
  failureThreshold?: number;
  template?: 'constant-vus' | 'constant-tps' | 'ramp-up';
}
