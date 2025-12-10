import {useEffect, useState} from 'react';
import {Link, useNavigate, useParams} from 'react-router-dom';
import {folderApi} from '../apis/folderApi';
import {scriptApi} from '../apis/scriptApi';
import type {FolderWithScripts} from '../types/script';

export const FolderDetail = () => {
  const {folderId} = useParams<{folderId: string}>();
  const navigate = useNavigate();
  const [folderData, setFolderData] = useState<FolderWithScripts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);

  const fetchFolderData = async () => {
    if (!folderId) return;

    try {
      setLoading(true);
      const data = await folderApi.getFolder(folderId);
      setFolderData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch folder');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFolderData();
  }, [folderId]);

  const handleDelete = async (scriptId: string) => {
    if (!folderId) return;
    if (!confirm('Are you sure you want to delete this script?')) return;

    try {
      await folderApi.deleteScript(folderId, scriptId);
      fetchFolderData();
    } catch (err) {
      alert('Failed to delete script');
    }
  };

  const handleRun = async (scriptId: string) => {
    try {
      const result = await scriptApi.runScript(scriptId);
      navigate(`/tests/${result.testId}`);
    } catch (err) {
      alert('Failed to run script');
    }
  };

  const handleRunAll = async () => {
    if (!folderId) return;
    if (!folderData || folderData.scripts.length === 0) {
      alert('No scripts to run in this folder');
      return;
    }

    if (!confirm(`Run all ${folderData.scripts.length} scripts sequentially?`)) return;

    try {
      setRunningAll(true);
      const result = await folderApi.runAllScripts(folderId);
      alert(result.message);
      if (result.testIds.length > 0) {
        navigate(`/tests/${result.testIds[0]}`);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to run scripts');
    } finally {
      setRunningAll(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div style={{color: 'red'}}>Error: {error}</div>;
  if (!folderData) return <div>Folder not found</div>;

  return (
    <div>
      <div style={{marginBottom: '1rem'}}>
        <Link to="/folders" style={{color: '#3b82f6', textDecoration: 'none'}}>
          ← Back to Folders
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
            {folderData.scriptCount} script{folderData.scriptCount !== 1 ? 's' : ''} in this folder
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
            + New Script
          </Link>
          {folderData.scripts.length > 0 && (
            <button
              onClick={handleRunAll}
              disabled={runningAll}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: runningAll ? '#9ca3af' : '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: runningAll ? 'not-allowed' : 'pointer',
                fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
                fontWeight: 'bold'
              }}
            >
              {runningAll ? 'Running...' : 'Run All Scripts'}
            </button>
          )}
        </div>
      </div>

      {folderData.scripts.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          padding: '3rem',
          borderRadius: '8px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <p>No scripts in this folder.</p>
          <Link
            to={`/new-test?saveScript=true&folderId=${folderId}`}
            style={{color: '#3b82f6'}}
          >
            Create your first script
          </Link>
        </div>
      ) : (
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem'}}>
          {folderData.scripts.map(script => (
            <div
              key={script.scriptId}
              style={{
                backgroundColor: 'white',
                padding: '1.5rem',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                transition: 'box-shadow 0.2s',
              }}
              onClick={() => navigate(`/scripts/${script.scriptId}`)}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'}
            >
              <h3 style={{margin: '0 0 0.5rem 0', fontSize: '1.125rem'}}>{script.scriptId}</h3>
              <p style={{
                margin: '0 0 1rem 0',
                fontSize: '0.875rem',
                color: '#6b7280',
                minHeight: '2.5rem'
              }}>
                {script.description || 'No description'}
              </p>

              {script.tags && script.tags.length > 0 && (
                <div style={{display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginBottom: '1rem'}}>
                  {script.tags.map(tag => (
                    <span
                      key={tag}
                      style={{
                        backgroundColor: '#dbeafe',
                        color: '#1e40af',
                        padding: '0.125rem 0.5rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem'
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div style={{
                fontSize: '0.75rem',
                color: '#9ca3af',
                marginBottom: '1rem'
              }}>
                Updated: {new Date(script.updatedAt).toLocaleString()}
              </div>

              <div style={{display: 'flex', gap: '0.5rem'}} onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => handleRun(script.scriptId)}
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
                  Run
                </button>
                <button
                  onClick={() => handleDelete(script.scriptId)}
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
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
