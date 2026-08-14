import {useCallback, useEffect, useRef, useState} from 'react';
import {Link, useLocation, useNavigate, useParams} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {folderApi} from '../apis/folderApi';
import {scriptApi} from '../apis/scriptApi';
import {k6Api} from '../apis/testApi';
import type {FolderWithScripts} from '../types/script';
import type {Test} from '../types/test';
import {TestTable} from '../components/test-list';
import {ScriptTable} from '../components/folder/ScriptTable';
import {PostmanImportModal} from '../components/folder/PostmanImportModal';
import type {ImportConfig} from '../components/folder/importConfig';
import {
  Button,
  EmptyState,
  ErrorState,
  LinkButton,
  PageHeader,
  SkeletonList,
  TestNameModal,
  useToast
} from '../components/common';
import styles from './FolderDetail.module.css';

const MAX_SCRIPTS_PER_FOLDER = 30;
const RUNNING_POLL_MS = 2000;

export const FolderDetail = () => {
  const {t} = useTranslation();
  const {folderId} = useParams<{ folderId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [folderData, setFolderData] = useState<FolderWithScripts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [folderTests, setFolderTests] = useState<Test[]>([]);
  const [pendingScriptId, setPendingScriptId] = useState<string | null>(null);
  const [runningScript, setRunningScript] = useState(false);
  const [showRunAllModal, setShowRunAllModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const fetchFolderTests = useCallback(async (folder: FolderWithScripts) => {
    try {
      const limit = Math.max(MAX_SCRIPTS_PER_FOLDER, folder.scripts.length);
      const response = await k6Api.getTests(null, limit);
      const scriptIds = new Set(folder.scripts.map(script => script.scriptId));

      setFolderTests(response.tests.filter(test => test.scriptId && scriptIds.has(test.scriptId)));
    } catch (err) {
      console.error('Failed to fetch folder tests:', err);
    }
  }, []);

  const fetchFolderData = useCallback(async () => {
    if (!folderId) return;

    try {
      setLoading(true);
      const data = await folderApi.getFolder(folderId);
      setFolderData(data);
      setError(null);
      await fetchFolderTests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch folder');
    } finally {
      setLoading(false);
    }
  }, [folderId, fetchFolderTests]);

  useEffect(() => {
    fetchFolderData();
  }, [fetchFolderData]);

  // `?runAll=true` deep-links into the run-all flow; only open the modal once.
  const runAllHandled = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('runAll') !== 'true' || runAllHandled.current) return;
    if (!folderData || folderData.scripts.length === 0) return;

    runAllHandled.current = true;
    setShowRunAllModal(true);
  }, [location.search, folderData]);

  useEffect(() => {
    if (!isRunningAll || !folderData) return;

    const interval = setInterval(() => fetchFolderTests(folderData), RUNNING_POLL_MS);
    return () => clearInterval(interval);
  }, [isRunningAll, folderData, fetchFolderTests]);

  const handleRunConfirm = async (name?: string, scheduledAt?: number) => {
    if (!pendingScriptId) return;

    try {
      setRunningScript(true);
      const result = await scriptApi.runScript(pendingScriptId, {
        ...(name && {name}),
        ...(scheduledAt && {scheduledAt})
      });
      navigate(`/tests/${result.testId}`);
    } catch {
      toast.error(t('folderDetail.failedToRunScript'));
    } finally {
      setRunningScript(false);
      setPendingScriptId(null);
    }
  };

  const handleRunAllConfirm = async (_name?: string, scheduledAt?: number) => {
    if (!folderId || !folderData) return;

    setShowRunAllModal(false);

    try {
      setIsRunningAll(true);
      await folderApi.runAllScripts(folderId, scheduledAt ? {scheduledAt} : undefined);
      toast.success(t('folderDetail.runAllStarted'));
      await fetchFolderTests(folderData);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('folderDetail.failedToRunScript'));
    } finally {
      setIsRunningAll(false);
    }
  };

  const handleImport = async (collection: unknown, config: ImportConfig, tags: string[]) => {
    if (!folderId) return;

    try {
      setIsImporting(true);
      const response = await folderApi.importPostmanScripts(folderId, {
        collection,
        config,
        ...(tags.length > 0 && {tags})
      });
      toast.success(t('folderDetail.importPostmanSuccess', {count: response.count}));
      setShowImportModal(false);
      await fetchFolderData();
    } catch (err) {
      const apiError = err as {response?: {data?: {error?: string}}; message?: string};
      toast.error(apiError.response?.data?.error || apiError.message || t('folderDetail.importPostmanFailed'));
    } finally {
      setIsImporting(false);
    }
  };

  if (loading) {
    return <SkeletonList rows={6} label={t('common.loading')}/>;
  }

  if (error) {
    return <ErrorState message={`${t('common.error')}: ${error}`} onRetry={fetchFolderData}/>;
  }

  if (!folderData) {
    return <EmptyState icon="📁" title={t('folderList.noFolders')}/>;
  }

  const {folder, scripts, scriptCount} = folderData;

  return (
    <div>
      <Link to="/folders" className={styles.back}>
        {t('folderDetail.backToFolders')}
      </Link>

      <PageHeader
        title={folder.name}
        description={
          <>
            {folder.description}
            <span className={styles.meta}>
              {scriptCount} script{scriptCount === 1 ? '' : 's'} in this folder
            </span>
          </>
        }
        actions={
          <>
            <LinkButton to={`/new-test?saveScript=true&folderId=${folderId}`} variant="secondary">
              + {t('folderDetail.newScript')}
            </LinkButton>
            <Button onClick={() => setShowImportModal(true)}>
              {t('folderDetail.importPostman')}
            </Button>
            {scripts.length > 0 && (
              <Button
                variant="purple"
                onClick={() => setShowRunAllModal(true)}
                loading={isRunningAll}
              >
                {t('folderDetail.runAllScripts')}
              </Button>
            )}
          </>
        }
      />

      {scripts.length === 0 ? (
        <EmptyState
          icon="📄"
          title={t('folderDetail.noScripts')}
          action={
            <LinkButton to={`/new-test?saveScript=true&folderId=${folderId}`} variant="secondary">
              {t('folderDetail.createFirstScript')}
            </LinkButton>
          }
        />
      ) : (
        <ScriptTable scripts={scripts} onRun={setPendingScriptId}/>
      )}

      {folderTests.length > 0 && (
        <section>
          <h2 className={styles.sectionTitle}>{t('folderDetail.executionResults')}</h2>
          <TestTable tests={folderTests}/>
        </section>
      )}

      {showImportModal && (
        <PostmanImportModal
          importing={isImporting}
          onClose={() => setShowImportModal(false)}
          onSubmit={handleImport}
          onInvalidFile={() => toast.error(t('httpConfig.invalidPostmanFile'))}
        />
      )}

      {pendingScriptId && (
        <TestNameModal
          loading={runningScript}
          onCancel={() => setPendingScriptId(null)}
          onConfirm={handleRunConfirm}
        />
      )}

      {showRunAllModal && (
        <TestNameModal
          showName={false}
          loading={isRunningAll}
          onCancel={() => setShowRunAllModal(false)}
          onConfirm={handleRunAllConfirm}
        />
      )}
    </div>
  );
};
