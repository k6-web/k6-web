import {useTranslation} from 'react-i18next';
import type {Test} from '../../types/test';
import {TestTableRow} from './TestTableRow';

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
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      overflow: 'auto',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <table style={{width: '100%', borderCollapse: 'collapse', minWidth: '800px'}}>
        <thead style={{backgroundColor: '#f9fafb'}}>
          <tr>
            {hasSelection && (
              <th style={{width: '56px', padding: '1rem', textAlign: 'center', borderBottom: '1px solid #e5e7eb'}}>
                {t('testList.compare')}
              </th>
            )}
            <th style={{padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb'}}>{t('common.name')} / {t('testDetail.testId')}</th>
            <th style={{padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb'}}>{t('common.status')}</th>
            <th style={{padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb'}}>{t('scriptDetail.scriptId')}</th>
            <th style={{padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb'}}>RPS</th>
            <th style={{padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb'}}>{t('metrics.httpReqDuration')}</th>
            <th style={{padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb'}}>Success</th>
            <th style={{padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb'}}>{t('testDetail.startTime')}</th>
            <th style={{padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb'}}>{t('testDetail.duration')}</th>
            <th style={{padding: '1rem', textAlign: 'center', borderBottom: '1px solid #e5e7eb'}}>{t('common.actions')}</th>
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
