import {useNavigate} from 'react-router-dom';
import {k6Api} from '../apis/testApi';
import type {Test} from '../types/test';

export const useTestActions = (testId: string | undefined, testInfo: Test | null) => {
  const navigate = useNavigate();

  const handleStop = async () => {
    if (!testId || !confirm('Are you sure you want to stop this test?')) return;

    try {
      await k6Api.stopTest(testId);
      window.location.reload();
    } catch (err) {
      alert('Failed to stop test: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleDelete = async () => {
    if (!testId || !confirm('Are you sure you want to delete this test result?')) return;

    try {
      await k6Api.deleteTest(testId);
      navigate('/tests');
    } catch (err) {
      alert('Failed to delete test: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleRerun = () => {
    if (!testInfo) return;

    const scriptToRerun = testInfo?.script;

    if (scriptToRerun) {
      sessionStorage.setItem('rerunScript', scriptToRerun);
      navigate('/new-test');
    } else {
      alert('No script available to re-run');
    }
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      alert('Link copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy link.');
    });
  };

  return {
    handleStop,
    handleDelete,
    handleRerun,
    handleCopyLink
  };
};
