'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Pin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PinnedMessagesBarProps {
  count: number;
  onViewAll: () => void;
  onClose: () => void;
  isVisible?: boolean;
  className?: string;
}

export function PinnedMessagesBar({
  count,
  onViewAll,
  onClose,
  isVisible = true,
  className
}: PinnedMessagesBarProps) {
  if (count === 0 || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={cn(
          'fixed bottom-24 left-1/2 -translate-x-1/2 z-50',
          className
        )}
      >
        <div className="glass-panel px-4 py-2.5 rounded-2xl flex items-center gap-3 shadow-xl ring-1 ring-white/10 border border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Pin className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
            </div>
            <span className="text-sm font-medium text-zinc-300">
              <span className="text-amber-400 font-bold">{count}</span>
              {' '}message{count !== 1 ? 's' : ''} pinned
            </span>
          </div>
          
          <div className="h-4 w-px bg-white/10" />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewAll}
            className="h-7 px-3 text-xs font-bold text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
          >
            View All
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-6 w-6 text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
