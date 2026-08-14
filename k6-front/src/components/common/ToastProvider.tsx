import {useCallback, useMemo, useRef, useState, type ReactNode} from 'react';
import {ToastContext, type ToastContextValue, type ToastVariant} from './toastContext';
import styles from './Toast.module.css';

interface Toast {
  id: number;
  variant: ToastVariant;
  message: string;
}

const ICONS: Record<ToastVariant, string> = {
  success: '✓',
  error: '✕',
  warning: '!',
  info: 'i'
};

const DURATION_MS = 4000;

export const ToastProvider = ({children}: {children: ReactNode}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts(current => current.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = nextId.current++;
    setToasts(current => [...current, {id, variant, message}]);
    timers.current.set(id, setTimeout(() => dismiss(id), DURATION_MS));
  }, [dismiss]);

  const value = useMemo<ToastContextValue>(() => ({
    showToast,
    success: (message: string) => showToast(message, 'success'),
    error: (message: string) => showToast(message, 'error'),
    warning: (message: string) => showToast(message, 'warning'),
    info: (message: string) => showToast(message, 'info')
  }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.viewport} role="region" aria-label="Notifications">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`${styles.toast} ${styles[toast.variant]}`}
            role={toast.variant === 'error' ? 'alert' : 'status'}
            aria-live={toast.variant === 'error' ? 'assertive' : 'polite'}
          >
            <span className={styles.icon} aria-hidden="true">{ICONS[toast.variant]}</span>
            <span className={styles.message}>{toast.message}</span>
            <button
              type="button"
              className={styles.dismiss}
              aria-label="Dismiss notification"
              onClick={() => dismiss(toast.id)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
