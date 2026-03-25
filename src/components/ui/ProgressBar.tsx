import React from 'react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  color?: 'ocean' | 'teal' | 'gold' | 'red' | 'navy';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animated?: boolean;
}

const colorClasses = {
  ocean: 'bg-ocean-500',
  teal: 'bg-teal-500',
  gold: 'bg-gold-500',
  red: 'bg-red-500',
  navy: 'bg-navy-500',
};

const sizeClasses = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  showValue = false,
  color = 'ocean',
  size = 'md',
  className,
  animated = true,
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={clsx('w-full', className)}>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="text-sm text-gray-600">{label}</span>}
          {showValue && (
            <span className="text-sm font-semibold text-navy-500">{Math.round(percentage)}%</span>
          )}
        </div>
      )}
      <div className={clsx('w-full bg-gray-100 rounded-full overflow-hidden', sizeClasses[size])}>
        <motion.div
          className={clsx('h-full rounded-full', colorClasses[color])}
          initial={animated ? { width: 0 } : { width: `${percentage}%` }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};
