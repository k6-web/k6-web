import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Light as SyntaxHighlighter} from 'react-syntax-highlighter';
import {github} from 'react-syntax-highlighter/dist/esm/styles/hljs';

interface ScriptDisplayProps {
  script: string;
}

export const ScriptDisplay = ({script}: ScriptDisplayProps) => {
  const {t} = useTranslation();
  const [expanded, setExpanded] = useState(true);

  return (
    <div
      style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '1.5rem'
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: expanded ? '1rem' : 0
      }}>
        <h2 style={{margin: 0}}>{t('testDetail.script')}</h2>
        <button
          type="button"
          onClick={() => setExpanded(current => !current)}
          aria-expanded={expanded}
          style={{
            padding: '0.375rem 0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            backgroundColor: 'white',
            color: '#374151',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 600
          }}
        >
          {expanded ? t('common.collapse') : t('common.expand')}
        </button>
      </div>

      {expanded && (
        <SyntaxHighlighter
          language="javascript"
          style={github}
          customStyle={{
            borderRadius: '4px',
            fontSize: '0.875rem',
            margin: 0,
            backgroundColor: '#f6f8fa'
          }}
          showLineNumbers={true}
        >
          {script}
        </SyntaxHighlighter>
      )}
    </div>
  );
};
