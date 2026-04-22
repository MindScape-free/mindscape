'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { format, formatDistanceToNow, isSameMonth, differenceInMinutes } from 'date-fns';
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            <motion.div 
              whileHover={{ y: -5, scale: 1.02 }}
              className="relative overflow-hidden rounded-[2rem] bg-white/5 border border-white/10 p-6 flex flex-col items-center justify-center backdrop-blur-3xl shadow-2xl group transition-all duration-500"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative mb-3">
                <svg className="w-16 h-16 -rotate-90">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="6" className="text-white/5" />
                  <motion.circle 
                    initial={{ strokeDasharray: "0 175.9" }}
                    animate={{ strokeDasharray: `${(healthScore / 100) * 175.9} 175.9` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    cx="32" cy="32" r="28" fill="none" 
                    stroke="currentColor" strokeWidth="6" 
                    strokeLinecap="round"
                    className={healthScore >= 70 ? 'text-emerald-400' : healthScore >= 40 ? 'text-amber-400' : 'text-rose-400'}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-xl font-black tracking-tighter ${healthScore >= 70 ? 'text-emerald-400' : healthScore >= 40 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {healthScore}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-2 relative z-10">
                <Heart className={`h-3 w-3 ${healthScore >= 70 ? 'text-emerald-400' : healthScore >= 40 ? 'text-amber-400' : 'text-rose-400'}`} />
                <span className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400">Health</span>
              </div>
              <Badge className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                healthScore >= 70 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                  : healthScore >= 40 
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}>
                {healthScore >= 70 ? 'Premium' : healthScore >= 40 ? 'Stable' : 'Critical'}
              </Badge>
            </motion.div>

            {[
              { label: 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: 'violet', glow: 'shadow-violet-500/20' },
              { label: 'Public Maps', value: stats?.totalMaps || 0, icon: Globe, color: 'blue', glow: 'shadow-blue-500/20' },
              { label: 'Created Ever', value: totalMindmapsEver, icon: Layers, color: 'cyan', glow: 'shadow-cyan-500/20', tooltip: 'Includes all mindmaps ever created.' },
              { label: 'Total Chats', value: stats?.totalChats || 0, icon: MessageSquare, color: 'rose', glow: 'shadow-rose-500/20' },
              { label: 'Active 24h', value: metrics?.activeUsers24h ?? 0, icon: Zap, color: 'amber', glow: 'shadow-amber-500/20', tooltip: 'Users active in the last 24 hours.' },
            ].map((stat, i) => (
              <motion.div 
                key={stat.label}
                whileHover={{ y: -5, scale: 1.02 }}
                className={`relative overflow-hidden rounded-[2rem] bg-white/5 border border-white/10 p-6 flex flex-col justify-between backdrop-blur-3xl shadow-2xl group transition-all duration-500 ${stat.glow}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br from-${stat.color}-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="flex items-center justify-between relative z-10">
                  <div className={`p-3 bg-${stat.color}-500/10 rounded-2xl border border-${stat.color}-500/20 group-hover:scale-110 transition-transform duration-500`}>
                    <stat.icon className={`h-5 w-5 text-${stat.color}-400`} />
                  </div>
                  {stat.tooltip && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger><Clock className="h-3 w-3 text-white/20 hover:text-white/40 transition-colors" /></TooltipTrigger>
                        <TooltipContent className="bg-zinc-950 border-white/10 text-[10px]">{stat.tooltip}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <div className="mt-4 relative z-10">
                  <p className="text-3xl font-black text-white tracking-tighter">{(stat.value).toLocaleString()}</p>
                  <p className={`text-[10px] font-black uppercase tracking-[0.1em] text-${stat.color}-400/70 mt-1`}>{stat.label}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {[
              { label: 'Engagement', value: `${Math.round(metrics?.engagementRate ?? 0)}%`, icon: ActivityIcon, color: 'violet' },
              { 
                label: 'New Users', 
                value: metrics?.newUsersToday ?? 0, 
                icon: UserPlus, 
                color: 'indigo',
                sub: `${metrics?.newUsersYesterday ?? 0} prev`,
                trend: (metrics?.newUsersToday ?? 0) >= (metrics?.newUsersYesterday ?? 0)
              },
              { 
                label: 'New Maps', 
                value: metrics?.newMapsToday ?? 0, 
                icon: MapIcon, 
                color: 'blue',
                sub: `${metrics?.newMapsYesterday ?? 0} prev`,
                trend: (metrics?.newMapsToday ?? 0) >= (metrics?.newMapsYesterday ?? 0)
              },
              { label: 'Maps/User', value: metrics?.avgMapsPerUser?.toFixed(1) ?? 0, icon: TrendingUp, color: 'emerald' },
              { label: 'Chats/User', value: metrics?.avgChatsPerUser?.toFixed(1) ?? 0, icon: BarChart3, color: 'amber' },
              { label: 'Avg Nodes', value: Number(safeMapAnalytics.avgNodesPerMap).toFixed(1), icon: Layers, color: 'rose' },
            ].map((stat) => (
              <motion.div 
                key={stat.label}
                whileHover={{ y: -5 }}
                className="relative overflow-hidden rounded-3xl bg-white/5 border border-white/10 p-5 backdrop-blur-3xl shadow-xl group transition-all duration-500"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 bg-${stat.color}-500/10 rounded-xl group-hover:bg-${stat.color}-500/20 transition-colors`}>
                    <stat.icon className={`h-4 w-4 text-${stat.color}-400`} />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-[0.1em] text-zinc-500">{stat.label}</span>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-2xl font-black text-white tracking-tighter">{stat.value}</p>
                  {stat.sub && (
                    <div className="flex items-center gap-1">
                      {stat.trend ? <ArrowUpRight className="h-3 w-3 text-emerald-400" /> : <ArrowDownRight className="h-3 w-3 text-rose-400" />}
                      <span className="text-[9px] font-bold text-zinc-500">{stat.sub}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[2.5rem] bg-white/5 border border-white/10 p-8 backdrop-blur-3xl shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6 relative z-10">
              <div>
                <p className="text-xl font-black text-white tracking-tight">System Pulse</p>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mt-1">Monthly Activity Heatmap</p>
              </div>
              <div className="flex items-center gap-4 bg-zinc-900/50 p-1.5 rounded-2xl border border-white/5">
                <button
                  onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1))}
                  disabled={isMonthLoading}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-50 transition-all"
                >
                  <ChevronLeft className="h-4 w-4 text-zinc-400" />
                </button>
                <span className="text-xs font-black text-white min-w-[120px] text-center uppercase tracking-widest">
                  {isMonthLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto text-violet-400" /> : format(selectedMonth, 'MMMM yyyy')}
                </span>
                <button
                  onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1))}
                  disabled={isMonthLoading || isSameMonth(selectedMonth, new Date())}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-50 transition-all"
                >
                  <ChevronRight className="h-4 w-4 text-zinc-400" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-6 bg-zinc-900/30 w-fit px-4 py-2 rounded-full border border-white/5">
              <span className="text-[10px] text-zinc-500 font-black uppercase tracking-tighter">Quiet</span>
              {[
                'bg-zinc-800/50', 
                'bg-violet-900/40 border border-violet-500/20', 
                'bg-violet-700/60 border border-violet-400/20', 
                'bg-violet-500/80 border border-violet-300/20', 
                'bg-violet-400 shadow-[0_0_15px_rgba(167,139,250,0.4)]'
              ].map((c, i) => (
                <div key={i} className={`h-3 w-3 rounded-[3px] ${c}`} />
              ))}
              <span className="text-[10px] text-zinc-500 font-black uppercase tracking-tighter">Surge</span>
            </div>

            <TooltipProvider delayDuration={0}>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(28px,1fr))] gap-1.5 relative z-10">
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
                    const intensity = isFuture ? 'bg-white/[0.02]' : 
                      totalActivity === 0 ? 'bg-white/[0.05]' : 
                      totalActivity <= 5 ? 'bg-violet-900/40 border border-violet-500/20' : 
                      totalActivity <= 15 ? 'bg-violet-700/60 border border-violet-400/20' : 
                      totalActivity <= 30 ? 'bg-violet-500/80 border border-violet-300/20' : 
                      'bg-violet-400 shadow-[0_0_15px_rgba(167,139,250,0.3)] border border-violet-200/30';
                    
                    return (
                      <Tooltip key={date}>
                        <TooltipTrigger asChild>
                          <motion.div 
                            whileHover={{ scale: 1.2, zIndex: 20 }}
                            className={`aspect-square flex items-center justify-center rounded-lg ${intensity} transition-all cursor-default ${isToday ? 'ring-2 ring-white/50 shadow-[0_0_20px_rgba(255,255,255,0.2)]' : ''} ${isFuture ? 'opacity-20' : ''}`}
                          >
                            <span className="text-[8px] text-white/40 font-black">{format(new Date(date), 'd')}</span>
                          </motion.div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-zinc-950 border border-white/10 text-[10px] p-4 min-w-[200px] backdrop-blur-3xl shadow-2xl">
                          <p className="text-white font-black mb-3 border-b border-white/5 pb-2 text-xs">{format(new Date(date), 'EEEE, MMM d')}</p>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-blue-400"><Users className="h-3 w-3" /> New Users</div><span className="font-black">{data.newUsers}</span></div>
                            <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-violet-400"><MapIcon className="h-3 w-3" /> New Maps</div><span className="font-black">{data.newMaps}</span></div>
                            <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-rose-400"><Layers className="h-3 w-3" /> Sub-maps</div><span className="font-black">{data.newSubMaps}</span></div>
                            <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-emerald-400"><Zap className="h-3 w-3" /> Active Users</div><span className="font-black">{data.activeUsers}</span></div>
                            <div className="flex items-center justify-between pt-1 border-t border-white/5"><div className="flex items-center gap-2 text-amber-400 font-bold"><ActivityIcon className="h-3 w-3" /> Total Actions</div><span className="font-black">{data.totalActions || 0}</span></div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  });
                })()}
              </div>
            </TooltipProvider>
          </motion.div>

          {/* Map Analytics Section */}
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gradient-to-br from-violet-500/20 to-blue-500/20 rounded-[1.5rem] border border-violet-500/30 shadow-2xl backdrop-blur-xl">
                  <BarChart3 className="h-6 w-6 text-violet-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">Entity Analytics</h2>
                  <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mt-1">Deep structure & distribution metrics</p>
                </div>
              </div>
              {safeMapAnalytics && (
                <div className="flex items-center gap-6 px-6 py-3 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-2xl">
                  <div className="text-center">
                    <p className="text-xl font-black text-white">{safeMapAnalytics.totalAnalyzed.toLocaleString()}</p>
                    <p className="text-[8px] text-violet-400/70 font-black uppercase tracking-wider">Analyzed</p>
                  </div>
                  <div className="w-px h-8 bg-white/10" />
                  <div className="text-center">
                    <p className="text-xl font-black text-blue-400">{safeMapAnalytics.topPersona || 'N/A'}</p>
                    <p className="text-[8px] text-blue-400/70 font-black uppercase tracking-wider">Top Persona</p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Maps by Mode */}
              <motion.div 
                whileHover={{ y: -5 }}
                className="relative overflow-hidden rounded-[2rem] bg-white/5 border border-white/10 p-8 backdrop-blur-3xl shadow-2xl group"
              >
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2.5 bg-violet-500/10 rounded-2xl border border-violet-500/20">
                    <MapIcon className="h-5 w-5 text-violet-400" />
                  </div>
                  <p className="text-lg font-black text-white tracking-tight">Interaction Modes</p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {([
                    { key: 'single', label: 'Single', value: safeMapAnalytics.modeCounts.single, color: 'violet', icon: FileText },
                    { key: 'compare', label: 'Compare', value: safeMapAnalytics.modeCounts.compare, color: 'indigo', icon: Copy },
                    { key: 'multi', label: 'Multi', value: safeMapAnalytics.modeCounts.multi, color: 'blue', icon: Layers },
                  ] as const).map(({ key, label, value, color, icon: Icon }) => {
                    const percentage = Math.round((value / (safeMapAnalytics.totalAnalyzed || 1)) * 100);
                    return (
                      <div key={key} className="flex flex-col gap-3">
                        <div className={`rounded-2xl bg-${color}-500/5 border border-${color}-500/15 p-4 group-hover:bg-${color}-500/10 transition-colors`}>
                          <Icon className={`h-4 w-4 text-${color}-400 mb-2`} />
                          <p className="text-2xl font-black text-white tracking-tighter">{value.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">{label}</span>
                          <span className={`text-[10px] font-black text-${color}-400`}>{percentage}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Maps by Depth */}
              <motion.div 
                whileHover={{ y: -5 }}
                className="relative overflow-hidden rounded-[2rem] bg-white/5 border border-white/10 p-8 backdrop-blur-3xl shadow-2xl group"
              >
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2.5 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                    <Zap className="h-5 w-5 text-rose-400" />
                  </div>
                  <p className="text-lg font-black text-white tracking-tight">Knowledge Depth</p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {([
                    { key: 'low', label: 'Sprint', value: (safeMapAnalytics.depthCounts.low || 0) + (safeMapAnalytics.depthCounts.unspecified || 0), color: 'rose', icon: Zap },
                    { key: 'medium', label: 'Dive', value: safeMapAnalytics.depthCounts.medium, color: 'orange', icon: Layers },
                    { key: 'deep', label: 'Abyss', value: safeMapAnalytics.depthCounts.deep, color: 'amber', icon: Layers },
                  ] as const).map(({ key, label, value, color, icon: Icon }) => {
                    const percentage = Math.round((value / (safeMapAnalytics.totalAnalyzed || 1)) * 100);
                    return (
                      <div key={key} className="flex flex-col gap-3">
                        <div className={`rounded-2xl bg-${color}-500/5 border border-${color}-500/15 p-4 group-hover:bg-${color}-500/10 transition-colors`}>
                          <Icon className={`h-4 w-4 text-${color}-400 mb-2`} />
                          <p className="text-2xl font-black text-white tracking-tighter">{value.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">{label}</span>
                          <span className={`text-[10px] font-black text-${color}-400`}>{percentage}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </div>

            {/* Source Types */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="relative overflow-hidden rounded-[2rem] bg-white/5 border border-white/10 p-8 backdrop-blur-3xl shadow-2xl group"
            >
              <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2.5 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                    <Globe className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-lg font-black text-white tracking-tight">Source Intelligence</p>
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.1em] mt-1">Content origin distribution</p>
                  </div>
                </div>
                {safeMapAnalytics ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {([
                      { type: 'text', icon: FileText, color: 'violet' as const, label: 'Text' },
                      { type: 'pdf', icon: FileText, color: 'indigo' as const, label: 'PDF' },
                      { type: 'website', icon: Globe, color: 'blue' as const, label: 'Web' },
                      { type: 'image', icon: ImageIcon, color: 'emerald' as const, label: 'Image' },
                      { type: 'youtube', icon: Youtube, color: 'amber' as const, label: 'YT' },
                      { type: 'multi', icon: Layers, color: 'rose' as const, label: 'Multi' }
                    ] as const).map(({ type, icon: Icon, color, label }) => {
                      const count = safeMapAnalytics.sourceCounts?.[type] || 0;
                      const percentage = Math.round((count / (safeMapAnalytics.totalAnalyzed || 1)) * 100);
                      return (
                        <div 
                          key={type} 
                          className={`rounded-2xl bg-${color}-500/5 border border-${color}-500/15 p-4 group-hover:bg-${color}-500/10 transition-all`}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <Icon className={`h-3.5 w-3.5 text-${color}-400`} />
                            <span className={`text-[8px] font-black uppercase tracking-wider text-${color}-400/60`}>{label}</span>
                          </div>
                          <p className="text-xl font-black text-white tracking-tighter">{count.toLocaleString()}</p>
                          <div className={`mt-2 h-1 w-full bg-${color}-500/10 rounded-full overflow-hidden`}>
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 1, delay: 0.5 }}
                              className={`h-full bg-${color}-400`} 
                            />
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
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Sub-Maps Stats */}
              <motion.div 
                whileHover={{ y: -5 }}
                className="relative overflow-hidden rounded-[2rem] bg-white/5 border border-white/10 p-8 backdrop-blur-3xl shadow-2xl group"
              >
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2.5 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                    <Layers className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-lg font-black text-white tracking-tight">Recursive Expansion</p>
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.1em] mt-1">Nested structure analytics</p>
                  </div>
                </div>
                {safeMapAnalytics ? (
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Total Nested', value: safeMapAnalytics.subMapStats?.total ?? 0, color: 'violet', icon: Layers, desc: 'Count' },
                      { label: 'Parent Maps', value: safeMapAnalytics.subMapStats?.parents ?? 0, color: 'indigo', icon: MapIcon, desc: 'Roots' },
                      { label: 'Avg / Parent', value: safeMapAnalytics.subMapStats?.avgPerParent ?? 0, color: 'emerald', icon: TrendingUp, desc: 'Ratio' },
                    ].map(({ label, value, color, icon: Icon, desc }) => (
                      <div key={label} className={`rounded-2xl bg-${color}-500/5 border border-${color}-500/15 p-4 transition-all hover:bg-${color}-500/10 group/card`}>
                        <div className="flex items-center gap-2 mb-3">
                          <Icon className={`h-3.5 w-3.5 text-${color}-400`} />
                          <span className={`text-[8px] font-black uppercase tracking-wider text-${color}-400/60`}>{label}</span>
                        </div>
                        <p className="text-2xl font-black text-white tracking-tighter">{typeof value === 'number' ? value.toLocaleString() : value}</p>
                        <p className="text-[7px] text-zinc-500 mt-1 uppercase font-black tracking-widest">{desc}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-20">
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
                  </div>
                )}
              </motion.div>

              {/* Public vs Private */}
              <motion.div 
                whileHover={{ y: -5 }}
                className="relative overflow-hidden rounded-[2rem] bg-white/5 border border-white/10 p-8 backdrop-blur-3xl shadow-2xl group"
              >
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2.5 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                    <Globe className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-lg font-black text-white tracking-tight">Access Control</p>
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.1em] mt-1">Visibility distribution</p>
                  </div>
                </div>
                {safeMapAnalytics ? (
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Public', value: safeMapAnalytics.publicPrivate.public, color: 'emerald', icon: Unlock },
                      { label: 'Private', value: safeMapAnalytics.publicPrivate.private, color: 'amber', icon: Lock },
                      { label: 'Public Rate', value: safeMapAnalytics.totalAnalyzed > 0 ? Math.round((safeMapAnalytics.publicPrivate.public / safeMapAnalytics.totalAnalyzed) * 100) : 0, color: 'rose', icon: TrendingUp, isPercent: true },
                    ].map(({ label, value, color, icon: Icon, isPercent }) => (
                      <div key={label} className={`rounded-2xl bg-${color}-500/5 border border-${color}-500/15 p-4 transition-all hover:bg-${color}-500/10`}>
                        <div className="flex items-center gap-2 mb-3">
                          <Icon className={`h-3.5 w-3.5 text-${color}-400`} />
                          <span className={`text-[8px] font-black uppercase tracking-wider text-${color}-400/60`}>{label}</span>
                        </div>
                        <p className="text-2xl font-black text-white tracking-tighter">{isPercent ? `${value}%` : value.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-20">
                    <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
                  </div>
                )}
              </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Persona Distribution */}
              <motion.div 
                whileHover={{ y: -5 }}
                className="relative overflow-hidden rounded-[2rem] bg-white/5 border border-white/10 p-8 backdrop-blur-3xl shadow-2xl group"
              >
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2.5 bg-violet-500/10 rounded-2xl border border-violet-500/20">
                    <Brain className="h-5 w-5 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-lg font-black text-white tracking-tight">AI Archetypes</p>
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.1em] mt-1">Persona influence breakdown</p>
                  </div>
                </div>
                {safeMapAnalytics?.personaCounts ? (
                  <div className="grid grid-cols-2 gap-4">
                    {([
                      { key: 'Teacher', label: 'Teacher', color: 'violet', icon: UserRound },
                      { key: 'Concise', label: 'Concise', color: 'indigo', icon: Zap },
                      { key: 'Creative', label: 'Creative', color: 'blue', icon: Palette },
                      { key: 'Sage', label: 'Cognitive Sage', color: 'emerald', icon: Brain },
                    ] as const).map(({ key, label, color, icon: Icon }) => {
                      const count = safeMapAnalytics.personaCounts?.[key] || 0;
                      const percentage = (safeMapAnalytics.totalAnalyzed || 1) > 0 ? Math.round((count / (safeMapAnalytics.totalAnalyzed || 1)) * 100) : 0;
                      
                      return (
                        <div key={key} className={`rounded-2xl bg-${color}-500/5 border border-${color}-500/15 p-4 transition-all hover:bg-${color}-500/10`}>
                          <div className="flex items-center gap-2 mb-3">
                            <Icon className={`h-4 w-4 text-${color}-400`} />
                            <span className={`text-[10px] font-black uppercase tracking-wider text-${color}-400/60`}>{label}</span>
                          </div>
                          <div className="flex items-end justify-between">
                            <p className="text-2xl font-black text-white tracking-tighter">{count.toLocaleString()}</p>
                            <span className={`px-2 py-0.5 rounded-lg bg-${color}-500/10 text-[9px] font-black text-${color}-400`}>{percentage}%</span>
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
              </motion.div>

              {/* Top Contributors */}
              <motion.div 
                whileHover={{ y: -5 }}
                className="relative overflow-hidden rounded-[2rem] bg-white/5 border border-white/10 p-8 backdrop-blur-3xl shadow-2xl group"
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                      <Trophy className="h-5 w-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-lg font-black text-white tracking-tight">Hall of Fame</p>
                      <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.1em] mt-1">Top system contributors</p>
                    </div>
                  </div>
                  <div className="flex gap-1 p-1 bg-zinc-900/50 rounded-xl border border-white/5">
                    {([
                      { key: 'totalMapsCreated', label: 'Maps', icon: Flame },
                      { key: 'totalNodes', label: 'Nodes', icon: Layers },
                      { key: 'currentStreak', label: 'Streak', icon: Zap },
                    ] as const).map((s) => (
                      <button
                        key={s.key}
                        onClick={() => setTopContributorsStatFilter(s.key)}
                        className={`px-3 py-1.5 text-[9px] font-black rounded-lg transition-all flex items-center gap-2 uppercase tracking-widest ${
                          topContributorsStatFilter === s.key
                            ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/20'
                            : 'text-zinc-500 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <s.icon className="h-3 w-3" />
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-3">
                  {(() => {
                    const filtered = [...(metrics?.topUsers || [])].sort((a: any, b: any) => {
                      let aVal = 0, bVal = 0;
                      if (topContributorsStatFilter === 'totalMapsCreated') { aVal = a.statistics?.totalMapsCreated || 0; bVal = b.statistics?.totalMapsCreated || 0; }
                      else if (topContributorsStatFilter === 'totalNodes') { aVal = a.statistics?.totalNodes || 0; bVal = b.statistics?.totalNodes || 0; }
                      else if (topContributorsStatFilter === 'currentStreak') { aVal = a.statistics?.currentStreak || 0; bVal = b.statistics?.currentStreak || 0; }
                      return bVal - aVal;
                    }).slice(0, 5);
                    
                    return filtered.map((u: any, idx: number) => {
                      let displayValue = 0;
                      if (topContributorsStatFilter === 'totalMapsCreated') displayValue = u.statistics?.totalMapsCreated || 0;
                      else if (topContributorsStatFilter === 'totalNodes') displayValue = u.statistics?.totalNodes || 0;
                      else if (topContributorsStatFilter === 'currentStreak') displayValue = u.statistics?.currentStreak || 0;
                      
                      return (
                        <button 
                          key={u.id} 
                          onClick={() => { setSelectedUser(u); setIsUserDetailOpen(true); }}
                          className="w-full flex items-center gap-4 p-3 rounded-2xl bg-white/5 hover:bg-violet-500/10 border border-transparent hover:border-violet-500/20 transition-all group/item"
                        >
                          <span className="text-xs font-black text-zinc-600 w-4">{idx + 1}</span>
                          <Avatar className="h-8 w-8 rounded-xl border border-white/10 group-hover/item:scale-110 transition-transform">
                            <AvatarImage src={u.photoURL} />
                            <AvatarFallback className="bg-zinc-800 text-[10px] font-black text-violet-400">
                              {u.displayName?.substring(0, 2).toUpperCase() || '??'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-xs font-black text-white truncate">{u.displayName || 'Anonymous'}</p>
                            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest truncate">{u.email || '@system'}</p>
                          </div>
                          <div className="flex items-center gap-2 bg-zinc-950/40 px-3 py-1 rounded-full border border-white/5">
                            <span className="text-xs font-black text-white tracking-tighter">{displayValue}</span>
                          </div>
                        </button>
                      );
                    });
                  })()}
                </div>
              </motion.div>
            </div>
          </div>

          {/* Activity Section */}
          <div className="grid grid-cols-1 gap-8">
            <motion.div 
               whileHover={{ y: -5 }}
               className="rounded-[2.5rem] bg-white/5 border border-white/10 overflow-hidden backdrop-blur-3xl shadow-2xl group"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                    <UserPlus className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white tracking-tight">Recent Arrivals</h3>
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mt-1">Latest system registrations</p>
                  </div>
                </div>
                <button onClick={() => setActiveTab('users')} className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black text-white hover:bg-white/10 uppercase tracking-[0.2em] transition-all">
                  Directory
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-8">
                {metrics?.latestUsers.slice(0, 4).map((u) => (
                  <button
                    key={u.id}
                    onClick={() => { setSelectedUser(u); setIsUserDetailOpen(true); }}
                    className="rounded-2xl p-5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-indigo-500/30 transition-all text-left relative overflow-hidden group/u"
                  >
                    <div className="absolute top-0 right-0 p-3">
                       {(() => {
                        const date = toDate(u.createdAt);
                        const isNew = differenceInMinutes(new Date(), date) < 1440;
                        return isNew && <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.5)]" />;
                      })()}
                    </div>
                    <Avatar className="h-12 w-12 rounded-2xl border-2 border-white/10 mb-4 group-hover/u:scale-110 group-hover/u:rotate-3 transition-transform">
                      <AvatarImage src={u.photoURL} />
                      <AvatarFallback className="bg-zinc-800 text-sm font-black text-indigo-400">
                        {u.displayName?.substring(0, 2).toUpperCase() || '??'}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-sm font-black text-white truncate mb-1">{u.displayName || 'User'}</p>
                    <p className="text-[10px] text-zinc-500 font-bold tracking-tight truncate mb-4">{u.email || 'No email'}</p>
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <div className="flex items-center gap-1.5 grayscale opacity-50 group-hover/u:grayscale-0 group-hover/u:opacity-100 transition-all">
                        <MapIcon className="h-3 w-3 text-indigo-400" />
                        <span className="text-[10px] font-black text-white">{u.statistics?.totalMapsCreated || 0}</span>
                      </div>
                      <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-tighter">
                        {u.createdAt ? formatDistanceToNow(toDate(u.createdAt), { addSuffix: true }) : 'Recent'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
});
