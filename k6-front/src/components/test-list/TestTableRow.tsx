import {useTranslation} from 'react-i18next';
import {Link} from 'react-router-dom';
import type {Test} from '../../types/test';
import type {K6Summary} from '../../types/k6';
import {Button, LinkButton, StatusBadge} from '../common';
import {formatElapsedDuration} from '../../utils/formatUtils';
import styles from './TestTableRow.module.css';

interface TestTableRowProps {
  test: Test;
  onRerun?: (testId: string) => void;
  isRerunning?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (testId: string) => void;
  canSelect?: boolean;
  isSelectionLimitReached?: boolean;
}

const getTPS = (summary?: K6Summary): string => {
  const rate = summary?.metrics.http_reqs?.rate;
  return rate ? Math.round(rate).toString() : 'N/A';
};

const getLatency = (summary?: K6Summary): string => {
  const avg = summary?.metrics.http_req_duration?.avg;
  if (!avg) return 'N/A';
  if (avg < 1000) return `${avg.toFixed(2)}ms`;
  return `${(avg / 1000).toFixed(2)}s`;
};

const getSuccessRate = (summary?: K6Summary): string => {
  const checks = summary?.metrics.checks;
  if (!checks) return 'N/A';
  const rate = checks.value * 100;
  return `${rate.toFixed(1)}%`;
};

export const TestTableRow = ({
  test,
  onRerun,
  isRerunning = false,
  isSelected = false,
  onToggleSelection,
  canSelect = true,
  isSelectionLimitReached = false
}: TestTableRowProps) => {
  const {t} = useTranslation();
  const canRerun = Boolean(test.script);
  const hasSelection = Boolean(onToggleSelection);
  const isSelectionDisabled = !isSelected && (!canSelect || isSelectionLimitReached);
  const selectionTitle = !canSelect
    ? t('testList.summaryRequired')
    : isSelectionLimitReached && !isSelected
      ? t('testList.maxSelectionReached')
      : t('testList.selectForComparison');

  const label = test.name || test.testId;

  return (
    <tr className={`${styles.row} ${isSelected ? styles.selected : ''}`.trim()}>
      {hasSelection && (
        <td className={styles.selectCell}>
          <input
            type="checkbox"
            checked={isSelected}
            disabled={isSelectionDisabled}
            onChange={() => onToggleSelection?.(test.testId)}
            title={selectionTitle}
            aria-label={selectionTitle}
            className={styles.checkbox}
          />
        </td>
      )}

      <td>
        <Link to={`/tests/${test.testId}`} className={styles.nameLink}>
          {label}
        </Link>
        {test.name && <div className={styles.testId}>{test.testId}</div>}
      </td>

      <td><StatusBadge status={test.status}/></td>

      <td>
        {test.scriptId ? (
          <Link to={`/scripts/${test.scriptId}`} className={styles.scriptLink}>
            {test.scriptId}
          </Link>
        ) : (
          <span className={styles.empty}>-</span>
        )}
      </td>

      <td className={`${styles.metric} ${styles.rps}`}>
        {test.summary ? getTPS(test.summary) : '-'}
      </td>
      <td className={`${styles.metric} ${styles.latency}`}>
        {test.summary ? getLatency(test.summary) : '-'}
      </td>
      <td className={`${styles.metric} ${styles.success}`}>
        {test.summary ? getSuccessRate(test.summary) : '-'}
      </td>
      <td className={styles.time}>
        {new Date(test.startTime).toLocaleString()}
      </td>
      <td className={`${styles.metric} ${styles.duration}`}>
        {test.endTime && test.startTime ? formatElapsedDuration(test.endTime - test.startTime) : '-'}
      </td>

      <td>
        <div className={styles.actions}>
          <LinkButton to={`/tests/${test.testId}`} size="sm">
            {t('scriptDetail.viewDetails')}
          </LinkButton>
          {onRerun && test.status !== 'running' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onRerun(test.testId)}
              disabled={!canRerun}
              loading={isRerunning}
              title={canRerun ? t('testList.rerun') : t('testList.noScriptAvailable')}
            >
              {isRerunning ? t('newTest.startingTest') : t('testList.rerun')}
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
};
