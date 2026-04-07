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

export function UsersTabSkeleton() {
  return (
    <div className="space-y-8 pb-20">
      <Skeleton className="h-14 w-full rounded-2xl bg-zinc-900/60" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32 bg-zinc-800" />
        <Skeleton className="h-10 w-80 rounded-lg bg-zinc-800" />
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-2xl bg-zinc-900/40 border border-white/5 p-5">
              <div className="flex items-start gap-4 mb-4">
                <Skeleton className="h-12 w-12 rounded-xl bg-zinc-800" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40 bg-zinc-800" />
                  <Skeleton className="h-3 w-56 bg-zinc-800" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16 rounded-full bg-zinc-800" />
                  <Skeleton className="h-6 w-20 rounded-full bg-zinc-800" />
                </div>
                <Skeleton className="h-6 w-24 rounded bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="h-10 w-40 mx-auto rounded-xl bg-zinc-800" />
      </div>
    </div>
  );
}

export function AdminPageSkeleton() {
  return (
    <div className="h-[calc(100vh-80px)] bg-zinc-950 text-zinc-100 flex overflow-hidden selection:bg-violet-500/30 font-sans">
      <aside className="hidden lg:flex w-85 border-r border-white/5 bg-zinc-950/40 backdrop-blur-3xl flex-col z-20 relative h-full">
        <div className="p-8 flex flex-col h-full overflow-hidden">
          <div className="mb-10 shrink-0">
            <div className="relative group p-6 rounded-[2.5rem] bg-white/5 border border-white/10 backdrop-blur-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center gap-5 mb-6 relative z-10">
                <Skeleton className="h-16 w-16 rounded-2xl border-2 border-white/10 bg-zinc-900" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-32 bg-zinc-800" />
                  <Skeleton className="h-3 w-20 bg-zinc-800" />
                </div>
              </div>
            </div>
          </div>
          <nav className="space-y-2.5 flex-1 pr-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                <Skeleton className="h-10 w-10 rounded-xl bg-zinc-800" />
                <Skeleton className="h-4 w-20 bg-zinc-800" />
              </div>
            ))}
          </nav>
          <div className="pt-8 border-t border-white/5">
            <Skeleton className="h-12 w-full rounded-2xl bg-white/5" />
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative z-10 custom-scrollbar">
        <div className="max-w-6xl mx-auto px-6 py-8 lg:px-10">
          <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <Skeleton className="h-10 w-48 bg-zinc-800" />
              <Skeleton className="h-3 w-64 bg-zinc-800" />
            </div>
            <Skeleton className="h-11 w-32 rounded-xl bg-white/5" />
          </header>

          <div className="space-y-10 pb-20">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="rounded-xl bg-zinc-900/40 border border-white/5 p-4 flex flex-col items-center justify-center">
                <Skeleton className="w-14 h-14 rounded-full bg-zinc-800 mb-2" />
                <Skeleton className="h-3 w-12 bg-zinc-800 mb-1" />
                <Skeleton className="h-5 w-12 rounded-full bg-zinc-800" />
              </div>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>

            <HeatmapSkeleton />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnalyticsCardSkeleton variant="mode" />
              <AnalyticsCardSkeleton variant="depth" />
            </div>

            <AnalyticsCardSkeleton variant="source" />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnalyticsCardSkeleton variant="submaps" />
              <AnalyticsCardSkeleton variant="public" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnalyticsCardSkeleton variant="persona" />
              <TopContributorsSkeleton />
            </div>

            <div className="rounded-2xl bg-zinc-900/40 border border-white/5 overflow-hidden">
              <div className="p-5 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-xl bg-zinc-800" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32 bg-zinc-800" />
                    <Skeleton className="h-3 w-24 bg-zinc-800" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="rounded-xl p-4 bg-white/5 border border-white/5">
                    <div className="flex items-center gap-3 mb-3">
                      <Skeleton className="h-10 w-10 rounded-lg bg-zinc-800" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-full bg-zinc-800" />
                        <Skeleton className="h-3 w-2/3 bg-zinc-800" />
                      </div>
                    </div>
                    <Skeleton className="h-3 w-full bg-zinc-800 mb-2" />
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-16 bg-zinc-800" />
                      <Skeleton className="h-3 w-20 bg-zinc-800" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
