import {useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {k6Api} from '../apis/testApi';
import type {Test} from '../types/test';

export const useTestActions = (testId: string | undefined, testInfo: Test | null) => {
  const navigate = useNavigate();
  const {t} = useTranslation();

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
      if (testInfo.config) {
        sessionStorage.setItem('rerunConfig', JSON.stringify(testInfo.config));
      } else {
        sessionStorage.removeItem('rerunConfig');
      }
      navigate('/new-test');
    } else {
      alert('No script available to re-run');
    }
  };

  const handleCopyLink = () => {
    const url = window.location.href;

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(() => {
        alert(t('common.linkCopied'));
      }).catch(() => {
        fallbackCopy(url);
      });
    } else {
      fallbackCopy(url);
    }
  };

  const fallbackCopy = (text: string) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert(t('common.linkCopied'));
    } catch {
      alert(t('common.failedToCopyLink'));
    }
  };

  return {
    handleStop,
    handleDelete,
    handleRerun,
    handleCopyLink
  };
};
