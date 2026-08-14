import {useCallback, useEffect, useState} from 'react';
import {Link, useNavigate, useParams, useSearchParams} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {folderApi} from '../apis/folderApi';
import {scriptApi} from '../apis/scriptApi';
import type {Script} from '../types/script';
import type {Test} from '../types/test';
import type {K6ScriptTemplate, K6TestConfig} from '../types/k6';
import {MetricsTrendChart} from '../components/MetricsTrendChart';
import {ScriptHistoryTable} from '../components/script-detail/ScriptHistoryTable';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  SkeletonList,
  TestNameModal,
  useToast
} from '../components/common';
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
import {copyToClipboard} from '../utils/clipboard';
import styles from './ScriptDetail.module.css';

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
  const toast = useToast();

  const [script, setScript] = useState<Script | null>(null);
  const [history, setHistory] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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
    setEditScript(scriptData.script);
    setEditDescription(scriptData.description || '');
    setEditTags(scriptData.tags?.join(', ') || '');
    setEditConfig({...DEFAULT_EDIT_CONFIG, ...scriptData.config, ...parsed.config});
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
      toast.error(t('folderDetail.failedToRunScript'));
    } finally {
      setIsRunning(false);
    }
  };

  const handleShare = async () => {
    const copied = await copyToClipboard(window.location.href);
    if (copied) {
      toast.success(t('scriptDetail.copiedToClipboard'));
    } else {
      toast.error(t('scriptDetail.failedToShare'));
    }
  };

  const handleCopy = () => {
    if (!script) return;

    navigate('/new-test', {
      state: {
        copiedScript: {
          script: script.script,
          config: script.config,
          description: script.description,
          tags: script.tags,
          folderId: script.folderId,
          isDynamic: hasDynamicParameters(script.script)
        }
      }
    });
  };

  const handleDelete = async () => {
    if (!scriptId || !script) return;

    try {
      setIsDeleting(true);
      await scriptApi.deleteScript(scriptId);
      toast.success(t('scriptDetail.scriptDeleted'));
      navigate(script.folderId ? `/folders/${script.folderId}` : '/scripts');
    } catch {
      toast.error(t('scriptDetail.failedToDelete'));
      setIsDeleting(false);
      setShowDeleteConfirm(false);
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
    setEditConfig(prev => ({...prev, ...parsed.config}));
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
    handleEditConfigChange({
      headers: Object.fromEntries(
        Object.entries(editConfig.headers || {}).filter(([headerName]) => headerName !== key)
      )
    });
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
      toast.error(err instanceof Error ? err.message : 'Failed to convert curl command');
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
      toast.error(err instanceof Error ? err.message : 'Failed to convert Postman collection');
    }
  };

  const handleSaveEdit = async () => {
    if (!script || !script.folderId) return;

    if (!editScript.trim()) {
      toast.error(t('scriptDetail.scriptRequired'));
      return;
    }

    if (!validate(editScript)) {
      toast.error(syntaxError || t('scriptEditor.invalidSyntax'));
      return;
    }

    try {
      setIsSaving(true);
      const updated = await folderApi.updateScript(script.folderId, script.scriptId, {
        script: editScript,
        config: script.config,
        description: editDescription.trim(),
        tags: editTags.split(',').map(tag => tag.trim()).filter(Boolean)
      });
      setScript(updated);
      setIsEditing(false);
      toast.success(t('scriptDetail.scriptUpdated'));
    } catch (err) {
      const apiError = err as {response?: {data?: {error?: string}}; message?: string};
      toast.error(apiError.response?.data?.error || apiError.message || t('scriptDetail.failedToUpdate'));
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <SkeletonList rows={6} label={t('common.loading')}/>;
  if (error) return <ErrorState message={`${t('common.error')}: ${error}`}/>;
  if (!script) return <EmptyState icon="📄" title={t('testList.noScriptAvailable')}/>;

  return (
    <div>
      {script.folderId && (
        <Link to={`/folders/${script.folderId}`} className={styles.back}>
          {t('scriptDetail.backToFolder')}
        </Link>
      )}

      <div className={styles.panel}>
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.scriptId}>{script.scriptId}</h1>
            <p className={styles.description}>
              {script.description || t('folderList.noDescription')}
            </p>
          </div>

          <div className={styles.actions}>
            <Button variant="purple" onClick={handleShare}>
              🔗 {t('scriptDetail.shareScript')}
            </Button>
            <Button onClick={handleCopy}>
              📋 {t('scriptDetail.copyScript')}
            </Button>
            <Button
              variant="gray"
              onClick={startEditing}
              disabled={!script.folderId}
              title={script.folderId ? undefined : t('scriptDetail.editRequiresFolder')}
            >
              {t('scriptDetail.editScript')}
            </Button>
            <Button variant="secondary" onClick={() => setIsRunModalOpen(true)} loading={isRunning}>
              {isRunning ? t('newTest.startingTest') : t('scriptDetail.runTest')}
            </Button>
            <Button variant="danger" appearance="outline" onClick={() => setShowDeleteConfirm(true)}>
              🗑️ {t('scriptDetail.deleteScript')}
            </Button>
          </div>
        </div>

        {script.tags && script.tags.length > 0 && (
          <div className={styles.tags}>
            {script.tags.map(tag => (
              <span key={tag} className={styles.tag}>{tag}</span>
            ))}
          </div>
        )}

        <div className={styles.meta}>
          {script.folderId && (
            <div>
              <span className={styles.metaLabel}>{t('scriptDetail.folder')}: </span>
              <Link to={`/folders/${script.folderId}`} className={styles.folderLink}>
                {script.folderId}
              </Link>
            </div>
          )}
          <div>{t('scriptDetail.createdAt')}: {new Date(script.createdAt).toLocaleString()}</div>
          <div>{t('scriptDetail.updatedAt')}: {new Date(script.updatedAt).toLocaleString()}</div>
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>{t('scriptDetail.script')}</h2>
          {isEditing && (
            <div className={styles.actions}>
              <Button variant="gray" appearance="outline" onClick={cancelEditing} disabled={isSaving}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSaveEdit} loading={isSaving}>
                {t('common.save')}
              </Button>
            </div>
          )}
        </div>

        {isEditing ? (
          <>
            <div className={styles.editFields}>
              <Field label={t('scriptDetail.description')}>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                />
              </Field>
              <Field label={t('scriptDetail.tags')} hint={t('newTest.tagsPlaceholder')}>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder={t('newTest.tagsPlaceholder')}
                />
              </Field>
            </div>

            <div className={styles.editPanes}>
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
          </>
        ) : (
          <pre className={styles.code}>{script.script}</pre>
        )}
      </div>

      {history.length > 0 && (
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>{t('metrics.performanceOverTime')}</h2>
          <MetricsTrendChart tests={history}/>
        </div>
      )}

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>{t('testList.title')} ({history.length})</h2>
        </div>

        {history.length === 0 ? (
          <p className={styles.emptyHistory}>{t('testList.noTests')}</p>
        ) : (
          <ScriptHistoryTable history={history}/>
        )}
      </div>

      {isRunModalOpen && (
        <TestNameModal
          initialName={script.config?.name || ''}
          loading={isRunning}
          onCancel={() => setIsRunModalOpen(false)}
          onConfirm={handleRunConfirm}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          title={t('scriptDetail.deleteScript')}
          message={t('scriptDetail.confirmDelete')}
          confirmLabel={t('common.delete')}
          loading={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
};
