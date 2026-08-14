import {Link} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import type {Test} from '../../types/test';
import {StatusBadge} from '../common';
import {formatElapsedDuration} from '../../utils/formatUtils';
import styles from './ScriptHistoryTable.module.css';

interface ScriptHistoryTableProps {
  history: Test[];
}

const extractMetrics = (test: Test) => {
  const metrics = test.summary?.metrics;

  return {
    tps: metrics?.http_reqs?.rate || 0,
    p90: metrics?.http_req_duration?.['p(90)'] || 0,
    p95: metrics?.http_req_duration?.['p(95)'] || 0,
    errorRate: metrics?.http_req_failed?.value || 0,
    avg: metrics?.http_req_duration?.avg || 0
  };
};

const format = (value: number) => (value > 0 ? value.toFixed(2) : '-');

export const ScriptHistoryTable = ({history}: ScriptHistoryTableProps) => {
  const {t} = useTranslation();

  return (
    <div className={styles.scroller}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">{t('common.name')} / {t('testDetail.testId')}</th>
            <th scope="col">{t('common.status')}</th>
            <th scope="col" className={styles.numeric}>RPS</th>
            <th scope="col" className={styles.numeric}>Avg (ms)</th>
            <th scope="col" className={styles.numeric}>P90 (ms)</th>
            <th scope="col" className={styles.numeric}>P95 (ms)</th>
            <th scope="col" className={styles.numeric}>Error %</th>
            <th scope="col">{t('testDetail.startTime')}</th>
            <th scope="col">{t('testDetail.duration')}</th>
          </tr>
        </thead>
        <tbody>
          {history.map(test => {
            const metrics = extractMetrics(test);

            return (
              <tr key={test.testId}>
                <td>
                  <Link to={`/tests/${test.testId}`} className={styles.nameLink}>
                    {test.name || test.testId}
                  </Link>
                  {test.name && <div className={styles.testId}>{test.testId}</div>}
                </td>
                <td><StatusBadge status={test.status}/></td>
                <td className={styles.numeric}>{format(metrics.tps)}</td>
                <td className={styles.numeric}>{format(metrics.avg)}</td>
                <td className={styles.numeric}>{format(metrics.p90)}</td>
                <td className={styles.numeric}>{format(metrics.p95)}</td>
                <td className={styles.numeric}>{(metrics.errorRate * 100).toFixed(2)}</td>
                <td className={styles.time}>{new Date(test.startTime).toLocaleString()}</td>
                <td className={styles.numeric}>
                  {test.endTime && test.startTime ? formatElapsedDuration(test.endTime - test.startTime) : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
