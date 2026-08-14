import {useState, type CSSProperties} from 'react';
import {CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import type {Test} from '../types/test';
import styles from './MetricsTrendChart.module.css';

interface MetricsTrendChartProps {
  tests: Test[];
}

type MetricType = 'tps' | 'avg' | 'p90' | 'p95' | 'vus' | 'errorRate';

const metricConfig: Record<MetricType, {
  label: string;
  shortLabel: string;
  color: string;
  unit: string;
  format: (val: number) => string;
  higherIsBetter: boolean;
}> = {
  tps: {
    label: 'RPS',
    shortLabel: 'RPS',
    color: '#2563eb',
    unit: 'req/s',
    format: (val: number) => val.toFixed(2),
    higherIsBetter: true,
  },
  avg: {
    label: 'Avg Response Time',
    shortLabel: 'Avg',
    color: '#7c3aed',
    unit: 'ms',
    format: (val: number) => val.toFixed(2),
    higherIsBetter: false,
  },
  p90: {
    label: 'P90 Response Time',
    shortLabel: 'P90',
    color: '#d97706',
    unit: 'ms',
    format: (val: number) => val.toFixed(2),
    higherIsBetter: false,
  },
  p95: {
    label: 'P95 Response Time',
    shortLabel: 'P95',
    color: '#059669',
    unit: 'ms',
    format: (val: number) => val.toFixed(2),
    higherIsBetter: false,
  },
  vus: {
    label: 'VUser',
    shortLabel: 'VUser',
    color: '#0891b2',
    unit: 'VU',
    format: (val: number) => val.toFixed(0),
    higherIsBetter: true,
  },
  errorRate: {
    label: 'Error Rate',
    shortLabel: 'Error',
    color: '#dc2626',
    unit: '%',
    format: (val: number) => (val * 100).toFixed(2),
    higherIsBetter: false,
  },
};

const extractMetrics = (test: Test) => {
  const summary = test.summary;
  if (!summary?.metrics) {
    return {tps: 0, avg: 0, p90: 0, p95: 0, vus: 0, errorRate: 0};
  }

  return {
    tps: summary.metrics.http_reqs?.rate || 0,
    avg: summary.metrics.http_req_duration?.avg || 0,
    p90: summary.metrics.http_req_duration?.['p(90)'] || 0,
    p95: summary.metrics.http_req_duration?.['p(95)'] || 0,
    vus: summary.metrics.vus_max?.max || summary.metrics.vus_max?.value || summary.metrics.vus?.max || test.config?.vusers || 0,
    errorRate: summary.metrics.http_req_failed?.value || 0,
  };
};

const rangeMetricKeys: MetricType[] = ['tps', 'avg', 'vus', 'errorRate'];

export const MetricsTrendChart = ({tests}: MetricsTrendChartProps) => {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('tps');
  const config = metricConfig[selectedMetric];
  const completedTests = tests
    .filter(test => test.status === 'completed')
    .sort((a, b) => a.startTime - b.startTime);

  const chartData = completedTests.map((test, index) => {
    const metrics = extractMetrics(test);
    const date = new Date(test.startTime);
    const value = metrics[selectedMetric];

    return {
      name: `#${index + 1}`,
      dateLabel: date.toLocaleDateString(undefined, {month: 'short', day: 'numeric'}),
      timeLabel: date.toLocaleTimeString(undefined, {hour: '2-digit', minute: '2-digit'}),
      testId: test.testId,
      testName: test.name,
      value,
      displayValue: config.format(value),
    };
  });

  const values = chartData.map(point => point.value);
  const averageValue = values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const yAxisWidth = selectedMetric === 'errorRate' ? 48 : 64;

  const getRange = (metric: MetricType) => {
    const metricConfigItem = metricConfig[metric];
    const points = completedTests.map((test, index) => {
      const metrics = extractMetrics(test);
      const date = new Date(test.startTime);
      return {
        name: `#${index + 1}`,
        testName: test.name,
        testId: test.testId,
        dateLabel: date.toLocaleDateString(undefined, {month: 'short', day: 'numeric'}),
        value: metrics[metric],
      };
    });
    const minPoint = points.reduce((min, point) => point.value < min.value ? point : min, points[0]);
    const maxPoint = points.reduce((max, point) => point.value > max.value ? point : max, points[0]);

    return {
      minPoint,
      maxPoint,
      minLabel: `${metricConfigItem.format(minPoint.value)} ${metricConfigItem.unit}`,
      maxLabel: `${metricConfigItem.format(maxPoint.value)} ${metricConfigItem.unit}`,
    };
  };

  if (completedTests.length === 0) {
    return (
      <div className={styles.empty}>
        No completed tests to display chart
      </div>
    );
  }

  const selectedRange = getRange(selectedMetric);
  const selectedRangeIsFlat = selectedRange.minPoint.name === selectedRange.maxPoint.name
    && selectedRange.minPoint.value === selectedRange.maxPoint.value;

  return (
    <div className={styles.wrapper}>
      <div className={styles.tabs} role="group">
        {(Object.keys(metricConfig) as MetricType[]).map(metric => (
          <button
            key={metric}
            type="button"
            onClick={() => setSelectedMetric(metric)}
            aria-pressed={selectedMetric === metric}
            className={`${styles.tab} ${selectedMetric === metric ? styles.active : ''}`.trim()}
            style={{'--tab-color': metricConfig[metric].color} as CSSProperties}
          >
            {metricConfig[metric].shortLabel}
          </button>
        ))}
      </div>

      <div className={styles.ranges}>
        {rangeMetricKeys.map(metric => {
          const range = getRange(metric);
          const rangeConfig = metricConfig[metric];

          return (
            <div
              key={metric}
              className={styles.rangeCard}
              style={{'--series-color': rangeConfig.color} as CSSProperties}
            >
              <div className={styles.rangeLabel}>{rangeConfig.label}</div>
              <div className={styles.rangeRow}>
                <div>
                  <div className={styles.rangeKey}>Min</div>
                  <div className={styles.rangeValue}>{range.minLabel}</div>
                </div>
                <div className={styles.rangeAlignEnd}>
                  <div className={styles.rangeKey}>Max</div>
                  <div className={styles.rangeValue}>{range.maxLabel}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={chartData} margin={{top: 14, right: 18, left: 0, bottom: 8}}>
          <CartesianGrid stroke="#e5e7eb" vertical={false}/>
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={{stroke: '#d1d5db'}}
            tick={{fill: '#6b7280', fontSize: 12}}
            interval="preserveStartEnd"
            minTickGap={18}
          />
          <YAxis
            width={yAxisWidth}
            tickLine={false}
            axisLine={false}
            tick={{fill: '#6b7280', fontSize: 12}}
            tickFormatter={(value) => config.format(Number(value))}
          />
          <ReferenceLine
            y={averageValue}
            stroke="#94a3b8"
            strokeDasharray="4 4"
            label={{value: `Avg ${config.format(averageValue)}`, fill: '#64748b', fontSize: 12, position: 'insideTopRight'}}
          />
          <ReferenceDot
            x={selectedRange.minPoint.name}
            y={selectedRange.minPoint.value}
            r={5}
            fill="#ffffff"
            stroke="#111827"
            strokeWidth={2}
            label={{
              value: selectedRangeIsFlat ? `Min/Max ${selectedRange.minLabel}` : `Min ${selectedRange.minLabel}`,
              fill: '#111827',
              fontSize: 12,
              position: 'bottom'
            }}
          />
          {!selectedRangeIsFlat && (
            <ReferenceDot
              x={selectedRange.maxPoint.name}
              y={selectedRange.maxPoint.value}
              r={5}
              fill={config.color}
              stroke="#ffffff"
              strokeWidth={2}
              label={{
                value: `Max ${selectedRange.maxLabel}`,
                fill: config.color,
                fontSize: 12,
                position: selectedRange.maxPoint.value === 0 ? 'top' : 'bottom'
              }}
            />
          )}
          <Tooltip
            cursor={{stroke: config.color, strokeWidth: 1, strokeDasharray: '4 4'}}
            content={({active, payload}) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className={styles.tooltip} style={{'--series-color': config.color} as CSSProperties}>
                    <div className={styles.tooltipHeader}>
                      <div className={styles.tooltipName}>{data.name}</div>
                      <div className={styles.tooltipTime}>{data.dateLabel} {data.timeLabel}</div>
                    </div>
                    <div className={styles.tooltipSub}>{data.testName || data.testId}</div>
                    <div className={styles.tooltipValueRow}>
                      <span className={styles.tooltipLabel}>{config.label}</span>
                      <span className={styles.tooltipValue}>
                        {data.displayValue} {config.unit}
                      </span>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            name={config.label}
            stroke={config.color}
            strokeWidth={3}
            dot={{fill: 'white', stroke: config.color, strokeWidth: 2, r: 4}}
            activeDot={{fill: config.color, stroke: 'white', strokeWidth: 3, r: 7}}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
