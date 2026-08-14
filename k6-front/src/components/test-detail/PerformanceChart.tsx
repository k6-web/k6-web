import {useTranslation} from 'react-i18next';
import {CartesianGrid, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {Card} from '../common';
import styles from './PerformanceChart.module.css';
import type {TimeSeriesDataPoint} from '../../types/test';

interface PerformanceChartProps {
  data: TimeSeriesDataPoint[];
  isLive?: boolean;
}

const timeLabel = () => ({
  value: `Time (s)`,
  position: 'bottom' as const,
  offset: 0,
});

const chartMargin = {top: 16, right: 30, left: 20, bottom: 26};

const hasLatencyData = (data: TimeSeriesDataPoint[]) =>
  data.some(d => d.latencyAvg !== undefined);

const hasErrorRateData = (data: TimeSeriesDataPoint[]) =>
  data.some(d => d.errorRate !== undefined);

type ChartPoint = TimeSeriesDataPoint & {
  errorRatePct?: number;
};

interface SeriesConfig {
  key: keyof ChartPoint;
  name: string;
  color: string;
  unit: string;
  format: (value: number) => string;
}

const getSeriesStats = (data: ChartPoint[], config: SeriesConfig) => {
  const points = data
    .map(point => ({
      time: point.time,
      value: point[config.key] as number | undefined,
    }))
    .filter((point): point is {time: number; value: number} => point.value !== undefined && Number.isFinite(point.value));

  if (points.length === 0) return null;

  const min = points.reduce((current, point) => point.value < current.value ? point : current, points[0]);
  const max = points.reduce((current, point) => point.value > current.value ? point : current, points[0]);
  return {min, max};
};

const TimeSeriesLineChart = ({data, config, yAxisLabel}: {
  data: ChartPoint[];
  config: SeriesConfig;
  yAxisLabel: string;
}) => {
  const stats = getSeriesStats(data, config);
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={chartMargin}>
        <CartesianGrid stroke="#e5e7eb" vertical={false}/>
        <XAxis
          dataKey="time"
          label={timeLabel()}
          tickLine={false}
          axisLine={{stroke: '#d1d5db'}}
          tick={{fill: '#6b7280', fontSize: 12}}
        />
        <YAxis
          label={{value: yAxisLabel, angle: -90, position: 'insideLeft'}}
          tickLine={false}
          axisLine={false}
          tick={{fill: '#6b7280', fontSize: 12}}
        />
        {stats && (
          <ReferenceDot
            x={stats.max.time}
            y={stats.max.value}
            r={5}
            fill={config.color}
            stroke="#ffffff"
            strokeWidth={2}
            label={{
              value: `Max ${config.format(stats.max.value)}${config.unit}`,
              fill: config.color,
              fontSize: 12,
              position: stats.max.value === 0 ? 'top' : 'bottom'
            }}
          />
        )}
        <Tooltip
          formatter={(value: number) => [`${config.format(value)} ${config.unit}`, config.name]}
          labelFormatter={(label) => `Time: ${label}s`}
          contentStyle={{
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 12px 24px rgba(15, 23, 42, 0.14)'
          }}
        />
        <Line
          type="monotone"
          dataKey={config.key}
          stroke={config.color}
          strokeWidth={3}
          name={config.name}
          dot={false}
          activeDot={{fill: config.color, stroke: 'white', strokeWidth: 3, r: 7}}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export const PerformanceChart = ({data, isLive = false}: PerformanceChartProps) => {
  const {t} = useTranslation();
  if (data.length === 0) return null;

  const showLatency = !isLive && hasLatencyData(data);
  const showErrorRate = !isLive && hasErrorRateData(data);

  // Snapshots store absolute epoch ms while live points are already elapsed
  // seconds; normalize both to seconds since the first point so the axis reads
  // as a duration rather than a raw timestamp.
  const startTime = data[0].time;
  const isEpoch = startTime > 1e11;
  const chartData: ChartPoint[] = data.map(d => ({
    ...d,
    time: isEpoch ? Math.round((d.time - startTime) / 1000) : d.time,
    errorRatePct: d.errorRate !== undefined ? Math.round(d.errorRate * 10000) / 100 : undefined
  }));
  // Each entry carries its own heading so sections never depend on array order.
  const sections: Array<{config: SeriesConfig; heading: string; yAxisLabel: string}> = [
    {
      config: {
        key: 'vus',
        name: t('testDetail.vus'),
        color: '#7c3aed',
        unit: 'VU',
        format: (value) => value.toFixed(0),
      },
      heading: t('testDetail.vus'),
      yAxisLabel: t('testDetail.vus')
    },
    {
      config: {
        key: 'tps',
        name: 'RPS',
        color: '#059669',
        unit: 'RPS',
        format: (value) => Math.round(value).toLocaleString(),
      },
      heading: t('testDetail.requestsPerSecond'),
      yAxisLabel: 'RPS'
    },
    ...(showLatency ? [{
      config: {
        key: 'latencyAvg' as const,
        name: t('metrics.httpReqDuration'),
        color: '#2563eb',
        unit: 'ms',
        format: (value: number) => value.toFixed(2),
      },
      heading: `${t('metrics.httpReqDuration')} (ms)`,
      yAxisLabel: 'ms'
    }] : []),
    ...(showErrorRate ? [{
      config: {
        key: 'errorRatePct' as const,
        name: 'Error Rate',
        color: '#dc2626',
        unit: '%',
        format: (value: number) => value.toFixed(2),
      },
      heading: 'Error Rate (%)',
      yAxisLabel: '%'
    }] : []),
  ];

  return (
    <Card>
      <h2 className={styles.title}>
        {t('testDetail.performanceOverTime')}
        {isLive && (
          <span className={styles.live}>
            <span className={styles.liveDot} aria-hidden="true"/>
            Live
          </span>
        )}
      </h2>

      {sections.map(section => (
        <div key={section.config.key} className={styles.chartSection}>
          <h3 className={styles.chartTitle}>{section.heading}</h3>
          <TimeSeriesLineChart
            data={chartData}
            config={section.config}
            yAxisLabel={section.yAxisLabel}
          />
        </div>
      ))}
    </Card>
  );
};
