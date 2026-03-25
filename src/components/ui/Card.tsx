import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glass?: boolean;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  glass = false,
  hover = false,
  padding = 'md',
  onClick,
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      onClick={onClick}
      className={clsx(
        'rounded-2xl transition-all duration-200',
        glass
          ? 'bg-white/80 backdrop-blur-md border border-white/20 shadow-xl'
          : 'bg-white border border-gray-100 shadow-sm',
        hover && 'hover:shadow-lg hover:-translate-y-0.5 cursor-pointer',
        paddingClasses[padding],
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
};
