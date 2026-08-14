import type {ReactNode} from 'react';
import styles from './InfoBox.module.css';

type InfoBoxVariant = 'info' | 'warning' | 'success' | 'error';

const ICONS: Record<InfoBoxVariant, string> = {
  info: 'ℹ',
  warning: '⚠',
  success: '✓',
  error: '✕'
};

interface InfoBoxProps {
  children: ReactNode;
  variant?: InfoBoxVariant;
}

export const InfoBox = ({children, variant = 'info'}: InfoBoxProps) => {
  return (
    <div
      className={`${styles.infoBox} ${styles[variant]}`}
      role={variant === 'error' ? 'alert' : undefined}
    >
      <span className={styles.icon} aria-hidden="true">{ICONS[variant]}</span>
      <div className={styles.content}>{children}</div>
    </div>
  );
};
