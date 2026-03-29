'use client';

import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  message?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

export function LoadingSpinner({ size = 'md', className, message }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <Loader2 className={cn(sizeClasses[size], 'animate-spin text-primary', className)} />
      {message && (
        <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
      )}
    </div>
  );
}

interface LoadingProgressProps {
  progress: number;
  message?: string;
  showPercentage?: boolean;
  className?: string;
}

export function LoadingProgress({ 
  progress, 
  message, 
  showPercentage = true,
  className 
}: LoadingProgressProps) {
  return (
    <div className={cn('w-full max-w-md space-y-2', className)}>
      {message && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{message}</span>
          {showPercentage && (
            <span className="text-primary font-medium">{Math.round(progress)}%</span>
          )}
        </div>
      )}
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  progress?: number;
  children: React.ReactNode;
  blur?: boolean;
}

export function LoadingOverlay({ 
  isLoading, 
  message, 
  progress,
  children,
  blur = true 
}: LoadingOverlayProps) {
  if (!isLoading) return <>{children}</>;

  return (
    <div className="relative">
      <div className={cn(blur && 'opacity-50 pointer-events-none select-none')}>
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4 p-6 rounded-lg">
          {progress !== undefined ? (
            <div className="w-full max-w-xs space-y-2">
              {message && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{message}</span>
                  <span className="text-primary font-medium">{Math.round(progress)}%</span>
                </div>
              )}
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <LoadingSpinner size="lg" />
              {message && (
                <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface LoadingCardProps {
  className?: string;
  lines?: number;
}

export function LoadingCard({ className, lines = 3 }: LoadingCardProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i} 
          className="h-3 bg-muted animate-pulse rounded" 
          style={{ width: `${Math.random() * 40 + 60}%` }}
        />
      ))}
    </div>
  );
}

interface LoadingSkeletonProps {
  className?: string;
}

export function LoadingSkeleton({ className }: LoadingSkeletonProps) {
  return (
    <div className={cn('bg-muted animate-pulse rounded', className)} />
  );
}
