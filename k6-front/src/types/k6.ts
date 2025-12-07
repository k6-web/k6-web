export interface K6TestConfig {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string | object;
  vusers: number;
  duration: number;
  rampUp?: number;
  name?: string;
}

export interface K6Summary {
  metrics: {
    vus?: K6ValueMetric;
    vus_max?: K6ValueMetric;
    http_req_duration?: K6TimingMetric;
    http_req_waiting?: K6TimingMetric;
    http_req_sending?: K6TimingMetric;
    http_req_receiving?: K6TimingMetric;
    http_req_blocked?: K6TimingMetric;
    http_req_connecting?: K6TimingMetric;
    http_req_tls_handshaking?: K6TimingMetric;
    iteration_duration?: K6TimingMetric;
    checks?: K6CheckMetric;
    http_reqs?: K6CountRateMetric;
    iterations?: K6CountRateMetric;
    data_received?: K6CountRateMetric;
    data_sent?: K6CountRateMetric;
    http_req_failed?: K6CheckMetric;
  };
  root_group: K6Group;
}

export interface K6ValueMetric {
  value: number;
  min: number;
  max: number;
}

export interface K6TimingMetric {
  avg: number;
  min: number;
  med: number;
  max: number;
  'p(90)': number;
  'p(95)': number;
  'p(99)'?: number;
}

export interface K6CountRateMetric {
  count: number;
  rate: number;
}

export interface K6CheckMetric {
  passes: number;
  fails: number;
  value: number;
}

export interface K6Group {
  name: string;
  path: string;
  id: string;
  groups?: Record<string, K6Group>;
  checks?: Record<string, K6Check>;
}

export interface K6Check {
  name: string;
  path: string;
  id: string;
  passes: number;
  fails: number;
}
