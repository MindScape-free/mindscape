'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={`rounded-xl bg-zinc-900/40 border border-white/5 p-4 ${className || ''}`}>
      <div className="flex items-center gap-2 mb-2">
        <Skeleton className="h-6 w-6 rounded-lg bg-zinc-800" />
        <Skeleton className="h-3 w-16 bg-zinc-800" />
      </div>
      <Skeleton className="h-8 w-20 bg-zinc-800" />
    </div>
  );
}

export function HealthScoreSkeleton() {
  return (
    <div className="rounded-xl bg-zinc-900/40 border border-white/5 p-4 flex flex-col items-center justify-center">
      <Skeleton className="w-14 h-14 rounded-full bg-zinc-800 mb-2" />
      <Skeleton className="h-3 w-12 bg-zinc-800 mb-1" />
      <Skeleton className="h-5 w-12 rounded-full bg-zinc-800" />
    </div>
  );
}

export function AnalyticsCardSkeleton({ variant }: { variant?: 'mode' | 'depth' | 'source' | 'submaps' | 'public' | 'persona' | 'contributors' }) {
  if (variant === 'mode') {
    return (
      <div className="rounded-2xl bg-zinc-900/40 border border-white/5 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-8 w-8 rounded-xl bg-zinc-800" />
          <Skeleton className="h-4 w-28 bg-zinc-800" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 rounded-xl bg-zinc-800/30">
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-6 w-6 rounded-lg bg-zinc-700" />
                <Skeleton className="h-3 w-14 bg-zinc-700" />
              </div>
              <Skeleton className="h-6 w-16 bg-zinc-700" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'depth') {
    return (
      <div className="rounded-2xl bg-zinc-900/40 border border-white/5 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-8 w-8 rounded-xl bg-zinc-800" />
          <Skeleton className="h-4 w-28 bg-zinc-800" />
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-3 rounded-xl bg-zinc-800/30">
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-6 w-6 rounded-lg bg-zinc-700" />
                <Skeleton className="h-3 w-14 bg-zinc-700" />
              </div>
              <Skeleton className="h-6 w-16 bg-zinc-700" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'source') {
    return (
      <div className="rounded-2xl bg-zinc-900/40 border border-white/5 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-8 w-8 rounded-xl bg-zinc-800" />
          <div>
            <Skeleton className="h-4 w-32 bg-zinc-800 mb-1" />
            <Skeleton className="h-3 w-40 bg-zinc-800" />
          </div>
        </div>
        <div className="grid grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-3 rounded-xl bg-zinc-800/30">
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-6 w-6 rounded-lg bg-zinc-700" />
                <Skeleton className="h-3 w-12 bg-zinc-700" />
              </div>
              <Skeleton className="h-6 w-16 bg-zinc-700" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'submaps') {
    return (
      <div className="rounded-2xl bg-zinc-900/40 border border-white/5 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-8 w-8 rounded-xl bg-zinc-800" />
          <div>
            <Skeleton className="h-4 w-36 bg-zinc-800 mb-1" />
            <Skeleton className="h-3 w-28 bg-zinc-800" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 rounded-xl bg-zinc-800/30">
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-6 w-6 rounded-lg bg-zinc-700" />
                <Skeleton className="h-3 w-16 bg-zinc-700" />
              </div>
              <Skeleton className="h-6 w-16 bg-zinc-700" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'public') {
    return (
      <div className="rounded-2xl bg-zinc-900/40 border border-white/5 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-8 w-8 rounded-xl bg-zinc-800" />
          <div>
            <Skeleton className="h-4 w-32 bg-zinc-800 mb-1" />
            <Skeleton className="h-3 w-40 bg-zinc-800" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 rounded-xl bg-zinc-800/30">
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-6 w-6 rounded-lg bg-zinc-700" />
                <Skeleton className="h-3 w-16 bg-zinc-700" />
              </div>
              <Skeleton className="h-6 w-16 bg-zinc-700" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'persona') {
    return (
      <div className="rounded-2xl bg-zinc-900/40 border border-white/5 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-8 w-8 rounded-xl bg-zinc-800" />
          <div>
            <Skeleton className="h-4 w-28 bg-zinc-800 mb-1" />
            <Skeleton className="h-3 w-32 bg-zinc-800" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-3 rounded-xl bg-zinc-800/30">
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-6 w-6 rounded-lg bg-zinc-700" />
                <Skeleton className="h-3 w-16 bg-zinc-700" />
              </div>
              <Skeleton className="h-6 w-16 bg-zinc-700" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-zinc-900/40 border border-white/5 p-5">
      <Skeleton className="h-4 w-32 bg-zinc-800 mb-4" />
      <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
        <Skeleton className="h-16 rounded-lg bg-zinc-800" />
        <Skeleton className="h-16 rounded-lg bg-zinc-800" />
        <Skeleton className="h-16 rounded-lg bg-zinc-800" />
        <Skeleton className="h-16 rounded-lg bg-zinc-800 hidden md:block" />
      </div>
    </div>
  );
}

export function HeatmapSkeleton() {
  return (
    <div className="rounded-2xl bg-zinc-900/40 border border-white/5 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Skeleton className="h-5 w-40 bg-zinc-800 mb-1" />
          <Skeleton className="h-3 w-52 bg-zinc-800" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded-lg bg-zinc-800" />
          <Skeleton className="h-8 w-28 bg-zinc-800" />
          <Skeleton className="h-8 w-8 rounded-lg bg-zinc-800" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="h-8 rounded bg-zinc-800" />
        ))}
      </div>
    </div>
  );
}

export function TopContributorsSkeleton() {
  return (
    <div className="rounded-2xl bg-zinc-900/40 border border-white/5 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Skeleton className="h-5 w-40 bg-zinc-800 mb-1" />
          <Skeleton className="h-3 w-52 bg-zinc-800" />
        </div>
        <div className="flex gap-1 p-1 bg-zinc-800/50 rounded-lg">
          <Skeleton className="h-7 w-16 rounded bg-zinc-700" />
          <Skeleton className="h-7 w-16 rounded bg-zinc-700" />
          <Skeleton className="h-7 w-16 rounded bg-zinc-700" />
          <Skeleton className="h-7 w-16 rounded bg-zinc-700" />
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/30">
            <Skeleton className="h-8 w-8 rounded-full bg-zinc-700" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32 bg-zinc-700 mb-1" />
              <Skeleton className="h-3 w-20 bg-zinc-700" />
            </div>
            <Skeleton className="h-6 w-16 bg-zinc-700" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function UserDetailSkeleton() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-xl bg-zinc-800" />
        <Skeleton className="h-4 w-32 bg-zinc-800" />
        <Skeleton className="h-4 w-48 bg-zinc-800" />
      </div>
    </div>
  );
}
