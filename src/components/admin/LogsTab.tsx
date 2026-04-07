'use client';

import React from 'react';
import { Activity, RefreshCw, ChevronRight } from 'lucide-react';
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
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="p-3 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl border border-amber-500/20">
              <Activity className="h-6 w-6 text-amber-400" />
            </div>
            <div className="absolute -top-1 -right-1 h-3 w-3 bg-emerald-500 rounded-full border-2 border-zinc-950 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white">Activity Log</h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase tracking-wider">
                Live
              </span>
            </div>
            <p className="text-xs text-zinc-500">{activityLogs.length} events recorded</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter Pills */}
          <div className="flex items-center gap-1 p-1 bg-zinc-900/60 rounded-xl border border-white/5">
            {FILTER_CATEGORIES.map((category) => (
              <button
                key={category.value}
                onClick={() => setLogFilter(category.value as any)}
                className={`
                  px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all
                  ${logFilter === category.value
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                  }
                `}
              >
                {category.label}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadActivityLogs}
            className="h-10 px-3 rounded-xl border-white/10 bg-white/5 hover:bg-white/10"
          >
            <RefreshCw className={`h-4 w-4 ${isLogsLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Activity Log Container */}
      <div className="rounded-2xl bg-zinc-900/40 border border-white/5 overflow-hidden backdrop-blur-sm">
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
              <div className="flex flex-col items-center justify-center py-20 px-6">
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-full bg-zinc-800/50 flex items-center justify-center">
                    <Activity className="h-10 w-10 text-zinc-700" />
                  </div>
                  <div className="absolute inset-0 w-20 h-20 rounded-full border-2 border-dashed border-zinc-700/30 animate-pulse" />
                </div>
                <p className="text-lg font-bold text-zinc-400 mb-2">No {(logFilter as string) !== 'all' ? logFilter : ''} Activity Yet</p>
                <p className="text-sm text-zinc-600 text-center max-w-md">
                  System activities will appear here as they happen.
                </p>
              </div>
            );
          }

          return (
            <div className="max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar">
              {groupLogsByDate(filtered).map((group, groupIndex) => (
                <div key={group.title}>
                  {/* Date Group Header */}
                  <div className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-sm border-b border-white/5 px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-700/30 to-transparent" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
                        {group.title}
                      </span>
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-700/30 to-transparent" />
                      <span className="px-2 py-0.5 rounded-full bg-zinc-800/50 text-[9px] font-bold text-zinc-500">
                        {group.data.length}
                      </span>
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
                <div className="p-4 border-t border-white/5">
                  <Button
                    variant="outline"
                    onClick={loadActivityLogs}
                    className="w-full h-12 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white font-bold"
                  >
                    Load More Events
                  </Button>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
});
