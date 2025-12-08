import type {ReactNode} from 'react';

interface InfoBoxProps {
  children: ReactNode;
  variant?: 'info' | 'warning' | 'success' | 'error';
}

export const InfoBox = ({children, variant = 'info'}: InfoBoxProps) => {
  const getColors = () => {
    switch (variant) {
      case 'info':
        return {bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af'};
      case 'warning':
        return {bg: '#fef3c7', border: '#fcd34d', text: '#92400e'};
      case 'success':
        return {bg: '#d1fae5', border: '#a7f3d0', text: '#065f46'};
      case 'error':
        return {bg: '#fee2e2', border: '#fecaca', text: '#991b1b'};
      default:
        return {bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af'};
    }
  };

  const colors = getColors();

  return (
    <div
      style={{
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: '4px',
        padding: '0.75rem 1rem',
        marginBottom: '1.5rem',
        fontSize: '0.875rem',
        color: colors.text
      }}
    >
      {children}
    </div>
  );
};
