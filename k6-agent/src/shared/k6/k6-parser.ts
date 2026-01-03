import {TimeSeriesDataPoint} from '@domains/test/test-types';

/**
 * Parse k6 stdout line to extract time-series metrics
 * Example format: "     running (1m23.4s), 05/10 VUs, 1234 complete and 0 interrupted iterations"
 */
export function parseK6StatusLine(line: string): TimeSeriesDataPoint | null {
  // Match pattern: running (Xm Ys), current/total VUs, complete iterations
  const match = /running\s+\(([^)]+)\),\s+(\d+)\/\d+\s+VUs,\s+(\d+)\s+complete/u.exec(line);

  if (!match) {
    return null;
  }

  const timeStr = match[1];
  const currentVUs = parseInt(match[2], 10);
  const completedIterations = parseInt(match[3], 10);

  // Parse time string (e.g., "1m23.4s" or "23.4s")
  const timeInSeconds = parseTimeString(timeStr);

  if (timeInSeconds === null) {
    return null;
  }

  return {
    time: timeInSeconds,
    vus: currentVUs,
    tps: completedIterations, // Will calculate rate in post-processing
  };
}

/**
 * Parse k6 time format: "1m23.4s", "23.4s", "1h2m3s", etc.
 */
function parseTimeString(timeStr: string): number | null {
  let totalSeconds = 0;

  // Match hours
  const hoursMatch = /(\d+)h/u.exec(timeStr);
  if (hoursMatch) {
    totalSeconds += parseInt(hoursMatch[1], 10) * 3600;
  }

  // Match minutes
  const minutesMatch = /(\d+)m/u.exec(timeStr);
  if (minutesMatch) {
    totalSeconds += parseInt(minutesMatch[1], 10) * 60;
  }

  // Match seconds (including decimals)
  const secondsMatch = /([\d.]+)s/u.exec(timeStr);
  if (secondsMatch) {
    totalSeconds += parseFloat(secondsMatch[1]);
  }

  return totalSeconds > 0 ? totalSeconds : null;
}

/**
 * Calculate TPS (transactions per second) from raw data points
 */
export function calculateTPS(dataPoints: TimeSeriesDataPoint[]): TimeSeriesDataPoint[] {
  if (dataPoints.length < 2) {
    return dataPoints;
  }

  const result: TimeSeriesDataPoint[] = [];

  for (let i = 0; i < dataPoints.length; i++) {
    if (i === 0) {
      // First point: TPS = 0 or use the total / time
      result.push({
        ...dataPoints[i],
        tps: dataPoints[i].time > 0 ? dataPoints[i].tps / dataPoints[i].time : 0,
      });
    } else {
      const current = dataPoints[i];
      const previous = dataPoints[i - 1];
      const timeDiff = current.time - previous.time;
      const completedDiff = current.tps - previous.tps;

      result.push({
        time: current.time,
        vus: current.vus,
        tps: timeDiff > 0 ? completedDiff / timeDiff : 0,
      });
    }
  }

  return result;
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

  // Remove last point if TPS is 0 (test completion state)
  let filteredPoints = dataPoints;
  if (dataPoints.length > 1 && dataPoints[dataPoints.length - 1].tps === 0) {
    filteredPoints = dataPoints.slice(0, -1);
  }

  if (filteredPoints.length <= maxPoints) {
    return filteredPoints;
  }

  const result: TimeSeriesDataPoint[] = [];
  const interval = filteredPoints.length / maxPoints;

  for (let i = 0; i < maxPoints; i++) {
    const index = Math.floor(i * interval);
    result.push(filteredPoints[index]);
  }

  return result;
}
