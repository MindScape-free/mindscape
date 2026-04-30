'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { useAdminActivityLog } from '@/lib/admin-utils';
// firebase/firestore removed
import { format } from 'date-fns';
import { formatDistanceToNow } from 'date-fns';
import { 
  Avatar, 
  AvatarFallback, 
  AvatarImage 
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toDate } from '@/types/chat';
import { MindMapData } from '@/types/mind-map';
import {
  Map as MapIcon,
  Clock,
  Activity,
  Eye,
  Trash2,
  X,
  Copy,
  Check,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  BarChart3,
  Brain,
  Globe,
  Youtube,
  Layers,
  Zap,
  Lock,
  Unlock,
  FileText,
  Trophy,
  TrendingUp,
  UserRound,
  Palette,
  Heart,
  ArrowUpRight,
  ArrowDownRight,
  Flame,
  Library,
  Bot,
  AlertTriangle,
} from 'lucide-react';

interface UserDetailDialogProps {
  user: any;
  isOpen: boolean;
  onClose: () => void;
  onUserDeleted?: () => void;
  rank?: number;
}

export default function UserDetailDialog({ user, isOpen, onClose, onUserDeleted, rank }: UserDetailDialogProps) {
  const { supabase, isAdmin, user: adminUser } = useAuth();
  const { logAdminActivity } = useAdminActivityLog();
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
  }, [supabase, user, adminUser, isAdmin, logAdminActivity, onClose, onUserDeleted]);

  const handleCopyId = useCallback(() => {
    if (!user?.id) return;
    navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  }, [user?.id]);

  useEffect(() => {
    if (isOpen && user && supabase) {
      const fetchData = async () => {
        setIsLoadingMaps(true);
        try {
          // 1. Get chat count using Supabase count
          const { count, error: countError } = await supabase
            .from('chat_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);
          
          if (!countError) setChatCount(count);

          // 2. Get mindmaps using Supabase select
          const { data: mapsData, error: mapsError } = await supabase
            .from('mindmaps')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false });
          
          if (mapsError) throw mapsError;

          setUserMaps((mapsData || []).map(m => ({
            ...m,
            // Map snake_case to camelCase for the UI
            createdAt: m.created_at,
            updatedAt: m.updated_at,
            nodeCount: m.node_count,
            publicViews: m.public_views,
            aiPersona: m.ai_persona,
            shortTitle: m.short_title || m.title || m.topic
          })));
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
  }, [isOpen, user, supabase]);

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

  const engagementRate = stats.totalMapsCreated && stats.totalStudyTimeMinutes 
    ? Math.min(100, Math.round((stats.totalMapsCreated / (stats.totalStudyTimeMinutes / 60 || 1)) * 12))
    : 0;

  const avgNodesPerMap = userMaps.length > 0 
    ? (userMaps.reduce((acc, m) => acc + (m.nodeCount || 0), 0) / userMaps.length).toFixed(1)
    : '0';
  
  const currentTotalNodes = userMaps.length > 0
    ? userMaps.reduce((acc, m) => acc + (m.nodeCount || 0), 0)
    : 0;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 lg:p-10"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative bg-[#09090b]/80 max-w-6xl w-full h-full max-h-[900px] rounded-[3.5rem] overflow-hidden text-white flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/10 backdrop-blur-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -ml-64 -mb-64 pointer-events-none" />

        {/* Header */}
        <div className="relative flex items-center justify-between p-6 border-b border-white/5 shrink-0 z-10">
          <div className="flex items-center gap-6">
            <div className="relative group/avatar">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-1.5 bg-gradient-to-br from-violet-500/30 via-transparent to-indigo-500/30 rounded-2xl opacity-50 blur-md" 
              />
              <Avatar className="h-16 w-16 rounded-xl border-2 border-white/10 relative z-10 shadow-2xl transition-transform duration-500 group-hover/avatar:scale-105">
                <AvatarImage src={user.photoURL} className="object-cover" />
                <AvatarFallback className="bg-zinc-900 text-lg font-black text-violet-400">
                  {(user.displayName || user.email?.split('@')[0] || '??').substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-zinc-950 flex items-center justify-center border-2 border-white/10 z-20">
                <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse" />
              </div>
            </div>
            
            <div>
              <div className="flex items-center gap-3 mb-1.5">
                <h2 className="text-2xl font-black text-white tracking-tighter">{user.displayName || user.email?.split('@')[0] || 'Explorer'}</h2>
                <div className="flex items-center gap-2">
                  {rank && (
                    <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                      Top #{rank}
                    </Badge>
                  )}
                  <Badge className="bg-white/5 border-white/10 text-zinc-500 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-[0.2em]">
                    Verified
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <p className="text-xs font-bold text-zinc-500 tracking-tight">{user.email}</p>
                <div className="w-1 h-1 rounded-full bg-white/10" />
                <div className="flex items-center gap-2 group/id">
                  <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-tighter bg-white/[0.03] px-1.5 py-0.5 rounded-md border border-white/5 group-hover/id:border-white/20 transition-colors">{user.id}</span>
                  <button onClick={handleCopyId} className="p-1 hover:bg-white/10 rounded-lg transition-all text-zinc-600 hover:text-white">
                    {copiedId ? <Check className="h-2.5 w-2.5 text-emerald-400" /> : <Copy className="h-2.5 w-2.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end mr-2">
              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2">Integrity Score</span>
              <div className="relative h-12 w-12">
                <svg className="h-12 w-12 -rotate-90">
                  <circle cx="24" cy="24" r="21" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/5" />
                  <motion.circle 
                    initial={{ strokeDashoffset: 132 }}
                    animate={{ strokeDashoffset: 132 * (1 - userHealthScore / 100) }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    cx="24" cy="24" r="21" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray="132" strokeLinecap="round" 
                    className={`${userHealthScore > 80 ? 'text-emerald-500' : userHealthScore > 50 ? 'text-amber-500' : 'text-red-500'}`} 
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] font-black tracking-tighter">{userHealthScore}</span>
                </div>
              </div>
            </div>

            <div className="h-8 w-px bg-white/5 mx-1" />

            {!showDeleteConfirm ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowDeleteConfirm(true)}
                className="p-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 transition-all shadow-xl shadow-red-500/5 group"
                title="Deactivate Subject"
              >
                <Trash2 className="h-6 w-6 group-hover:rotate-6 transition-transform" />
              </motion.button>
            ) : (
              <div className="flex items-center gap-3 bg-red-500/10 p-2 rounded-2xl border border-red-500/20 animate-in fade-in zoom-in-95">
                <button
                  onClick={handleDeleteUser}
                  disabled={isDeleting}
                  className="px-6 py-2.5 text-[10px] font-black bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all shadow-xl shadow-red-500/20 uppercase tracking-widest"
                >
                  {isDeleting ? 'Erasing...' : 'Confirm Wipe'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2.5 text-[10px] font-black bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all uppercase tracking-widest"
                >
                  Abort
                </button>
              </div>
            )}
            
            <motion.button
              whileHover={{ rotate: 90, scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-all shadow-2xl"
            >
              <X className="h-5 w-5" />
            </motion.button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 relative z-10">
          {/* Stats Grid - Premium Refinement */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              { label: 'Total Created', value: stats.totalMapsCreated || 0, icon: MapIcon, color: 'violet', trend: '+12%' },
              { label: 'Active Maps', value: userMaps.length, icon: Brain, color: 'indigo' },
              { label: 'Avg Complexity', value: avgNodesPerMap, icon: Layers, color: 'blue' },
              { label: 'Total Bubbles', value: currentTotalNodes, icon: Zap, color: 'emerald' },
              { label: 'Images Created', value: stats.totalImagesGenerated || 0, icon: ImageIcon, color: 'pink' },
              { label: 'AI Chats', value: chatCount ?? '-', icon: BarChart3, color: 'yellow' },
              { label: 'Daily Streak', value: `${stats.currentStreak || 0}d`, icon: Flame, color: 'orange' },
              { label: 'Time Spent', value: `${Math.floor((stats.totalStudyTimeMinutes || 0) / 60)}h`, icon: Clock, color: 'sky' },
              { label: 'Joined Date', value: userCreatedAt ? format(userCreatedAt, 'dd/MM/yy') : '-', icon: UserRound, color: 'violet' },
              { label: 'Last Active', value: stats.lastActiveDate 
                ? format(new Date(stats.lastActiveDate), 'dd MMM')
                : '-', icon: Globe, color: 'indigo' },
            ].map((stat, idx) => (
              <motion.div 
                key={stat.label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="relative overflow-hidden p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group"
              >
                <div className={`absolute top-0 right-0 w-16 h-16 bg-${stat.color}-500/5 rounded-full blur-xl group-hover:bg-${stat.color}-500/10 transition-colors pointer-events-none`} />
                <div className="relative flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg bg-${stat.color}-500/10 border border-${stat.color}-500/20 group-hover:scale-110 transition-transform duration-500`}>
                        <stat.icon className={`h-3.5 w-3.5 text-${stat.color}-400`} />
                      </div>
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">{stat.label}</p>
                    </div>
                    {stat.trend && <span className="text-[7px] font-black text-emerald-400 bg-emerald-500/5 px-1.5 py-0.5 rounded-md">{stat.trend}</span>}
                  </div>
                  <div>
                    <p className="text-2xl font-black text-white tracking-tighter leading-none">
                      {stat.value}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Activity Insight */}
          {user.activity && Object.keys(user.activity).length > 0 && (
            <div className="relative overflow-hidden rounded-3xl bg-white/5 border border-white/10 p-6 transition-all hover:border-white/20">
              <div className="absolute top-0 right-0 w-80 h-80 bg-violet-600/5 rounded-full blur-[100px] pointer-events-none" />
              <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-violet-500/10 rounded-xl border border-violet-500/20">
                    <Activity className="h-5 w-5 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white tracking-tighter">Neural Activity Heatmap</h3>
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
                    <ActivityHeatmap 
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

          <div className="relative overflow-hidden rounded-3xl bg-white/5 border border-white/10 p-6 transition-all hover:border-white/20">
            <div className="absolute top-0 left-0 w-80 h-80 bg-indigo-600/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                  <Library className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-tighter">Subject Library ({userMaps.length})</h3>
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500 mt-0.5">Mindmap index</p>
                </div>
              </div>
            </div>

            {isLoadingMaps ? (
              <div className="py-32 flex flex-col items-center justify-center gap-6 relative z-10">
                <div className="relative h-16 w-16">
                  <div className="absolute inset-0 border-4 border-violet-500/10 rounded-full" />
                  <div className="absolute inset-0 border-t-4 border-violet-500 rounded-full animate-spin shadow-[0_0_15px_rgba(139,92,246,0.3)]" />
                </div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em] animate-pulse">Establishing Cryptographic Sync...</p>
              </div>
            ) : userMaps.length > 0 ? (
              <div className="relative z-10">
                <div className="overflow-x-auto custom-scrollbar pb-4">
                  <table className="w-full border-separate border-spacing-y-3">
                    <thead>
                      <tr>
                        <th className="text-left text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 pb-2 pl-6">Topic / Signature</th>
                        <th className="text-center text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 pb-2">Sync Date</th>
                        <th className="text-center text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 pb-2">Nodes</th>
                        <th className="text-center text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 pb-2">Reach</th>
                        <th className="text-center text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 pb-2">Origin</th>
                        <th className="text-right text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 pb-2 pr-6">Access</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userMaps.map(m => {
                        return (
                          <motion.tr 
                            key={m.id} 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="group/row"
                          >
                            <td className="py-2.5 pl-4 bg-white/[0.02] rounded-l-2xl border-y border-l border-white/5 group-hover/row:bg-white/[0.05] transition-all duration-300">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 flex items-center justify-center border border-white/10 shadow-lg group-hover/row:scale-110 group-hover/row:rotate-3 transition-transform duration-500">
                                  <MapIcon className="h-4 w-4 text-violet-400" />
                                </div>
                                <div className="min-w-0">
                                  <span className="text-xs font-black text-white group-hover/row:text-violet-400 transition-colors truncate block max-w-[240px]">
                                    {m.shortTitle || m.topic || 'Untitled Knowledge'}
                                  </span>
                                  <span className="text-[7px] font-black text-zinc-600 uppercase tracking-tighter">
                                    SIG: {(m.id || '').substring((m.id || '').length - 8).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 text-center bg-white/[0.02] border-y border-white/5 group-hover/row:bg-white/[0.05] transition-colors">
                              <span className="text-[9px] font-black text-zinc-500 tracking-tighter uppercase">{m.createdAt ? format(toDate(m.createdAt), 'MMM dd, HH:mm') : '-'}</span>
                            </td>
                            <td className="py-2.5 text-center bg-white/[0.02] border-y border-white/5 group-hover/row:bg-white/[0.05] transition-colors">
                              <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[8px] font-black px-2 py-0.5 rounded-full">{m.nodeCount || 0}</Badge>
                            </td>
                            <td className="py-2.5 text-center bg-white/[0.02] border-y border-white/5 group-hover/row:bg-white/[0.05] transition-colors">
                              <div className="flex items-center justify-center gap-1.5">
                                <Eye className="h-3 w-3 text-emerald-500" />
                                <span className="text-[9px] font-black text-emerald-400">{m.publicViews || 0}</span>
                              </div>
                            </td>
                            <td className="py-2.5 text-center bg-white/[0.02] border-y border-white/5 group-hover/row:bg-white/[0.05] transition-colors">
                              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/5 text-[8px] font-black uppercase tracking-tighter text-zinc-500">
                                {m.sourceFileType === 'youtube' ? '🎥' : m.sourceFileType === 'pdf' ? '📄' : '📝'} {m.sourceFileType || 'Text'}
                              </div>
                            </td>
                            <td className="py-2.5 text-right pr-4 bg-white/[0.02] rounded-r-2xl border-y border-r border-white/5 group-hover/row:bg-white/[0.05] transition-colors">
                              <motion.button 
                                whileHover={{ scale: 1.1, x: -3 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => window.open(`/canvas?mapId=${m.id}&ownerId=${user.id}`, '_blank')}
                                className="p-2.5 rounded-lg bg-white/5 hover:bg-violet-600 text-zinc-400 hover:text-white border border-white/10 transition-all shadow-xl"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </motion.button>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="py-24 flex flex-col items-center justify-center text-zinc-700 relative z-10 border-2 border-dashed border-white/5 rounded-[2.5rem]">
                <div className="p-6 rounded-[2rem] bg-white/5 mb-6 opacity-30">
                  <Library className="h-12 w-12" />
                </div>
                <p className="text-xs font-black uppercase tracking-[0.4em] italic mb-2">Subject Index Dormant</p>
                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest text-center max-w-xs">No mindmap signatures detected for this biological entity.</p>
              </div>
            )}
          </div>

          {/* Map Analytics */}
          {userMaps.length > 0 && (
            <div className="space-y-6 border border-violet-500/30 rounded-2xl p-6 bg-violet-500/5">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-violet-500/20 to-indigo-500/20 rounded-2xl border border-violet-500/30 shadow-lg shadow-violet-500/10">
                    <BarChart3 className="h-6 w-6 text-violet-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tight">Mindmap Analytics</h2>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                      Viewing: {analyticsView === 'current' 
                        ? `${userMaps.length} Current Maps`
                        : `${stats.totalMapsCreated || 0} Total Created`}
                    </p>
                  </div>
                </div>
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
              </div>
              <UserMapAnalytics userMaps={userMaps} />
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function ActivityHeatmap({ userActivity, userHeatmapMonth }: { userActivity: any; userHeatmapMonth: Date }) {
  const year = userHeatmapMonth.getFullYear();
  const month = userHeatmapMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const days: { date: string; data: any; dateObj: Date }[] = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    const dateStr = format(d, 'yyyy-MM-dd');
    days.push({ date: dateStr, data: userActivity?.[dateStr], dateObj: d });
  }

  return (
    <>
      {days.map(({ date, data, dateObj }) => {
        const totalActivity = (data?.mapsCreated || 0) + (data?.imagesGenerated || 0) + (data?.studyTimeMinutes || 0);
        const intensity = totalActivity === 0 ? 'bg-zinc-800' : totalActivity <= 2 ? 'bg-violet-900/60' : totalActivity <= 5 ? 'bg-violet-700/70' : totalActivity <= 10 ? 'bg-violet-500' : 'bg-violet-400';
        const isToday = format(today, 'yyyy-MM-dd') === date;
        const isFuture = dateObj > today;

        return (
          <Tooltip key={date}>
            <TooltipTrigger asChild>
              <div className={`aspect-square flex items-center justify-center rounded-sm ${intensity} hover:ring-2 hover:ring-violet-400/50 transition-all cursor-default ${isToday ? 'ring-2 ring-white/30' : ''} ${isFuture ? 'opacity-30' : ''}`}>
                <span className="text-[7px] text-white/70 font-bold">{format(new Date(date), 'd')}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-zinc-900 border-zinc-700 text-[10px] font-bold p-3 min-w-[150px]">
              <p className="text-zinc-300 font-black mb-2 border-b border-zinc-700 pb-1">{format(new Date(date), 'EEEE, MMM d')}</p>
              <div className="space-y-1">
                <p className="text-blue-400 flex items-center gap-2"><MapIcon className="h-3 w-3" /> {data?.mapsCreated || 0} maps</p>
                <p className="text-pink-400 flex items-center gap-2"><ImageIcon className="h-3 w-3" /> {data?.imagesGenerated || 0} images</p>
                <p className="text-emerald-400 flex items-center gap-2"><Clock className="h-3 w-3" /> {data?.studyTimeMinutes || 0} min</p>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </>
  );
}

function UserMapAnalytics({ userMaps }: { userMaps: any[] }) {
  const total = userMaps.length || 1;
  
  const modeCounts = { single: 0, compare: 0, multi: 0 };
  const depthCounts = { low: 0, medium: 0, deep: 0, unspecified: 0 };
  const sourceCounts: Record<string, number> = {
    'text': 0, 'pdf': 0, 'youtube': 0, 'web': 0, 'unknown': 0
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

    if (resolvedDepth === 'low') depthCounts.low++;
    else if (resolvedDepth === 'medium') depthCounts.medium++;
    else if (resolvedDepth === 'deep') depthCounts.deep++;
    else depthCounts.low++;

    // Source Type detection
    let sourceType = m.sourceFileType || m.sourceType;
    if (sourceType === 'multi' || m.sourceFileContent?.includes('--- SOURCE:')) {
      sourceType = 'multi';
    } else {
      sourceType = sourceType || (m.sourceUrl ? 'website' : m.videoId ? 'youtube' : 'text');
    }
    sourceCounts[sourceType] = (sourceCounts[sourceType] || 0) + 1;

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
    <div className="space-y-6">
      {/* Row 1: Mode & Depth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Maps by Mode */}
        <div className="relative overflow-hidden rounded-[2rem] bg-white/5 border border-white/10 p-8 shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-violet-500/10 rounded-xl border border-violet-500/20">
                <MapIcon className="h-5 w-5 text-violet-400" />
              </div>
              <p className="text-sm font-black text-white uppercase tracking-widest">Cognitive Modes</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {( [
                { key: 'single', label: 'Monologue', value: modeCounts.single, color: 'violet' as const, icon: FileText },
                { key: 'compare', label: 'Dual-Synapse', value: modeCounts.compare, color: 'indigo' as const, icon: Copy },
                { key: 'multi', label: 'Networked', value: modeCounts.multi, color: 'blue' as const, icon: Layers },
              ] as const).map(({ key, label, value, color, icon: Icon }) => {
                const percentage = Math.round((value / total) * 100);
                return (
                  <div key={key} className="rounded-2xl bg-white/[0.03] border border-white/5 p-5 transition-all hover:bg-white/[0.06] group/item">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className={`h-4 w-4 text-${color}-400`} />
                      <span className="text-[10px] font-black uppercase tracking-tighter text-zinc-500">{label}</span>
                    </div>
                    <div className="flex items-end justify-between">
                      <p className="text-3xl font-black text-white tracking-tighter">{value}</p>
                      <span className={`text-[10px] font-black text-${color}-400`}>{percentage}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Maps by Depth */}
        <div className="relative overflow-hidden rounded-[2rem] bg-white/5 border border-white/10 p-8 shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                <Layers className="h-5 w-5 text-indigo-400" />
              </div>
              <p className="text-sm font-black text-white uppercase tracking-widest">Structural Depth</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {( [
                { key: 'low', label: 'Quick', value: depthCounts.low, color: 'emerald' as const, icon: Zap },
                { key: 'medium', label: 'Balanced', value: depthCounts.medium, color: 'yellow' as const, icon: Layers },
                { key: 'deep', label: 'Detailed', value: depthCounts.deep, color: 'orange' as const, icon: Layers },
              ] as const).map(({ key, label, value, color, icon: Icon }) => {
                const percentage = Math.round((value / total) * 100);
                return (
                  <div key={key} className={`rounded-xl bg-${color}-500/5 border border-${color}-500/15 p-4 transition-all hover:bg-${color}-500/10`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1.5 bg-${color}-500/10 rounded-lg`}>
                        <Icon className={`h-3.5 w-3.5 text-${color}-400`} />
                      </div>
                      <span className="text-[8px] font-bold uppercase tracking-wider text-${color}-400/70">{label}</span>
                    </div>
                    <div className="flex items-end justify-between">
                      <p className="text-2xl font-black text-white tracking-tight">{value}</p>
                      <span className={`px-1.5 py-0.5 rounded-lg bg-${color}-500/10 text-[9px] font-black text-${color}-400`}>{percentage}%</span>
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
              { type: 'youtube', icon: Youtube, color: 'yellow' as const, label: 'YouTube' },
              { type: 'multi', icon: Library, color: 'orange' as const, label: 'Multi' }
            ].map(({ type, icon: Icon, color, label }) => {
              const count = sourceCounts[type] || 0;
              const percentage = Math.round((count / total) * 100);
              return (
                <div key={type} className={`rounded-xl bg-${color}-500/5 border border-${color}-500/15 p-4 transition-all hover:bg-${color}-500/10 ${count === 0 ? 'opacity-20' : ''}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 bg-${color}-500/10 rounded-lg`}>
                      <Icon className={`h-3.5 w-3.5 text-${color}-400`} />
                    </div>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-${color}-400/70">{label}</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <p className="text-2xl font-black text-white tracking-tight">{count}</p>
                    <span className={`px-1.5 py-0.5 rounded-lg bg-${color}-500/10 text-[9px] font-bold text-${color}-400`}>{percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 3: Sub-Maps & Public vs Private */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sub-Maps Stats */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900/60 to-zinc-900/40 border border-white/5 p-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-green-500/10 rounded-xl border border-green-500/20">
                <Layers className="h-4 w-4 text-green-400" />
              </div>
              <p className="text-sm font-bold text-white">Sub-Maps Statistics</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Sub-Maps', value: totalSubMaps, color: 'violet' as const, icon: Layers },
                { label: 'Parents', value: parentMapIds.size, color: 'indigo' as const, icon: MapIcon },
                { label: 'Avg/Parent', value: parentMapIds.size > 0 ? (totalSubMaps / parentMapIds.size).toFixed(1) : '0', color: 'blue' as const, icon: TrendingUp },
              ].map(({ label, value, color, icon: Icon }) => (
                <div key={label} className={`rounded-xl bg-${color}-500/5 border border-${color}-500/15 p-4 transition-all hover:bg-${color}-500/10`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 bg-${color}-500/10 rounded-lg`}>
                      <Icon className={`h-3.5 w-3.5 text-${color}-400`} />
                    </div>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-${color}-400/70">{label}</span>
                  </div>
                  <p className="text-2xl font-black text-white tracking-tight">{value}</p>
                </div>
              ))}
            </div>
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
              <p className="text-sm font-bold text-white">Public vs Private</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Public', value: publicPrivate.public, color: 'emerald' as const, icon: Unlock },
                { label: 'Private', value: publicPrivate.private, color: 'yellow' as const, icon: Lock },
                { label: 'Public Rate', value: total > 0 ? Math.round((publicPrivate.public / total) * 100) : 0, color: 'orange' as const, icon: TrendingUp, isPercent: true },
              ].map(({ label, value, color, icon: Icon, isPercent }) => (
                <div key={label} className={`rounded-xl bg-${color}-500/5 border border-${color}-500/15 p-4 transition-all hover:bg-${color}-500/10`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 bg-${color}-500/10 rounded-lg`}>
                      <Icon className={`h-3.5 w-3.5 text-${color}-400`} />
                    </div>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-${color}-400/70">{label}</span>
                  </div>
                  <p className="text-2xl font-black text-white tracking-tight">{isPercent ? `${value}%` : value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Persona */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900/60 to-zinc-900/40 border border-white/5 p-6">
        <div className="absolute top-0 right-0 w-40 h-40 bg-violet-500/5 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-violet-500/10 rounded-xl border border-violet-500/20">
              <Brain className="h-4 w-4 text-violet-400" />
            </div>
            <p className="text-sm font-bold text-white">Maps by Persona</p>
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
              return (
                <div key={key} className={`rounded-xl bg-${color}-500/5 border border-${color}-500/15 p-4 transition-all hover:bg-${color}-500/10`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 bg-${color}-500/10 rounded-lg`}>
                      <Icon className={`h-3.5 w-3.5 text-${color}-400`} />
                    </div>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-${color}-400/70">{label}</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <p className="text-2xl font-black text-white tracking-tight">{count}</p>
                    <span className={`px-1.5 py-0.5 rounded-lg bg-${color}-500/10 text-[9px] font-bold text-${color}-400`}>{percentage}%</span>
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

function AllTimeAnalytics({ stats }: AllTimeAnalyticsProps) {
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
              ] as const).map(({ key, label, value, color, icon: Icon }) => (
                <div key={key} className={`rounded-xl bg-${color}-500/5 border border-${color}-500/15 p-4 transition-all hover:bg-${color}-500/10`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 bg-${color}-500/10 rounded-lg`}>
                      <Icon className={`h-3.5 w-3.5 text-${color}-400`} />
                    </div>
                    <span className={`text-[8px] font-bold uppercase tracking-wider text-${color}-400/70`}>{label}</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <p className="text-2xl font-black text-white tracking-tight">{value}</p>
                    <span className={`px-1.5 py-0.5 rounded-lg bg-${color}-500/10 text-[9px] font-bold text-${color}-400`}>{getPercentage(value)}%</span>
                  </div>
                </div>
              ))}
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
              ] as const).map(({ key, label, value, color, icon: Icon }) => (
                <div key={key} className={`rounded-xl bg-${color}-500/5 border border-${color}-500/15 p-4 transition-all hover:bg-${color}-500/10`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 bg-${color}-500/10 rounded-lg`}>
                      <Icon className={`h-3.5 w-3.5 text-${color}-400`} />
                    </div>
                    <span className={`text-[8px] font-bold uppercase tracking-wider text-${color}-400/70`}>{label}</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <p className="text-2xl font-black text-white tracking-tight">{value}</p>
                    <span className={`px-1.5 py-0.5 rounded-lg bg-${color}-500/10 text-[9px] font-black text-${color}-400`}>{getPercentage(value)}%</span>
                  </div>
                </div>
              ))}
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
              { type: 'youtube', icon: Youtube, color: 'yellow' as const, label: 'YouTube' },
              { type: 'multi', icon: Library, color: 'orange' as const, label: 'Multi' }
            ].map(({ type, icon: Icon, color, label }) => {
              const count = sourceCounts[type] || 0;
              return (
                <div key={type} className={`rounded-xl bg-${color}-500/5 border border-${color}-500/15 p-4 transition-all hover:bg-${color}-500/10 ${count === 0 ? 'opacity-20' : ''}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 bg-${color}-500/10 rounded-lg`}>
                      <Icon className={`h-3.5 w-3.5 text-${color}-400`} />
                    </div>
                    <span className={`text-[8px] font-bold uppercase tracking-wider text-${color}-400/70`}>{label}</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <p className="text-2xl font-black text-white tracking-tight">{count}</p>
                    <span className={`px-1.5 py-0.5 rounded-lg bg-${color}-500/10 text-[9px] font-bold text-${color}-400`}>{getPercentage(count)}%</span>
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
                return (
                  <div key={key} className={`rounded-xl bg-${color}-500/5 border border-${color}-500/15 p-4 transition-all hover:bg-${color}-500/10`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[8px] font-bold uppercase tracking-wider text-${color}-400/70`}>{label}</span>
                      <span className={`px-1.5 py-0.5 rounded-lg bg-${color}-500/10 text-[9px] font-bold text-${color}-400`}>{getPercentage(count)}%</span>
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
