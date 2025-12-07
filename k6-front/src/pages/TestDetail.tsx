import {useEffect, useRef, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {k6Api} from '../apis/testApi.ts';
import type {Test} from '../types/test.ts';
import type {LogEntry} from '../types/log.ts';
import {CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {Light as SyntaxHighlighter} from 'react-syntax-highlighter';
import javascript from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript';
import {github} from 'react-syntax-highlighter/dist/esm/styles/hljs';

SyntaxHighlighter.registerLanguage('javascript', javascript);

const formatBytes = (bytes: number | undefined): string => {
  if (!bytes) return 'N/A';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`;
};

const formatDuration = (ms: number | undefined): string => {
  if (!ms) return 'N/A';
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

function parseK6TimeSeriesData(rawOutput: string) {
  const lines = rawOutput.split('\n');
  const stats: { time: number; vus: number; tps: number }[] = [];
  let prevComplete = 0;
  let prevTime = 0;

  const regexWithMinutes = /running \((\d+)m([\d.]+)s\), (\d+)\/(\d+) VUs, (\d+) complete/;
  const regexSecondsOnly = /running \(0*(\d+\.?\d*)s\), (\d+)\/(\d+) VUs, (\d+) complete/;

  for (const line of lines) {
    let timeInSeconds = 0;
    let currentVus = 0;
    let complete = 0;
    let matched = false;

    const matchMinutes = regexWithMinutes.exec(line);
    if (matchMinutes) {
      const minutes = Number.parseInt(matchMinutes[1], 10);
      const seconds = Number.parseFloat(matchMinutes[2]);
      timeInSeconds = minutes * 60 + seconds;
      currentVus = Number.parseInt(matchMinutes[3], 10);
      complete = Number.parseInt(matchMinutes[5], 10);
      matched = true;
    } else {
      const matchSeconds = regexSecondsOnly.exec(line);
      if (matchSeconds) {
        timeInSeconds = Number.parseFloat(matchSeconds[1]);
        currentVus = Number.parseInt(matchSeconds[2], 10);
        complete = Number.parseInt(matchSeconds[4], 10);
        matched = true;
      }
    }

    if (matched) {
      const tps = prevTime > 0 ? Math.round((complete - prevComplete) / (timeInSeconds - prevTime)) : 0;

      stats.push({
        time: Math.round(timeInSeconds * 10) / 10,
        vus: currentVus,
        tps: tps
      });

      prevComplete = complete;
      prevTime = timeInSeconds;
    }
  }

  if (stats.length > 0 && stats.at(-1)?.vus === 0) {
    stats.pop();
  }

  return stats;
}

export const TestDetail = () => {
  const {testId} = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const [testInfo, setTestInfo] = useState<Test | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [livePerformanceData, setLivePerformanceData] = useState<{ time: number; vus: number; tps: number }[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const [progress, setProgress] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [logFilter, setLogFilter] = useState<'all' | 'stdout' | 'stderr' | 'error' | 'system'>('all');
  const [autoScroll, setAutoScroll] = useState(false);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (testInfo?.status === 'running' && logsEndRef.current && autoScroll) {
      logsEndRef.current.scrollIntoView({behavior: 'smooth'});
    }
  }, [logs, testInfo?.status, autoScroll]);

  useEffect(() => {
    const container = logsContainerRef.current;
    if (!container || !autoScroll) return;

    const handleUserScroll = () => {
      setAutoScroll(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) {
        setAutoScroll(false);
      }
    };

    container.addEventListener('wheel', handleUserScroll, {passive: true});
    container.addEventListener('touchmove', handleUserScroll, {passive: true});
    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('wheel', handleUserScroll);
      container.removeEventListener('touchmove', handleUserScroll);
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [autoScroll]);

  const scrollToTop = () => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTo({top: 0, behavior: 'smooth'});
      setAutoScroll(false);
    }
  };

  const scrollToBottom = () => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({behavior: 'smooth'});
    }
  };

  const toggleAutoScroll = () => {
    setAutoScroll(prev => !prev);
    if (!autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({behavior: 'smooth'});
    }
  };


  useEffect(() => {
    if (!testId) return;

    const fetchTestInfo = async () => {
      try {
        const info = await k6Api.getTest(testId);
        setTestInfo(info);

        if (info.status !== 'running') {
          const result = await k6Api.getTest(testId);
          setTestInfo(result);
        }

        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch test');
      } finally {
        setLoading(false);
      }
    };

    fetchTestInfo();

    if (testInfo?.status === 'running') {
      const interval = setInterval(fetchTestInfo, 2000);
      return () => clearInterval(interval);
    }
  }, [testId, testInfo?.status]);

  useEffect(() => {
    if (!testId || !testInfo || testInfo.status !== 'running') return;

    let accumulatedOutput = '';
    const eventSource = new EventSource(k6Api.getTestLogStreamUrl(testId));

    eventSource.onmessage = (event) => {
      const log: LogEntry = JSON.parse(event.data);
      setLogs(prev => [...prev, log]);

      if (log.type === 'stderr' || log.type === 'error') {
        setErrorCount(prev => prev + 1);
      }

      if (log.type === 'stdout') {
        accumulatedOutput += log.message;

        const parsedData = parseK6TimeSeriesData(accumulatedOutput);
        setLivePerformanceData(parsedData);

        const progressMatch = /\[\s*(\d+)%\s*\]/u.exec(log.message);
        if (progressMatch) {
          setProgress(Number.parseInt(progressMatch[1], 10));
        }
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [testId, testInfo]);

  const handleStop = async () => {
    if (!testId || !confirm('Are you sure you want to stop this test?')) return;

    try {
      await k6Api.stopTest(testId);
      window.location.reload();
    } catch (err) {
      alert('Failed to stop test: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleDelete = async () => {
    if (!testId || !confirm('Are you sure you want to delete this test result?')) return;

    try {
      await k6Api.deleteTest(testId);
      navigate('/');
    } catch (err) {
      alert('Failed to delete test: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleRerun = () => {
    if (!testInfo) return;

    const scriptToRerun = testInfo?.script;

    if (scriptToRerun) {
      sessionStorage.setItem('rerunScript', scriptToRerun);
      navigate('/new-test');
    } else {
      alert('No script available to re-run');
    }
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      alert('Link copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy link.');
    });
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div style={{color: 'red'}}>Error: {error}</div>;
  if (!testInfo) return <div>Test not found</div>;

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{margin: 0, fontSize: 'clamp(1.25rem, 4vw, 1.875rem)'}}>
            {testInfo.name || `Test: ${testId}`}
          </h1>
          {(testInfo.name) && (
            <p style={{
              color: '#9ca3af',
              margin: '0.25rem 0 0 0',
              fontSize: 'clamp(0.625rem, 2vw, 0.75rem)',
              wordBreak: 'break-all'
            }}>
              ID: {testId}
            </p>
          )}
        </div>
        <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
          {testInfo.status === 'running' && (
            <button
              onClick={handleStop}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: 'clamp(0.75rem, 2vw, 0.875rem)'
              }}
            >
              Stop Test
            </button>
          )}
          {testInfo.status !== 'running' && (
            <>
              <button
                onClick={handleCopyLink}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: 'clamp(0.75rem, 2vw, 0.875rem)'
                }}
              >
                🔗 Share
              </button>
              <button
                onClick={handleRerun}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: 'clamp(0.75rem, 2vw, 0.875rem)'
                }}
              >
                🔄 Re-run
              </button>
              <button
                onClick={handleDelete}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: 'clamp(0.75rem, 2vw, 0.875rem)'
                }}
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{marginTop: 0}}>Test Information</h2>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem'}}>
          <div>
            <div style={{fontSize: '0.875rem', color: '#666'}}>Status</div>
            <div style={{
              fontSize: '1.25rem',
              fontWeight: 'bold',
              color: testInfo.status === 'running' ? '#3b82f6' :
                testInfo.status === 'completed' ? '#22c55e' :
                  testInfo.status === 'failed' ? '#ef4444' : '#6b7280'
            }}>
              {testInfo.status.toUpperCase()}
            </div>
          </div>

          {testInfo.status === 'running' && progress > 0 && (
            <div>
              <div style={{fontSize: '0.875rem', color: '#666'}}>Progress</div>
              <div style={{fontSize: '1.25rem', fontWeight: 'bold', color: '#3b82f6'}}>
                {progress}%
              </div>
              <div style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#e5e7eb',
                borderRadius: '4px',
                marginTop: '0.5rem',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${progress}%`,
                  height: '100%',
                  backgroundColor: '#3b82f6',
                  transition: 'width 0.3s ease'
                }}/>
              </div>
            </div>
          )}

          {testInfo.status === 'running' && errorCount > 0 && (
            <div>
              <div style={{fontSize: '0.875rem', color: '#666'}}>Errors</div>
              <div style={{fontSize: '1.25rem', fontWeight: 'bold', color: '#ef4444'}}>
                {errorCount}
              </div>
            </div>
          )}

          <div>
            <div style={{fontSize: '0.875rem', color: '#666'}}>Start Time</div>
            <div style={{fontSize: '1rem'}}>{new Date(testInfo.startTime).toLocaleString()}</div>
          </div>
          {testInfo?.endTime && (
            <>
              <div>
                <div style={{fontSize: '0.875rem', color: '#666'}}>End Time</div>
                <div style={{fontSize: '1rem'}}>{new Date(testInfo.endTime).toLocaleString()}</div>
              </div>
              <div>
                <div style={{fontSize: '0.875rem', color: '#666'}}>Duration</div>
                <div style={{fontSize: '1rem'}}>{((testInfo.endTime - testInfo.startTime) / 1000).toFixed(2)}s</div>
              </div>
            </>
          )}
        </div>
      </div>

      {testInfo.script && (
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{marginTop: 0, marginBottom: '1rem'}}>Script</h2>
          <SyntaxHighlighter
            language="javascript"
            style={github}
            customStyle={{
              borderRadius: '4px',
              fontSize: '0.875rem',
              margin: 0,
              backgroundColor: '#f6f8fa'
            }}
            showLineNumbers={true}
          >
            {testInfo.script}
          </SyntaxHighlighter>
        </div>
      )}

      {/* Performance Over Time - 실시간만 표시 */}
      {(() => {
        const timeSeriesData = testInfo.status === 'running' ? livePerformanceData : [];

        if (timeSeriesData.length === 0) return null;

        return (
          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{marginTop: 0, marginBottom: '1.5rem'}}>
              Performance Over Time
              {testInfo.status === 'running' && (
                <span style={{
                  marginLeft: '1rem',
                  fontSize: '0.875rem',
                  color: '#3b82f6',
                  fontWeight: 'normal'
                }}>
                  🔴 Live
                </span>
              )}
            </h2>

            {/* VU 그래프 */}
            <div style={{marginBottom: '2rem'}}>
              <h3 style={{fontSize: '1rem', color: '#666', marginBottom: '1rem'}}>Virtual Users (VUs)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={timeSeriesData} margin={{top: 5, right: 30, left: 20, bottom: 5}}>
                  <CartesianGrid strokeDasharray="3 3"/>
                  <XAxis
                    dataKey="time"
                    label={{value: 'Time (seconds)', position: 'insideBottomRight', offset: -10}}
                  />
                  <YAxis
                    label={{value: 'VUs', angle: -90, position: 'insideLeft'}}
                  />
                  <Tooltip
                    formatter={(value: number) => [value, 'VUs']}
                    labelFormatter={(label) => `Time: ${label}s`}
                  />
                  <Legend/>
                  <Line
                    type="monotone"
                    dataKey="vus"
                    stroke="#8884d8"
                    strokeWidth={2}
                    name="Virtual Users"
                    dot={{r: 3}}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* TPS 그래프 */}
            <div>
              <h3 style={{fontSize: '1rem', color: '#666', marginBottom: '1rem'}}>Transactions Per Second (TPS)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={timeSeriesData} margin={{top: 5, right: 30, left: 20, bottom: 5}}>
                  <CartesianGrid strokeDasharray="3 3"/>
                  <XAxis
                    dataKey="time"
                    label={{value: 'Time (seconds)', position: 'insideBottomRight', offset: -10}}
                  />
                  <YAxis
                    label={{value: 'TPS', angle: -90, position: 'insideLeft'}}
                  />
                  <Tooltip
                    formatter={(value: number) => [value, 'TPS']}
                    labelFormatter={(label) => `Time: ${label}s`}
                  />
                  <Legend/>
                  <Line
                    type="monotone"
                    dataKey="tps"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    name="Transactions/sec"
                    dot={{r: 3}}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })()}

      {testInfo.status === 'running' && logs.length > 0 && (
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
            <h2 style={{margin: 0}}>Live Logs</h2>
            <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
              {/* 로그 필터 버튼 */}
              {(['all', 'stdout', 'stderr', 'error', 'system'] as const).map(filter => (
                <button
                  key={filter}
                  onClick={() => setLogFilter(filter)}
                  style={{
                    padding: '0.25rem 0.75rem',
                    fontSize: '0.75rem',
                    backgroundColor: logFilter === filter ? '#3b82f6' : '#e5e7eb',
                    color: logFilter === filter ? 'white' : '#374151',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    fontWeight: logFilter === filter ? 'bold' : 'normal'
                  }}
                >
                  {filter}
                </button>
              ))}

              <div style={{width: '1px', height: '20px', backgroundColor: '#d1d5db', margin: '0 0.25rem'}}/>

              {/* 스크롤 제어 버튼 */}
              <button
                onClick={scrollToTop}
                title="Scroll to top"
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.875rem',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                ⬆️
              </button>

              <button
                onClick={scrollToBottom}
                title="Scroll to bottom"
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.875rem',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                ⬇️
              </button>

              <button
                onClick={toggleAutoScroll}
                title={autoScroll ? 'Disable auto-scroll' : 'Enable auto-scroll'}
                style={{
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.75rem',
                  backgroundColor: autoScroll ? '#10b981' : '#e5e7eb',
                  color: autoScroll ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                {autoScroll ? '🔴' : '⚪'} AUTO
              </button>
            </div>
          </div>
          <div
            ref={logsContainerRef}
            style={{
              backgroundColor: '#1e1e1e',
              color: '#d4d4d4',
              padding: '1rem',
              borderRadius: '4px',
              maxHeight: '400px',
              overflow: 'auto',
              fontSize: '0.875rem',
              fontFamily: 'monospace'
            }}>
            {logs
              .filter(log => logFilter === 'all' || log.type === logFilter)
              .map((log, index) => (
                <div key={index} style={{
                  color: log.type === 'stderr' || log.type === 'error' ? '#f87171' :
                    log.type === 'system' ? '#60a5fa' : '#d4d4d4'
                }}>
                  [{new Date(log.timestamp).toLocaleTimeString()}] {log.message}
                </div>
              ))}
            <div ref={logsEndRef}/>
          </div>
        </div>
      )}

      {testInfo?.summary && (
        <>
          {/* 주요 메트릭 카드 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            {/* TPS 카드 */}
            <div style={{
              backgroundColor: 'white',
              padding: '1.5rem',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              borderLeft: '4px solid #3b82f6'
            }}>
              <div style={{fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem'}}>
                TPS (Transactions Per Second)
              </div>
              <div style={{fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6'}}>
                {testInfo.summary.metrics.http_reqs?.rate ? Math.round(testInfo.summary.metrics.http_reqs.rate) : 'N/A'}
              </div>
              <div style={{fontSize: '0.75rem', color: '#999', marginTop: '0.25rem'}}>
                Total Requests: {testInfo.summary.metrics.http_reqs?.count || 'N/A'}
              </div>
            </div>

            {/* Latency 카드 */}
            <div style={{
              backgroundColor: 'white',
              padding: '1.5rem',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              borderLeft: '4px solid #8b5cf6'
            }}>
              <div style={{fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem'}}>
                Response Time (Latency)
              </div>
              <div style={{display: 'flex', gap: '1rem', marginTop: '0.5rem'}}>
                <div>
                  <div style={{fontSize: '0.75rem', color: '#999'}}>Avg</div>
                  <div style={{fontSize: '1.25rem', fontWeight: 'bold', color: '#8b5cf6'}}>
                    {formatDuration(testInfo.summary.metrics.http_req_duration?.avg)}
                  </div>
                </div>
                <div>
                  <div style={{fontSize: '0.75rem', color: '#999'}}>P90</div>
                  <div style={{fontSize: '1.25rem', fontWeight: 'bold', color: '#8b5cf6'}}>
                    {formatDuration(testInfo.summary.metrics.http_req_duration?.['p(90)'])}
                  </div>
                </div>
                <div>
                  <div style={{fontSize: '0.75rem', color: '#999'}}>P95</div>
                  <div style={{fontSize: '1.25rem', fontWeight: 'bold', color: '#8b5cf6'}}>
                    {formatDuration(testInfo.summary.metrics.http_req_duration?.['p(95)'])}
                  </div>
                </div>
              </div>
            </div>

            {/* 성공/실패 카드 */}
            {(() => {
              const checks = testInfo.summary.metrics.checks;
              const passRate = checks ? checks.value * 100 : 0;
              const failRate = 100 - passRate;
              const totalChecks = checks ? (checks.passes + checks.fails) : 0;
              const passedChecks = checks?.passes || 0;
              const failedChecks = checks?.fails || 0;

              return (
                <div style={{
                  backgroundColor: 'white',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  borderLeft: `4px solid ${failedChecks > 0 ? '#ef4444' : '#22c55e'}`
                }}>
                  <div style={{fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem'}}>
                    Success / Failure
                  </div>
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
                </div>
              );
            })()}

            {/* 네트워크 대역폭 카드 */}
            <div style={{
              backgroundColor: 'white',
              padding: '1.5rem',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              borderLeft: '4px solid #f59e0b'
            }}>
              <div style={{fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem'}}>
                Network Bandwidth
              </div>
              <div style={{marginTop: '0.5rem'}}>
                <div style={{marginBottom: '0.75rem'}}>
                  <div style={{fontSize: '0.75rem', color: '#999'}}>↓ Received</div>
                  <div style={{fontSize: '1.25rem', fontWeight: 'bold', color: '#f59e0b'}}>
                    {formatBytes(testInfo.summary.metrics.data_received?.count)}
                  </div>
                </div>
                <div>
                  <div style={{fontSize: '0.75rem', color: '#999'}}>↑ Sent</div>
                  <div style={{fontSize: '1.25rem', fontWeight: 'bold', color: '#f59e0b'}}>
                    {formatBytes(testInfo.summary.metrics.data_sent?.count)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Summary JSON */}
          <details style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <summary style={{
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '1.125rem',
              userSelect: 'none'
            }}>
              Raw Summary (JSON)
            </summary>
            <pre style={{
              backgroundColor: '#1e1e1e',
              color: '#d4d4d4',
              padding: '1rem',
              borderRadius: '4px',
              maxHeight: '800px',
              overflow: 'auto',
              fontSize: '0.875rem',
              fontFamily: 'monospace',
              marginTop: '1rem'
            }}>
              {JSON.stringify(testInfo.summary, null, 2)}
            </pre>
          </details>
        </>
      )}
    </div>
  );
};
