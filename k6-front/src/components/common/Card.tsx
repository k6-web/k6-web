import type {CSSProperties, ReactNode} from 'react';

interface CardProps {
  children: ReactNode;
  title?: string;
  style?: CSSProperties;
}

export const Card = ({children, title, style = {}}: CardProps) => {
  return (
    <div
      style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        ...style
      }}
    >
      {title && <h2 style={{marginTop: 0, marginBottom: '1rem'}}>{title}</h2>}
      {children}
    </div>
  );
};
