import {Link} from 'react-router-dom';
import type {CSSProperties, ReactNode} from 'react';
import styles from './Button.module.css';

type Variant = 'primary' | 'danger' | 'gray';

const VARIANT_COLORS: Record<Variant, {base: string; hover: string}> = {
  primary: {base: 'var(--color-primary)', hover: 'var(--color-primary-hover)'},
  danger: {base: 'var(--color-danger)', hover: 'var(--color-danger-hover)'},
  gray: {base: 'var(--color-neutral)', hover: 'var(--color-neutral-hover)'}
};

interface LinkButtonProps {
  to: string;
  children: ReactNode;
  variant?: Variant;
  appearance?: 'solid' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  'aria-label'?: string;
}

/** A router link that adopts the Button visuals, so link semantics stay intact. */
export const LinkButton = ({
  to,
  children,
  variant = 'primary',
  appearance = 'solid',
  size = 'md',
  className = '',
  'aria-label': ariaLabel
}: LinkButtonProps) => {
  const colors = VARIANT_COLORS[variant];

  return (
    <Link
      to={to}
      aria-label={ariaLabel}
      className={[styles.button, styles[appearance], styles[size], className].filter(Boolean).join(' ')}
      style={{
        '--variant-color': colors.base,
        '--variant-color-hover': colors.hover,
        textDecoration: 'none'
      } as CSSProperties}
    >
      {children}
    </Link>
  );
};
