'use client';

import { useEffect, useState, useCallback, useMemo, lazy, Suspense, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { 
  Users, 
  ShieldAlert, 
  Loader2,
  Brain,
  RefreshCw,
  MessageSquare, 
  Activity,
  LogOut,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from 'framer-motion';

import { formatDistanceToNow, format } from 'date-fns';
import { AdminStats } from '@/types/chat';
import { useAdminActivityLog, AdminActivityLogEntry } from '@/lib/admin-utils';
import { AdminPageSkeleton } from '@/components/admin/AdminSkeletons';
import { AdminTab, DashboardMetrics } from '@/types/admin';
import { useAdminDashboard } from '@/hooks/use-admin-dashboard';
import { globalListenerManager } from '@/lib/listener-manager';
import { normalizeTimestamp, sortByTimestamp } from '@/lib/timestamp-utils';

// Lazy Loaded Tab Components
const DashboardTab = lazy(() => import('@/components/admin/DashboardTab').then(m => ({ default: m.DashboardTab })));
const UsersTab = lazy(() => import('@/components/admin/UsersTab').then(m => ({ default: m.UsersTab })));
const LogsTab = lazy(() => import('@/components/admin/LogsTab').then(m => ({ default: m.LogsTab })));
const UserDetailDialog = lazy(() => import('@/components/admin/UserDetailDialog'));

import { FeedbackCards } from '@/components/feedback/FeedbackCards';
import { Feedback } from '@/types/feedback';

export default function AdminDashboard() {
  const { user, isAdmin, isUserLoading, supabase, session } = useAuth();

  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [totalMindmapsEver, setTotalMindmapsEver] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [calculatedHealthScore, setCalculatedHealthScore] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userSortBy, setUserSortBy] = useState<'latest' | 'oldest' | 'a-z' | 'z-a' | 'all' | 'new'>('latest');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isUserDetailOpen, setIsUserDetailOpen] = useState(false);
  const [logFilter, setLogFilter] = useState<AdminActivityLogEntry['type'] | 'all'>('all');
  const [feedbackData, setFeedbackData] = useState<Feedback[]>([]);
  const [topContributorsStatFilter, setTopContributorsStatFilter] = useState<string>('totalMapsCreated');
  const [liveLogs, setLiveLogs] = useState<any[]>([]);
  const [liveUsers, setLiveUsers] = useState<any[]>([]);
  const [extraUsers, setExtraUsers] = useState<any[]>([]);

  const { logAdminActivity, subscribeToAdminActivityLogs } = useAdminActivityLog();
  
  const { 
    data: dashboardData, 
    isLoading: isDashboardLoading,
    bundle,
    refreshBundle
  } = useAdminDashboard();

  const listenerIdsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!supabase) return;

    const ids: string[] = [];

    // 1. Live Logs Subscriber
    const logsUnsub = subscribeToAdminActivityLogs((logs) => {
      setLiveLogs(logs);
    }, 'all', 100);
    ids.push(globalListenerManager.register('admin/logs', logsUnsub));

    // 2. Stats Live Listener
    const statsChannel = supabase
      .channel('admin-stats-live')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'admin_stats',
        filter: 'period=eq.all-time'
      }, (payload) => {
        const data = payload.new;
        setStats(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            totalUsers: data.totalUsers || prev.totalUsers,
            totalMindmaps: data.totalMindmaps || prev.totalMindmaps,
            totalMindmapsEver: data.totalMindmapsEver || prev.totalMindmapsEver,
            totalChats: data.totalChats || prev.totalChats,
          };
        });
      })
      .subscribe();
    
    ids.push(globalListenerManager.register('admin/stats', () => {
      supabase.removeChannel(statsChannel);
    }));

    // 3. Optional Users real-time update
    const usersChannel = supabase
      .channel('admin-users-live')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'users'
      }, () => {
        refreshBundle();
      })
      .subscribe();
    
    ids.push(globalListenerManager.register('admin/users', () => {
      supabase.removeChannel(usersChannel);
    }));

    listenerIdsRef.current = ids;

    return () => {
      ids.forEach(id => globalListenerManager.unregister(id));
      listenerIdsRef.current = [];
    };
  }, [supabase, subscribeToAdminActivityLogs, refreshBundle]);

  const activityLogs = useMemo(() => {
    const logMap = new Map();
    (bundle?.logs || []).forEach(log => logMap.set(log.id, log));
    liveLogs.forEach(log => logMap.set(log.id, log));
    return sortByTimestamp(Array.from(logMap.values()), l => l.timestamp, 'desc');
  }, [bundle?.logs, liveLogs]);

  // Deep fetch logic removed as per user request

  const users = useMemo(() => {
    const userMap = new Map<string, any>();
    (bundle?.users || []).forEach(u => userMap.set(u.id, u));
    liveUsers.forEach(u => userMap.set(u.id, { ...userMap.get(u.id), ...u }));
    const result = sortByTimestamp(Array.from(userMap.values()), u => u.createdAt, 'desc');
    console.log('[Admin] Users computed:', {
      bundleUsers: bundle?.users?.length || 0,
      extraUsers: extraUsers.length,
      liveUsers: liveUsers.length,
      finalUsers: result.length,
    });
    return result;
  }, [bundle?.users, extraUsers, liveUsers]);

  useEffect(() => {
    if (bundle) {
      if (bundle.feedback.length > 0) setFeedbackData(bundle.feedback);
    }
  }, [bundle]);
  
  useEffect(() => {
    if (dashboardData) {
      const { stats, mapAnalytics } = dashboardData;
      const extendedData = dashboardData as any;
      
      setStats({
        date: format(new Date(), 'yyyy-MM-dd'),
        totalUsers: stats.totalUsers,
        totalMaps: extendedData.totalPublicMaps || 0,
        totalMindmaps: stats.totalMindmaps,
        totalMindmapsEver: extendedData.totalMindmapsEver || 0,
        totalChats: stats.totalChats,
        dailyActiveUsers: stats.activeUsers,
      });

      setMetrics({
        newUsersToday: extendedData.newUsersToday || 0,
        newUsersYesterday: extendedData.newUsersYesterday || 0,
        newMapsToday: extendedData.newMapsToday || 0,
        newMapsYesterday: extendedData.newMapsYesterday || 0,
        activeUsers24h: extendedData.activeUsers24h || stats.activeUsers,
        activeUsers48h: extendedData.activeUsers48h || 0,
        engagementRate: extendedData.engagementRate || 0,
        totalMindmapsEver: extendedData.totalMindmapsEver || 0,
        usersThisWeek: 0,
        usersLastWeek: 0,
        mapsThisWeek: 0,
        mapsLastWeek: 0,
        avgMapsPerUser: extendedData.avgMapsPerUser || 0,
        avgChatsPerUser: extendedData.avgChatsPerUser || 0,
        latestUsers: extendedData.latestUsers || [],
        latestMaps: extendedData.latestMaps || [],
        usersLast7Days: (extendedData.heatmapDays || []).slice(-7).map((d: any) => ({ date: d.date, count: d.newUsers })),
        mapsLast7Days: (extendedData.heatmapDays || []).slice(-7).map((d: any) => ({ date: d.date, count: d.newMaps })),
        topUsers: extendedData.topUsers || [],
        topMaps: [],
        heatmapDays: extendedData.heatmapDays || [],
        mapAnalytics: {
          ...mapAnalytics,
          avgNodesPerMap: extendedData.avgNodesPerMap || mapAnalytics?.avgNodesPerMap || 0,
        },
      });

      setTotalMindmapsEver(extendedData.totalMindmapsEver || 0);
      setLastSyncedAt(stats.timestamp);
      setCalculatedHealthScore(stats.healthScore);
    }
  }, [dashboardData]);

  useEffect(() => {
    if (!isUserLoading && !isAdmin) router.push('/');
  }, [isUserLoading, isAdmin, router]);

  const handleForceRefresh = async () => {
    if (!session) return;
    setIsSyncing(true);
    try {
      const token = session.access_token;
      const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      const syncRes = await fetch('/api/admin-sync', { method: 'POST', headers });
      const syncJson = await syncRes.json().catch(() => ({}));
      
      if (syncRes.status === 429) {
        await refreshBundle(true);
        return;
      }
      if (syncRes.status === 403) return;
      if (!syncRes.ok) throw new Error(syncJson.error || `Sync failed with status ${syncRes.status}`);
      setLastSyncedAt(syncJson.timestamp || new Date().toISOString());
      await logAdminActivity({
        type: 'FULL_REFRESH',
        targetType: 'system',
        details: 'Manual full re-sync triggered',
        performedBy: user?.uid,
      });
      await refreshBundle(true);
    } catch (e: any) {
      console.error('Manual sync error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const navItems = [
    { id: 'dashboard' as AdminTab, label: 'Overview', icon: Brain, desc: 'System overview and metrics' },
    { id: 'users' as AdminTab, label: 'Users', icon: Users, desc: 'Manage user accounts' },
    { id: 'logs' as AdminTab, label: 'Activity', icon: Activity, desc: 'Live event stream' },
    { id: 'feedback' as AdminTab, label: 'Feedback', icon: MessageSquare, desc: 'User reports' },
  ];

  if (isUserLoading || (isAdmin && isDashboardLoading && !dashboardData && activeTab === 'dashboard')) {
    return <AdminPageSkeleton />;
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#020202] text-zinc-100 flex flex-col selection:bg-violet-500/30 font-sans overflow-x-hidden">
      {/* Mesh Background Experience */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div 
          animate={{ 
            x: [0, 100, 0], 
            y: [0, 50, 0],
            scale: [1, 1.2, 1] 
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-violet-600/10 blur-[150px] rounded-full" 
        />
        <motion.div 
          animate={{ 
            x: [0, -80, 0], 
            y: [0, 120, 0],
            scale: [1.2, 1, 1.2] 
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[150px] rounded-full" 
        />
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.03] mix-blend-overlay" />
      </div>

      <main className="flex-1 relative z-10 w-full max-w-7xl mx-auto px-6 py-12 lg:px-10 pb-32">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 mb-3"
            >
              <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-xl shadow-2xl">
                <ShieldAlert className="h-6 w-6 text-violet-400" />
              </div>
              <div>
                <h1 className="text-sm font-black uppercase tracking-[0.2em] text-violet-400">Admin Command</h1>
                <p className="text-4xl font-black tracking-tight text-white leading-none mt-1">Management</p>
              </div>
            </motion.div>
          </div>

          <div className="flex items-center gap-4">
            <AnimatePresence mode='wait'>
              {lastSyncedAt && activeTab === 'dashboard' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl cursor-help hover:bg-white/10 transition-colors">
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            dashboardData?.meta?.cached ? 'bg-amber-500' : 'bg-emerald-500'
                          } animate-pulse`} />
                          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                            Synced {formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-zinc-950 border-white/10 text-[10px] p-2">
                        <p className="font-bold text-white">Full System Sync: {format(new Date(lastSyncedAt), 'HH:mm:ss')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </motion.div>
              )}
            </AnimatePresence>

            <Button 
              onClick={handleForceRefresh} 
              disabled={isSyncing || isDashboardLoading}
              className="h-12 px-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-xl transition-all hover:scale-105 active:scale-95"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="font-bold text-xs uppercase tracking-widest">Sync</span>
            </Button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <Suspense fallback={<div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-violet-500" /></div>}>
              {activeTab === 'dashboard' && (
                <DashboardTab 
                  stats={stats}
                  metrics={metrics}
                  healthScore={calculatedHealthScore}
                  totalMindmapsEver={totalMindmapsEver}
                  isMonthLoading={false}
                  selectedMonth={new Date()}
                  setSelectedMonth={() => {}}
                  topContributorsStatFilter={topContributorsStatFilter}
                  setTopContributorsStatFilter={setTopContributorsStatFilter}
                  setSelectedUser={setSelectedUser}
                  setIsUserDetailOpen={setIsUserDetailOpen}
                  setActiveTab={setActiveTab}
                />
              )}
              {activeTab === 'users' && (
                <UsersTab 
                  searchTerm={userSearchTerm}
                  setSearchTerm={setUserSearchTerm}
                  sortBy={userSortBy}
                  setSortBy={setUserSortBy as any}
                  filteredUsers={users.filter(u => 
                    u.displayName?.toLowerCase().includes(userSearchTerm.toLowerCase()) || 
                    u.email?.toLowerCase().includes(userSearchTerm.toLowerCase())
                  )}
                  isLoading={isDashboardLoading}
                  isDeepLoading={false}
                  loadMoreFromSupabase={async () => {}}
                  setSelectedUser={setSelectedUser}
                  setIsUserDetailOpen={setIsUserDetailOpen}
                />
              )}
              {activeTab === 'logs' && (
                <LogsTab 
                  activityLogs={activityLogs}
                  isLogsLoading={isDashboardLoading}
                  loadActivityLogs={refreshBundle}
                  logFilter={logFilter as any}
                  setLogFilter={setLogFilter as any}
                />
              )}
              {activeTab === 'feedback' && (
                <FeedbackCards data={feedbackData} adminUserId={user?.uid || ''} onRefresh={refreshBundle} isLoading={isDashboardLoading && feedbackData.length === 0} />
              )}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating Bottom Dock */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", damping: 20, stiffness: 100 }}
          className="flex items-center gap-2 p-2 rounded-[2.5rem] bg-zinc-900/40 backdrop-blur-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`group relative flex items-center gap-3 px-6 py-4 rounded-[2rem] transition-all duration-500 ${isActive ? 'bg-white/10 text-white shadow-2xl' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
              >
                <Icon className={`h-5 w-5 transition-transform duration-500 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                <span className={`text-xs font-black tracking-widest uppercase transition-all duration-500 overflow-hidden ${isActive ? 'max-w-[100px] opacity-100' : 'max-w-0 opacity-0 group-hover:max-w-[100px] group-hover:opacity-100'}`}>
                  {item.label}
                </span>
                {isActive && (
                  <motion.div 
                    layoutId="dock-active"
                    className="absolute inset-0 rounded-[2rem] border border-white/20 select-none pointer-events-none"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
            );
          })}
          <div className="w-px h-8 bg-white/10 mx-2" />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={() => router.push('/')}
                  className="p-4 rounded-full text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-zinc-950 border-white/10 text-[10px]">Exit Admin</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </motion.div>
      </div>

      <AnimatePresence>
        {isUserDetailOpen && selectedUser && (
          <UserDetailDialog 
            user={selectedUser} 
            isOpen={isUserDetailOpen} 
            onClose={() => setIsUserDetailOpen(false)} 
            onUserDeleted={refreshBundle}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
