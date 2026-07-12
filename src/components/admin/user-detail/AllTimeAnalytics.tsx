'use client';

import {
  Map as MapIcon,
  Layers,
  Image as ImageIcon,
  Globe,
  Video,
  FileText,
  Library,
  Zap,
  Copy,
  Brain,
  AlertTriangle,
} from 'lucide-react';
import { getFullTheme } from '@/components/admin/lib/admin-color-themes';

interface AllTimeAnalyticsProps {
  stats: {
    totalMapsCreated?: number;
    totalNodes?: number;
    modeCounts?: Record<string, number>;
    depthCounts?: Record<string, number>;
    sourceCounts?: Record<string, number>;
    personaCounts?: Record<string, number>;
    version?: number;
    isBackfilledPartial?: boolean;
  };
}

export default function AllTimeAnalytics({ stats }: AllTimeAnalyticsProps) {
  const total = stats.totalMapsCreated || 1;
  const hasAggregates = stats.version === 2;
  const isPartial = stats.isBackfilledPartial;

  const modeCounts = stats.modeCounts || { single: 0, compare: 0, multi: 0 };
  const depthCounts = stats.depthCounts || { low: 0, medium: 0, deep: 0 };
  const sourceCounts = stats.sourceCounts || { text: 0, website: 0, youtube: 0, pdf: 0, image: 0, multi: 0 };
  const personaCounts = stats.personaCounts || { Teacher: 0, Concise: 0, Creative: 0, Sage: 0 };

  const getPercentage = (count: number) => Math.round((count / total) * 100);

  if (!hasAggregates) {
    return (
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900/60 to-zinc-900/40 border border-amber-500/20 p-8">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl" />
          <div className="relative flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
              <AlertTriangle className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Historical Data Not Available</h3>
              <p className="text-sm text-zinc-400">
                All-time analytics breakdown requires a schema upgrade. Run the backfill script to enable.
              </p>
            </div>
          </div>
          <div className="mt-4 p-4 bg-zinc-800/50 rounded-xl border border-white/5">
            <p className="text-xs font-bold text-zinc-500 mb-2">Summary (from available data)</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-2xl font-black text-white">{stats.totalMapsCreated || 0}</p>
                <p className="text-[9px] text-zinc-500 uppercase">Total Maps</p>
              </div>
              <div>
                <p className="text-2xl font-black text-white">{stats.totalNodes || 0}</p>
                <p className="text-[9px] text-zinc-500 uppercase">Total Nodes</p>
              </div>
              <div>
                <p className="text-2xl font-black text-white">
                  {stats.totalMapsCreated ? Math.round((stats.totalNodes || 0) / stats.totalMapsCreated) : 0}
                </p>
                <p className="text-[9px] text-zinc-500 uppercase">Avg Nodes</p>
              </div>
              <div>
                <p className="text-2xl font-black text-white">
                  {isPartial ? 'Partial' : 'N/A'}
                </p>
                <p className="text-[9px] text-zinc-500 uppercase">Data Status</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isPartial && (
        <div className="relative overflow-hidden rounded-xl bg-amber-500/5 border border-amber-500/20 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <p className="text-xs text-amber-400">
              Partial data: Some deleted maps are not included in breakdowns.
            </p>
          </div>
        </div>
      )}

      {/* Row 1: Mode & Depth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900/60 to-zinc-900/40 border border-white/5 p-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-violet-500/10 rounded-xl border border-violet-500/20">
                <MapIcon className="h-4 w-4 text-violet-400" />
              </div>
              <p className="text-sm font-bold text-white">Maps by Mode</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {([
                { key: 'single', label: 'Single', value: modeCounts.single || 0, color: 'violet' as const, icon: FileText },
                { key: 'compare', label: 'Compare', value: modeCounts.compare || 0, color: 'indigo' as const, icon: Copy },
                { key: 'multi', label: 'Multi', value: modeCounts.multi || 0, color: 'blue' as const, icon: Layers },
              ] as const).map(({ key, label, value, color, icon: Icon }) => {
                const theme = getFullTheme(color);
                return (
                  <div key={key} className={`rounded-xl ${theme.bg500_5} border ${theme.border500_15} p-4 transition-all ${theme.hoverBg500_10}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1.5 ${theme.bg500_10} rounded-lg`}>
                        <Icon className={`h-3.5 w-3.5 ${theme.text400}`} />
                      </div>
                      <span className={`text-[8px] font-bold uppercase tracking-wider ${theme.text400Muted}`}>{label}</span>
                    </div>
                    <div className="flex items-end justify-between">
                      <p className="text-2xl font-black text-white tracking-tight">{value}</p>
                      <span className={`px-1.5 py-0.5 rounded-lg ${theme.bg500_10} text-[9px] font-bold ${theme.text400}`}>{getPercentage(value)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900/60 to-zinc-900/40 border border-white/5 p-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                <Layers className="h-4 w-4 text-indigo-400" />
              </div>
              <p className="text-sm font-bold text-white">Maps by Depth</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {([
                { key: 'low', label: 'Quick', value: depthCounts.low || 0, color: 'emerald' as const, icon: Zap },
                { key: 'medium', label: 'Balanced', value: depthCounts.medium || 0, color: 'yellow' as const, icon: Layers },
                { key: 'deep', label: 'Detailed', value: depthCounts.deep || 0, color: 'orange' as const, icon: Layers },
              ] as const).map(({ key, label, value, color, icon: Icon }) => {
                const theme = getFullTheme(color);
                return (
                  <div key={key} className={`rounded-xl ${theme.bg500_5} border ${theme.border500_15} p-4 transition-all ${theme.hoverBg500_10}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1.5 ${theme.bg500_10} rounded-lg`}>
                        <Icon className={`h-3.5 w-3.5 ${theme.text400}`} />
                      </div>
                      <span className={`text-[8px] font-bold uppercase tracking-wider ${theme.text400Muted}`}>{label}</span>
                    </div>
                    <div className="flex items-end justify-between">
                      <p className="text-2xl font-black text-white tracking-tight">{value}</p>
                      <span className={`px-1.5 py-0.5 rounded-lg ${theme.bg500_10} text-[9px] font-black ${theme.text400}`}>{getPercentage(value)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Source Types */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900/60 to-zinc-900/40 border border-white/5 p-6">
        <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <Globe className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Maps by Source Type</p>
              <p className="text-[9px] text-zinc-500 font-medium font-bold uppercase tracking-widest">Content source breakdown</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { type: 'text', icon: FileText, color: 'violet' as const, label: 'Text' },
              { type: 'pdf', icon: FileText, color: 'indigo' as const, label: 'PDF' },
              { type: 'website', icon: Globe, color: 'blue' as const, label: 'Website' },
              { type: 'image', icon: ImageIcon, color: 'emerald' as const, label: 'Image' },
              { type: 'youtube', icon: Video, color: 'yellow' as const, label: 'YouTube' },
              { type: 'multi', icon: Library, color: 'orange' as const, label: 'Multi' }
            ].map(({ type, icon: Icon, color, label }) => {
              const count = sourceCounts[type] || 0;
              const theme = getFullTheme(color);
              return (
                <div key={type} className={`rounded-xl ${theme.bg500_5} border ${theme.border500_15} p-4 transition-all ${theme.hoverBg500_10} ${count === 0 ? 'opacity-20' : ''}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 ${theme.bg500_10} rounded-lg`}>
                      <Icon className={`h-3.5 w-3.5 ${theme.text400}`} />
                    </div>
                    <span className={`text-[8px] font-bold uppercase tracking-wider ${theme.text400Muted}`}>{label}</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <p className="text-2xl font-black text-white tracking-tight">{count}</p>
                    <span className={`px-1.5 py-0.5 rounded-lg ${theme.bg500_10} text-[9px] font-bold ${theme.text400}`}>{getPercentage(count)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 3: Sub-Maps & Persona */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900/60 to-zinc-900/40 border border-white/5 p-6">
          <div className="absolute top-0 right-0 w-40 h-40 bg-violet-500/5 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-violet-500/10 rounded-xl border border-violet-500/20">
                <Brain className="h-4 w-4 text-violet-400" />
              </div>
              <p className="text-sm font-bold text-white">Maps by Persona</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {([
                { key: 'Teacher', label: 'Teacher', color: 'violet' },
                { key: 'Concise', label: 'Concise', color: 'indigo' },
                { key: 'Creative', label: 'Creative', color: 'blue' },
                { key: 'Sage', label: 'Cognitive Sage', color: 'emerald' },
              ] as const).map(({ key, label, color }) => {
                const count = personaCounts[key] || 0;
                const theme = getFullTheme(color);
                return (
                  <div key={key} className={`rounded-xl ${theme.bg500_5} border ${theme.border500_15} p-4 transition-all ${theme.hoverBg500_10}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[8px] font-bold uppercase tracking-wider ${theme.text400Muted}`}>{label}</span>
                      <span className={`px-1.5 py-0.5 rounded-lg ${theme.bg500_10} text-[9px] font-bold ${theme.text400}`}>{getPercentage(count)}%</span>
                    </div>
                    <p className="text-2xl font-black text-white tracking-tight">{count}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900/60 to-zinc-900/40 border border-white/5 p-6">
          <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/5 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
                <Layers className="h-4 w-4 text-cyan-400" />
              </div>
              <p className="text-sm font-bold text-white">All-Time Summary</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-white/5 p-4">
                <p className="text-3xl font-black text-white">{stats.totalMapsCreated || 0}</p>
                <p className="text-[9px] text-zinc-500 uppercase tracking-wider mt-1">Total Maps</p>
              </div>
              <div className="rounded-xl bg-white/5 p-4">
                <p className="text-3xl font-black text-cyan-400">{stats.totalNodes || 0}</p>
                <p className="text-[9px] text-zinc-500 uppercase tracking-wider mt-1">Total Nodes</p>
              </div>
              <div className="rounded-xl bg-white/5 p-4">
                <p className="text-3xl font-black text-emerald-400">
                  {stats.totalMapsCreated ? Math.round((stats.totalNodes || 0) / stats.totalMapsCreated) : 0}
                </p>
                <p className="text-[9px] text-zinc-500 uppercase tracking-wider mt-1">Avg Nodes</p>
              </div>
              <div className="rounded-xl bg-white/5 p-4">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${hasAggregates ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <p className="text-lg font-black text-white">{hasAggregates ? 'Complete' : 'Partial'}</p>
                </div>
                <p className="text-[9px] text-zinc-500 uppercase tracking-wider mt-1">Data Status</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
