'use client';

import { memo } from 'react';
import { Copy, Check } from 'lucide-react';
import { useState, useCallback } from 'react';
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
    <div
      className={`
        relative group
        ${!isFirst ? 'border-t border-white/5' : ''}
        hover:bg-white/[0.02] transition-all duration-200
      `}
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`shrink-0 p-3 rounded-xl ${config.bgColor} border ${config.borderColor} group-hover:scale-105 transition-transform`}>
            <Icon className={`h-5 w-5 ${config.textColor}`} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header Row */}
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${config.bgColor} ${config.textColor}`}>
                  {config.label}
                </span>
                <span className="text-[10px] text-zinc-600 font-medium">
                  {formatRelativeTime(log.timestamp)}
                </span>
              </div>

              {/* Target ID Badge */}
              {log.targetId && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-800/50 border border-white/5">
                  <span className="text-[9px] text-zinc-500 font-medium uppercase">Target:</span>
                  <button
                    onClick={handleCopyTarget}
                    className="flex items-center gap-1 hover:bg-white/5 rounded px-1 py-0.5 transition-colors"
                  >
                    <span className="text-[10px] font-mono text-zinc-400">
                      {log.targetId.substring(0, 8)}...
                    </span>
                    {copiedTarget ? (
                      <Check className="h-2.5 w-2.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-2.5 w-2.5 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Details */}
            <p className="text-sm text-zinc-200 mb-3 leading-relaxed">
              {log.details}
            </p>

            {/* Footer - Admin Info */}
            <div className="flex items-center gap-4 text-[10px]">
              {/* Admin Badge */}
              {log.performedByEmail ? (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-violet-500/5 border border-violet-500/10">
                  <div className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                  <span className="text-violet-400 font-medium">
                    {log.performedByEmail.split('@')[0]}
                  </span>
                </div>
              ) : log.performedBy ? (
                <button
                  onClick={handleCopyId}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-800/50 border border-white/5 hover:bg-white/5 transition-colors"
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                  <span className="text-zinc-400 font-mono">
                    {log.performedBy.substring(0, 8)}...
                  </span>
                  {copiedId ? (
                    <Check className="h-2.5 w-2.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-2.5 w-2.5 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>
              ) : (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-800/50 border border-white/5">
                  <div className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
                  <span className="text-zinc-500">System</span>
                </div>
              )}

              {/* Target Type */}
              {log.targetType && (
                <div className="flex items-center gap-1 text-zinc-600">
                  <span className="capitalize">{log.targetType}</span>
                </div>
              )}

              {/* Full Timestamp */}
              <span className="text-zinc-700 ml-auto font-mono">
                {new Date(log.timestamp).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>

            {/* Metadata Preview */}
            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <div className="mt-3 p-2 rounded-lg bg-zinc-800/30 border border-white/5">
                <div className="flex flex-wrap gap-2">
                  {Object.entries(log.metadata).slice(0, 3).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-1.5 text-[9px]">
                      <span className="text-zinc-600 font-medium uppercase">{key}:</span>
                      <span className="text-zinc-400 font-mono">
                        {typeof value === 'string' ? value.substring(0, 20) : JSON.stringify(value).substring(0, 20)}
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
      <div
        className={`
          absolute left-0 top-0 bottom-0 w-0.5
          ${config.textColor.replace('text-', 'bg-')}
          opacity-0 group-hover:opacity-100 transition-opacity
        `}
      />
    </div>
  );
}

export const ActivityLogCard = memo(ActivityLogCardComponent);

interface ActivityLogSkeletonProps {
  count?: number;
}

export function ActivityLogSkeleton({ count = 5 }: ActivityLogSkeletonProps) {
  return (
    <div className="space-y-0 divide-y divide-white/5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-5">
          <div className="flex items-start gap-4">
            <div className="h-11 w-11 rounded-xl bg-zinc-800 animate-pulse" />
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-6 w-24 rounded-lg bg-zinc-800 animate-pulse" />
                <div className="h-6 w-16 rounded-lg bg-zinc-800/50 animate-pulse" />
              </div>
              <div className="h-4 w-3/4 rounded bg-zinc-800/50 animate-pulse" />
              <div className="flex items-center gap-2">
                <div className="h-5 w-20 rounded bg-zinc-800/50 animate-pulse" />
                <div className="h-5 w-24 rounded bg-zinc-800/30 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
