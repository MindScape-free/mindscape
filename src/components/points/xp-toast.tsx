'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AwardResult } from '@/lib/points-engine';
import { getRankForPoints } from '@/types/points';

export interface XPToastItem {
  id: string;
  result: AwardResult;
  label: string;
}

interface XPToastProps {
  items: XPToastItem[];
  onDismiss: (id: string) => void;
}

export function XPToastStack({ items, onDismiss }: XPToastProps) {
  return (
    <div className="fixed bottom-6 left-6 z-[300] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {items.slice(0, 3).map((item) => (
          <XPToastCard key={item.id} item={item} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function XPToastCard({ item, onDismiss }: { item: XPToastItem; onDismiss: (id: string) => void }) {
  const rankInfo = getRankForPoints(item.result.totalPoints);
  const isLevelUp = item.result.leveledUp;

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(item.id), isLevelUp ? 5000 : 3000);
    return () => clearTimeout(timer);
  }, [item.id, isLevelUp, onDismiss]);

  if (isLevelUp) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -40, scale: 0.9 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: -20, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={cn(
          'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-xl',
          'bg-zinc-950/95',
          rankInfo.borderColor,
          rankInfo.glowColor,
          'shadow-lg'
        )}
      >
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', rankInfo.bgColor)}>
          <TrendingUp className={cn('h-4 w-4', rankInfo.color)} />
        </div>
        <div>
          <p className="font-orbitron text-[10px] uppercase tracking-widest text-zinc-500">Level Up!</p>
          <p className={cn('text-sm font-black', rankInfo.color)}>{rankInfo.rank}</p>
          <p className="text-[10px] text-zinc-500">Level {item.result.level}</p>
        </div>
        <div className="ml-2 text-right">
          <p className={cn('font-black text-base', rankInfo.color)}>+{item.result.points}</p>
          <p className="text-[10px] text-zinc-600">XP</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -30, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="pointer-events-auto flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-white/8 bg-zinc-950/90 backdrop-blur-xl shadow-lg"
    >
      <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
        <Zap className="h-3.5 w-3.5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-white">+{item.result.points} XP</p>
        <p className="text-[10px] text-zinc-500 truncate">{item.label}</p>
      </div>
      {item.result.multiplier > 1 && (
        <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md">
          ×{item.result.multiplier}
        </span>
      )}
    </motion.div>
  );
}
