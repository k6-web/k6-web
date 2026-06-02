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

  const handleRerun = async (name?: string, scheduledAt?: number) => {
    if (!testInfo) return;

    const scriptToRerun = testInfo?.script;

    if (scriptToRerun) {
      const result = await k6Api.runTest(scriptToRerun, {
        name: name || testInfo.name || testInfo.config?.name,
        config: testInfo.config,
        ...(testInfo.scriptId && {scriptId: testInfo.scriptId}),
        ...(scheduledAt && {scheduledAt})
      });
      navigate(`/tests/${result.testId}`);
    } else {
      alert(t('testList.noScriptAvailable'));
    }
  };

  const handleCopyScript = () => {
    if (!testInfo?.script) {
      alert(t('testList.noScriptAvailable'));
      return;
    }

    navigate('/new-test', {
      state: {
        copiedScript: {
          script: testInfo.script,
          config: testInfo.config,
          saveAsScript: true
        }
      }
    });
  };

  const handleEditScript = () => {
    if (!testInfo?.script) {
      alert(t('testList.noScriptAvailable'));
      return;
    }

    if (testInfo.scriptId) {
      navigate(`/scripts/${testInfo.scriptId}?edit=true`);
      return;
    }

    navigate('/new-test', {
      state: {
        copiedScript: {
          script: testInfo.script,
          config: testInfo.config,
          saveAsScript: false
        }
      }
    });
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
    handleCopyScript,
    handleEditScript,
    handleCopyLink
  };
};
