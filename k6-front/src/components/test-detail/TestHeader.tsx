import {Button} from '../common';

interface TestHeaderProps {
  testId: string;
  testName?: string;
  status: string;
  onStop: () => void;
  onRerun: () => void;
  onDelete: () => void;
  onCopyLink: () => void;
}

export const TestHeader = ({
  testId,
  testName,
  status,
  onStop,
  onRerun,
  onDelete,
  onCopyLink
}: TestHeaderProps) => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '2rem',
      flexWrap: 'wrap',
      gap: '1rem'
    }}>
      <div>
        <h1 style={{margin: 0, fontSize: 'clamp(1.25rem, 4vw, 1.875rem)'}}>
          {testName || `Test: ${testId}`}
        </h1>
        {testName && (
          <p style={{
            color: '#9ca3af',
            margin: '0.25rem 0 0 0',
            fontSize: 'clamp(0.625rem, 2vw, 0.75rem)',
            wordBreak: 'break-all'
          }}>
            ID: {testId}
          </p>
        )}
      </div>
      <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
        {status === 'running' && (
          <Button
            variant="danger"
            onClick={onStop}
            style={{fontSize: 'clamp(0.75rem, 2vw, 0.875rem)'}}
          >
            Stop Test
          </Button>
        )}
        {status !== 'running' && (
          <>
            <Button
              variant="purple"
              onClick={onCopyLink}
              style={{fontSize: 'clamp(0.75rem, 2vw, 0.875rem)'}}
            >
              🔗 Share
            </Button>
            <Button
              variant="primary"
              onClick={onRerun}
              style={{fontSize: 'clamp(0.75rem, 2vw, 0.875rem)'}}
            >
              🔄 Re-run
            </Button>
            <Button
              variant="gray"
              onClick={onDelete}
              style={{fontSize: 'clamp(0.75rem, 2vw, 0.875rem)'}}
            >
              Delete
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
