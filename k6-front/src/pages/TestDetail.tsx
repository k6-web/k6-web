import {useParams} from 'react-router-dom';
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

  if (loading) return <div>Loading...</div>;
  if (error) return <div style={{color: 'red'}}>Error: {error}</div>;
  if (!testInfo || !testId) return <div>Test not found</div>;

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

      {testInfo?.summary && (
        <>
          <MetricsGrid summary={testInfo.summary}/>
          <SummaryDetails summary={testInfo.summary}/>
        </>
      )}
    </div>
  );
};
