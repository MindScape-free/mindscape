'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={`rounded-3xl bg-white/5 border border-white/10 p-6 backdrop-blur-xl ${className || ''}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-2xl bg-white/5 animate-pulse" />
        <div className="h-4 w-20 bg-white/5 rounded-lg animate-pulse" />
      </div>
      <div className="h-8 w-24 bg-white/10 rounded-xl animate-pulse" />
    </div>
  );
}

export function HealthScoreSkeleton() {
  return (
    <div className="rounded-3xl bg-white/5 border border-white/10 p-6 flex flex-col items-center justify-center backdrop-blur-xl">
      <div className="w-16 h-16 rounded-full border-4 border-white/5 animate-pulse mb-3" />
      <div className="h-3 w-16 bg-white/5 rounded-lg mb-2 animate-pulse" />
      <div className="h-6 w-20 rounded-full bg-white/10 animate-pulse" />
    </div>
  );
}

export function AnalyticsCardSkeleton({ variant }: { variant?: 'mode' | 'depth' | 'source' | 'submaps' | 'public' | 'persona' | 'contributors' }) {
  const containerStyle = "rounded-[2.5rem] bg-white/5 border border-white/10 p-8 backdrop-blur-3xl relative overflow-hidden";
  const glassPulse = "bg-white/5 animate-pulse rounded-2xl";
  
  if (variant === 'mode' || variant === 'depth') {
    return (
      <div className={containerStyle}>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-2xl bg-white/10 animate-pulse" />
          <div className="h-5 w-32 bg-white/5 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-6 w-6 rounded-lg bg-white/10 animate-pulse" />
                <div className="h-3 w-16 bg-white/5 animate-pulse" />
              </div>
              <div className="h-8 w-20 bg-white/5 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Refactoring others to consistent glass style
  return (
    <div className={containerStyle}>
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-2xl bg-white/10 animate-pulse" />
        <div className="space-y-2">
          <div className="h-5 w-40 bg-white/5 rounded-xl animate-pulse" />
          <div className="h-3 w-32 bg-white/[0.02] rounded-lg animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-white/[0.03] border border-white/5 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export function HeatmapSkeleton() {
  return (
    <div className="rounded-[2.5rem] bg-white/5 border border-white/10 p-8 backdrop-blur-3xl relative overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-white/5 rounded-xl animate-pulse" />
          <div className="h-4 w-64 bg-white/[0.02] rounded-lg animate-pulse" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/5 animate-pulse" />
          <div className="h-10 w-32 rounded-xl bg-white/5 animate-pulse" />
          <div className="h-10 w-10 rounded-xl bg-white/5 animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="h-10 bg-white/[0.03] rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export function TopContributorsSkeleton() {
  return (
    <div className="rounded-[2.5rem] bg-white/5 border border-white/10 p-8 backdrop-blur-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <div className="h-6 w-40 bg-white/5 rounded-xl animate-pulse" />
          <div className="h-4 w-52 bg-white/[0.02] rounded-lg animate-pulse" />
        </div>
        <div className="flex gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/5">
          {[1, 2].map(i => <div key={i} className="h-8 w-20 rounded-xl bg-white/10 animate-pulse" />)}
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
            <div className="h-10 w-10 rounded-full bg-white/10 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
              <div className="h-3 w-20 bg-white/5 rounded animate-pulse" />
            </div>
            <div className="h-6 w-16 bg-white/10 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function UserDetailSkeleton() {
  return (
    <div className="h-full flex items-center justify-center p-20">
      <div className="flex flex-col items-center gap-6 max-w-md w-full">
        <div className="h-24 w-24 rounded-[2rem] bg-white/10 border-2 border-white/10 animate-pulse shadow-2xl" />
        <div className="space-y-3 w-full flex flex-col items-center">
          <div className="h-8 w-48 bg-white/10 rounded-xl animate-pulse" />
          <div className="h-4 w-64 bg-white/5 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-4 w-full pt-8">
          {[1, 2, 3, 4].map(i => (
             <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function UsersTabSkeleton() {
  return (
    <div className="space-y-8 pb-32">
      <div className="h-16 w-full rounded-[1.5rem] bg-white/5 border border-white/10 animate-pulse backdrop-blur-2xl" />
      <div className="flex items-center justify-between">
        <div className="h-5 w-40 bg-white/5 rounded-lg animate-pulse" />
        <div className="h-12 w-80 rounded-2xl bg-white/5 animate-pulse" />
      </div>
      <div className="space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-[2rem] bg-white/5 border border-white/10 p-8 shadow-2xl backdrop-blur-3xl">
              <div className="flex items-center gap-6 mb-6">
                <div className="h-16 w-16 rounded-2xl bg-white/10 animate-pulse" />
                <div className="flex-1 space-y-3">
                  <div className="h-5 w-40 bg-white/10 rounded-lg animate-pulse" />
                  <div className="h-3 w-56 bg-white/5 rounded animate-pulse" />
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex gap-4">
                  <div className="h-8 w-16 rounded-xl bg-white/10 animate-pulse" />
                  <div className="h-8 w-20 rounded-xl bg-white/10 animate-pulse" />
                </div>
                <div className="h-10 w-10 rounded-2xl bg-white/10 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
        <div className="h-14 w-48 mx-auto rounded-2xl bg-white/5 animate-pulse translate-y-8" />
      </div>
    </div>
  );
}

export function AdminPageSkeleton() {
  return (
    <div className="h-[calc(100vh-80px)] bg-zinc-950 flex overflow-hidden font-sans">
      <main className="flex-1 overflow-y-auto relative z-10 custom-scrollbar">
        <div className="max-w-6xl mx-auto px-6 py-8 lg:px-10">
          <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-3">
              <div className="h-12 w-64 bg-white/10 rounded-2xl animate-pulse" />
              <div className="h-4 w-96 bg-white/5 rounded-lg animate-pulse" />
            </div>
            <div className="h-14 w-40 rounded-2xl bg-white/10 animate-pulse" />
          </header>

          <div className="space-y-12 pb-32">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              <div className="rounded-3xl bg-white/5 border border-white/10 p-6 flex flex-col items-center justify-center backdrop-blur-xl">
                <div className="w-16 h-16 rounded-full border-4 border-white/5 animate-pulse mb-3" />
                <div className="h-3 w-16 bg-white/5 rounded-lg mb-2 animate-pulse" />
                <div className="h-6 w-20 rounded-full bg-white/10 animate-pulse" />
              </div>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>

            <HeatmapSkeleton />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <AnalyticsCardSkeleton variant="mode" />
              <AnalyticsCardSkeleton variant="depth" />
            </div>

            <AnalyticsCardSkeleton variant="source" />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <AnalyticsCardSkeleton variant="submaps" />
              <AnalyticsCardSkeleton variant="public" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
