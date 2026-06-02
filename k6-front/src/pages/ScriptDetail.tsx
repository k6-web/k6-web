import {useCallback, useEffect, useState} from 'react';
import {Link, useNavigate, useParams, useSearchParams} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {folderApi} from '../apis/folderApi';
import {scriptApi} from '../apis/scriptApi';
import type {Script, TestComparison} from '../types/script';
import type {Test} from '../types/test';
import type {K6ScriptTemplate, K6TestConfig} from '../types/k6';
import {MetricsTrendChart} from '../components/MetricsTrendChart';
import {Button, TestNameModal} from '../components/common';
import {HttpConfigForm, ScriptEditor} from '../components/new-test';
import {useScriptValidation} from '../hooks/useScriptValidation';
import {
  curlToHttpConfig,
  getTemplateDefaults,
  hasDynamicParameters,
  httpConfigToScript,
  postmanCollectionToScript,
  scriptToHttpConfig,
  updateScriptOptionsFromConfig
} from '../utils/scriptUtils';
import {formatElapsedDuration} from '../utils/formatUtils';

const DEFAULT_EDIT_CONFIG: K6TestConfig = {
  url: '',
  method: 'GET',
  headers: {},
  body: '',
  vusers: 1,
  duration: 10,
  rampUp: 0,
  stages: [
    {duration: 30, target: 10},
    {duration: 60, target: 10},
    {duration: 30, target: 0}
  ],
  targetTps: 10,
  preAllocatedVUs: 10,
  maxVUs: 20,
  name: '',
  failureThreshold: 0.05,
  template: 'constant-vus'
};

const dynamicLockedConfigKeys = new Set<keyof K6TestConfig>(['url', 'method', 'headers']);
const optionConfigKeys = new Set<keyof K6TestConfig>([
  'vusers',
  'duration',
  'rampUp',
  'stages',
  'targetTps',
  'preAllocatedVUs',
  'maxVUs',
  'failureThreshold',
  'template'
]);

