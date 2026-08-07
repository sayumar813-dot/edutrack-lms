import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  children,
  className = '',
  style,
  ...props
}) => {
  const baseClass = variant === 'primary' ? 'btn-primary' : 'btn-secondary';
  return (
    <button className={`${baseClass} ${className}`} style={{ cursor: 'pointer', ...style }} {...props}>
      {children}
    </button>
  );
};
