import {useTranslation} from 'react-i18next';
import {Link} from 'react-router-dom';
import type {Test} from '../../types/test';
import {Card} from '../common';
import {formatElapsedDuration} from '../../utils/formatUtils';
import styles from './TestInfoCard.module.css';

interface TestInfoCardProps {
  test: Test;
  progress?: number;
  errorCount?: number;
}

export const TestInfoCard = ({test, progress = 0, errorCount = 0}: TestInfoCardProps) => {
  const {t} = useTranslation();
  const isRunning = test.status === 'running';

  return (
    <Card title={t('testDetail.info')}>
      <div className={styles.grid}>
        <div>
          <div className={styles.label}>{t('common.status')}</div>
          <div className={`${styles.status} ${styles[test.status] ?? ''}`.trim()}>
            {t(`testDetail.${test.status}`).toUpperCase()}
          </div>
        </div>

        {test.scriptId && (
          <div>
            <div className={styles.label}>{t('scriptDetail.scriptId')}</div>
            <Link to={`/scripts/${test.scriptId}`} className={styles.scriptLink}>
              {test.scriptId}
            </Link>
          </div>
        )}

        {isRunning && progress > 0 && (
          <div>
            <div className={styles.label}>{t('testDetail.progress')}</div>
            <div className={styles.progressValue}>{progress}%</div>
            <div
              className={styles.progressTrack}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t('testDetail.progress')}
            >
              <div className={styles.progressBar} style={{width: `${progress}%`}}/>
            </div>
          </div>
        )}

        {isRunning && errorCount > 0 && (
          <div>
            <div className={styles.label}>{t('common.error')}</div>
            <div className={styles.errorCount}>{errorCount}</div>
          </div>
        )}

        <div>
          <div className={styles.label}>{t('testDetail.startTime')}</div>
          <div className={styles.value}>{new Date(test.startTime).toLocaleString()}</div>
        </div>

        {test.scheduledAt && (
          <div>
            <div className={styles.label}>{t('testNameModal.scheduledTime')}</div>
            <div className={styles.value}>{new Date(test.scheduledAt).toLocaleString()}</div>
          </div>
        )}

        {test.queuedAt && (
          <div>
            <div className={styles.label}>{t('testDetail.queuedTime')}</div>
            <div className={styles.value}>{new Date(test.queuedAt).toLocaleString()}</div>
          </div>
        )}

        {test.endTime && (
          <>
            <div>
              <div className={styles.label}>{t('testDetail.endTime')}</div>
              <div className={styles.value}>{new Date(test.endTime).toLocaleString()}</div>
            </div>
            <div>
              <div className={styles.label}>{t('testDetail.duration')}</div>
              <div className={styles.value}>{formatElapsedDuration(test.endTime - test.startTime)}</div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
};