export const ScriptDetail = () => {
  const {t} = useTranslation();
  const {scriptId} = useParams<{ scriptId: string }>();
  const [searchParams] = useSearchParams();
  const editParam = searchParams.get('edit');
  const navigate = useNavigate();
  const [script, setScript] = useState<Script | null>(null);
  const [history, setHistory] = useState<Test[]>([]);
  const [comparison, setComparison] = useState<TestComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editScript, setEditScript] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editConfig, setEditConfig] = useState<K6TestConfig>(DEFAULT_EDIT_CONFIG);
  const [isDynamicEditScript, setIsDynamicEditScript] = useState(false);
  const [headerKey, setHeaderKey] = useState('');
  const [headerValue, setHeaderValue] = useState('');
  const {syntaxError, validate} = useScriptValidation();

  const initializeEditState = useCallback((scriptData: Script) => {
    const parsed = scriptToHttpConfig(scriptData.script);
    const nextConfig = {
      ...DEFAULT_EDIT_CONFIG,
      ...scriptData.config,
      ...parsed.config,
    };
    setEditScript(scriptData.script);
    setEditDescription(scriptData.description || '');
    setEditTags(scriptData.tags?.join(', ') || '');
    setEditConfig(nextConfig);
    setIsDynamicEditScript(parsed.isDynamic);
    validate(scriptData.script);
  }, [validate]);

  useEffect(() => {
    if (!scriptId) return;
    const shouldStartEditing = editParam === 'true';

    const fetchData = async () => {
      try {
        setLoading(true);
        const [scriptData, historyData] = await Promise.all([
          scriptApi.getScript(scriptId),
          scriptApi.getScriptHistory(scriptId, 50)
        ]);
        setScript(scriptData);
        setHistory(historyData.tests);
        if (shouldStartEditing) {
          initializeEditState(scriptData);
          setIsEditing(true);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch script');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [scriptId, editParam, initializeEditState]);

  const handleRun = () => {
    if (!scriptId) return;
    setIsRunModalOpen(true);
  };

  const handleRunConfirm = async (name?: string, scheduledAt?: number) => {
    if (!scriptId) return;
    try {
      setIsRunning(true);
      const result = await scriptApi.runScript(scriptId, {
        ...(name && {name}),
        ...(scheduledAt && {scheduledAt})
      });
      navigate(`/tests/${result.testId}`);
    } catch {
      alert(t('folderDetail.failedToRunScript'));
    } finally {
      setIsRunning(false);
    }
  };

  const handleShare = () => {
    const url = window.location.href;

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(() => {
        alert(t('scriptDetail.copiedToClipboard'));
      }).catch(() => {
        fallbackCopy(url);
      });
    } else {
      fallbackCopy(url);
    }
  };

  const fallbackCopy = (text: string) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert(t('scriptDetail.copiedToClipboard'));
    } catch {
      alert(t('scriptDetail.failedToShare'));
    }
  };

  const handleCopy = () => {
    if (!script) return;

    // 동적 파라미터 체크
    const isDynamic = hasDynamicParameters(script.script);

    // NewTest 페이지로 이동하면서 스크립트 내용을 state로 전달
    navigate('/new-test', {
      state: {
        copiedScript: {
          script: script.script,
          config: script.config,
          description: script.description,
          tags: script.tags,
          folderId: script.folderId,
          isDynamic,
        }
      }
    });
  };

  const handleDelete = async () => {
    if (!scriptId || !script) return;
    if (!confirm(t('scriptDetail.confirmDelete'))) return;

    try {
      await scriptApi.deleteScript(scriptId);
      alert(t('scriptDetail.scriptDeleted'));
      // 폴더가 있으면 폴더 페이지로, 없으면 스크립트 목록 페이지로 이동
      if (script.folderId) {
        navigate(`/folders/${script.folderId}`);
      } else {
        navigate('/scripts');
      }
    } catch {
      alert(t('scriptDetail.failedToDelete'));
    }
  };

  const startEditing = () => {
    if (!script) return;
    initializeEditState(script);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditScript('');
    setEditDescription('');
    setEditTags('');
    setHeaderKey('');
    setHeaderValue('');
  };

  const setNextEditScript = (nextScript: string) => {
    setEditScript(nextScript);
    const parsed = scriptToHttpConfig(nextScript);
    setIsDynamicEditScript(parsed.isDynamic);
    setEditConfig(prev => ({
      ...prev,
      ...parsed.config,
    }));
    validate(nextScript);
  };

  const handleEditConfigChange = (changes: Partial<K6TestConfig>) => {
    const allowedChanges = isDynamicEditScript
      ? Object.fromEntries(
        Object.entries(changes).filter(([key]) => !dynamicLockedConfigKeys.has(key as keyof K6TestConfig))
      ) as Partial<K6TestConfig>
      : changes;

    if (Object.keys(allowedChanges).length === 0) return;

    const nextConfig = {...editConfig, ...allowedChanges};
    setEditConfig(nextConfig);

    const changedKeys = Object.keys(allowedChanges) as Array<keyof K6TestConfig>;
    const onlyOptionsChanged = changedKeys.every(key => key === 'name' || optionConfigKeys.has(key));
    const nextScript = onlyOptionsChanged
      ? updateScriptOptionsFromConfig(editScript, nextConfig)
      : httpConfigToScript(nextConfig);

    setEditScript(nextScript);
    setIsDynamicEditScript(hasDynamicParameters(nextScript));
    validate(nextScript);
  };

  const handleTemplateChange = (template: K6ScriptTemplate) => {
    const nextConfig = getTemplateDefaults(template, editConfig);
    const nextScript = updateScriptOptionsFromConfig(editScript, nextConfig);
    setEditConfig(nextConfig);
    setEditScript(nextScript);
    validate(nextScript);
  };

  const handleAddHeader = () => {
    if (isDynamicEditScript || !headerKey || !headerValue) return;
    handleEditConfigChange({headers: {...editConfig.headers, [headerKey]: headerValue}});
    setHeaderKey('');
    setHeaderValue('');
  };

  const handleRemoveHeader = (key: string) => {
    if (isDynamicEditScript) return;
    const headers = Object.fromEntries(
      Object.entries(editConfig.headers || {}).filter(([headerName]) => headerName !== key)
    );
    handleEditConfigChange({headers});
  };

  const handleConvertCurl = (curlCommand: string) => {
    if (isDynamicEditScript) return;

    try {
      const nextConfig = curlToHttpConfig(curlCommand, editConfig);
      const nextScript = httpConfigToScript(nextConfig);
      setEditConfig(nextConfig);
      setEditScript(nextScript);
      setIsDynamicEditScript(hasDynamicParameters(nextScript));
      validate(nextScript);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to convert curl command');
    }
  };

  const handleImportPostman = async (collection: unknown) => {
    if (isDynamicEditScript) return;

    try {
      let nextScript: string;
      try {
        nextScript = updateScriptOptionsFromConfig(await scriptApi.convertPostman(collection), editConfig);
      } catch {
        nextScript = postmanCollectionToScript(collection as Parameters<typeof postmanCollectionToScript>[0], editConfig);
      }
      const parsed = scriptToHttpConfig(nextScript);
      setEditConfig({...editConfig, ...parsed.config});
      setEditScript(nextScript);
      setIsDynamicEditScript(parsed.isDynamic);
      validate(nextScript);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to convert Postman collection');
    }
  };

  const handleSaveEdit = async () => {
    if (!script || !script.folderId) return;

    if (!editScript.trim()) {
      alert(t('scriptDetail.scriptRequired'));
      return;
    }

    if (!validate(editScript)) {
      alert(syntaxError || t('scriptEditor.invalidSyntax'));
      return;
    }

    try {
      setIsSaving(true);
      const updated = await folderApi.updateScript(script.folderId, script.scriptId, {
        script: editScript,
        config: script.config,
        description: editDescription.trim(),
        tags: editTags.split(',').map(tag => tag.trim()).filter(Boolean),
      });
      setScript(updated);
      setIsEditing(false);
      alert(t('scriptDetail.scriptUpdated'));
    } catch (err) {
      const apiError = err as {response?: {data?: {error?: string}}; message?: string};
      alert(apiError.response?.data?.error || apiError.message || t('scriptDetail.failedToUpdate'));
    } finally {
      setIsSaving(false);
    }
  };

  const extractMetrics = (test: Test) => {
    const summary = test.summary;
    if (!summary?.metrics) {
      return {tps: 0, p90: 0, p95: 0, errorRate: 0, avg: 0};
    }

    const tps = summary.metrics.http_reqs?.rate || 0;
    const p90 = summary.metrics.http_req_duration?.['p(90)'] || 0;
    const p95 = summary.metrics.http_req_duration?.['p(95)'] || 0;
    const errorRate = summary.metrics.http_req_failed?.value || 0;
    const avg = summary.metrics.http_req_duration?.avg || 0;

    return {tps, p95, p90, errorRate, avg};
  };

  if (loading) return <div>{t('common.loading')}</div>;
  if (error) return <div style={{color: 'red'}}>{t('common.error')}: {error}</div>;
  if (!script) return <div>{t('testList.noScriptAvailable')}</div>;

  return (
    <div>
      {script.folderId && (
        <Link to={`/folders/${script.folderId}`}
              style={{color: '#3b82f6', textDecoration: 'none', marginBottom: '1rem', display: 'inline-block'}}>
          {t('scriptDetail.backToFolder')}
        </Link>
      )}

      <div style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '1rem'
      }}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem'}}>
          <div>
            <h1 style={{margin: '0 0 0.5rem 0'}}>{script.scriptId}</h1>
            <p style={{margin: 0, color: '#6b7280'}}>{script.description || 'No description'}</p>
          </div>
          <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
            <Button
              variant="purple"
              onClick={handleShare}
              style={{fontSize: 'clamp(0.75rem, 2vw, 0.875rem)'}}
            >
              🔗 {t('scriptDetail.shareScript')}
            </Button>
            <Button
              variant="primary"
              onClick={handleCopy}
              style={{fontSize: 'clamp(0.75rem, 2vw, 0.875rem)'}}
            >
              📋 {t('scriptDetail.copyScript')}
            </Button>
            <button
              onClick={startEditing}
              disabled={!script.folderId}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: script.folderId ? '#2563eb' : '#9ca3af',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: script.folderId ? 'pointer' : 'not-allowed',
                fontWeight: 'bold',
                fontSize: 'clamp(0.75rem, 2vw, 0.875rem)'
              }}
            >
              {t('scriptDetail.editScript')}
            </button>
            <button
              onClick={handleRun}
              disabled={isRunning}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: isRunning ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isRunning ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: 'clamp(0.75rem, 2vw, 0.875rem)'
              }}
            >
              {isRunning ? t('newTest.startingTest') : t('scriptDetail.runTest')}
            </button>
            <button
              onClick={handleDelete}
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
              🗑️ {t('scriptDetail.deleteScript')}
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
          {script.folderId && (
            <div style={{marginBottom: '0.5rem'}}>
              <span style={{color: '#6b7280'}}>{t('scriptDetail.folder')}: </span>
              <Link
                to={`/folders/${script.folderId}`}
                style={{color: '#8b5cf6', textDecoration: 'none', fontWeight: '600'}}
              >
                {script.folderId}
              </Link>
            </div>
          )}
          <div>{t('scriptDetail.createdAt')}: {new Date(script.createdAt).toLocaleString()}</div>
          <div>{t('scriptDetail.updatedAt')}: {new Date(script.updatedAt).toLocaleString()}</div>
        </div>
      </div>

      <div style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '1rem'
      }}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem'}}>
          <h2>{t('scriptDetail.script')}</h2>
          {isEditing && (
            <div style={{display: 'flex', gap: '0.5rem'}}>
              <button
                type="button"
                onClick={cancelEditing}
                disabled={isSaving}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isSaving ? 'not-allowed' : 'pointer'
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSaving}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: isSaving ? '#9ca3af' : '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {isSaving ? t('common.loading') : t('common.save')}
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              <div>
                <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>
                  {t('scriptDetail.description')}
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
              <div>
                <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>
                  {t('scriptDetail.tags')}
                </label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder={t('newTest.tagsPlaceholder')}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
              gap: '1.5rem'
            }}>
              <HttpConfigForm
                config={editConfig}
                isDynamic={isDynamicEditScript}
                headerKey={headerKey}
                headerValue={headerValue}
                onConfigChange={handleEditConfigChange}
                onTemplateChange={handleTemplateChange}
                onConvertCurl={handleConvertCurl}
                onImportPostman={handleImportPostman}
                onHeaderKeyChange={setHeaderKey}
                onHeaderValueChange={setHeaderValue}
                onAddHeader={handleAddHeader}
                onRemoveHeader={handleRemoveHeader}
              />
              <ScriptEditor
                script={editScript}
                syntaxError={syntaxError}
                embedded
                onScriptChange={setNextEditScript}
              />
            </div>
          </div>
        ) : (
          <pre style={{
            backgroundColor: '#f3f4f6',
            padding: '1rem',
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '0.875rem'
          }}>
            {script.script}
          </pre>
        )}
      </div>

      {history.length > 0 && (
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '1rem'
        }}>
          <h2 style={{marginBottom: '1rem'}}>{t('metrics.performanceOverTime')}</h2>
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
          <h2 style={{margin: 0}}>{t('testList.title')} ({history.length})</h2>
        </div>

        {history.length === 0 ? (
          <p style={{color: '#6b7280'}}>{t('folderDetail.noScripts')}</p>
        ) : (
          <div style={{overflowX: 'auto'}}>
            <table style={{width: '100%', borderCollapse: 'collapse'}}>
              <thead>
              <tr style={{backgroundColor: '#f3f4f6'}}>
                <th style={{padding: '0.5rem', textAlign: 'left'}}>{t('common.name')} / {t('testDetail.testId')}</th>
                <th style={{padding: '0.5rem', textAlign: 'left'}}>{t('common.status')}</th>
                <th style={{padding: '0.5rem', textAlign: 'right'}}>RPS</th>
                <th style={{padding: '0.5rem', textAlign: 'right'}}>Avg (ms)</th>
                <th style={{padding: '0.5rem', textAlign: 'right'}}>P90 (ms)</th>
                <th style={{padding: '0.5rem', textAlign: 'right'}}>P95 (ms)</th>
                <th style={{padding: '0.5rem', textAlign: 'right'}}>Error %</th>
                <th style={{padding: '0.5rem', textAlign: 'left'}}>{t('testDetail.startTime')}</th>
                <th style={{padding: '0.5rem', textAlign: 'left'}}>{t('testDetail.duration')}</th>
                <th style={{padding: '0.5rem', textAlign: 'left'}}>{t('common.actions')}</th>
              </tr>
              </thead>
              <tbody>
              {history.map(test => {
                const metrics = extractMetrics(test);
                return (
                  <tr key={test.testId} style={{borderBottom: '1px solid #e5e7eb'}}>
                    <td style={{padding: '0.5rem'}}>
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
                      {metrics.avg > 0 ? metrics.avg.toFixed(2) : '-'}
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
                    <td style={{padding: '0.5rem', fontFamily: 'monospace'}}>
                      {test.endTime && test.startTime ? formatElapsedDuration(test.endTime - test.startTime) : '-'}
                    </td>
                    <td style={{padding: '0.5rem'}}>
                      <Link
                        to={`/tests/${test.testId}`}
                        style={{color: '#3b82f6', textDecoration: 'none'}}
                      >
                        {t('testList.viewDetails')}
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
            <h2 style={{margin: 0}}>{t('testDetail.summary')}</h2>
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
              {t('common.close')}
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

      {isRunModalOpen && (
        <TestNameModal
          initialName={script.config?.name || ''}
          loading={isRunning}
          onCancel={() => setIsRunModalOpen(false)}
          onConfirm={handleRunConfirm}
        />
      )}
    </div>
  );
};
