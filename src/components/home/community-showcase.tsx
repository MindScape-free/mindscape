'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Globe,
  Users,
  Eye,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSupabaseClient } from '@/lib/supabase-db';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface PublicMap {
  id: string;
  topic: string;
  summary?: string;
  author_name?: string;
  publicCategories?: string[];
  views?: number;
  updated_at?: string;
}

const FALLBACK_MAPS: PublicMap[] = [
  { id: 'demo-1', topic: 'Quantum Computing Fundamentals', summary: 'Core concepts of quantum mechanics applied to computation', author_name: 'MindScape', publicCategories: ['Science'], views: 1247 },
  { id: 'demo-2', topic: 'Machine Learning Pipeline', summary: 'End-to-end ML workflow from data to deployment', author_name: 'MindScape', publicCategories: ['Technology'], views: 982 },
  { id: 'demo-3', topic: 'Roman Empire History', summary: 'Rise and fall of one of history\'s greatest civilizations', author_name: 'MindScape', publicCategories: ['History'], views: 756 },
  { id: 'demo-4', topic: 'Climate Change Science', summary: 'Understanding global warming, causes and solutions', author_name: 'MindScape', publicCategories: ['Science'], views: 623 },
];

const CATEGORY_COLORS: Record<string, string> = {
  'Science': 'from-emerald-500/20 to-teal-500/10 border-emerald-500/20 text-emerald-400',
  'Technology': 'from-blue-500/20 to-cyan-500/10 border-blue-500/20 text-blue-400',
  'History': 'from-amber-500/20 to-orange-500/10 border-amber-500/20 text-amber-400',
  'Philosophy': 'from-violet-500/20 to-purple-500/10 border-violet-500/20 text-violet-400',
  'Business': 'from-rose-500/20 to-pink-500/10 border-rose-500/20 text-rose-400',
  'Art': 'from-fuchsia-500/20 to-pink-500/10 border-fuchsia-500/20 text-fuchsia-400',
  'Health': 'from-green-500/20 to-emerald-500/10 border-green-500/20 text-green-400',
};

function getCategoryColor(cat: string): string {
  for (const [key, val] of Object.entries(CATEGORY_COLORS)) {
    if (cat.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return 'from-primary/20 to-purple-500/10 border-primary/20 text-primary';
}

export function CommunityShowcase() {
  const router = useRouter();
  const [maps, setMaps] = useState<PublicMap[]>(FALLBACK_MAPS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchMaps = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase
          .from('public_mindmaps')
          .select('id, topic, summary, author_name, publicCategories, views, updated_at')
          .eq('is_public', true)
          .order('updated_at', { ascending: false })
          .limit(6);

        if (!mounted) return;

        if (data && data.length > 0) {
          setMaps(data.slice(0, 6));
        }
      } catch {
        // Use fallback
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    fetchMaps();
    return () => { mounted = false; };
  }, []);

  const handleMapClick = (id: string) => {
    if (id.startsWith('demo-')) {
      // For demo maps, navigate to a new canvas with the topic pre-filled
      const map = maps.find(m => m.id === id);
      if (map) router.push(`/canvas?topic=${encodeURIComponent(map.topic)}`);
    } else {
      router.push(`/canvas?publicMapId=${id}`);
    }
  };

  return (
    <section className="py-12 md:py-16 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.01] to-transparent" />

      <div className="mx-auto max-w-7xl px-6 relative">
        <div className="text-center mb-8 md:mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Globe className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Explore what others are mapping
          </h2>
          <p className="text-zinc-500 text-sm mt-2 max-w-lg mx-auto">
            Discover knowledge maps created by the MindScape community.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl border border-white/5 bg-zinc-900/40 p-5 space-y-3">
                <Skeleton className="h-5 w-3/4 bg-white/5" />
                <Skeleton className="h-3 w-full bg-white/5" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16 rounded-full bg-white/5" />
                  <Skeleton className="h-5 w-12 rounded-full bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {maps.map((map, index) => (
              <motion.button
                key={map.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                onClick={() => handleMapClick(map.id)}
                className="group relative text-left rounded-2xl border border-white/5 bg-zinc-900/40 p-5 transition-all duration-300 hover:border-primary/20 hover:bg-zinc-900/60 hover:shadow-lg hover:shadow-primary/5 active:scale-[0.98]"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="text-base font-bold text-white group-hover:text-primary transition-colors line-clamp-2">
                    {map.topic}
                  </h3>
                  <Eye className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />
                </div>

                {map.summary && (
                  <p className="text-xs text-zinc-500 line-clamp-3 mb-3 leading-relaxed">
                    {map.summary}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {map.publicCategories?.slice(0, 2).map((cat) => (
                      <span
                        key={cat}
                        className={cn(
                          "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                          getCategoryColor(cat)
                        )}
                      >
                        {cat}
                      </span>
                    ))}
                    {(map.publicCategories?.length ?? 0) > 2 && (
                      <span className="text-[9px] text-zinc-600">+{map.publicCategories!.length - 2}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-zinc-600">
                    <Eye className="w-3 h-3" />
                    <span className="text-[10px] font-medium tabular-nums">{map.views ?? 0}</span>
                  </div>
                </div>

                {map.author_name && (
                  <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-1.5">
                    <Users className="w-3 h-3 text-zinc-600" />
                    <span className="text-[10px] text-zinc-600">{map.author_name}</span>
                  </div>
                )}

                {/* View overlay on hover */}
                <div className="absolute inset-0 rounded-2xl bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </motion.button>
            ))}
          </div>
        )}

        <div className="text-center mt-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/community')}
            className="text-sm text-zinc-400 hover:text-white group gap-2"
          >
            Browse all community maps
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </section>
  );
}
