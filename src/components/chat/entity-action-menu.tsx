'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Map,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type EntityAction = 'ask' | 'explore' | 'explain';

interface ActionItem {
  id: EntityAction;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const ACTIONS: ActionItem[] = [
  {
    id: 'ask',
    icon: MessageSquare,
    label: 'Deep Dive',
  },
  {
    id: 'explore',
    icon: Map,
    label: 'Mind Map',
  },
  {
    id: 'explain',
    icon: Sparkles,
    label: 'Quick Explain',
  },
];

interface EntityActionMenuProps {
  topic: string;
  children: React.ReactNode;
  onAction: (action: EntityAction, topic: string) => void;
}

export function EntityActionMenu({ topic, children, onAction }: EntityActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleAction = (action: EntityAction) => {
    setIsOpen(false);
    onAction(action, topic);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <span className="relative inline-flex items-center group">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen(!isOpen);
              }}
              className={cn(
                "inline-flex items-center gap-0.5 px-0.5 -mx-0.5 rounded-md transition-all duration-200",
                "text-zinc-300 font-bold underline underline-offset-4 decoration-dotted decoration-zinc-600",
                "hover:text-white hover:decoration-primary hover:bg-white/5",
                isOpen && "text-white decoration-primary bg-white/5"
              )}
            >
              {children}
              <ChevronDown
                className={cn(
                  "w-2.5 h-2.5 opacity-0 -ml-0.5 transition-all duration-200",
                  "group-hover:opacity-60",
                  isOpen ? "opacity-60 rotate-180" : ""
                )}
              />
            </button>
          </TooltipTrigger>
          {!isOpen && (
            <TooltipContent
              side="top"
              className="bg-zinc-900/95 backdrop-blur-xl border border-white/10 text-zinc-400 text-[10px] font-medium px-2.5 py-1.5 rounded-lg shadow-xl"
            >
              Click for actions
            </TooltipContent>
          )}
        </Tooltip>

        {/* Compact Action Bar */}
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop */}
              <span
                className="fixed inset-0 z-40 block"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsOpen(false);
                }}
              />

              {/* Compact Menu */}
              <motion.span
                initial={{ opacity: 0, scale: 0.9, y: -2 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -2 }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
                className={cn(
                  "absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50 block",
                  "rounded-xl overflow-hidden",
                  "bg-zinc-900/95 backdrop-blur-2xl border border-white/10",
                  "shadow-2xl shadow-black/50"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Topic + Actions in one compact row */}
                <span className="flex items-center gap-1 p-1 block">
                  {/* Topic pill */}
                  <span className="px-2.5 py-1.5 text-[10px] font-semibold text-zinc-300 truncate max-w-[120px] flex-shrink-0 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-primary inline-block flex-shrink-0" />
                    <span className="truncate">{topic}</span>
                  </span>

                  {/* Divider */}
                  <span className="w-px h-5 bg-white/10 flex-shrink-0 inline-block" />

                  {/* Action icon buttons */}
                  {ACTIONS.map((action) => {
                    const Icon = action.icon;
                    return (
                      <Tooltip key={action.id}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleAction(action.id);
                            }}
                            className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                              "transition-all duration-150",
                              "text-zinc-500 hover:text-white hover:bg-white/10 active:scale-90"
                            )}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent
                          side="bottom"
                          className="bg-zinc-950 border border-white/10 text-[10px] font-medium px-2 py-1 rounded-lg shadow-xl"
                        >
                          {action.label}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </span>
              </motion.span>
            </>
          )}
        </AnimatePresence>
      </span>
    </TooltipProvider>
  );
}
