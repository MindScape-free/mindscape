'use client';

import React from 'react';
import { Activity, RefreshCw, ChevronRight, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ActivityLogCard, ActivityLogSkeleton } from './ActivityLogCard';
import { AdminActivityLogEntry, ActivityCategory, FILTER_CATEGORIES, groupLogsByDate } from '@/lib/admin-utils';

interface LogsTabProps {
  activityLogs: AdminActivityLogEntry[];
  isLogsLoading: boolean;
  loadActivityLogs: () => void;
  logFilter: ActivityCategory;
  setLogFilter: (filter: ActivityCategory) => void;
}

export const LogsTab: React.FC<LogsTabProps> = React.memo(({
  activityLogs,
  isLogsLoading,
  loadActivityLogs,
  logFilter,
  setLogFilter,
}) => {
  return (
    <div className="space-y-8 pb-32">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-end gap-6">
        <div className="flex items-center gap-4 bg-white/5 p-1.5 rounded-[1.5rem] border border-white/10 backdrop-blur-2xl">
          {/* Filter Pills */}
          <div className="flex items-center gap-1">
            {FILTER_CATEGORIES.map((category) => (
              <button
                key={category.value}
                onClick={() => setLogFilter(category.value as any)}
                className={`
                  px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300
                  ${logFilter === category.value
                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                    : 'text-zinc-500 hover:text-white hover:bg-white/5'
                  }
                `}
              >
                {category.label}
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-white/10 mx-1" />

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={loadActivityLogs}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all group"
          >
            <RefreshCw className={`h-4 w-4 text-zinc-400 group-hover:text-white transition-colors ${isLogsLoading ? 'animate-spin text-amber-400' : ''}`} />
          </motion.button>
        </div>
      </div>

      {/* Activity Log Container */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[1.5rem] bg-white/5 border border-white/10 overflow-hidden backdrop-blur-3xl shadow-xl relative"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-[80px] pointer-events-none" />
        
        {isLogsLoading && activityLogs.length === 0 ? (
          <ActivityLogSkeleton count={8} />
        ) : (() => {
          // Filter logs by category
          const filtered = activityLogs.filter(log => {
            if ((logFilter as string) === 'all') return true;
            const config = (FILTER_CATEGORIES as any).find((c: any) => c.value === logFilter);
            return config?.types.includes(log.type);
          });

          if (filtered.length === 0) {
            return (
              <div className="flex flex-col items-center justify-center py-32 px-6 relative z-10">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="relative mb-8"
                >
                  <div className="w-24 h-24 rounded-[2rem] bg-zinc-900/50 flex items-center justify-center border border-white/5 shadow-2xl">
                    <Activity className="h-10 w-10 text-zinc-700" />
                  </div>
                  <div className="absolute -inset-4 rounded-[2.5rem] border-2 border-dashed border-white/5 animate-[spin_20s_linear_infinite]" />
                </motion.div>
                <p className="text-xl font-black text-white mb-2">Clean Slate</p>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] text-center max-w-sm">
                  No activity matching <span className="text-amber-500">"{logFilter}"</span> category has been detected yet.
                </p>
              </div>
            );
          }

          return (
            <div className="max-h-[calc(100vh-320px)] overflow-y-auto custom-scrollbar relative z-10">
              {groupLogsByDate(filtered).map((group, groupIndex) => (
                <div key={group.title}>
                  {/* Date Group Header */}
                  <div className="sticky top-0 z-20 bg-zinc-950/80 backdrop-blur-3xl border-b border-white/5 px-6 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-2.5 w-2.5 text-amber-500/50" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">
                          {group.title}
                        </span>
                      </div>
                      <Badge className="bg-white/5 border-white/10 text-zinc-500 font-black text-[9px] px-2 py-0.5 rounded-full">
                        {group.data.length} Events
                      </Badge>
                    </div>
                  </div>

                  {/* Activity Cards */}
                  <div className="divide-y divide-white/5">
                    {group.data.map((log, index) => (
                      <ActivityLogCard
                        key={log.id}
                        log={log}
                        isFirst={index === 0 && groupIndex === 0}
                        isLast={index === group.data.length - 1}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {/* Load More */}
              {activityLogs.length >= 100 && (
                <div className="p-8 border-t border-white/5 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={loadActivityLogs}
                    className="h-14 px-10 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest text-[10px] transition-all shadow-xl"
                  >
                    Fetch Historical Data
                  </Button>
                </div>
              )}
            </div>
          );
        })()}
      </motion.div>
    </div>
  );
});
