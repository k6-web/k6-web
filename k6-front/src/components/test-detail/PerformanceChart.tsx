import {CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {Card} from '../common';

interface PerformanceChartProps {
  data: { time: number; vus: number; tps: number }[];
  isLive?: boolean;
}

export const PerformanceChart = ({data, isLive = false}: PerformanceChartProps) => {
  if (data.length === 0) return null;

  return (
    <Card>
      <h2 style={{marginTop: 0, marginBottom: '1.5rem'}}>
        Performance Over Time
        {isLive && (
          <span style={{
            marginLeft: '1rem',
            fontSize: '0.875rem',
            color: '#3b82f6',
            fontWeight: 'normal'
          }}>
            🔴 Live
          </span>
        )}
      </h2>

      <div style={{marginBottom: '2rem'}}>
        <h3 style={{fontSize: '1rem', color: '#666', marginBottom: '1rem'}}>Virtual Users (VUs)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data} margin={{top: 5, right: 30, left: 20, bottom: 5}}>
            <CartesianGrid strokeDasharray="3 3"/>
            <XAxis
              dataKey="time"
              label={{value: 'Time (seconds)', position: 'insideBottomRight', offset: -10}}
            />
            <YAxis
              label={{value: 'VUs', angle: -90, position: 'insideLeft'}}
            />
            <Tooltip
              formatter={(value: number) => [value, 'VUs']}
              labelFormatter={(label) => `Time: ${label}s`}
            />
            <Legend/>
            <Line
              type="monotone"
              dataKey="vus"
              stroke="#8884d8"
              strokeWidth={2}
              name="Virtual Users"
              dot={{r: 3}}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h3 style={{fontSize: '1rem', color: '#666', marginBottom: '1rem'}}>Transactions Per Second (TPS)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data} margin={{top: 5, right: 30, left: 20, bottom: 5}}>
            <CartesianGrid strokeDasharray="3 3"/>
            <XAxis
              dataKey="time"
              label={{value: 'Time (seconds)', position: 'insideBottomRight', offset: -10}}
            />
            <YAxis
              label={{value: 'TPS', angle: -90, position: 'insideLeft'}}
            />
            <Tooltip
              formatter={(value: number) => [value, 'TPS']}
              labelFormatter={(label) => `Time: ${label}s`}
            />
            <Legend/>
            <Line
              type="monotone"
              dataKey="tps"
              stroke="#82ca9d"
              strokeWidth={2}
              name="Transactions/sec"
              dot={{r: 3}}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
