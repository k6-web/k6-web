import type {ReactNode} from 'react';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}

export const PageHeader = ({title, description, actions}: PageHeaderProps) => (
  <div className={styles.header}>
    <div className={styles.titleGroup}>
      <h1 className={styles.title}>{title}</h1>
      {description && <p className={styles.description}>{description}</p>}
    </div>
    {actions && <div className={styles.actions}>{actions}</div>}
  </div>
);
