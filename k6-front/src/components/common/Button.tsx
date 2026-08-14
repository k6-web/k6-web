import type {CSSProperties, ReactNode} from 'react';
import styles from './Button.module.css';

type Variant = 'primary' | 'secondary' | 'danger' | 'success' | 'purple' | 'gray';
type Appearance = 'solid' | 'outline' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const VARIANT_COLORS: Record<Variant, {base: string; hover: string}> = {
  primary: {base: 'var(--color-primary)', hover: 'var(--color-primary-hover)'},
  secondary: {base: 'var(--color-success-strong)', hover: 'var(--color-success-text)'},
  danger: {base: 'var(--color-danger)', hover: 'var(--color-danger-hover)'},
  success: {base: 'var(--color-success)', hover: 'var(--color-success-strong)'},
  purple: {base: 'var(--color-accent)', hover: 'var(--color-accent-hover)'},
  gray: {base: 'var(--color-neutral)', hover: 'var(--color-neutral-hover)'}
};

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: Variant;
  appearance?: Appearance;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
  style?: CSSProperties;
  className?: string;
  title?: string;
  'aria-label'?: string;
  'aria-expanded'?: boolean;
  'aria-pressed'?: boolean;
}

export const Button = ({
  children,
  onClick,
  variant = 'primary',
  appearance = 'solid',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  type = 'button',
  style,
  className = '',
  title,
  'aria-label': ariaLabel,
  'aria-expanded': ariaExpanded,
  'aria-pressed': ariaPressed
}: ButtonProps) => {
  const colors = VARIANT_COLORS[variant];

  const classes = [
    styles.button,
    styles[appearance],
    styles[size],
    fullWidth ? styles.fullWidth : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      aria-label={ariaLabel}
      aria-expanded={ariaExpanded}
      aria-pressed={ariaPressed}
      aria-busy={loading || undefined}
      className={classes}
      style={{
        '--variant-color': colors.base,
        '--variant-color-hover': colors.hover,
        ...style
      } as CSSProperties}
    >
      {loading && <span className={styles.spinner} aria-hidden="true"/>}
      {children}
    </button>
  );
};
