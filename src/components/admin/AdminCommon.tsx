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
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' },
    violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
    orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400' },
    pink: { bg: 'bg-pink-500/10', border: 'border-pink-500/20', text: 'text-pink-400' },
    cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400' },
  };
  
  return (
    <div className="flex items-center gap-5 p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-white/20 transition-all backdrop-blur-xl group">
      <div className={`p-3.5 rounded-2xl border ${colorMap[color].bg} ${colorMap[color].border} shrink-0 group-hover:scale-110 transition-transform duration-500`}>
        <Icon className={`h-5 w-5 ${colorMap[color].text}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-3xl font-black text-white tracking-tighter leading-none mb-1">
          {isLoading ? <Loader2 className="h-6 w-6 animate-spin text-violet-400 inline" /> : value}
        </p>
        <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em]">{title}</p>
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
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' },
    violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400' },
  };
  
  const change = previousValue > 0 ? ((value - previousValue) / previousValue * 100).toFixed(0) : '0';
  const isPositive = parseInt(change as string) >= 0;

  return (
    <div className="flex items-center gap-5 p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-white/20 transition-all backdrop-blur-xl group">
      <div className={`p-3.5 rounded-2xl border ${colorMap[color].bg} ${colorMap[color].border} shrink-0 group-hover:scale-110 transition-transform duration-500`}>
        <Icon className={`h-5 w-5 ${colorMap[color].text}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 mb-1">
          <p className="text-3xl font-black text-white tracking-tighter leading-none">
            {isLoading ? <Loader2 className="h-6 w-6 animate-spin text-violet-400 inline" /> : value}
          </p>
          {showChange && !isLoading && (
            <span className={`text-[11px] font-black flex items-center gap-0.5 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(parseInt(change as string))}%
            </span>
          )}
        </div>
        <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em]">{title}</p>
      </div>
    </div>
  );
}
