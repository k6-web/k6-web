import {useEffect, useState} from 'react';
import {Link, useLocation, useNavigate, useParams} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {folderApi} from '../apis/folderApi';
import {scriptApi} from '../apis/scriptApi';
import {k6Api} from '../apis/testApi';
import type {FolderWithScripts} from '../types/script';
import type {Test} from '../types/test';
import type {K6RampUpStage, K6ScriptTemplate, K6TestConfig} from '../types/k6';
import {TestTable} from '../components/test-list';

const DEFAULT_IMPORT_STAGES: K6RampUpStage[] = [
  {duration: 30, target: 10},
  {duration: 60, target: 10},
  {duration: 30, target: 0}
];

const DEFAULT_IMPORT_CONFIG: Pick<K6TestConfig, 'template' | 'vusers' | 'duration' | 'rampUp' | 'stages' | 'targetTps' | 'preAllocatedVUs' | 'maxVUs' | 'failureThreshold'> = {
  template: 'constant-vus',
  vusers: 1,
  duration: 30,
  rampUp: 30,
  stages: DEFAULT_IMPORT_STAGES,
  targetTps: 10,
  preAllocatedVUs: 10,
  maxVUs: 20,
  failureThreshold: 0.05,
};

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
  const [showImportModal, setShowImportModal] = useState(false);
  const [importCollection, setImportCollection] = useState<unknown | null>(null);
  const [importFileName, setImportFileName] = useState('');
  const [importTags, setImportTags] = useState('');
  const [importConfig, setImportConfig] = useState(DEFAULT_IMPORT_CONFIG);
  const [isImporting, setIsImporting] = useState(false);

  const MAX_SCRIPTS_PER_FOLDER = 30;
  const importStages = importConfig.stages && importConfig.stages.length > 0 ? importConfig.stages : DEFAULT_IMPORT_STAGES;

  const handleImportTemplateChange = (template: K6ScriptTemplate) => {
    if (template === 'ramp-up') {
      setImportConfig({
        ...importConfig,
        template,
        vusers: Math.max(importConfig.vusers || 0, 10),
        duration: Math.max(importConfig.duration || 0, 60),
        rampUp: Math.max(importConfig.rampUp || 0, 30),
        stages: importStages
      });
      return;
    }

    if (template === 'constant-tps') {
      setImportConfig({
        ...importConfig,
        template,
        targetTps: Math.max(importConfig.targetTps || 0, 10),
        preAllocatedVUs: Math.max(importConfig.preAllocatedVUs || importConfig.vusers || 0, 10),
        maxVUs: Math.max(importConfig.maxVUs || importConfig.preAllocatedVUs || importConfig.vusers || 0, 20),
        rampUp: 0
      });
      return;
    }

    setImportConfig({...importConfig, template, rampUp: 0});
  };

  const updateImportStage = (index: number, changes: Partial<K6RampUpStage>) => {
    setImportConfig({
      ...importConfig,
      stages: importStages.map((stage, stageIndex) => stageIndex === index ? {...stage, ...changes} : stage)
    });
  };

  const addImportStage = () => {
    const lastTarget = importStages[importStages.length - 1]?.target ?? 10;
    setImportConfig({
      ...importConfig,
      stages: [...importStages, {duration: 30, target: lastTarget}]
    });
  };

  const removeImportStage = (index: number) => {
    if (importStages.length <= 1) return;
    setImportConfig({
      ...importConfig,
      stages: importStages.filter((_, stageIndex) => stageIndex !== index)
    });
  };

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
    } catch {
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

  const handleImportFile = async (file?: File) => {
    if (!file) return;

    try {
      setImportCollection(JSON.parse(await file.text()));
      setImportFileName(file.name);
    } catch {
      alert(t('httpConfig.invalidPostmanFile'));
      setImportCollection(null);
      setImportFileName('');
    }
  };

  const handleImportPostmanScripts = async () => {
    if (!folderId || !importCollection) {
      alert(t('folderDetail.selectPostmanFile'));
      return;
    }

    try {
      setIsImporting(true);
      const response = await folderApi.importPostmanScripts(folderId, {
        collection: importCollection,
        config: importConfig,
        ...(importTags.trim() && {tags: importTags.split(',').map(tag => tag.trim()).filter(Boolean)}),
      });
      alert(t('folderDetail.importPostmanSuccess', {count: response.count}));
      setShowImportModal(false);
      setImportCollection(null);
      setImportFileName('');
      setImportTags('');
      setImportConfig(DEFAULT_IMPORT_CONFIG);
      await fetchFolderData();
    } catch (err) {
      const apiError = err as {response?: {data?: {error?: string}}; message?: string};
      alert(apiError.response?.data?.error || apiError.message || t('folderDetail.importPostmanFailed'));
    } finally {
      setIsImporting(false);
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
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
              fontWeight: 'bold'
            }}
          >
            {t('folderDetail.importPostman')}
          </button>
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
                  width: '240px'
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
                      <Link
                        to={`/scripts/${script.scriptId}?edit=true`}
                        style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: '#2563eb',
                          color: 'white',
                          textDecoration: 'none',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          display: 'inline-block',
                          whiteSpace: 'nowrap'
                        }}
                        title={t('folderDetail.editScript')}
                      >
                        {t('folderDetail.editScript')}
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

      {showImportModal && (
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
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            maxWidth: '640px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={{marginTop: 0}}>{t('folderDetail.importPostman')}</h2>
            <p style={{margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#6b7280'}}>
              {t('folderDetail.importPostmanDescription')}
            </p>

            <div style={{marginBottom: '1rem'}}>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>
                {t('folderDetail.postmanCollectionFile')}
              </label>
              <input
                type="file"
                accept=".json,application/json"
                onChange={(e) => handleImportFile(e.target.files?.[0])}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  backgroundColor: 'white'
                }}
              />
              {importFileName && (
                <div style={{fontSize: '0.75rem', color: '#2563eb', marginTop: '0.25rem'}}>
                  {importFileName}
                </div>
              )}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              <div>
                <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>
                  {t('httpConfig.template')}
                </label>
                <select
                  value={importConfig.template}
                  onChange={(e) => handleImportTemplateChange(e.target.value as K6ScriptTemplate)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="constant-vus">{t('httpConfig.templateConstantVus')}</option>
                  <option value="constant-tps">{t('httpConfig.templateConstantTps')}</option>
                  <option value="ramp-up">{t('httpConfig.templateRampUp')}</option>
                </select>
              </div>

              {importConfig.template === 'constant-tps' ? (
                <>
                  <div>
                    <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>
                      {t('httpConfig.targetTps')}
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={importConfig.targetTps}
                      onChange={(e) => setImportConfig({...importConfig, targetTps: Number(e.target.value)})}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>
                      {t('httpConfig.duration')}
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={importConfig.duration}
                      onChange={(e) => setImportConfig({...importConfig, duration: Number(e.target.value)})}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>
                      {t('httpConfig.preAllocatedVUs')}
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={importConfig.preAllocatedVUs}
                      onChange={(e) => setImportConfig({...importConfig, preAllocatedVUs: Number(e.target.value)})}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>
                      {t('httpConfig.maxVUs')}
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={importConfig.maxVUs}
                      onChange={(e) => setImportConfig({...importConfig, maxVUs: Number(e.target.value)})}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                </>
              ) : importConfig.template === 'ramp-up' ? (
                <>
                  <div style={{gridColumn: '1 / -1'}}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '1rem',
                      marginBottom: '0.5rem'
                    }}>
                      <label style={{fontWeight: 'bold'}}>
                        {t('httpConfig.stages')}
                      </label>
                      <button
                        type="button"
                        onClick={addImportStage}
                        style={{
                          padding: '0.375rem 0.75rem',
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.875rem'
                        }}
                      >
                        {t('httpConfig.addStage')}
                      </button>
                    </div>
                    <div style={{display: 'grid', gap: '0.5rem'}}>
                      {importStages.map((stage, index) => (
                        <div
                          key={index}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) auto',
                            gap: '0.5rem',
                            alignItems: 'end'
                          }}
                        >
                          <div>
                            <label style={{display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', color: '#4b5563'}}>
                              {t('httpConfig.stageDuration')}
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={stage.duration}
                              onChange={(e) => updateImportStage(index, {duration: Number(e.target.value)})}
                              style={{
                                width: '100%',
                                padding: '0.5rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px'
                              }}
                            />
                          </div>
                          <div>
                            <label style={{display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', color: '#4b5563'}}>
                              {t('httpConfig.stageTarget')}
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={stage.target}
                              onChange={(e) => updateImportStage(index, {target: Number(e.target.value)})}
                              style={{
                                width: '100%',
                                padding: '0.5rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px'
                              }}
                            />
                          </div>
                          <button
                            type="button"
                            disabled={importStages.length <= 1}
                            onClick={() => removeImportStage(index)}
                            style={{
                              padding: '0.5rem 0.75rem',
                              backgroundColor: importStages.length <= 1 ? '#9ca3af' : '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: importStages.length <= 1 ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {t('httpConfig.remove')}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>
                      {t('httpConfig.vusers')}
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={importConfig.vusers}
                      onChange={(e) => setImportConfig({...importConfig, vusers: Number(e.target.value)})}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>
                      {t('httpConfig.duration')}
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={importConfig.duration}
                      onChange={(e) => setImportConfig({...importConfig, duration: Number(e.target.value)})}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                </>
              )}

              <div>
                <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>
                  {t('httpConfig.failureThreshold')}
                </label>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.01}
                  value={importConfig.failureThreshold}
                  onChange={(e) => setImportConfig({...importConfig, failureThreshold: Number(e.target.value)})}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px'
                  }}
                />
              </div>
            </div>

            <div style={{marginBottom: '1.5rem'}}>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>
                {t('newTest.tagsOptional')}
              </label>
              <input
                type="text"
                value={importTags}
                onChange={(e) => setImportTags(e.target.value)}
                placeholder={t('newTest.tagsPlaceholder')}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px'
                }}
              />
            </div>

            <div style={{display: 'flex', gap: '0.5rem', justifyContent: 'flex-end'}}>
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportCollection(null);
                  setImportFileName('');
                }}
                disabled={isImporting}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isImporting ? 'not-allowed' : 'pointer'
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleImportPostmanScripts}
                disabled={isImporting || !importCollection}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: isImporting || !importCollection ? '#9ca3af' : '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isImporting || !importCollection ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {isImporting ? t('folderDetail.importingPostman') : t('folderDetail.importPostmanSubmit')}
              </button>
            </div>
          </div>
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
