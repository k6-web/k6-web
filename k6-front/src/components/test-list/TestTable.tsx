import {useTranslation} from 'react-i18next';
import type {Test} from '../../types/test';
import {TestTableRow} from './TestTableRow';
import styles from './TestTable.module.css';

interface TestTableProps {
  tests: Test[];
  onRerun?: (testId: string) => void;
  rerunningTestId?: string;
  selectedTestIds?: string[];
  onToggleSelection?: (testId: string) => void;
  canSelectTest?: (test: Test) => boolean;
  isSelectionLimitReached?: boolean;
}

export const TestTable = ({
  tests,
  onRerun,
  rerunningTestId,
  selectedTestIds = [],
  onToggleSelection,
  canSelectTest,
  isSelectionLimitReached = false
}: TestTableProps) => {
  const {t} = useTranslation();
  const hasSelection = Boolean(onToggleSelection);

  return (
    <div className={styles.wrapper} tabIndex={0} role="group" aria-label={t('testList.title')}>
      <table className={styles.table}>
        <thead>
          <tr>
            {hasSelection && (
              <th scope="col" className={styles.selectColumn}>{t('testList.compare')}</th>
            )}
            <th scope="col">{t('common.name')} / {t('testDetail.testId')}</th>
            <th scope="col">{t('common.status')}</th>
            <th scope="col">{t('scriptDetail.scriptId')}</th>
            <th scope="col">RPS</th>
            <th scope="col">{t('metrics.httpReqDuration')}</th>
            <th scope="col">Success</th>
            <th scope="col">{t('testDetail.startTime')}</th>
            <th scope="col">{t('testDetail.duration')}</th>
            <th scope="col" className={styles.actionsColumn}>{t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {tests.map(test => (
            <TestTableRow
              key={test.testId}
              test={test}
              onRerun={onRerun}
              isRerunning={rerunningTestId === test.testId}
              isSelected={selectedTestIds.includes(test.testId)}
              onToggleSelection={onToggleSelection}
              canSelect={canSelectTest ? canSelectTest(test) : true}
              isSelectionLimitReached={isSelectionLimitReached}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};
