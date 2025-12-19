import {useState} from 'react';
import {CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import type {Test} from '../types/test';

interface MetricsTrendChartProps {
  tests: Test[];
}

type MetricType = 'tps' | 'avg' | 'p90' | 'p95' | 'errorRate';

const metricConfig = {
  tps: {
    label: 'TPS (Requests/sec)',
    color: '#3b82f6',
    unit: 'req/s',
    format: (val: number) => val.toFixed(2),
  },
  avg: {
    label: 'Avg Response Time',
    color: '#8b5cf6',
    unit: 'ms',
    format: (val: number) => val.toFixed(2),
  },
  p90: {
    label: 'P90 Response Time',
    color: '#f59e0b',
    unit: 'ms',
    format: (val: number) => val.toFixed(2),
  },
  p95: {
    label: 'P95 Response Time',
    color: '#10b981',
    unit: 'ms',
    format: (val: number) => val.toFixed(2),
  },
  errorRate: {
    label: 'Error Rate',
    color: '#ef4444',
    unit: '%',
    format: (val: number) => (val * 100).toFixed(2),
  },
};

export const MetricsTrendChart = ({tests}: MetricsTrendChartProps) => {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('tps');

  const extractMetrics = (test: Test) => {
    const summary = test.summary;
    if (!summary?.metrics) {
      return {tps: 0, avg: 0, p90: 0, p95: 0, errorRate: 0};
    }

    return {
      tps: summary.metrics.http_reqs?.rate || 0,
      avg: summary.metrics.http_req_duration?.avg || 0,
      p90: summary.metrics.http_req_duration?.['p(90)'] || 0,
      p95: summary.metrics.http_req_duration?.['p(95)'] || 0,
      errorRate: summary.metrics.http_req_failed?.value || 0,
    };
  };

  const chartData = tests
    .filter(test => test.status === 'completed')
    .sort((a, b) => a.startTime - b.startTime)
    .map((test, index) => {
      const metrics = extractMetrics(test);
      const date = new Date(test.startTime);
      return {
        name: `#${index + 1}`,
        fullDate: date.toLocaleString(),
        testId: test.testId,
        value: metrics[selectedMetric],
        displayValue: metricConfig[selectedMetric].format(metrics[selectedMetric]),
      };
    });

  const config = metricConfig[selectedMetric];

  if (tests.filter(t => t.status === 'completed').length === 0) {
    return (
      <div style={{padding: '2rem', textAlign: 'center', color: '#6b7280'}}>
        No completed tests to display chart
      </div>
    );
  }

  return (
    <div>
      <div style={{display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap'}}>
        {(Object.keys(metricConfig) as MetricType[]).map(metric => (
          <button
            key={metric}
            onClick={() => setSelectedMetric(metric)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: selectedMetric === metric ? '#3b82f6' : 'white',
              color: selectedMetric === metric ? 'white' : '#374151',
              border: selectedMetric === metric ? 'none' : '1px solid #d1d5db',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: selectedMetric === metric ? 'bold' : 'normal',
            }}
          >
            {metricConfig[metric].label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{top: 5, right: 30, left: 20, bottom: 5}}>
          <CartesianGrid strokeDasharray="3 3"/>
          <XAxis
            dataKey="name"
            label={{value: 'Test Execution', position: 'insideBottom', offset: -5}}
          />
          <YAxis
            label={{value: `${config.label} (${config.unit})`, angle: -90, position: 'insideLeft'}}
          />
          <Tooltip
            content={({active, payload}) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div
                    style={{
                      backgroundColor: 'white',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    }}
                  >
                    <div style={{fontWeight: 'bold', marginBottom: '0.25rem'}}>{data.name}</div>
                    <div style={{fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem'}}>
                      {data.fullDate}
                    </div>
                    <div style={{fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.25rem'}}>
                      Test ID: {data.testId}
                    </div>
                    <div style={{fontWeight: 'bold', color: config.color}}>
                      {config.label}: {data.displayValue} {config.unit}
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend/>
          <Line
            type="monotone"
            dataKey="value"
            name={config.label}
            stroke={config.color}
            strokeWidth={2}
            dot={{fill: config.color, r: 4}}
            activeDot={{r: 6}}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
