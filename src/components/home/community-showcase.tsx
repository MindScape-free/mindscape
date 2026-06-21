'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Globe,
  ArrowRight,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase-db';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CommunityCard } from '@/components/community/community-card';
import { mapPublicMindMapRows } from '@/lib/map-mappers';

interface PublicMap {
  id: string;
  topic: string;
  shortTitle?: string;
  summary?: string;
  authorName?: string;
  publicCategories?: string[];
  views?: number;
  updatedAt?: string;
  depth?: string;
  thumbnailUrl?: string | null;
}

const FALLBACK_MAPS: PublicMap[] = [
  { id: 'demo-1', topic: 'Quantum Computing Fundamentals', summary: 'Core concepts of quantum mechanics applied to computation', authorName: 'MindScape', publicCategories: ['Science'], views: 1247, depth: 'medium' },
  { id: 'demo-2', topic: 'Machine Learning Pipeline', summary: 'End-to-end ML workflow from data to deployment', authorName: 'MindScape', publicCategories: ['Technology'], views: 982, depth: 'medium' },
  { id: 'demo-3', topic: 'Roman Empire History', summary: 'Rise and fall of one of history\'s greatest civilizations', authorName: 'MindScape', publicCategories: ['History'], views: 756, depth: 'medium' },
  { id: 'demo-4', topic: 'Climate Change Science', summary: 'Understanding global warming, causes and solutions', authorName: 'MindScape', publicCategories: ['Science'], views: 623, depth: 'medium' },
];



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
          .select('*')
          .eq('is_public', true)
          .order('updated_at', { ascending: false })
          .limit(6);

        if (!mounted) return;

        if (data && data.length > 0) {
          setMaps(mapPublicMindMapRows(data) as any);
        }
      } catch (err) {
        console.error('Failed to fetch public maps:', err);
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl border border-white/5 bg-zinc-900/40 p-6 space-y-4 min-h-[220px]">
                <Skeleton className="h-6 w-3/4 bg-white/5 rounded-md" />
                <Skeleton className="h-4 w-full bg-white/5 rounded-md" />
                <Skeleton className="h-4 w-5/6 bg-white/5 rounded-md" />
                <div className="pt-4 flex items-center justify-between">
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-6 rounded-full bg-white/5" />
                    <Skeleton className="h-4 w-12 bg-white/5 rounded-md" />
                  </div>
                  <Skeleton className="h-4 w-16 bg-white/5 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {maps.map((map, index) => (
              <motion.div
                key={map.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="h-full"
              >
                <CommunityCard
                  map={map as any}
                  onClick={() => handleMapClick(map.id)}
                  variant="background"
                />
              </motion.div>
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
