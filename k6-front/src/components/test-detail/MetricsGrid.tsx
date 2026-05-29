import {useTranslation} from 'react-i18next';
import type {K6Summary} from '../../types/k6';
import {MetricCard} from './MetricCard';
import {formatBytes, formatDuration, formatNumber} from '../../utils/formatUtils';

interface MetricsGridProps {
  summary: K6Summary;
}

const formatRate = (value?: number) => formatNumber(value);

interface TimingBreakdownItem {
  key: string;
  label: string;
  value: number;
  color: string;
}

const formatTimingValue = (value: number) => {
  if (value > 0 && value < 1) return '<1ms';
  return formatDuration(value);
};

interface DurationPoint {
  label: string;
  value?: number;
}

const DurationBarRow = ({label, value = 0, max, color, strong = false}: {
  label: string;
  value?: number;
  max: number;
  color: string;
  strong?: boolean;
}) => {
  const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0;

  return (
    <div style={{display: 'grid', gap: '0.35rem'}}>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem'}}>
        <span style={{fontSize: '0.78rem', color: '#4b5563', fontWeight: strong ? 800 : 600}}>{label}</span>
        <span style={{fontSize: '0.82rem', color, fontWeight: 800}}>{formatTimingValue(value)}</span>
      </div>
      <div style={{height: '8px', borderRadius: '999px', backgroundColor: '#eef2f7', overflow: 'hidden'}}>
        <div style={{
          width: `${percent}%`,
          minWidth: value > 0 ? '4px' : 0,
          height: '100%',
          borderRadius: '999px',
          backgroundColor: color
        }}/>
      </div>
    </div>
  );
};

const LatencyBlock = ({title, points, color}: {
  title: string;
  points: DurationPoint[];
  color: string;
}) => {
  const max = Math.max(1, ...points.map((point) => point.value || 0));
  const avg = points[0]?.value || 0;

  return (
    <div style={{display: 'grid', gap: '0.85rem'}}>
      <div>
        <div style={{fontSize: '0.75rem', color: '#374151', fontWeight: 'bold', marginBottom: '0.25rem'}}>
          {title}
        </div>
        <div style={{fontSize: '1.35rem', fontWeight: 800, color}}>
          {formatTimingValue(avg)}
        </div>
        <div style={{fontSize: '0.72rem', color: '#6b7280'}}>avg</div>
      </div>
      <div style={{display: 'grid', gap: '0.65rem'}}>
        {points.map((point, index) => (
          <DurationBarRow
            key={point.label}
            label={point.label}
            value={point.value}
            max={max}
            color={color}
            strong={index === 0}
          />
        ))}
      </div>
    </div>
  );
};

const SuccessOverview = ({passRate, failRate, passedChecks, failedChecks, totalChecks, failedLabel}: {
  passRate: number;
  failRate: number;
  passedChecks: number;
  failedChecks: number;
  totalChecks: number;
  failedLabel: string;
}) => (
  <div style={{display: 'grid', gap: '1rem'}}>
    <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem'}}>
      <div>
        <div style={{fontSize: '2rem', fontWeight: 800, color: failedChecks > 0 ? '#dc2626' : '#16a34a'}}>
          {passRate.toFixed(1)}%
        </div>
        <div style={{fontSize: '0.75rem', color: '#6b7280'}}>
          {formatNumber(passedChecks)} / {formatNumber(totalChecks)}
        </div>
      </div>
      <div style={{
        padding: '0.45rem 0.7rem',
        borderRadius: '999px',
        backgroundColor: failedChecks > 0 ? '#fef2f2' : '#ecfdf5',
        color: failedChecks > 0 ? '#b91c1c' : '#047857',
        fontWeight: 800,
        fontSize: '0.8rem',
        whiteSpace: 'nowrap'
      }}>
        {formatNumber(failedChecks)} {failedLabel}
      </div>
    </div>
    <div style={{height: '14px', display: 'flex', overflow: 'hidden', borderRadius: '999px', backgroundColor: '#fee2e2'}}>
      <div style={{width: `${passRate}%`, backgroundColor: '#16a34a'}}/>
      <div style={{width: `${failRate}%`, backgroundColor: '#ef4444'}}/>
    </div>
  </div>
);

