import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Modal} from './Modal';
import {Button} from './Button';
import {Field} from './Field';

const NAME_MAX_LENGTH = 50;

interface TestNameModalProps {
  initialName?: string;
  loading?: boolean;
  showName?: boolean;
  onCancel: () => void;
  onConfirm: (name?: string, scheduledAt?: number) => void;
}

export const TestNameModal = ({
  initialName = '',
  loading = false,
  showName = true,
  onCancel,
  onConfirm
}: TestNameModalProps) => {
  const {t} = useTranslation();
  const [testName, setTestName] = useState(initialName);
  const [scheduledAtInput, setScheduledAtInput] = useState('');

  const scheduledAt = scheduledAtInput ? new Date(scheduledAtInput).getTime() : undefined;
  const scheduleError = scheduledAtInput && !Number.isFinite(scheduledAt)
    ? t('testNameModal.invalidSchedule')
    : undefined;

  const confirm = () => {
    if (loading || scheduleError) return;
    onConfirm(testName.trim() || undefined, scheduledAt);
  };

  return (
    <Modal
      title={showName ? t('httpConfig.testName') : t('testNameModal.scheduleRun')}
      size="sm"
      closeLabel={t('common.cancel')}
      onClose={onCancel}
      footer={
        <>
          <Button variant="gray" appearance="outline" onClick={onCancel} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button onClick={confirm} loading={loading} disabled={Boolean(scheduleError)}>
            {loading ? t('newTest.startingTest') : t('common.start')}
          </Button>
        </>
      }
    >
      {showName && (
        <Field
          label={t('httpConfig.testName')}
          hint={`${t('httpConfig.testNameOptionalInfo')} (${testName.length}/${NAME_MAX_LENGTH})`}
        >
          <input
            type="text"
            value={testName}
            onChange={(e) => setTestName(e.target.value.slice(0, NAME_MAX_LENGTH))}
            placeholder={t('httpConfig.testNamePlaceholder')}
            maxLength={NAME_MAX_LENGTH}
            disabled={loading}
            data-autofocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirm();
            }}
          />
        </Field>
      )}

      <Field
        label={t('testNameModal.scheduledTime')}
        hint={t('testNameModal.scheduledTimeHint')}
        error={scheduleError}
      >
        <input
          type="datetime-local"
          value={scheduledAtInput}
          onChange={(e) => setScheduledAtInput(e.target.value)}
          disabled={loading}
        />
      </Field>
    </Modal>
  );
};
