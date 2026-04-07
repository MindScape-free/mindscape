'use client';

import React from 'react';
import { 
  Users, 
  Map as MapIcon, 
  TrendingUp, 
  Clock, 
  UserPlus, 
  Zap, 
  ArrowUpRight, 
  ArrowDownRight, 
  ChevronRight, 
  Heart, 
  Trophy, 
  Flame, 
  MessageSquare, 
  Sparkles, 
  Globe, 
  FileText, 
  Image as ImageIcon, 
  Youtube, 
  Layers, 
  Lock, 
  Unlock, 
  UserRound, 
  Palette,
  BarChart3,
  ChevronLeft,
  Loader2,
  Copy,
  Brain,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, formatDistanceToNow, isSameMonth } from 'date-fns';
import { AdminStats, toDate } from '@/types/chat';
import { DashboardMetrics, AdminTab } from '@/types/admin';
import { ActivityIcon } from './AdminCommon';
import { 
  StatCardSkeleton, 
  HealthScoreSkeleton, 
  AnalyticsCardSkeleton, 
  HeatmapSkeleton, 
  TopContributorsSkeleton 
} from './AdminSkeletons';

interface DashboardTabProps {
  stats: AdminStats | null;
  metrics: DashboardMetrics | null;
  healthScore: number;
  totalMindmapsEver: number;
  isMonthLoading: boolean;
  selectedMonth: Date;
  setSelectedMonth: (date: Date) => void;
  topContributorsStatFilter: string;
  setTopContributorsStatFilter: (filter: string) => void;
  setSelectedUser: (user: any) => void;
  setIsUserDetailOpen: (open: boolean) => void;
  setActiveTab: (tab: AdminTab) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = React.memo(({
  stats,
  metrics,
  healthScore,
  totalMindmapsEver,
  isMonthLoading,
  selectedMonth,
  setSelectedMonth,
  topContributorsStatFilter,
  setTopContributorsStatFilter,
  setSelectedUser,
  setIsUserDetailOpen,
  setActiveTab,
}) => {
  // Safe default for mapAnalytics - use spread to merge missing properties
  const mapAnalyticsDefault = {
    totalAnalyzed: 0,
    modeCounts: { single: 0, compare: 0, multi: 0 },
    depthCounts: { low: 0, medium: 0, deep: 0, unspecified: 0 },
    sourceCounts: {} as Record<string, number>,
    personaCounts: {} as Record<string, number>,
    subMapStats: { total: 0, parents: 0, avgPerParent: 0 },
    publicPrivate: { public: 0, private: 0 },
    avgNodesPerMap: 0,
    topPersona: 'N/A',
    featuredCount: 0,
    userStats: [],
  };
  // Spread operator ensures missing nested properties get defaults
  const safeMapAnalytics = {
    ...mapAnalyticsDefault,
    ...(metrics?.mapAnalytics || {}),
    modeCounts: { ...mapAnalyticsDefault.modeCounts, ...(metrics?.mapAnalytics?.modeCounts || {}) },
    depthCounts: { ...mapAnalyticsDefault.depthCounts, ...(metrics?.mapAnalytics?.depthCounts || {}) },
    subMapStats: { ...mapAnalyticsDefault.subMapStats, ...(metrics?.mapAnalytics?.subMapStats || {}) },
    publicPrivate: { ...mapAnalyticsDefault.publicPrivate, ...(metrics?.mapAnalytics?.publicPrivate || {}) },
  };
  
  return (
    <div className="space-y-10 pb-20">
      {/* Loading State */}
      {isMonthLoading ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <HealthScoreSkeleton />
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
        </>
      ) : (
        <>
          {/* Health Score + Primary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="rounded-xl bg-zinc-900/40 border border-white/5 p-4 flex flex-col items-center justify-center">
              <div className="relative mb-2">
                <svg className="w-14 h-14 -rotate-90">
                  <circle cx="28" cy="28" r="22" fill="none" stroke="currentColor" strokeWidth="5" className="text-zinc-800" />
                  <circle 
                    cx="28" cy="28" r="22" fill="none" 
                    stroke="currentColor" strokeWidth="5" 
                    strokeLinecap="round"
                    className={healthScore >= 70 ? 'text-emerald-500' : healthScore >= 40 ? 'text-amber-500' : 'text-red-500'}
                    strokeDasharray={`${(healthScore / 100) * 138.2} 138.2`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-base font-black ${healthScore >= 70 ? 'text-emerald-400' : healthScore >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                    {healthScore}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 mb-1">
                <Heart className={`h-3 w-3 ${healthScore >= 70 ? 'text-emerald-400' : healthScore >= 40 ? 'text-amber-400' : 'text-red-400'}`} />
                <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-400">Health</span>
              </div>
              <Badge className={`text-[7px] font-bold uppercase px-1.5 py-0.5 ${
                healthScore >= 70 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                  : healthScore >= 40 
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {healthScore >= 70 ? 'Good' : healthScore >= 40 ? 'Fair' : 'Poor'}
              </Badge>
            </div>

            <div className="rounded-xl bg-violet-500/5 border border-violet-500/15 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-violet-500/10 rounded-lg">
                  <Users className="h-3.5 w-3.5 text-violet-400" />
                </div>
                <span className="text-[8px] font-bold uppercase tracking-wider text-violet-400/70">Users</span>
              </div>
              <p className="text-2xl font-black text-white tracking-tight">{(stats?.totalUsers || 0).toLocaleString()}</p>
            </div>

            <div className="rounded-xl bg-indigo-500/5 border border-indigo-500/15 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-indigo-500/10 rounded-lg">
                  <Globe className="h-3.5 w-3.5 text-indigo-400" />
                </div>
                <span className="text-[8px] font-bold uppercase tracking-wider text-indigo-400/70">Public Maps</span>
              </div>
              <p className="text-2xl font-black text-white tracking-tight">{(stats?.totalMaps || 0).toLocaleString()}</p>
            </div>

            <div className="rounded-xl bg-blue-500/5 border border-blue-500/15 p-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-blue-500/10 rounded-lg">
                          <Layers className="h-3.5 w-3.5 text-blue-400" />
                        </div>
                        <span className="text-[8px] font-bold uppercase tracking-wider text-blue-400/70">Total Created</span>
                      </div>
                      <p className="text-2xl font-black text-white tracking-tight">{totalMindmapsEver.toLocaleString()}</p>
                      <span className="text-[7px] text-zinc-500 mt-1 block">Historical Total</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-zinc-950 border-white/10 text-[10px]">
                    Includes all mindmaps ever created, including deleted ones.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="rounded-xl bg-cyan-500/5 border border-cyan-500/15 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-cyan-500/10 rounded-lg">
                  <MessageSquare className="h-3.5 w-3.5 text-cyan-400" />
                </div>
                <span className="text-[8px] font-bold uppercase tracking-wider text-cyan-400/70">Total Chats</span>
              </div>
              <p className="text-2xl font-black text-white tracking-tight">{(stats?.totalChats || 0).toLocaleString()}</p>
            </div>

            <div className="rounded-xl bg-yellow-500/5 border border-yellow-500/15 p-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-yellow-500/10 rounded-lg">
                          <Zap className="h-3.5 w-3.5 text-yellow-400" />
                        </div>
                        <span className="text-[8px] font-bold uppercase tracking-wider text-yellow-400/70">Active 24h</span>
                      </div>
                      <p className="text-2xl font-black text-white tracking-tight">{metrics?.activeUsers24h ?? 0}</p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-zinc-950 border-white/10 text-[10px]">
                    Users active in the last 24 hours relative to sync time.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="rounded-xl bg-violet-500/5 border border-violet-500/15 p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-violet-500/10 rounded-lg">
                  <ActivityIcon className="h-3.5 w-3.5 text-violet-400" />
                </div>
                <span className="text-[8px] font-bold uppercase tracking-wider text-violet-400/70">Engagement</span>
              </div>
              <p className="text-2xl font-black text-white tracking-tight">{Math.round(metrics?.engagementRate ?? 0)}%</p>
            </div>

            <div className="rounded-xl bg-indigo-500/5 border border-indigo-500/15 p-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 bg-indigo-500/10 rounded-lg">
                          <UserPlus className="h-3.5 w-3.5 text-indigo-400" />
                        </div>
                        <span className="text-[8px] font-bold uppercase tracking-wider text-indigo-400/70">New Users</span>
                      </div>
                      <p className="text-2xl font-black text-white tracking-tight">{metrics?.newUsersToday ?? 0}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {(metrics?.newUsersToday ?? 0) >= (metrics?.newUsersYesterday ?? 0) ? (
                          <ArrowUpRight className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 text-red-400" />
                        )}
                        <span className="text-[7px] text-zinc-500">{metrics?.newUsersYesterday ?? 0} prev 24h</span>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-zinc-950 border-white/10 text-[10px]">
                    Registrations in the last 24 hours. Compared to the 24h period before that.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="rounded-xl bg-blue-500/5 border border-blue-500/15 p-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 bg-blue-500/10 rounded-lg">
                          <MapIcon className="h-3.5 w-3.5 text-blue-400" />
                        </div>
                        <span className="text-[8px] font-bold uppercase tracking-wider text-blue-400/70">New Maps</span>
                      </div>
                      <p className="text-2xl font-black text-white tracking-tight">{metrics?.newMapsToday ?? 0}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {(metrics?.newMapsToday ?? 0) >= (metrics?.newMapsYesterday ?? 0) ? (
                          <ArrowUpRight className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 text-red-400" />
                        )}
                        <span className="text-[7px] text-zinc-500">{metrics?.newMapsYesterday ?? 0} prev 24h</span>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-zinc-950 border-white/10 text-[10px]">
                    Maps created in the last 24 hours. Compared to the 24h period before that.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="rounded-xl bg-green-500/5 border border-green-500/15 p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-green-500/10 rounded-lg">
                  <TrendingUp className="h-3.5 w-3.5 text-green-400" />
                </div>
                <span className="text-[8px] font-bold uppercase tracking-wider text-green-400/70">Maps/User</span>
              </div>
              <p className="text-2xl font-black text-white tracking-tight">{metrics?.avgMapsPerUser?.toFixed(1) ?? 0}</p>
            </div>

            <div className="rounded-xl bg-yellow-500/5 border border-yellow-500/15 p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-yellow-500/10 rounded-lg">
                  <BarChart3 className="h-3.5 w-3.5 text-yellow-400" />
                </div>
                <span className="text-[8px] font-bold uppercase tracking-wider text-yellow-400/70">Chats/User</span>
              </div>
              <p className="text-2xl font-black text-white tracking-tight">{metrics?.avgChatsPerUser?.toFixed(1) ?? 0}</p>
            </div>

            <div className="rounded-xl bg-orange-500/5 border border-orange-500/15 p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-orange-500/10 rounded-lg">
                  <Layers className="h-3.5 w-3.5 text-orange-400" />
                </div>
                <span className="text-[8px] font-bold uppercase tracking-wider text-orange-400/70">Avg Nodes</span>
              </div>
              <p className="text-2xl font-black text-white tracking-tight">{Number(safeMapAnalytics.avgNodesPerMap).toFixed(1)}</p>
            </div>
          </div>

          {/* Row 3: Activity Heatmap */}
          <div className="rounded-2xl bg-zinc-900/40 border border-white/5 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm font-black text-white">Activity Heatmap</p>
                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Monthly overview</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1))}
                  disabled={isMonthLoading}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-50 transition-all"
                >
                  <ChevronLeft className="h-4 w-4 text-zinc-400" />
                </button>
                <span className="text-xs font-black text-white min-w-[100px] text-center">
                  {isMonthLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto text-violet-400" /> : format(selectedMonth, 'MMMM yyyy')}
                </span>
                <button
                  onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1))}
                  disabled={isMonthLoading || isSameMonth(selectedMonth, new Date())}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-50 transition-all"
                >
                  <ChevronRight className="h-4 w-4 text-zinc-400" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mb-4">
              <span className="text-[10px] text-zinc-600 font-bold">Less</span>
              {['bg-zinc-800', 'bg-violet-900/60', 'bg-violet-700/70', 'bg-violet-500', 'bg-violet-400'].map((c, i) => (
                <div key={i} className={`h-3 w-3 rounded-sm ${c}`} />
              ))}
              <span className="text-[10px] text-zinc-600 font-bold">More</span>
            </div>
            <TooltipProvider delayDuration={0}>
              <div className="grid grid-cols-[repeat(31,minmax(0,1fr))] gap-0.5">
                {(() => {
                  const year = selectedMonth.getFullYear();
                  const month = selectedMonth.getMonth();
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  const today = new Date();
                  const todayStr = format(today, 'yyyy-MM-dd');
                  
                  const allDays = [];
                  for (let i = 1; i <= daysInMonth; i++) {
                    const d = new Date(year, month, i);
                    const dateStr = format(d, 'yyyy-MM-dd');
                    const data = metrics?.heatmapDays?.find((day: any) => day.date === dateStr);
                    const isToday = dateStr === todayStr;
                    const isFuture = d > today;
                    allDays.push({
                      date: dateStr,
                      data: data || { date: dateStr, newUsers: 0, newMaps: 0, newSubMaps: 0, activeUsers: 0, publicMaps: 0, privateMaps: 0 },
                      isToday,
                      isFuture
                    });
                  }
                  
                  return allDays.map(({ date, data, isToday, isFuture }) => {
                    const totalActivity = (data.newUsers || 0) + (data.newMaps || 0) + (data.activeUsers || 0) + (data.totalActions || 0);
                    const intensity = isFuture ? 'bg-zinc-800/30' : 
                      totalActivity === 0 ? 'bg-zinc-800' : 
                      totalActivity <= 5 ? 'bg-violet-900/60' : 
                      totalActivity <= 15 ? 'bg-violet-700/70' : 
                      totalActivity <= 30 ? 'bg-violet-500' : 'bg-violet-400';
                    
                    return (
                      <Tooltip key={date}>
                        <TooltipTrigger asChild>
                          <div className={`aspect-square flex flex-col items-center justify-center rounded-sm ${intensity} hover:ring-2 hover:ring-violet-400/50 transition-all cursor-default ${isToday ? 'ring-2 ring-white/30' : ''} ${isFuture ? 'opacity-40' : ''}`}>
                            <span className="text-[7px] text-white/70 font-bold">{format(new Date(date), 'd')}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-zinc-900 border-zinc-700 text-[10px] font-bold p-3 min-w-[180px]">
                          <p className="text-zinc-300 font-black mb-2 border-b border-zinc-700 pb-1">{format(new Date(date), 'EEEE, MMM d')}</p>
                          <div className="space-y-1">
                            <p className="text-blue-400 flex items-center gap-2"><Users className="h-3 w-3" /> {data.newUsers} new user{data.newUsers !== 1 ? 's' : ''}</p>
                            <p className="text-violet-400 flex items-center gap-2"><MapIcon className="h-3 w-3" /> {data.newMaps} new map{data.newMaps !== 1 ? 's' : ''}</p>
                            <p className="text-pink-400 flex items-center gap-2"><Layers className="h-3 w-3" /> {data.newSubMaps} sub-map{data.newSubMaps !== 1 ? 's' : ''}</p>
                            <p className="text-emerald-400 flex items-center gap-2"><Zap className="h-3 w-3" /> {data.activeUsers} active user{data.activeUsers !== 1 ? 's' : ''}</p>
                            <p className="text-cyan-400 flex items-center gap-2 font-bold"><ActivityIcon className="h-3 w-3" /> {data.totalActions || 0} system action{(data.totalActions || 0) !== 1 ? 's' : ''}</p>
                            <p className="text-amber-400 flex items-center gap-2"><Globe className="h-3 w-3" /> {data.publicMaps} public / {data.privateMaps} private</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  });
                })()}
              </div>
            </TooltipProvider>
          </div>

          {/* Map Analytics */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-violet-500/20 to-indigo-500/20 rounded-2xl border border-violet-500/30 shadow-lg shadow-violet-500/10">
                  <BarChart3 className="h-6 w-6 text-violet-400" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">Mindmap Analytics</h2>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Comprehensive insights across all mind maps</p>
                </div>
              </div>
              {safeMapAnalytics && (
                <div className="flex items-center gap-4 px-4 py-2 bg-gradient-to-r from-violet-500/10 to-indigo-500/10 rounded-xl border border-violet-500/20">
                  <div className="text-center">
                    <p className="text-lg font-black text-white">{safeMapAnalytics.totalAnalyzed.toLocaleString()}</p>
                    <p className="text-[8px] text-violet-400/70 font-bold uppercase">Current Mindmap</p>
                  </div>
                  <div className="w-px h-8 bg-violet-500/20" />
                  <div className="text-center">
                    <p className="text-lg font-black text-blue-400">{safeMapAnalytics.topPersona || 'N/A'}</p>
                    <p className="text-[8px] text-blue-400/70 font-bold uppercase">Top Persona</p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Maps by Mode */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900/60 to-zinc-900/40 border border-white/5 p-6">
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-3xl" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-violet-500/10 rounded-xl border border-violet-500/20">
                      <MapIcon className="h-4 w-4 text-violet-400" />
                    </div>
                    <p className="text-sm font-bold text-white">Maps by Mode</p>
                  </div>
                  {safeMapAnalytics ? (
                    <div className="grid grid-cols-3 gap-3">
                      {([
                        { key: 'single', label: 'Single', value: safeMapAnalytics.modeCounts.single, color: 'violet', icon: FileText },
                        { key: 'compare', label: 'Compare', value: safeMapAnalytics.modeCounts.compare, color: 'indigo', icon: Copy },
                        { key: 'multi', label: 'Multi', value: safeMapAnalytics.modeCounts.multi, color: 'blue', icon: Layers },
                      ] as const).map(({ key, label, value, color, icon: Icon }) => {
                        const total = safeMapAnalytics.totalAnalyzed || 1;
                        const percentage = Math.round((value / total) * 100);
                        return (
                          <div key={key} className={`rounded-xl bg-${color}-500/5 border border-${color}-500/15 p-4 transition-all hover:bg-${color}-500/10`}>
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`p-1.5 bg-${color}-500/10 rounded-lg`}>
                                <Icon className={`h-3.5 w-3.5 text-${color}-400`} />
                              </div>
                              <span className={`text-[8px] font-bold uppercase tracking-wider text-${color}-400/70`}>{label}</span>
                            </div>
                            <div className="flex items-end justify-between">
                              <p className="text-2xl font-black text-white tracking-tight">{value.toLocaleString()}</p>
                              <span className={`px-1.5 py-0.5 rounded-lg bg-${color}-500/10 text-[9px] font-bold text-${color}-400`}>{percentage}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-24">
                      <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
                    </div>
                  )}
                </div>
              </div>

              {/* Maps by Depth */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900/60 to-zinc-900/40 border border-white/5 p-6">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                      <Layers className="h-4 w-4 text-indigo-400" />
                    </div>
                    <p className="text-sm font-bold text-white">Maps by Depth</p>
                  </div>
                  {safeMapAnalytics ? (
                    <div className="grid grid-cols-3 gap-3">
                      {([
                        { key: 'low', label: 'Quick', value: (safeMapAnalytics.depthCounts.low || 0) + (safeMapAnalytics.depthCounts.unspecified || 0), color: 'emerald', icon: Zap },
                        { key: 'medium', label: 'Balanced', value: safeMapAnalytics.depthCounts.medium, color: 'yellow', icon: Layers },
                        { key: 'deep', label: 'Detailed', value: safeMapAnalytics.depthCounts.deep, color: 'orange', icon: Layers },
                      ] as const).map(({ key, label, value, color, icon: Icon }) => {
                        const total = safeMapAnalytics.totalAnalyzed || 1;
                        const percentage = Math.round((value / total) * 100);
                        return (
                          <div key={key} className={`rounded-xl bg-${color}-500/5 border border-${color}-500/15 p-4 transition-all hover:bg-${color}-500/10`}>
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`p-1.5 bg-${color}-500/10 rounded-lg`}>
                                <Icon className={`h-3.5 w-3.5 text-${color}-400`} />
                              </div>
                              <span className={`text-[8px] font-bold uppercase tracking-wider text-${color}-400/70`}>{label}</span>
                            </div>
                            <div className="flex items-end justify-between">
                              <p className="text-2xl font-black text-white tracking-tight">{value.toLocaleString()}</p>
                              <span className={`px-1.5 py-0.5 rounded-lg bg-${color}-500/10 text-[9px] font-bold text-${color}-400`}>{percentage}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-24">
                      <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Source Types */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900/60 to-zinc-900/40 border border-white/5 p-6">
              <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                    <Globe className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Maps by Source Type</p>
                    <p className="text-[9px] text-zinc-500 font-medium">Content source breakdown</p>
                  </div>
                </div>
                {safeMapAnalytics ? (
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {([
                      { type: 'text', icon: FileText, color: 'violet' as const, label: 'Text' },
                      { type: 'pdf', icon: FileText, color: 'indigo' as const, label: 'PDF' },
                      { type: 'website', icon: Globe, color: 'blue' as const, label: 'Website' },
                      { type: 'image', icon: ImageIcon, color: 'emerald' as const, label: 'Image' },
                      { type: 'youtube', icon: Youtube, color: 'yellow' as const, label: 'YouTube' },
                      { type: 'multi', icon: Layers, color: 'orange' as const, label: 'Multi' }
                    ] as const).map(({ type, icon: Icon, color, label }) => {
                      const count = safeMapAnalytics.sourceCounts?.[type] || 0;
                      const total = safeMapAnalytics.totalAnalyzed || 1;
                      const percentage = Math.round((count / total) * 100);
                      return (
                        <div 
                          key={type} 
                          className={`rounded-xl bg-${color}-500/5 border border-${color}-500/15 p-4 transition-all hover:bg-${color}-500/10 ${count === 0 ? 'opacity-100' : ''}`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`p-1.5 bg-${color}-500/10 rounded-lg`}>
                              <Icon className={`h-3.5 w-3.5 text-${color}-400`} />
                            </div>
                            <span className={`text-[8px] font-bold uppercase tracking-wider text-${color}-400/70`}>{label}</span>
                          </div>
                          <div className="flex items-end justify-between">
                            <p className="text-2xl font-black text-white tracking-tight">{count.toLocaleString()}</p>
                            <span className={`px-1.5 py-0.5 rounded-lg bg-${color}-500/10 text-[9px] font-bold text-${color}-400`}>{percentage}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sub-Maps Stats */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900/60 to-zinc-900/40 border border-white/5 p-6">
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-3xl" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-green-500/10 rounded-xl border border-green-500/20">
                      <Layers className="h-4 w-4 text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Sub-Maps Statistics</p>
                      <p className="text-[9px] text-zinc-500 font-medium">Nested map insights</p>
                    </div>
                  </div>
                  {safeMapAnalytics ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {[
                        { label: 'Total Nested', value: safeMapAnalytics.subMapStats?.total ?? 0, color: 'violet', icon: Layers, desc: 'Expansions/Children' },
                        { label: 'Parent Maps', value: safeMapAnalytics.subMapStats?.parents ?? 0, color: 'indigo', icon: MapIcon, desc: 'Source/Root' },
                        { label: 'Avg/Parent', value: safeMapAnalytics.subMapStats?.avgPerParent ?? 0, color: 'emerald', icon: TrendingUp, desc: 'Expansion Depth' },
                      ].map(({ label, value, color, icon: Icon, desc }) => (
                        <div key={label} className={`rounded-xl bg-${color}-500/5 border border-${color}-500/15 p-4 transition-all hover:bg-${color}-500/10 group/card`}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`p-1.5 bg-${color}-500/10 rounded-lg group-hover/card:scale-110 transition-transform`}>
                              <Icon className={`h-3.5 w-3.5 text-${color}-400`} />
                            </div>
                            <span className={`text-[8px] font-bold uppercase tracking-wider text-${color}-400/70`}>{label}</span>
                          </div>
                          <div className="flex items-end justify-between">
                            <p className="text-2xl font-black text-white tracking-tight">{typeof value === 'number' ? value.toLocaleString() : value}</p>
                          </div>
                          <p className="text-[7px] text-zinc-500 mt-1 uppercase font-black tracking-tighter">{desc}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-20">
                      <Loader2 className="h-5 w-5 animate-spin text-green-400" />
                    </div>
                  )}
                </div>
              </div>

              {/* Public vs Private */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900/60 to-zinc-900/40 border border-white/5 p-6">
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-3xl" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                      <Globe className="h-4 w-4 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Public vs Private</p>
                      <p className="text-[9px] text-zinc-500 font-medium">Map visibility distribution</p>
                    </div>
                  </div>
                  {safeMapAnalytics ? (
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Public', value: safeMapAnalytics.publicPrivate.public, color: 'emerald', icon: Unlock },
                        { label: 'Private', value: safeMapAnalytics.publicPrivate.private, color: 'yellow', icon: Lock },
                        { label: 'Public Rate', value: safeMapAnalytics.totalAnalyzed > 0 ? Math.round((safeMapAnalytics.publicPrivate.public / safeMapAnalytics.totalAnalyzed) * 100) : 0, color: 'orange', icon: TrendingUp, isPercent: true },
                      ].map(({ label, value, color, icon: Icon, isPercent }) => (
                        <div key={label} className={`rounded-xl bg-${color}-500/5 border border-${color}-500/15 p-4 transition-all hover:bg-${color}-500/10`}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`p-1.5 bg-${color}-500/10 rounded-lg`}>
                              <Icon className={`h-3.5 w-3.5 text-${color}-400`} />
                            </div>
                            <span className={`text-[8px] font-bold uppercase tracking-wider text-${color}-400/70`}>{label}</span>
                          </div>
                          <div className="flex items-end justify-between">
                            <p className="text-2xl font-black text-white tracking-tight">{isPercent ? `${value}%` : value.toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-20">
                      <Loader2 className="h-5 w-5 animate-spin text-yellow-400" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Persona Distribution */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900/60 to-zinc-900/40 border border-white/5 p-6">
                <div className="absolute top-0 right-0 w-40 h-40 bg-violet-500/5 rounded-full blur-3xl" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-violet-500/10 rounded-xl border border-violet-500/20">
                      <Brain className="h-4 w-4 text-violet-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Maps by Persona</p>
                      <p className="text-[9px] text-zinc-500 font-medium">AI persona distribution</p>
                    </div>
                  </div>
                  {safeMapAnalytics?.personaCounts ? (
                    <div className="grid grid-cols-2 gap-3">
                      {([
                        { key: 'Teacher', label: 'Teacher', color: 'violet', icon: UserRound },
                        { key: 'Concise', label: 'Concise', color: 'indigo', icon: Zap },
                        { key: 'Creative', label: 'Creative', color: 'blue', icon: Palette },
                        { key: 'Sage', label: 'Cognitive Sage', color: 'emerald', icon: Brain },
                      ] as const).map(({ key, label, color, icon: Icon }) => {
                        const count = safeMapAnalytics.personaCounts?.[key] || 0;
                        const total = safeMapAnalytics.totalAnalyzed || 1;
                        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                        
                        return (
                          <div key={key} className={`rounded-xl bg-${color}-500/5 border border-${color}-500/15 p-4 transition-all hover:bg-${color}-500/10`}>
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`p-1.5 bg-${color}-500/10 rounded-lg`}>
                                <Icon className={`h-3.5 w-3.5 text-${color}-400`} />
                              </div>
                              <span className={`text-[8px] font-bold uppercase tracking-wider text-${color}-400/70`}>{label}</span>
                            </div>
                            <div className="flex items-end justify-between">
                              <p className="text-2xl font-black text-white tracking-tight">{count.toLocaleString()}</p>
                              <span className={`px-1.5 py-0.5 rounded-lg bg-${color}-500/10 text-[9px] font-bold text-${color}-400`}>{percentage}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-24">
                      <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
                    </div>
                  )}
                </div>
              </div>

              {/* Top Contributors */}
              <div className="relative overflow-hidden rounded-2xl bg-zinc-900/40 border border-white/5 p-6">
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                        <Trophy className="h-4 w-4 text-yellow-400" />
                      </div>
                      <p className="text-sm font-bold text-white">Top Contributors</p>
                    </div>
                    <div className="flex gap-1 p-1 bg-zinc-800/50 rounded-lg">
                      {([
                        { key: 'totalMapsCreated', label: 'Maps', icon: Flame },
                        { key: 'totalNodes', label: 'Nodes', icon: Layers },
                        { key: 'totalImagesGenerated', label: 'Images', icon: ImageIcon },
                        { key: 'currentStreak', label: 'Streak', icon: Zap },
                      ] as const).map((s) => (
                        <button
                          key={s.key}
                          onClick={() => setTopContributorsStatFilter(s.key)}
                          className={`px-2 py-1 text-[9px] font-black rounded-md transition-all flex items-center gap-1 ${
                            topContributorsStatFilter === s.key
                              ? 'bg-violet-500 text-white'
                              : 'text-zinc-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <s.icon className="h-3 w-3" />
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {(() => {
                      const filtered = [...(metrics?.topUsers || [])].sort((a: any, b: any) => {
                        let aVal = 0, bVal = 0;
                        if (topContributorsStatFilter === 'totalMapsCreated') {
                          aVal = a.statistics?.totalMapsCreated || 0;
                          bVal = b.statistics?.totalMapsCreated || 0;
                        } else if (topContributorsStatFilter === 'totalNodes') {
                          aVal = a.statistics?.totalNodes || 0;
                          bVal = b.statistics?.totalNodes || 0;
                        } else if (topContributorsStatFilter === 'totalImagesGenerated') {
                          aVal = a.statistics?.totalImagesGenerated || 0;
                          bVal = b.statistics?.totalImagesGenerated || 0;
                        } else if (topContributorsStatFilter === 'currentStreak') {
                          aVal = a.statistics?.currentStreak || 0;
                          bVal = b.statistics?.currentStreak || 0;
                        }
                        return bVal - aVal;
                      }).slice(0, 5);
                      
                      return filtered.map((u: any, idx: number) => {
                        let displayValue = 0;
                        if (topContributorsStatFilter === 'totalMapsCreated') {
                          displayValue = u.statistics?.totalMapsCreated || 0;
                        } else if (topContributorsStatFilter === 'totalNodes') {
                          displayValue = u.statistics?.totalNodes || 0;
                        } else if (topContributorsStatFilter === 'totalImagesGenerated') {
                          displayValue = u.statistics?.totalImagesGenerated || 0;
                        } else if (topContributorsStatFilter === 'currentStreak') {
                          displayValue = u.statistics?.currentStreak || 0;
                        }
                        
                        return (
                          <button 
                            key={u.id} 
                            onClick={() => {
                              setSelectedUser(u);
                              setIsUserDetailOpen(true);
                            }}
                            className="w-full flex items-center gap-3 p-2 rounded-xl bg-white/5 hover:bg-violet-500/10 hover:border-violet-500/20 border border-transparent transition-all cursor-pointer group/contributor"
                          >
                            <div className={`h-6 w-6 rounded-lg flex items-center justify-center font-black text-[10px] ${
                              idx === 0 ? 'bg-violet-500/20 text-violet-400' : 
                              idx === 1 ? 'bg-indigo-500/20 text-indigo-400' : 
                              idx === 2 ? 'bg-blue-500/20 text-blue-400' : 
                              idx === 3 ? 'bg-green-500/20 text-green-400' :
                              'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {idx + 1}
                            </div>
                            <Avatar className="h-6 w-6 rounded-lg border border-white/10">
                              <AvatarImage src={u.photoURL} />
                              <AvatarFallback className="bg-zinc-800 text-[9px] font-bold text-violet-400 rounded-lg">
                                {u.displayName?.substring(0, 2).toUpperCase() || '??'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-black text-white truncate">{u.displayName || 'User'}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              {topContributorsStatFilter === 'totalMapsCreated' && (
                                <>
                                  <Flame className="h-3 w-3 text-orange-400" />
                                  <span className="text-[10px] font-black text-orange-400">{displayValue}</span>
                                </>
                              )}
                              {topContributorsStatFilter === 'totalNodes' && (
                                <>
                                  <Layers className="h-3 w-3 text-blue-400" />
                                  <span className="text-[10px] font-black text-blue-400">{displayValue}</span>
                                </>
                              )}
                              {topContributorsStatFilter === 'totalImagesGenerated' && (
                                <>
                                  <ImageIcon className="h-3 w-3 text-pink-400" />
                                  <span className="text-[10px] font-black text-pink-400">{displayValue}</span>
                                </>
                              )}
                              {topContributorsStatFilter === 'currentStreak' && (
                                <>
                                  <Zap className="h-3 w-3 text-yellow-400" />
                                  <span className="text-[10px] font-black text-yellow-500">{displayValue}</span>
                                </>
                              )}
                            </div>
                          </button>
                        );
                      });
                    })()}
                    {(!metrics?.topUsers || metrics.topUsers.length === 0) && (
                      <p className="text-[10px] text-zinc-600 text-center py-4">No data yet</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="space-y-6">
            {/* Latest Users */}
            <div className="rounded-2xl bg-zinc-900/40 border border-white/5 overflow-hidden">
              <div className="p-5 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/15">
                    <UserPlus className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">Latest Registrations</h3>
                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Newest users</p>
                  </div>
                </div>
                <button onClick={() => setActiveTab('users')} className="text-[9px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest transition-colors flex items-center gap-1">
                  View All <ChevronRight className="h-3 w-3" />
                </button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4">
                {metrics?.latestUsers.slice(0, 4).map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setSelectedUser(u);
                      setIsUserDetailOpen(true);
                    }}
                    className="rounded-xl p-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-indigo-500/25 transition-all text-left"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="h-10 w-10 rounded-lg border border-white/10 shrink-0">
                        <AvatarImage src={u.photoURL} />
                        <AvatarFallback className="bg-zinc-800 text-xs font-bold text-indigo-400 rounded-lg">
                          {u.displayName?.substring(0, 2).toUpperCase() || '??'}
                        </AvatarFallback>
                      </Avatar>
                      {(() => {
                        const now = new Date();
                        const createdAt = u.createdAt?.toDate?.() || (u.createdAt ? new Date(u.createdAt) : null);
                        const createdHoursAgo = createdAt ? Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)) : null;
                        const isNew = createdHoursAgo !== null && createdHoursAgo <= 24;
                        if (!isNew) return null;
                        return (
                          <Badge className="shrink-0 text-[7px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            New
                          </Badge>
                        );
                      })()}
                    </div>
                    <p className="text-xs font-black text-white truncate mb-1">{u.displayName || 'User'}</p>
                    <p className="text-[9px] text-zinc-500 truncate mb-2">{u.email || 'No email'}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-600">{u.statistics?.totalMapsCreated || 0} maps</span>
                      <span className="text-[10px] text-zinc-600">
                        {(() => {
                          const date = toDate(u.createdAt);
                          return u.createdAt ? formatDistanceToNow(date, { addSuffix: true }) : 'Recently';
                        })()}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
});
