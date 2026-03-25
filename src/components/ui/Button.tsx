import React from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'hero' | 'ocean' | 'gold' | 'ghost' | 'outline' | 'danger' | 'secondary';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  hero: 'bg-gradient-to-r from-navy-500 to-ocean-500 text-white hover:from-navy-600 hover:to-ocean-600 shadow-lg hover:shadow-xl hover:-translate-y-0.5',
  ocean: 'bg-ocean-500 text-white hover:bg-ocean-600',
  gold: 'bg-gold-500 text-navy-500 hover:bg-gold-400',
  ghost: 'bg-transparent text-white border border-white/30 hover:bg-white/10',
  outline: 'bg-transparent text-ocean-500 border-2 border-ocean-500 hover:bg-ocean-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  secondary: 'bg-gray-100 text-navy-500 hover:bg-gray-200',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
  md: 'px-5 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-6 py-3 text-base rounded-xl gap-2',
  xl: 'px-8 py-4 text-lg rounded-xl gap-2.5',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'ocean',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  children,
  className,
  disabled,
  ...props
}) => {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center font-heading font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="animate-spin" size={16} />
      ) : (
        iconPosition === 'left' && icon && icon
      )}
      {children}
      {!loading && iconPosition === 'right' && icon && icon}
    </button>
  );
};
