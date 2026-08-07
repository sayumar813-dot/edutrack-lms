import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({ children, className = '', style }) => {
  return (
    <div
      className={`glass-card ${className}`}
      style={{
        padding: '24px',
        borderRadius: '20px',
        border: '1px solid var(--border-color)',
        background: 'var(--card-bg)',
        ...style,
      }}
    >
      {children}
    </div>
  );
};
