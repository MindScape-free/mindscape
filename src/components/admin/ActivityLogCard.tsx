'use client';

import { memo } from 'react';
import { Copy, Check } from 'lucide-react';
import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { AdminActivityLogEntry, ACTIVITY_CONFIG, formatRelativeTime } from '@/lib/admin-utils';

interface ActivityLogCardProps {
  log: AdminActivityLogEntry;
  isFirst?: boolean;
  isLast?: boolean;
}

function ActivityLogCardComponent({ log, isFirst, isLast }: ActivityLogCardProps) {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedTarget, setCopiedTarget] = useState(false);

  const config = ACTIVITY_CONFIG[log.type] || ACTIVITY_CONFIG.SYSTEM_WARNING;
  const Icon = config.icon;

  const handleCopyId = useCallback(() => {
    if (log.performedBy) {
      navigator.clipboard.writeText(log.performedBy);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  }, [log.performedBy]);

  const handleCopyTarget = useCallback(() => {
    if (log.targetId) {
      navigator.clipboard.writeText(log.targetId);
      setCopiedTarget(true);
      setTimeout(() => setCopiedTarget(false), 2000);
    }
  }, [log.targetId]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
      className={`
        relative group transition-all duration-500
        ${!isFirst ? 'border-t border-white/5' : ''}
      `}
    >
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="relative">
            <div className={`shrink-0 p-2.5 rounded-xl ${config.bgColor.replace('/10', '/5')} border ${config.borderColor.replace('/20', '/10')} group-hover:scale-110 transition-transform duration-500 backdrop-blur-xl shadow-lg`}>
              <Icon className={`h-4 w-4 ${config.textColor}`} />
            </div>
            <div className={`absolute -inset-1 rounded-xl ${config.bgColor.replace('/10', '/5')} blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 relative z-10">
            {/* Header Row */}
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2.5">
                <span className={`text-[8px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-full border ${config.borderColor} ${config.bgColor} ${config.textColor}`}>
                  {config.label}
                </span>
                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                  {formatRelativeTime(log.timestamp)}
                </span>
              </div>

              {/* Target ID Badge */}
              {log.targetId && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors group/target">
                  <span className="text-[8px] text-zinc-500 font-black uppercase tracking-tighter">ID:</span>
                  <button
                    onClick={handleCopyTarget}
                    className="flex items-center gap-1.5"
                  >
                    <span className="text-[9px] font-mono text-zinc-400 group-hover/target:text-white transition-colors">
                      {log.targetId.substring(0, 8)}
                    </span>
                    {copiedTarget ? (
                      <Check className="h-2 w-2 text-emerald-400" />
                    ) : (
                      <Copy className="h-2 w-2 text-zinc-600 opacity-0 group-hover:opacity-100 transition-all" />
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Details */}
            <p className="text-[12px] text-zinc-300 mb-3.5 leading-relaxed font-medium">
              {log.details}
            </p>

            {/* Footer - Admin Info */}
            <div className="flex items-center gap-4">
              {/* Admin Badge */}
              {log.performedByEmail ? (
                <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-violet-500/5 border border-violet-500/10">
                  <div className="h-1 w-1 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
                  <span className="text-[9px] text-violet-400 font-black uppercase tracking-widest">
                    {log.performedByEmail.split('@')[0]}
                  </span>
                </div>
              ) : log.performedBy ? (
                <button
                  onClick={handleCopyId}
                  className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/[0.03] border border-white/5 hover:border-white/10 hover:bg-white/[0.05] transition-all"
                >
                  <div className="h-1 w-1 rounded-full bg-zinc-500" />
                  <span className="text-[9px] text-zinc-400 font-mono">
                    {log.performedBy.substring(0, 8)}
                  </span>
                  {copiedId ? (
                    <Check className="h-2 w-2 text-emerald-400" />
                  ) : (
                    <Copy className="h-2 w-2 text-zinc-600 opacity-0 group-hover:opacity-100 transition-all" />
                  )}
                </button>
              ) : (
                <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/[0.03] border border-white/5">
                  <div className="h-1 w-1 rounded-full bg-zinc-600" />
                  <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">System</span>
                </div>
              )}

              {/* Target Type */}
              {log.targetType && (
                <div className="flex items-center gap-1.5 text-zinc-500">
                  <div className="h-0.5 w-0.5 rounded-full bg-zinc-700" />
                  <span className="text-[8px] font-black uppercase tracking-[0.2em]">{log.targetType}</span>
                </div>
              )}

              {/* Full Timestamp */}
              <span className="text-zinc-600 ml-auto font-mono text-[9px] tracking-tighter">
                {new Date(log.timestamp).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false
                })}
              </span>
            </div>

            {/* Metadata Preview */}
            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <div className="mt-4 p-3 rounded-xl bg-white/[0.02] border border-white/5 group-hover:border-white/10 transition-colors">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-1.5 gap-x-4">
                  {Object.entries(log.metadata).slice(0, 6).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-[8px] gap-2">
                      <span className="text-zinc-600 font-black uppercase tracking-tighter shrink-0">{key}:</span>
                      <span className="text-zinc-400 font-mono truncate">
                        {typeof value === 'string' ? value : JSON.stringify(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hover Accent Line */}
      <motion.div
        initial={false}
        animate={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        className={`
          absolute left-0 top-0 bottom-0 w-1
          ${config.textColor.replace('text-', 'bg-')}
          shadow-[0_0_15px_rgba(var(--accent-rgb),0.5)]
        `}
      />
    </motion.div>
  );
}

export const ActivityLogCard = memo(ActivityLogCardComponent);

interface ActivityLogSkeletonProps {
  count?: number;
}

export function ActivityLogSkeleton({ count = 5 }: ActivityLogSkeletonProps) {
  return (
    <div className="divide-y divide-white/5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-white/5 animate-pulse" />
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-5 w-20 rounded-full bg-white/5 animate-pulse" />
                <div className="h-3 w-12 rounded-lg bg-white/[0.02] animate-pulse" />
              </div>
              <div className="h-3.5 w-3/4 rounded-lg bg-white/[0.03] animate-pulse" />
              <div className="flex items-center gap-3">
                <div className="h-5 w-28 rounded-lg bg-white/[0.02] animate-pulse" />
                <div className="h-3 w-16 rounded-lg bg-white/[0.01] animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
