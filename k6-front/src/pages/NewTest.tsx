import {useEffect, useState} from 'react';
import {useLocation, useNavigate, useSearchParams} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {k6Api} from '../apis/testApi.ts';
import {folderApi} from '../apis/folderApi';
import {scriptApi} from '../apis/scriptApi';
import type {Test} from '../types/test.ts';
import {HttpConfigForm, RecentTestsModal, ScriptEditor} from '../components/new-test';
import {
  Button,
  ConfirmDialog,
  Field,
  InfoBox,
  Modal,
  PageHeader,
  TestNameModal,
  useToast
} from '../components/common';
import {useScriptConfig} from '../hooks/useScriptConfig';
import {useScriptValidation} from '../hooks/useScriptValidation';
import {
  curlToHttpConfig,
  getTemplateDefaults,
  hasDynamicParameters,
  httpConfigToScript,
  normalizeTestConfig,
  postmanCollectionToScript,
  updateScriptOptionsFromConfig
} from '../utils/scriptUtils';
import type {K6ScriptTemplate, K6TestConfig} from '../types/k6';
import styles from './NewTest.module.css';

const DEFAULT_SCRIPT = `import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    test: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
    },
  },
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

type ApiError = {
  response?: {
    data?: {
      error?: string;
    };
  };
  message?: string;
};

const getErrorMessage = (err: unknown, fallback: string) => {
  const apiError = err as ApiError;
  return apiError.response?.data?.error || apiError.message || fallback;
};

const dynamicLockedConfigKeys = new Set<keyof K6TestConfig>(['url', 'method', 'headers']);

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
  const [folderModalError, setFolderModalError] = useState<string | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);

  const {
    script,
    httpConfig,
    isDynamicScript,
    setScript,
    setHttpConfig,
    setIsDynamicScript,
    handleConfigChange,
    handleScriptChange,
    updateConfigFromScript,
    hasPendingOverwrite,
    confirmPendingOverwrite,
    cancelPendingOverwrite
  } = useScriptConfig(DEFAULT_SCRIPT);

  const {syntaxError, validate} = useScriptValidation();
  const toast = useToast();

  const [showRecentTests, setShowRecentTests] = useState(false);
  const [recentTests, setRecentTests] = useState<Test[]>([]);
  const [loadingRecentTests, setLoadingRecentTests] = useState(false);

  const [showTestNameModal, setShowTestNameModal] = useState(false);

  const [headerKey, setHeaderKey] = useState('');
  const [headerValue, setHeaderValue] = useState('');

  // Load copied script from location state
  useEffect(() => {
    const state = location.state as {
      copiedScript?: {
        script: string;
        config?: Partial<K6TestConfig>;
        description?: string;
        tags?: string[];
        folderId?: string;
        isDynamic?: boolean;
        saveAsScript?: boolean;
      }
    } | null;

    if (state?.copiedScript) {
      const {
        script: copiedScriptContent,
        config,
        description,
        tags,
        folderId: copiedFolderId,
        isDynamic,
        saveAsScript: shouldSaveAsScript
      } = state.copiedScript;

      setScript(copiedScriptContent);
      setSaveAsScript(shouldSaveAsScript ?? true);

      setIsDynamicScript(isDynamic ?? hasDynamicParameters(copiedScriptContent));

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
        setHttpConfig(normalizeTestConfig(config));
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
      setIsDynamicScript(hasDynamicParameters(rerunScript));
      sessionStorage.removeItem('rerunScript');

      if (rerunConfigStr) {
        try {
          setHttpConfig(normalizeTestConfig(JSON.parse(rerunConfigStr)));
          sessionStorage.removeItem('rerunConfig');
        } catch (err) {
          console.error('Failed to parse rerun config:', err);
        }
      } else {
        updateConfigFromScript(rerunScript);
      }
    }
  }, [setScript, setHttpConfig, setIsDynamicScript, updateConfigFromScript]);

  // Validate whenever the script changes, including regenerations triggered by
  // Quick Start edits that don't route through the editor's onChange.
  useEffect(() => {
    if (script) {
      validate(script);
    }
  }, [script, validate]);

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
        setIsDynamicScript(hasDynamicParameters(test.script));
        if (test.config) {
          setHttpConfig(normalizeTestConfig(test.config));
        } else {
          updateConfigFromScript(test.script);
        }
        setShowRecentTests(false);
        window.scrollTo({top: 0, behavior: 'smooth'});
      }
    } catch {
      toast.error(t('newTest.failedToLoadScript'));
    }
  };

  const handleButtonClick = (shouldRunTest: boolean) => {
    // Only ask for a test name when a run actually follows.
    if (!saveAsScript || shouldRunTest) {
      setShowTestNameModal(true);
    } else {
      handleSubmitWithAction(shouldRunTest);
    }
  };

  const handleTestNameConfirm = (name?: string, scheduledAt?: number) => {
    setShowTestNameModal(false);
    handleSubmitWithAction(true, name, scheduledAt);
  };

  const handleSubmitWithAction = async (shouldRunTest: boolean, testName?: string, scheduledAt?: number) => {
    if (!validate(script)) {
      setError(t('newTest.syntaxError'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let savedScriptId: string | undefined;

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

        // If not running test after save, navigate to script detail page
        if (!shouldRunTest) {
          navigate(`/scripts/${savedScriptId}`);
          return;
        }
      }

      // Run test after saving script (or directly if not saving)
      const result = await k6Api.runTest(script, {
        name: testName || httpConfig.name,
        config: httpConfig,
        ...(savedScriptId && {scriptId: savedScriptId}),
        ...(scheduledAt && {scheduledAt})
      });
      navigate(`/tests/${result.testId}`);
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err, 'Failed to start test');
      setError(errorMessage);
      window.scrollTo({top: 0, behavior: 'smooth'});
    } finally {
      setLoading(false);
    }
  };

  const handleAddHeader = () => {
    if (isDynamicScript) return;

    if (headerKey && headerValue) {
      const newHeaders = {...httpConfig.headers, [headerKey]: headerValue};
      handleConfigChange({headers: newHeaders});
      setHeaderKey('');
      setHeaderValue('');
    }
  };

  const handleRemoveHeader = (key: string) => {
    if (isDynamicScript) return;

    const rest = Object.fromEntries(
      Object.entries(httpConfig.headers || {}).filter(([headerKey]) => headerKey !== key)
    );
    handleConfigChange({headers: rest});
  };

  const handleHttpConfigChange = (changes: Partial<K6TestConfig>) => {
    if (!isDynamicScript) {
      handleConfigChange(changes);
      return;
    }

    const allowedChanges = Object.fromEntries(
      Object.entries(changes).filter(([key]) => !dynamicLockedConfigKeys.has(key as keyof K6TestConfig))
    ) as Partial<K6TestConfig>;

    if (Object.keys(allowedChanges).length > 0) {
      handleConfigChange(allowedChanges);
    }
  };

  const handleScriptChangeWithValidation = (newScript: string) => {
    handleScriptChange(newScript);
  };


  const handleTemplateChange = (template: K6ScriptTemplate) => {
    const nextConfig = getTemplateDefaults(template, httpConfig);
    const nextScript = updateScriptOptionsFromConfig(script, nextConfig);
    setHttpConfig(nextConfig);
    setScript(nextScript);
  };

  const handleConvertCurl = (curlCommand: string) => {
    if (isDynamicScript) return;

    try {
      const nextConfig = curlToHttpConfig(curlCommand, httpConfig);
      const generatedScript = httpConfigToScript(nextConfig);
      setHttpConfig(nextConfig);
      setScript(generatedScript);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to convert curl command');
    }
  };

  const handleImportPostman = async (collection: unknown) => {
    if (isDynamicScript) return;

    try {
      let generatedScript: string;
      try {
        generatedScript = updateScriptOptionsFromConfig(await scriptApi.convertPostman(collection), httpConfig);
      } catch {
        generatedScript = postmanCollectionToScript(collection as Parameters<typeof postmanCollectionToScript>[0], httpConfig);
      }
      setScript(generatedScript);
      updateConfigFromScript(generatedScript);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to convert Postman collection');
    }
  };

  const closeFolderModal = () => {
    setShowFolderModal(false);
    setNewFolderName('');
    setNewFolderDescription('');
    setFolderModalError(null);
  };

  const handleCreateNewFolder = async () => {
    if (!newFolderName.trim()) {
      setFolderModalError(t('newTest.folderNameRequired'));
      return;
    }

    try {
      setCreatingFolder(true);
      const newFolder = await folderApi.createFolder({
        name: newFolderName.trim(),
        description: newFolderDescription.trim()
      });
      setFolders([...folders, {folderId: newFolder.folderId, name: newFolder.name}]);
      setFolderId(newFolder.folderId);
      toast.success(t('folderList.folderCreated'));
      closeFolderModal();
    } catch (err) {
      setFolderModalError(err instanceof Error ? err.message : t('newTest.failedToCreateFolder'));
    } finally {
      setCreatingFolder(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={t('newTest.title')}
        actions={
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
        }
      />

      <form onSubmit={(e) => e.preventDefault()}>
        {error && <InfoBox variant="error">{error}</InfoBox>}

        <div className={styles.panes}>
          <HttpConfigForm
            config={httpConfig}
            isDynamic={isDynamicScript}
            headerKey={headerKey}
            headerValue={headerValue}
            onConfigChange={handleHttpConfigChange}
            onTemplateChange={handleTemplateChange}
            onConvertCurl={handleConvertCurl}
            onImportPostman={handleImportPostman}
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

        <div className={styles.panel}>
          <label className={styles.saveToggle}>
            <input
              type="checkbox"
              checked={saveAsScript}
              onChange={(e) => setSaveAsScript(e.target.checked)}
              className={styles.checkbox}
            />
            <span>💾 {t('newTest.saveAsScript')}</span>
          </label>
          <p className={styles.toggleHint}>{t('newTest.saveAsScriptDescription')}</p>

          {saveAsScript && (
            <div className={styles.scriptFields}>
              <Field label={t('newTest.folder')} required hint={t('newTest.scriptsMustBeInFolder')}>
                <div className={styles.folderRow}>
                  <select value={folderId} onChange={(e) => setFolderId(e.target.value)}>
                    <option value="">{t('newTest.selectFolder')}</option>
                    {folders.map(folder => (
                      <option key={folder.folderId} value={folder.folderId}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                  <Button variant="secondary" onClick={() => setShowFolderModal(true)}>
                    {t('newTest.newFolder')}
                  </Button>
                </div>
              </Field>

              <Field label={t('newTest.scriptId')} hint={t('newTest.scriptIdHelper')}>
                <input
                  type="text"
                  value={scriptId}
                  onChange={(e) => setScriptId(e.target.value)}
                  placeholder={t('newTest.scriptIdPlaceholder')}
                  pattern="^[a-z0-9-]*$"
                  title={t('newTest.scriptIdPattern')}
                />
              </Field>

              <Field label={t('newTest.descriptionOptional')}>
                <textarea
                  value={scriptDescription}
                  onChange={(e) => setScriptDescription(e.target.value)}
                  placeholder={t('newTest.descriptionPlaceholder')}
                  rows={2}
                />
              </Field>

              <Field label={t('newTest.tagsOptional')}>
                <input
                  type="text"
                  value={scriptTags}
                  onChange={(e) => setScriptTags(e.target.value)}
                  placeholder={t('newTest.tagsPlaceholder')}
                />
              </Field>
            </div>
          )}
        </div>

        <div className={styles.submitBar}>
          <p className={styles.submitHint}>
            {saveAsScript
              ? t('newTest.saveScriptAndRunTestDescription')
              : t('newTest.startTestDescription')}
          </p>

          <div className={styles.submitActions}>
            {saveAsScript && (
              <Button
                variant="secondary"
                size="lg"
                appearance="outline"
                onClick={() => handleButtonClick(false)}
                loading={loading}
                title={t('newTest.saveScriptOnlyDescription')}
              >
                💾 {t('newTest.saveScriptOnly')}
              </Button>
            )}

            <Button
              size="lg"
              onClick={() => handleButtonClick(true)}
              loading={loading}
            >
              {loading
                ? `🚀 ${t('newTest.startingTest')}`
                : saveAsScript
                  ? `💾 ${t('newTest.saveScriptAndRunTest')}`
                  : `🚀 ${t('newTest.startTest')}`}
            </Button>
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

      {showFolderModal && (
        <Modal
          title={t('newTest.createNewFolder')}
          size="md"
          closeLabel={t('common.close')}
          onClose={closeFolderModal}
          footer={
            <>
              <Button variant="gray" appearance="outline" onClick={closeFolderModal} disabled={creatingFolder}>
                {t('common.cancel')}
              </Button>
              <Button variant="secondary" onClick={handleCreateNewFolder} loading={creatingFolder}>
                {t('common.create')}
              </Button>
            </>
          }
        >
          <Field label={t('newTest.folderName')} required error={folderModalError ?? undefined}>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => {
                setNewFolderName(e.target.value);
                setFolderModalError(null);
              }}
              placeholder={t('newTest.folderNamePlaceholder')}
              disabled={creatingFolder}
              data-autofocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateNewFolder();
              }}
            />
          </Field>

          <Field label={t('newTest.folderDescription')}>
            <textarea
              value={newFolderDescription}
              onChange={(e) => setNewFolderDescription(e.target.value)}
              placeholder={t('newTest.folderDescriptionPlaceholder')}
              disabled={creatingFolder}
              rows={3}
            />
          </Field>
        </Modal>
      )}

      {showTestNameModal && (
        <TestNameModal
          initialName={httpConfig.name || ''}
          loading={loading}
          onCancel={() => setShowTestNameModal(false)}
          onConfirm={handleTestNameConfirm}
        />
      )}

      {hasPendingOverwrite && (
        <ConfirmDialog
          title={t('newTest.overwriteScriptTitle')}
          message={t('newTest.overwriteScriptMessage')}
          confirmLabel={t('newTest.overwriteScriptConfirm')}
          variant="primary"
          onConfirm={confirmPendingOverwrite}
          onCancel={cancelPendingOverwrite}
        />
      )}
    </div>
  );
};
