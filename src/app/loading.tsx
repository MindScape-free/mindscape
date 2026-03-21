
'use client';

import { motion } from 'framer-motion';
import { Icons } from '@/components/icons';

/**
 * A global loading component displayed as a fallback for suspended routes.
 * Features a premium branded animation.
 */
export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-6.5rem)] gap-4">
      <div className="relative">
        {/* Outer rotating ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="h-20 w-20 rounded-full border-2 border-primary/20 border-t-primary shadow-[0_0_20px_rgba(139,92,246,0.3)]"
        />

        {/* Inner logo pulsing */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.7, 1, 0.7]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Icons.logo className="h-8 w-8 text-primary drop-shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
          </motion.div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center"
      >
        <span className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500 font-orbitron animate-pulse">
          Quantum Syncing
        </span>
        <div className="mt-2 flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              className="h-1 w-1 rounded-full bg-primary"
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
