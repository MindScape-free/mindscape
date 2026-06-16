'use client';

// ── WDYR must be imported before any React imports ──
import '@/lib/wdyr';

import React from 'react';
import { logRenderStats } from '@/hooks/use-render-timing';
import { logProfilerStats } from '@/components/debug/profiler';

/**
 * Dev-only performance monitor.
 *
 * - Imports why-did-you-render (tracks unnecessary re-renders)
 * - Adds a global keyboard shortcut (Ctrl+Shift+R) to log render stats
 * - Adds a global keyboard shortcut (Ctrl+Shift+P) to log Profiler stats
 *
 * Place this high in the component tree (inside a client layout).
 * Only active in development. No-op in production.
 */
export function PerformanceMonitor({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        logRenderStats();
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        logProfilerStats();
      }
    };

    window.addEventListener('keydown', handler);
    console.log(
      '%c📊 Performance monitor ready — Ctrl+Shift+R (render stats), Ctrl+Shift+P (profiler stats)',
      'color: #f59e0b; font-weight: bold; font-size: 11px;'
    );

    return () => window.removeEventListener('keydown', handler);
  }, []);

  return <>{children}</>;
}
