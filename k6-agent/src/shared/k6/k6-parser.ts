import fs from 'fs';
import readline from 'readline';
import {TimeSeriesDataPoint} from '@domains/test/test-types';

interface K6JsonMetric {
  metric: string;
  type: string;
  data: {
    time: string;
    value: number;
    tags?: Record<string, string>;
  };
}

interface AggregatedWindow {
  vus: number;
  tps: number;
  latencySum: number;
  latencyCount: number;
  errorCount: number;
  totalCount: number;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

function windowsToDataPoints(windows: Map<number, AggregatedWindow>): TimeSeriesDataPoint[] {
  if (windows.size === 0) return [];

  const sortedKeys = Array.from(windows.keys()).sort((a, b) => a - b);
  const startTime = sortedKeys[0];

  return sortedKeys.map(key => {
    const w = windows.get(key)!;
    const elapsedSeconds = key - startTime;

    const latencyAvg = w.latencyCount > 0 ? round2(w.latencySum / w.latencyCount) : undefined;

    const errorRate = w.totalCount > 0 ? w.errorCount / w.totalCount : 0;

    return {
      time: elapsedSeconds,
      vus: w.vus,
      tps: w.tps,
      latencyAvg,
      errorRate: round2(errorRate),
    };
  });
}

function processLine(line: string, windows: Map<number, AggregatedWindow>): void {
  let entry: K6JsonMetric;
  try {
    entry = JSON.parse(line) as K6JsonMetric;
  } catch {
    return;
  }

  if (entry.type !== 'Point') return;

  const metricName = entry.metric;
  const {time, value} = entry.data;
  const epochMs = new Date(time).getTime();
  const windowKey = Math.floor(epochMs / 1000);

  if (!windows.has(windowKey)) {
    windows.set(windowKey, {
      vus: 0,
      tps: 0,
      latencySum: 0,
      latencyCount: 0,
      errorCount: 0,
      totalCount: 0,
    });
  }

  const w = windows.get(windowKey)!;

  if (metricName === 'vus') {
    w.vus = Math.max(w.vus, value);
  } else if (metricName === 'http_reqs') {
    w.tps += value;
    w.totalCount += value;
  } else if (metricName === 'http_req_duration') {
    w.latencySum += value;
    w.latencyCount++;
  } else if (metricName === 'http_req_failed' && value === 1) {
    w.errorCount++;
  }
}

/**
 * Parse k6 --out json JSONL file using streaming readline to handle large files.
 * Aggregates raw metric points into per-second windows.
 */
export function parseK6JsonlFile(jsonlPath: string): Promise<TimeSeriesDataPoint[]> {
  if (!fs.existsSync(jsonlPath)) {
    return Promise.resolve([]);
  }

  return new Promise((resolve, reject) => {
    const windows = new Map<number, AggregatedWindow>();
    const rl = readline.createInterface({
      input: fs.createReadStream(jsonlPath),
      crlfDelay: Infinity,
    });

    rl.on('line', (line) => {
      if (line.trim()) processLine(line, windows);
    });

    rl.on('close', () => resolve(windowsToDataPoints(windows)));
    rl.on('error', reject);
  });
}

/**
 * Sample data points to reduce storage size
 * Strategy: Keep max N points evenly distributed across the time range
 */
export function sampleDataPoints(
  dataPoints: TimeSeriesDataPoint[],
  maxPoints: number = 100
): TimeSeriesDataPoint[] {
  if (dataPoints.length === 0) {
    return dataPoints;
  }

  // Remove last point if TPS is 0 (test completion artifact)
  const lastIndex = dataPoints.length - 1;
  const end = (dataPoints.length > 1 && dataPoints[lastIndex].tps === 0) ? lastIndex : dataPoints.length;

  if (end <= maxPoints) {
    return dataPoints.slice(0, end);
  }

  const result: TimeSeriesDataPoint[] = [];
  const interval = end / maxPoints;
  for (let i = 0; i < maxPoints; i++) {
    result.push(dataPoints[Math.floor(i * interval)]);
  }
  return result;
}
