'use client';

import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { toDate } from '@/types/chat';
import { Badge } from '@/components/ui/badge';
import {
  Map as MapIcon,
  Eye,
  ExternalLink,
  Library,
} from 'lucide-react';

interface UserMapsTableProps {
  userMaps: any[];
  isLoading: boolean;
  userId: string;
}

export default function UserMapsTable({ userMaps, isLoading, userId }: UserMapsTableProps) {
  return (
    <div className="relative overflow-hidden rounded-[2.5rem] bg-white/[0.02] border border-white/10 p-8 transition-all hover:border-white/20 hover:bg-white/[0.04] shadow-[inset_0_0_40px_rgba(255,255,255,0.01)] group/library">
      <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-600/[0.03] rounded-full blur-[120px] pointer-events-none group-hover/library:bg-indigo-600/[0.06] transition-all duration-700" />
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
            <Library className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white tracking-tighter">Subject Library ({userMaps.length})</h3>
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500 mt-0.5">Mindmap index</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="relative z-10">
          <div className="overflow-x-auto custom-scrollbar pb-4">
            <table className="w-full border-separate border-spacing-y-3">
              <thead>
                <tr>
                  <th className="text-left text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 pb-2 pl-6">Topic / Signature</th>
                  <th className="text-center text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 pb-2">Sync Date</th>
                  <th className="text-center text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 pb-2">Nodes</th>
                  <th className="text-center text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 pb-2">Reach</th>
                  <th className="text-center text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 pb-2">Origin</th>
                  <th className="text-right text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 pb-2 pr-6">Access</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 3 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-2.5 pl-4 bg-white/[0.02] rounded-l-2xl border-y border-l border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10" />
                        <div className="space-y-1.5">
                          <div className="h-3 w-32 bg-white/10 rounded" />
                          <div className="h-2.5 w-16 bg-white/5 rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 bg-white/[0.02] border-y border-white/5">
                      <div className="h-3 w-20 bg-white/5 rounded mx-auto" />
                    </td>
                    <td className="py-2.5 bg-white/[0.02] border-y border-white/5">
                      <div className="h-4.5 w-8 bg-white/5 rounded-full mx-auto" />
                    </td>
                    <td className="py-2.5 bg-white/[0.02] border-y border-white/5">
                      <div className="h-3 w-10 bg-white/5 rounded mx-auto" />
                    </td>
                    <td className="py-2.5 bg-white/[0.02] border-y border-white/5">
                      <div className="h-5 w-12 bg-white/5 rounded-lg mx-auto" />
                    </td>
                    <td className="py-2.5 pr-4 bg-white/[0.02] rounded-r-2xl border-y border-r border-white/5">
                      <div className="h-8 w-8 bg-white/5 rounded-lg ml-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : userMaps.length > 0 ? (
        <div className="relative z-10">
          <div className="overflow-x-auto custom-scrollbar pb-4">
            <table className="w-full border-separate border-spacing-y-3">
              <thead>
                <tr>
                  <th className="text-left text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 pb-2 pl-6">Topic / Signature</th>
                  <th className="text-center text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 pb-2">Sync Date</th>
                  <th className="text-center text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 pb-2">Nodes</th>
                  <th className="text-center text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 pb-2">Reach</th>
                  <th className="text-center text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 pb-2">Origin</th>
                  <th className="text-right text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 pb-2 pr-6">Access</th>
                </tr>
              </thead>
              <tbody>
                {userMaps.map(m => {
                  return (
                    <motion.tr 
                      key={m.id} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="group/row"
                    >
                      <td className="py-2.5 pl-4 bg-white/[0.02] rounded-l-2xl border-y border-l border-white/5 group-hover/row:bg-white/[0.05] transition-all duration-300">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 flex items-center justify-center border border-white/10 shadow-lg group-hover/row:scale-110 group-hover/row:rotate-3 transition-transform duration-500">
                            <MapIcon className="h-4 w-4 text-violet-400" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-black text-white group-hover/row:text-violet-400 transition-colors truncate block max-w-[240px]">
                              {m.shortTitle || m.topic || 'Untitled Knowledge'}
                            </span>
                            <span className="text-[7px] font-black text-zinc-600 uppercase tracking-tighter">
                              SIG: {(m.id || '').substring((m.id || '').length - 8).toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 text-center bg-white/[0.02] border-y border-white/5 group-hover/row:bg-white/[0.05] transition-colors">
                        <span className="text-[9px] font-black text-zinc-500 tracking-tighter uppercase">{m.createdAt ? format(toDate(m.createdAt), 'MMM dd, HH:mm') : '-'}</span>
                      </td>
                      <td className="py-2.5 text-center bg-white/[0.02] border-y border-white/5 group-hover/row:bg-white/[0.05] transition-colors">
                        <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[8px] font-black px-2 py-0.5 rounded-full">{m.nodeCount || 0}</Badge>
                      </td>
                      <td className="py-2.5 text-center bg-white/[0.02] border-y border-white/5 group-hover/row:bg-white/[0.05] transition-colors">
                        <div className="flex items-center justify-center gap-1.5">
                          <Eye className="h-3 w-3 text-emerald-500" />
                          <span className="text-[9px] font-black text-emerald-400">{m.publicViews || 0}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-center bg-white/[0.02] border-y border-white/5 group-hover/row:bg-white/[0.05] transition-colors">
                        {(() => {
                          const st = m.sourceFileType || m.sourceType;
                          const isYouTube = m.sourceUrl?.includes('youtube.com') || m.sourceUrl?.includes('youtu.be') || st === 'youtube' || !!m.videoId;
                          const icon = isYouTube ? '🎥' : st === 'pdf' ? '📄' : st === 'image' ? '🖼️' : st === 'website' || m.sourceUrl ? '🌐' : st === 'multi' ? '📦' : '📝';
                          const label = isYouTube ? 'Video' : st === 'pdf' ? 'PDF' : st === 'image' ? 'Image' : st === 'website' || m.sourceUrl ? 'Web' : st === 'multi' ? 'Multi' : 'Text';
                          return (
                            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/5 text-[8px] font-black uppercase tracking-tighter text-zinc-400">
                              <span>{icon}</span>
                              <span>{label}</span>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-2.5 text-right pr-4 bg-white/[0.02] rounded-r-2xl border-y border-r border-white/5 group-hover/row:bg-white/[0.05] transition-colors">
                        <motion.button 
                          whileHover={{ scale: 1.1, x: -3 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => window.open(`/canvas?mapId=${m.id}&ownerId=${userId}`, '_blank')}
                          className="p-2.5 rounded-lg bg-white/5 hover:bg-violet-600 text-zinc-400 hover:text-white border border-white/10 transition-all shadow-xl"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </motion.button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="py-24 flex flex-col items-center justify-center text-zinc-700 relative z-10 border-2 border-dashed border-white/5 rounded-[2.5rem]">
          <div className="p-6 rounded-[2rem] bg-white/5 mb-6 opacity-30">
            <Library className="h-12 w-12" />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.4em] italic mb-2">Subject Index Dormant</p>
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest text-center max-w-xs">No mindmap signatures detected for this biological entity.</p>
        </div>
      )}
    </div>
  );
}
