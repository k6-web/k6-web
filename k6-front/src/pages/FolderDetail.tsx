import {useEffect, useState} from 'react';
import {Link, useLocation, useNavigate, useParams} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {folderApi} from '../apis/folderApi';
import {scriptApi} from '../apis/scriptApi';
import {k6Api} from '../apis/testApi';
import type {FolderWithScripts} from '../types/script';
import type {Test} from '../types/test';
import {TestTable} from '../components/test-list';

export const FolderDetail = () => {
  const {t} = useTranslation();
  const {folderId} = useParams<{ folderId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [folderData, setFolderData] = useState<FolderWithScripts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [folderTests, setFolderTests] = useState<Test[]>([]);
  const [showLastScriptTooltip, setShowLastScriptTooltip] = useState(false);
  const [showTestNameModal, setShowTestNameModal] = useState(false);
  const [testNameInput, setTestNameInput] = useState('');
  const [pendingScriptId, setPendingScriptId] = useState<string | null>(null);

  const MAX_SCRIPTS_PER_FOLDER = 30;

  const fetchFolderData = async () => {
    if (!folderId) return;

    try {
      setLoading(true);
      const data = await folderApi.getFolder(folderId);
      setFolderData(data);
      setError(null);

      // 폴더 테스트 이력도 함께 가져오기
      await fetchFolderTests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch folder');
    } finally {
      setLoading(false);
    }
  };

  const fetchFolderTests = async (folder?: FolderWithScripts) => {
    if (!folderId) return;

    const currentFolder = folder || folderData;
    if (!currentFolder) return;

    try {
      // 폴더 내 스크립트 수만큼 최근 테스트 가져오기
      const limit = Math.max(MAX_SCRIPTS_PER_FOLDER, currentFolder.scripts.length);
      const response = await k6Api.getTests(null, limit);

      // 폴더 내 스크립트 ID 목록
      const scriptIds = new Set(currentFolder.scripts.map(s => s.scriptId));

      // 폴더 내 스크립트의 테스트만 필터링
      const filtered = response.tests.filter(test =>
        test.scriptId && scriptIds.has(test.scriptId)
      );

      setFolderTests(filtered);
    } catch (err) {
      console.error('Failed to fetch folder tests:', err);
    }
  };

  useEffect(() => {
    fetchFolderData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderId]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('runAll') === 'true' && folderData && folderData.scripts.length > 0) {
      handleRunAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, folderData]);

  // 실행 중일 때 폴더 테스트 주기적으로 갱신
  useEffect(() => {
    if (!isRunningAll) return;

    const interval = setInterval(() => {
      fetchFolderTests();
    }, 2000); // 2초마다 갱신

    return () => {
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunningAll, folderData]);

  // 마지막 스크립트에 툴팁 표시 (0.3초 후 표시, 5초 후 자동 숨김)
  useEffect(() => {
    if (folderData && folderData.scripts.length > 0) {
      const showTimer = setTimeout(() => {
        setShowLastScriptTooltip(true);
      }, 300);

      const hideTimer = setTimeout(() => {
        setShowLastScriptTooltip(false);
      }, 5000);

      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [folderData]);

  const handleRun = (scriptId: string) => {
    setPendingScriptId(scriptId);
    setTestNameInput('');
    setShowTestNameModal(true);
  };

  const handleTestNameConfirm = async () => {
    if (!pendingScriptId) return;

    setShowTestNameModal(false);

    if (!confirm(t('folderDetail.confirmRunScript'))) {
      setPendingScriptId(null);
      return;
    }

    try {
      const result = await scriptApi.runScript(pendingScriptId, testNameInput ? {name: testNameInput} : undefined);
      navigate(`/tests/${result.testId}`);
    } catch (err) {
      alert(t('folderDetail.failedToRunScript'));
    } finally {
      setPendingScriptId(null);
    }
  };

  const handleRunAll = async () => {
    if (!folderId || !folderData || folderData.scripts.length === 0) {
      alert(t('folderDetail.noScripts'));
      return;
    }

    if (!confirm(t('folderDetail.confirmRunAll'))) return;

    try {
      setIsRunningAll(true);
      await folderApi.runAllScripts(folderId);

      // 실행 완료 후 테스트 목록 새로고침
      await fetchFolderTests();
    } catch (err) {
      alert(err instanceof Error ? err.message : t('folderDetail.failedToRunScript'));
    } finally {
      setIsRunningAll(false);
    }
  };

  if (loading) return <div>{t('common.loading')}</div>;
  if (error) return <div style={{color: 'red'}}>{t('common.error')}: {error}</div>;
  if (!folderData) return <div>{t('folderList.noFolders')}</div>;

  return (
    <div>
      <div style={{marginBottom: '1rem'}}>
        <Link to="/folders" style={{color: '#3b82f6', textDecoration: 'none'}}>
          {t('folderDetail.backToFolders')}
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
            {folderData.scriptCount} script{folderData.scriptCount === 1 ? '' : 's'} in this folder
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
            + {t('folderDetail.newScript')}
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
              {isRunningAll ? t('testList.loadingMore') : t('folderDetail.runAllScripts')}
            </button>
          )}
        </div>
      </div>

      {/* 스크립트 목록 */}
      {folderData.scripts.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          padding: '3rem',
          borderRadius: '8px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '1.5rem'
        }}>
          <p>{t('folderDetail.noScripts')}</p>
          <Link
            to={`/new-test?saveScript=true&folderId=${folderId}`}
            style={{color: '#3b82f6'}}
          >
            {t('folderDetail.createFirstScript')}
          </Link>
        </div>
      ) : (
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '1.5rem',
          overflow: 'visible'
        }}>
          <h2
            style={{margin: '0 0 1rem 0', fontSize: '1.25rem', cursor: 'help'}}
            title={t('folderDetail.scriptsTooltip')}
          >
            {t('folderList.scriptsCount')}
          </h2>
          <div style={{overflowX: 'auto', position: 'relative', overflow: 'visible'}}>
            <table style={{width: '100%', borderCollapse: 'collapse', position: 'relative'}}>
              <thead>
              <tr style={{backgroundColor: '#f3f4f6'}}>
                <th style={{padding: '0.75rem', textAlign: 'left', width: '40px'}}></th>
                <th style={{padding: '0.75rem', textAlign: 'left'}}>{t('scriptDetail.scriptId')}</th>
                <th style={{padding: '0.75rem', textAlign: 'left'}}>{t('common.description')}</th>
                <th style={{padding: '0.75rem', textAlign: 'left'}}>{t('common.tags')}</th>
                <th style={{padding: '0.75rem', textAlign: 'left'}}>{t('common.updatedAt')}</th>
                <th style={{
                  padding: '0.75rem',
                  textAlign: 'center',
                  width: '180px'
                }}>{t('folderDetail.actions')}</th>
              </tr>
              </thead>
              <tbody style={{position: 'relative'}}>
              {folderData.scripts.map((script, index) => (
                <tr
                  key={script.scriptId}
                  style={{
                    borderBottom: '1px solid #e5e7eb',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  onClick={() => navigate(`/scripts/${script.scriptId}`)}
                >
                  <td style={{padding: '0.75rem', fontSize: '1.25rem', position: 'relative'}}>
                    📄
                    {index === folderData.scripts.length - 1 && showLastScriptTooltip && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '40px',
                          left: '0',
                          backgroundColor: '#1f2937',
                          color: 'white',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                          zIndex: 9999,
                          animation: 'fadeIn 0.3s ease-in',
                          pointerEvents: 'none'
                        }}
                      >
                        {t('folderDetail.checkPerformanceChanges')}
                        <div
                          style={{
                            position: 'absolute',
                            top: '-6px',
                            left: '20px',
                            width: 0,
                            height: 0,
                            borderLeft: '6px solid transparent',
                            borderRight: '6px solid transparent',
                            borderBottom: '6px solid #1f2937'
                          }}
                        />
                      </div>
                    )}
                  </td>
                  <td style={{padding: '0.75rem', fontWeight: 'bold'}}>
                    {script.scriptId}
                  </td>
                  <td style={{padding: '0.75rem', fontSize: '0.875rem', color: '#6b7280', maxWidth: '300px'}}>
                    {script.description || '-'}
                  </td>
                  <td style={{padding: '0.75rem', fontSize: '0.875rem'}}>
                    {script.tags && script.tags.length > 0 ? (
                      <div style={{display: 'flex', gap: '0.25rem', flexWrap: 'wrap'}}>
                        {script.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            style={{
                              backgroundColor: '#e0e7ff',
                              color: '#3730a3',
                              padding: '0.125rem 0.5rem',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: '500'
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{color: '#9ca3af'}}>-</span>
                    )}
                  </td>
                  <td style={{padding: '0.75rem', fontSize: '0.875rem', color: '#6b7280'}}>
                    {new Date(script.updatedAt).toLocaleString()}
                  </td>
                  <td style={{padding: '0.75rem'}} onClick={(e) => e.stopPropagation()}>
                    <div style={{
                      display: 'flex',
                      gap: '0.25rem',
                      justifyContent: 'center',
                      flexWrap: 'wrap'
                    }}>
                      <Link
                        to={`/scripts/${script.scriptId}`}
                        style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: '#8b5cf6',
                          color: 'white',
                          textDecoration: 'none',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          display: 'inline-block',
                          whiteSpace: 'nowrap'
                        }}
                        title={t('scriptDetail.viewDetails')}
                      >
                        {t('scriptDetail.viewDetails')}
                      </Link>
                      <button
                        onClick={() => handleRun(script.scriptId)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          whiteSpace: 'nowrap'
                        }}
                        title={t('folderDetail.runScript')}
                      >
                        {t('folderDetail.runScript')}
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

      {/* 테스트 실행 이력 */}
      {folderTests.length > 0 && (
        <div>
          <h2 style={{margin: '0 0 1rem 0', fontSize: '1.25rem'}}>{t('folderDetail.executionResults')}</h2>
          <TestTable
            tests={folderTests}
          />
        </div>
      )}

      {/* 테스트 이름 입력 모달 */}
      {showTestNameModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h2 style={{marginTop: 0}}>{t('httpConfig.testName')}</h2>
            <p style={{margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#6b7280'}}>
              {t('httpConfig.testNameOptionalInfo')}
            </p>
            <div style={{marginBottom: '1.5rem'}}>
              <input
                type="text"
                value={testNameInput}
                onChange={(e) => setTestNameInput(e.target.value.slice(0, 50))}
                placeholder={t('httpConfig.testNamePlaceholder')}
                maxLength={50}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleTestNameConfirm();
                  }
                }}
              />
              <div style={{fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem'}}>
                {testNameInput?.length || 0}/50 characters
              </div>
            </div>
            <div style={{display: 'flex', gap: '0.5rem', justifyContent: 'flex-end'}}>
              <button
                type="button"
                onClick={() => {
                  setShowTestNameModal(false);
                  setPendingScriptId(null);
                }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleTestNameConfirm}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {t('common.start')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
