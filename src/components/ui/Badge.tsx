import React from 'react';
import { clsx } from 'clsx';

type BadgeVariant = 'good' | 'attention' | 'critical' | 'info' | 'ocean' | 'navy' | 'gold' | 'gray' | 'teal';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  good: 'bg-teal-50 text-teal-700 border border-teal-200',
  attention: 'bg-amber-50 text-amber-700 border border-amber-200',
  critical: 'bg-red-50 text-red-700 border border-red-200',
  info: 'bg-blue-50 text-blue-700 border border-blue-200',
  ocean: 'bg-ocean-50 text-ocean-700 border border-ocean-100',
  navy: 'bg-navy-500 text-white',
  gold: 'bg-gold-50 text-gold-700 border border-gold-200',
  gray: 'bg-gray-100 text-gray-600 border border-gray-200',
  teal: 'bg-teal-500 text-white',
};

const dotColors: Record<BadgeVariant, string> = {
  good: 'bg-teal-500',
  attention: 'bg-amber-500',
  critical: 'bg-red-500',
  info: 'bg-blue-500',
  ocean: 'bg-ocean-500',
  navy: 'bg-white',
  gold: 'bg-gold-500',
  gray: 'bg-gray-400',
  teal: 'bg-white',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'gray',
  children,
  className,
  dot = false,
}) => {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold font-heading',
        variantClasses[variant],
        className
      )}
    >
      {dot && (
        <span className={clsx('w-1.5 h-1.5 rounded-full', dotColors[variant])} />
      )}
      {children}
    </span>
  );
};
