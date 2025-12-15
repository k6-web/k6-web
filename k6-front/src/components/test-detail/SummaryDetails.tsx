import {useTranslation} from 'react-i18next';
import type {K6Summary} from '../../types/k6';

interface SummaryDetailsProps {
  summary: K6Summary;
}

export const SummaryDetails = ({summary}: SummaryDetailsProps) => {
  const {t} = useTranslation();

  return (
    <details style={{
      backgroundColor: 'white',
      padding: '1.5rem',
      borderRadius: '8px',
      marginBottom: '1.5rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <summary style={{
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '1.125rem',
        userSelect: 'none'
      }}>
        {t('testDetail.summary')} (JSON)
      </summary>
      <pre style={{
        backgroundColor: '#1e1e1e',
        color: '#d4d4d4',
        padding: '1rem',
        borderRadius: '4px',
        maxHeight: '800px',
        overflow: 'auto',
        fontSize: '0.875rem',
        fontFamily: 'monospace',
        marginTop: '1rem'
      }}>
        {JSON.stringify(summary, null, 2)}
      </pre>
    </details>
  );
};
