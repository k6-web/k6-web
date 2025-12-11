import type {Test} from '../../types/test';
import {Card} from '../common';
import {Link} from 'react-router-dom';

interface TestInfoCardProps {
  test: Test;
  progress?: number;
  errorCount?: number;
}

export const TestInfoCard = ({test, progress = 0, errorCount = 0}: TestInfoCardProps) => {
  return (
    <Card title="Test Information">
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem'}}>
        <div>
          <div style={{fontSize: '0.875rem', color: '#666'}}>Status</div>
          <div style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: test.status === 'running' ? '#3b82f6' :
              test.status === 'completed' ? '#22c55e' :
                test.status === 'failed' ? '#ef4444' : '#6b7280'
          }}>
            {test.status.toUpperCase()}
          </div>
        </div>

        {test.scriptId && (
          <div>
            <div style={{fontSize: '0.875rem', color: '#666'}}>Script ID</div>
            <Link
              to={`/scripts/${test.scriptId}`}
              style={{fontSize: '1rem', color: '#8b5cf6', textDecoration: 'none', fontWeight: '600'}}
            >
              {test.scriptId}
            </Link>
          </div>
        )}

        {test.status === 'running' && progress > 0 && (
          <div>
            <div style={{fontSize: '0.875rem', color: '#666'}}>Progress</div>
            <div style={{fontSize: '1.25rem', fontWeight: 'bold', color: '#3b82f6'}}>
              {progress}%
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#e5e7eb',
              borderRadius: '4px',
              marginTop: '0.5rem',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: '#3b82f6',
                transition: 'width 0.3s ease'
              }}/>
            </div>
          </div>
        )}

        {test.status === 'running' && errorCount > 0 && (
          <div>
            <div style={{fontSize: '0.875rem', color: '#666'}}>Errors</div>
            <div style={{fontSize: '1.25rem', fontWeight: 'bold', color: '#ef4444'}}>
              {errorCount}
            </div>
          </div>
        )}

        <div>
          <div style={{fontSize: '0.875rem', color: '#666'}}>Start Time</div>
          <div style={{fontSize: '1rem'}}>{new Date(test.startTime).toLocaleString()}</div>
        </div>
        {test?.endTime && (
          <>
            <div>
              <div style={{fontSize: '0.875rem', color: '#666'}}>End Time</div>
              <div style={{fontSize: '1rem'}}>{new Date(test.endTime).toLocaleString()}</div>
            </div>
            <div>
              <div style={{fontSize: '0.875rem', color: '#666'}}>Duration</div>
              <div style={{fontSize: '1rem'}}>{((test.endTime - test.startTime) / 1000).toFixed(2)}s</div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
};
