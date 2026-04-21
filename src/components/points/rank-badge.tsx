'use client';

import { cn } from '@/lib/utils';
import { RankInfo } from '@/types/points';
import { Zap } from 'lucide-react';

interface RankBadgeProps {
  rankInfo: RankInfo;
  totalPoints: number;
  size?: 'sm' | 'md' | 'lg';
  showPoints?: boolean;
  className?: string;
}

export function RankBadge({ rankInfo, totalPoints, size = 'md', showPoints = true, className }: RankBadgeProps) {
  const sizeClasses = {
    sm: { wrap: 'px-2 py-0.5 gap-1', icon: 'h-2.5 w-2.5', rank: 'text-[9px]', points: 'text-[9px]' },
    md: { wrap: 'px-2.5 py-1 gap-1.5', icon: 'h-3 w-3', rank: 'text-[10px]', points: 'text-[10px]' },
    lg: { wrap: 'px-3 py-1.5 gap-2', icon: 'h-3.5 w-3.5', rank: 'text-xs', points: 'text-xs' },
  }[size];

  return (
    <div className={cn(
      'inline-flex items-center rounded-full border font-orbitron font-black uppercase tracking-widest',
      rankInfo.bgColor,
      rankInfo.borderColor,
      sizeClasses.wrap,
      className
    )}>
      <Zap className={cn(sizeClasses.icon, rankInfo.color)} />
      <span className={cn(sizeClasses.rank, rankInfo.color)}>{rankInfo.rank}</span>
      {showPoints && (
        <span className={cn(sizeClasses.points, 'text-zinc-500 font-bold normal-case tracking-normal font-sans')}>
          {totalPoints.toLocaleString()}
        </span>
      )}
    </div>
  );
}
