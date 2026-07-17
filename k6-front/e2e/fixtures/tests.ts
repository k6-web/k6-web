import type {Test} from '../../src/types/test';
import type {K6Summary} from '../../src/types/k6';

const BASE_TIME = Date.UTC(2026, 6, 1, 9, 0, 0);

const completedSummary: K6Summary = {
  metrics: {
    vus: {value: 10, min: 1, max: 10},
    vus_max: {value: 10, min: 10, max: 10},
    http_reqs: {count: 12000, rate: 200.5},
    iterations: {count: 12000, rate: 200.5},
    http_req_duration: {avg: 48.2, min: 12.1, med: 45.3, max: 310.7, 'p(90)': 78.4, 'p(95)': 95.2, 'p(99)': 180.9},
    checks: {passes: 11940, fails: 60, value: 0.995},
    http_req_failed: {passes: 60, fails: 11940, value: 0.005},
    data_received: {count: 52428800, rate: 873813},
    data_sent: {count: 1048576, rate: 17476},
  },
  root_group: {
    name: '',
    path: '',
    id: 'd41d8cd98f00b204e9800998ecf8427e',
    checks: {
      'status is 200': {
        name: 'status is 200',
        path: '::status is 200',
        id: '1f9f1c1e5c1a4b2b8c3d4e5f6a7b8c9d',
        passes: 11940,
        fails: 60,
      },
    },
  },
};

export const sampleScriptContent = `import http from 'k6/http';
import {check} from 'k6';

export const options = {
  vus: 10,
  duration: '60s',
};

export default function () {
  const res = http.get('https://example.com');
  check(res, {'status is 200': (r) => r.status === 200});
}
`;

export const completedTest: Test = {
  testId: 'test-completed-001',
  name: 'Checkout API load test',
  status: 'completed',
  startTime: BASE_TIME,
  createdAt: BASE_TIME,
  endTime: BASE_TIME + 60_000,
  script: sampleScriptContent,
  summary: completedSummary,
  timeSeriesSnapshot: [
    {time: BASE_TIME, vus: 5, tps: 120, latencyAvg: 42.5, errorRate: 0},
    {time: BASE_TIME + 20_000, vus: 10, tps: 210, latencyAvg: 48.1, errorRate: 0.4},
    {time: BASE_TIME + 40_000, vus: 10, tps: 205, latencyAvg: 51.3, errorRate: 0.6},
    {time: BASE_TIME + 60_000, vus: 10, tps: 198, latencyAvg: 47.9, errorRate: 0.5},
  ],
};

export const failedTest: Test = {
  testId: 'test-failed-002',
  name: 'Payment API stress test',
  status: 'failed',
  startTime: BASE_TIME + 3_600_000,
  createdAt: BASE_TIME + 3_600_000,
  endTime: BASE_TIME + 3_605_000,
  script: sampleScriptContent,
  logs: [
    {timestamp: BASE_TIME + 3_601_000, type: 'stderr', message: 'ERRO[0001] dial tcp: connection refused'},
  ],
};

export const queuedTest: Test = {
  testId: 'test-queued-003',
  status: 'queued',
  startTime: BASE_TIME + 7_200_000,
  createdAt: BASE_TIME + 7_200_000,
  queuedAt: BASE_TIME + 7_200_000,
  script: sampleScriptContent,
};

export const sampleTests: Test[] = [completedTest, failedTest, queuedTest];

/** Generates completed tests with summaries, for pagination/comparison/history scenarios. */
export const makeCompletedTests = (count: number, options: {scriptId?: string; namePrefix?: string} = {}): Test[] =>
  Array.from({length: count}, (_, i) => ({
    testId: `test-gen-${String(i + 1).padStart(3, '0')}`,
    name: `${options.namePrefix ?? 'Generated test'} #${i + 1}`,
    scriptId: options.scriptId,
    status: 'completed' as const,
    startTime: BASE_TIME + i * 60_000,
    createdAt: BASE_TIME + i * 60_000,
    endTime: BASE_TIME + i * 60_000 + 30_000,
    script: sampleScriptContent,
    summary: completedSummary,
  }));
