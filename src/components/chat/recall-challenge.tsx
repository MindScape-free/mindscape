'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Brain, ArrowRightLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RecallChallengeProps {
  topicA: string;
  topicB: string;
  question: string;
  onAccept?: () => void;
}

export function RecallChallenge({ topicA, topicB, question, onAccept }: RecallChallengeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="my-6 p-6 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-white/10 backdrop-blur-xl relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Brain className="w-24 h-24 text-white" />
      </div>

      <div className="relative z-10 space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-white/5 border border-white/10">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Active Recall Challenge</span>
        </div>

        <div className="flex items-center gap-4 py-2">
          <div className="flex-1 p-3 rounded-2xl bg-white/5 border border-white/5 text-center">
            <span className="text-sm font-bold text-white">{topicA}</span>
          </div>
          <ArrowRightLeft className="w-4 h-4 text-zinc-500" />
          <div className="flex-1 p-3 rounded-2xl bg-white/5 border border-white/5 text-center">
            <span className="text-sm font-bold text-white">{topicB}</span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-lg font-medium text-zinc-200 leading-tight">
            {question}
          </p>
          <p className="text-xs text-zinc-500 leading-relaxed italic">
            "Explaining the connection yourself strengthens your neural pathways for this topic."
          </p>
        </div>

        <Button
          onClick={onAccept}
          className="w-full h-12 rounded-2xl bg-white text-black hover:bg-zinc-200 font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          Challenge Accepted
        </Button>
      </div>
    </motion.div>
  );
}
