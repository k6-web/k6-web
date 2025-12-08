import {useEffect, useRef, useState} from 'react';
import {k6Api} from '../apis/testApi';
import type {LogEntry} from '../types/log';
import type {Test} from '../types/test';
import {parseK6TimeSeriesData} from '../utils/k6Parser';

export const useLiveLogs = (testId: string | undefined, testInfo: Test | null) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [livePerformanceData, setLivePerformanceData] = useState<{ time: number; vus: number; tps: number }[]>([]);
  const [logFilter, setLogFilter] = useState<'all' | 'stdout' | 'stderr' | 'error' | 'system'>('all');
  const [autoScroll, setAutoScroll] = useState(false);

  const logsContainerRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (testInfo?.status === 'running' && logsEndRef.current && autoScroll) {
      logsEndRef.current.scrollIntoView({behavior: 'smooth'});
    }
  }, [logs, testInfo?.status, autoScroll]);

  useEffect(() => {
    const container = logsContainerRef.current;
    if (!container || !autoScroll) return;

    const handleUserScroll = () => {
      setAutoScroll(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) {
        setAutoScroll(false);
      }
    };

    container.addEventListener('wheel', handleUserScroll, {passive: true});
    container.addEventListener('touchmove', handleUserScroll, {passive: true});
    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('wheel', handleUserScroll);
      container.removeEventListener('touchmove', handleUserScroll);
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [autoScroll]);

  useEffect(() => {
    if (!testId || !testInfo || testInfo.status !== 'running') return;

    let accumulatedOutput = '';
    const eventSource = new EventSource(k6Api.getTestLogStreamUrl(testId));

    eventSource.onmessage = (event) => {
      const log: LogEntry = JSON.parse(event.data);
      setLogs(prev => [...prev, log]);

      if (log.type === 'stderr' || log.type === 'error') {
        setErrorCount(prev => prev + 1);
      }

      if (log.type === 'stdout') {
        accumulatedOutput += log.message;

        const parsedData = parseK6TimeSeriesData(accumulatedOutput);
        setLivePerformanceData(parsedData);

        const progressMatch = /\[\s*(\d+)%\s*\]/u.exec(log.message);
        if (progressMatch) {
          setProgress(Number.parseInt(progressMatch[1], 10));
        }
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [testId, testInfo]);

  const scrollToTop = () => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTo({top: 0, behavior: 'smooth'});
      setAutoScroll(false);
    }
  };

  const scrollToBottom = () => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({behavior: 'smooth'});
    }
  };

  const toggleAutoScroll = () => {
    setAutoScroll(prev => !prev);
    if (!autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({behavior: 'smooth'});
    }
  };

  return {
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
  };
};
