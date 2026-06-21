'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Atom,
  Brain,
  Globe,
  Cpu,
  Dna,
  Landmark,
  Palette,
  Coins,
  HeartPulse,
  BookOpen,
  FlaskConical,
  Rocket,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface QuickStartTopic {
  icon: any;
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const QUICK_START_TOPICS: QuickStartTopic[] = [
  { icon: Atom, label: 'Quantum Computing', emoji: '🔬', color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/20' },
  { icon: Brain, label: 'Machine Learning vs Deep Learning', emoji: '🤖', color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20' },
  { icon: Landmark, label: 'Roman Empire', emoji: '🏛️', color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20' },
  { icon: Dna, label: 'Genetic Algorithms', emoji: '🧬', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20' },
  { icon: Coins, label: 'Blockchain Technology', emoji: '📈', color: 'text-orange-400', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/20' },
  { icon: Palette, label: 'Color Theory', emoji: '🎨', color: 'text-pink-400', bgColor: 'bg-pink-500/10', borderColor: 'border-pink-500/20' },
  { icon: Globe, label: 'Climate Change', emoji: '🌍', color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/20' },
  { icon: BookOpen, label: 'Stoicism', emoji: '🧠', color: 'text-violet-400', bgColor: 'bg-violet-500/10', borderColor: 'border-violet-500/20' },
  { icon: FlaskConical, label: 'CRISPR Gene Editing', emoji: '🧪', color: 'text-rose-400', bgColor: 'bg-rose-500/10', borderColor: 'border-rose-500/20' },
  { icon: HeartPulse, label: 'Human Anatomy', emoji: '❤️', color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20' },
  { icon: Rocket, label: 'Space Exploration', emoji: '🚀', color: 'text-indigo-400', bgColor: 'bg-indigo-500/10', borderColor: 'border-indigo-500/20' },
];

interface QuickStartGridProps {
  onSelectTopic: (topic: string) => void;
  visible?: boolean;
}

export function QuickStartGrid({ onSelectTopic, visible = true }: QuickStartGridProps) {
  // Deterministic initial set (first 8 topics) for SSR to avoid hydration mismatch.
  // Shuffled client-side after hydration via useEffect.
  const [shuffled, setShuffled] = useState(() =>
    QUICK_START_TOPICS.slice(0, 8)
  );

  useEffect(() => {
    setShuffled(
      [...QUICK_START_TOPICS].sort(() => 0.5 - Math.random()).slice(0, 8)
    );
  }, []);

  if (!visible) return null;

  return (
    <section className="py-12 md:py-16 relative">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-8 md:mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="h-[1px] w-6 bg-gradient-to-r from-transparent to-primary/50" />
            <Sparkles className="w-4 h-4 text-primary" />
            <div className="h-[1px] w-6 bg-gradient-to-l from-transparent to-primary/50" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Try one of these — just click and go
          </h2>
          <p className="text-zinc-500 text-sm mt-2 max-w-md mx-auto">
            No typing needed. Pick a topic and we&apos;ll generate a mind map instantly.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-w-4xl mx-auto">
          {shuffled.map((topic, index) => (
            <motion.button
              key={topic.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.04 }}
              onClick={() => onSelectTopic(topic.label)}
              className={cn(
                "group relative flex items-center gap-3 p-3 sm:p-4 rounded-2xl border transition-all duration-300",
                "hover:scale-[1.03] hover:shadow-lg active:scale-95 cursor-pointer text-left",
                topic.borderColor,
                topic.bgColor,
                "hover:brightness-125"
              )}
            >
              <div className={cn(
                "w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0",
                "bg-zinc-950 border border-white/5 shadow-inner transition-transform group-hover:rotate-6",
                topic.color
              )}>
                <topic.icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-bold text-white leading-tight block line-clamp-2">
                  {topic.emoji} {topic.label}
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}
