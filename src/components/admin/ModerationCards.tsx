'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFirebase } from '@/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
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
} from 'lucide-react';

interface ModerationCardsProps {
  onViewMap?: (id: string) => void;
}

export default function ModerationCards({ onViewMap }: ModerationCardsProps) {
  const { firestore } = useFirebase();
  const [maps, setMaps] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (firestore) fetchPublicMaps();
  }, [firestore]);

  const fetchPublicMaps = useCallback(async () => {
    if (!firestore) return;
    try {
      const mapsRef = collection(firestore, 'publicMindmaps');
      const q = query(mapsRef, orderBy('timestamp', 'desc'), limit(50));
      const snapshot = await getDocs(q);
      setMaps(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [firestore]);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center p-24 space-y-4">
      <div className="animate-spin h-12 w-12 border-2 border-violet-500 border-t-transparent rounded-full" />
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Loading Maps...</p>
    </div>
  );

  if (maps.length === 0) return (
    <div className="flex flex-col items-center justify-center p-24 space-y-4 rounded-2xl bg-zinc-900/20 border border-white/5">
      <ShieldAlert className="h-12 w-12 text-zinc-700" />
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">No public maps to review</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {maps.map((map) => (
        <div 
          key={map.id}
          className="group relative rounded-2xl p-5 bg-zinc-900/40 border border-white/5 hover:border-violet-500/25 transition-all duration-500"
        >
          <div className="flex items-start gap-4 mb-4">
            <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
              <MapIcon className="h-5 w-5 text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-black text-white group-hover:text-violet-400 transition-colors truncate">
                  {map.shortTitle || (map.title || map.topic || 'Untitled').substring(0, 30)}
                </p>
                {map.isFeatured && (
                  <Badge className="shrink-0 bg-violet-500/20 text-violet-400 border-none text-[10px] font-black uppercase tracking-wider">
                    Prime
                  </Badge>
                )}
              </div>
              <p className="text-[9px] text-zinc-600 font-mono truncate">
                Author: {map.originalAuthorId || map.userId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-4 text-[10px]">
            <div className="flex items-center gap-1.5">
              <div className="p-1.5 bg-zinc-800 rounded-lg">
                <MapIcon className="h-3 w-3 text-zinc-500" />
              </div>
              <span className="font-bold text-zinc-400">{map.nodeCount || 0} nodes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="p-1.5 bg-zinc-800 rounded-lg">
                <Clock className="h-3 w-3 text-zinc-500" />
              </div>
              <span className="font-bold text-zinc-500">
                {map.timestamp ? formatDistanceToNow(toDate(map.timestamp), { addSuffix: true }) : 'Unknown'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewMap?.(map.id)}
              className="flex-1 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-400 hover:text-white text-[9px] font-black uppercase tracking-widest transition-all"
            >
              <Eye className="h-3 w-3 mr-2" />
              View
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 transition-all"
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 transition-all"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
