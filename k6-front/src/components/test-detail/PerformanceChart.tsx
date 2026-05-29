import {useTranslation} from 'react-i18next';
import {CartesianGrid, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {Card} from '../common';
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
  const chartData: ChartPoint[] = data.map(d => ({
    ...d,
    errorRatePct: d.errorRate !== undefined ? Math.round(d.errorRate * 10000) / 100 : undefined
  }));
  const seriesConfigs: SeriesConfig[] = [
    {
      key: 'vus',
      name: t('testDetail.vus'),
      color: '#7c3aed',
      unit: 'VU',
      format: (value) => value.toFixed(0),
    },
    {
      key: 'tps',
      name: 'RPS',
      color: '#059669',
      unit: 'RPS',
      format: (value) => Math.round(value).toLocaleString(),
    },
    ...(showLatency ? [{
      key: 'latencyAvg' as const,
      name: t('metrics.httpReqDuration'),
      color: '#2563eb',
      unit: 'ms',
      format: (value: number) => value.toFixed(2),
    }] : []),
    ...(showErrorRate ? [{
      key: 'errorRatePct' as const,
      name: 'Error Rate',
      color: '#dc2626',
      unit: '%',
      format: (value: number) => value.toFixed(2),
    }] : []),
  ];

  return (
    <Card>
      <h2 style={{marginTop: 0, marginBottom: '1.5rem'}}>
        {t('testDetail.performanceOverTime')}
        {isLive && (
          <span style={{marginLeft: '1rem', fontSize: '0.875rem', color: '#3b82f6', fontWeight: 'normal'}}>
            Live
          </span>
        )}
      </h2>

      <div style={{marginBottom: '2rem'}}>
        <h3 style={{fontSize: '1rem', color: '#666', marginBottom: '1rem'}}>{t('testDetail.vus')}</h3>
        <TimeSeriesLineChart data={chartData} config={seriesConfigs[0]} yAxisLabel={t('testDetail.vus')}/>
      </div>

      <div style={{marginBottom: showLatency || showErrorRate ? '2rem' : 0}}>
        <h3 style={{fontSize: '1rem', color: '#666', marginBottom: '1rem'}}>{t('testDetail.requestsPerSecond')}</h3>
        <TimeSeriesLineChart data={chartData} config={seriesConfigs[1]} yAxisLabel="RPS"/>
      </div>

      {showLatency && (
        <div style={{marginBottom: showErrorRate ? '2rem' : 0}}>
          <h3 style={{fontSize: '1rem', color: '#666', marginBottom: '1rem'}}>{t('metrics.httpReqDuration')} (ms)</h3>
          <TimeSeriesLineChart data={chartData} config={seriesConfigs[2]} yAxisLabel="ms"/>
        </div>
      )}

      {showErrorRate && (
        <div>
          <h3 style={{fontSize: '1rem', color: '#666', marginBottom: '1rem'}}>Error Rate (%)</h3>
          <TimeSeriesLineChart
            data={chartData}
            config={seriesConfigs[showLatency ? 3 : 2]}
            yAxisLabel="%"
          />
        </div>
      )}
    </Card>
  );
};
