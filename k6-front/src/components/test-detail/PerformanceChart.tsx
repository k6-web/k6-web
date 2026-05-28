import {useTranslation} from 'react-i18next';
import {CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {Card} from '../common';
import type {TimeSeriesDataPoint} from '../../types/test';

interface PerformanceChartProps {
  data: TimeSeriesDataPoint[];
  isLive?: boolean;
}

const timeLabel = () => ({
  value: `Time (s)`,
  position: 'insideBottomRight' as const,
  offset: -10,
});

const chartMargin = {top: 5, right: 30, left: 20, bottom: 5};

const hasLatencyData = (data: TimeSeriesDataPoint[]) =>
  data.some(d => d.latencyAvg !== undefined);

const hasErrorRateData = (data: TimeSeriesDataPoint[]) =>
  data.some(d => d.errorRate !== undefined);

export const PerformanceChart = ({data, isLive = false}: PerformanceChartProps) => {
  const {t} = useTranslation();
  if (data.length === 0) return null;

  const showLatency = !isLive && hasLatencyData(data);
  const showErrorRate = !isLive && hasErrorRateData(data);

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
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={chartMargin}>
            <CartesianGrid strokeDasharray="3 3"/>
            <XAxis dataKey="time" label={timeLabel()}/>
            <YAxis label={{value: t('testDetail.vus'), angle: -90, position: 'insideLeft'}}/>
            <Tooltip formatter={(v: number) => [v, t('testDetail.vus')]} labelFormatter={(l) => `Time: ${l}s`}/>
            <Legend/>
            <Line type="monotone" dataKey="vus" stroke="#8884d8" strokeWidth={2} name={t('testDetail.vus')} dot={false} isAnimationActive={false}/>
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{marginBottom: showLatency || showErrorRate ? '2rem' : 0}}>
        <h3 style={{fontSize: '1rem', color: '#666', marginBottom: '1rem'}}>{t('testDetail.requestsPerSecond')}</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={chartMargin}>
            <CartesianGrid strokeDasharray="3 3"/>
            <XAxis dataKey="time" label={timeLabel()}/>
            <YAxis label={{value: 'RPS', angle: -90, position: 'insideLeft'}}/>
            <Tooltip formatter={(v: number) => [v, 'RPS']} labelFormatter={(l) => `Time: ${l}s`}/>
            <Legend/>
            <Line type="monotone" dataKey="tps" stroke="#82ca9d" strokeWidth={2} name="Requests/sec" dot={false} isAnimationActive={false}/>
          </LineChart>
        </ResponsiveContainer>
      </div>

      {showLatency && (
        <div style={{marginBottom: showErrorRate ? '2rem' : 0}}>
          <h3 style={{fontSize: '1rem', color: '#666', marginBottom: '1rem'}}>{t('metrics.httpReqDuration')} (ms)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data} margin={chartMargin}>
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis dataKey="time" label={timeLabel()}/>
              <YAxis label={{value: 'ms', angle: -90, position: 'insideLeft'}}/>
              <Tooltip formatter={(v: number, name: string) => [`${v}ms`, name]} labelFormatter={(l) => `Time: ${l}s`}/>
              <Legend/>
              <Line type="monotone" dataKey="latencyAvg" stroke="#3b82f6" strokeWidth={2} name="avg" dot={false} isAnimationActive={false}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {showErrorRate && (
        <div>
          <h3 style={{fontSize: '1rem', color: '#666', marginBottom: '1rem'}}>Error Rate (%)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.map(d => ({...d, errorRatePct: d.errorRate !== undefined ? Math.round(d.errorRate * 10000) / 100 : undefined}))} margin={chartMargin}>
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis dataKey="time" label={timeLabel()}/>
              <YAxis unit="%" domain={[0, 'auto']} label={{value: '%', angle: -90, position: 'insideLeft'}}/>
              <Tooltip formatter={(v: number) => [`${v}%`, 'Error Rate']} labelFormatter={(l) => `Time: ${l}s`}/>
              <Legend/>
              <Line type="monotone" dataKey="errorRatePct" stroke="#dc2626" strokeWidth={2} name="Error Rate" dot={false} isAnimationActive={false}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};
