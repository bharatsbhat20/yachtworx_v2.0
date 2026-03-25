import React from 'react';
import { clsx } from 'clsx';
import { User } from 'lucide-react';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  src?: string;
  alt?: string;
  size?: AvatarSize;
  className?: string;
  fallback?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = '',
  size = 'md',
  className,
  fallback,
}) => {
  const [error, setError] = React.useState(false);

  if (src && !error) {
    return (
      <img
        src={src}
        alt={alt}
        onError={() => setError(true)}
        className={clsx(
          'rounded-full object-cover flex-shrink-0',
          sizeClasses[size],
          className
        )}
      />
    );
  }

  if (fallback) {
    return (
      <div
        className={clsx(
          'rounded-full bg-gradient-to-br from-ocean-500 to-teal-500 flex items-center justify-center text-white font-heading font-semibold flex-shrink-0',
          sizeClasses[size],
          className
        )}
      >
        {fallback.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'rounded-full bg-gray-200 flex items-center justify-center text-gray-400 flex-shrink-0',
        sizeClasses[size],
        className
      )}
    >
      <User size={16} />
    </div>
  );
};
