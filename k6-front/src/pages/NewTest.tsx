import {useEffect, useState} from 'react';
import {useLocation, useNavigate, useSearchParams} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {k6Api} from '../apis/testApi.ts';
import {folderApi} from '../apis/folderApi';
import type {Test} from '../types/test.ts';
import {HttpConfigForm, RecentTestsModal, ScriptEditor} from '../components/new-test';
import {Button, InfoBox} from '../components/common';
import {useScriptConfig} from '../hooks/useScriptConfig';
import {useScriptValidation} from '../hooks/useScriptValidation';
import {useTooltip} from '../hooks/useTooltip';

const DEFAULT_SCRIPT = `import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 1 },
  ],
  setupTimeout: '60s',
  teardownTimeout: '60s',
  noConnectionReuse: false,
  batch: 20,
  batchPerHost: 20,
  thresholds: {
    http_req_failed: [
      { threshold: "rate<0.05", abortOnFail: true },
    ],
  },
};

export default function () {
  const res = http.get('https://test.k6.io');

  check(res, {
    'status is 2xx': (r) => r.status >= 200 && r.status < 300
  });
}
`;

export const NewTest = () => {
  const {t} = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [saveAsScript, setSaveAsScript] = useState(searchParams.get('saveScript') === 'true');
  const [scriptId, setScriptId] = useState('');
  const [scriptDescription, setScriptDescription] = useState('');
  const [scriptTags, setScriptTags] = useState('');
  const [folderId, setFolderId] = useState(searchParams.get('folderId') || '');
  const [folders, setFolders] = useState<Array<{ folderId: string; name: string }>>([]);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDescription, setNewFolderDescription] = useState('');

  const {
    script,
    httpConfig,
    isDynamicScript,
    setScript,
    setHttpConfig,
    setIsDynamicScript,
    handleConfigChange,
    handleScriptChange,
    updateConfigFromScript
  } = useScriptConfig(DEFAULT_SCRIPT);

  const {syntaxError, validate} = useScriptValidation();
  const showTooltip = useTooltip(300, 5000);

  const [showRecentTests, setShowRecentTests] = useState(false);
  const [recentTests, setRecentTests] = useState<Test[]>([]);
  const [loadingRecentTests, setLoadingRecentTests] = useState(false);

  const [headerKey, setHeaderKey] = useState('');
  const [headerValue, setHeaderValue] = useState('');

  // Load copied script from location state
  useEffect(() => {
    const state = location.state as { copiedScript?: {
      script: string;
      config?: any;
      description?: string;
      tags?: string[];
      folderId?: string;
      isDynamic?: boolean;
    }} | null;

    if (state?.copiedScript) {
      const { script: copiedScriptContent, config, description, tags, folderId: copiedFolderId, isDynamic } = state.copiedScript;

      setScript(copiedScriptContent);
      setSaveAsScript(true);

      // 동적 스크립트 여부 설정
      if (isDynamic !== undefined) {
        setIsDynamicScript(isDynamic);
      }

      if (description) {
        setScriptDescription(description);
      }

      if (tags && tags.length > 0) {
        setScriptTags(tags.join(', '));
      }

      if (copiedFolderId) {
        setFolderId(copiedFolderId);
      }

      if (config) {
        setHttpConfig({
          url: config.url || '',
          method: config.method || 'GET',
          headers: config.headers || {},
          body: config.body || '',
          vusers: config.vusers || 1,
          duration: config.duration || 10,
          rampUp: config.rampUp || 0,
          name: config.name || '',
          failureThreshold: config.failureThreshold ?? 0.05
        });
      } else {
        updateConfigFromScript(copiedScriptContent);
      }

      // Clear the state to prevent re-applying on navigation
      window.history.replaceState({}, document.title);
    }
  }, [location.state, setScript, setHttpConfig, setIsDynamicScript, updateConfigFromScript]);

  // Load rerun script from session storage
  useEffect(() => {
    const rerunScript = sessionStorage.getItem('rerunScript');
    const rerunConfigStr = sessionStorage.getItem('rerunConfig');

    if (rerunScript) {
      setScript(rerunScript);
      sessionStorage.removeItem('rerunScript');

      if (rerunConfigStr) {
        try {
          const rerunConfig = JSON.parse(rerunConfigStr);
          setHttpConfig({
            url: rerunConfig.url || '',
            method: rerunConfig.method || 'GET',
            headers: rerunConfig.headers || {},
            body: rerunConfig.body || '',
            vusers: rerunConfig.vusers || 1,
            duration: rerunConfig.duration || 10,
            rampUp: rerunConfig.rampUp || 0,
            name: rerunConfig.name || '',
            failureThreshold: rerunConfig.failureThreshold ?? 0.05
          });
          sessionStorage.removeItem('rerunConfig');
        } catch (err) {
          console.error('Failed to parse rerun config:', err);
        }
      } else {
        updateConfigFromScript(rerunScript);
      }
    }
  }, [setScript, setHttpConfig, updateConfigFromScript]);

  // Validate initial script
  useEffect(() => {
    if (script) {
      validate(script);
    }
  }, []);

  // Load folders when saveAsScript is enabled
  useEffect(() => {
    if (saveAsScript) {
      const loadFolders = async () => {
        try {
          const folderList = await folderApi.getFolders({sortBy: 'name', sortOrder: 'asc'});
          setFolders(folderList);
        } catch (err) {
          console.error('Failed to load folders:', err);
        }
      };
      loadFolders();
    }
  }, [saveAsScript]);

  const fetchRecentTests = async () => {
    setLoadingRecentTests(true);
    try {
      const data = await k6Api.getTests(null, 5);
      const testsWithScripts = data.tests.filter(test => test.script).slice(0, 5);
      setRecentTests(testsWithScripts);
    } catch (err) {
      console.error('Failed to fetch recent tests:', err);
    } finally {
      setLoadingRecentTests(false);
    }
  };

  const handleLoadRecentTest = async (testId: string) => {
    try {
      const test = await k6Api.getTest(testId);
      if (test.script) {
        setScript(test.script);
        updateConfigFromScript(test.script);
        validate(test.script);
        setShowRecentTests(false);
        window.scrollTo({top: 0, behavior: 'smooth'});
      }
    } catch (err) {
      alert(t('newTest.failedToLoadScript'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate(script)) {
      setError(t('newTest.syntaxError'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let savedScriptId = scriptId;

      if (saveAsScript) {
        if (!folderId) {
          setError(t('newTest.folderRequired'));
          setLoading(false);
          return;
        }

        const trimmedScriptId = scriptId.trim();
        const trimmedDescription = scriptDescription.trim();
        const scriptName = httpConfig.name || `Script ${new Date().toLocaleString()}`;

        const savedScript = await folderApi.createScript(folderId, {
          ...(trimmedScriptId && {scriptId: trimmedScriptId}),
          name: scriptName,
          script: script,
          config: httpConfig,
          ...(trimmedDescription && {description: trimmedDescription}),
          ...(scriptTags && {tags: scriptTags.split(',').map(t => t.trim()).filter(t => t)})
        });
        savedScriptId = savedScript.scriptId;
      }

      if (saveAsScript) {
        navigate(`/scripts/${savedScriptId}`);
      } else {
        const result = await k6Api.runTest(script, {
          name: httpConfig.name,
          config: httpConfig
        });
        navigate(`/tests/${result.testId}`);
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error || err?.message || 'Failed to start test';
      setError(errorMessage);
      window.scrollTo({top: 0, behavior: 'smooth'});
    } finally {
      setLoading(false);
    }
  };

  const handleAddHeader = () => {
    if (headerKey && headerValue) {
      const newHeaders = {...httpConfig.headers, [headerKey]: headerValue};
      handleConfigChange({headers: newHeaders});
      setHeaderKey('');
      setHeaderValue('');
    }
  };

  const handleRemoveHeader = (key: string) => {
    const {[key]: _, ...rest} = httpConfig.headers || {};
    handleConfigChange({headers: rest});
  };

  const handleScriptChangeWithValidation = (newScript: string) => {
    handleScriptChange(newScript);
    validate(newScript);
  };

  const handleCreateNewFolder = async () => {
    if (!newFolderName.trim()) {
      alert(t('newTest.folderNameRequired'));
      return;
    }

    try {
      const newFolder = await folderApi.createFolder({
        name: newFolderName,
        description: newFolderDescription,
      });
      setFolders([...folders, {folderId: newFolder.folderId, name: newFolder.name}]);
      setFolderId(newFolder.folderId);
      setShowFolderModal(false);
      setNewFolderName('');
      setNewFolderDescription('');
    } catch (err) {
      alert(err instanceof Error ? err.message : t('newTest.failedToCreateFolder'));
    }
  };

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <h1 style={{margin: 0, fontSize: 'clamp(1.5rem, 5vw, 2rem)'}}>{t('newTest.title')}</h1>
        <div style={{position: 'relative'}}>
          <Button
            variant="purple"
            onClick={() => {
              setShowRecentTests(true);
              fetchRecentTests();
            }}
            title={t('newTest.recentTestsTooltip')}
          >
            📋 {t('newTest.recentTests')}
          </Button>
          {showTooltip && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 0.5rem)',
              right: 0,
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '0.5rem 0.75rem',
              borderRadius: '4px',
              fontSize: '0.75rem',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
              zIndex: 10,
              pointerEvents: 'none',
              animation: 'fadeIn 0.3s ease-in'
            }}>
              💡 {t('newTest.quickLoadTooltip')}
              <div style={{
                position: 'absolute',
                top: '-4px',
                right: '1rem',
                width: 0,
                height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderBottom: '6px solid #3b82f6'
              }}/>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <InfoBox variant="error">
            {error}
          </InfoBox>
        )}

        {/* 테스트 이름 - 공통 필드 */}
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '1.5rem'
        }}>
          <div>
            <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '1rem'}}>
              {t('httpConfig.testName')}
            </label>
            <input
              type="text"
              value={httpConfig.name}
              onChange={(e) => handleConfigChange({name: e.target.value.slice(0, 50)})}
              placeholder={t('httpConfig.testNamePlaceholder')}
              maxLength={50}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            />
            <div style={{fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem'}}>
              {httpConfig.name?.length || 0}/50 characters
            </div>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
          gap: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <HttpConfigForm
            config={httpConfig}
            isDynamic={isDynamicScript}
            headerKey={headerKey}
            headerValue={headerValue}
            onConfigChange={handleConfigChange}
            onHeaderKeyChange={setHeaderKey}
            onHeaderValueChange={setHeaderValue}
            onAddHeader={handleAddHeader}
            onRemoveHeader={handleRemoveHeader}
          />

          <ScriptEditor
            script={script}
            syntaxError={syntaxError}
            onScriptChange={handleScriptChangeWithValidation}
          />
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '1.5rem'
        }}>
          <div style={{marginBottom: '1rem'}}>
            <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
              <input
                type="checkbox"
                checked={saveAsScript}
                onChange={(e) => setSaveAsScript(e.target.checked)}
                style={{width: '18px', height: '18px'}}
              />
              <span style={{fontWeight: 'bold'}}>💾 {t('newTest.saveAsScript')}</span>
            </label>
            <p style={{margin: '0.5rem 0 0 1.75rem', fontSize: '0.875rem', color: '#6b7280'}}>
              {t('newTest.saveAsScriptDescription')}
            </p>
          </div>

          {saveAsScript && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#f9fafb',
              borderRadius: '4px',
              borderLeft: '4px solid #10b981'
            }}>
              <div>
                <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 'bold'}}>
                  {t('newTest.folder')} <span style={{color: '#ef4444'}}>{t('newTest.required')}</span>
                </label>
                <div style={{display: 'flex', gap: '0.5rem'}}>
                  <select
                    value={folderId}
                    onChange={(e) => setFolderId(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                      backgroundColor: 'white'
                    }}
                  >
                    <option value="">{t('newTest.selectFolder')}</option>
                    {folders.map(folder => (
                      <option key={folder.folderId} value={folder.folderId}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowFolderModal(true)}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {t('newTest.newFolder')}
                  </button>
                </div>
                <p style={{margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#6b7280'}}>
                  {t('newTest.scriptsMustBeInFolder')}
                </p>
              </div>
              <div style={{marginBottom: '1rem'}}>
                <label style={{display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 'bold'}}>
                  {t('newTest.scriptId')}
                </label>
                <input
                  type="text"
                  value={scriptId}
                  onChange={(e) => setScriptId(e.target.value)}
                  placeholder={t('newTest.scriptIdPlaceholder')}
                  pattern="^[a-z0-9-]*$"
                  title={t('newTest.scriptIdPattern')}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '0.875rem'
                  }}
                />
                <p style={{margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#6b7280'}}>
                  {t('newTest.scriptIdHelper')}
                </p>
              </div>

              <div style={{marginBottom: '1rem'}}>
                <label style={{display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 'bold'}}>
                  {t('newTest.descriptionOptional')}
                </label>
                <textarea
                  value={scriptDescription}
                  onChange={(e) => setScriptDescription(e.target.value)}
                  placeholder={t('newTest.descriptionPlaceholder')}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div style={{marginBottom: '1rem'}}>
                <label style={{display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 'bold'}}>
                  {t('newTest.tagsOptional')}
                </label>
                <input
                  type="text"
                  value={scriptTags}
                  onChange={(e) => setScriptTags(e.target.value)}
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
          )}

          {showFolderModal && (
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
                <h2 style={{marginTop: 0}}>{t('newTest.createNewFolder')}</h2>
                <div style={{marginBottom: '1rem'}}>
                  <label style={{display: 'block', marginBottom: '0.5rem'}}>{t('newTest.folderName')}</label>
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '1rem'
                    }}
                    placeholder={t('newTest.folderNamePlaceholder')}
                  />
                </div>
                <div style={{marginBottom: '1rem'}}>
                  <label style={{display: 'block', marginBottom: '0.5rem'}}>{t('newTest.folderDescription')}</label>
                  <textarea
                    value={newFolderDescription}
                    onChange={(e) => setNewFolderDescription(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '1rem',
                      minHeight: '80px'
                    }}
                    placeholder={t('newTest.folderDescriptionPlaceholder')}
                  />
                </div>
                <div style={{display: 'flex', gap: '0.5rem', justifyContent: 'flex-end'}}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowFolderModal(false);
                      setNewFolderName('');
                      setNewFolderDescription('');
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
                    onClick={handleCreateNewFolder}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    {t('common.create')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <Button
            type="submit"
            disabled={loading}
            style={{
              padding: '1rem 2rem',
              fontSize: 'clamp(1rem, 3vw, 1.125rem)',
              width: '100%',
              maxWidth: '300px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}
          >
            {loading ? `🚀 ${t('newTest.startingTest')}` : saveAsScript ? `💾 ${t('newTest.saveScript')}` : `🚀 ${t('newTest.startTest')}`}
          </Button>
          <div style={{marginTop: '0.75rem', fontSize: 'clamp(0.75rem, 2vw, 0.875rem)', color: '#6b7280'}}>
            {saveAsScript ? t('newTest.saveScriptDescription') : t('newTest.startTestDescription')}
          </div>
        </div>
      </form>

      <RecentTestsModal
        show={showRecentTests}
        tests={recentTests}
        loading={loadingRecentTests}
        onClose={() => setShowRecentTests(false)}
        onLoadTest={handleLoadRecentTest}
      />
    </div>
  );
};
