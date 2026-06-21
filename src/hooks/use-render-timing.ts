import { useRef, useEffect } from 'react';

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

export function useRenderTiming(label: string, onlyInDev = true) {
  const renderCount = useRef(0);
  const startTime = useRef(0);

  useEffect(() => {
    if (onlyInDev && process.env.NODE_ENV !== 'development') return;
    if (typeof window === 'undefined') return;

    startTime.current = performance.now();

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
  }, [label, onlyInDev]);

  useEffect(() => {
    if (onlyInDev && process.env.NODE_ENV !== 'development') return;
    if (typeof window === 'undefined') return;

    const start = startTime.current;
    renderCount.current++;
    recordRender(label, start);
    startTime.current = performance.now();
  });
}

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

if (typeof window !== 'undefined') {
  (window as any).__logRenderStats = logRenderStats;
}
