'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Clock,
  Plus,
  ArrowRight,
  Network,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSupabaseClient } from '@/lib/supabase-db';
import { useUser } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

interface RecentMap {
  id: string;
  topic: string;
  node_count?: number;
  depth?: string;
  created_at: string;
}

export function RecentMaps() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const supabase = getSupabaseClient();
  const [maps, setMaps] = useState<RecentMap[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      const timeoutId = setTimeout(() => {
        setIsLoading(false);
      }, 0);
      return () => clearTimeout(timeoutId);
    }

    let mounted = true;
    const fetchMaps = async () => {
      try {
        const { data } = await supabase
          .from('mindmaps')
          .select('id, topic, node_count, depth, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(4);

        if (!mounted) return;
        setMaps(data || []);
      } catch {
        // Silently fail
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    fetchMaps();
    return () => { mounted = false; };
  }, [user, isUserLoading, supabase]);

  // Don't render for non-logged-in users
  if (!user || isUserLoading) return null;

  return (
    <section className="py-8 md:py-10">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Continue where you left off
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/library')}
            className="text-xs text-zinc-400 hover:text-white gap-1"
          >
            View all
            <ArrowRight className="w-3 h-3" />
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-2xl border border-white/5 bg-zinc-900/40 p-4 space-y-2">
                <Skeleton className="h-4 w-3/4 bg-white/5" />
                <Skeleton className="h-3 w-1/2 bg-white/5" />
              </div>
            ))}
          </div>
        ) : maps.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {maps.map((map, index) => (
              <motion.button
                key={map.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => router.push(`/canvas?mapId=${map.id}`)}
                className="group relative rounded-2xl border border-white/5 bg-zinc-900/40 p-4 text-left transition-all duration-300 hover:border-primary/20 hover:bg-zinc-900/60 hover:shadow-lg hover:shadow-primary/5 active:scale-[0.97]"
              >
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Network className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-white line-clamp-2 group-hover:text-primary transition-colors">
                      {map.topic}
                    </h3>
                    <p className="text-[10px] text-zinc-600 mt-0.5">
                      {map.node_count ?? '?'} nodes · {map.depth ?? 'auto'} depth
                    </p>
                  </div>
                </div>
                <p className="text-[10px] text-zinc-600">
                  {formatDistanceToNow(new Date(map.created_at), { addSuffix: true })}
                </p>
              </motion.button>
            ))}

            {/* New Map Card */}
            <motion.button
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="rounded-2xl border-2 border-dashed border-white/10 bg-zinc-900/20 p-4 flex flex-col items-center justify-center gap-2 transition-all duration-300 hover:border-primary/30 hover:bg-zinc-900/40 hover:shadow-lg active:scale-[0.97] min-h-[100px] group"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Plus className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs font-bold text-zinc-500 group-hover:text-zinc-300 transition-colors">
                New Map
              </span>
            </motion.button>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-zinc-900/20 p-8 text-center">
            <p className="text-zinc-500 text-sm">
              You haven&apos;t created any maps yet. Try one of the quick start topics above!
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
