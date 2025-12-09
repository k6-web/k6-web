import {Link} from 'react-router-dom';
import type {Test} from '../../types/test';
import type {K6Summary} from '../../types/k6';
import {StatusBadge} from '../common';

interface TestTableRowProps {
  test: Test;
  isExpanded: boolean;
  onToggleExpand: (testId: string) => void;
  onRerun: (testId: string) => void;
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

export const TestTableRow = ({test, isExpanded, onToggleExpand, onRerun}: TestTableRowProps) => {
  return (
    <>
      <tr style={{borderBottom: '1px solid #e5e7eb'}}>
        <td style={{padding: '1rem', textAlign: 'center'}}>
          <button
            onClick={() => onToggleExpand(test.testId)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.25rem',
              color: '#6b7280'
            }}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        </td>
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
          {test.endTime && test.startTime ? `${((test.endTime - test.startTime) / 1000).toFixed(1)}s` : '-'}
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
              View
            </Link>
            {test.status !== 'running' && (
              <button
                onClick={() => onRerun(test.testId)}
                style={{
                  padding: '0.25rem 0.75rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
                title="Re-run test"
              >
                Re-run
              </button>
            )}
          </div>
        </td>
      </tr>
      {isExpanded && test.summary && (
        <tr key={`${test.testId}-expanded`}>
          <td colSpan={10} style={{padding: '1rem', backgroundColor: '#f9fafb'}}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem'
            }}>
              <div style={{
                padding: '1rem',
                backgroundColor: 'white',
                borderRadius: '8px',
                borderLeft: '4px solid #3b82f6'
              }}>
                <div style={{fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem'}}>TPS</div>
                <div style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#3b82f6'}}>
                  {getTPS(test.summary)}
                </div>
              </div>
              <div style={{
                padding: '1rem',
                backgroundColor: 'white',
                borderRadius: '8px',
                borderLeft: '4px solid #8b5cf6'
              }}>
                <div style={{fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem'}}>Latency (Avg)</div>
                <div style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#8b5cf6'}}>
                  {getLatency(test.summary)}
                </div>
              </div>
              <div style={{
                padding: '1rem',
                backgroundColor: 'white',
                borderRadius: '8px',
                borderLeft: '4px solid #22c55e'
              }}>
                <div style={{fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem'}}>Success Rate</div>
                <div style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#22c55e'}}>
                  {getSuccessRate(test.summary)}
                </div>
              </div>
              <div style={{
                padding: '1rem',
                backgroundColor: 'white',
                borderRadius: '8px',
                borderLeft: '4px solid #f59e0b'
              }}>
                <div style={{fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem'}}>Duration</div>
                <div style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b'}}>
                  {test.endTime && test.startTime ? `${((test.endTime - test.startTime) / 1000).toFixed(1)}s` : 'N/A'}
                </div>
              </div>
            </div>
            <div style={{marginTop: '1rem', display: 'flex', gap: '0.5rem'}}>
              <Link
                to={`/tests/${test.testId}`}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '4px',
                  fontSize: '0.875rem'
                }}
              >
                View Details
              </Link>
              <button
                onClick={() => onRerun(test.testId)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                🔄 Re-run Test
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};
