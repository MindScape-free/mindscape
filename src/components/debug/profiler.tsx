'use client';

import React, { Profiler as ReactProfiler, useRef } from 'react';

/**
 * Dev-only Profiler wrapper.
 *
 * Logs render timing to the Performance API and optionally to console.
 * Wraps children with React's <Profiler> and logs when commits exceed a threshold.
 *
 * Usage:
 *   <Profiler id="MindMap">
 *     <MindMap ... />
 *   </Profiler>
 */

interface ProfilerProps {
  id: string;
  children: React.ReactNode;
  /** Minimum commit duration (ms) to log. Default 0 (log everything). */
  threshold?: number;
  /** Always log (even in production). Default false (dev-only). */
  alwaysOn?: boolean;
}

// ── Aggregator ───────────────────────────────────────────────────────────

interface Commit {
  phase: 'mount' | 'update';
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
}

const commitLog = new Map<string, Commit[]>();

function onRender(
  id: string,
  phase: 'mount' | 'update' | 'nested-update',
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number
) {
  const entry: Commit = {
    phase: phase === 'nested-update' ? 'update' : phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime,
  };

  const existing = commitLog.get(id) ?? [];
  existing.push(entry);
  commitLog.set(id, existing);
}

/**
 * Log aggregated Profiler stats to the console.
 * Accessible globally via window.__logProfilerStats().
 */
export function logProfilerStats() {
  if (process.env.NODE_ENV !== 'development') return;

  const entries = Array.from(commitLog.entries()).map(([id, commits]) => {
    const mountCommits = commits.filter((c) => c.phase === 'mount');
    const updateCommits = commits.filter((c) => c.phase === 'update');
    return {
      Component: id,
      Mounts: mountCommits.length,
      Updates: updateCommits.length,
      'Total commits': commits.length,
      'Avg duration (ms)': (
        commits.reduce((s, c) => s + c.actualDuration, 0) /
        Math.max(commits.length, 1)
      ).toFixed(2),
      'Max duration (ms)': Math.max(
        ...commits.map((c) => c.actualDuration)
      ).toFixed(2),
      'Last duration (ms)': (
        commits[commits.length - 1]?.actualDuration ?? 0
      ).toFixed(2),
    };
  });

  entries.sort((a, b) => parseFloat(b['Avg duration (ms)']) - parseFloat(a['Avg duration (ms)']));

  console.log(
    '%c⚡ React Profiler Report',
    'color: #10b981; font-weight: bold; font-size: 14px;'
  );
  console.table(entries);
}

if (typeof window !== 'undefined') {
  (window as any).__logProfilerStats = logProfilerStats;
}

// ── Component ────────────────────────────────────────────────────────────

export function Profiler({ id, children, threshold = 0, alwaysOn = false }: ProfilerProps) {
  if (!alwaysOn && process.env.NODE_ENV !== 'development') {
    return <>{children}</>;
  }

  const thresholdRef = useRef(threshold);
  thresholdRef.current = threshold;

  return (
    <ReactProfiler
      id={id}
      onRender={(
        _id,
        phase,
        actualDuration,
        baseDuration,
        startTime,
        commitTime
      ) => {
        onRender(_id, phase, actualDuration, baseDuration, startTime, commitTime);

        if (actualDuration >= thresholdRef.current) {
          console.log(
            `%c⚡ [Profiler] ${_id} — ${phase} ${actualDuration.toFixed(2)}ms` +
              (baseDuration ? ` (base: ${baseDuration.toFixed(2)}ms)` : ''),
            actualDuration > 16
              ? 'color: #ef4444; font-weight: bold;'
              : actualDuration > 8
                ? 'color: #f59e0b; font-weight: bold;'
                : 'color: #10b981;'
          );
        }
      }}
    >
      {children}
    </ReactProfiler>
  );
}
