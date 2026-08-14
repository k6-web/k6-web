import type {CSSProperties, ReactNode} from 'react';
import styles from './MetricCard.module.css';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color: string;
  children?: ReactNode;
}

export const MetricCard = ({title, value, subtitle, color, children}: MetricCardProps) => {
  return (
    <div className={styles.card} style={{'--accent-color': color} as CSSProperties}>
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
