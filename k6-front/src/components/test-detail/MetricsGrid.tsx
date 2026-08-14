import type {CSSProperties} from 'react';
import {useTranslation} from 'react-i18next';
import type {K6Summary} from '../../types/k6';
import {MetricCard} from './MetricCard';
import {formatBytes, formatDuration, formatNumber} from '../../utils/formatUtils';
import styles from './MetricsGrid.module.css';

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

/** Series colors come from data, so they ride in as a CSS custom property. */
const seriesStyle = (color: string, extra?: CSSProperties): CSSProperties =>
  ({'--series-color': color, ...extra} as CSSProperties);

const DurationBarRow = ({label, value = 0, max, color, strong = false}: {
  label: string;
  value?: number;
  max: number;
  color: string;
  strong?: boolean;
}) => {
  const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0;

  return (
    <div className={styles.barRow} style={seriesStyle(color)}>
      <div className={styles.barHeader}>
        <span className={`${styles.barLabel} ${strong ? styles.strong : ''}`.trim()}>{label}</span>
        <span className={styles.barValue}>{formatTimingValue(value)}</span>
      </div>
      <div className={styles.barTrack}>
        <div
          className={styles.barFill}
          style={{'--fill-width': `${percent}%`, minWidth: value > 0 ? '4px' : 0} as CSSProperties}
        />
      </div>
    </div>
  );
};

