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
  Lock,
  Unlock,
  TrendingUp,
  Brain,
  UserRound,
  Palette,
} from 'lucide-react';
import { getFullTheme } from '@/components/admin/lib/admin-color-themes';

interface UserMapAnalyticsProps {
  userMaps: any[];
}

export default function UserMapAnalytics({ userMaps }: UserMapAnalyticsProps) {
  const total = userMaps.length || 1;
  
  const modeCounts = { single: 0, compare: 0, multi: 0 };
  const depthCounts = { low: 0, medium: 0, deep: 0, unspecified: 0 };
  const sourceCounts: Record<string, number> = {
    'text': 0, 'pdf': 0, 'youtube': 0, 'website': 0, 'unknown': 0
  };
  const publicPrivate = { public: 0, private: 0 };
  const personaCounts: Record<string, number> = {
    'Teacher': 0, 'Concise': 0, 'Creative': 0, 'Sage': 0
  };
  let totalSubMaps = 0;
  const parentMapIds = new Set<string>();

  userMaps.forEach(m => {
    // Mode Detection
    const isMulti = m.mode === 'multi' || m.sourceFileType === 'multi' || m.sourceType === 'multi' || m.sourceFileContent?.includes('--- SOURCE:');

    if (isMulti) modeCounts.multi++;
    else if (m.mode === 'compare') modeCounts.compare++;
    else modeCounts.single++;

    // Depth
    let resolvedDepth = m.depth;
    if (!resolvedDepth || resolvedDepth === 'auto' || resolvedDepth === 'unspecified') {
      resolvedDepth = (m.nodeCount || 0) > 75 ? 'deep' : (m.nodeCount || 0) > 35 ? 'medium' : 'low';
    }

    if (resolvedDepth === 'low' || resolvedDepth === 'quick') depthCounts.low++;
    else if (resolvedDepth === 'medium' || resolvedDepth === 'balanced') depthCounts.medium++;
    else if (resolvedDepth === 'deep' || resolvedDepth === 'detailed') depthCounts.deep++;
    else depthCounts.low++;

    // Source Type detection
    let sourceType = m.sourceFileType || m.sourceType;
    if (sourceType === 'multi' || m.sourceFileContent?.includes('--- SOURCE:')) {
      sourceType = 'multi';
    } else {
      sourceType = sourceType || (m.sourceUrl ? 'website' : m.videoId ? 'youtube' : 'text');
    }
    const finalSourceType = sourceType === 'web' ? 'website' : sourceType;
    sourceCounts[finalSourceType] = (sourceCounts[finalSourceType] || 0) + 1;

    // Persona
    const rawPersona = m.aiPersona;
    let persona = 'Teacher';
    const normalizedRaw = (rawPersona || '').toLowerCase().trim();
    if (normalizedRaw === 'teacher' || normalizedRaw === 'standard' || !rawPersona) persona = 'Teacher';
    else if (normalizedRaw === 'concise') persona = 'Concise';
    else if (normalizedRaw === 'creative') persona = 'Creative';
    else if (normalizedRaw.includes('sage')) persona = 'Sage';
    personaCounts[persona] = (personaCounts[persona] || 0) + 1;

    // Advanced Nested/Sub-map logic
    const isChild = !!(m.isSubMap || m.parentMapId || m.parentId);
    const isParent = !!((m.nestedExpansions && m.nestedExpansions.length > 0) || m.hasSubMaps);

    if (isChild) {
      totalSubMaps++;
      if (m.parentMapId || m.parentId) parentMapIds.add(m.parentMapId || m.parentId);
    }
    
    if (isParent) {
      parentMapIds.add(m.id);
    }

    // Public/Private
    if (m.isPublic) publicPrivate.public++;
    else publicPrivate.private++;
  });

  return (
    <div className="space-y-5">
      {/* Row 1: Mode & Depth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Maps by Mode */}
        <div className="relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-5 sm:p-6 shadow-xl">
          <div className="absolute top-0 right-0 w-28 h-28 bg-violet-600/5 rounded-full blur-2xl pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2.5 bg-violet-500/10 rounded-xl border border-violet-500/20">
                <MapIcon className="h-4 w-4 text-violet-400" />
              </div>
              <div className="flex flex-col">
                <p className="text-xs font-black text-white uppercase tracking-widest">Map Styles</p>
                <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Single vs Multiple Topics</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {( [
                { key: 'single', label: 'Single', value: modeCounts.single, color: 'violet' as const, icon: FileText },
                { key: 'compare', label: 'Compare', value: modeCounts.compare, color: 'indigo' as const, icon: Copy },
                { key: 'multi', label: 'Multi', value: modeCounts.multi, color: 'blue' as const, icon: Layers },
              ] as const).map(({ key, label, value, color, icon: Icon }) => {
                const percentage = Math.round((value / total) * 100);
                const theme = getFullTheme(color);
                return (
                  <div key={key} className="rounded-xl bg-white/[0.03] border border-white/5 p-3.5 transition-all hover:bg-white/[0.06] hover:border-white/20 group/item shadow-[inset_0_0_15px_rgba(255,255,255,0.01)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.3)]">
                    <div className="flex items-center gap-2 mb-2.5">
                      <Icon className={`h-3.5 w-3.5 ${theme.text400}`} />
                      <span className="text-[9px] font-black uppercase tracking-tighter text-zinc-500 group-hover/item:text-zinc-400 transition-colors">{label}</span>
                    </div>
                    <div className="flex items-end justify-between">
                      <p className="text-xl font-black text-white tracking-tighter group-hover/item:scale-105 origin-left transition-transform">{value}</p>
                      <span className={`text-[9px] font-black ${theme.text400} ${theme.bg500_10} px-1.5 py-0.5 rounded-md border ${theme.border500_20}`}>{percentage}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Maps by Depth */}
        <div className="relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-5 sm:p-6 shadow-xl">
          <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-600/5 rounded-full blur-2xl pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                <Layers className="h-4 w-4 text-indigo-400" />
              </div>
              <div className="flex flex-col">
                <p className="text-xs font-black text-white uppercase tracking-widest">Map Complexity</p>
                <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Quick vs Detailed Notes</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {( [
                { key: 'low', label: 'Quick', value: depthCounts.low, color: 'emerald' as const, icon: Zap },
                { key: 'medium', label: 'Balanced', value: depthCounts.medium, color: 'yellow' as const, icon: Layers },
                { key: 'deep', label: 'Detailed', value: depthCounts.deep, color: 'orange' as const, icon: Layers },
              ] as const).map(({ key, label, value, color, icon: Icon }) => {
                const percentage = Math.round((value / total) * 100);
                const theme = getFullTheme(color);
                return (
                  <div key={key} className={`rounded-xl ${theme.bg500_5} border ${theme.border500_15} p-3.5 transition-all ${theme.hoverBg500_10} ${theme.hoverBorder500_30} group/depth shadow-[inset_0_0_15px_rgba(255,255,255,0.01)]`}>
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className={`p-1.5 ${theme.bg500_10} rounded-lg border ${theme.border500_20} group-hover/depth:scale-110 transition-transform duration-500`}>
                        <Icon className={`h-3.5 w-3.5 ${theme.text400}`} />
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-widest ${theme.text400Muted}`}>{label}</span>
                    </div>
                    <div className="flex items-end justify-between">
                      <p className="text-xl font-black text-white tracking-tighter group-hover/depth:scale-105 origin-left transition-transform">{value}</p>
                      <span className={`px-1.5 py-0.5 rounded-md ${theme.bg500_10} text-[9px] font-black ${theme.text400} border ${theme.border500_20}`}>{percentage}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Source Types */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900/60 to-zinc-900/40 border border-white/5 p-5 sm:p-6">
        <div className="absolute top-0 left-0 w-28 h-28 bg-blue-500/5 rounded-full blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <Globe className="h-4 w-4 text-blue-400" />
            </div>
            <div className="flex flex-col">
              <p className="text-xs font-black text-white uppercase tracking-widest">Information Sources</p>
              <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Where content comes from</p>
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
              const percentage = Math.round((count / total) * 100);
              const theme = getFullTheme(color);
              return (
                <div key={type} className={`rounded-xl ${theme.bg500_5} border ${theme.border500_15} p-3 transition-all ${theme.hoverBg500_10} ${theme.hoverBorder500_30} group/source shadow-[inset_0_0_12px_rgba(255,255,255,0.01)] ${count === 0 ? 'opacity-20' : ''}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 ${theme.bg500_10} rounded-lg border ${theme.border500_20} group-hover/source:scale-110 transition-transform duration-500`}>
                      <Icon className={`h-3.5 w-3.5 ${theme.text400}`} />
                    </div>
                    <span className={`text-[8px] font-black uppercase tracking-wider ${theme.text400Muted} ${theme.groupHoverText} transition-colors`}>{label}</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <p className="text-xl font-black text-white tracking-tighter group-hover/source:scale-105 origin-left transition-transform">{count}</p>
                    <span className={`px-1.5 py-0.5 rounded-md ${theme.bg500_10} text-[9px] font-black ${theme.text400} border ${theme.border500_20}`}>{percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 3: Sub-Maps & Public vs Private */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Sub-Maps Stats */}
        <div className="relative overflow-hidden rounded-2xl bg-white/[0.02] border border-white/10 p-5 sm:p-6 transition-all hover:border-white/20 hover:bg-white/[0.04] shadow-[inset_0_0_30px_rgba(255,255,255,0.01)] group/submaps">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/[0.03] rounded-full blur-[60px] pointer-events-none group-hover/submaps:bg-emerald-500/[0.06] transition-all duration-700" />
          <div className="relative">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <Layers className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="flex flex-col">
                <p className="text-xs font-black text-white uppercase tracking-widest">Sub-Map Links</p>
                <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Nested Branching Details</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Sub-Maps', value: totalSubMaps, color: 'violet' as const, icon: Layers },
                { label: 'Parents', value: parentMapIds.size, color: 'indigo' as const, icon: MapIcon },
                { label: 'Avg/Parent', value: parentMapIds.size > 0 ? (totalSubMaps / parentMapIds.size).toFixed(1) : '0', color: 'blue' as const, icon: TrendingUp },
              ].map(({ label, value, color, icon: Icon }) => {
                const theme = getFullTheme(color);
                return (
                  <div key={label} className={`rounded-xl ${theme.bg500_5} border ${theme.border500_15} p-3 transition-all ${theme.hoverBg500_10} ${theme.hoverBorder500_30} group/item shadow-[inset_0_0_12px_rgba(255,255,255,0.01)]`}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className={`p-1 ${theme.bg500_10} rounded-md group-hover/item:scale-110 transition-transform`}>
                        <Icon className={`h-3 w-3 ${theme.text400}`} />
                      </div>
                      <span className={`text-[8px] font-black uppercase tracking-wider ${theme.text400Muted}`}>{label}</span>
                    </div>
                    <p className="text-xl font-black text-white tracking-tighter group-hover/item:translate-x-0.5 transition-transform">{value}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Public vs Private */}
        <div className="relative overflow-hidden rounded-2xl bg-white/[0.02] border border-white/10 p-5 sm:p-6 transition-all hover:border-white/20 hover:bg-white/[0.04] shadow-[inset_0_0_30px_rgba(255,255,255,0.01)] group/visibility">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/[0.03] rounded-full blur-[60px] pointer-events-none group-hover/visibility:bg-amber-500/[0.06] transition-all duration-700" />
          <div className="relative">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
                <Globe className="h-4 w-4 text-amber-400" />
              </div>
              <div className="flex flex-col">
                <p className="text-xs font-black text-white uppercase tracking-widest">Public vs Private</p>
                <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Sharing Distribution</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Public', value: publicPrivate.public, color: 'emerald' as const, icon: Unlock },
                { label: 'Private', value: publicPrivate.private, color: 'yellow' as const, icon: Lock },
                { label: 'Rate', value: total > 0 ? Math.round((publicPrivate.public / total) * 100) : 0, color: 'orange' as const, icon: TrendingUp, isPercent: true },
              ].map(({ label, value, color, icon: Icon, isPercent }) => {
                const theme = getFullTheme(color);
                return (
                  <div key={label} className={`rounded-xl ${theme.bg500_5} border ${theme.border500_15} p-3 transition-all ${theme.hoverBg500_10} ${theme.hoverBorder500_30} group/item shadow-[inset_0_0_12px_rgba(255,255,255,0.01)]`}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className={`p-1 ${theme.bg500_10} rounded-md group-hover/item:scale-110 transition-transform`}>
                        <Icon className={`h-3 w-3 ${theme.text400}`} />
                      </div>
                      <span className={`text-[8px] font-black uppercase tracking-wider ${theme.text400Muted}`}>{label}</span>
                    </div>
                    <p className="text-xl font-black text-white tracking-tighter group-hover/item:translate-x-0.5 transition-transform">{isPercent ? `${value}%` : value}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Persona */}
      <div className="relative overflow-hidden rounded-2xl bg-white/[0.02] border border-white/10 p-5 sm:p-6 transition-all hover:border-white/20 hover:bg-white/[0.04] shadow-[inset_0_0_30px_rgba(255,255,255,0.01)] group/persona">
        <div className="absolute top-0 right-0 w-48 h-48 bg-violet-500/[0.03] rounded-full blur-[80px] pointer-events-none group-hover/persona:bg-violet-500/[0.06] transition-all duration-700" />
        <div className="relative">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2.5 bg-violet-500/10 rounded-xl border border-violet-500/20">
              <Brain className="h-4 w-4 text-violet-400" />
            </div>
            <div className="flex flex-col">
              <p className="text-xs font-black text-white uppercase tracking-widest">AI Persona Distribution</p>
              <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Tone & Learning Style Preference</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {( [
              { key: 'Teacher', label: 'Teacher', color: 'violet', icon: UserRound },
              { key: 'Concise', label: 'Concise', color: 'indigo', icon: Zap },
              { key: 'Creative', label: 'Creative', color: 'blue', icon: Palette },
              { key: 'Sage', label: 'Cognitive Sage', color: 'emerald', icon: Brain },
            ] as const).map(({ key, label, color, icon: Icon }) => {
              const count = personaCounts[key] || 0;
              const percentage = Math.round((count / total) * 100);
              const theme = getFullTheme(color);
              return (
                <div key={key} className={`rounded-xl ${theme.bg500_5} border ${theme.border500_15} p-3.5 transition-all ${theme.hoverBg500_10} ${theme.hoverBorder500_30} group/item shadow-[inset_0_0_12px_rgba(255,255,255,0.01)]`}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className={`p-1.5 ${theme.bg500_10} rounded-lg border ${theme.border500_20} group-hover/item:scale-110 transition-transform duration-500`}>
                      <Icon className={`h-3.5 w-3.5 ${theme.text400}`} />
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${theme.text400Muted}`}>{label}</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <p className="text-xl font-black text-white tracking-tighter group-hover/item:translate-x-0.5 transition-transform">{count}</p>
                    <span className={`px-1.5 py-0.5 rounded-md ${theme.bg500_10} text-[9px] font-black ${theme.text400} border ${theme.border500_20}`}>{percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
