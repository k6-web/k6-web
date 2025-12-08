import {useEffect, useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {k6Api} from '../apis/testApi.ts';
import type {Test} from '../types/test.ts';
import {TestTable} from '../components/test-list';
import {InfoBox} from '../components/common';

export const TestList = () => {
  const navigate = useNavigate();
  const [allTests, setAllTests] = useState<Test[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());

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

  const toggleTestExpand = (testId: string) => {
    const newExpanded = new Set(expandedTests);

    if (newExpanded.has(testId)) {
      newExpanded.delete(testId);
    } else {
      newExpanded.add(testId);
    }

    setExpandedTests(newExpanded);
  };

  const handleRerun = async (testId: string) => {
    const test = allTests.find(t => t.testId === testId);

    if (!test) {
      alert('Test not found');
      return;
    }

    try {
      const result = await k6Api.getTest(testId);
      if (result?.script) {
        sessionStorage.setItem('rerunScript', result.script);
        navigate('/new-test');
      } else {
        alert('No script available to re-run');
      }
    } catch (err) {
      alert('Failed to load test script');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div style={{color: 'red'}}>Error: {error}</div>;

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
        <h1 style={{margin: 0, fontSize: 'clamp(1.5rem, 5vw, 2rem)'}}>Test History</h1>
        <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
          <Link
            to="/new-test"
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              display: 'inline-block',
              fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
              fontWeight: 'bold'
            }}
          >
            New Test
          </Link>
        </div>
      </div>

      <InfoBox variant="info">
        ℹ️ Test history is kept up to a maximum of 500 tests in descending order.
      </InfoBox>

      {!allTests || allTests.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          padding: '3rem',
          borderRadius: '8px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <p>No tests found.</p>
          <Link to="/new-test" style={{color: '#3b82f6'}}>Create your first test</Link>
        </div>
      ) : (
        <>
          <TestTable
            tests={allTests}
            expandedTests={expandedTests}
            onToggleExpand={toggleTestExpand}
            onRerun={handleRerun}
          />

          {loadingMore && (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              color: '#6b7280',
              fontSize: '0.875rem'
            }}>
              Loading more tests...
            </div>
          )}

          {!loadingMore && hasMore && (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              color: '#6b7280',
              fontSize: '0.875rem'
            }}>
              Scroll down to load more tests
            </div>
          )}

          {!hasMore && allTests.length > 0 && (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              color: '#6b7280',
              fontSize: '0.875rem'
            }}>
              All tests loaded
            </div>
          )}
        </>
      )}
    </div>
  );
};