const LatencyBlock = ({title, points, color}: {
  title: string;
  points: DurationPoint[];
  color: string;
}) => {
  const max = Math.max(1, ...points.map(point => point.value || 0));
  const avg = points[0]?.value || 0;

  return (
    <div className={styles.latencyBlock} style={seriesStyle(color)}>
      <div>
        <div className={styles.latencyTitle}>{title}</div>
        <div className={styles.latencyValue}>{formatTimingValue(avg)}</div>
        <div className={styles.latencyUnit}>avg</div>
      </div>
      <div className={styles.latencyRows}>
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
}) => {
  const hasFailures = failedChecks > 0;

  return (
    <div className={styles.stack}>
      <div className={styles.successHeader}>
        <div>
          <div className={`${styles.successRate} ${hasFailures ? styles.hasFailures : ''}`.trim()}>
            {passRate.toFixed(1)}%
          </div>
          <div className={styles.successCounts}>
            {formatNumber(passedChecks)} / {formatNumber(totalChecks)}
          </div>
        </div>
        <div className={`${styles.failChip} ${hasFailures ? styles.hasFailures : ''}`.trim()}>
          {formatNumber(failedChecks)} {failedLabel}
        </div>
      </div>
      <div
        className={styles.successTrack}
        role="img"
        aria-label={`${passRate.toFixed(1)}% pass, ${failRate.toFixed(1)}% fail`}
      >
        <div className={styles.successPass} style={{'--pass-width': `${passRate}%`} as CSSProperties}/>
        <div className={styles.successFail} style={{'--fail-width': `${failRate}%`} as CSSProperties}/>
      </div>
    </div>
  );
};

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
    <div className={styles.networkRow} style={seriesStyle(color)}>
      <div className={styles.barHeader}>
        <span className={styles.networkLabel}>{label}</span>
        <span className={styles.networkValue}>{formatBytes(rate)}/s</span>
      </div>
      <div className={styles.networkTrack}>
        <div
          className={styles.barFill}
          style={{'--fill-width': `${percent}%`, minWidth: value > 0 ? '4px' : 0} as CSSProperties}
        />
      </div>
      <div className={styles.networkTotal}>{formatBytes(total)}</div>
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
    <div className={styles.stack}>
      <div>
        <div className={styles.timingTotalLabel}>{totalLabel}</div>
        <div className={styles.timingTotalValue}>{formatTimingValue(total)}</div>
      </div>

      <div className={styles.timingBar}>
        {items.map(item => {
          const rawPercent = total > 0 ? (item.value / total) * 100 : 0;
          const width = rawPercent > 0 ? Math.max(rawPercent, minimumVisiblePercent) : 0;

          return (
            <div
              key={item.key}
              className={styles.timingSegment}
              title={`${item.label}: ${formatTimingValue(item.value)} (${rawPercent.toFixed(1)}%)`}
              style={seriesStyle(item.color, {
                '--segment-width': `${width}%`,
                '--segment-min-width': rawPercent > 0 ? '3px' : '0'
              } as CSSProperties)}
            />
          );
        })}
      </div>

      <div className={styles.timingLegend}>
        {sortedItems.map(item => {
          const percent = total > 0 ? (item.value / total) * 100 : 0;

          return (
            <div key={item.key} className={styles.timingItem} style={seriesStyle(item.color)}>
              <div className={styles.timingName}>
                <span className={styles.timingDot} aria-hidden="true"/>
                <span className={styles.timingLabel}>{item.label}</span>
              </div>
              <span className={styles.timingValue}>{formatTimingValue(item.value)}</span>
              <span className={styles.timingPercent}>{percent.toFixed(1)}%</span>
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
    {key: 'blocked', label: t('metrics.blocked'), value: summary.metrics.http_req_blocked?.avg || 0, color: '#94a3b8'},
    {key: 'connecting', label: t('metrics.connecting'), value: summary.metrics.http_req_connecting?.avg || 0, color: '#38bdf8'},
    {key: 'tls', label: t('metrics.tlsHandshaking'), value: summary.metrics.http_req_tls_handshaking?.avg || 0, color: '#818cf8'},
    {key: 'sending', label: t('metrics.sending'), value: summary.metrics.http_req_sending?.avg || 0, color: '#22c55e'},
    {key: 'waiting', label: t('metrics.waiting'), value: summary.metrics.http_req_waiting?.avg || 0, color: '#f59e0b'},
    {key: 'receiving', label: t('metrics.receiving'), value: summary.metrics.http_req_receiving?.avg || 0, color: '#ef4444'}
  ];

  return (
    <div className={styles.wrapper}>
      <div className={styles.grid}>
        <MetricCard title={t('metrics.requestRate')} value="" color="#2563eb">
          <div className={styles.stack}>
            <div>
              <div className={styles.rateRow}>
                <span className={styles.rateValue}>{formatRate(requestRate)}</span>
                <span className={styles.rateUnit}>RPS</span>
              </div>
              <div className={styles.rateSub}>
                {requestCount !== undefined
                  ? t('metrics.totalRequests', {formattedCount: formatNumber(requestCount)})
                  : 'N/A'}
              </div>
            </div>

            <div className={styles.iterationRow}>
              <span className={styles.iterationLabel}>{t('metrics.iterations')}</span>
              <span className={styles.iterationValue}>
                {formatRate(iterationRate)}/s
                {iterationCount !== undefined && (
                  <span className={styles.iterationTotal}>
                    {' · '}
                    {t('metrics.totalIterations', {formattedCount: formatNumber(iterationCount)})}
                  </span>
                )}
              </span>
            </div>
          </div>
        </MetricCard>

        <MetricCard title={t('metrics.latencyAndIteration')} value="" color="#7c3aed">
          <div className={styles.stack}>
            <LatencyBlock
              title={t('metrics.httpReqDuration')}
              color="#7c3aed"
              points={[
                {label: t('metrics.avg'), value: summary.metrics.http_req_duration?.avg},
                {label: t('metrics.p90'), value: summary.metrics.http_req_duration?.['p(90)']},
                {label: t('metrics.p95'), value: summary.metrics.http_req_duration?.['p(95)']}
              ]}
            />
            <div className={styles.divided}>
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

        <MetricCard title={t('metrics.networkBandwidth')} value="" color="#f59e0b">
          <div className={styles.stack}>
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

      <div className={styles.wideGrid}>
        <MetricCard title={t('metrics.httpTimingBreakdown')} value="" color="#0ea5e9">
          <TimingBreakdown items={timingItems} totalLabel={t('metrics.totalAvg')}/>
        </MetricCard>
      </div>
    </div>
  );
};
