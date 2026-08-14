import {useTranslation} from 'react-i18next';
import {Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import type {Test} from '../../types/test';
import type {K6Summary} from '../../types/k6';
import {formatBytes, formatDuration, formatNumber} from '../../utils/formatUtils';
import styles from './TestSummaryComparison.module.css';

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

interface ChartSeries {
  key: string;
  name: string;
  testId: string;
  color: string;
}

interface MetricComparisonChartPoint {
  metric: string;
  [testKey: string]: string | number | undefined;
}

const TEST_COLORS = ['#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed'];

const formatRate = (value: number | undefined): string => {
  if (value === undefined || value === null) return 'N/A';
  return Math.round(value).toLocaleString();
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

const getChartSeries = (tests: Test[]): ChartSeries[] => tests.map((test, index) => ({
  key: `test${index}`,
  name: getShortTestName(test, index),
  testId: test.testId,
  color: TEST_COLORS[index % TEST_COLORS.length]
}));

const getLatencyChartData = (tests: Test[], series: ChartSeries[], t: (key: string) => string): MetricComparisonChartPoint[] => {
  const metricKeys = [
    {key: 'avg' as const, label: t('metrics.avg')},
    {key: 'p90' as const, label: t('metrics.p90')},
    {key: 'p95' as const, label: t('metrics.p95')}
  ];

  return metricKeys.map(metric => {
    const point: MetricComparisonChartPoint = {metric: metric.label};

    tests.forEach((test, index) => {
      point[series[index].key] = test.summary?.metrics.http_req_duration?.[metric.key === 'p90' ? 'p(90)' : metric.key === 'p95' ? 'p(95)' : 'avg'];
    });

    return point;
  });
};

export const TestSummaryComparison = ({tests}: TestSummaryComparisonProps) => {
  const {t} = useTranslation();
  const chartData = getChartData(tests);
  const chartSeries = getChartSeries(tests);
  const latencyChartData = getLatencyChartData(tests, chartSeries, t);

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
    <div className={styles.panel}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>{t('testList.summaryComparison')}</h2>
          <p className={styles.hint}>{t('testList.comparisonHint')}</p>
        </div>
        <div className={styles.legend}>
          <span className={styles.legendBest}>{t('testList.bestValue')}</span>
          <span className={styles.legendWorst}>{t('testList.worstValue')}</span>
        </div>
      </div>

      <div className={styles.charts}>
        <h3 className={styles.chartsTitle}>{t('testList.visualComparison')}</h3>

        <div className={styles.chartRow}>
          <div className={styles.chartPanel}>
            <h4 className={styles.chartTitle}>{t('testList.rpsComparison')}</h4>
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
                <Bar dataKey="rps" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, index) => (
                    <Cell key={`rps-${index}`} fill={chartSeries[index].color}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.chartPanel}>
            <h4 className={styles.chartTitle}>{t('testList.failureRateComparison')}</h4>
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
                <Bar dataKey="failureRate" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, index) => (
                    <Cell key={`failure-rate-${index}`} fill={chartSeries[index].color}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.chartPanel}>
          <h4 className={styles.chartTitle}>{t('testList.latencyComparison')}</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={latencyChartData} margin={{top: 12, right: 16, left: 0, bottom: 0}}>
              <CartesianGrid stroke="#e5e7eb" vertical={false}/>
              <XAxis dataKey="metric" tick={{fill: '#6b7280', fontSize: 12}} tickLine={false}/>
              <YAxis tick={{fill: '#6b7280', fontSize: 12}} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}ms`}/>
              <Tooltip
                formatter={(value: number, name: string) => {
                  const series = chartSeries.find(current => current.key === name);
                  return [formatDuration(value), series?.name || name];
                }}
                contentStyle={{borderRadius: '8px', border: '1px solid #e5e7eb'}}
              />
              <Legend/>
              {chartSeries.map(series => (
                <Bar
                  key={series.key}
                  dataKey={series.key}
                  name={series.name}
                  fill={series.color}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <table
        className={styles.table}
        style={{minWidth: `${Math.max(760, tests.length * 180 + 220)}px`}}
      >
        <thead>
          <tr>
            <th scope="col" className={styles.metricColumn}>{t('testDetail.metrics')}</th>
            {tests.map(test => (
              <th key={test.testId} scope="col">
                <div className={styles.testName}>{getTestName(test)}</div>
                <div className={styles.testTime}>{new Date(test.startTime).toLocaleString()}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metricRows.map(row => {
            const values = tests.map(test => test.summary ? row.getValue(test.summary) : undefined);

            return (
              <tr key={row.key}>
                <th scope="row" className={styles.rowLabel}>{row.label}</th>
                {tests.map((test, index) => {
                  const comparableClass = getComparableClass(values[index], values, row.direction);

                  return (
                    <td
                      key={`${test.testId}-${row.key}`}
                      className={comparableClass ? styles[comparableClass] : undefined}
                    >
                      {test.summary ? row.format(test.summary, values[index]) : 'N/A'}
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
