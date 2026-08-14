import {useTranslation} from 'react-i18next';
import {Light as SyntaxHighlighter} from 'react-syntax-highlighter';
import {github} from 'react-syntax-highlighter/dist/esm/styles/hljs';
import type {Test} from '../../types/test';
import {Button, EmptyState, InfoBox, Modal, StatusBadge} from '../common';
import styles from './RecentTestsModal.module.css';

const PREVIEW_LENGTH = 500;

interface RecentTestsModalProps {
  show: boolean;
  tests: Test[];
  loading: boolean;
  onClose: () => void;
  onLoadTest: (testId: string) => void;
}

export const RecentTestsModal = ({show, tests, loading, onClose, onLoadTest}: RecentTestsModalProps) => {
  const {t} = useTranslation();

  if (!show) return null;

  return (
    <Modal
      title={t('recentTestsModal.title')}
      size="xl"
      closeLabel={t('common.close')}
      onClose={onClose}
      footer={
        <Button variant="gray" appearance="outline" onClick={onClose}>
          {t('common.close')}
        </Button>
      }
    >
      {loading ? (
        <div className={styles.status} role="status" aria-live="polite">
          {t('recentTestsModal.loadingTests')}
        </div>
      ) : tests.length === 0 ? (
        <EmptyState icon="🧪" title={t('recentTestsModal.noTests')}/>
      ) : (
        <ul className={styles.list}>
          {tests.map(test => (
            <li key={test.testId} className={styles.item}>
              <div className={styles.itemHeader}>
                <div className={styles.itemMeta}>
                  <div className={styles.testId}>{test.testId}</div>
                  <StatusBadge status={test.status}/>
                </div>
                <Button onClick={() => onLoadTest(test.testId)}>
                  {t('recentTestsModal.loadScript')}
                </Button>
              </div>

              <div className={styles.preview}>
                <div className={styles.previewLabel}>{t('recentTestsModal.scriptPreview')}</div>
                <div className={styles.previewBody}>
                  <SyntaxHighlighter
                    language="javascript"
                    style={github}
                    customStyle={{
                      margin: 0,
                      padding: 'var(--space-4)',
                      fontSize: 'var(--text-xs)',
                      backgroundColor: 'transparent'
                    }}
                  >
                    {test.script.substring(0, PREVIEW_LENGTH) + (test.script.length > PREVIEW_LENGTH ? '...' : '')}
                  </SyntaxHighlighter>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <InfoBox variant="info">{t('recentTestsModal.tip')}</InfoBox>
    </Modal>
  );
};
