/**
 * LoadingSpinner Component
 * Requirements: 19.1-19.15
 * Task: 26.2 Criar componentes de feedback
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  progress?: number; // 0-100
  showProgress?: boolean;
  label?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className,
  progress,
  showProgress = false,
  label,
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center gap-2', className)}>
      <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
      
      {showProgress && progress !== undefined && (
        <div className="w-full max-w-xs">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          <p className="text-xs text-center text-muted-foreground mt-1">
            {Math.round(progress)}%
          </p>
        </div>
      )}
      
      {label && (
        <p className="text-sm text-muted-foreground">{label}</p>
      )}
    </div>
  );
};
