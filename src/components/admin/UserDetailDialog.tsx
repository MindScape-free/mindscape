'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFirebase } from '@/firebase';
import { useAdminActivityLog } from '@/lib/admin-utils';
import { doc, deleteDoc, collection, getCountFromServer, getDocs, query, orderBy } from 'firebase/firestore';
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
import {
  Map as MapIcon,
  Clock,
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
  const { firestore, user: adminUser } = useFirebase();
  const { logAdminActivity } = useAdminActivityLog();
  const [chatCount, setChatCount] = useState<number | null>(null);
  const [userMaps, setUserMaps] = useState<any[]>([]);
  const [isLoadingMaps, setIsLoadingMaps] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userHeatmapMonth, setUserHeatmapMonth] = useState(new Date());
  const [analyticsView, setAnalyticsView] = useState<'current' | 'allTime'>('current');

  const handleDeleteUser = useCallback(async () => {
    if (!firestore || !user) return;
    setIsDeleting(true);
    try {
      const userEmail = user.email || user.id;
      await deleteDoc(doc(firestore, 'users', user.id));
      await logAdminActivity({
        type: 'USER_DELETED',
        targetId: user.id,
        targetType: 'user',
        details: `User deleted: ${userEmail}`,
        performedBy: adminUser?.uid,
      });
      onUserDeleted?.();
      onClose();
    } catch (error) {
      console.error('Error deleting user:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [firestore, user, adminUser, logAdminActivity, onClose, onUserDeleted]);

  const handleCopyId = useCallback(() => {
    if (!user?.id) return;
    navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  }, [user?.id]);

  useEffect(() => {
    if (isOpen && user && firestore) {
      const fetchData = async () => {
        setIsLoadingMaps(true);
        try {
          const chatsSnap = await getCountFromServer(collection(firestore, `users/${user.id}/chatSessions`));
          setChatCount(chatsSnap.data().count);

          const mapsRef = collection(firestore, `users/${user.id}/mindmaps`);
          const q = query(mapsRef, orderBy('updatedAt', 'desc'));
          const snapshot = await getDocs(q);
          setUserMaps(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
  }, [isOpen, user, firestore]);

  if (!user) return null;

  const stats = user.statistics || {};
  const userCreatedAt = (() => {
    if (!user.createdAt) return null;
    try {
      const d = user.createdAt.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
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
    <div 
      className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onClick={onClose}
    >
      <div 
        className="absolute top-20 left-1/2 -translate-x-1/2 bg-zinc-900 max-w-6xl w-full h-[calc(100vh-96px)] rounded-[2rem] overflow-hidden text-white flex flex-col shadow-2xl border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative flex items-center justify-between p-6 border-b border-white/5 shrink-0 bg-white/5 backdrop-blur-md">

          <div className="flex items-center gap-5">
            <div className="relative group/avatar">
              <div className="absolute -inset-1.5 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-[1.2rem] opacity-20 group-hover:opacity-40 transition-opacity blur-sm" />
              <Avatar className="h-16 w-16 rounded-[1.1rem] border border-white/10 relative z-10 shadow-2xl">
                <AvatarImage src={user.photoURL} />
                <AvatarFallback className="bg-zinc-900 text-lg font-black text-violet-400">
                  {(user.displayName || user.email?.split('@')[0] || '??').substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-black text-white tracking-tighter">{user.displayName || user.email?.split('@')[0] || 'User'}</h2>
                <div className="flex items-center gap-2">
                  {rank && (
                    <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-black px-2 py-0.5">
                      RANK #{rank}
                    </Badge>
                  )}
                  {(() => {
                    const now = new Date();
                    const createdAt = user.createdAt?.toDate?.() || (user.createdAt ? new Date(user.createdAt) : null);
                    const createdHoursAgo = createdAt ? Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)) : null;
                    const lastActive = user.statistics?.lastActiveDate;
                    const lastActiveDate = lastActive ? new Date(lastActive) : null;
                    const hoursSinceActive = lastActiveDate ? Math.floor((now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60)) : null;
                    
                    if (createdHoursAgo !== null && createdHoursAgo <= 48) {
                      return (
                        <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-black px-2 py-0.5 uppercase tracking-widest">
                          New
                        </Badge>
                      );
                    }
                    if (hoursSinceActive !== null && hoursSinceActive <= 48) {
                      return (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black px-2 py-0.5 uppercase tracking-widest">
                          Active
                        </Badge>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-xs font-bold text-zinc-500">{user.email}</p>
                <div className="w-1 h-1 rounded-full bg-zinc-800" />
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
                  <span className="text-[10px] font-mono text-zinc-400 truncate max-w-[120px]">{user.id}</span>
                  <button onClick={handleCopyId} className="shrink-0 p-0.5 hover:bg-white/10 rounded transition-colors" title="Copy ID">
                    {copiedId ? <Check className="h-2.5 w-2.5 text-emerald-400" /> : <Copy className="h-2.5 w-2.5 text-zinc-500" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end mr-2">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Health Score</span>
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12">
                  <svg className="h-12 w-12 -rotate-90">
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="transparent"
                      className="text-white/5"
                    />
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 20}
                      strokeDashoffset={2 * Math.PI * 20 * (1 - userHealthScore / 100)}
                      strokeLinecap="round"
                      className={`${userHealthScore > 80 ? 'text-emerald-500' : userHealthScore > 50 ? 'text-amber-500' : 'text-red-500'} transition-all duration-1000 ease-out`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-black">{userHealthScore}</span>
                  </div>
                </div>
                <div className="h-8 w-px bg-white/10" />
              </div>
            </div>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-3 rounded-xl bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 text-red-400 transition-all hover:scale-105 active:scale-95"
                title="Delete User"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-red-500/10 p-1.5 rounded-xl border border-red-500/20 animate-in fade-in zoom-in-95">
                <button
                  onClick={handleDeleteUser}
                  disabled={isDeleting}
                  className="px-4 py-2 text-[10px] font-black bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all shadow-lg shadow-red-500/20"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Permanently'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-[10px] font-black bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all"
                >
                  Cancel
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-400 transition-all group"
            >
              <X className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          {/* Stats Grid - High Fidelity Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Total Created', value: stats.totalMapsCreated || 0, icon: MapIcon, color: 'violet', tooltip: 'All-time total including deleted' },
              { label: 'Current Maps', value: userMaps.length, icon: MapIcon, color: 'indigo', tooltip: 'Maps currently in system' },
              { label: 'Avg Nodes', value: avgNodesPerMap, icon: Layers, color: 'blue', tooltip: 'Average nodes per current map' },
              { label: 'Total Nodes', value: currentTotalNodes, icon: Layers, color: 'cyan', tooltip: 'Total nodes in current maps' },
              { label: 'Images', value: stats.totalImagesGenerated || 0, icon: ImageIcon, color: 'emerald' },
              { label: 'Chats', value: chatCount ?? '-', icon: BarChart3, color: 'yellow' },
              { label: 'Streak', value: `${stats.currentStreak || 0}d`, icon: Zap, color: 'orange' },
              { label: 'Study Time', value: `${Math.floor((stats.totalStudyTimeMinutes || 0) / 60)}h ${(stats.totalStudyTimeMinutes || 0) % 60}m`, icon: Clock, color: 'pink' },
              { label: 'Joined', value: userCreatedAt ? format(userCreatedAt, 'dd/MM/yy') : '-', icon: UserRound, color: 'indigo' },
              { label: 'Last Active', value: stats.lastActiveDate 
                ? (stats.lastActiveDate.includes('T') 
                    ? format(new Date(stats.lastActiveDate), 'dd/MM HH:mm')
                    : format(new Date(stats.lastActiveDate + 'T12:00:00'), 'dd/MM/yy'))
                : '-', icon: Globe, color: 'violet' },
            ].map((stat, idx) => (
              <div 
                key={stat.label} 
                className="relative overflow-hidden p-5 rounded-3xl bg-zinc-900/40 border border-white/5 transition-all duration-300 hover:border-white/10 group"
              >
                <div className={`absolute top-0 right-0 w-20 h-20 bg-${stat.color}-500/5 rounded-full blur-2xl group-hover:bg-${stat.color}-500/10 transition-colors`} />
                <div className="relative flex items-center gap-4">
                  <div className={`p-3 rounded-2xl bg-${stat.color}-500/10 border border-${stat.color}-500/20 transition-transform group-hover:scale-110 duration-500`}>
                    <stat.icon className={`h-4 w-4 text-${stat.color}-400`} />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-white tracking-tighter leading-none mb-1">
                      {stat.value}
                    </p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{stat.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Activity Timeline */}
          {user.activity && Object.keys(user.activity).length > 0 && (
            <div className="relative overflow-hidden rounded-3xl bg-zinc-900/40 border border-white/5 p-8 transition-all hover:border-white/10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 rounded-full blur-[100px] pointer-events-none" />
              <div className="flex items-center justify-between mb-6 relative z-10">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400 mb-1">Activity Insight</p>
                  <h3 className="text-lg font-black text-white tracking-tighter">Engagement Heatmap</h3>
                </div>
                <div className="flex items-center gap-3 bg-white/5 p-1.5 rounded-2xl border border-white/5">
                  <button
                    onClick={() => setUserHeatmapMonth(new Date(userHeatmapMonth.getFullYear(), userHeatmapMonth.getMonth() - 1, 1))}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="px-4 text-center">
                    <span className="text-xs font-black text-white block uppercase tracking-wider">
                      {format(userHeatmapMonth, 'MMMM')}
                    </span>
                    <span className="text-[9px] font-bold text-zinc-500">{format(userHeatmapMonth, 'yyyy')}</span>
                  </div>
                  <button
                    onClick={() => setUserHeatmapMonth(new Date(userHeatmapMonth.getFullYear(), userHeatmapMonth.getMonth() + 1, 1))}
                    disabled={new Date(userHeatmapMonth.getFullYear(), userHeatmapMonth.getMonth() + 1, 1) > new Date()}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all disabled:opacity-30"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500 font-bold">Activity level:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-zinc-600 font-bold mr-1">Low</span>
                      {['bg-zinc-800', 'bg-violet-900/60', 'bg-violet-700/70', 'bg-violet-500', 'bg-violet-400'].map((c, i) => (
                        <div key={i} className={`h-2.5 w-2.5 rounded-[3px] ${c} shadow-sm`} />
                      ))}
                      <span className="text-[9px] text-zinc-600 font-bold ml-1">High</span>
                    </div>
                  </div>
                </div>

                <TooltipProvider delayDuration={0}>
                  <div className="grid grid-cols-[repeat(31,minmax(0,1fr))] gap-1">
                    <ActivityHeatmap 
                      userActivity={user.activity} 
                      userHeatmapMonth={userHeatmapMonth} 
                    />
                  </div>
                </TooltipProvider>
              </div>
            </div>
          )}

          {/* Achievements */}
          {user.unlockedAchievements && user.unlockedAchievements.length > 0 && (
            <div className="rounded-2xl bg-zinc-900/40 border border-white/5 p-6">
              <p className="text-[10px] font-black uppercase text-zinc-500 mb-4">Achievements ({user.unlockedAchievements.length})</p>
              <div className="flex flex-wrap gap-2">
                {user.unlockedAchievements.map((a: string) => (
                  <span key={a} className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[9px] font-black text-amber-400 uppercase">
                    {a.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="relative overflow-hidden rounded-3xl bg-zinc-900/40 border border-white/5 p-8 transition-all hover:border-white/10">
            <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="flex items-center justify-between mb-8 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                  <Library className="h-6 w-6 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-tighter">Mindmap Index ({userMaps.length})</h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">MANAGE AND ACCESS YOUR MAP LIBRARY</p>
                </div>
              </div>
            </div>

            {isLoadingMaps ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4 relative z-10">
                <div className="relative">
                  <div className="h-12 w-12 border-2 border-violet-500/20 rounded-full" />
                  <div className="absolute inset-0 h-12 w-12 border-t-2 border-violet-500 rounded-full animate-spin" />
                </div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest animate-pulse">Synchronizing Data...</p>
              </div>
            ) : userMaps.length > 0 ? (
              <div className="overflow-x-auto relative z-10 custom-scrollbar">
                <table className="w-full border-separate border-spacing-y-2">
                  <thead>
                    <tr>
                      <th className="text-left text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 pb-4 pl-4">CONCEPT TITLE</th>
                      <th className="text-center text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 pb-4">CREATED</th>
                      <th className="text-center text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 pb-4">NODES</th>
                      <th className="text-center text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 pb-4">VIEWS</th>
                      <th className="text-center text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 pb-4">SOURCE</th>
                      <th className="text-center text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 pb-4">MODE</th>
                      <th className="text-center text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 pb-4">DEPTH</th>
                      <th className="text-center text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 pb-4">PERSONA</th>
                      <th className="text-right text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 pb-4 pr-4">ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userMaps.map(m => {
                      const depthConfig = m.depth === 'deep' || (!m.depth || m.depth === 'auto' ? (m.nodeCount || 0) > 75 : false)
                        ? { color: 'indigo', label: 'DETAILED' }
                        : (m.depth === 'medium' || (!m.depth || m.depth === 'auto' ? (m.nodeCount || 0) > 35 : false))
                          ? { color: 'blue', label: 'BALANCED' }
                          : { color: 'violet', label: 'QUICK' };

                      return (
                        <tr key={m.id} className="group/row">
                          <td className="py-3 pl-4 bg-white/5 rounded-l-2xl border-y border-l border-white/5 group-hover/row:bg-white/[0.08] transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center border border-violet-500/20 shadow-sm group-hover/row:scale-110 transition-transform">
                                <MapIcon className="h-5 w-5 text-violet-400" />
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-black text-white truncate block max-w-[220px]">
                                  {m.shortTitle || m.topic || m.title || 'System Generated Asset'}
                                </span>
                                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter">
                                  ID: {m.id.substring(0, 8)}...
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 text-center bg-white/5 border-y border-white/5 group-hover/row:bg-white/[0.08] transition-colors">
                            <span className="text-[10px] font-black text-white">{m.createdAt ? format(toDate(m.createdAt), 'dd/MM/yy HH:mm') : '-'}</span>
                          </td>
                          <td className="py-3 text-center bg-white/5 border-y border-white/5 group-hover/row:bg-white/[0.08] transition-colors">
                            <div className="flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 w-fit mx-auto border border-blue-500/20">
                              <span className="text-[10px] font-black text-blue-400">{m.nodeCount || 0}</span>
                            </div>
                          </td>
                          <td className="py-3 text-center bg-white/5 border-y border-white/5 group-hover/row:bg-white/[0.08] transition-colors">
                            <div className="flex items-center justify-center gap-1.5" title="Community Views">
                              <Eye className="h-3.5 w-3.5 text-emerald-500" />
                              <span className="text-[10px] font-black text-emerald-400">{m.publicViews || 0}</span>
                            </div>
                          </td>
                          <td className="py-3 text-center bg-white/5 border-y border-white/5 group-hover/row:bg-white/[0.08] transition-colors">
                            {(() => {
                                const st = m.sourceFileType || m.sourceType;
                                const isMulti = st === 'multi';
                                const icon = st === 'youtube' || m.videoId ? '🎥' : st === 'pdf' ? '📄' : st === 'image' ? '🖼️' : st === 'website' || m.sourceUrl ? '🌐' : isMulti ? '📦' : '📝';
                                const color = st === 'youtube' || m.videoId ? 'text-red-400 bg-red-500/10 border-red-500/20' : st === 'pdf' ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' : st === 'image' ? 'text-pink-400 bg-pink-500/10 border-pink-500/20' : st === 'website' || m.sourceUrl ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : isMulti ? 'text-violet-400 bg-violet-500/10 border-violet-500/20' : 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
                                const label = st === 'youtube' || m.videoId ? 'Video' : st === 'pdf' ? 'PDF' : st === 'image' ? 'Image' : st === 'website' || m.sourceUrl ? 'Web' : isMulti ? 'Multi' : 'Text';
                                return (
                                    <div
                                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[8px] font-black uppercase tracking-tighter cursor-help ${color}`}
                                        title={label}
                                    >
                                        <span>{icon}</span>
                                        <span>{label}</span>
                                    </div>
                                );
                            })()}
                          </td>
                          <td className="py-3 text-center bg-white/5 border-y border-white/5 group-hover/row:bg-white/[0.08] transition-colors">
                            <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[8px] font-black uppercase px-2 py-0.5">
                              {m.mode || 'SINGLE'}
                            </Badge>
                          </td>
                          <td className="py-3 text-center bg-white/5 border-y border-white/5 group-hover/row:bg-white/[0.08] transition-colors">
                            <Badge className={`bg-${depthConfig.color}-500/10 text-${depthConfig.color}-400 border border-${depthConfig.color}-500/20 text-[8px] font-black uppercase px-2 py-0.5`}>
                              {depthConfig.label}
                            </Badge>
                          </td>
                          <td className="py-3 text-center bg-white/5 border-y border-white/5 group-hover/row:bg-white/[0.08] transition-colors">
                            <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-black uppercase px-2 py-0.5">
                              {m.aiPersona || 'TEACHER'}
                            </Badge>
                          </td>
                          <td className="py-3 text-right pr-4 bg-white/5 rounded-r-2xl border-y border-r border-white/5 group-hover/row:bg-white/[0.08] transition-colors">
                            <button 
                              onClick={() => window.open(`/canvas?mapId=${m.id}&ownerId=${user.id}`, '_blank')}
                              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-500 hover:text-white border border-white/5 transition-all hover:scale-110 active:scale-95"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-zinc-600 relative z-10">
                <div className="p-4 rounded-full bg-zinc-800/30 mb-3 grayscale opacity-30">
                  <Library className="h-8 w-8" />
                </div>
                <p className="text-xs font-black uppercase tracking-widest italic">Inventory Empty</p>
              </div>
            )}
          </div>

          {/* Map Analytics */}
          {userMaps.length > 0 && (
            <div className="space-y-6 border border-violet-500/30 rounded-2xl p-6 bg-violet-500/5">
              {/* Premium Header with Overview Stats & Toggle */}
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
                  <div className="flex gap-1 p-1 bg-zinc-800/50 rounded-xl border border-white/10">
                    <button
                      onClick={() => setAnalyticsView('current')}
                      className={`px-5 py-2.5 text-xs font-bold rounded-lg transition-all ${
                        analyticsView === 'current'
                          ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/20'
                          : 'text-zinc-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      Current
                    </button>
                    <button
                      onClick={() => setAnalyticsView('allTime')}
                      className={`px-5 py-2.5 text-xs font-bold rounded-lg transition-all ${
                        analyticsView === 'allTime'
                          ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/20'
                          : 'text-zinc-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      All Time
                    </button>
                  </div>
                  
                  {rank && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl border border-amber-500/20">
                      <Trophy className="h-4 w-4 text-amber-400" />
                      <span className="text-lg font-black text-amber-400">#{rank}</span>
                    </div>
                  )}
                </div>
              </div>



              {analyticsView === 'current' ? (
                <UserMapAnalytics userMaps={userMaps} />
              ) : (
                <AllTimeAnalytics stats={stats} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
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
    'text': 0,
    'website': 0,
    'image': 0,
    'youtube': 0,
    'pdf': 0,
    'multi': 0
  };
  const personaCounts: Record<string, number> = {
    Teacher: 0,
    Concise: 0,
    Creative: 0,
    Sage: 0,
  };
  let totalSubMaps = 0;
  const parentMapIds = new Set<string>();
  const publicPrivate = { public: 0, private: 0 };

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
            <div className="grid grid-cols-3 gap-3">
              {( [
                { key: 'single', label: 'Single', value: modeCounts.single, color: 'violet' as const, icon: FileText },
                { key: 'compare', label: 'Compare', value: modeCounts.compare, color: 'indigo' as const, icon: Copy },
                { key: 'multi', label: 'Multi', value: modeCounts.multi, color: 'blue' as const, icon: Layers },
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
                      <span className={`px-1.5 py-0.5 rounded-lg bg-${color}-500/10 text-[9px] font-bold text-${color}-400`}>{percentage}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
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
            <div className="grid grid-cols-3 gap-3">
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
