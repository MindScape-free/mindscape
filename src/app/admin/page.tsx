'use client';

import { useEffect, useState, useCallback, useMemo, lazy, Suspense, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { 
  Users, 
  ShieldAlert, 
  Loader2,
  Brain,
  BrainCircuit,
  RefreshCw,
  MessageSquare, 
  Activity,
  LogOut,
  ChevronUp,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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
const AITelemetryTab = lazy(() => import('@/components/admin/AITelemetryTab').then(m => ({ default: m.AITelemetryTab })));
const UserDetailDialog = lazy(() => import('@/components/admin/UserDetailDialog'));

import { FeedbackCards } from '@/components/feedback/FeedbackCards';
import { Feedback } from '@/types/feedback';

export default function AdminDashboard() {
  const { user, isAdmin, isUserLoading, supabase, session } = useAuth();
  const { toast } = useToast();

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
  const [selectedMonth, setSelectedMonth] = useState(new Date());

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
      
      console.log('📊 [Admin] Dashboard Data Arrived:', {
        stats: dashboardData.stats,
        mapAnalytics: dashboardData.mapAnalytics,
        meta: dashboardData.meta
      });

      setStats({
        date: format(new Date(), 'yyyy-MM-dd'),
        totalUsers: stats.totalUsers,
        totalMaps: stats.totalMindmaps,
        totalMindmaps: stats.totalMindmaps,
        totalMindmapsEver: extendedData.totalMindmapsEver || 0,
        totalChats: stats.totalChats,
        totalNodes: stats.totalNodes || 0,
        totalNodesActive: stats.totalNodesActive || 0,
        totalImages: stats.totalImages || 0,
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
        heatmapDays: extendedData.heatmapDays || [],
        usersLast7Days: (extendedData.heatmapDays || []).slice(-7).map((d: any) => ({ date: d.date, count: (d.newUsers || 0) })),
        mapsLast7Days: (extendedData.heatmapDays || []).slice(-7).map((d: any) => ({ date: d.date, count: (d.newMaps || 0) })),
        topUsers: extendedData.topUsers || [],
        topMaps: [],
        mapAnalytics: mapAnalytics, // Pass the whole object directly
      });

      setTotalMindmapsEver(extendedData.totalMindmapsEver || 0);
      setLastSyncedAt(stats.timestamp);
      setCalculatedHealthScore(stats.healthScore);

      // Auto-sync if data is older than 15 minutes
      const lastUpdated = stats.lastUpdated;
      if (lastUpdated) {
        const now = Date.now();
        const fifteenMinutes = 15 * 60 * 1000;
        if (now - lastUpdated > fifteenMinutes && !isSyncing) {
          console.log('🔄 [Admin] Data stale (>15m), auto-syncing...');
          handleForceRefresh();
        }
      }
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
        performedBy: user?.id,
      });
      await refreshBundle(true);
    } catch (e: any) {
      console.error('Manual sync error:', e);
      toast({
        variant: 'destructive',
        title: 'Sync Failed',
        description: e.message || 'An unexpected error occurred during database synchronization.'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    setSelectedMonth(prev => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + (direction === 'next' ? 1 : -1), 1);
      return next > new Date() ? prev : next;
    });
  };

  const navItems = [
    { id: 'dashboard' as AdminTab, label: 'Overview', icon: Brain, desc: 'System overview and metrics' },
    { id: 'users' as AdminTab, label: 'Users', icon: Users, desc: 'Manage user accounts' },
    { id: 'logs' as AdminTab, label: 'Activity', icon: Activity, desc: 'Live event stream' },
    { id: 'ai_telemetry' as AdminTab, label: 'Telemetry', icon: BarChart3, desc: 'AI Performance & Usage' },
    { id: 'feedback' as AdminTab, label: 'Feedback', icon: MessageSquare, desc: 'User reports' },
  ];

  // 1. Auth & Admin Guard
  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!isAdmin && !isUserLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="h-20 w-20 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
          <ShieldAlert className="h-10 w-10 text-red-400" />
        </div>
        <h1 className="text-2xl font-black text-white mb-2">Access Restricted</h1>
        <p className="text-zinc-500 max-w-md mb-8">
          This command center is reserved for MindScape architects. Your ID is not registered in the administrative directory.
        </p>
        <Button onClick={() => window.location.href = '/'} variant="outline" className="border-white/10 hover:bg-white/5">
          Return to Base
        </Button>
      </div>
    );
  }

  // 2. Loading State with Timeout Fallback
  if (isDashboardLoading && !dashboardData) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="h-24 w-24 rounded-full border-t-2 border-r-2 border-violet-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <BrainCircuit className="h-8 w-8 text-violet-400 animate-pulse" />
          </div>
        </div>
        <p className="text-zinc-400 font-bold uppercase tracking-[0.2em] text-[10px]">Synchronizing Neural Network...</p>
      </div>
    );
  }

  // 3. Main Render
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col relative overflow-hidden selection:bg-violet-500/30 selection:text-violet-200">
      {/* Dynamic Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-gradient-to-br from-violet-900/10 via-transparent to-rose-900/5" 
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

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 bg-white/5 px-6 py-2.5 rounded-2xl border border-white/10 backdrop-blur-3xl shadow-xl">
              <div className="flex flex-col items-end">
                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-1">Central Sync</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "h-2 w-2 rounded-full transition-all duration-700",
                      isDashboardLoading || isSyncing ? "bg-violet-500 animate-pulse shadow-[0_0_10px_rgba(139,92,246,0.5)] scale-110" : "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                    )} />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">
                      {isDashboardLoading || isSyncing ? 'Syncing...' : 'Live'}
                    </span>
                  </div>
                  <div className="w-px h-3 bg-white/10" />
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter">
                    {lastSyncedAt 
                      ? `Updated ${formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })}` 
                      : 'Syncing...'}
                  </span>
                </div>
              </div>
              <button 
                onClick={handleForceRefresh}
                disabled={isSyncing || isDashboardLoading}
                className={cn(
                  "p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-all group",
                  (isSyncing || isDashboardLoading) && "opacity-50 cursor-not-allowed"
                )}
              >
                <RefreshCw className={cn("h-4 w-4 group-hover:rotate-180 transition-transform duration-700", (isSyncing || isDashboardLoading) && "animate-spin")} />
              </button>
            </div>
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
            {activeTab === 'dashboard' && (
                <DashboardTab 
                  stats={stats}
                  metrics={metrics}
                  healthScore={calculatedHealthScore}
                  totalMindmapsEver={totalMindmapsEver}
                  isMonthLoading={isDashboardLoading}
                  selectedMonth={selectedMonth}
                  setSelectedMonth={setSelectedMonth}
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
                <FeedbackCards data={feedbackData} adminUserId={user?.id || ''} onRefresh={refreshBundle} isLoading={isDashboardLoading && feedbackData.length === 0} />
              )}
              {activeTab === 'ai_telemetry' && (
                <AITelemetryTab aiCalls={bundle.aiCalls} isLoading={isDashboardLoading} />
              )}
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
