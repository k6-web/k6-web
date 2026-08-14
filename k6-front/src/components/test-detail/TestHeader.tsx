import {useTranslation} from 'react-i18next';
import type {TestStatus} from '../../types/test';
import {Button, StatusBadge} from '../common';
import styles from './TestHeader.module.css';

const IN_FLIGHT_STATUSES = ['scheduled', 'queued', 'running'];

interface TestHeaderProps {
  testId: string;
  testName?: string;
  status: string;
  onStop: () => void;
  onRerun: () => void;
  onCopyScript: () => void;
  onEditScript: () => void;
  onDelete: () => void;
  onCopyLink: () => void;
  canRerun: boolean;
  canEditScript: boolean;
}

export const TestHeader = ({
  testId,
  testName,
  status,
  onStop,
  onRerun,
  onCopyScript,
  onEditScript,
  onDelete,
  onCopyLink,
  canRerun,
  canEditScript
}: TestHeaderProps) => {
  const {t} = useTranslation();
  const isInFlight = IN_FLIGHT_STATUSES.includes(status);

  return (
    <div className={styles.header}>
      <div className={styles.titleGroup}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{testName || `Test: ${testId}`}</h1>
          <StatusBadge status={status as TestStatus}/>
        </div>
        {testName && <p className={styles.testId}>ID: {testId}</p>}
      </div>

      <div className={styles.actions}>
        {isInFlight ? (
          <Button variant="danger" onClick={onStop}>
            {t('common.cancel')}
          </Button>
        ) : (
          <>
            <Button variant="purple" onClick={onCopyLink}>
              Share
            </Button>
            <Button
              variant="success"
              onClick={onRerun}
              disabled={!canRerun}
              title={canRerun ? t('testList.rerun') : t('testList.noScriptAvailable')}
            >
              {t('testList.rerun')}
            </Button>
            <Button onClick={onCopyScript}>
              {t('testDetail.openAsNewTest')}
            </Button>
            <Button
              variant="gray"
              appearance="outline"
              onClick={onEditScript}
              disabled={!canEditScript}
              title={canEditScript ? t('testDetail.editScript') : t('testDetail.noSavedScriptAvailable')}
            >
              {t('testDetail.editScript')}
            </Button>
            <Button variant="danger" appearance="outline" onClick={onDelete}>
              {t('common.delete')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
