import {useState} from 'react';
import {useParams} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {
  TestHeader,
  TestInfoCard,
  ScriptDisplay,
  PerformanceChart,
  LiveLogsPanel,
  MetricsGrid,
} from '../components/test-detail';
import {useTestDetail} from '../hooks/useTestDetail';
import {useLiveLogs} from '../hooks/useLiveLogs';
import {useTestActions} from '../hooks/useTestActions';
import {EmptyState, ErrorState, SkeletonList, TestNameModal, useToast} from '../components/common';
import styles from './TestDetail.module.css';

export const TestDetail = () => {
  const {t} = useTranslation();
  const {testId} = useParams<{ testId: string }>();
  const toast = useToast();
  const [showRerunModal, setShowRerunModal] = useState(false);
  const [rerunLoading, setRerunLoading] = useState(false);
  const {testInfo, loading, error} = useTestDetail(testId);
  const {
    logs,
    progress,
    errorCount,
    livePerformanceData,
    logFilter,
    autoScroll,
    logsContainerRef,
    logsEndRef,
    setLogFilter,
    scrollToTop,
    scrollToBottom,
    toggleAutoScroll
  } = useLiveLogs(testId, testInfo);
  const {
    handleStop,
    handleDelete,
    handleRerun,
    handleCopyScript,
    handleEditScript,
    handleCopyLink
  } = useTestActions(testId, testInfo);

  const handleRerunConfirm = async (name?: string, scheduledAt?: number) => {
    try {
      setRerunLoading(true);
      await handleRerun(name, scheduledAt);
      setShowRerunModal(false);
    } catch {
      toast.error(t('testList.failedToStartTest'));
    } finally {
      setRerunLoading(false);
    }
  };

  if (loading) return <SkeletonList rows={6} label={t('common.loading')}/>;
  if (error) return <ErrorState message={`${t('common.error')}: ${error}`}/>;
  if (!testInfo || !testId) return <EmptyState icon="🔍" title={t('testList.testNotFound')}/>;

  // Use live data for running tests, snapshot for completed tests
  const timeSeriesData = testInfo.status === 'running'
    ? livePerformanceData
    : (testInfo.timeSeriesSnapshot || []);

  return (
    <div>
      <TestHeader
        testId={testId}
        testName={testInfo.name}
        status={testInfo.status}
        onStop={handleStop}
        onRerun={() => setShowRerunModal(true)}
        onCopyScript={handleCopyScript}
        onEditScript={handleEditScript}
        onDelete={handleDelete}
        onCopyLink={handleCopyLink}
        canRerun={Boolean(testInfo.script)}
        canEditScript={Boolean(testInfo.script)}
      />

      <TestInfoCard test={testInfo} progress={progress} errorCount={errorCount}/>

      {timeSeriesData.length > 0 && (
        <PerformanceChart data={timeSeriesData} isLive={testInfo.status === 'running'}/>
      )}

      {testInfo?.summary && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('testDetail.summaryResult')}</h2>
          <MetricsGrid summary={testInfo.summary}/>
        </section>
      )}

      {testInfo.script && <ScriptDisplay script={testInfo.script}/>}

      {testInfo.status === 'running' && logs.length > 0 && (
        <LiveLogsPanel
          logs={logs}
          logFilter={logFilter}
          autoScroll={autoScroll}
          onFilterChange={setLogFilter}
          onScrollToTop={scrollToTop}
          onScrollToBottom={scrollToBottom}
          onToggleAutoScroll={toggleAutoScroll}
          logsContainerRef={logsContainerRef}
          logsEndRef={logsEndRef}
        />
      )}

      {testInfo.status === 'failed' && testInfo.logs && testInfo.logs.length > 0 && (
        <div className={styles.errorPanel}>
          <h2 className={styles.errorTitle}>
            <span aria-hidden="true">⚠️</span> {t('testDetail.errorLogs')}
          </h2>
          <div className={styles.console}>
            {testInfo.logs.map((log, index) => {
              const isError = log.type === 'stderr' || log.type === 'error';

              return (
                <div key={index} className={`${styles.logLine} ${isError ? styles.stderr : ''}`.trim()}>
                  <span className={styles.timestamp}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={styles.logType}>[{log.type}]</span>
                  <span>{log.message}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showRerunModal && (
        <TestNameModal
          initialName={testInfo.name || testInfo.config?.name || ''}
          loading={rerunLoading}
          onCancel={() => setShowRerunModal(false)}
          onConfirm={handleRerunConfirm}
        />
      )}
    </div>
  );
};
