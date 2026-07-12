'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { logAdminActivity } from '@/lib/tracker';
import { mapMindMapRows } from '@/lib/map-mappers';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider } from '@/components/ui/tooltip';
import { MindMapData } from '@/types/mind-map';
import { getStatCardTheme } from '@/components/admin/lib/admin-color-themes';
import {
  UserActivityHeatmap,
  UserMapAnalytics,
  AllTimeAnalytics,
  UserMapsTable,
  UserDetailDialogShell,
  UserDetailHeader,
} from '@/components/admin/user-detail';
import {
  Map as MapIcon,
  Clock,
  Activity,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  BarChart3,
  Brain,
  Globe,
  Layers,
  Zap,
  Trophy,
  UserRound,
  Flame,
} from 'lucide-react';



interface UserDetailDialogProps {
  user: any;
  isOpen: boolean;
  onClose: () => void;
  onUserDeleted?: () => void;
  rank?: number;
}

export default function UserDetailDialog({ user, isOpen, onClose, onUserDeleted, rank }: UserDetailDialogProps) {
  const { supabase, isAdmin, user: adminUser, session } = useAuth();
  // logAdminActivity imported directly from @/lib/tracker
  const [chatCount, setChatCount] = useState<number | null>(null);
  const [userMaps, setUserMaps] = useState<MindMapData[]>([]);
  const [isLoadingMaps, setIsLoadingMaps] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userHeatmapMonth, setUserHeatmapMonth] = useState(new Date());
  const [analyticsView, setAnalyticsView] = useState<'current' | 'allTime'>('current');

  const handleDeleteUser = useCallback(async () => {
    if (!supabase || !user || !isAdmin) return;
    setIsDeleting(true);
    try {
      const userEmail = user.email || user.id;
      // Use Supabase delete
      const { error } = await supabase.from('users').delete().eq('id', user.id);
      if (error) throw error;

      await logAdminActivity({
        type: 'USER_DELETED',
        targetId: user.id,
        targetType: 'user',
        details: `User deleted: ${userEmail}`,
        performedBy: adminUser?.id,
      });
      onUserDeleted?.();
      onClose();
    } catch (error) {
      console.error('Error deleting user:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [supabase, user, adminUser, isAdmin, onClose, onUserDeleted]);
  // `logAdminActivity` is intentionally excluded: it is a stable top-level import,
  // so adding it would be unnecessary noise in the dep array.

  const handleCopyId = useCallback(() => {
    if (!user?.id) return;
    navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  }, [user?.id]);

  useEffect(() => {
    if (isOpen && user?.id && (supabase || session)) {
      const fetchData = async () => {
        setIsLoadingMaps(true);
        try {
          // 1. Get chat count from the unified endpoint (user profile)
          const token = session?.access_token;
          if (token) {
            const res = await fetch(`/api/admin/unified?userId=${user.id}`, {
              headers: { 'Authorization': `Bearer ${token}` },
            });
            if (res.ok) {
              const data = await res.json();
              const profile = data?.user?.profile;
              if (profile) {
                setChatCount(profile.total_chats);
              }
            }
          }

          // 2. Get mindmaps using Supabase select (still needed for individual map details)
          if (supabase) {
            const { data: mapsData, error: mapsError } = await supabase
              .from('mindmaps')
              .select('*')
              .eq('user_id', user.id)
              .order('updated_at', { ascending: false });
            
            if (mapsError) throw mapsError;
            setUserMaps(mapMindMapRows(mapsData || []) as unknown as MindMapData[]);
          }
        } catch (e) {
          console.error('Error fetching profile detail:', e);
        } finally {
          setIsLoadingMaps(false);
        }
      };
      fetchData();
    } else {
      setChatCount(null);
      setUserMaps([]);
    }
    // Deps: `session?.access_token` covers the session object (only access_token is used).
    // `user?.id` covers the user identity. `supabase` is the stable client.
    // Adding `session` or `user` would re-fetch on every render since they are new objects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user?.id, supabase, session?.access_token]);

  if (!user) return null;

  const stats = user.statistics || {};
  const userCreatedAt = (() => {
    if (!user.createdAt) return null;
    try {
      const d = new Date(user.createdAt);
      return isNaN(d.getTime()) ? null : d;
    } catch (e) {
      return null;
    }
  })();

  // Compute Dashboard Metrics for this user
  const userHealthScore = Math.min(100, Math.round(
    ((stats.currentStreak || 0) * 8) + 
    (Math.min((stats.totalMapsCreated || 0) * 1.5, 40)) + 
    (chatCount ? Math.min(chatCount * 1.5, 20) : 0) +
    (stats.lastActiveDate ? 15 : 0)
  ));


  const avgNodesPerMap = userMaps.length > 0 
    ? (userMaps.reduce((acc, m) => acc + (m.nodeCount || 0), 0) / userMaps.length).toFixed(1)
    : '0';
  
  const currentTotalNodes = userMaps.length > 0
    ? userMaps.reduce((acc, m) => acc + (m.nodeCount || 0), 0)
    : 0;

  return (
    <UserDetailDialogShell onClose={onClose}>
      <UserDetailHeader
        user={user}
        rank={rank}
        healthScore={userHealthScore}
        copiedId={copiedId}
        showDeleteConfirm={showDeleteConfirm}
        isDeleting={isDeleting}
        onCopyId={handleCopyId}
        onDeleteUser={handleDeleteUser}
        onRequestDelete={() => setShowDeleteConfirm(true)}
        onCancelDelete={() => setShowDeleteConfirm(false)}
        onClose={onClose}
      />
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8 relative z-10">
          {/* Stats Grid - Premium Refinement */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              { label: 'Total Created', value: stats.totalMapsCreated || 0, icon: MapIcon, color: 'violet', trend: '+12%' },
              { label: 'Active Maps', value: userMaps.length, icon: Brain, color: 'indigo', isLoading: isLoadingMaps },
              { label: 'Avg Complexity', value: avgNodesPerMap, icon: Layers, color: 'blue', isLoading: isLoadingMaps },
              { label: 'Total Bubbles', value: currentTotalNodes, icon: Zap, color: 'emerald', isLoading: isLoadingMaps },
              { label: 'Images Created', value: stats.totalImagesGenerated || 0, icon: ImageIcon, color: 'pink' },
              { label: 'AI Chats', value: chatCount ?? '-', icon: BarChart3, color: 'yellow', isLoading: isLoadingMaps },
              { label: 'Daily Streak', value: `${stats.currentStreak || 0}d`, icon: Flame, color: 'orange' },
              { label: 'Time Spent', value: `${Math.floor((stats.totalStudyTimeMinutes || 0) / 60)}h`, icon: Clock, color: 'sky' },
              { label: 'Joined Date', value: userCreatedAt ? format(userCreatedAt, 'dd/MM/yy') : '-', icon: UserRound, color: 'violet' },
              { label: 'Last Active', value: stats.lastActiveDate 
                ? format(new Date(stats.lastActiveDate), 'dd MMM')
                : '-', icon: Globe, color: 'indigo' },
            ].map((stat, idx) => {
              const theme = getStatCardTheme(stat.color);
              return (
                <motion.div 
                  key={stat.label}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="relative overflow-hidden p-4 rounded-[1.75rem] bg-white/[0.03] border border-white/5 hover:border-white/20 transition-all group shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] hover:shadow-[0_10px_30px_rgba(0,0,0,0.4)]"
                >
                  <div className={`absolute top-0 right-0 w-20 h-20 ${theme.glow} rounded-full blur-2xl group-hover:bg-opacity-20 transition-all duration-500 pointer-events-none`} />
                  <div className="relative flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl ${theme.bg} border ${theme.border} group-hover:scale-110 ${theme.bgHover} transition-all duration-500`}>
                          <stat.icon className={`h-4 w-4 ${theme.text}`} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500 group-hover:text-zinc-400 transition-colors">{stat.label}</p>
                      </div>
                    </div>
                    <div className="flex items-end justify-between gap-2">
                      {stat.isLoading ? (
                        <div className="h-6 w-16 bg-white/10 rounded-md animate-pulse" />
                      ) : (
                        <p className="text-2xl font-black text-white tracking-tighter leading-none group-hover:scale-[1.02] origin-left transition-transform">
                          {stat.value}
                        </p>
                      )}
                      {stat.trend && (
                        <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 mb-0.5">
                          {stat.trend}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Activity Insight */}
          {user.activity && Object.keys(user.activity).length > 0 && (
            <div className="relative overflow-hidden rounded-[2.5rem] bg-white/[0.02] border border-white/10 p-8 transition-all hover:border-white/20 hover:bg-white/[0.04] shadow-[inset_0_0_40px_rgba(255,255,255,0.01)] group/insight">
              <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/[0.03] rounded-full blur-[120px] pointer-events-none group-hover/insight:bg-violet-600/[0.06] transition-all duration-700" />
              <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-violet-500/10 rounded-xl border border-violet-500/20">
                    <Activity className="h-5 w-5 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white tracking-tighter">Daily Activity</h3>
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500 mt-0.5">Engagement metrics</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-2xl">
                  <button
                    onClick={() => setUserHeatmapMonth(new Date(userHeatmapMonth.getFullYear(), userHeatmapMonth.getMonth() - 1, 1))}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all group"
                  >
                    <ChevronLeft className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform" />
                  </button>
                  <div className="w-32 text-center">
                    <span className="text-xs font-black text-white block uppercase tracking-widest pb-0.5">
                      {format(userHeatmapMonth, 'MMMM')}
                    </span>
                    <span className="text-[10px] font-black text-zinc-600 uppercase tracking-tighter">{format(userHeatmapMonth, 'yyyy')}</span>
                  </div>
                  <button
                    onClick={() => setUserHeatmapMonth(new Date(userHeatmapMonth.getFullYear(), userHeatmapMonth.getMonth() + 1, 1))}
                    disabled={new Date(userHeatmapMonth.getFullYear(), userHeatmapMonth.getMonth() + 1, 1) > new Date()}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all group disabled:opacity-20"
                  >
                    <ChevronRight className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
              
              <div className="relative z-10">
                <TooltipProvider delayDuration={0}>
                  <div className="grid grid-cols-[repeat(31,minmax(0,1fr))] gap-2">
                    <UserActivityHeatmap 
                      userActivity={user.activity} 
                      userHeatmapMonth={userHeatmapMonth} 
                    />
                  </div>
                </TooltipProvider>
                
                <div className="flex items-center justify-end mt-6 gap-3">
                  <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mr-2">Intensity Spectrum:</span>
                  {['bg-zinc-800', 'bg-violet-900/60', 'bg-violet-700/70', 'bg-violet-500', 'bg-violet-400'].map((c, i) => (
                    <div key={i} className={`h-3 w-3 rounded-md ${c} shadow-sm border border-white/5`} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Achieving Milestones */}
          {user.unlockedAchievements && user.unlockedAchievements.length > 0 && (
            <div className="p-8 rounded-[2rem] bg-white/5 border border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <Trophy className="h-4 w-4 text-amber-400" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Unlocked Milestones ({user.unlockedAchievements.length})</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {user.unlockedAchievements.map((a: string) => (
                  <Badge key={a} className="px-4 py-2 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[10px] font-black text-amber-400 uppercase tracking-widest hover:bg-amber-500/10 transition-colors">
                    {a.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <UserMapsTable userMaps={userMaps} isLoading={isLoadingMaps} userId={user.id} />

          {/* Map Analytics Card */}
          {(isLoadingMaps || userMaps.length > 0) && (
            <div className="space-y-6 border border-violet-500/20 rounded-[2.5rem] p-8 bg-violet-500/[0.02] hover:bg-violet-500/[0.04] hover:border-violet-500/40 transition-all shadow-[inset_0_0_40px_rgba(139,92,246,0.02)] group/analytics">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-violet-500/20 to-indigo-500/20 rounded-2xl border border-violet-500/30 shadow-lg shadow-violet-500/10">
                    <BarChart3 className="h-6 w-6 text-violet-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tight">Mindmap Analytics</h2>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                      {isLoadingMaps ? (
                        <span className="inline-block h-3 w-32 bg-white/5 rounded animate-pulse mt-1" />
                      ) : analyticsView === 'current' 
                        ? `${userMaps.length} Current Maps`
                        : `${stats.totalMapsCreated || 0} Total Created`}
                    </p>
                  </div>
                </div>
                {!isLoadingMaps && (
                  <div className="flex items-center gap-4">
                    <div className="flex gap-1.5 p-1.5 bg-white/5 rounded-2xl border border-white/10">
                      <button
                        onClick={() => setAnalyticsView('current')}
                        className={`px-6 py-2.5 text-[10px] font-black rounded-[0.9rem] transition-all uppercase tracking-widest ${
                          analyticsView === 'current'
                            ? 'bg-violet-600 text-white shadow-xl shadow-violet-600/20 scale-105'
                            : 'text-zinc-500 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        Realtime
                      </button>
                      <button
                        onClick={() => setAnalyticsView('allTime')}
                        className={`px-6 py-2.5 text-[10px] font-black rounded-[0.9rem] transition-all uppercase tracking-widest ${
                          analyticsView === 'allTime'
                            ? 'bg-violet-600 text-white shadow-xl shadow-violet-600/20 scale-105'
                            : 'text-zinc-500 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        Aggregate
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {isLoadingMaps ? (
                <div className="space-y-6">
                  {/* Row 1: Mode & Depth */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Cognitive Modes Skeleton */}
                    <div className="relative overflow-hidden rounded-[2rem] bg-white/5 border border-white/10 p-8 shadow-xl animate-pulse">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="h-10 w-10 bg-white/5 rounded-xl" />
                        <div className="h-4 w-32 bg-white/5 rounded-md" />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="rounded-[1.5rem] bg-white/[0.03] border border-white/5 p-5">
                            <div className="h-3 w-16 bg-white/5 rounded-md mb-3" />
                            <div className="h-8 w-12 bg-white/10 rounded-md" />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Structural Depth Skeleton */}
                    <div className="relative overflow-hidden rounded-[2rem] bg-white/5 border border-white/10 p-8 shadow-xl animate-pulse">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="h-10 w-10 bg-white/5 rounded-xl" />
                        <div className="h-4 w-32 bg-white/5 rounded-md" />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="rounded-[1.5rem] bg-white/[0.03] border border-white/5 p-5">
                            <div className="h-3 w-16 bg-white/5 rounded-md mb-3" />
                            <div className="h-8 w-12 bg-white/10 rounded-md" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Source Breakdown Skeleton */}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900/60 to-zinc-900/40 border border-white/5 p-6 animate-pulse">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="h-8 w-8 bg-white/5 rounded-xl" />
                      <div className="space-y-1.5">
                        <div className="h-3.5 w-36 bg-white/10 rounded-md" />
                        <div className="h-2 w-28 bg-white/5 rounded-md" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="rounded-[1.25rem] bg-white/[0.03] border border-white/5 p-4">
                          <div className="h-6 w-6 bg-white/5 rounded-xl mb-3" />
                          <div className="h-3 w-12 bg-white/5 rounded-md mb-2" />
                          <div className="h-6 w-10 bg-white/10 rounded-md" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : analyticsView === 'current' ? (
                <UserMapAnalytics userMaps={userMaps} />
              ) : (
                <AllTimeAnalytics stats={stats} />
              )}
            </div>
          )}
        </div>
    </UserDetailDialogShell>
  );
}
