import {useEffect, useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {scriptApi} from '../apis/scriptApi';
import type {Script} from '../types/script';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LinkButton,
  PageHeader,
  SkeletonList,
  TestNameModal,
  useToast
} from '../components/common';
import styles from '../components/common/EntityCard.module.css';

export const ScriptList = () => {
  const {t} = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();

  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runTargetScriptId, setRunTargetScriptId] = useState<string | null>(null);
  const [runningScript, setRunningScript] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Script | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchScripts = async () => {
    try {
      setLoading(true);
      const data = await scriptApi.getScripts({sortBy: 'updatedAt', sortOrder: 'desc'});
      setScripts(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch scripts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScripts();
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      await scriptApi.deleteScript(deleteTarget.scriptId);
      toast.success(t('folderDetail.scriptDeleted'));
      setDeleteTarget(null);
      await fetchScripts();
    } catch {
      toast.error(t('folderDetail.failedToDeleteScript'));
    } finally {
      setDeleting(false);
    }
  };

  const handleRunConfirm = async (name?: string, scheduledAt?: number) => {
    if (!runTargetScriptId) return;

    try {
      setRunningScript(true);
      const result = await scriptApi.runScript(runTargetScriptId, {
        ...(name && {name}),
        ...(scheduledAt && {scheduledAt})
      });
      navigate(`/tests/${result.testId}`);
    } catch {
      toast.error(t('folderDetail.failedToRunScript'));
    } finally {
      setRunningScript(false);
      setRunTargetScriptId(null);
    }
  };

  const renderContent = () => {
    if (loading) return <SkeletonList rows={4} label={t('common.loading')}/>;
    if (error) return <ErrorState message={error} onRetry={fetchScripts}/>;

    if (scripts.length === 0) {
      return (
        <EmptyState
          icon="📄"
          title={t('folderDetail.noScripts')}
          description={t('scriptList.description')}
          action={
            <LinkButton to="/new-test?saveScript=true" variant="secondary">
              {t('folderDetail.createFirstScript')}
            </LinkButton>
          }
        />
      );
    }

    return (
      <ul className={styles.grid}>
        {scripts.map(script => (
          <li key={script.scriptId} className={styles.card}>
            <div className={styles.cardMain}>
              <h2 className={`${styles.name} ${styles.mono}`}>
                <Link to={`/scripts/${script.scriptId}`} className={styles.cardLink}>
                  {script.scriptId}
                </Link>
              </h2>

              {script.tags && script.tags.length > 0 && (
                <div className={styles.tags}>
                  {script.tags.map(tag => (
                    <span key={tag} className={styles.tag}>{tag}</span>
                  ))}
                </div>
              )}

              <div className={styles.meta}>
                {t('common.updatedAt')}: {new Date(script.updatedAt).toLocaleString()}
              </div>
            </div>

            <div className={styles.actions}>
              <Button
                size="sm"
                onClick={() => setRunTargetScriptId(script.scriptId)}
              >
                {t('folderDetail.runScript')}
              </Button>
              <Button
                variant="danger"
                appearance="outline"
                size="sm"
                onClick={() => setDeleteTarget(script)}
                aria-label={`${t('common.delete')} ${script.scriptId}`}
              >
                {t('common.delete')}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div>
      <PageHeader
        title={t('nav.scripts')}
        description={t('scriptList.description')}
        actions={
          <LinkButton to="/new-test?saveScript=true" variant="secondary">
            + {t('folderDetail.newScript')}
          </LinkButton>
        }
      />

      {renderContent()}

      {runTargetScriptId && (
        <TestNameModal
          initialName={`[${runTargetScriptId}] Test Run`}
          loading={runningScript}
          onCancel={() => setRunTargetScriptId(null)}
          onConfirm={handleRunConfirm}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={t('folderDetail.deleteScript')}
          message={t('folderDetail.confirmDeleteScript')}
          confirmLabel={t('common.delete')}
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};
