import React from 'react';

export type BadgeVariant = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'PAID' | 'PENDING' | 'OVERDUE' | 'PARTIAL';

interface BadgeProps {
  variant: BadgeVariant;
  children?: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  PRESENT: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  PAID: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  LATE: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  PENDING: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  PARTIAL: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  ABSENT: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  OVERDUE: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  EXCUSED: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
};

export const Badge: React.FC<BadgeProps> = ({ variant, children, className = '' }) => {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${variantStyles[variant] || 'bg-zinc-800 text-zinc-300'} ${className}`}
    >
      {children || variant}
    </span>
  );
};
