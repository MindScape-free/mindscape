'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe, 
  Youtube, 
  FileText, 
  FileIcon as PdfIcon, 
  Image as ImageIcon, 
  X, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SourceItem } from '@/types/multi-source';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SourcePillListProps {
  sources: SourceItem[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
  contextUsage: number;
}

export function SourcePillList({ sources, onRemove, onClearAll, contextUsage }: SourcePillListProps) {
  if (sources.length === 0) return null;

  const getTypeIcon = (type: SourceItem['type']) => {
    switch (type) {
      case 'youtube': return <Youtube className="w-3 h-3 text-red-500" />;
      case 'website': return <Globe className="w-3 h-3 text-blue-400" />;
      case 'pdf': return <PdfIcon className="w-3 h-3 text-orange-400" />;
      case 'image': return <ImageIcon className="w-3 h-3 text-pink-400" />;
      default: return <FileText className="w-3 h-3 text-green-400" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="border-t border-white/5 mx-3 mt-2" />
      
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className="text-[10px] uppercase font-black tracking-widest text-zinc-600">Sources : {sources.length}</span>
        <button
          onClick={onClearAll}
          className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 transition-all"
        >
          Clear All
        </button>
      </div>

      <div className="flex flex-wrap gap-2 px-4 py-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {sources.map((source) => (
            <motion.div
              key={source.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={cn(
                "group relative flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 h-[30px]",
                source.status === 'loading' 
                  ? "bg-primary/5 border-primary/10 text-primary-foreground/70"
                  : source.status === 'error'
                  ? "bg-red-500/10 border-red-500/20 text-red-400"
                  : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"
              )}
            >
              {getTypeIcon(source.type)}
              
              <span className="text-[10px] font-bold truncate max-w-[120px]">
                {source.label}
              </span>

              {source.status === 'loading' ? (
                <Loader2 className="w-3 h-3 animate-spin text-primary" />
              ) : source.status === 'ready' ? (
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <AlertCircle className="w-3 h-3 text-red-500" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-zinc-900 border-white/10 text-red-400 text-[10px]">
                      {source.error || 'Failed to process'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              <button
                onClick={() => onRemove(source.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 p-0.5 rounded-full hover:bg-white/10 text-zinc-500 hover:text-red-400"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {sources.length >= 3 && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-[2px] bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${contextUsage}%` }}
                className={cn(
                  "h-full transition-all duration-500",
                  contextUsage > 90 ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" :
                  contextUsage > 70 ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" :
                  "bg-primary shadow-[0_0_10px_rgba(139,92,246,0.5)]"
                )}
              />
            </div>
            <span className={cn(
              "text-[10px] font-black tabular-nums w-8 text-right",
              contextUsage > 90 ? "text-red-400" :
              contextUsage > 70 ? "text-amber-400" :
              "text-zinc-500"
            )}>{Math.round(contextUsage)}%</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
