import React from 'react';
import { Star } from 'lucide-react';
import { clsx } from 'clsx';

interface StarRatingProps {
  rating: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  className?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  max = 5,
  size = 'sm',
  showValue = false,
  className,
}) => {
  const sizeMap = { sm: 12, md: 16, lg: 20 };
  const iconSize = sizeMap[size];

  return (
    <div className={clsx('flex items-center gap-0.5', className)}>
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < Math.floor(rating);
        const partial = !filled && i < rating;

        return (
          <span key={i} className="relative">
            <Star
              size={iconSize}
              className="text-gray-200 fill-gray-200"
            />
            {(filled || partial) && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: partial ? `${(rating % 1) * 100}%` : '100%' }}
              >
                <Star
                  size={iconSize}
                  className="text-gold-400 fill-gold-400"
                />
              </span>
            )}
          </span>
        );
      })}
      {showValue && (
        <span className="ml-1 text-sm font-semibold text-navy-500">{rating.toFixed(1)}</span>
      )}
    </div>
  );
};
