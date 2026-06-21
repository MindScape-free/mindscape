'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface StatItem {
  value: number;
  label: string;
  suffix: string;
}

function AnimatedCounter({ value, label, suffix = '' }: { value: number; label: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const duration = 2000;
          const steps = 60;
          const increment = value / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= value) {
              setDisplay(value);
              clearInterval(timer);
            } else {
              setDisplay(Math.floor(current));
            }
          }, duration / steps);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div ref={ref} className="text-center group">
      <div className="text-3xl md:text-4xl font-black text-white tabular-nums tracking-tight">
        <span className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
          {formatNumber(display)}
        </span>
        <span className="text-primary">{suffix}</span>
      </div>
      <p className="text-xs md:text-sm text-zinc-500 font-medium mt-1 uppercase tracking-wider">
        {label}
      </p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="text-center motion-safe:animate-pulse" aria-hidden="true">
      <div className="flex justify-center">
        <div className="h-9 md:h-[2.25rem] w-24 rounded-md shimmer bg-zinc-800/60" />
      </div>
      <div className="flex justify-center mt-1">
        <div className="h-[12px] w-28 rounded shimmer bg-zinc-800/40" />
      </div>
    </div>
  );
}

export function StatsCounter() {
  const [stats, setStats] = useState<StatItem[]>([
    { value: 0, label: 'Maps Generated', suffix: '+' },
    { value: 0, label: 'Users Joined', suffix: '+' },
    { value: 0, label: 'Total Nodes', suffix: '+' },
    { value: 0, label: 'Study Hours', suffix: '+' },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    fetch('/api/stats/public')
      .then((res) => res.json())
      .then((data: { mapsCount: number; usersCount: number; nodesCount: number; studyHours: number }) => {
        if (!mounted) return;
        setStats([
          { value: data.mapsCount, label: 'Maps Generated', suffix: '+' },
          { value: data.usersCount, label: 'Users Joined', suffix: '+' },
          { value: data.nodesCount, label: 'Total Nodes', suffix: '+' },
          { value: data.studyHours, label: 'Study Hours', suffix: '+' },
        ]);
      })
      .catch((err) => console.error('[StatsCounter] Failed to fetch stats:', err))
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, []);

  return (
    <section className="py-10 md:py-14 relative overflow-hidden">
      <style jsx>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          .shimmer {
            background: linear-gradient(
              90deg,
              rgb(39 39 42) 25%,
              rgb(63 63 70) 50%,
              rgb(39 39 42) 75%
            );
            background-size: 200% 100%;
            animation: shimmer 1.5s ease-in-out infinite;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .shimmer {
            background: rgb(39 39 42);
          }
        }
      `}</style>
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-purple-500/5" />
      <div className="mx-auto max-w-5xl px-6 relative">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {loading ? (
            <>
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <SkeletonCard />
                </motion.div>
              ))}
            </>
          ) : (
            stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <AnimatedCounter value={stat.value} label={stat.label} suffix={stat.suffix} />
              </motion.div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
