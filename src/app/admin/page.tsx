'use client';

import { useEffect, useState, useCallback, useMemo, lazy, Suspense, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { 
  Users, 
  ShieldAlert, 
  Loader2,
  Brain,
  RefreshCw,
  MessageSquare, 
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { collection, query, orderBy, limit, getDocs, doc, onSnapshot, startAfter } from 'firebase/firestore';
import { formatDistanceToNow, format, differenceInMinutes } from 'date-fns';
import { AdminStats } from '@/types/chat';
import { useAdminActivityLog, AdminActivityLogEntry, ActivityCategory } from '@/lib/admin-utils';
import { AdminPageSkeleton } from '@/components/admin/AdminSkeletons';
import { AdminTab, DashboardMetrics } from '@/types/admin';
import { useAdminDashboard } from '@/hooks/use-admin-dashboard';
import { globalListenerManager } from '@/lib/listener-manager';
import { normalizeTimestamp, toISOTimestamp, parseTimestamp, sortByTimestamp } from '@/lib/timestamp-utils';

// Lazy Loaded Tab Components
const DashboardTab = lazy(() => import('@/components/admin/DashboardTab').then(m => ({ default: m.DashboardTab })));
const UsersTab = lazy(() => import('@/components/admin/UsersTab').then(m => ({ default: m.UsersTab })));
const LogsTab = lazy(() => import('@/components/admin/LogsTab').then(m => ({ default: m.LogsTab })));
const UserDetailDialog = lazy(() => import('@/components/admin/UserDetailDialog'));

import { FeedbackCards } from '@/components/feedback/FeedbackCards';
import { Feedback } from '@/types/feedback';

export default function AdminDashboard() {
  const { user, isAdmin, isUserLoading, firestore, auth } = useFirebase();
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
  const [isExtraUsersLoading, setIsExtraUsersLoading] = useState(false);

  const { logAdminActivity } = useAdminActivityLog();
  
  const { 
    data: dashboardData, 
    isLoading: isDashboardLoading,
    bundle,
    refreshBundle
  } = useAdminDashboard();

  const listenerIdsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!firestore) return;

    const ids: string[] = [];

    const usersQ = query(collection(firestore, 'users'), limit(500));
    const usersUnsub = onSnapshot(usersQ, (snapshot) => {
      if (snapshot.empty) return;
      const users = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          createdAt: toISOTimestamp(data.createdAt),
        };
      });
      setLiveUsers(users);
    }, (err) => {
      console.warn('⚠️ Users listener error (index may be missing):', err.message);
    });
    ids.push(globalListenerManager.register('admin/users', usersUnsub));

    const logsQ = query(
      collection(firestore, 'adminActivityLog'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );
    const logsUnsub = onSnapshot(logsQ, (snapshot) => {
      const logs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setLiveLogs(logs);
    }, (error) => {
      console.error('❌ Real-time logs error:', error);
    });
    ids.push(globalListenerManager.register('admin/logs', logsUnsub));

    const statsRef = doc(firestore, 'adminStats', 'all-time');
    const statsUnsub = onSnapshot(statsRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
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
    });
    ids.push(globalListenerManager.register('admin/stats', statsUnsub));

    listenerIdsRef.current = ids;

    return () => {
      ids.forEach(id => globalListenerManager.unregister(id));
      listenerIdsRef.current = [];
    };
  }, [firestore]);

  const activityLogs = useMemo(() => {
    const logMap = new Map();
    (bundle?.logs || []).forEach(log => logMap.set(log.id, log));
    liveLogs.forEach(log => logMap.set(log.id, log));
    return sortByTimestamp(Array.from(logMap.values()), l => l.timestamp, 'desc');
  }, [bundle?.logs, liveLogs]);

  const loadMoreUsersFromFirebase = async () => {
    if (!firestore || isExtraUsersLoading) return;
    
    const allUsers = [...(bundle?.users || []), ...extraUsers];
    const sorted = sortByTimestamp(allUsers, u => u.createdAt, 'desc');
    const lastUser = sorted[sorted.length - 1];

    if (!lastUser) return;

    setIsExtraUsersLoading(true);
    try {
      console.log('🔍 [Admin] Deep fetching more users from Firebase...');
      
      const lastTimestamp = normalizeTimestamp(lastUser.createdAt);
      const lastId = lastUser.id;

      const q = query(
        collection(firestore, 'users'),
        orderBy('createdAt', 'desc'),
        orderBy('__name__', 'desc'),
        startAfter(lastTimestamp, lastId),
        limit(100)
      );

      const snapshot = await getDocs(q);
      const newUsers = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          createdAt: toISOTimestamp(data.createdAt),
        };
      });
      
      setExtraUsers(prev => {
        const existingIds = new Set(prev.map(u => u.id));
        const bundleIds = new Set((bundle?.users || []).map((u: any) => u.id));
        const filteredNew = newUsers.filter(u => !existingIds.has(u.id) && !bundleIds.has(u.id));
        return [...prev, ...filteredNew];
      });
    } catch (error) {
      console.error('❌ Failed to deep fetch users:', error);
    } finally {
      setIsExtraUsersLoading(false);
    }
  };

  const users = useMemo(() => {
    const userMap = new Map<string, any>();
    (bundle?.users || []).forEach(u => userMap.set(u.id, u));
    extraUsers.forEach(u => userMap.set(u.id, u));
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

  // Sync state from the unified bundle
  useEffect(() => {
    if (bundle) {
      if (bundle.feedback.length > 0) setFeedbackData(bundle.feedback);
    }
  }, [bundle]);
  
  // Sync dashboard metrics from SWR data
  useEffect(() => {
    if (dashboardData) {
      const { stats, mapAnalytics } = dashboardData;
      const extendedData = dashboardData as any;
      
      // Update basic status counts
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

  // Authentication Guard
  useEffect(() => {
    if (!isUserLoading && !isAdmin) router.push('/');
  }, [isUserLoading, isAdmin, router]);

  const handleForceRefresh = async () => {
    if (!auth) return;
    setIsSyncing(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      const syncRes = await fetch('/api/admin-sync', { method: 'POST', headers });
      const syncJson = await syncRes.json().catch(() => ({}));
      
      if (syncRes.status === 429) {
        console.warn('⏳ Sync rate limited:', syncJson.error);
        await refreshBundle(true);
        return;
      }
      if (syncRes.status === 403) {
        console.error('Unauthorized: Admin access required');
        return;
      }
      if (!syncRes.ok) throw new Error(syncJson.error || `Sync failed with status ${syncRes.status}`);
      console.log('✅ Sync response:', syncJson);
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
    { id: 'dashboard' as AdminTab, label: 'Dashboard', icon: Brain, desc: 'System overview and metrics' },
    { id: 'users' as AdminTab, label: 'Users', icon: Users, desc: 'Manage user accounts and data' },
    { id: 'logs' as AdminTab, label: 'Activity Log', icon: Activity, desc: 'Real-time activity feed' },
    { id: 'feedback' as AdminTab, label: 'Feedback', icon: MessageSquare, desc: 'User reports and suggestions' },
  ];

  if (isUserLoading || (isAdmin && isDashboardLoading && !dashboardData && activeTab === 'dashboard')) {
    return <AdminPageSkeleton />;
  }

  if (!isAdmin) return null;

  return (
    <div className="h-[calc(100vh-80px)] bg-zinc-950 text-zinc-100 flex overflow-hidden selection:bg-violet-500/30 font-sans">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] left-[10%] w-[40%] h-[40%] bg-violet-600/10 blur-[120px] rounded-full animate-pulse duration-[10s]" />
        <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse duration-[15s]" />
      </div>

      <aside className="hidden lg:flex w-80 border-r border-white/5 bg-zinc-950/40 backdrop-blur-3xl flex-col z-20 relative h-full">
        <div className="p-8 flex flex-col h-full overflow-hidden">
          <div className="mb-10 shrink-0">
            <div className="relative group p-6 rounded-[2.5rem] bg-white/5 border border-white/10 backdrop-blur-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center gap-5 mb-6 relative z-10">
                <div className="h-16 w-16 rounded-2xl border-2 border-white/10 p-0.5 relative z-10 bg-zinc-900 flex items-center justify-center shadow-lg">
                  <ShieldAlert className="h-7 w-7 text-violet-400" />
                </div>
                <div>
                  <p className="text-xl font-black text-white truncate tracking-tight">Admin Console</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
                    <p className="text-[10px] text-violet-400 font-black uppercase tracking-wider">Active</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <nav className="space-y-2.5 flex-1 pr-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${isActive ? 'bg-white/5 text-white border border-white/10 shadow-xl' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                >
                  <div className={`p-2.5 rounded-xl ${isActive ? 'bg-violet-500/20 text-violet-400' : 'bg-transparent'}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className={`text-sm font-black tracking-tight ${isActive ? 'text-white' : 'text-zinc-500'}`}>{item.label}</p>
                </button>
              );
            })}
          </nav>

          <div className="pt-8 border-t border-white/5">
            <Button onClick={() => router.push('/')} variant="ghost" className="w-full flex items-center gap-4 p-4 rounded-2xl text-zinc-500 hover:text-white group">
               Exit Admin
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative z-10 custom-scrollbar">
        <div className="max-w-6xl mx-auto px-6 py-8 lg:px-10">
          <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white leading-none">
                  {navItems.find(i => i.id === activeTab)?.label}
                </h1>
                {lastSyncedAt && activeTab === 'dashboard' && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-white/10 self-end mb-1 cursor-help hover:bg-zinc-800 transition-colors">
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            dashboardData?.meta?.cached ? 'bg-amber-500' : 'bg-emerald-500'
                          } ${!dashboardData?.meta?.cached ? 'animate-pulse' : ''}`} />
                          
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[9px] font-black uppercase tracking-tight ${
                              dashboardData?.meta?.cached ? 'text-amber-400' : 'text-emerald-400'
                            }`}>
                              {dashboardData?.meta?.cached ? 'Cached' : 'Live'}
                            </span>
                            <span className="text-zinc-700 font-bold">•</span>
                            <span className={`text-[9px] font-bold tracking-tight ${
                              differenceInMinutes(new Date(), new Date(lastSyncedAt)) > 15 
                                ? 'text-amber-500/80' 
                                : 'text-zinc-400'
                            }`}>
                              {formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-zinc-950 border-white/10 text-[10px] p-2">
                        <div className="flex flex-col gap-1">
                          <p className="font-bold text-white">Full System Sync Status</p>
                          <p className="text-zinc-400">Exact Time: {format(new Date(lastSyncedAt), 'MMMM do, HH:mm:ss')}</p>
                          <p className={`text-[9px] ${dashboardData?.meta?.cached ? 'text-amber-400/80' : 'text-emerald-400/80'}`}>
                            Source: {dashboardData?.meta?.source || 'Unified Admin Backend'}
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {isDashboardLoading && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 self-end mb-1">
                    <Loader2 className="w-3 h-3 animate-spin text-violet-400" />
                    <span className="text-[9px] font-black text-violet-400 uppercase tracking-tighter">Loading...</span>
                  </div>
                )}
              </div>
              <p className="text-zinc-500 font-bold text-xs max-w-md">{navItems.find(i => i.id === activeTab)?.desc}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={handleForceRefresh} 
                disabled={isSyncing || isDashboardLoading}
                className="h-11 px-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                Sync Data
              </Button>
            </div>
          </header>

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
                isDeepLoading={isExtraUsersLoading}
                loadMoreFromFirebase={loadMoreUsersFromFirebase}
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
        </div>
      </main>

      <Suspense fallback={null}>
        <UserDetailDialog 
          user={selectedUser} 
          isOpen={isUserDetailOpen} 
          onClose={() => setIsUserDetailOpen(false)} 
          onUserDeleted={refreshBundle}
        />
      </Suspense>
    </div>
  );
}
