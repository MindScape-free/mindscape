'use client';

import { useEffect, useState, useCallback, useMemo, lazy, Suspense, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';import {
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
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { FAQSection } from '@/components/faq-section';
import { ADMIN_FAQS } from '@/data/faq';
import { useToast } from '@/hooks/use-toast';

import { formatDistanceToNow, format } from 'date-fns';
import { AdminStats } from '@/types/chat';
import { AdminActivityLogEntry } from '@/lib/admin-utils';
import { logAdminActivity, subscribeToAdminActivityLogs } from '@/lib/tracker';
import { AdminPageSkeleton } from '@/components/admin/AdminSkeletons';
import { AdminTab, DashboardMetrics, DEFAULT_MAP_ANALYTICS } from '@/types/admin';
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
  const [isRecomputing, setIsRecomputing] = useState(false);
  
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

  // logAdminActivity and subscribeToAdminActivityLogs are imported directly from @/lib/tracker
  
  const { 
    data: dashboardData, 
    isLoading: isDashboardLoading,
    bundle,
    refreshBundle
  } = useAdminDashboard();

  // Sync feedback data from bundle once available (avoids TDZ from using bundle in useState initializer)
  useEffect(() => {
    if (bundle?.feedback && bundle.feedback !== feedbackData) {
      setFeedbackData(bundle.feedback);
    }
  }, [bundle?.feedback, feedbackData]);

  const listenerIdsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!supabase) return;

    const ids: string[] = [];

    // 1. Live Logs Subscriber
    const logsUnsub = subscribeToAdminActivityLogs((logs) => {
      setLiveLogs(logs);
    }, 'all', 100);
    ids.push(globalListenerManager.register('admin/logs', logsUnsub));

    // 2. Stats Live Listener — platform_stats is the source of truth,
    //    updated by cron every 5 min. The dashboard auto-refreshes on
    //    page load and via the Force Refresh button.
    //    (admin_stats was dropped in migration 00012)

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
  }, [supabase, refreshBundle]);

  const activityLogs = useMemo(() => {
    const logMap = new Map();
    (bundle?.logs || []).forEach((log: any) => logMap.set(log.id, log));
    liveLogs.forEach((log: any) => logMap.set(log.id, log));
    return sortByTimestamp(Array.from(logMap.values()), (l: any) => l.timestamp, 'desc');
  }, [bundle?.logs, liveLogs]);

  // Deep fetch logic removed as per user request

  const users = useMemo(() => {
    const userMap = new Map<string, any>();
    (bundle?.users || []).forEach((u: any) => userMap.set(u.id, u));
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
    if (dashboardData) {
      const { platform, metrics } = dashboardData;
      
      console.log('📊 [Admin] Unified Dashboard Data Arrived:', {
        platform,
        mapAnalytics: metrics?.mapAnalytics,
        totalProfiles: dashboardData.meta?.totalProfiles,
      });

      const platformP = platform || {};
      const mapAnalytics = metrics?.mapAnalytics || { ...DEFAULT_MAP_ANALYTICS };
      const dailySnapshot = platformP.daily_snapshot || [];

      setStats({
        date: format(new Date(), 'yyyy-MM-dd'),
        totalUsers: platformP.total_users || 0,
        totalMaps: platformP.total_maps || 0,
        totalMindmaps: platformP.total_maps || 0,
        totalMindmapsEver: platformP.total_maps_ever || 0,
        totalChats: platformP.total_chats || 0,
        totalNodes: platformP.total_nodes || 0,
        totalNodesActive: platformP.total_nodes_active || platformP.total_nodes || 0,
        totalImages: platformP.total_images || 0,
        dailyActiveUsers: platformP.active_users_24h || 0,
      });

      // Map daily_snapshot to heatmapDays format
      const heatmapDays = dailySnapshot.map((d: any) => {
        const normalizedDate = d.date ? d.date.substring(0, 10) : '';
        // Calculate new users created on this day from user list in bundle
        const newUsersCount = (bundle?.users || []).filter((u: any) => {
          if (!u.createdAt) return false;
          return u.createdAt.substring(0, 10) === normalizedDate;
        }).length;

        return {
          date: normalizedDate,
          newUsers: newUsersCount,
          newMaps: d.new_maps || d.newMaps || 0,
          newSubMaps: 0,
          activeUsers: d.active_users || 0,
          publicMaps: 0,
          privateMaps: 0,
          totalActions: d.new_events || 0,
        };
      });

      setMetrics({
        newUsersToday: platformP.new_users_24h || 0,
        newUsersYesterday: 0,
        newMapsToday: platformP.new_maps_24h || 0,
        newMapsYesterday: 0,
        activeUsers24h: platformP.active_users_24h || 0,
        activeUsers48h: 0,
        engagementRate: platformP.engagement_rate || 0,
        totalMindmapsEver: platformP.total_maps_ever || 0,
        usersThisWeek: platformP.new_users_7d || 0,
        usersLastWeek: 0,
        mapsThisWeek: platformP.new_maps_7d || 0,
        mapsLastWeek: 0,
        avgMapsPerUser: platformP.avg_maps_per_user || 0,
        avgChatsPerUser: platformP.total_users > 0 ? (platformP.total_chats / platformP.total_users) : 0,
        latestUsers: metrics?.latestUsers || [],
        latestMaps: [],
        heatmapDays,
        usersLast7Days: dailySnapshot.slice(-7).map((d: any) => ({ date: d.date ? d.date.substring(0, 10) : '', count: (d.active_users || 0) })),
        mapsLast7Days: dailySnapshot.slice(-7).map((d: any) => ({ date: d.date ? d.date.substring(0, 10) : '', count: (d.new_maps || 0) })),
        topUsers: metrics?.topUsers || [],
        topMaps: [],
        mapAnalytics,
      });

      setTotalMindmapsEver(platformP.total_maps_ever || 0);
      setLastSyncedAt(platformP.updated_at || new Date().toISOString());
      setCalculatedHealthScore(platformP.health_score || 100);
    }
  }, [dashboardData, bundle]);

  useEffect(() => {
    if (!isUserLoading && !isAdmin) router.push('/');
  }, [isUserLoading, isAdmin, router]);

  const handleForceRefresh = async () => {
    if (!session) return;
    setIsSyncing(true);
    const startTime = Date.now();
    try {
      const token = session.access_token;
      const recomputeHeaders: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };
      const syncHeaders: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      // Step 1: Recompute aggregated stats from raw events
      const recRes = await fetch('/api/admin/recompute', {
        method: 'POST',
        headers: recomputeHeaders,
        body: JSON.stringify({ scope: 'all' }),
      });
      if (!recRes.ok) {
        const errData = await recRes.json().catch(() => ({}));
        console.warn('Recompute warning (continuing sync):', errData.error || recRes.status);
      } else {
        const recResult = await recRes.json();
        const timingParts: string[] = [];
        if (recResult.timing?.profiles) timingParts.push(`profiles: ${recResult.timing.profiles}ms`);
        if (recResult.timing?.platform) timingParts.push(`platform: ${recResult.timing.platform}ms`);
        console.log(`[Admin] Recompute done (${timingParts.join(', ')})`);
      }

      // Step 2: Sync raw data from source tables
      const syncRes = await fetch('/api/admin-sync', { method: 'POST', headers: syncHeaders });
      const syncJson = await syncRes.json().catch(() => ({}));
      
      if (syncRes.status === 429) {
        await refreshBundle(true);
        return;
      }
      if (syncRes.status === 403) return;
      if (!syncRes.ok) throw new Error(syncJson.error || `Sync failed with status ${syncRes.status}`);
      setLastSyncedAt(syncJson.timestamp || new Date().toISOString());
      
      const elapsed = Date.now() - startTime;
      await logAdminActivity({
        type: 'FULL_REFRESH',
        targetType: 'system',
        details: `Full refresh (recompute + sync) completed in ${elapsed}ms`,
        performedBy: user?.id,
      });
      
      // Step 3: Refresh dashboard
      await refreshBundle(true);
    } catch (e: any) {
      console.error('Manual sync error:', e);
      toast({
        variant: 'destructive',
        title: 'Refresh Failed',
        description: e.message || 'An unexpected error occurred during database refresh.'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRecompute = async () => {
    if (!session) return;
    setIsRecomputing(true);
    const startTime = Date.now();
    try {
      const token = session.access_token;
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      const recRes = await fetch('/api/admin/recompute', {
        method: 'POST',
        headers,
        body: JSON.stringify({ scope: 'all' }),
      });

      if (!recRes.ok) {
        const errData = await recRes.json().catch(() => ({}));
        throw new Error(errData.error || `Recompute failed with status ${recRes.status}`);
      }

      const result = await recRes.json();

      const elapsed = Date.now() - startTime;
      const timingParts: string[] = [];
      if (result.timing?.profiles) timingParts.push(`profiles: ${result.timing.profiles}ms`);
      if (result.timing?.platform) timingParts.push(`platform: ${result.timing.platform}ms`);
      const timingStr = timingParts.length > 0 ? ` (${timingParts.join(', ')})` : '';

      await logAdminActivity({
        type: 'FULL_REFRESH',
        targetType: 'system',
        details: `On-demand recompute triggered${timingStr}`,
        performedBy: user?.id,
      });

      // Refresh the dashboard data after recompute
      await refreshBundle(true);

      toast({
        title: 'Stats Recalculated',
        description: `Profiles & platform stats recomputed in ${elapsed}ms${timingStr}`,
      });
    } catch (e: any) {
      console.error('Recompute error:', e);
      toast({
        variant: 'destructive',
        title: 'Recompute Failed',
        description: e.message || 'An unexpected error occurred during recomputation.'
      });
    } finally {
      setIsRecomputing(false);
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

              {/* Split action: Refresh (primary) + Recompute only (dropdown) */}
              <DropdownMenu>
                <div className="flex items-center gap-px">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={handleForceRefresh}
                          disabled={isSyncing || isDashboardLoading}
                          className={cn(
                            "p-2.5 rounded-l-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-all group focus:outline-none",
                            (isSyncing || isDashboardLoading) && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <RefreshCw className={cn("h-4 w-4 group-hover:rotate-180 transition-transform duration-700", (isSyncing || isDashboardLoading) && "animate-spin")} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-zinc-950 border-white/10 text-[11px]">
                        Full refresh: recompute + sync source tables
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <DropdownMenuTrigger asChild>
                    <button
                      disabled={isSyncing || isDashboardLoading}
                      className={cn(
                        "p-2.5 rounded-r-xl border border-l-0 border-white/10 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all focus:outline-none",
                        (isSyncing || isDashboardLoading) && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                </div>

                <DropdownMenuContent
                  align="end"
                  sideOffset={6}
                  className="bg-zinc-900 border-white/10 text-zinc-300 min-w-[180px]"
                >
                  <DropdownMenuItem
                    onClick={handleRecompute}
                    disabled={isRecomputing || isSyncing}
                    className="cursor-pointer hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white gap-3 py-2.5"
                  >
                    <RefreshCw className={cn("h-4 w-4 text-violet-400", isRecomputing && "animate-spin")} />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">Recompute Only</span>
                      <span className="text-[10px] text-zinc-500">Rebuild stats from raw events</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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

      <FAQSection
        title="Admin FAQ"
        subtitle="Manage your platform, users, and monitor system health."
        items={ADMIN_FAQS}
        showSearch={true}
      />
    </div>
  );
}
