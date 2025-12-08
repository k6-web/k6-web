import {Light as SyntaxHighlighter} from 'react-syntax-highlighter';
import {github} from 'react-syntax-highlighter/dist/esm/styles/hljs';
import {Card} from '../common';

interface ScriptDisplayProps {
  script: string;
}

export const ScriptDisplay = ({script}: ScriptDisplayProps) => {
  return (
    <Card title="Script">
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
    </Card>
  );
};
