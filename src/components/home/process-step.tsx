import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface ProcessStepProps {
  stepNumber: number;
  title: string;
  explanation: string;
  microDetail?: string;
  icon: LucideIcon;
  isLast?: boolean;
}

export function ProcessStep({
  stepNumber,
  title,
  explanation,
  microDetail,
  icon: Icon,
  isLast = false,
}: ProcessStepProps) {
  return (
    <div className="relative flex flex-col md:flex-row items-start gap-4 md:gap-6 group">
      {/* Desktop connector line */}
      {!isLast && (
        <div className="hidden md:block absolute top-8 left-[3.25rem] w-full h-[1px] bg-gradient-to-r from-primary/30 to-transparent -z-10" />
      )}
      
      {/* Mobile connector line */}
      {!isLast && (
        <div className="md:hidden absolute top-12 left-6 w-[1px] h-full bg-gradient-to-b from-primary/30 to-transparent -z-10" />
      )}

      <div className="flex-shrink-0 relative">
        <div className="w-12 h-12 rounded-full bg-zinc-900 border border-primary/20 flex items-center justify-center relative z-10 group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-300">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-white z-20 shadow-md">
          {stepNumber}
        </div>
      </div>

      <div className="pt-2 pb-8 md:pb-0">
        <h4 className="text-lg font-bold text-white mb-1 group-hover:text-primary transition-colors">{title}</h4>
        <p className="text-sm text-zinc-400 mb-2 leading-relaxed">{explanation}</p>
        {microDetail && (
          <p className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500/80">
            {microDetail}
          </p>
        )}
      </div>
    </div>
  );
}
