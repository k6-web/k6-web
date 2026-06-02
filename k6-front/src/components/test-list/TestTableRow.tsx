import {useTranslation} from 'react-i18next';
import {Link} from 'react-router-dom';
import type {Test} from '../../types/test';
import type {K6Summary} from '../../types/k6';
import {StatusBadge} from '../common';
import {formatElapsedDuration} from '../../utils/formatUtils';

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

  return (
    <tr style={{borderBottom: '1px solid #e5e7eb', backgroundColor: isSelected ? '#eff6ff' : 'white'}}>
        {hasSelection && (
          <td style={{padding: '1rem', textAlign: 'center', borderBottom: '1px solid #e5e7eb'}}>
            <input
              type="checkbox"
              checked={isSelected}
              disabled={isSelectionDisabled}
              onChange={() => onToggleSelection?.(test.testId)}
              title={selectionTitle}
              aria-label={selectionTitle}
              style={{width: '1rem', height: '1rem', cursor: isSelectionDisabled ? 'not-allowed' : 'pointer'}}
            />
          </td>
        )}
        <td style={{padding: '1rem', borderBottom: '1px solid #e5e7eb'}}>
          <Link to={`/tests/${test.testId}`} style={{color: '#3b82f6', textDecoration: 'none'}}>
            {test.name ? (
              <div>
                <div style={{fontWeight: 'bold', marginBottom: '0.25rem'}}>
                  {test.name}
                </div>
                <div style={{fontSize: '0.75rem', color: '#6b7280'}}>
                  {test.testId}
                </div>
              </div>
            ) : (
              test.testId
            )}
          </Link>
        </td>
        <td style={{padding: '1rem'}}>
          <StatusBadge status={test.status} />
        </td>
        <td style={{padding: '1rem'}}>
          {test.scriptId ? (
            <Link
              to={`/scripts/${test.scriptId}`}
              style={{color: '#8b5cf6', textDecoration: 'none', fontWeight: '600'}}
            >
              {test.scriptId}
            </Link>
          ) : (
            <span style={{color: '#9ca3af', fontSize: '0.875rem'}}>-</span>
          )}
        </td>
        <td style={{padding: '1rem', fontSize: '0.875rem', fontWeight: '600', color: '#3b82f6'}}>
          {test.summary ? getTPS(test.summary) : '-'}
        </td>
        <td style={{padding: '1rem', fontSize: '0.875rem', fontWeight: '600', color: '#8b5cf6'}}>
          {test.summary ? getLatency(test.summary) : '-'}
        </td>
        <td style={{padding: '1rem', fontSize: '0.875rem', fontWeight: '600', color: '#22c55e'}}>
          {test.summary ? getSuccessRate(test.summary) : '-'}
        </td>
        <td style={{padding: '1rem', fontSize: '0.875rem'}}>
          {new Date(test.startTime).toLocaleString()}
        </td>
        <td style={{padding: '1rem', fontSize: '0.875rem', fontWeight: '600', color: '#f59e0b'}}>
          {test.endTime && test.startTime ? formatElapsedDuration(test.endTime - test.startTime) : '-'}
        </td>
        <td style={{padding: '1rem', textAlign: 'center'}}>
          <div style={{display: 'flex', gap: '0.5rem', justifyContent: 'center'}}>
            <Link
              to={`/tests/${test.testId}`}
              style={{
                padding: '0.25rem 0.75rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}
            >
              {t('scriptDetail.viewDetails')}
            </Link>
            {onRerun && test.status !== 'running' && (
              <button
                onClick={() => onRerun(test.testId)}
                disabled={isRerunning || !canRerun}
                style={{
                  padding: '0.25rem 0.75rem',
                  backgroundColor: isRerunning || !canRerun ? '#9ca3af' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  cursor: isRerunning || !canRerun ? 'not-allowed' : 'pointer'
                }}
                title={canRerun ? t('testList.rerun') : t('testList.noScriptAvailable')}
              >
                {isRerunning ? t('newTest.startingTest') : t('testList.rerun')}
              </button>
            )}
          </div>
        </td>
    </tr>
  );
};
