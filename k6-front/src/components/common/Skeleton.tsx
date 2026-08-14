import styles from './Skeleton.module.css';

interface SkeletonProps {
  width?: string;
  height?: string;
}

export const Skeleton = ({width = '100%', height = '18px'}: SkeletonProps) => (
  <div className={styles.skeleton} style={{width, height}}/>
);

interface SkeletonListProps {
  rows?: number;
  label?: string;
}

export const SkeletonList = ({rows = 5, label = 'Loading'}: SkeletonListProps) => (
  <div className={styles.stack} role="status" aria-live="polite" aria-busy="true">
    <span className="sr-only">{label}</span>
    {Array.from({length: rows}, (_, index) => (
      <div
        key={index}
        className={`${styles.skeleton} ${styles.row}`}
        style={{width: index === 0 ? '40%' : `${90 - index * 6}%`}}
      />
    ))}
  </div>
);
