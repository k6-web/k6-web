import type {LogEntry} from '../../types/log';
import {Card} from '../common';

interface LiveLogsPanelProps {
  logs: LogEntry[];
  logFilter: 'all' | 'stdout' | 'stderr' | 'error' | 'system';
  autoScroll: boolean;
  onFilterChange: (filter: 'all' | 'stdout' | 'stderr' | 'error' | 'system') => void;
  onScrollToTop: () => void;
  onScrollToBottom: () => void;
  onToggleAutoScroll: () => void;
  logsContainerRef: React.RefObject<HTMLDivElement | null>;
  logsEndRef: React.RefObject<HTMLDivElement | null>;
}

export const LiveLogsPanel = ({
  logs,
  logFilter,
  autoScroll,
  onFilterChange,
  onScrollToTop,
  onScrollToBottom,
  onToggleAutoScroll,
  logsContainerRef,
  logsEndRef
}: LiveLogsPanelProps) => {
  return (
    <Card>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
        <h2 style={{margin: 0}}>Live Logs</h2>
        <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
          {(['all', 'stdout', 'stderr', 'error', 'system'] as const).map(filter => (
            <button
              key={filter}
              onClick={() => onFilterChange(filter)}
              style={{
                padding: '0.25rem 0.75rem',
                fontSize: '0.75rem',
                backgroundColor: logFilter === filter ? '#3b82f6' : '#e5e7eb',
                color: logFilter === filter ? 'white' : '#374151',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                textTransform: 'uppercase',
                fontWeight: logFilter === filter ? 'bold' : 'normal'
              }}
            >
              {filter}
            </button>
          ))}

          <div style={{width: '1px', height: '20px', backgroundColor: '#d1d5db', margin: '0 0.25rem'}}/>

          <button
            onClick={onScrollToTop}
            title="Scroll to top"
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.875rem',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            ⬆️
          </button>

          <button
            onClick={onScrollToBottom}
            title="Scroll to bottom"
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.875rem',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            ⬇️
          </button>

          <button
            onClick={onToggleAutoScroll}
            title={autoScroll ? 'Disable auto-scroll' : 'Enable auto-scroll'}
            style={{
              padding: '0.25rem 0.75rem',
              fontSize: '0.75rem',
              backgroundColor: autoScroll ? '#10b981' : '#e5e7eb',
              color: autoScroll ? 'white' : '#374151',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            {autoScroll ? '🔴' : '⚪'} AUTO
          </button>
        </div>
      </div>
      <div
        ref={logsContainerRef}
        style={{
          backgroundColor: '#1e1e1e',
          color: '#d4d4d4',
          padding: '1rem',
          borderRadius: '4px',
          maxHeight: '400px',
          overflow: 'auto',
          fontSize: '0.875rem',
          fontFamily: 'monospace'
        }}>
        {logs
          .filter(log => logFilter === 'all' || log.type === logFilter)
          .map((log, index) => (
            <div key={index} style={{
              color: log.type === 'stderr' || log.type === 'error' ? '#f87171' :
                log.type === 'system' ? '#60a5fa' : '#d4d4d4'
            }}>
              [{new Date(log.timestamp).toLocaleTimeString()}] {log.message}
            </div>
          ))}
        <div ref={logsEndRef}/>
      </div>
    </Card>
  );
};
