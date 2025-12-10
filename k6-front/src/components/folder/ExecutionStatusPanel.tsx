import {Link} from 'react-router-dom';

export interface ScriptExecutionStatus {
  scriptId: string;
  scriptName: string;
  testId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'stopped';
  startTime?: number;
}

interface ExecutionStatusPanelProps {
  statuses: ScriptExecutionStatus[];
}

export const ExecutionStatusPanel = ({statuses}: ExecutionStatusPanelProps) => {
  if (statuses.length === 0) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'running': return '⏳';
      case 'failed': return '❌';
      case 'stopped': return '⏹️';
      default: return '⏸️';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'running': return '#3b82f6';
      case 'failed': return '#ef4444';
      case 'stopped': return '#f59e0b';
      default: return '#9ca3af';
    }
  };

  const getElapsedTime = (startTime?: number): string => {
    if (!startTime) return '-';
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  const completedCount = statuses.filter(s =>
    s.status === 'completed' || s.status === 'failed' || s.status === 'stopped'
  ).length;

  const runningCount = statuses.filter(s => s.status === 'running').length;
  const progressPercentage = (completedCount / statuses.length) * 100;

  return (
    <div style={{
      backgroundColor: 'white',
      padding: '1.5rem',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginBottom: '1rem'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.5rem'
      }}>
        <h2 style={{margin: 0}}>Execution Status</h2>
        <div style={{textAlign: 'right'}}>
          <div style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            fontWeight: 'bold'
          }}>
            {completedCount} / {statuses.length} completed
          </div>
          {runningCount > 0 && (
            <div style={{
              fontSize: '0.75rem',
              color: '#3b82f6',
              fontWeight: 'bold',
              marginTop: '0.25rem'
            }}>
              {runningCount} running
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{
        width: '100%',
        height: '8px',
        backgroundColor: '#e5e7eb',
        borderRadius: '4px',
        overflow: 'hidden',
        marginBottom: '1rem'
      }}>
        <div style={{
          width: `${progressPercentage}%`,
          height: '100%',
          backgroundColor: '#10b981',
          transition: 'width 0.3s ease',
        }} />
      </div>

      <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
        {statuses.map((status, index) => {
          const isRunning = status.status === 'running';
          return (
            <div
              key={status.scriptId}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: isRunning ? '1rem' : '0.75rem',
                backgroundColor: isRunning ? '#eff6ff' : '#f9fafb',
                borderRadius: '4px',
                borderLeft: `4px solid ${getStatusColor(status.status)}`,
                transform: isRunning ? 'scale(1.02)' : 'scale(1)',
                transition: 'all 0.3s ease',
                boxShadow: isRunning ? '0 4px 6px rgba(59, 130, 246, 0.1)' : 'none',
                animation: isRunning ? 'pulse 2s infinite' : 'none'
              }}
            >
              <span style={{
                fontSize: isRunning ? '1.75rem' : '1.5rem',
                marginRight: '0.75rem',
                transition: 'font-size 0.3s ease'
              }}>
                {getStatusIcon(status.status)}
              </span>
              <div style={{flex: 1}}>
                <div style={{
                  fontWeight: isRunning ? 'bold' : 'bold',
                  fontSize: isRunning ? '1.05rem' : '1rem',
                  color: isRunning ? '#1e40af' : 'inherit',
                  transition: 'all 0.3s ease'
                }}>
                  {index + 1}. {status.scriptName}
                  {isRunning && <span style={{
                    marginLeft: '0.5rem',
                    fontSize: '0.875rem',
                    color: '#3b82f6',
                    fontWeight: 'normal'
                  }}>← Running now</span>}
                </div>
                <div style={{fontSize: '0.875rem', color: '#6b7280'}}>
                  Status: {status.status}
                  {status.testId && ` • Test ID: ${status.testId}`}
                  {status.startTime && (
                    <>
                      {isRunning ? (
                        <span style={{
                          fontWeight: 'bold',
                          color: '#3b82f6',
                          marginLeft: '0.5rem'
                        }}>
                          • Elapsed: {getElapsedTime(status.startTime)}
                        </span>
                      ) : (
                        ` • Started: ${new Date(status.startTime).toLocaleTimeString()}`
                      )}
                    </>
                  )}
                </div>
              </div>
              {status.testId && (
                <Link
                  to={`/tests/${status.testId}`}
                  style={{
                    padding: '0.25rem 0.75rem',
                    backgroundColor: isRunning ? '#2563eb' : '#3b82f6',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    transition: 'background-color 0.3s ease'
                  }}
                >
                  View
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.95;
          }
        }
      `}</style>
    </div>
  );
};
