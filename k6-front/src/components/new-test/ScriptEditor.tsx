import {useTranslation} from 'react-i18next';
import {useRef, useEffect} from 'react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/themes/prism.css';

interface ScriptEditorProps {
  script: string;
  syntaxError: string | null;
  onScriptChange: (script: string) => void;
}

export const ScriptEditor = ({script, syntaxError, onScriptChange}: ScriptEditorProps) => {
  const {t} = useTranslation();
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const lineCount = script.split('\n').length;

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
    <div style={{
      backgroundColor: 'white',
      padding: '1.5rem',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <h2 style={{marginTop: 0, marginBottom: '1.5rem'}}>{t('scriptEditor.title')}</h2>

      <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
        <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>
          {t('scriptEditor.title')} *
        </label>
        <div style={{
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          backgroundColor: '#f9fafb',
          flex: 1,
          minHeight: '600px',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex'
        }}>
          <style>{`
            .line-numbers-gutter {
              background-color: #f3f4f6;
              border-right: 1px solid #d1d5db;
              padding: 16px 8px 16px 16px;
              text-align: right;
              user-select: none;
              overflow: hidden;
              min-width: 50px;
            }
            .line-numbers-gutter .line-number {
              display: block;
              font-family: Monaco, Consolas, "Courier New", monospace;
              font-size: 0.875rem;
              line-height: 1.5;
              color: #6b7280;
            }
            .code-editor-wrapper {
              flex: 1;
              overflow: auto;
            }
            .code-editor-textarea {
              outline: none !important;
            }
          `}</style>

          {/* Line numbers - separate non-editable area */}
          <div ref={lineNumbersRef} className="line-numbers-gutter">
            {Array.from({length: lineCount}, (_, i) => (
              <div key={i} className="line-number">{i + 1}</div>
            ))}
          </div>

          {/* Code editor area */}
          <div ref={editorWrapperRef} className="code-editor-wrapper">
            <Editor
              value={script}
              onValueChange={onScriptChange}
              highlight={(code) => Prism.highlight(code, Prism.languages.javascript, 'javascript')}
              padding={16}
              style={{
                fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                fontSize: '0.875rem',
                lineHeight: '1.5',
                minHeight: '600px',
                backgroundColor: 'transparent',
                outline: 'none',
                color: '#1f2937'
              }}
              textareaClassName="code-editor-textarea"
            />
          </div>
        </div>

        {syntaxError && (
          <div style={{
            marginTop: '0.5rem',
            padding: '0.75rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '4px',
            fontSize: '0.875rem',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem'
          }}>
            <span style={{flexShrink: 0}}>⚠️</span>
            <div>
              <strong>{t('scriptEditor.syntaxError')}:</strong> {syntaxError}
            </div>
          </div>
        )}

        <div style={{
          marginTop: '0.75rem',
          padding: '0.75rem',
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '4px',
          fontSize: '0.875rem',
          color: '#1e40af',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span style={{flexShrink: 0}}>📖</span>
          <a
            href="https://grafana.com/docs/k6/latest/using-k6/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#2563eb',
              textDecoration: 'underline',
              fontWeight: '500'
            }}
          >
            {t('scriptEditor.guideLink')}
          </a>
        </div>
      </div>
    </div>
  );
};
