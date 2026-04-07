'use client';

import React from 'react';
import { Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

export function StatCard({ title, value, icon: Icon, color, isLoading }: {
  title: string;
  value: string | number;
  icon: any;
  color: 'blue' | 'violet' | 'emerald' | 'orange' | 'pink' | 'cyan';
  isLoading?: boolean;
}) {
  const colorMap: Record<string, { bg: string; border: string; text: string }> = {
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/15', text: 'text-blue-400' },
    violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/15', text: 'text-violet-400' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/15', text: 'text-emerald-400' },
    orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/15', text: 'text-orange-400' },
    pink: { bg: 'bg-pink-500/10', border: 'border-pink-500/15', text: 'text-pink-400' },
    cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/15', text: 'text-cyan-400' },
  };
  
  return (
    <div className="flex items-center gap-4 p-5 rounded-2xl bg-zinc-900/40 border border-white/5 hover:border-white/10 transition-all">
      <div className={`p-3 rounded-xl border ${colorMap[color].bg} ${colorMap[color].border} shrink-0`}>
        <Icon className={`h-4 w-4 ${colorMap[color].text}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-2xl font-black text-white tracking-tighter">
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-violet-400 inline" /> : value}
        </p>
        <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">{title}</p>
      </div>
    </div>
  );
}

export function ChangeCard({ title, value, previousValue, icon: Icon, color, isLoading, showChange = true }: {
  title: string;
  value: number;
  previousValue: number;
  icon: any;
  color: 'blue' | 'violet';
  isLoading?: boolean;
  showChange?: boolean;
}) {
  const colorMap = {
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/15', text: 'text-blue-400' },
    violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/15', text: 'text-violet-400' },
  };
  
  const change = previousValue > 0 ? ((value - previousValue) / previousValue * 100).toFixed(0) : '0';
  const isPositive = parseInt(change as string) >= 0;

  return (
    <div className="flex items-center gap-4 p-5 rounded-2xl bg-zinc-900/40 border border-white/5 hover:border-white/10 transition-all">
      <div className={`p-3 rounded-xl border ${colorMap[color].bg} ${colorMap[color].border} shrink-0`}>
        <Icon className={`h-4 w-4 ${colorMap[color].text}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-black text-white tracking-tighter">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-violet-400 inline" /> : value}
          </p>
          {showChange && !isLoading && (
            <span className={`text-[10px] font-black flex items-center gap-0.5 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(parseInt(change as string))}%
            </span>
          )}
        </div>
        <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">{title}</p>
      </div>
    </div>
  );
}
