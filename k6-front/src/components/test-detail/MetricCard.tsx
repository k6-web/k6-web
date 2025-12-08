interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color: string;
  children?: React.ReactNode;
}

export const MetricCard = ({title, value, subtitle, color, children}: MetricCardProps) => {
  return (
    <div style={{
      backgroundColor: 'white',
      padding: '1.5rem',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      borderLeft: `4px solid ${color}`
    }}>
      <div style={{fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem'}}>
        {title}
      </div>
      {children || (
        <>
          <div style={{fontSize: '2rem', fontWeight: 'bold', color}}>
            {value}
          </div>
          {subtitle && (
            <div style={{fontSize: '0.75rem', color: '#999', marginTop: '0.25rem'}}>
              {subtitle}
            </div>
          )}
        </>
      )}
    </div>
  );
};
