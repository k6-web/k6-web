import type {CSSProperties, ReactNode} from 'react';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'purple' | 'gray';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  style?: CSSProperties;
  title?: string;
}

export const Button = ({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  type = 'button',
  style = {},
  title
}: ButtonProps) => {
  const getVariantColor = () => {
    switch (variant) {
      case 'primary':
        return '#3b82f6';
      case 'secondary':
        return '#10b981';
      case 'danger':
        return '#ef4444';
      case 'success':
        return '#22c55e';
      case 'purple':
        return '#8b5cf6';
      case 'gray':
        return '#6b7280';
      default:
        return '#3b82f6';
    }
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        padding: '0.5rem 1rem',
        backgroundColor: disabled ? '#9ca3af' : getVariantColor(),
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 'bold',
        fontSize: '0.875rem',
        ...style
      }}
    >
      {children}
    </button>
  );
};
