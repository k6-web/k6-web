import type {K6Summary} from '../../types/k6';
import {MetricCard} from './MetricCard';
import {formatBytes, formatDuration} from '../../utils/formatUtils';

interface MetricsGridProps {
  summary: K6Summary;
}

export const MetricsGrid = ({summary}: MetricsGridProps) => {
  const checks = summary.metrics.checks;
  const passRate = checks ? checks.value * 100 : 0;
  const failRate = 100 - passRate;
  const totalChecks = checks ? (checks.passes + checks.fails) : 0;
  const passedChecks = checks?.passes || 0;
  const failedChecks = checks?.fails || 0;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '1rem',
      marginBottom: '1.5rem'
    }}>
      {/* TPS Card */}
      <MetricCard
        title="TPS (Transactions Per Second)"
        value={summary.metrics.http_reqs?.rate ? Math.round(summary.metrics.http_reqs.rate) : 'N/A'}
        subtitle={`Total Requests: ${summary.metrics.http_reqs?.count || 'N/A'}`}
        color="#3b82f6"
      />

      {/* Latency Card */}
      <MetricCard
        title="Response Time (Latency)"
        value=""
        color="#8b5cf6"
      >
        <div style={{display: 'flex', gap: '1rem', marginTop: '0.5rem'}}>
          <div>
            <div style={{fontSize: '0.75rem', color: '#999'}}>Avg</div>
            <div style={{fontSize: '1.25rem', fontWeight: 'bold', color: '#8b5cf6'}}>
              {formatDuration(summary.metrics.http_req_duration?.avg)}
            </div>
          </div>
          <div>
            <div style={{fontSize: '0.75rem', color: '#999'}}>P90</div>
            <div style={{fontSize: '1.25rem', fontWeight: 'bold', color: '#8b5cf6'}}>
              {formatDuration(summary.metrics.http_req_duration?.['p(90)'])}
            </div>
          </div>
          <div>
            <div style={{fontSize: '0.75rem', color: '#999'}}>P95</div>
            <div style={{fontSize: '1.25rem', fontWeight: 'bold', color: '#8b5cf6'}}>
              {formatDuration(summary.metrics.http_req_duration?.['p(95)'])}
            </div>
          </div>
        </div>
      </MetricCard>

      {/* Success/Failure Card */}
      <MetricCard
        title="Success / Failure"
        value=""
        color={failedChecks > 0 ? '#ef4444' : '#22c55e'}
      >
        <div style={{display: 'flex', gap: '1.5rem', alignItems: 'center'}}>
          <div>
            <div style={{fontSize: '0.75rem', color: '#22c55e'}}>✓ Succeeded</div>
            <div style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#22c55e'}}>
              {passRate.toFixed(1)}%
            </div>
            <div style={{fontSize: '0.75rem', color: '#999'}}>
              {passedChecks} / {totalChecks}
            </div>
          </div>
          <div>
            <div style={{fontSize: '0.75rem', color: '#ef4444'}}>✗ Failed</div>
            <div style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444'}}>
              {failRate.toFixed(1)}%
            </div>
            <div style={{fontSize: '0.75rem', color: '#999'}}>
              {failedChecks} / {totalChecks}
            </div>
          </div>
        </div>
      </MetricCard>

      {/* Network Bandwidth Card */}
      <MetricCard
        title="Network Bandwidth"
        value=""
        color="#f59e0b"
      >
        <div style={{marginTop: '0.5rem'}}>
          <div style={{marginBottom: '0.75rem'}}>
            <div style={{fontSize: '0.75rem', color: '#999'}}>↓ Received</div>
            <div style={{fontSize: '1.25rem', fontWeight: 'bold', color: '#f59e0b'}}>
              {formatBytes(summary.metrics.data_received?.count)}
            </div>
          </div>
          <div>
            <div style={{fontSize: '0.75rem', color: '#999'}}>↑ Sent</div>
            <div style={{fontSize: '1.25rem', fontWeight: 'bold', color: '#f59e0b'}}>
              {formatBytes(summary.metrics.data_sent?.count)}
            </div>
          </div>
        </div>
      </MetricCard>
    </div>
  );
};
