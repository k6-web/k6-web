import {useEffect, useState} from 'react';
import {k6Api} from '../services/api';
import type {HealthResponse, K6Summary, TestListResponse} from '../types';
import {Link} from 'react-router-dom';

export const Dashboard = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [tests, setTests] = useState<TestListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [healthData, testsData] = await Promise.all([
          k6Api.health(),
          k6Api.getTests()
        ]);
        setHealth(healthData);
        setTests(testsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

  if (loading) return <div>Loading...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

  return (
    <div>
      <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)' }}>Dashboard</h1>

      {health && (
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          marginBottom: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ marginTop: 0 }}>System Status</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#666' }}>Status</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#22c55e' }}>{health.status.toUpperCase()}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#666' }}>Running Tests</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{health.runningTests}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#666' }}>Total Tests</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{health.totalTests}</div>
            </div>
          </div>
        </div>
      )}

      {tests && (
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <h2 style={{ marginTop: 0, fontSize: 'clamp(1.25rem, 4vw, 1.5rem)' }}>Recent Tests</h2>
            <Link
              to="/tests"
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '4px',
                fontSize: 'clamp(0.75rem, 2vw, 0.875rem)'
              }}
            >
              View All
            </Link>
          </div>
          {tests.tests.length === 0 ? (
            <p>No tests found. <Link to="/new-test">Create your first test</Link></p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
              <thead style={{ backgroundColor: '#f9fafb' }}>
                <tr>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Test ID</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>TPS</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Latency</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Success</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Start Time</th>
                  <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tests.tests.slice(0, 5).map(test => (
                  <tr key={test.testId} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '1rem' }}>
                      <Link to={`/tests/${test.testId}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                        {test.name || test.testId}
                      </Link>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        backgroundColor: test.status === 'running' ? '#3b82f6' :
                                        test.status === 'completed' ? '#22c55e' :
                                        test.status === 'failed' ? '#ef4444' : '#6b7280',
                        color: 'white',
                        fontSize: '0.875rem'
                      }}>
                        {test.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '600', color: '#3b82f6' }}>
                      {test.summary ? getTPS(test.summary) : '-'}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '600', color: '#8b5cf6' }}>
                      {test.summary ? getLatency(test.summary) : '-'}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '600', color: '#22c55e' }}>
                      {test.summary ? getSuccessRate(test.summary) : '-'}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                      {new Date(test.startTime).toLocaleString()}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
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
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
