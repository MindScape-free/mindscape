'use client';

import { getSupabaseClient } from '@/lib/supabase-db';
import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/lib/auth-context';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toDate } from '@/types/chat';
import {
  Map as MapIcon,
  Clock,
  Eye,
  Trash2,
  CheckCircle,
  ShieldAlert,
  Layers,
} from 'lucide-react';
import { MindMapData } from '@/types/mind-map';

interface ModerationCardsProps {
  onViewMap?: (mapId: string) => void;
}

export function ModerationCards({ onViewMap }: ModerationCardsProps) {
  const [maps, setMaps] = useState<MindMapData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useUser();

  const fetchPublicMaps = useCallback(async () => {
    setIsLoading(true);
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('maps')
      .select('*')
      .eq('isPublic', true)
      .order('timestamp', { ascending: false })
      .limit(20);

    if (!error && data) {
      setMaps(data as MindMapData[]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchPublicMaps();
  }, [fetchPublicMaps]);

  if (isLoading) return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-48 rounded-[2rem] bg-white/5 border border-white/10 animate-pulse" />
      ))}
    </div>
  );

  if (maps.length === 0) return (
    <div className="flex flex-col items-center justify-center p-24 space-y-6 rounded-[2.5rem] bg-white/5 border border-white/10 backdrop-blur-xl">
      <div className="p-6 rounded-[2rem] bg-white/5 opacity-30">
        <ShieldAlert className="h-12 w-12 text-zinc-500" />
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600">No public maps to review</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {maps.map((map) => (
        <div 
          key={map.id}
          className="group relative rounded-[2rem] p-6 bg-white/5 border border-white/10 hover:border-violet-500/30 transition-all duration-500 backdrop-blur-2xl shadow-xl overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative flex items-start gap-6 mb-6">
            <div className="h-14 w-14 rounded-2xl bg-violet-500/10 flex items-center justify-center shrink-0 border border-violet-500/20 group-hover:scale-110 transition-transform duration-500">
              <MapIcon className="h-7 w-7 text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <p className="text-lg font-black text-white group-hover:text-violet-400 transition-colors truncate tracking-tight">
                  {map.shortTitle || (map.topic || 'Untitled').substring(0, 30)}
                </p>
                {(map as any).isFeatured && (
                  <Badge className="shrink-0 bg-violet-500/20 text-violet-400 border border-violet-500/20 text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full">
                    Prime
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Author Signature:</span>
                <span className="text-[9px] text-zinc-500 font-mono bg-white/[0.03] px-2 py-0.5 rounded border border-white/5 truncate">
                  {map.originalAuthorId || map.userId || 'Unknown'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 mb-8">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white/5 rounded-xl border border-white/10">
                <Layers className="h-3.5 w-3.5 text-zinc-500" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{map.nodeCount || 0} Nodes</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white/5 rounded-xl border border-white/10">
                <Clock className="h-3.5 w-3.5 text-zinc-500" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                {(map as any).timestamp ? formatDistanceToNow(toDate((map as any).timestamp), { addSuffix: true }) : 'Unknown'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewMap?.(map.id!)}
              className="flex-1 h-12 rounded-[1.2rem] bg-white/5 border border-white/10 hover:bg-violet-600 hover:text-white text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg"
            >
              <Eye className="h-4 w-4 mr-2" />
              Analyze
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-[1.2rem] bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 transition-all shadow-lg shadow-emerald-500/5 group/btn"
              title="Approve Content"
            >
              <CheckCircle className="h-5 w-5 group-hover/btn:scale-110 transition-transform" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-[1.2rem] bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 transition-all shadow-lg shadow-red-500/5 group/btn"
              title="Blacklist Content"
            >
              <Trash2 className="h-5 w-5 group-hover/btn:scale-110 transition-transform" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
