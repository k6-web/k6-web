import {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Button} from './Button';

interface TestNameModalProps {
  initialName?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (name?: string) => void;
}

export const TestNameModal = ({
  initialName = '',
  loading = false,
  onCancel,
  onConfirm
}: TestNameModalProps) => {
  const {t} = useTranslation();
  const [testName, setTestName] = useState(initialName);

  useEffect(() => {
    setTestName(initialName);
  }, [initialName]);

  const confirm = () => {
    if (loading) return;
    onConfirm(testName.trim() || undefined);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        maxWidth: '500px',
        width: '90%'
      }}>
        <h2 style={{marginTop: 0}}>{t('httpConfig.testName')}</h2>
        <p style={{margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#6b7280'}}>
          {t('httpConfig.testNameOptionalInfo')}
        </p>
        <div style={{marginBottom: '1.5rem'}}>
          <input
            type="text"
            value={testName}
            onChange={(e) => setTestName(e.target.value.slice(0, 50))}
            placeholder={t('httpConfig.testNamePlaceholder')}
            maxLength={50}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '1rem'
            }}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                confirm();
              }
            }}
          />
          <div style={{fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem'}}>
            {testName.length}/50 characters
          </div>
        </div>
        <div style={{display: 'flex', gap: '0.5rem', justifyContent: 'flex-end'}}>
          <Button
            variant="gray"
            onClick={onCancel}
            disabled={loading}
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={confirm}
            disabled={loading}
          >
            {loading ? t('newTest.startingTest') : t('common.start')}
          </Button>
        </div>
      </div>
    </div>
  );
};
