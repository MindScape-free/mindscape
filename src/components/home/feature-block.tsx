import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface FeatureBlockProps {
  title: string;
  valueProp: string;
  outcomes: string[];
  icon: LucideIcon;
  iconColorClass?: string;
  iconBgClass?: string;
  className?: string;
}

export function FeatureBlock({
  title,
  valueProp,
  outcomes,
  icon: Icon,
  iconColorClass = 'text-primary',
  iconBgClass = 'bg-primary/10',
  className,
}: FeatureBlockProps) {
  return (
    <div className={cn("rounded-2xl border border-white/5 bg-zinc-900/40 p-6 sm:p-8 flex flex-col h-full", className)}>
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-6", iconBgClass)}>
        <Icon className={cn("w-6 h-6", iconColorClass)} />
      </div>
      
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-zinc-400 mb-6 font-medium leading-relaxed">{valueProp}</p>
      
      <ul className="mt-auto space-y-3">
        {outcomes.map((outcome, idx) => (
          <li key={idx} className="flex items-start text-sm text-zinc-500">
            <span className="mr-2.5 mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
            <span className="leading-snug">{outcome}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
