import {useEffect, useState} from 'react';
import {Link, useNavigate, useParams} from 'react-router-dom';
import {scriptApi} from '../apis/scriptApi';
import type {Script, TestComparison} from '../types/script';
import type {Test} from '../types/test';
import {MetricsTrendChart} from '../components/MetricsTrendChart';
import {Button} from "../components/common";

export const ScriptDetail = () => {
  const {scriptId} = useParams<{ scriptId: string }>();
  const navigate = useNavigate();
  const [script, setScript] = useState<Script | null>(null);
  const [history, setHistory] = useState<Test[]>([]);
  const [comparison, setComparison] = useState<TestComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({name: '', description: ''});

  useEffect(() => {
    if (!scriptId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [scriptData, historyData] = await Promise.all([
          scriptApi.getScript(scriptId),
          scriptApi.getScriptHistory(scriptId, 50)
        ]);
        setScript(scriptData);
        setHistory(historyData.tests);
        setEditData({name: scriptData.name, description: scriptData.description || ''});
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch script');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [scriptId]);

  const handleRun = async () => {
    if (!scriptId) return;
    try {
      const result = await scriptApi.runScript(scriptId);
      navigate(`/tests/${result.testId}`);
    } catch (err) {
      alert('Failed to run script');
    }
  };

  const handleUpdate = async () => {
    if (!scriptId) return;
    try {
      const updated = await scriptApi.updateScript(scriptId, {
        name: editData.name,
        description: editData.description
      });
      setScript(updated);
      setIsEditing(false);
    } catch (err) {
      alert('Failed to update script');
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      alert('Link copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy link.');
    });
  }

  const extractMetrics = (test: Test) => {
    const summary = test.summary;
    if (!summary?.metrics) {
      return {tps: 0, p90: 0, p95: 0, errorRate: 0};
    }

    const tps = summary.metrics.http_reqs?.rate || 0;
    const p90 = summary.metrics.http_req_duration?.['p(90)'] || 0;
    const p95 = summary.metrics.http_req_duration?.['p(95)'] || 0;
    const errorRate = summary.metrics.http_req_failed?.value || 0;

    return {tps, p95, p90, errorRate};
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div style={{color: 'red'}}>Error: {error}</div>;
  if (!script) return <div>Script not found</div>;

  return (
    <div>
      <Link to="/scripts"
            style={{color: '#3b82f6', textDecoration: 'none', marginBottom: '1rem', display: 'inline-block'}}>
        ← Back to Scripts
      </Link>

      <div style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '1rem'
      }}>
        {!isEditing ? (
          <>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem'}}>
              <div>
                <h1 style={{margin: '0 0 0.5rem 0'}}>{script.name}</h1>
                <p style={{margin: 0, color: '#6b7280'}}>{script.description || 'No description'}</p>
              </div>
              <div style={{display: 'flex', gap: '0.5rem'}}>
                <Button
                  variant="purple"
                  onClick={handleShare}
                  style={{fontSize: 'clamp(0.75rem, 2vw, 0.875rem)'}}
                >
                  🔗 Share
                </Button>
                <button
                  onClick={() => setIsEditing(true)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={handleRun}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Run Test
                </button>
              </div>
            </div>

            {script.tags && script.tags.length > 0 && (
              <div style={{display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginBottom: '1rem'}}>
                {script.tags.map(tag => (
                  <span
                    key={tag}
                    style={{
                      backgroundColor: '#dbeafe',
                      color: '#1e40af',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.875rem'
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div style={{fontSize: '0.875rem', color: '#9ca3af'}}>
              <div>ID: <code>{script.scriptId}</code></div>
              <div>Created: {new Date(script.createdAt).toLocaleString()}</div>
              <div>Updated: {new Date(script.updatedAt).toLocaleString()}</div>
            </div>
          </>
        ) : (
          <div>
            <h2>Edit Script</h2>
            <div style={{marginBottom: '1rem'}}>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>Name</label>
              <input
                type="text"
                value={editData.name}
                onChange={(e) => setEditData({...editData, name: e.target.value})}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px'
                }}
              />
            </div>
            <div style={{marginBottom: '1rem'}}>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>Description</label>
              <textarea
                value={editData.description}
                onChange={(e) => setEditData({...editData, description: e.target.value})}
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px'
                }}
              />
            </div>
            <div style={{display: 'flex', gap: '0.5rem'}}>
              <button
                onClick={handleUpdate}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '1rem'
      }}>
        <h2>Script Code</h2>
        <pre style={{
          backgroundColor: '#f3f4f6',
          padding: '1rem',
          borderRadius: '4px',
          overflow: 'auto',
          fontSize: '0.875rem'
        }}>
          {script.script}
        </pre>
      </div>

      {history.length > 0 && (
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '1rem'
        }}>
          <h2 style={{marginBottom: '1rem'}}>Performance Trends</h2>
          <MetricsTrendChart tests={history}/>
        </div>
      )}

      <div style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '1rem'
      }}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
          <h2 style={{margin: 0}}>Execution History ({history.length})</h2>
        </div>

        {history.length === 0 ? (
          <p style={{color: '#6b7280'}}>No execution history yet. Run the script to see results here.</p>
        ) : (
          <div style={{overflowX: 'auto'}}>
            <table style={{width: '100%', borderCollapse: 'collapse'}}>
              <thead>
              <tr style={{backgroundColor: '#f3f4f6'}}>
                <th style={{padding: '0.5rem', textAlign: 'left'}}>Test ID</th>
                <th style={{padding: '0.5rem', textAlign: 'left'}}>Status</th>
                <th style={{padding: '0.5rem', textAlign: 'right'}}>TPS</th>
                <th style={{padding: '0.5rem', textAlign: 'right'}}>P90 (ms)</th>
                <th style={{padding: '0.5rem', textAlign: 'right'}}>P95 (ms)</th>
                <th style={{padding: '0.5rem', textAlign: 'right'}}>Error %</th>
                <th style={{padding: '0.5rem', textAlign: 'left'}}>Started</th>
                <th style={{padding: '0.5rem', textAlign: 'left'}}>Actions</th>
              </tr>
              </thead>
              <tbody>
              {history.map(test => {
                const metrics = extractMetrics(test);
                return (
                  <tr key={test.testId} style={{borderBottom: '1px solid #e5e7eb'}}>
                    <td style={{padding: '0.5rem'}}>{test.testId}</td>
                    <td style={{padding: '0.5rem'}}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          backgroundColor: test.status === 'completed' ? '#d1fae5' : '#fee2e2',
                          color: test.status === 'completed' ? '#065f46' : '#991b1b'
                        }}>
                          {test.status}
                        </span>
                    </td>
                    <td style={{padding: '0.5rem', textAlign: 'right', fontFamily: 'monospace'}}>
                      {metrics.tps > 0 ? metrics.tps.toFixed(2) : '-'}
                    </td>
                    <td style={{padding: '0.5rem', textAlign: 'right', fontFamily: 'monospace'}}>
                      {metrics.p90 > 0 ? metrics.p90.toFixed(2) : '-'}
                    </td>
                    <td style={{padding: '0.5rem', textAlign: 'right', fontFamily: 'monospace'}}>
                      {metrics.p95 > 0 ? metrics.p95.toFixed(2) : '-'}
                    </td>
                    <td style={{padding: '0.5rem', textAlign: 'right', fontFamily: 'monospace'}}>
                      {metrics.errorRate > 0 ? (metrics.errorRate * 100).toFixed(2) : '0.00'}
                    </td>
                    <td style={{padding: '0.5rem'}}>{new Date(test.startTime).toLocaleString()}</td>
                    <td style={{padding: '0.5rem'}}>
                      <Link
                        to={`/tests/${test.testId}`}
                        style={{color: '#3b82f6', textDecoration: 'none'}}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {comparison && (
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
            <h2 style={{margin: 0}}>Comparison Results</h2>
            <button
              onClick={() => setComparison(null)}
              style={{
                padding: '0.25rem 0.5rem',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Close
            </button>
          </div>

          <div style={{marginBottom: '1rem', fontSize: '0.875rem', color: '#6b7280'}}>
            <div>Baseline: {comparison.baselineTestId} ({new Date(comparison.baselineTime).toLocaleString()})</div>
            <div>Current: {comparison.currentTestId} ({new Date(comparison.currentTime).toLocaleString()})</div>
          </div>

          <div style={{display: 'grid', gap: '0.5rem'}}>
            {comparison.metrics.map(metric => (
              <div
                key={metric.metricName}
                style={{
                  padding: '1rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '4px',
                  borderLeft: `4px solid ${metric.improved ? '#10b981' : metric.changePercent < -1 ? '#ef4444' : '#6b7280'}`
                }}
              >
                <div style={{fontWeight: 'bold', marginBottom: '0.25rem'}}>{metric.metricName}</div>
                <div style={{display: 'flex', gap: '1rem', fontSize: '0.875rem'}}>
                  <span>Baseline: {metric.baseline.toFixed(2)}</span>
                  <span>Current: {metric.current.toFixed(2)}</span>
                  <span style={{
                    fontWeight: 'bold',
                    color: metric.improved ? '#10b981' : metric.changePercent < -1 ? '#ef4444' : '#6b7280'
                  }}>
                    {metric.changePercent > 0 ? '+' : ''}{metric.changePercent.toFixed(2)}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div style={{marginTop: '1rem', padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '4px'}}>
            <strong>Summary:</strong> {comparison.summary.improved} improved, {comparison.summary.degraded} degraded, {comparison.summary.unchanged} unchanged
          </div>
        </div>
      )}
    </div>
  );
};
