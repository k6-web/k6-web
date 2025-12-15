import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {folderApi} from '../apis/folderApi';
import type {Folder} from '../types/script';

export const FolderList = () => {
  const {t} = useTranslation();
  const navigate = useNavigate();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDescription, setNewFolderDescription] = useState('');
  const [sortBy] = useState<'createdAt' | 'updatedAt' | 'name'>('updatedAt');
  const [sortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchFolders = async () => {
    try {
      setLoading(true);
      const data = await folderApi.getFolders({sortBy, sortOrder});
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
  }, [sortBy, sortOrder]);

  const handleDelete = async (folderId: string) => {
    if (!confirm(t('folderList.confirmDelete'))) return;

    try {
      await folderApi.deleteFolder(folderId);
      fetchFolders();
    } catch (err) {
      alert(err instanceof Error ? err.message : t('folderList.failedToDelete'));
    }
  };

  const handleCreate = async () => {
    if (!newFolderName.trim()) {
      alert(t('newTest.folderNameRequired'));
      return;
    }

    try {
      await folderApi.createFolder({
        name: newFolderName,
        description: newFolderDescription,
      });
      setShowCreateModal(false);
      setNewFolderName('');
      setNewFolderDescription('');
      fetchFolders();
    } catch (err) {
      alert(err instanceof Error ? err.message : t('newTest.failedToCreateFolder'));
    }
  };

  if (loading) return <div>{t('common.loading')}</div>;
  if (error) return <div style={{color: 'red'}}>{t('common.error')}: {error}</div>;

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <h1 style={{margin: 0, fontSize: 'clamp(1.5rem, 5vw, 2rem)'}}>{t('folderList.title')}</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
            fontWeight: 'bold'
          }}
        >
          + {t('folderList.newFolder')}
        </button>
      </div>

      {showCreateModal && (
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
                onClick={() => {
                  setShowCreateModal(false);
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
                onClick={handleCreate}
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

      {folders.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          padding: '3rem',
          borderRadius: '8px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <p>{t('folderList.noFolders')}</p>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              color: '#3b82f6',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {t('folderList.createFirstFolder')}
          </button>
        </div>
      ) : (
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem'}}>
          {folders.map(folder => (
            <div
              key={folder.folderId}
              style={{
                backgroundColor: 'white',
                padding: '1.5rem',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                transition: 'box-shadow 0.2s',
              }}
              onClick={() => navigate(`/folders/${folder.folderId}`)}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'}
            >
              <h3 style={{margin: '0 0 0.5rem 0', fontSize: '1.125rem'}}>📁 {folder.name}</h3>
              <p style={{
                margin: '0 0 1rem 0',
                fontSize: '0.875rem',
                color: '#6b7280',
                minHeight: '2.5rem'
              }}>
                {folder.description || 'No description'}
              </p>

              <div style={{
                fontSize: '0.75rem',
                color: '#9ca3af',
                marginBottom: '1rem'
              }}>
                Updated: {new Date(folder.updatedAt).toLocaleString()}
              </div>

              <div style={{display: 'flex', gap: '0.5rem'}} onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => navigate(`/folders/${folder.folderId}`)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  {t('folderList.viewFolder')}
                </button>
                <button
                  onClick={() => handleDelete(folder.folderId)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  {t('common.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
