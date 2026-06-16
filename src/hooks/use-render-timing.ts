/**
 * useRenderTiming — Tracks render count and mount/duration timing for a component.
 *
 * Usage:
 *   function MyComponent() {
 *     useRenderTiming('MyComponent');
 *     return <div>...</div>;
 *   }
 *
 * Logs to the Performance API and optionally to console.table in dev mode.
 */

import { useRef, useEffect } from 'react';

// ── Aggregator ───────────────────────────────────────────────────────────

interface RenderEntry {
  name: string;
  renderCount: number;
  totalDurationMs: number;
  lastDurationMs: number;
}

const renderStats = new Map<string, RenderEntry>();

function recordRender(name: string, startTime: number) {
  const elapsed = performance.now() - startTime;
  const existing = renderStats.get(name) ?? {
    name,
    renderCount: 0,
    totalDurationMs: 0,
    lastDurationMs: 0,
  };
  existing.renderCount++;
  existing.totalDurationMs += elapsed;
  existing.lastDurationMs = elapsed;
  renderStats.set(name, existing);
}

// ── Hook ─────────────────────────────────────────────────────────────────

/**
 * Log render timing for the calling component.
 *
 * @param label - A human-readable component label (e.g. "MindMap")
 * @param onlyInDev - If true, only runs in development (default: true)
 */
export function useRenderTiming(label: string, onlyInDev = true) {
  if (onlyInDev && process.env.NODE_ENV !== 'development') return;

  // Guard against SSR — performance is not available on the server
  if (typeof window === 'undefined') return;

  const renderCount = useRef(0);
  const startTime = useRef(0);

  // Initialize start time lazily (not at module scope, safe for SSR)
  if (startTime.current === 0) {
    startTime.current = performance.now();
  }

  // Increment on every render
  renderCount.current++;

  // Record timing on mount + every render
  useEffect(() => {
    recordRender(label, startTime.current);
    // Start time for next render
    startTime.current = performance.now();
  });

  // Log summary on unmount
  useEffect(() => {
    return () => {
      const entry = renderStats.get(label);
      if (entry && process.env.NODE_ENV === 'development') {
        console.log(
          `%c📊 Render stats for ${label}:`,
          'color: #f59e0b; font-weight: bold;',
          `${entry.renderCount}x renders, avg ${(entry.totalDurationMs / Math.max(entry.renderCount, 1)).toFixed(1)}ms`
        );
      }
    };
  }, [label]);
}

// ── Report ───────────────────────────────────────────────────────────────

/**
 * Log the full render stats table to the console.
 */
export function logRenderStats() {
  if (process.env.NODE_ENV !== 'development') return;

  const entries = Array.from(renderStats.values()).sort(
    (a, b) => b.renderCount - a.renderCount
  );

  if (entries.length === 0) {
    console.log('%c📊 No render stats recorded.', 'color: #f59e0b; font-weight: bold;');
    return;
  }

  console.log(
    '%c📊 Render Performance Report',
    'color: #f59e0b; font-weight: bold; font-size: 14px;'
  );
  console.table(
    entries.map((e) => ({
      Component: e.name,
      Renders: e.renderCount,
      'Total (ms)': e.totalDurationMs.toFixed(1),
      'Avg (ms)': (e.totalDurationMs / e.renderCount).toFixed(1),
      'Last (ms)': e.lastDurationMs.toFixed(1),
    }))
  );
}

// Make it available globally for quick console access
if (typeof window !== 'undefined') {
  (window as any).__logRenderStats = logRenderStats;
}
