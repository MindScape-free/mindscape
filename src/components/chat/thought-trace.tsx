'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, ChevronDown, ChevronUp, Search, GitBranch, Sparkles, Lightbulb } from 'lucide-react';
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
    <div className="mb-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-magenta-500/5 border border-magenta-500/10 hover:bg-magenta-500/10 transition-colors group"
      >
        <BrainCircuit className="w-3.5 h-3.5 text-magenta-400 group-hover:scale-110 transition-transform" />
        <span className="text-[10px] font-black text-magenta-400 uppercase tracking-widest">
          {isExpanded ? 'Neural Trace Active' : 'View Thought Process'}
        </span>
        {isExpanded ? (
          <ChevronUp className="w-3 h-3 text-magenta-400/50" />
        ) : (
          <ChevronDown className="w-3 h-3 text-magenta-400/50" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="mt-3 p-4 rounded-2xl bg-zinc-950/40 border border-white/5 backdrop-blur-md space-y-4">
              {/* Philosophical Reasoning */}
              {reasoning && (
                <div className="space-y-1">
                  <h4 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Philosophical Intent</h4>
                  <p className="text-xs text-zinc-300 italic leading-relaxed">
                    "{reasoning}"
                  </p>
                </div>
              )}

              {/* Technical Thought Chain */}
              {thoughtChain && thoughtChain.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Cognitive Steps</h4>
                  <div className="space-y-3">
                    {thoughtChain.map((item, idx) => {
                      const Icon = ICONS[item.type] || Sparkles;
                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="flex gap-3 items-start group"
                        >
                          <div className={cn(
                            "mt-0.5 p-1.5 rounded-lg bg-white/5 border border-white/5 group-hover:border-white/10 transition-colors",
                            COLORS[item.type]
                          )}>
                            <Icon className="w-3 h-3" />
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className={cn("text-[8px] font-black uppercase tracking-wider", COLORS[item.type])}>
                              {item.type}
                            </span>
                            <span className="text-[11px] text-zinc-400 group-hover:text-zinc-200 transition-colors leading-snug">
                              {item.content}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              <div className="pt-2 flex items-center gap-2 opacity-30">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.3em]">Collective Memory Link</span>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
