import {useTranslation} from 'react-i18next';
import type {LogEntry} from '../../types/log';
import {Button, Card} from '../common';
import styles from './LiveLogsPanel.module.css';

type LogFilter = 'all' | 'stdout' | 'stderr' | 'error' | 'system';

const FILTERS: LogFilter[] = ['all', 'stdout', 'stderr', 'error', 'system'];

interface LiveLogsPanelProps {
  logs: LogEntry[];
  logFilter: LogFilter;
  autoScroll: boolean;
  onFilterChange: (filter: LogFilter) => void;
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
  const {t} = useTranslation();
  const visibleLogs = logs.filter(log => logFilter === 'all' || log.type === logFilter);

  return (
    <Card>
      <div className={styles.header}>
        <h2 className={styles.title}>{t('testDetail.logs')}</h2>

        <div className={styles.controls}>
          <div className={styles.filters} role="group" aria-label={t('testDetail.logs')}>
            {FILTERS.map(filter => (
              <button
                key={filter}
                type="button"
                onClick={() => onFilterChange(filter)}
                aria-pressed={logFilter === filter}
                className={`${styles.filter} ${logFilter === filter ? styles.active : ''}`.trim()}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className={styles.divider} aria-hidden="true"/>

          <Button
            variant="gray"
            appearance="outline"
            size="sm"
            onClick={onScrollToTop}
            aria-label={t('testDetail.scrollToTop')}
            title={t('testDetail.scrollToTop')}
          >
            ⬆
          </Button>
          <Button
            variant="gray"
            appearance="outline"
            size="sm"
            onClick={onScrollToBottom}
            aria-label={t('testDetail.scrollToBottom')}
            title={t('testDetail.scrollToBottom')}
          >
            ⬇
          </Button>
          <Button
            variant={autoScroll ? 'secondary' : 'gray'}
            appearance={autoScroll ? 'solid' : 'outline'}
            size="sm"
            onClick={onToggleAutoScroll}
            aria-pressed={autoScroll}
            title={autoScroll ? t('testDetail.disableAutoScroll') : t('testDetail.enableAutoScroll')}
          >
            AUTO
          </Button>
        </div>
      </div>

      <div ref={logsContainerRef} className={styles.console} role="log" aria-live="polite">
        {visibleLogs.length === 0 ? (
          <div className={styles.empty}>{t('testDetail.noLogs')}</div>
        ) : (
          visibleLogs.map((log, index) => {
            const tone = log.type === 'stderr' || log.type === 'error'
              ? styles.error
              : log.type === 'system'
                ? styles.system
                : '';

            return (
              <div key={index} className={`${styles.logLine} ${tone}`.trim()}>
                [{new Date(log.timestamp).toLocaleTimeString()}] {log.message}
              </div>
            );
          })
        )}
        <div ref={logsEndRef}/>
      </div>
    </Card>
  );
};