const NetworkRow = ({label, rate, total, max, color}: {
  label: string;
  rate?: number;
  total?: number;
  max: number;
  color: string;
}) => {
  const value = rate || 0;
  const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0;

  return (
    <div style={{display: 'grid', gap: '0.45rem'}}>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem'}}>
        <span style={{fontSize: '0.82rem', color: '#374151', fontWeight: 700}}>{label}</span>
        <span style={{fontSize: '0.95rem', color, fontWeight: 800}}>{formatBytes(rate)}/s</span>
      </div>
      <div style={{height: '10px', borderRadius: '999px', backgroundColor: '#eef2f7', overflow: 'hidden'}}>
        <div style={{
          width: `${percent}%`,
          minWidth: value > 0 ? '4px' : 0,
          height: '100%',
          borderRadius: '999px',
          backgroundColor: color
        }}/>
      </div>
      <div style={{fontSize: '0.74rem', color: '#6b7280'}}>{formatBytes(total)}</div>
    </div>
  );
};

const TimingBreakdown = ({items, totalLabel}: {
  items: TimingBreakdownItem[];
  totalLabel: string;
}) => {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const sortedItems = [...items].sort((a, b) => b.value - a.value);
  const minimumVisiblePercent = 2;

  return (
    <div style={{display: 'grid', gap: '1rem'}}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
        <div>
          <div style={{fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem'}}>
            {totalLabel}
          </div>
          <div style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#0284c7'}}>
            {formatTimingValue(total)}
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        height: '18px',
        overflow: 'hidden',
        borderRadius: '999px',
        backgroundColor: '#e5e7eb'
      }}>
        {items.map((item) => {
          const rawPercent = total > 0 ? (item.value / total) * 100 : 0;
          const width = rawPercent > 0 ? Math.max(rawPercent, minimumVisiblePercent) : 0;
          return (
            <div
              key={item.key}
              title={`${item.label}: ${formatTimingValue(item.value)} (${rawPercent.toFixed(1)}%)`}
              style={{
                width: `${width}%`,
                minWidth: rawPercent > 0 ? '3px' : 0,
                backgroundColor: item.color
              }}
            />
          );
        })}
      </div>

      <div style={{display: 'grid', gap: '0.625rem'}}>
        {sortedItems.map((item) => {
          const percent = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <div
              key={item.key}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(110px, 1fr) auto auto',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.625rem 0',
                borderTop: '1px solid #eef2f7'
              }}
            >
              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0}}>
                <span style={{
                  width: '10px',
                  height: '10px',
                  flex: '0 0 auto',
                  borderRadius: '999px',
                  backgroundColor: item.color
                }}/>
                <span style={{
                  minWidth: 0,
                  color: '#374151',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {item.label}
                </span>
              </div>
              <span style={{color: '#0284c7', fontWeight: 800}}>
                {formatTimingValue(item.value)}
              </span>
              <span style={{color: '#6b7280', fontSize: '0.8rem', textAlign: 'right'}}>
                {percent.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const MetricsGrid = ({summary}: MetricsGridProps) => {
  const {t} = useTranslation();
  const checks = summary.metrics.checks;
  const passRate = checks ? checks.value * 100 : 0;
  const failRate = 100 - passRate;
  const totalChecks = checks ? (checks.passes + checks.fails) : 0;
  const passedChecks = checks?.passes || 0;
  const failedChecks = checks?.fails || 0;
  const requestRate = summary.metrics.http_reqs?.rate;
  const requestCount = summary.metrics.http_reqs?.count;
  const iterationRate = summary.metrics.iterations?.rate;
  const iterationCount = summary.metrics.iterations?.count;
  const sentRate = summary.metrics.data_sent?.rate;
  const receivedRate = summary.metrics.data_received?.rate;
  const maxNetworkRate = Math.max(sentRate || 0, receivedRate || 0, 1);
  const timingItems: TimingBreakdownItem[] = [
    {
      key: 'blocked',
      label: t('metrics.blocked'),
      value: summary.metrics.http_req_blocked?.avg || 0,
      color: '#94a3b8'
    },
    {
      key: 'connecting',
      label: t('metrics.connecting'),
      value: summary.metrics.http_req_connecting?.avg || 0,
      color: '#38bdf8'
    },
    {
      key: 'tls',
      label: t('metrics.tlsHandshaking'),
      value: summary.metrics.http_req_tls_handshaking?.avg || 0,
      color: '#818cf8'
    },
    {
      key: 'sending',
      label: t('metrics.sending'),
      value: summary.metrics.http_req_sending?.avg || 0,
      color: '#22c55e'
    },
    {
      key: 'waiting',
      label: t('metrics.waiting'),
      value: summary.metrics.http_req_waiting?.avg || 0,
      color: '#f59e0b'
    },
    {
      key: 'receiving',
      label: t('metrics.receiving'),
      value: summary.metrics.http_req_receiving?.avg || 0,
      color: '#ef4444'
    }
  ];

  return (
    <div style={{marginBottom: '1.5rem'}}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1rem',
        marginBottom: '1rem'
      }}>
        <MetricCard
          title={t('metrics.requestRate')}
          value=""
          color="#2563eb"
        >
          <div style={{display: 'grid', gap: '1rem'}}>
            <div>
              <div style={{display: 'flex', alignItems: 'baseline', gap: '0.5rem'}}>
                <span style={{fontSize: '2rem', fontWeight: 'bold', color: '#2563eb'}}>
                  {formatRate(requestRate)}
                </span>
                <span style={{fontSize: '0.875rem', color: '#2563eb', fontWeight: 'bold'}}>RPS</span>
              </div>
              <div style={{fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem'}}>
                {requestCount !== undefined ? t('metrics.totalRequests', {formattedCount: formatNumber(requestCount)}) : 'N/A'}
              </div>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              alignItems: 'center',
              gap: '0.75rem',
              borderTop: '1px solid #e5e7eb',
              paddingTop: '0.875rem',
              fontSize: '0.875rem'
            }}>
              <span style={{color: '#374151', fontWeight: '600'}}>{t('metrics.iterations')}</span>
              <span style={{color: '#4f46e5', fontWeight: '700', textAlign: 'right'}}>
                {formatRate(iterationRate)}/s
                {iterationCount !== undefined && (
                  <span style={{color: '#6b7280', fontWeight: 'normal'}}> · {t('metrics.totalIterations', {formattedCount: formatNumber(iterationCount)})}</span>
                )}
              </span>
            </div>
          </div>
        </MetricCard>

        <MetricCard
          title={t('metrics.latencyAndIteration')}
          value=""
          color="#7c3aed"
        >
          <div style={{display: 'grid', gap: '1rem'}}>
            <LatencyBlock
              title={t('metrics.httpReqDuration')}
              color="#7c3aed"
              points={[
                {label: t('metrics.avg'), value: summary.metrics.http_req_duration?.avg},
                {label: t('metrics.p90'), value: summary.metrics.http_req_duration?.['p(90)']},
                {label: t('metrics.p95'), value: summary.metrics.http_req_duration?.['p(95)']}
              ]}
            />
            <div style={{borderTop: '1px solid #e5e7eb', paddingTop: '1rem'}}>
              <LatencyBlock
                title={t('metrics.iterationDuration')}
                color="#0f766e"
                points={[
                  {label: t('metrics.avg'), value: summary.metrics.iteration_duration?.avg},
                  {label: t('metrics.p90'), value: summary.metrics.iteration_duration?.['p(90)']},
                  {label: t('metrics.p95'), value: summary.metrics.iteration_duration?.['p(95)']}
                ]}
              />
            </div>
          </div>
        </MetricCard>

        <MetricCard
          title={t('metrics.successRate')}
          value=""
          color={failedChecks > 0 ? '#ef4444' : '#16a34a'}
        >
          <SuccessOverview
            passRate={passRate}
            failRate={failRate}
            passedChecks={passedChecks}
            failedChecks={failedChecks}
            totalChecks={totalChecks}
            failedLabel={t('testDetail.failed')}
          />
        </MetricCard>

        <MetricCard
          title={t('metrics.networkBandwidth')}
          value=""
          color="#f59e0b"
        >
          <div style={{display: 'grid', gap: '1rem'}}>
            <NetworkRow
              label={`↑ ${t('metrics.dataSent')}`}
              total={summary.metrics.data_sent?.count}
              rate={sentRate}
              max={maxNetworkRate}
              color="#f59e0b"
            />
            <NetworkRow
              label={`↓ ${t('metrics.dataReceived')}`}
              total={summary.metrics.data_received?.count}
              rate={receivedRate}
              max={maxNetworkRate}
              color="#0284c7"
            />
          </div>
        </MetricCard>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '1rem'
      }}>
        <MetricCard
          title={t('metrics.httpTimingBreakdown')}
          value=""
          color="#0ea5e9"
        >
          <TimingBreakdown
            items={timingItems}
            totalLabel={t('metrics.totalAvg')}
          />
        </MetricCard>
      </div>
    </div>
  );
};
