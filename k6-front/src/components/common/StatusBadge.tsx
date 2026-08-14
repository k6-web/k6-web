import type {TestStatus} from '../../types/test';
import styles from './StatusBadge.module.css';

interface StatusBadgeProps {
  status: TestStatus;
  className?: string;
}

export const StatusBadge = ({status, className = ''}: StatusBadgeProps) => {
  const variantClass = styles[status] ?? styles.stopped;

  return (
    <span className={`${styles.badge} ${variantClass} ${className}`.trim()}>
      <span className={styles.dot} aria-hidden="true"/>
      {status}
    </span>
  );
};
