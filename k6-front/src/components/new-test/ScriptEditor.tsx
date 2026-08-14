import {useTranslation} from 'react-i18next';
import {useEffect, useId, useRef} from 'react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/themes/prism.css';
import styles from './ScriptEditor.module.css';

interface ScriptEditorProps {
  script: string;
  syntaxError: string | null;
  onScriptChange: (script: string) => void;
  embedded?: boolean;
}

export const ScriptEditor = ({script, syntaxError, onScriptChange, embedded = false}: ScriptEditorProps) => {
  const {t} = useTranslation();
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const errorId = useId();

  const lineCount = script.split('\n').length;

  // Keep the gutter aligned with the code as it scrolls.
  useEffect(() => {
    const editorWrapper = editorWrapperRef.current;
    const lineNumbers = lineNumbersRef.current;

    if (!editorWrapper || !lineNumbers) return;

    const handleScroll = () => {
      lineNumbers.scrollTop = editorWrapper.scrollTop;
    };

    editorWrapper.addEventListener('scroll', handleScroll);
    return () => editorWrapper.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={`${styles.panel} ${embedded ? styles.embedded : ''}`.trim()}>
      {!embedded && <h2 className={styles.title}>{t('scriptEditor.title')}</h2>}

      <div className={styles.body}>
        {embedded && <span className={styles.label}>{t('scriptEditor.title')} *</span>}

        <div className={styles.editorShell}>
          <div ref={lineNumbersRef} className={styles.gutter} aria-hidden="true">
            {Array.from({length: lineCount}, (_, index) => (
              <div key={index} className={styles.lineNumber}>{index + 1}</div>
            ))}
          </div>

          <div ref={editorWrapperRef} className={styles.editorScroll}>
            <Editor
              value={script}
              onValueChange={onScriptChange}
              highlight={(code) => Prism.highlight(code, Prism.languages.javascript, 'javascript')}
              padding={16}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-sm)',
                lineHeight: '1.5',
                minHeight: '600px',
                backgroundColor: 'transparent',
                outline: 'none',
                color: 'var(--gray-800)'
              }}
              textareaClassName={styles.editorTextarea}
              aria-label={t('scriptEditor.title')}
              aria-describedby={syntaxError ? errorId : undefined}
              aria-invalid={syntaxError ? true : undefined}
            />
          </div>
        </div>

        {syntaxError && (
          <div id={errorId} className={styles.syntaxError} role="alert">
            <span className={styles.icon} aria-hidden="true">⚠️</span>
            <div>
              <strong>{t('scriptEditor.syntaxError')}:</strong> {syntaxError}
            </div>
          </div>
        )}

        <div className={styles.guide}>
          <span className={styles.icon} aria-hidden="true">📖</span>
          <a
            href="https://grafana.com/docs/k6/latest/using-k6/"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.guideLink}
          >
            {t('scriptEditor.guideLink')}
          </a>
        </div>
      </div>
    </div>
  );
};
