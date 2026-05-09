'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Star, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LevelUpOverlayProps {
  level: number;
  rank: string;
  onClose: () => void;
}

export function LevelUpOverlay({ level, rank, onClose }: LevelUpOverlayProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 500); // Wait for exit animation
    }, 4500);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(12px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            className="absolute inset-0 bg-black/40 pointer-events-auto"
            onClick={() => setIsVisible(false)}
          />

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative flex flex-col items-center justify-center p-12 text-center"
          >
            {/* Particles/Glowing background */}
            <div className="absolute inset-0 -z-10 flex items-center justify-center">
              <div className="w-64 h-64 bg-primary/20 rounded-full blur-[100px] animate-pulse" />
              <div className="w-48 h-48 bg-purple-500/10 rounded-full blur-[80px] animate-pulse delay-700" />
            </div>

            {/* Icon */}
            <motion.div
              initial={{ rotate: -10, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-20 h-20 mb-8 rounded-3xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-2xl shadow-primary/40 ring-4 ring-white/10"
            >
              <Trophy className="w-10 h-10 text-white" />
            </motion.div>

            {/* Text Hierarchy */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-2 mb-8"
            >
              <h2 className="text-zinc-500 text-xs font-black uppercase tracking-[0.4em] font-orbitron">
                Evolution Complete
              </h2>
              <h1 className="text-6xl font-black text-white tracking-tighter font-orbitron flex items-center gap-4">
                LEVEL <span className="text-primary">{level}</span>
              </h1>
            </motion.div>

            {/* Rank Update */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="px-6 py-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl flex items-center gap-3 group"
            >
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                <Star className="w-3.5 h-3.5 text-primary fill-primary" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">New Rank Unlocked</span>
                <span className="text-sm font-black text-zinc-200 uppercase tracking-wider font-orbitron group-hover:text-primary transition-colors">
                  {rank}
                </span>
              </div>
            </motion.div>

            {/* Minimal Progress Indicator (Cosmetic) */}
            <div className="mt-12 flex items-center gap-1.5">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 + i * 0.1 }}
                  className={cn(
                    "w-1 h-1 rounded-full bg-primary/40",
                    i === 2 && "w-12 h-1 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                  )}
                />
              ))}
            </div>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="mt-12 text-[10px] font-bold text-zinc-600 uppercase tracking-widest"
            >
              Continuing Neural Sync...
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
