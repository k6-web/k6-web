import {useTranslation} from 'react-i18next';
import {EmptyState} from './EmptyState';
import {Button} from './Button';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorState = ({message, onRetry}: ErrorStateProps) => {
  const {t} = useTranslation();

  return (
    <div role="alert">
      <EmptyState
        icon="⚠"
        title={t('common.error')}
        description={message}
        action={onRetry && (
          <Button variant="gray" appearance="outline" onClick={onRetry}>
            {t('common.retry')}
          </Button>
        )}
      />
    </div>
  );
};
