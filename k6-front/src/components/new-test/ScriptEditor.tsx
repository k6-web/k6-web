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
  return (
    <div style={{
      backgroundColor: 'white',
      padding: '1.5rem',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <h2 style={{marginTop: 0, marginBottom: '1.5rem'}}>Custom k6 Script</h2>

      <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
        <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>
          k6 Script *
        </label>
        <div style={{
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          backgroundColor: '#f9fafb',
          flex: 1,
          minHeight: '600px',
          overflow: 'auto'
        }}>
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
              <strong>Syntax Error:</strong> {syntaxError}
            </div>
          </div>
        )}

        <div style={{marginTop: '0.5rem', fontSize: '0.75rem', color: '#6b7280'}}>
          💡 Tip: Changing HTTP settings will automatically generate the script, and modifying the script will
          automatically extract HTTP settings.
        </div>
      </div>
    </div>
  );
};
