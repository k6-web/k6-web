import {useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import type {Test} from '../../types/test';
import {Light as SyntaxHighlighter} from 'react-syntax-highlighter';
import {github} from 'react-syntax-highlighter/dist/esm/styles/hljs';

interface RecentTestsModalProps {
  show: boolean;
  tests: Test[];
  loading: boolean;
  onClose: () => void;
  onLoadTest: (testId: string) => void;
}

export const RecentTestsModal = ({show, tests, loading, onClose, onLoadTest}: RecentTestsModalProps) => {
  const {t} = useTranslation();

  // ESC 키로 모달 닫기
  useEffect(() => {
    if (!show) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '2rem',
        maxWidth: '1200px',
        width: '100%',
        maxHeight: '85vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{margin: 0}}>{t('recentTestsModal.title')}</h2>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#e5e7eb',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            {t('common.close')}
          </button>
        </div>

        {loading ? (
          <div style={{textAlign: 'center', padding: '3rem', color: '#6b7280'}}>
            {t('recentTestsModal.loadingTests')}
          </div>
        ) : tests.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            color: '#6b7280',
            backgroundColor: '#f9fafb',
            borderRadius: '8px'
          }}>
            <p style={{fontSize: '1.125rem', marginBottom: '0.5rem'}}>{t('recentTestsModal.noTests')}</p>
          </div>
        ) : (
          <div style={{display: 'grid', gap: '1rem'}}>
            {tests.map((test) => (
              <div
                key={test.testId}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  backgroundColor: '#fafafa',
                  transition: 'box-shadow 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '1rem',
                  gap: '1rem',
                  flexWrap: 'wrap'
                }}>
                  <div style={{flex: 1, minWidth: '200px'}}>
                    <div style={{
                      fontSize: '1.125rem',
                      fontWeight: 'bold',
                      marginBottom: '0.5rem',
                      color: '#1f2937'
                    }}>
                      {test.testId}
                    </div>
                    <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
                      <div style={{fontSize: '0.875rem', color: '#6b7280'}}>
                        <span style={{fontWeight: '600'}}>{t('recentTestsModal.status')}:</span>{' '}
                        <span style={{
                          padding: '0.125rem 0.5rem',
                          borderRadius: '9999px',
                          backgroundColor: test.status === 'running' ? '#dbeafe' :
                            test.status === 'completed' ? '#d1fae5' :
                              test.status === 'failed' ? '#fee2e2' : '#f3f4f6',
                          color: test.status === 'running' ? '#1e40af' :
                            test.status === 'completed' ? '#065f46' :
                              test.status === 'failed' ? '#991b1b' : '#374151'
                        }}>
                          {test.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onLoadTest(test.testId)}
                    style={{
                      padding: '0.5rem 1.5rem',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {t('recentTestsModal.loadScript')}
                  </button>
                </div>

                <div style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    backgroundColor: '#f3f4f6',
                    padding: '0.5rem 1rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#6b7280',
                    borderBottom: '1px solid #e5e7eb'
                  }}>
                    Script Preview
                  </div>
                  <div style={{maxHeight: '200px', overflow: 'auto'}}>
                    <SyntaxHighlighter
                      language="javascript"
                      style={github}
                      customStyle={{
                        margin: 0,
                        padding: '1rem',
                        fontSize: '0.75rem',
                        backgroundColor: 'transparent'
                      }}
                    >
                      {test.script.substring(0, 500) + (test.script.length > 500 ? '...' : '')}
                    </SyntaxHighlighter>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '4px',
          fontSize: '0.875rem',
          color: '#1e40af'
        }}>
          💡 <strong>Tip:</strong> Click "Load Script" to copy a previous test's configuration and script to the editor
          above.
        </div>
      </div>
    </div>
  );
};
