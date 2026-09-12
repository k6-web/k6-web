import type {ReactNode} from 'react';
import styles from './MetricCard.module.css';

/** Only cards that report a pass/fail outcome carry color; the rest stay neutral. */
type Tone = 'neutral' | 'success' | 'danger';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  tone?: Tone;
  children?: ReactNode;
}

export const MetricCard = ({title, value, subtitle, tone = 'neutral', children}: MetricCardProps) => {
  return (
    <div className={`${styles.card} ${styles[tone]}`}>
      <div className={styles.title}>{title}</div>
      {children || (
        <>
          <div className={styles.value}>{value}</div>
          {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
        </>
      )}
    </div>
  );
};
