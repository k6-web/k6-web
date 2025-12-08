import type {TestStatus} from '../../types/test';

interface StatusBadgeProps {
  status: TestStatus;
  className?: string;
}

export const StatusBadge = ({status, className = ''}: StatusBadgeProps) => {
  const getStatusColor = () => {
    switch (status) {
      case 'running':
        return {bg: '#3b82f6', text: 'white'};
      case 'completed':
        return {bg: '#22c55e', text: 'white'};
      case 'failed':
        return {bg: '#ef4444', text: 'white'};
      case 'stopped':
        return {bg: '#6b7280', text: 'white'};
      default:
        return {bg: '#6b7280', text: 'white'};
    }
  };

  const colors = getStatusColor();

  return (
    <span
      className={className}
      style={{
        padding: '0.25rem 0.75rem',
        borderRadius: '9999px',
        backgroundColor: colors.bg,
        color: colors.text,
        fontSize: '0.875rem',
        fontWeight: '500'
      }}
    >
      {status}
    </span>
  );
};
