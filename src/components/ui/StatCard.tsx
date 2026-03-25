import React from 'react';
import { clsx } from 'clsx';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label?: string;
  };
  variant?: 'default' | 'ocean' | 'navy' | 'teal' | 'gold';
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtitle,
  icon,
  trend,
  variant = 'default',
  className,
}) => {
  const isPositiveTrend = trend && trend.value >= 0;

  const variantStyles = {
    default: 'bg-white border border-gray-100',
    ocean: 'bg-gradient-to-br from-ocean-500 to-ocean-700 text-white',
    navy: 'bg-gradient-to-br from-navy-500 to-navy-700 text-white',
    teal: 'bg-gradient-to-br from-teal-500 to-teal-700 text-white',
    gold: 'bg-gradient-to-br from-gold-400 to-gold-600 text-white',
  };

  const isColored = variant !== 'default';

  return (
    <div
      className={clsx(
        'rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p
            className={clsx(
              'text-sm font-medium mb-1',
              isColored ? 'text-white/80' : 'text-gray-500'
            )}
          >
            {label}
          </p>
          <p
            className={clsx(
              'text-3xl font-heading font-bold',
              isColored ? 'text-white' : 'text-navy-500'
            )}
          >
            {value}
          </p>
          {subtitle && (
            <p
              className={clsx(
                'text-xs mt-1',
                isColored ? 'text-white/70' : 'text-gray-400'
              )}
            >
              {subtitle}
            </p>
          )}
          {trend && (
            <div
              className={clsx(
                'flex items-center gap-1 mt-2 text-xs font-medium',
                isColored
                  ? 'text-white/80'
                  : isPositiveTrend
                  ? 'text-teal-600'
                  : 'text-red-500'
              )}
            >
              {isPositiveTrend ? (
                <TrendingUp size={12} />
              ) : (
                <TrendingDown size={12} />
              )}
              {Math.abs(trend.value)}% {trend.label || 'vs last month'}
            </div>
          )}
        </div>
        {icon && (
          <div
            className={clsx(
              'p-3 rounded-xl',
              isColored ? 'bg-white/20' : 'bg-ocean-50 text-ocean-600'
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};
