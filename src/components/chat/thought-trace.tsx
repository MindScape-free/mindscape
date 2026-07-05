'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, BrainCircuit, ChevronDown, ChevronRight, Search, GitBranch, Sparkles, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThoughtChainItem {
  type: 'hypothesis' | 'analysis' | 'synthesis' | 'tool';
  content: string;
}

interface ThoughtTraceProps {
  reasoning?: string;
  thoughtChain?: ThoughtChainItem[];
  initiallyExpanded?: boolean;
}

const ICONS = {
  hypothesis: Lightbulb,
  analysis: Search,
  synthesis: Sparkles,
  tool: GitBranch,
};

const COLORS = {
  hypothesis: 'text-amber-400',
  analysis: 'text-blue-400',
  synthesis: 'text-purple-400',
  tool: 'text-emerald-400',
};

export function ThoughtTrace({ reasoning, thoughtChain, initiallyExpanded = false }: ThoughtTraceProps) {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);

  if (!reasoning && (!thoughtChain || thoughtChain.length === 0)) return null;

  return (
    <div className="mb-4 text-left">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="inline-flex items-center gap-1.5 py-1 text-zinc-500 hover:text-zinc-300 font-sans text-xs font-semibold cursor-pointer transition-all select-none group"
      >
        <div className="relative w-3.5 h-3.5 flex items-center justify-center">
          <Brain className="w-3.5 h-3.5 text-zinc-500 group-hover:text-primary transition-colors" />
        </div>
        <span className="tracking-wide">
          {isExpanded ? 'Thinking Process' : 'View Thinking Process'}
        </span>
        <ChevronRight className={cn("w-3 h-3 text-zinc-500/80 transition-transform duration-200", isExpanded && "rotate-90")} />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pl-4 border-l border-zinc-800/80 ml-1.5 mt-1.5 mb-3 text-[12.5px] text-zinc-400 font-sans leading-relaxed tracking-wide space-y-4">
              {/* Philosophical Reasoning */}
              {reasoning && (
                <p className="italic text-zinc-400/80">
                  {reasoning}
                </p>
              )}

              {/* Technical Thought Chain */}
              {thoughtChain && thoughtChain.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-white/5">
                  <div className="space-y-2.5">
                    {thoughtChain.map((item, idx) => {
                      const Icon = ICONS[item.type] || Sparkles;
                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="flex gap-2.5 items-start group"
                        >
                          <div className={cn("mt-0.5", COLORS[item.type])}>
                            <Icon className="w-3 h-3" />
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className={cn("text-[9px] font-black uppercase tracking-wider", COLORS[item.type])}>
                              {item.type}
                            </span>
                            <span className="text-[11px] text-zinc-400 group-hover:text-zinc-300 transition-colors">
                              {item.content}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
