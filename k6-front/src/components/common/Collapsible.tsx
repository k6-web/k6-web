import {useId, useState, type ReactNode} from 'react';
import styles from './Collapsible.module.css';

interface CollapsibleProps {
  title: string;
  /** Short status shown on the trigger while collapsed (e.g. a chosen filename). */
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export const Collapsible = ({title, summary, defaultOpen = false, children}: CollapsibleProps) => {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();

  return (
    <div className={styles.section}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen(current => !current)}
      >
        <span className={styles.chevron} aria-hidden="true">▶</span>
        <span>{title}</span>
        {!open && summary && <span className={styles.summary}>{summary}</span>}
      </button>

      {open && <div id={bodyId} className={styles.body}>{children}</div>}
    </div>
  );
};
