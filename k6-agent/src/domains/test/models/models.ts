export interface K6TestConfig {
  vus?: number;
  duration?: string;
  iterations?: number;
  failureThreshold?: number;
}
