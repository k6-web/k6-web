import {useTranslation} from 'react-i18next';
import type {Test} from '../../types/test';
import {TestTableRow} from './TestTableRow';

interface TestTableProps {
  tests: Test[];
  expandedTests: Set<string>;
  onToggleExpand: (testId: string) => void;
  onRerun?: (testId: string) => void;
}

export const TestTable = ({tests, expandedTests, onToggleExpand, onRerun}: TestTableProps) => {
  const {t} = useTranslation();
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
            <th style={{padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb', width: '40px'}}></th>
            <th style={{padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb'}}>{t('common.name')} / {t('testDetail.testId')}</th>
            <th style={{padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb'}}>{t('common.status')}</th>
            <th style={{padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb'}}>{t('scriptDetail.scriptId')}</th>
            <th style={{padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb'}}>TPS</th>
            <th style={{padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb'}}>Latency</th>
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
              isExpanded={expandedTests.has(test.testId)}
              onToggleExpand={onToggleExpand}
              onRerun={onRerun}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};
