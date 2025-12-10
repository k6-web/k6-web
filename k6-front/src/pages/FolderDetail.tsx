import {useEffect, useState} from 'react';
import {Link, useLocation, useNavigate, useParams} from 'react-router-dom';
import {folderApi} from '../apis/folderApi';
import {scriptApi} from '../apis/scriptApi';
import type {FolderWithScripts} from '../types/script';
import {ExecutionStatusPanel, type ScriptExecutionStatus} from '../components/folder/ExecutionStatusPanel';

export const FolderDetail = () => {
  const {folderId} = useParams<{folderId: string}>();
  const navigate = useNavigate();
  const location = useLocation();
  const [folderData, setFolderData] = useState<FolderWithScripts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  const [executionStatuses, setExecutionStatuses] = useState<ScriptExecutionStatus[]>([]);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [pollingIntervalId, setPollingIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [timeUpdateTrigger, setTimeUpdateTrigger] = useState(0);

  const fetchFolderData = async () => {
    if (!folderId) return;

    try {
      setLoading(true);
      const data = await folderApi.getFolder(folderId);
      setFolderData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch folder');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFolderData();
  }, [folderId]);

  // localStorage에서 실행 상태 복원
  useEffect(() => {
    if (!folderId) return;

    const savedState = localStorage.getItem(`folderExecution:${folderId}`);
    if (savedState) {
      try {
        const { statuses, isRunning } = JSON.parse(savedState);
        setExecutionStatuses(statuses);
        setIsRunningAll(isRunning);
        setRunningAll(isRunning);

        // 실행 중이었다면 폴링 재시작
        if (isRunning) {
          startPolling();
        }
      } catch (err) {
        console.error('Failed to restore execution state:', err);
        localStorage.removeItem(`folderExecution:${folderId}`);
      }
    }
  }, [folderId]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('runAll') === 'true' && folderData && folderData.scripts.length > 0) {
      handleRunAll();
    }
  }, [location.search, folderData]);

  useEffect(() => {
    return () => {
      if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
      }
    };
  }, [pollingIntervalId]);

  // 실행 시간 실시간 업데이트를 위한 타이머
  useEffect(() => {
    if (!isRunningAll) return;

    const timeInterval = setInterval(() => {
      setTimeUpdateTrigger(prev => prev + 1);
    }, 1000); // 1초마다 업데이트

    return () => clearInterval(timeInterval);
  }, [isRunningAll]);

  const handleDelete = async (scriptId: string) => {
    if (!folderId) return;
    if (!confirm('Are you sure you want to delete this script?')) return;

    try {
      await folderApi.deleteScript(folderId, scriptId);
      fetchFolderData();
    } catch (err) {
      alert('Failed to delete script');
    }
  };

  const handleRun = async (scriptId: string) => {
    try {
      const result = await scriptApi.runScript(scriptId);
      navigate(`/tests/${result.testId}`);
    } catch (err) {
      alert('Failed to run script');
    }
  };

  const startPolling = () => {
    if (!folderId || !folderData) return;

    const intervalId = setInterval(async () => {
      const currentStatuses = [...executionStatuses];

      for (let i = 0; i < folderData.scripts.length; i++) {
        const script = folderData.scripts[i];

        try {
          const history = await scriptApi.getScriptHistory(script.scriptId, 1);
          if (history.tests.length > 0) {
            const latestTest = history.tests[0];

            // 최근 1분 이내 테스트만 현재 세션으로 간주
            const timeDiff = Date.now() - latestTest.startTime;
            if (timeDiff < 60000) {
              currentStatuses[i] = {
                scriptId: script.scriptId,
                scriptName: script.scriptId,
                testId: latestTest.testId,
                status: latestTest.status,
                startTime: latestTest.startTime,
              };
            }
          }
        } catch (err) {
          console.error(`Failed to fetch status for ${script.scriptId}`, err);
        }
      }

      setExecutionStatuses(currentStatuses);

      // localStorage에 저장
      localStorage.setItem(`folderExecution:${folderId}`, JSON.stringify({
        statuses: currentStatuses,
        isRunning: true
      }));

      // 모든 테스트 완료 시 폴링 중지
      const allCompleted = currentStatuses.every(
        s => s.status === 'completed' || s.status === 'failed' || s.status === 'stopped'
      );

      if (allCompleted) {
        clearInterval(intervalId);
        setIsRunningAll(false);
        setRunningAll(false);
        setPollingIntervalId(null);

        // 완료되면 localStorage에서 제거
        localStorage.removeItem(`folderExecution:${folderId}`);
      }
    }, 2000); // 2초마다 폴링

    setPollingIntervalId(intervalId);
  };

  const handleRunAll = async () => {
    if (!folderId || !folderData || folderData.scripts.length === 0) {
      alert('No scripts to run in this folder');
      return;
    }

    if (!confirm(`Run all ${folderData.scripts.length} scripts sequentially?`)) return;

    try {
      setIsRunningAll(true);
      setRunningAll(true);

      // 1. 모든 스크립트를 pending 상태로 초기화
      const initialStatuses: ScriptExecutionStatus[] = folderData.scripts.map(script => ({
        scriptId: script.scriptId,
        scriptName: script.scriptId,
        status: 'pending' as const,
      }));
      setExecutionStatuses(initialStatuses);

      // localStorage에 초기 상태 저장
      localStorage.setItem(`folderExecution:${folderId}`, JSON.stringify({
        statuses: initialStatuses,
        isRunning: true
      }));

      // 2. run-all API 호출 (백그라운드)
      const runAllPromise = folderApi.runAllScripts(folderId);

      // 3. 폴링 시작
      startPolling();

      // 4. run-all API 완료 대기
      const result = await runAllPromise;
      console.log('All tests completed:', result);

    } catch (err) {
      if (pollingIntervalId) clearInterval(pollingIntervalId);
      setIsRunningAll(false);
      setRunningAll(false);
      setPollingIntervalId(null);
      localStorage.removeItem(`folderExecution:${folderId}`);
      alert(err instanceof Error ? err.message : 'Failed to run scripts');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div style={{color: 'red'}}>Error: {error}</div>;
  if (!folderData) return <div>Folder not found</div>;

  return (
    <div>
      <div style={{marginBottom: '1rem'}}>
        <Link to="/folders" style={{color: '#3b82f6', textDecoration: 'none'}}>
          ← Back to Folders
        </Link>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{margin: 0, fontSize: 'clamp(1.5rem, 5vw, 2rem)'}}>{folderData.folder.name}</h1>
          {folderData.folder.description && (
            <p style={{margin: '0.5rem 0 0 0', color: '#6b7280'}}>
              {folderData.folder.description}
            </p>
          )}
          <p style={{margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#9ca3af'}}>
            {folderData.scriptCount} script{folderData.scriptCount !== 1 ? 's' : ''} in this folder
          </p>
        </div>
        <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
          <Link
            to={`/new-test?saveScript=true&folderId=${folderId}`}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#10b981',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              display: 'inline-block',
              fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
              fontWeight: 'bold'
            }}
          >
            + New Script
          </Link>
          {folderData.scripts.length > 0 && (
            <button
              onClick={handleRunAll}
              disabled={isRunningAll}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: isRunningAll ? '#9ca3af' : '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isRunningAll ? 'not-allowed' : 'pointer',
                fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
                fontWeight: 'bold'
              }}
            >
              {isRunningAll ? 'Running...' : 'Run All Scripts'}
            </button>
          )}
        </div>
      </div>

      {executionStatuses.length > 0 && (
        <ExecutionStatusPanel statuses={executionStatuses} />
      )}

      {folderData.scripts.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          padding: '3rem',
          borderRadius: '8px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <p>No scripts in this folder.</p>
          <Link
            to={`/new-test?saveScript=true&folderId=${folderId}`}
            style={{color: '#3b82f6'}}
          >
            Create your first script
          </Link>
        </div>
      ) : (
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{overflowX: 'auto'}}>
            <table style={{width: '100%', borderCollapse: 'collapse'}}>
              <thead>
                <tr style={{backgroundColor: '#f3f4f6'}}>
                  <th style={{padding: '0.75rem', textAlign: 'left', width: '40px'}}></th>
                  <th style={{padding: '0.75rem', textAlign: 'left'}}>Script ID</th>
                  <th style={{padding: '0.75rem', textAlign: 'left'}}>Description</th>
                  <th style={{padding: '0.75rem', textAlign: 'left'}}>Tags</th>
                  <th style={{padding: '0.75rem', textAlign: 'left'}}>Updated</th>
                  <th style={{padding: '0.75rem', textAlign: 'center', width: '180px'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {folderData.scripts.map(script => (
                  <tr
                    key={script.scriptId}
                    style={{
                      borderBottom: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => navigate(`/scripts/${script.scriptId}`)}
                  >
                    <td style={{padding: '0.75rem', fontSize: '1.25rem'}}>📄</td>
                    <td style={{padding: '0.75rem', fontWeight: 'bold'}}>
                      {script.scriptId}
                    </td>
                    <td style={{padding: '0.75rem', color: '#6b7280'}}>
                      {script.description || 'No description'}
                    </td>
                    <td style={{padding: '0.75rem'}}>
                      {script.tags && script.tags.length > 0 ? (
                        <div style={{display: 'flex', gap: '0.25rem', flexWrap: 'wrap'}}>
                          {script.tags.map(tag => (
                            <span
                              key={tag}
                              style={{
                                backgroundColor: '#dbeafe',
                                color: '#1e40af',
                                padding: '0.125rem 0.5rem',
                                borderRadius: '9999px',
                                fontSize: '0.75rem'
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{color: '#9ca3af', fontSize: '0.875rem'}}>-</span>
                      )}
                    </td>
                    <td style={{padding: '0.75rem', fontSize: '0.875rem', color: '#6b7280'}}>
                      {new Date(script.updatedAt).toLocaleString()}
                    </td>
                    <td style={{padding: '0.75rem'}} onClick={(e) => e.stopPropagation()}>
                      <div style={{display: 'flex', gap: '0.5rem', justifyContent: 'center'}}>
                        <button
                          onClick={() => handleRun(script.scriptId)}
                          style={{
                            padding: '0.375rem 0.75rem',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.875rem'
                          }}
                        >
                          Run
                        </button>
                        <button
                          onClick={() => handleDelete(script.scriptId)}
                          style={{
                            padding: '0.375rem 0.75rem',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.875rem'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
