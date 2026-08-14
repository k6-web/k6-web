import {useTranslation} from 'react-i18next';
import {Modal} from './Modal';
import {Button} from './Button';

interface ConfirmDialogProps {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog = ({
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel
}: ConfirmDialogProps) => {
  const {t} = useTranslation();

  return (
    <Modal
      title={title}
      description={message}
      size="sm"
      onClose={onCancel}
      footer={
        <>
          <Button variant="gray" appearance="outline" onClick={onCancel} disabled={loading}>
            {cancelLabel ?? t('common.cancel')}
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmLabel ?? t('common.confirm')}
          </Button>
        </>
      }
    />
  );
};
