'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { hapticFeedback } from '@/lib/pwa-utils';

interface TouchButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  haptic?: 'light' | 'medium' | 'heavy' | 'none';
}

const TouchButton = forwardRef<HTMLButtonElement, TouchButtonProps>(
  ({ className, variant = 'default', size = 'md', haptic = 'light', onClick, children, ...props }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (haptic !== 'none') {
        hapticFeedback(haptic);
      }
      onClick?.(e);
    };

    const variants = {
      default: 'bg-white border border-gray-200 text-gray-900 hover:bg-gray-50 active:bg-gray-100',
      primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
      secondary: 'bg-gray-600 text-white hover:bg-gray-700 active:bg-gray-800',
      danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
      success: 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800',
    };

    const sizes = {
      sm: 'px-3 py-2 text-sm min-h-[40px]',
      md: 'px-4 py-3 text-base min-h-[48px]',
      lg: 'px-6 py-4 text-lg min-h-[56px]',
      xl: 'px-8 py-5 text-xl min-h-[64px]',
    };

    return (
      <button
        ref={ref}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center font-medium rounded-lg',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-all duration-150 ease-in-out',
          'select-none touch-manipulation',
          // Mobile-optimized tap target
          'min-w-[44px] min-h-[44px]',
          // Active states for better mobile feedback
          'active:scale-95 active:transition-transform active:duration-75',
          variants[variant],
          sizes[size],
          className
        )}
        onClick={handleClick}
        {...props}
      >
        {children}
      </button>
    );
  }
);

TouchButton.displayName = 'TouchButton';

export { TouchButton };