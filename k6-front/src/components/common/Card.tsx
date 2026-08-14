import type {CSSProperties, ReactNode} from 'react';
import styles from './Card.module.css';

interface CardProps {
  children: ReactNode;
  title?: string;
  style?: CSSProperties;
  className?: string;
  /** Renders the card as a button so click targets stay keyboard-accessible. */
  onClick?: () => void;
  ariaLabel?: string;
}

export const Card = ({children, title, style, className = '', onClick, ariaLabel}: CardProps) => {
  const classes = [styles.card, onClick ? styles.interactive : '', className]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      {title && <h2 className={styles.title}>{title}</h2>}
      {children}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={classes} style={style} onClick={onClick} aria-label={ariaLabel}>
        {content}
      </button>
    );
  }

  return (
    <div className={classes} style={style}>
      {content}
    </div>
  );
};
