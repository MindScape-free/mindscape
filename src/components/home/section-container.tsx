import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface SectionContainerProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  id?: string;
}

export function SectionContainer({ title, subtitle, children, className, id }: SectionContainerProps) {
  return (
    <section id={id} className={cn('py-16 md:py-24 relative', className)}>
      {(title || subtitle) && (
        <div className="mb-12 md:mb-16 text-center max-w-3xl mx-auto px-6">
          {title && (
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-4">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-lg text-zinc-400 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
      )}
      <div className="mx-auto max-w-7xl px-6">
        {children}
      </div>
    </section>
  );
}
