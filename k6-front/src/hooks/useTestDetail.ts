import {useEffect, useState} from 'react';
import {k6Api} from '../apis/testApi';
import type {Test} from '../types/test';

export const useTestDetail = (testId: string | undefined) => {
  const [testInfo, setTestInfo] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!testId) return;

    const fetchTestInfo = async () => {
      try {
        const info = await k6Api.getTest(testId);
        setTestInfo(info);

        if (info.status !== 'running') {
          const result = await k6Api.getTest(testId);
          setTestInfo(result);
        }

        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch test');
      } finally {
        setLoading(false);
      }
    };

    fetchTestInfo();

    if (testInfo?.status === 'running') {
      const interval = setInterval(fetchTestInfo, 2000);
      return () => clearInterval(interval);
    }
  }, [testId, testInfo?.status]);

  return {testInfo, loading, error};
};
