import {useTranslation} from 'react-i18next';
import type {K6Summary} from '../../types/k6';
import {MetricCard} from './MetricCard';
import {formatBytes, formatDuration} from '../../utils/formatUtils';

interface MetricsGridProps {
  summary: K6Summary;
}

interface DurationStatProps {
  label: string;
  value?: number;
  color?: string;
}

const DurationStat = ({label, value, color = '#7c3aed'}: DurationStatProps) => (
  <div>
    <div style={{fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem'}}>{label}</div>
    <div style={{fontSize: '1.125rem', fontWeight: 'bold', color}}>
      {formatDuration(value)}
    </div>
  </div>
);

interface MetricPairProps {
  label: string;
  total?: number;
  rate?: number;
}

const MetricPair = ({label, total, rate}: MetricPairProps) => (
  <div>
    <div style={{fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem'}}>{label}</div>
    <div style={{fontSize: '1.125rem', fontWeight: 'bold', color: '#f59e0b'}}>
      {formatBytes(total)}
    </div>
    <div style={{fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem'}}>
      {formatBytes(rate)}/s
    </div>
  </div>
);

interface PercentStatProps {
  label: string;
  value: string;
  count: string;
  color: string;
}

const PercentStat = ({label, value, count, color}: PercentStatProps) => (
  <div>
    <div style={{fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem'}}>{label}</div>
    <div style={{fontSize: '1.5rem', fontWeight: 'bold', color}}>{value}</div>
    <div style={{fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem'}}>{count}</div>
  </div>
);

const formatRate = (value?: number) => value !== undefined ? Math.round(value).toString() : 'N/A';

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
          <div>
            <div style={{display: 'flex', alignItems: 'baseline', gap: '0.5rem'}}>
              <span style={{fontSize: '2rem', fontWeight: 'bold', color: '#2563eb'}}>
                {formatRate(requestRate)}
              </span>
              <span style={{fontSize: '0.875rem', color: '#2563eb', fontWeight: 'bold'}}>RPS</span>
            </div>
            <div style={{fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem'}}>
              {requestCount !== undefined ? t('metrics.totalRequests', {count: requestCount}) : 'N/A'}
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
              borderTop: '1px solid #e5e7eb',
              marginTop: '1rem',
              paddingTop: '0.875rem',
              fontSize: '0.875rem'
            }}>
              <span style={{color: '#374151', fontWeight: '600'}}>{t('metrics.iterations')}</span>
              <span style={{color: '#4f46e5', fontWeight: '700', textAlign: 'right'}}>
                {formatRate(iterationRate)}/s
                {iterationCount !== undefined && (
                  <span style={{color: '#6b7280', fontWeight: 'normal'}}> · {t('metrics.totalIterations', {count: iterationCount})}</span>
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
            <div>
              <div style={{fontSize: '0.75rem', color: '#374151', fontWeight: 'bold', marginBottom: '0.5rem'}}>
                {t('metrics.httpReqDuration')}
              </div>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '1rem'}}>
                <DurationStat label={t('metrics.avg')} value={summary.metrics.http_req_duration?.avg}/>
                <DurationStat label={t('metrics.p90')} value={summary.metrics.http_req_duration?.['p(90)']}/>
                <DurationStat label={t('metrics.p95')} value={summary.metrics.http_req_duration?.['p(95)']}/>
              </div>
            </div>
            <div style={{borderTop: '1px solid #e5e7eb', paddingTop: '1rem'}}>
              <div style={{fontSize: '0.75rem', color: '#374151', fontWeight: 'bold', marginBottom: '0.5rem'}}>
                {t('metrics.iterationDuration')}
              </div>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '1rem'}}>
                <DurationStat label={t('metrics.avg')} value={summary.metrics.iteration_duration?.avg} color="#0f766e"/>
                <DurationStat label={t('metrics.p90')} value={summary.metrics.iteration_duration?.['p(90)']} color="#0f766e"/>
                <DurationStat label={t('metrics.p95')} value={summary.metrics.iteration_duration?.['p(95)']} color="#0f766e"/>
              </div>
            </div>
          </div>
        </MetricCard>

        <MetricCard
          title={t('metrics.successRate')}
          value=""
          color={failedChecks > 0 ? '#ef4444' : '#16a34a'}
        >
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem'}}>
            <PercentStat
              label={t('testDetail.passed')}
              value={`${passRate.toFixed(1)}%`}
              count={`${passedChecks} / ${totalChecks}`}
              color="#16a34a"
            />
            <PercentStat
              label={t('testDetail.failed')}
              value={`${failRate.toFixed(1)}%`}
              count={`${failedChecks} / ${totalChecks}`}
              color="#dc2626"
            />
          </div>
        </MetricCard>

        <MetricCard
          title={t('metrics.networkBandwidth')}
          value=""
          color="#f59e0b"
        >
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem'}}>
            <MetricPair
              label={`↓ ${t('metrics.dataReceived')}`}
              total={summary.metrics.data_received?.count}
              rate={summary.metrics.data_received?.rate}
            />
            <MetricPair
              label={`↑ ${t('metrics.dataSent')}`}
              total={summary.metrics.data_sent?.count}
              rate={summary.metrics.data_sent?.rate}
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
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '1rem'
          }}>
            <DurationStat label={t('metrics.waiting')} value={summary.metrics.http_req_waiting?.avg} color="#0284c7"/>
            <DurationStat label={t('metrics.sending')} value={summary.metrics.http_req_sending?.avg} color="#0284c7"/>
            <DurationStat label={t('metrics.receiving')} value={summary.metrics.http_req_receiving?.avg} color="#0284c7"/>
            <DurationStat label={t('metrics.blocked')} value={summary.metrics.http_req_blocked?.avg} color="#0284c7"/>
            <DurationStat label={t('metrics.connecting')} value={summary.metrics.http_req_connecting?.avg} color="#0284c7"/>
            <DurationStat label={t('metrics.tlsHandshaking')} value={summary.metrics.http_req_tls_handshaking?.avg} color="#0284c7"/>
          </div>
        </MetricCard>
      </div>
    </div>
  );
};
