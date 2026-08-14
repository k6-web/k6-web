import {cloneElement, useId, type ReactElement} from 'react';
import styles from './Field.module.css';

interface FieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  /** Unit rendered inside the control's trailing edge (e.g. `%`, `s`). */
  suffix?: string;
  /** A single form control; it receives id/aria wiring automatically. */
  children: ReactElement<{id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean; className?: string}>;
}

export const Field = ({label, required = false, hint, error, suffix, children}: FieldProps) => {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const describedBy = [hint ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
        {required && <span className={styles.required} aria-hidden="true">*</span>}
      </label>

      {suffix ? (
        <div className={styles.suffixWrap}>
          {cloneElement(children, {
            id,
            'aria-describedby': describedBy,
            'aria-invalid': error ? true : undefined,
            className: [styles.control, styles.hasSuffix, children.props.className].filter(Boolean).join(' ')
          })}
          <span className={styles.suffix} aria-hidden="true">{suffix}</span>
        </div>
      ) : (
        cloneElement(children, {
          id,
          'aria-describedby': describedBy,
          'aria-invalid': error ? true : undefined,
          className: [styles.control, children.props.className].filter(Boolean).join(' ')
        })
      )}

      {hint && !error && <span id={hintId} className={styles.hint}>{hint}</span>}
      {error && <span id={errorId} className={styles.error} role="alert">{error}</span>}
    </div>
  );
};
