'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Map, Sparkles } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { EntityAction } from './entity-action-menu';

interface TextSelectionMenuProps {
  text: string;
  position: { x: number; y: number };
  onAction: (action: EntityAction, text: string) => void;
  onClose: () => void;
}

export function TextSelectionMenu({ text, position, onAction, onClose }: TextSelectionMenuProps) {
  const actions = [
    { id: 'ask' as const, icon: MessageSquare, label: 'Deep Dive' },
    { id: 'explore' as const, icon: Map, label: 'Mind Map' },
    { id: 'explain' as const, icon: Sparkles, label: 'Quick Explain' },
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 5, x: '-50%' }}
        animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }}
        exit={{ opacity: 0, scale: 0.9, y: 5, x: '-50%' }}
        transition={{ duration: 0.15 }}
        style={{
          position: 'absolute',
          top: `${position.y - 48}px`, // position above the selection
          left: `${position.x}px`,
          zIndex: 500,
        }}
        onMouseDown={(e) => {
          // Prevent selection from collapsing when clicking elements inside the menu
          // Use stopPropagation instead of preventDefault to avoid breaking button click events
          e.stopPropagation();
        }}
        className="text-selection-menu rounded-xl bg-zinc-900/95 backdrop-blur-2xl border border-white/10 shadow-2xl p-1 flex items-center gap-1"
      >
        <span className="px-2 py-1 text-[10px] font-semibold text-zinc-400 max-w-[100px] truncate border-r border-white/10 mr-1 select-none">
          "{text}"
        </span>

        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <Tooltip key={act.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onAction(act.id, text);
                    onClose();
                  }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-zinc-950 border border-white/10 text-[10px] font-medium px-2 py-1 rounded-lg">
                {act.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </motion.div>
    </TooltipProvider>
  );
}
