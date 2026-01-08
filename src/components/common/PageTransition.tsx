import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <div
      className={cn(
        'animate-in fade-in-0 slide-in-from-bottom-4 duration-300',
        className
      )}
    >
      {children}
    </div>
  );
}

export function FadeIn({ 
  children, 
  className,
  delay = 0 
}: PageTransitionProps & { delay?: number }) {
  return (
    <div
      className={cn('animate-in fade-in-0 duration-500', className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export function SlideUp({ 
  children, 
  className,
  delay = 0 
}: PageTransitionProps & { delay?: number }) {
  return (
    <div
      className={cn(
        'animate-in fade-in-0 slide-in-from-bottom-4 duration-400',
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export function ScaleIn({ 
  children, 
  className,
  delay = 0 
}: PageTransitionProps & { delay?: number }) {
  return (
    <div
      className={cn(
        'animate-in fade-in-0 zoom-in-95 duration-300',
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}