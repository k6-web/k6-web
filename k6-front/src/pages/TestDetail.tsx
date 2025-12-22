import {useParams} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {
  TestHeader,
  TestInfoCard,
  ScriptDisplay,
  PerformanceChart,
  LiveLogsPanel,
  MetricsGrid,
  SummaryDetails
} from '../components/test-detail';
import {useTestDetail} from '../hooks/useTestDetail';
import {useLiveLogs} from '../hooks/useLiveLogs';
import {useTestActions} from '../hooks/useTestActions';

export const TestDetail = () => {
  const {t} = useTranslation();
  const {testId} = useParams<{ testId: string }>();
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
  const {handleStop, handleDelete, handleRerun, handleCopyLink} = useTestActions(testId, testInfo);

  if (loading) return <div>{t('common.loading')}</div>;
  if (error) return <div style={{color: 'red'}}>{t('common.error')}: {error}</div>;
  if (!testInfo || !testId) return <div>{t('testList.testNotFound')}</div>;

  const timeSeriesData = testInfo.status === 'running' ? livePerformanceData : [];

  return (
    <div>
      <TestHeader
        testId={testId}
        testName={testInfo.name}
        status={testInfo.status}
        onStop={handleStop}
        onRerun={handleRerun}
        onDelete={handleDelete}
        onCopyLink={handleCopyLink}
      />

      <TestInfoCard test={testInfo} progress={progress} errorCount={errorCount}/>

      {testInfo.script && <ScriptDisplay script={testInfo.script}/>}

      {timeSeriesData.length > 0 && (
        <PerformanceChart data={timeSeriesData} isLive={testInfo.status === 'running'}/>
      )}

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
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{
            marginTop: 0,
            marginBottom: '1rem',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            ⚠️ {t('testDetail.errorLogs')}
          </h2>
          <div style={{
            backgroundColor: '#1f2937',
            color: '#f3f4f6',
            padding: '1rem',
            borderRadius: '4px',
            maxHeight: '400px',
            overflow: 'auto',
            fontFamily: 'Monaco, Consolas, "Courier New", monospace',
            fontSize: '0.875rem',
            lineHeight: '1.5'
          }}>
            {testInfo.logs.map((log, index) => (
              <div
                key={index}
                style={{
                  padding: '0.25rem 0',
                  color: log.type === 'stderr' || log.type === 'error' ? '#fca5a5' : '#d1d5db'
                }}
              >
                <span style={{color: '#9ca3af', marginRight: '0.5rem'}}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span style={{
                  color: log.type === 'stderr' || log.type === 'error' ? '#fca5a5' : '#60a5fa',
                  marginRight: '0.5rem',
                  fontWeight: 'bold'
                }}>
                  [{log.type}]
                </span>
                <span>{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {testInfo?.summary && (
        <>
          <MetricsGrid summary={testInfo.summary}/>
          <SummaryDetails summary={testInfo.summary}/>
        </>
      )}
    </div>
  );
};
