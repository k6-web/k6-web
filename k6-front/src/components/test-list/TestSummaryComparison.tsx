import {useTranslation} from 'react-i18next';
import {Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import type {Test} from '../../types/test';
import type {K6Summary} from '../../types/k6';
import {formatBytes, formatDuration, formatNumber} from '../../utils/formatUtils';

type MetricDirection = 'higher' | 'lower' | 'neutral';

interface MetricRow {
  key: string;
  label: string;
  direction: MetricDirection;
  getValue: (summary: K6Summary) => number | undefined;
  format: (summary: K6Summary, value: number | undefined) => string;
}

interface TestSummaryComparisonProps {
  tests: Test[];
}

interface ComparisonChartPoint {
  name: string;
  testId: string;
  rps?: number;
  failureRate?: number;
  avg?: number;
  p90?: number;
  p95?: number;
}

const formatRate = (value: number | undefined): string => {
  if (value === undefined || value === null) return 'N/A';
  return value.toLocaleString(undefined, {maximumFractionDigits: 2});
};

const formatPercent = (value: number | undefined): string => {
  if (value === undefined || value === null) return 'N/A';
  return `${(value * 100).toFixed(1)}%`;
};

const formatFailureRate = (summary: K6Summary, value: number | undefined): string => {
  if (value === undefined || value === null) return 'N/A';

  const metric = summary.metrics.http_req_failed;
  const fails = metric?.passes ?? 0;
  const total = metric ? metric.passes + metric.fails : undefined;

  return total !== undefined
    ? `${formatPercent(value)} (${formatNumber(fails)}/${formatNumber(total)})`
    : formatPercent(value);
};

const getComparableClass = (
  value: number | undefined,
  values: Array<number | undefined>,
  direction: MetricDirection
): 'best' | 'worst' | undefined => {
  if (value === undefined || direction === 'neutral') return undefined;

  const numericValues = values.filter((current): current is number => current !== undefined);
  if (numericValues.length < 2) return undefined;

  const best = direction === 'higher' ? Math.max(...numericValues) : Math.min(...numericValues);
  const worst = direction === 'higher' ? Math.min(...numericValues) : Math.max(...numericValues);

  if (best === worst) return undefined;
  if (value === best) return 'best';
  if (value === worst) return 'worst';
  return undefined;
};

const getTestName = (test: Test): string => test.name || test.config?.name || test.testId;

const getShortTestName = (test: Test, index: number): string => {
  const name = getTestName(test);
  if (name === test.testId) return `#${index + 1}`;
  return name.length > 14 ? `${name.slice(0, 14)}...` : name;
};

const getChartData = (tests: Test[]): ComparisonChartPoint[] => tests.map((test, index) => ({
  name: getShortTestName(test, index),
  testId: test.testId,
  rps: test.summary?.metrics.http_reqs?.rate,
  failureRate: test.summary?.metrics.http_req_failed?.value !== undefined
    ? test.summary.metrics.http_req_failed.value * 100
    : undefined,
  avg: test.summary?.metrics.http_req_duration?.avg,
  p90: test.summary?.metrics.http_req_duration?.['p(90)'],
  p95: test.summary?.metrics.http_req_duration?.['p(95)']
}));

const chartPanelStyle = {
  minHeight: '280px',
  padding: '1rem',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  backgroundColor: '#ffffff'
};

export const TestSummaryComparison = ({tests}: TestSummaryComparisonProps) => {
  const {t} = useTranslation();
  const chartData = getChartData(tests);

  const metricRows: MetricRow[] = [
    {
      key: 'rps',
      label: 'RPS',
      direction: 'higher',
      getValue: summary => summary.metrics.http_reqs?.rate,
      format: (_, value) => formatRate(value)
    },
    {
      key: 'avgDuration',
      label: `${t('metrics.httpReqDuration')} ${t('metrics.avg')}`,
      direction: 'lower',
      getValue: summary => summary.metrics.http_req_duration?.avg,
      format: (_, value) => formatDuration(value)
    },
    {
      key: 'p90Duration',
      label: `${t('metrics.httpReqDuration')} ${t('metrics.p90')}`,
      direction: 'lower',
      getValue: summary => summary.metrics.http_req_duration?.['p(90)'],
      format: (_, value) => formatDuration(value)
    },
    {
      key: 'p95Duration',
      label: `${t('metrics.httpReqDuration')} ${t('metrics.p95')}`,
      direction: 'lower',
      getValue: summary => summary.metrics.http_req_duration?.['p(95)'],
      format: (_, value) => formatDuration(value)
    },
    {
      key: 'failureRate',
      label: t('metrics.failureRate'),
      direction: 'lower',
      getValue: summary => summary.metrics.http_req_failed?.value,
      format: formatFailureRate
    },
    {
      key: 'dataSent',
      label: t('metrics.dataSent'),
      direction: 'neutral',
      getValue: summary => summary.metrics.data_sent?.count,
      format: (_, value) => formatBytes(value)
    },
    {
      key: 'dataReceived',
      label: t('metrics.dataReceived'),
      direction: 'neutral',
      getValue: summary => summary.metrics.data_received?.count,
      format: (_, value) => formatBytes(value)
    },
    {
      key: 'maxVus',
      label: `${t('metrics.vus')} ${t('metrics.max')}`,
      direction: 'neutral',
      getValue: summary => summary.metrics.vus_max?.max ?? summary.metrics.vus_max?.value ?? summary.metrics.vus?.max,
      format: (_, value) => formatNumber(value)
    }
  ];

  if (tests.length < 2) {
    return null;
  }

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginBottom: '1rem',
      overflow: 'auto'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        padding: '1rem',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div>
          <h2 style={{margin: 0, fontSize: '1.125rem'}}>{t('testList.summaryComparison')}</h2>
          <p style={{margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.875rem'}}>
            {t('testList.comparisonHint')}
          </p>
        </div>
        <div style={{display: 'flex', gap: '0.5rem', fontSize: '0.75rem', color: '#6b7280'}}>
          <span style={{padding: '0.25rem 0.5rem', backgroundColor: '#ecfdf5', color: '#047857', borderRadius: '4px'}}>
            {t('testList.bestValue')}
          </span>
          <span style={{padding: '0.25rem 0.5rem', backgroundColor: '#fef2f2', color: '#b91c1c', borderRadius: '4px'}}>
            {t('testList.worstValue')}
          </span>
        </div>
      </div>

      <div style={{display: 'grid', gap: '1rem', padding: '1rem', borderBottom: '1px solid #e5e7eb'}}>
        <h3 style={{margin: 0, fontSize: '1rem', color: '#111827'}}>{t('testList.visualComparison')}</h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem'
        }}>
          <div style={chartPanelStyle}>
            <h4 style={{margin: '0 0 1rem', fontSize: '0.925rem', color: '#374151'}}>
              {t('testList.rpsComparison')}
            </h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{top: 12, right: 16, left: 0, bottom: 0}}>
                <CartesianGrid stroke="#e5e7eb" vertical={false}/>
                <XAxis dataKey="name" tick={{fill: '#6b7280', fontSize: 12}} tickLine={false}/>
                <YAxis tick={{fill: '#6b7280', fontSize: 12}} tickLine={false} axisLine={false}/>
                <Tooltip
                  formatter={(value: number) => [`${formatRate(value)} RPS`, 'RPS']}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.testId || ''}
                  contentStyle={{borderRadius: '8px', border: '1px solid #e5e7eb'}}
                />
                <Bar dataKey="rps" fill="#2563eb" radius={[4, 4, 0, 0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={chartPanelStyle}>
            <h4 style={{margin: '0 0 1rem', fontSize: '0.925rem', color: '#374151'}}>
              {t('testList.failureRateComparison')}
            </h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{top: 12, right: 16, left: 0, bottom: 0}}>
                <CartesianGrid stroke="#e5e7eb" vertical={false}/>
                <XAxis dataKey="name" tick={{fill: '#6b7280', fontSize: 12}} tickLine={false}/>
                <YAxis tick={{fill: '#6b7280', fontSize: 12}} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`}/>
                <Tooltip
                  formatter={(value: number) => [`${value.toFixed(2)}%`, t('metrics.httpReqFailed')]}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.testId || ''}
                  contentStyle={{borderRadius: '8px', border: '1px solid #e5e7eb'}}
                />
                <Bar dataKey="failureRate" fill="#dc2626" radius={[4, 4, 0, 0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={chartPanelStyle}>
          <h4 style={{margin: '0 0 1rem', fontSize: '0.925rem', color: '#374151'}}>
            {t('testList.latencyComparison')}
          </h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{top: 12, right: 16, left: 0, bottom: 0}}>
              <CartesianGrid stroke="#e5e7eb" vertical={false}/>
              <XAxis dataKey="name" tick={{fill: '#6b7280', fontSize: 12}} tickLine={false}/>
              <YAxis tick={{fill: '#6b7280', fontSize: 12}} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}ms`}/>
              <Tooltip
                formatter={(value: number, name: string) => [formatDuration(value), name]}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.testId || ''}
                contentStyle={{borderRadius: '8px', border: '1px solid #e5e7eb'}}
              />
              <Legend/>
              <Bar dataKey="avg" name={t('metrics.avg')} fill="#7c3aed" radius={[4, 4, 0, 0]}/>
              <Bar dataKey="p90" name={t('metrics.p90')} fill="#2563eb" radius={[4, 4, 0, 0]}/>
              <Bar dataKey="p95" name={t('metrics.p95')} fill="#059669" radius={[4, 4, 0, 0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <table style={{width: '100%', borderCollapse: 'collapse', minWidth: `${Math.max(760, tests.length * 180 + 220)}px`}}>
        <thead style={{backgroundColor: '#f9fafb'}}>
          <tr>
            <th style={{padding: '0.875rem 1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb', width: '220px'}}>
              {t('testDetail.metrics')}
            </th>
            {tests.map(test => (
              <th key={test.testId} style={{padding: '0.875rem 1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb'}}>
                <div style={{fontWeight: 700, color: '#111827', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                  {getTestName(test)}
                </div>
                <div style={{fontSize: '0.75rem', color: '#6b7280', fontWeight: 400}}>
                  {new Date(test.startTime).toLocaleString()}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metricRows.map(row => {
            const values = tests.map(test => test.summary ? row.getValue(test.summary) : undefined);

            return (
              <tr key={row.key}>
                <td style={{padding: '0.875rem 1rem', borderBottom: '1px solid #e5e7eb', fontWeight: 600, color: '#374151'}}>
                  {row.label}
                </td>
                {tests.map((test, index) => {
                  const value = values[index];
                  const comparableClass = getComparableClass(value, values, row.direction);
                  const backgroundColor = comparableClass === 'best'
                    ? '#ecfdf5'
                    : comparableClass === 'worst'
                      ? '#fef2f2'
                      : 'white';
                  const color = comparableClass === 'best'
                    ? '#047857'
                    : comparableClass === 'worst'
                      ? '#b91c1c'
                      : '#111827';

                  return (
                    <td
                      key={`${test.testId}-${row.key}`}
                      style={{
                        padding: '0.875rem 1rem',
                        borderBottom: '1px solid #e5e7eb',
                        backgroundColor,
                        color,
                        fontWeight: comparableClass ? 700 : 500
                      }}
                    >
                      {test.summary ? row.format(test.summary, value) : 'N/A'}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
