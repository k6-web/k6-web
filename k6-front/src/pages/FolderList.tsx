import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {folderApi} from '../apis/folderApi';
import type {Folder} from '../types/script';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  InfoBox,
  Modal,
  PageHeader,
  SkeletonList,
  useToast
} from '../components/common';
import styles from '../components/common/EntityCard.module.css';

interface FolderFormState {
  name: string;
  description: string;
}

const EMPTY_FORM: FolderFormState = {name: '', description: ''};

export const FolderList = () => {
  const {t} = useTranslation();
  const toast = useToast();

  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // `null` closes the dialog; a folder means edit, `'create'` means create.
  const [formTarget, setFormTarget] = useState<Folder | 'create' | null>(null);
  const [form, setForm] = useState<FolderFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Folder | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchFolders = async () => {
    try {
      setLoading(true);
      const data = await folderApi.getFolders({sortBy: 'updatedAt', sortOrder: 'desc'});
      setFolders(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch folders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFolders();
  }, []);

  const openCreate = () => {
    setFormTarget('create');
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const openEdit = (folder: Folder) => {
    setFormTarget(folder);
    setForm({name: folder.name, description: folder.description || ''});
    setFormError(null);
  };

  const closeForm = () => {
    setFormTarget(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const handleSubmit = async () => {
    if (!formTarget) return;

    if (!form.name.trim()) {
      setFormError(t('newTest.folderNameRequired'));
      return;
    }

    const isCreate = formTarget === 'create';

    try {
      setSaving(true);
      const payload = {name: form.name.trim(), description: form.description.trim()};

      if (isCreate) {
        await folderApi.createFolder(payload);
        toast.success(t('folderList.folderCreated'));
      } else {
        await folderApi.updateFolder(formTarget.folderId, payload);
        toast.success(t('folderList.folderUpdated'));
      }

      closeForm();
      await fetchFolders();
    } catch (err) {
      const fallback = isCreate ? t('newTest.failedToCreateFolder') : t('folderList.failedToUpdate');
      setFormError(err instanceof Error ? err.message : fallback);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      await folderApi.deleteFolder(deleteTarget.folderId);
      toast.success(t('folderList.folderDeleted'));
      setDeleteTarget(null);
      await fetchFolders();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('folderList.failedToDelete'));
    } finally {
      setDeleting(false);
    }
  };

  const renderContent = () => {
    if (loading) return <SkeletonList rows={4} label={t('common.loading')}/>;
    if (error) return <ErrorState message={error} onRetry={fetchFolders}/>;

    if (folders.length === 0) {
      return (
        <EmptyState
          icon="📁"
          title={t('folderList.noFolders')}
          description={t('folderList.infoMessage')}
          action={
            <Button variant="secondary" onClick={openCreate}>
              {t('folderList.createFirstFolder')}
            </Button>
          }
        />
      );
    }

    return (
      <ul className={styles.grid}>
        {folders.map(folder => (
          <li key={folder.folderId} className={styles.card}>
            <div className={styles.cardMain}>
              <h2 className={styles.name}>
                <span aria-hidden="true">📁</span>
                <Link to={`/folders/${folder.folderId}`} className={styles.cardLink}>
                  {folder.name}
                </Link>
              </h2>
              <p className={styles.description}>
                {folder.description || t('folderList.noDescription')}
              </p>
              <div className={styles.meta}>
                {t('common.updatedAt')}: {new Date(folder.updatedAt).toLocaleString()}
              </div>
            </div>

            <div className={styles.actions}>
              <Button
                variant="gray"
                appearance="outline"
                size="sm"
                onClick={() => openEdit(folder)}
                aria-label={`${t('common.edit')} ${folder.name}`}
              >
                {t('common.edit')}
              </Button>
              <Button
                variant="danger"
                appearance="outline"
                size="sm"
                onClick={() => setDeleteTarget(folder)}
                aria-label={`${t('common.delete')} ${folder.name}`}
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
        title={t('folderList.title')}
        description={t('scriptList.description')}
        actions={
          <Button variant="secondary" onClick={openCreate}>
            + {t('folderList.newFolder')}
          </Button>
        }
      />

      <InfoBox variant="info">{t('folderList.infoMessage')}</InfoBox>

      {renderContent()}

      {formTarget && (
        <Modal
          title={formTarget === 'create' ? t('newTest.createNewFolder') : t('folderDetail.editFolder')}
          size="md"
          onClose={closeForm}
          closeLabel={t('common.close')}
          footer={
            <>
              <Button variant="gray" appearance="outline" onClick={closeForm} disabled={saving}>
                {t('common.cancel')}
              </Button>
              <Button variant="secondary" onClick={handleSubmit} loading={saving}>
                {formTarget === 'create' ? t('common.create') : t('common.save')}
              </Button>
            </>
          }
        >
          <Field label={t('newTest.folderName')} required error={formError ?? undefined}>
            <input
              type="text"
              value={form.name}
              onChange={(e) => {
                setForm(current => ({...current, name: e.target.value}));
                setFormError(null);
              }}
              placeholder={t('newTest.folderNamePlaceholder')}
              disabled={saving}
              data-autofocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
            />
          </Field>

          <Field label={t('newTest.folderDescription')}>
            <textarea
              value={form.description}
              onChange={(e) => setForm(current => ({...current, description: e.target.value}))}
              placeholder={t('newTest.folderDescriptionPlaceholder')}
              disabled={saving}
              rows={3}
            />
          </Field>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={t('folderList.deleteFolder')}
          message={t('folderList.confirmDelete')}
          confirmLabel={t('common.delete')}
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};
