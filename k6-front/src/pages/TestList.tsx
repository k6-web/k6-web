import {useCallback, useEffect, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {k6Api} from '../apis/testApi.ts';
import type {Test} from '../types/test.ts';
import {TestSummaryComparison, TestTable} from '../components/test-list';
import {
  Button,
  EmptyState,
  ErrorState,
  InfoBox,
  LinkButton,
  PageHeader,
  SkeletonList,
  TestNameModal,
  useToast
} from '../components/common';
import styles from './TestList.module.css';

const MAX_COMPARISON_TESTS = 5;
const PAGE_SIZE = 30;

export const TestList = () => {
  const {t} = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();

  const [allTests, setAllTests] = useState<Test[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rerunTarget, setRerunTarget] = useState<Test | null>(null);
  const [rerunLoading, setRerunLoading] = useState(false);
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);

  const fetchTests = useCallback(async (cursor: number | null = null, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const data = await k6Api.getTests(cursor, PAGE_SIZE);

      setAllTests(prev => (append ? [...prev, ...data.tests] : data.tests));
      setNextCursor(data.pagination.nextCursor);
      setHasMore(data.pagination.hasMore);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tests');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  useEffect(() => {
    setSelectedTestIds(prev => prev.filter(testId => allTests.some(test => test.testId === testId)));
  }, [allTests]);

  // A sentinel keeps infinite scroll off the scroll event and avoids stale reads.
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || loadingMore || loading) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          fetchTests(nextCursor, true);
        }
      },
      {rootMargin: '200px'}
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, nextCursor, fetchTests]);

  const handleRerun = (testId: string) => {
    const test = allTests.find(current => current.testId === testId);

    if (!test) {
      toast.error(t('testList.testNotFound'));
      return;
    }

    setRerunTarget(test);
  };

  const handleRerunConfirm = async (name?: string, scheduledAt?: number) => {
    if (!rerunTarget) return;

    try {
      setRerunLoading(true);
      const test = await k6Api.getTest(rerunTarget.testId);

      if (!test?.script) {
        toast.error(t('testList.noScriptAvailable'));
        return;
      }

      const result = await k6Api.runTest(test.script, {
        name: name || test.name || test.config?.name,
        config: test.config,
        ...(test.scriptId && {scriptId: test.scriptId}),
        ...(scheduledAt && {scheduledAt})
      });
      navigate(`/tests/${result.testId}`);
    } catch {
      toast.error(t('testList.failedToStartTest'));
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

  if (loading) {
    return (
      <div>
        <PageHeader title={t('testList.title')}/>
        <SkeletonList rows={6} label={t('common.loading')}/>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title={t('testList.title')}/>
        <ErrorState message={`${t('common.error')}: ${error}`} onRetry={() => fetchTests()}/>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t('testList.title')}
        actions={
          <LinkButton to="/new-test" variant="secondary">
            + {t('nav.newTest')}
          </LinkButton>
        }
      />

      <InfoBox variant="info">{t('testList.infoMessage')}</InfoBox>

      {allTests.length === 0 ? (
        <EmptyState
          icon="🧪"
          title={t('testList.noTests')}
          action={
            <LinkButton to="/new-test" variant="secondary">
              {t('testList.createFirstTest')}
            </LinkButton>
          }
        />
      ) : (
        <>
          <div className={styles.compareBar}>
            <div>
              <div className={styles.compareTitle}>{t('testList.compareTests')}</div>
              <div className={styles.compareHint}>
                {t('testList.selectedCount', {count: selectedTestIds.length, max: MAX_COMPARISON_TESTS})}
              </div>
            </div>
            <Button
              variant="gray"
              appearance="outline"
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

          <div ref={sentinelRef} aria-hidden="true"/>

          <div className={styles.listStatus} role="status" aria-live="polite">
            {loadingMore && t('testList.loadingMore')}
            {!loadingMore && hasMore && t('testList.scrollToLoadMore')}
            {!hasMore && t('testList.allLoaded')}
          </div>
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
