import {useEffect, useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {k6Api} from '../services/api';
import type {TestInfo, K6Summary} from '../types';

export const TestList = () => {
  const navigate = useNavigate();
  const [allTests, setAllTests] = useState<TestInfo[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());

  const fetchTests = async (cursor: number | null = null, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const data = await k6Api.getTests(cursor, 30);

      if (append) {
        setAllTests(prev => [...prev, ...data.tests]);
      } else {
        setAllTests(data.tests);
      }

      setTotalCount(data.count);
      setNextCursor(data.pagination.nextCursor);
      setHasMore(data.pagination.hasMore);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tests');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (loadingMore || !hasMore) return;

      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      if (scrollTop + windowHeight >= documentHeight * 0.8) {
        fetchTests(nextCursor, true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [nextCursor, hasMore, loadingMore]);

  const handleStopAll = async () => {
    if (!confirm('Are you sure you want to stop all running tests?')) return;

    try {
      await k6Api.stopAllTests();
      fetchTests();
    } catch (err) {
      alert('Failed to stop tests: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const toggleTestExpand = (testId: string) => {
    const newExpanded = new Set(expandedTests);

    if (newExpanded.has(testId)) {
      newExpanded.delete(testId);
    } else {
      newExpanded.add(testId);
    }

    setExpandedTests(newExpanded);
  };

  const handleRerun = async (testId: string) => {
    const test = allTests.find(t => t.testId === testId);

    if (!test) {
      alert('Test not found');
      return;
    }

    try {
      const result = await k6Api.getTestResult(testId);
      if (result?.script) {
        sessionStorage.setItem('rerunScript', result.script);
        if (result.config) {
          sessionStorage.setItem('rerunConfig', JSON.stringify(result.config));
        }
        navigate('/new-test');
      } else {
        alert('No script available to re-run');
      }
    } catch (err) {
      alert('Failed to load test script');
    }
  };

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
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <h1 style={{ margin: 0, fontSize: 'clamp(1.5rem, 5vw, 2rem)' }}>Test History ({totalCount})</h1>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleStopAll}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: 'clamp(0.75rem, 2vw, 0.875rem)'
            }}
          >
            Stop All
          </button>
          <Link
            to="/new-test"
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              display: 'inline-block',
              fontSize: 'clamp(0.75rem, 2vw, 0.875rem)'
            }}
          >
            New Test
          </Link>
        </div>
      </div>

      <div style={{
        backgroundColor: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: '4px',
        padding: '0.75rem 1rem',
        marginBottom: '1.5rem',
        fontSize: '0.875rem',
        color: '#1e40af'
      }}>
        ℹ️ Test history is kept up to a maximum of 500 tests in descending order.
      </div>

      {!allTests || allTests.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          padding: '3rem',
          borderRadius: '8px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <p>No tests found.</p>
          <Link to="/new-test" style={{ color: '#3b82f6' }}>Create your first test</Link>
        </div>
      ) : (
        <>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            overflow: 'auto',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
              <thead style={{ backgroundColor: '#f9fafb' }}>
                <tr>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb', width: '40px' }}></th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Name / Test ID</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>TPS</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Latency</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Success</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Start Time</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Duration</th>
                  <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allTests.map(test => {
                  const isExpanded = expandedTests.has(test.testId);

                  return (
                    <>
                      <tr key={test.testId} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <button
                          onClick={() => toggleTestExpand(test.testId)}
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
                      <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                        <Link to={`/tests/${test.testId}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                          {test.name ? (
                            <div>
                              <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                                {test.name}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                {test.testId}
                              </div>
                            </div>
                          ) : (
                            test.testId
                          )}
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
                      <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '600', color: '#f59e0b' }}>
                        {test.endTime && test.startTime ? `${((test.endTime - test.startTime) / 1000).toFixed(1)}s` : '-'}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
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
                              onClick={() => handleRerun(test.testId)}
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
                        <td colSpan={9} style={{ padding: '1rem', backgroundColor: '#f9fafb' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                            <div style={{
                              padding: '1rem',
                              backgroundColor: 'white',
                              borderRadius: '8px',
                              borderLeft: '4px solid #3b82f6'
                            }}>
                              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>TPS</div>
                              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3b82f6' }}>
                                {getTPS(test.summary)}
                              </div>
                            </div>
                            <div style={{
                              padding: '1rem',
                              backgroundColor: 'white',
                              borderRadius: '8px',
                              borderLeft: '4px solid #8b5cf6'
                            }}>
                              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>Latency (Avg)</div>
                              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#8b5cf6' }}>
                                {getLatency(test.summary)}
                              </div>
                            </div>
                            <div style={{
                              padding: '1rem',
                              backgroundColor: 'white',
                              borderRadius: '8px',
                              borderLeft: '4px solid #22c55e'
                            }}>
                              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>Success Rate</div>
                              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#22c55e' }}>
                                {getSuccessRate(test.summary)}
                              </div>
                            </div>
                            <div style={{
                              padding: '1rem',
                              backgroundColor: 'white',
                              borderRadius: '8px',
                              borderLeft: '4px solid #f59e0b'
                            }}>
                              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>Duration</div>
                              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b' }}>
                                {test.endTime && test.startTime ? `${((test.endTime - test.startTime) / 1000).toFixed(1)}s` : 'N/A'}
                              </div>
                            </div>
                          </div>
                          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
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
                              onClick={() => handleRerun(test.testId)}
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
                })}
              </tbody>
          </table>
        </div>

        {loadingMore && (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            color: '#6b7280',
            fontSize: '0.875rem'
          }}>
            Loading more tests...
          </div>
        )}

        {!loadingMore && hasMore && (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            color: '#6b7280',
            fontSize: '0.875rem'
          }}>
            Scroll down to load more tests
          </div>
        )}

        {!hasMore && allTests.length > 0 && (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            color: '#6b7280',
            fontSize: '0.875rem'
          }}>
            All tests loaded
          </div>
        )}
      </>
    )}
    </div>
  );
};
