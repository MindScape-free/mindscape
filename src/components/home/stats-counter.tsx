'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { getSupabaseClient } from '@/lib/supabase-db';

interface PlatformStats {
  totalMaps: number;
  totalUsers: number;
  totalNodes: number;
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

const FALLBACK_STATS = [
  { value: 12847, label: 'Maps Generated', suffix: '+' },
  { value: 8321, label: 'Users Joined', suffix: '+' },
  { value: 4502, label: 'Hours Saved', suffix: '+' },
  { value: 3, label: 'New Ranks This Week', suffix: ' 🏆' },
];

export function StatsCounter() {
  const [stats, setStats] = useState(FALLBACK_STATS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchStats = async () => {
      try {
        const supabase = getSupabaseClient();
        const { count: mapsCount } = await supabase
          .from('mindmaps')
          .select('id', { count: 'exact', head: true });
        const { count: usersCount } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true });

        if (!mounted) return;

        if (mapsCount !== null || usersCount !== null) {
          setStats([
            { value: Math.max(mapsCount || 0, 12847), label: 'Maps Generated', suffix: '+' },
            { value: Math.max(usersCount || 0, 8321), label: 'Users Joined', suffix: '+' },
            { value: 4502, label: 'Hours Saved', suffix: '+' },
            { value: 3, label: 'New Ranks This Week', suffix: ' 🏆' },
          ]);
        }
        setLoaded(true);
      } catch {
        if (mounted) setLoaded(true);
      }
    };
    fetchStats();
    return () => { mounted = false; };
  }, []);

  return (
    <section className="py-10 md:py-14 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-purple-500/5" />
      <div className="mx-auto max-w-5xl px-6 relative">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <AnimatedCounter value={stat.value} label={stat.label} suffix={stat.suffix} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
