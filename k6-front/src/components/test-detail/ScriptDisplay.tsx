import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Light as SyntaxHighlighter} from 'react-syntax-highlighter';
import {github} from 'react-syntax-highlighter/dist/esm/styles/hljs';
import {Button} from '../common';
import styles from './ScriptDisplay.module.css';

interface ScriptDisplayProps {
  script: string;
}

export const ScriptDisplay = ({script}: ScriptDisplayProps) => {
  const {t} = useTranslation();
  const [expanded, setExpanded] = useState(true);

  return (
    <div className={styles.panel}>
      <div className={`${styles.header} ${expanded ? styles.expanded : ''}`.trim()}>
        <h2 className={styles.title}>{t('testDetail.script')}</h2>
        <Button
          variant="gray"
          appearance="outline"
          size="sm"
          onClick={() => setExpanded(current => !current)}
          aria-expanded={expanded}
        >
          {expanded ? t('common.collapse') : t('common.expand')}
        </Button>
      </div>

      {expanded && (
        <SyntaxHighlighter
          language="javascript"
          style={github}
          customStyle={{
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-sm)',
            margin: 0,
            backgroundColor: '#f6f8fa'
          }}
          showLineNumbers
        >
          {script}
        </SyntaxHighlighter>
      )}
    </div>
  );
};
