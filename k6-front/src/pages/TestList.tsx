import {useEffect, useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {k6Api} from '../apis/testApi.ts';
import type {Test} from '../types/test.ts';
import {TestSummaryComparison, TestTable} from '../components/test-list';
import {Button, InfoBox, TestNameModal} from '../components/common';

const MAX_COMPARISON_TESTS = 5;

export const TestList = () => {
  const {t} = useTranslation();
  const navigate = useNavigate();
  const [allTests, setAllTests] = useState<Test[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rerunTarget, setRerunTarget] = useState<Test | null>(null);
  const [rerunLoading, setRerunLoading] = useState(false);
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);

  const fetchTests = async (cursor: number | null = null, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const data = await k6Api.getTests(cursor, 30);

      if (append) {
        setAllTests(prev => [...prev, ...data.tests]);
      } else {
        setAllTests(data.tests);
      }

      setNextCursor(data.pagination.nextCursor);
      setHasMore(data.pagination.hasMore);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tests');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  useEffect(() => {
    setSelectedTestIds(prev => prev.filter(testId => allTests.some(test => test.testId === testId)));
  }, [allTests]);

  useEffect(() => {
    const handleScroll = () => {
      if (loadingMore || !hasMore) return;

      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      if (scrollTop + windowHeight >= documentHeight * 0.8) {
        fetchTests(nextCursor, true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [nextCursor, hasMore, loadingMore]);

  const handleRerun = (testId: string) => {
    const test = allTests.find(t => t.testId === testId);

    if (!test) {
      alert(t('testList.testNotFound'));
      return;
    }

    setRerunTarget(test);
  };

  const handleRerunConfirm = async (name?: string, scheduledAt?: number) => {
    if (!rerunTarget) return;

    try {
      setRerunLoading(true);
      const test = await k6Api.getTest(rerunTarget.testId);
      if (test?.script) {
        const result = await k6Api.runTest(test.script, {
          name: name || test.name || test.config?.name,
          config: test.config,
          ...(test.scriptId && {scriptId: test.scriptId}),
          ...(scheduledAt && {scheduledAt})
        });
        navigate(`/tests/${result.testId}`);
      } else {
        alert(t('testList.noScriptAvailable'));
      }
    } catch {
      alert(t('testList.failedToStartTest'));
    } finally {
      setRerunLoading(false);
    }
  };

  const handleToggleSelection = (testId: string) => {
    setSelectedTestIds(prev => {
      if (prev.includes(testId)) {
        return prev.filter(selectedTestId => selectedTestId !== testId);
      }

      const test = allTests.find(current => current.testId === testId);
      if (!test?.summary || prev.length >= MAX_COMPARISON_TESTS) {
        return prev;
      }

      return [...prev, testId];
    });
  };

  const selectedTests = selectedTestIds
    .map(testId => allTests.find(test => test.testId === testId))
    .filter((test): test is Test => Boolean(test));

  if (loading) return <div>{t('common.loading')}</div>;
  if (error) return <div style={{color: 'red'}}>{t('common.error')}: {error}</div>;

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <h1 style={{margin: 0, fontSize: 'clamp(1.5rem, 5vw, 2rem)'}}>{t('testList.title')}</h1>
      </div>

      <InfoBox variant="info">
        {t('testList.infoMessage')}
      </InfoBox>

      {!allTests || allTests.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          padding: '3rem',
          borderRadius: '8px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <p>{t('testList.noTests')}</p>
          <Link to="/new-test" style={{color: '#3b82f6'}}>{t('testList.createFirstTest')}</Link>
        </div>
      ) : (
        <>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            padding: '1rem',
            marginBottom: '1rem'
          }}>
            <div>
              <div style={{fontWeight: 700, color: '#111827'}}>
                {t('testList.compareTests')}
              </div>
              <div style={{fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem'}}>
                {t('testList.selectedCount', {count: selectedTestIds.length, max: MAX_COMPARISON_TESTS})}
              </div>
            </div>
            <Button
              variant="gray"
              disabled={selectedTestIds.length === 0}
              onClick={() => setSelectedTestIds([])}
            >
              {t('testList.clearSelection')}
            </Button>
          </div>

          <TestSummaryComparison tests={selectedTests}/>

          <TestTable
            tests={allTests}
            onRerun={handleRerun}
            rerunningTestId={rerunLoading ? rerunTarget?.testId : undefined}
            selectedTestIds={selectedTestIds}
            onToggleSelection={handleToggleSelection}
            canSelectTest={test => Boolean(test.summary)}
            isSelectionLimitReached={selectedTestIds.length >= MAX_COMPARISON_TESTS}
          />

          {loadingMore && (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              color: '#6b7280',
              fontSize: '0.875rem'
            }}>
              {t('testList.loadingMore')}
            </div>
          )}

          {!loadingMore && hasMore && (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              color: '#6b7280',
              fontSize: '0.875rem'
            }}>
              {t('testList.scrollToLoadMore')}
            </div>
          )}

          {!hasMore && allTests.length > 0 && (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              color: '#6b7280',
              fontSize: '0.875rem'
            }}>
              {t('testList.allLoaded')}
            </div>
          )}
        </>
      )}

      {rerunTarget && (
        <TestNameModal
          initialName={rerunTarget.name || rerunTarget.config?.name || ''}
          loading={rerunLoading}
          onCancel={() => setRerunTarget(null)}
          onConfirm={handleRerunConfirm}
        />
      )}
    </div>
  );
};
