'use client';

import { useEffect, useState, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { getAuth } from 'firebase/auth';
import { 
  BarChart3, 
  Users, 
  Map as MapIcon, 
  ShieldAlert, 
  Eye, 
  CheckCircle, 
  Loader2,
  TrendingUp,
  Clock,
  ArrowLeft,
  Mail,
  Fingerprint,
  Calendar,
  ExternalLink,
  Copy,
  Check,
  Brain,
  RefreshCw,
  Menu,
  TrendingDown,
  UserPlus,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Heart,
  Trophy,
  Flame,
  TrendingDown as TrendingDownIcon,
  MessageSquare,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  XCircle,
  EyeOff,
  Info,
  Globe,
  FileText,
  Image as ImageIcon,
  Youtube,
  Link,
  Layers,
  Lock,
  Unlock,
  Star,
  Bot,
  Filter,
  ChevronDown,
  ChevronLeft,
  X,
  Trash2,
  UserRound,
  Palette,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { collection, query, orderBy, limit, getDocs, doc, setDoc, deleteDoc, getCountFromServer, collectionGroup, where, updateDoc } from 'firebase/firestore';
import { formatDistanceToNow, format, subDays, subHours, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from 'date-fns';
import { AdminStats, toDate } from '@/types/chat';
import { useAdminActivityLog, AdminActivityLogEntry, ActivityCategory, FILTER_CATEGORIES, groupLogsByDate } from '@/lib/admin-utils';
import { Activity } from 'lucide-react';
import { StatCardSkeleton, HealthScoreSkeleton, AnalyticsCardSkeleton, HeatmapSkeleton, TopContributorsSkeleton, UserDetailSkeleton } from '@/components/admin/AdminSkeletons';
import { ActivityLogCard, ActivityLogSkeleton } from '@/components/admin/ActivityLogCard';

const UserDetailDialog = lazy(() => import('@/components/admin/UserDetailDialog'));
const ModerationCards = lazy(() => import('@/components/admin/ModerationCards'));

type AdminTab = 'dashboard' | 'users' | 'moderation' | 'logs';

type ContributorFilter = 'all' | 'single' | 'compare' | 'multi' | 'public' | 'low' | 'medium' | 'deep' | 'text' | 'pdf' | 'website' | 'youtube' | 'image';

interface UserContributionStats {
  userId: string;
  displayName: string;
  photoURL?: string;
  totalMaps: number;
  singleMaps: number;
  compareMaps: number;
  multiMaps: number;
  lowDepthMaps: number;
  mediumDepthMaps: number;
  deepDepthMaps: number;
  textSourceMaps: number;
  pdfSourceMaps: number;
  websiteSourceMaps: number;
  youtubeSourceMaps: number;
  imageSourceMaps: number;
  publicMaps: number;
}

interface MapAnalytics {
  totalAnalyzed: number;
  modeCounts: { single: number; compare: number; multi: number };
  depthCounts: { low: number; medium: number; deep: number; unspecified: number };
  sourceCounts: Record<string, number>;
  personaCounts: Record<string, number>;
  subMapStats: { total: number; parents: number; avgPerParent: number | string };
  publicPrivate: { public: number; private: number };
  avgNodesPerMap: number | string;
  featuredCount: number;
  topPersona: string;
  userStats: UserContributionStats[];
}

interface DashboardMetrics {
  newUsersToday: number;
  newUsersYesterday: number;
  newMapsToday: number;
  newMapsYesterday: number;
  activeUsers24h: number;
  activeUsers48h: number;
  engagementRate: number;
  
  usersThisWeek: number;
  usersLastWeek: number;
  mapsThisWeek: number;
  mapsLastWeek: number;
  avgMapsPerUser: number;
  avgChatsPerUser: number;
  
  latestUsers: any[];
  latestMaps: any[];
  
  usersLast7Days: { date: string; count: number }[];
  mapsLast7Days: { date: string; count: number }[];
  
  topUsers: any[];
  topMaps: any[];
  
  heatmapDays: {
    date: string;
    newUsers: number;
    newMaps: number;
    newSubMaps: number;
    activeUsers: number;
    publicMaps: number;
    privateMaps: number;
  }[];
  
  liveActivities: { id: string; type: 'user' | 'map'; message: string; timestamp: Date }[];
  
  mapAnalytics: MapAnalytics | null;
  
  isLoading: boolean;
}

export default function AdminDashboard() {
  const { user, isAdmin, isUserLoading, firestore } = useFirebase();
  const router = useRouter();
  const auth = getAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [totalMindmapsEver, setTotalMindmapsEver] = useState(0);
  
  const [users, setUsers] = useState<any[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const [contributorFilter, setContributorFilter] = useState<ContributorFilter>('all');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isUserDetailOpen, setIsUserDetailOpen] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [isMonthLoading, setIsMonthLoading] = useState(false);
  const [topContributorsStatFilter, setTopContributorsStatFilter] = useState<'totalMapsCreated' | 'totalNodes' | 'totalImagesGenerated' | 'currentStreak'>('totalMapsCreated');
  const [userSortBy, setUserSortBy] = useState<'latest' | 'oldest' | 'a-z' | 'z-a' | 'all' | 'new'>('latest');
  const [activityLogs, setActivityLogs] = useState<AdminActivityLogEntry[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [logFilter, setLogFilter] = useState<AdminActivityLogEntry['type'] | 'all'>('all');
  const [syncDelta, setSyncDelta] = useState<{ users: number; maps: number; deletions: number } | null>(null);
  
  const { logAdminActivity, getAdminActivityLogs, subscribeToAdminActivityLogs } = useAdminActivityLog();

  const isInitialMount = useRef(true);
  const isDashboardFetchInProgress = useRef(false);
  const dashboardTabRef = useRef(activeTab);

  const healthScore = useMemo(() => {
    if (!metrics) return 0;
    return Math.min(100, Math.round(
      (metrics.engagementRate * 2) + 
      (Math.min(metrics.mapsThisWeek / 10, 30)) + 
      (Math.min(metrics.usersThisWeek / 5, 30)) +
      (metrics.activeUsers24h > 0 ? 10 : 0)
    ));
  }, [metrics]);

  const filteredUsers = useMemo(() => {
    return users
      .filter(u => 
        u.displayName?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        u.id?.toLowerCase().includes(userSearchTerm.toLowerCase())
      )
      .filter(u => {
        const now = new Date();
        const createdAt = u.createdAt?.toDate?.() || (u.createdAt ? new Date(u.createdAt) : null);
        const createdHoursAgo = createdAt ? Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)) : null;
        
        if (userSortBy === 'new') return createdHoursAgo !== null && createdHoursAgo <= 24;
        return true;
      })
      .sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const bTime = b.createdAt?.toMillis?.() || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        
        if (userSortBy === 'latest') return bTime - aTime;
        if (userSortBy === 'oldest') return aTime - bTime;
        
        if (userSortBy === 'a-z' || userSortBy === 'z-a') {
          const aName = a.displayName?.toLowerCase() || a.email?.toLowerCase() || '';
          const bName = b.displayName?.toLowerCase() || b.email?.toLowerCase() || '';
          if (aName !== bName) {
            return userSortBy === 'a-z' ? aName.localeCompare(bName) : bName.localeCompare(aName);
          }
          return bTime - aTime;
        }
        
        return bTime - aTime;
      });
  }, [users, userSearchTerm, userSortBy]);

  const topUsersDisplay = useMemo(() => {
    return metrics?.topUsers?.slice(0, 5) || [];
  }, [metrics?.topUsers]);

  const topMapsDisplay = useMemo(() => {
    return metrics?.topMaps?.slice(0, 5) || [];
  }, [metrics?.topMaps]);

  useEffect(() => {
    if (!isUserLoading && !isAdmin) {
      router.push('/');
    }
  }, [isUserLoading, isAdmin, router]);

  useEffect(() => {
    if (isAdmin && firestore && users.length === 0) {
      autoSyncStats();
      fetchUsers();
    }
  }, [isAdmin, firestore]);

  // Fetch dashboard data when tab is dashboard
  useEffect(() => {
    dashboardTabRef.current = activeTab;
    
    if (
      activeTab === 'dashboard' && 
      isAdmin && 
      firestore && 
      !isDashboardFetchInProgress.current
    ) {
      if (isInitialMount.current) {
        isInitialMount.current = false;
        autoSyncStats();
      }
      fetchDashboardMetrics(selectedMonth);
    }
  }, [activeTab, selectedMonth, isAdmin, firestore]);

  // Subscribe to activity logs when on logs tab
  useEffect(() => {
    if (activeTab === 'logs' && firestore) {
      loadActivityLogs();
    }
  }, [activeTab, firestore, logFilter]);

  async function loadActivityLogs() {
    setIsLogsLoading(true);
    const logs = await getAdminActivityLogs(logFilter === 'all' ? undefined : logFilter, 100);
    setActivityLogs(logs);
    setIsLogsLoading(false);
  }

  async function handleForceRefresh() {
    setIsSyncing(true);
    try {
      await logAdminActivity({
        type: 'FULL_REFRESH',
        targetType: 'system',
        details: 'Admin performed force refresh - all data synced from scratch',
        performedBy: user?.uid,
      });
      await autoSyncStats();
      await fetchUsers();
      await fetchDashboardMetrics(selectedMonth);
    } catch (error: any) {
      console.error('Force refresh error:', error);
      alert(`Refresh failed: ${error?.message || 'Permission denied. Please deploy updated Firestore rules.'}`);
    } finally {
      setIsSyncing(false);
    }
  }

  async function fetchUsers() {
    if (!firestore) return;
    setIsUsersLoading(true);
    try {
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, limit(100));
      const snapshot = await getDocs(q);
      const fetchedUsers = snapshot.docs.map(doc => {
        const userData = doc.data();
        if (userData.displayName === 'ADMIN' && userData.email) {
          const newName = userData.email.split('@')[0];
          updateDoc(doc.ref, { displayName: newName });
          return { id: doc.id, ...userData, displayName: newName };
        }
        return { id: doc.id, ...userData };
      });
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsUsersLoading(false);
    }
  }

  async function fetchDashboardMetrics(month: Date = new Date()) {
    if (!firestore || isDashboardFetchInProgress.current) return;
    
    isDashboardFetchInProgress.current = true;
    setIsMonthLoading(true);
    
    setMetrics(prev => prev ? { ...prev, isLoading: true } : { 
      newUsersToday: 0, newUsersYesterday: 0, newMapsToday: 0, newMapsYesterday: 0,
      activeUsers24h: 0, activeUsers48h: 0, engagementRate: 0,
      usersThisWeek: 0, usersLastWeek: 0, mapsThisWeek: 0, mapsLastWeek: 0,
      avgMapsPerUser: 0, avgChatsPerUser: 0,
      latestUsers: [], latestMaps: [],
      usersLast7Days: [], mapsLast7Days: [],
      topUsers: [], topMaps: [],
      heatmapDays: [],
      liveActivities: [],
      mapAnalytics: null,
      isLoading: true 
    });
    
    try {
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthKey = format(month, 'yyyy-MM');
      const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

      const isCurrentMonth = isSameMonth(month, now);
      const cachedDocRef = doc(firestore, 'monthlyStats', monthKey);
      
      let heatmapDays: {
        date: string;
        newUsers: number;
        newMaps: number;
        newSubMaps: number;
        activeUsers: number;
        publicMaps: number;
        privateMaps: number;
      }[];

      if (!isCurrentMonth) {
        const cachedSnap = await getDocs(query(collection(firestore, 'monthlyStats'), where('month', '==', monthKey)));
        if (cachedSnap.docs.length > 0) {
          heatmapDays = cachedSnap.docs[0].data().heatmapDays;
          const todayStr = format(now, 'yyyy-MM-dd');
          const yesterdayStr = format(subDays(now, 1), 'yyyy-MM-dd');
          const last7Days = [...Array(7)].map((_, i) => subDays(now, 6 - i));
          let usersThisWeek = 0;
          let mapsThisWeek = 0;
          for (const day of last7Days) {
            const dayStr = format(day, 'yyyy-MM-dd');
            const dayData = heatmapDays.find(d => d.date === dayStr);
            if (dayData) {
              usersThisWeek += dayData.newUsers;
              mapsThisWeek += dayData.newMaps;
            }
          }
          setIsMonthLoading(false);
          setMetrics(prev => prev ? { 
            ...prev, 
            heatmapDays, 
            newUsersToday: 0,
            newUsersYesterday: 0,
            newMapsToday: 0,
            newMapsYesterday: 0,
            usersThisWeek,
            mapsThisWeek,
            isLoading: false 
          } : null);
          return;
        }
      }

      const usersSnap = await getDocs(collection(firestore, 'users'));
      const allUsers = usersSnap.docs;
      const totalUsers = allUsers.length;

      heatmapDays = monthDays.map(day => ({
        date: format(day, 'yyyy-MM-dd'),
        newUsers: 0,
        newMaps: 0,
        newSubMaps: 0,
        activeUsers: 0,
        publicMaps: 0,
        privateMaps: 0,
      }));

      for (const userDoc of allUsers) {
        const userData = userDoc.data();
        const createdAt = userData.createdAt;
        if (createdAt) {
          let userDate: Date | null = null;
          if (createdAt.toDate) {
            userDate = createdAt.toDate();
          } else if (typeof createdAt === 'number') {
            userDate = new Date(createdAt);
          } else if (typeof createdAt === 'string') {
            userDate = new Date(createdAt);
          }
          if (userDate) {
            const userDateStr = format(userDate, 'yyyy-MM-dd');
            const dayIdx = heatmapDays.findIndex(d => d.date === userDateStr);
            if (dayIdx >= 0) heatmapDays[dayIdx].newUsers++;
          }
        }
        
        const lastActive = userData.statistics?.lastActiveDate;
        if (lastActive) {
          const activeDate = format(new Date(lastActive), 'yyyy-MM-dd');
          const dayIdx = heatmapDays.findIndex(d => d.date === activeDate);
          if (dayIdx >= 0) heatmapDays[dayIdx].activeUsers++;
        }
      }

      for (const userDoc of allUsers) {
        try {
          const userMapsSnap = await getDocs(collection(firestore, `users/${userDoc.id}/mindmaps`));
          for (const mapDoc of userMapsSnap.docs) {
            const mapData = mapDoc.data();
            const mapDate = mapData.timestamp ? format(mapData.timestamp.toDate(), 'yyyy-MM-dd') : null;
            if (mapDate) {
              const dayIdx = heatmapDays.findIndex(d => d.date === mapDate);
              if (dayIdx >= 0) {
                heatmapDays[dayIdx].newMaps++;
                if (mapData.isSubMap) heatmapDays[dayIdx].newSubMaps++;
                if (mapData.isPublic) {
                  heatmapDays[dayIdx].publicMaps++;
                } else {
                  heatmapDays[dayIdx].privateMaps++;
                }
              }
            }
          }
        } catch (e) {}
      }

      if (!isCurrentMonth) {
        await setDoc(doc(firestore, 'monthlyStats', monthKey), {
          month: monthKey,
          heatmapDays,
          updatedAt: new Date()
        });
      }

      let newUsersToday = 0;
      let newUsersYesterday = 0;
      let usersThisWeek = 0;
      const todayStr = format(now, 'yyyy-MM-dd');
      const yesterdayStr = format(subDays(now, 1), 'yyyy-MM-dd');
      
      const last7Days = [...Array(7)].map((_, i) => subDays(now, 6 - i));
      
      for (const userDoc of allUsers) {
        const userData = userDoc.data();
        const createdAt = userData.createdAt;
        if (createdAt) {
          let userDate: Date | null = null;
          if (createdAt.toDate) {
            userDate = createdAt.toDate();
          } else if (typeof createdAt === 'number') {
            userDate = new Date(createdAt);
          } else if (typeof createdAt === 'string') {
            userDate = new Date(createdAt);
          }
          if (userDate) {
            const userDateStr = format(userDate, 'yyyy-MM-dd');
            if (userDateStr === todayStr) newUsersToday++;
            if (userDateStr === yesterdayStr) newUsersYesterday++;
            const isInLast7Days = last7Days.some(d => format(d, 'yyyy-MM-dd') === userDateStr);
            if (isInLast7Days) usersThisWeek++;
          }
        }
      }
      
      newUsersToday = heatmapDays.find(d => d.date === todayStr)?.newUsers || newUsersToday;
      newUsersYesterday = heatmapDays.find(d => d.date === yesterdayStr)?.newUsers || newUsersYesterday;

      const activeUsers24h = allUsers.filter(u => {
        const lastActive = u.data().statistics?.lastActiveDate;
        if (!lastActive) return false;
        return new Date(lastActive) >= subHours(now, 24);
      }).length;

      const latestUsers = allUsers
        .filter(u => u.data().createdAt)
        .sort((a, b) => {
          const aTime = a.data().createdAt?.toMillis() || 0;
          const bTime = b.data().createdAt?.toMillis() || 0;
          return bTime - aTime;
        })
        .slice(0, 6)
        .map(doc => ({ id: doc.id, ...doc.data() }));

      const topUsers: any[] = allUsers
        .map(doc => {
          const userData = doc.data() as any;
          const activity = userData.activity || {};
          
          let mapsLast7Days = 0;
          let mapsLast30Days = 0;
          
          for (const [date, data] of Object.entries(activity)) {
            const dayData = data as any;
            const activityDate = new Date(date);
            const daysDiff = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysDiff < 7 && dayData?.mapsCreated) {
              mapsLast7Days += dayData.mapsCreated;
            }
            if (daysDiff < 30 && dayData?.mapsCreated) {
              mapsLast30Days += dayData.mapsCreated;
            }
          }
          
          return {
            id: doc.id,
            ...userData,
            _computed: {
              mapsLast7Days,
              mapsLast30Days
            }
          };
        })
        .sort((a: any, b: any) => {
          const aStat = a.statistics?.totalMapsCreated || 0;
          const bStat = b.statistics?.totalMapsCreated || 0;
          return bStat - aStat;
        })
        .slice(0, 20);

      const mapsSnap = await getDocs(
        query(collection(firestore, 'publicMindmaps'), orderBy('timestamp', 'desc'), limit(100))
      );
      const allMaps = mapsSnap.docs;
      const totalMaps = stats?.totalMaps || allMaps.length;

      let newMapsToday = 0;
      let newMapsYesterday = 0;
      let mapsThisWeek = 0;

      newMapsToday = heatmapDays.find(d => d.date === todayStr)?.newMaps || 0;
      newMapsYesterday = heatmapDays.find(d => d.date === yesterdayStr)?.newMaps || 0;
      
      for (const day of last7Days) {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayData = heatmapDays.find(d => d.date === dayStr);
        if (dayData) mapsThisWeek += dayData.newMaps;
      }

      const latestMaps = allMaps.slice(0, 6).map(doc => ({ id: doc.id, ...doc.data() }));

      const topMaps = [...allMaps]
        .sort((a, b) => (b.data().views || 0) - (a.data().views || 0))
        .slice(0, 5)
        .map(doc => ({ id: doc.id, ...doc.data() }));

      const liveActivities: { id: string; type: 'user' | 'map'; message: string; timestamp: Date }[] = [];
      
      latestUsers.slice(0, 3).forEach((u: any) => {
        if (u.createdAt) {
          liveActivities.push({
            id: `user-${u.id}`,
            type: 'user',
            message: `${u.displayName || 'A user'} joined MindScape`,
            timestamp: u.createdAt.toDate()
          });
        }
      });
      
      latestMaps.slice(0, 3).forEach((m: any) => {
        if (m.timestamp) {
          liveActivities.push({
            id: `map-${m.id}`,
            type: 'map',
            message: `"${m.title || m.topic || 'Untitled'}" was published`,
            timestamp: m.timestamp.toDate()
          });
        }
      });
      
      liveActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      const avgMapsPerUser = totalUsers > 0 ? ((stats?.totalMindmaps || totalMaps) / totalUsers).toFixed(1) : '0';
      const avgChatsPerUser = stats?.totalChats && totalUsers > 0 
        ? (stats.totalChats / totalUsers).toFixed(1) 
        : '0';
      
      const engagementRate = totalUsers > 0 
        ? ((activeUsers24h / totalUsers) * 100).toFixed(1) 
        : '0';

      // Fetch map analytics
      const mapAnalytics = await fetchMapAnalytics(firestore, allUsers);

      setMetrics({
        newUsersToday,
        newUsersYesterday,
        newMapsToday,
        newMapsYesterday,
        activeUsers24h,
        activeUsers48h: 0,
        engagementRate: parseFloat(engagementRate as string),
        usersThisWeek,
        usersLastWeek: 0,
        mapsThisWeek,
        mapsLastWeek: 0,
        avgMapsPerUser: parseFloat(avgMapsPerUser as string),
        avgChatsPerUser: parseFloat(avgChatsPerUser as string),
        latestUsers,
        latestMaps,
        usersLast7Days: last7Days.map(d => ({ date: format(d, 'yyyy-MM-dd'), count: heatmapDays.find(h => h.date === format(d, 'yyyy-MM-dd'))?.newUsers || 0 })),
        mapsLast7Days: last7Days.map(d => ({ date: format(d, 'yyyy-MM-dd'), count: heatmapDays.find(h => h.date === format(d, 'yyyy-MM-dd'))?.newMaps || 0 })),
        topUsers,
        topMaps,
        heatmapDays,
        liveActivities,
        mapAnalytics,
        isLoading: false
      });
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      setMetrics(prev => prev ? { ...prev, isLoading: false } : null);
    } finally {
      setIsMonthLoading(false);
      isDashboardFetchInProgress.current = false;
    }
  }

  async function fetchMapAnalytics(firestore: any, allUsers: any[]) {
    const modeCounts = { single: 0, compare: 0, multi: 0 };
    const depthCounts = { low: 0, medium: 0, deep: 0, unspecified: 0 };
    const sourceCounts: Record<string, number> = {};
    const personaCounts: Record<string, number> = {
      Teacher: 0,
      Concise: 0,
      Creative: 0,
      Sage: 0,
    };
    const userStatsMap: Record<string, UserContributionStats> = {};
    let totalSubMaps = 0;
    const parentMapIds = new Set<string>();
    let publicCount = 0;
    let privateCount = 0;
    let totalNodes = 0;
    let featuredCount = 0;
    let mapCount = 0;

    for (const userDoc of allUsers) {
      const userId = userDoc.id;
      userStatsMap[userId] = {
        userId,
        displayName: userDoc.displayName || userDoc.email || 'User',
        photoURL: userDoc.photoURL,
        totalMaps: 0,
        singleMaps: 0,
        compareMaps: 0,
        multiMaps: 0,
        lowDepthMaps: 0,
        mediumDepthMaps: 0,
        deepDepthMaps: 0,
        textSourceMaps: 0,
        pdfSourceMaps: 0,
        websiteSourceMaps: 0,
        youtubeSourceMaps: 0,
        imageSourceMaps: 0,
        publicMaps: 0
      };

      try {
        const userMapsSnap = await getDocs(
          collection(firestore, `users/${userId}/mindmaps`)
        );
        
        for (const mapDoc of userMapsSnap.docs) {
          const mapData = mapDoc.data();
          mapCount++;
          userStatsMap[userId].totalMaps++;
          
          // Mode counts
          if (mapData.mode === 'single') {
            modeCounts.single++;
            userStatsMap[userId].singleMaps++;
          } else if (mapData.mode === 'compare') {
            modeCounts.compare++;
            userStatsMap[userId].compareMaps++;
          } else {
            modeCounts.multi++;
            userStatsMap[userId].multiMaps++;
          }
          
          // Depth counts
          if (mapData.depth === 'low') {
            depthCounts.low++;
            userStatsMap[userId].lowDepthMaps++;
          } else if (mapData.depth === 'medium') {
            depthCounts.medium++;
            userStatsMap[userId].mediumDepthMaps++;
          } else if (mapData.depth === 'deep') {
            depthCounts.deep++;
            userStatsMap[userId].deepDepthMaps++;
          } else {
            depthCounts.unspecified++;
          }
          
          // Source type counts
          const sourceType = mapData.sourceFileType || mapData.sourceType || 'text';
          sourceCounts[sourceType] = (sourceCounts[sourceType] || 0) + 1;
          
          if (sourceType === 'text' || sourceType === 'document') {
            userStatsMap[userId].textSourceMaps++;
          } else if (sourceType === 'pdf') {
            userStatsMap[userId].pdfSourceMaps++;
          } else if (sourceType === 'website') {
            userStatsMap[userId].websiteSourceMaps++;
          } else if (sourceType === 'youtube') {
            userStatsMap[userId].youtubeSourceMaps++;
          } else if (sourceType === 'image') {
            userStatsMap[userId].imageSourceMaps++;
          }
          
          // Persona counts - normalize to expected keys
          const rawPersona = mapData.aiPersona;
          let persona = 'Teacher';
          const normalizedRaw = (rawPersona || '').toLowerCase().trim();
          if (normalizedRaw === 'teacher' || normalizedRaw === 'standard' || normalizedRaw === '' || !rawPersona) {
            persona = 'Teacher';
          } else if (normalizedRaw === 'concise') {
            persona = 'Concise';
          } else if (normalizedRaw === 'creative') {
            persona = 'Creative';
          } else if (normalizedRaw === 'sage' || normalizedRaw === 'cognitive sage' || normalizedRaw === 'cognitive' || normalizedRaw.includes('sage')) {
            persona = 'Sage';
          } else {
            // Unknown persona - log for debugging
            console.log('Admin Debug - Unknown persona found:', rawPersona);
            persona = 'Teacher'; // Default to Teacher for unknown values
          }
          personaCounts[persona] = (personaCounts[persona] || 0) + 1;
          
          // Sub-map stats
          if (mapData.isSubMap) {
            totalSubMaps++;
            if (mapData.parentMapId) parentMapIds.add(mapData.parentMapId);
          }
          
          // Public/Private
          if (mapData.isPublic) {
            publicCount++;
            userStatsMap[userId].publicMaps++;
          } else {
            privateCount++;
          }
          
          // Nodes
          totalNodes += mapData.nodeCount || 0;
          
          // Featured
          if (mapData.isFeatured) featuredCount++;
        }
      } catch (e) {
        // Skip users without access
      }
    }

    // Find top persona
    const topPersona = Object.entries(personaCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Teacher';

    console.log('Admin Debug - Total maps analyzed:', mapCount);
    console.log('Admin Debug - Persona counts:', personaCounts);

    const userStats = Object.values(userStatsMap).sort((a, b) => b.totalMaps - a.totalMaps);

    return {
      totalAnalyzed: mapCount,
      modeCounts,
      depthCounts,
      sourceCounts,
      personaCounts,
      subMapStats: {
        total: totalSubMaps,
        parents: parentMapIds.size,
        avgPerParent: parentMapIds.size > 0 ? (totalSubMaps / parentMapIds.size).toFixed(1) : '0'
      },
      publicPrivate: { public: publicCount, private: privateCount },
      avgNodesPerMap: mapCount > 0 ? (totalNodes / mapCount).toFixed(1) : '0',
      featuredCount,
      topPersona,
      userStats
    };
  }

  async function autoSyncStats() {
    if (!firestore) return;
    setIsSyncing(true);
    try {
      const now = new Date();
      const timestampId = now.toISOString();
      const dateStr = timestampId.split('T')[0];
      
      const statsRef = collection(firestore, 'adminStats');
      
      let usersSnap, mapsSnap, chatsSnap;
      try {
        [usersSnap, mapsSnap, chatsSnap] = await Promise.all([
          getCountFromServer(collection(firestore, 'users')),
          getCountFromServer(collection(firestore, 'publicMindmaps')),
          getCountFromServer(collectionGroup(firestore, 'chatSessions')),
        ]);
      } catch (countError: any) {
        console.error('Count error:', countError);
        alert(`Count query failed: ${countError?.message}. Check Firestore indexes.`);
        return;
      }

      // Count total mindmaps from all users
      let totalMindmaps = 0;
      let totalMindmapsEverCreated = 0;
      try {
        const usersData = await getDocs(collection(firestore, 'users'));
        const mindmapPromises = usersData.docs.slice(0, 50).map(async (userDoc) => {
          try {
            const userMapsSnap = await getCountFromServer(
              collection(firestore, `users/${userDoc.id}/mindmaps`)
            );
            return { currentCount: userMapsSnap.data().count, userData: userDoc.data() };
          } catch {
            return { currentCount: 0, userData: {} };
          }
        });
        const results = await Promise.all(mindmapPromises);
        for (const result of results) {
          totalMindmaps += result.currentCount;
          totalMindmapsEverCreated += result.userData?.statistics?.totalMapsCreated || 0;
        }
      } catch (e) {
        console.error('Error counting total mindmaps:', e);
      }
      
      setTotalMindmapsEver(totalMindmapsEverCreated);

      const counts = {
        date: dateStr,
        timestamp: timestampId,
        totalUsers: usersSnap.data().count,
        totalMaps: mapsSnap.data().count,
        totalMindmaps: totalMindmaps,
        totalChats: chatsSnap.data().count,
        dailyActiveUsers: usersSnap.data().count,
      };

      await setDoc(doc(statsRef, timestampId), counts);
      setStats(counts as unknown as AdminStats);

      const allDocs = await getDocs(statsRef);
      const docsSorted = allDocs.docs.sort((a, b) => {
        const aTime = a.data().timestamp || a.data().date || a.id;
        const bTime = b.data().timestamp || b.data().date || b.id;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      if (docsSorted.length > 5) {
        const docsToDelete = docsSorted.slice(5);
        for (const d of docsToDelete) {
          await deleteDoc(d.ref);
        }
      }
    } catch (error) {
      console.error('Error auto-syncing stats:', error);
    } finally {
      setIsSyncing(false);
      setIsLoading(false);
    }
  }

  if (isUserLoading || (isAdmin && isLoading)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const navItems = [
    { id: 'dashboard' as AdminTab, label: 'Dashboard', icon: Brain, desc: 'System overview and metrics' },
    { id: 'users' as AdminTab, label: 'Users', icon: Users, desc: 'Manage user accounts and data' },
    { id: 'moderation' as AdminTab, label: 'Moderation', icon: ShieldAlert, desc: 'Review public content' },
    { id: 'logs' as AdminTab, label: 'Activity Log', icon: Activity, desc: 'Real-time activity feed' },
  ];

  return (
    <div className="h-[calc(100vh-80px)] bg-zinc-950 text-zinc-100 flex overflow-hidden selection:bg-violet-500/30 font-sans">
      {/* Background Layer */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] left-[10%] w-[40%] h-[40%] bg-violet-600/10 blur-[120px] rounded-full animate-pulse duration-[10s]" />
        <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse duration-[15s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_0%,transparent_70%)] opacity-50" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />
      </div>

      {/* Sidebar */}
      <aside className="hidden lg:flex w-85 border-r border-white/5 bg-zinc-950/40 backdrop-blur-3xl flex-col z-20 relative h-full">
        <div className="p-8 flex flex-col h-full overflow-hidden">
          {/* Admin Identity Card */}
          <div className="mb-10 shrink-0">
            <div className="relative group p-6 rounded-[2.5rem] bg-white/5 border border-white/10 backdrop-blur-2xl shadow-2xl overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 blur-2xl rounded-full -translate-y-8 translate-x-8" />
              
              <div className="flex items-center gap-5 mb-6 relative z-10">
                <div className="relative group/avatar">
                  <div className="absolute inset-0 bg-gradient-to-tr from-violet-500 to-fuchsia-500 rounded-2xl blur-md opacity-40 group-hover/avatar:opacity-80 transition-opacity" />
                  <div className="h-16 w-16 rounded-2xl border-2 border-white/10 p-0.5 relative z-10 bg-zinc-900 flex items-center justify-center">
                    <ShieldAlert className="h-7 w-7 text-violet-400" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xl font-black text-white truncate tracking-tight">Admin Console</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
                    <p className="text-[10px] text-violet-400 font-black uppercase tracking-wider">Mode Active</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 relative z-10">
                <div className="p-3 bg-black/30 rounded-2xl border border-white/5 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-0.5">Admin ID</p>
                    <p className="text-[9px] font-mono text-zinc-400 truncate w-32">{user?.uid?.substring(0, 12)}...</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-xl hover:bg-white/10 text-zinc-500 hover:text-white transition-all shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(user?.uid || '');
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-2.5 flex-1 pr-2 custom-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`
                    w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 relative group
                    ${isActive
                      ? 'bg-white/5 text-white border border-white/10 shadow-xl'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}
                  `}
                >
                  {isActive && (
                    <div className="absolute left-0 w-1.5 h-6 bg-violet-500 rounded-r-full shadow-[0_0_15px_rgba(139,92,246,0.5)]" />
                  )}
                  <div className={`
                    p-2.5 rounded-xl transition-all duration-500
                    ${isActive ? 'bg-violet-500/20 text-violet-400 shadow-inner' : 'bg-transparent'}
                  `}>
                    <Icon className={`h-5 w-5 ${isActive ? 'scale-110' : 'group-hover:text-zinc-300'}`} />
                  </div>
                  <div className="text-left">
                    <p className={`text-sm font-black tracking-tight ${isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                      {item.label}
                    </p>
                  </div>
                  {isActive && <ChevronRight className="h-4 w-4 ml-auto text-violet-500/50" />}
                </button>
              );
            })}
          </nav>

          {/* Footer Actions */}
          <div className="pt-8 border-t border-white/5 space-y-3">
            {isSyncing && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-violet-500/10 border border-violet-500/20">
                <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
                <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest">Syncing...</p>
              </div>
            )}
            <button
              onClick={() => router.push('/')}
              className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 group text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
            >
              <div className="p-2.5 rounded-xl transition-all bg-white/5">
                <ArrowLeft className="h-5 w-5" />
              </div>
              <p className="text-sm font-black tracking-tight uppercase">Exit Admin</p>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative z-10 custom-scrollbar">
        <div className="max-w-6xl mx-auto px-6 py-8 lg:px-10">
          {/* Header Stage */}
          <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-20">
            <div className="flex items-center justify-between md:block w-full md:w-auto">
              <div className="md:hidden">
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 text-zinc-400">
                  <Menu className="h-5 w-5" />
                </Button>
              </div>
              <div className="hidden md:block">
                <div className="flex items-center gap-2 text-violet-400 font-black text-[9px] uppercase tracking-[0.3em] mb-3">
                  <span className="opacity-50">Admin Core</span>
                  <ChevronRight className="h-2.5 w-2.5 opacity-30" />
                  <span className="px-2 py-0.5 bg-violet-500/10 rounded-full border border-violet-500/20 text-violet-300">
                    {navItems.find(i => i.id === activeTab)?.label?.toUpperCase()}
                  </span>
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white mb-2 leading-none">
                {navItems.find(i => i.id === activeTab)?.label}
              </h1>
              <p className="hidden md:block text-zinc-500 font-bold text-xs max-w-md leading-relaxed">
                {navItems.find(i => i.id === activeTab)?.desc}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                className="group h-11 px-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all shadow-xl font-black text-[9px] uppercase tracking-[0.15em]"
                onClick={() => {
                  handleForceRefresh();
                }}
                disabled={isSyncing || (metrics?.isLoading ?? false)}
                title="Force full refresh"
              >
                {isSyncing || (metrics?.isLoading ?? false) ? (
                  <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 group-hover:rotate-180 transition-transform duration-700" />
                )}
                <span className="ml-2">Refresh</span>
              </Button>
            </div>
          </header>

          {/* Content Sections */}
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="space-y-10 pb-20">
                
                {/* Loading State */}
                {metrics?.isLoading ? (
                  <>
                    {/* Health Score + Primary Stats Skeleton */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      <HealthScoreSkeleton />
                      <StatCardSkeleton />
                      <StatCardSkeleton />
                      <StatCardSkeleton />
                      <StatCardSkeleton />
                      <StatCardSkeleton />
                    </div>

                    {/* Row 2 Skeleton */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      <StatCardSkeleton />
                      <StatCardSkeleton />
                      <StatCardSkeleton />
                      <StatCardSkeleton />
                      <StatCardSkeleton />
                    </div>

                    {/* Heatmap Skeleton */}
                    <HeatmapSkeleton />

                    {/* Row 2: Mode + Depth Skeletons */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <AnalyticsCardSkeleton variant="mode" />
                      <AnalyticsCardSkeleton variant="depth" />
                    </div>

                    {/* Row 3: Source Types Skeleton */}
                    <AnalyticsCardSkeleton variant="source" />

                    {/* Row 4: Sub-Maps + Public vs Private Skeletons */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <AnalyticsCardSkeleton variant="submaps" />
                      <AnalyticsCardSkeleton variant="public" />
                    </div>

                    {/* Row 5: Persona + Top Contributors Skeletons */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <AnalyticsCardSkeleton variant="persona" />
                      <TopContributorsSkeleton />
                    </div>
                  </>
                ) : (
                  <>
                    {/* Health Score + Primary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      {/* Health Score Widget */}
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

                      {/* Users - Violet */}
                      <div className="rounded-xl bg-violet-500/5 border border-violet-500/15 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 bg-violet-500/10 rounded-lg">
                            <Users className="h-3.5 w-3.5 text-violet-400" />
                          </div>
                          <span className="text-[8px] font-bold uppercase tracking-wider text-violet-400/70">Users</span>
                        </div>
                        <p className="text-2xl font-black text-white tracking-tight">{(stats?.totalUsers || 0).toLocaleString()}</p>
                      </div>

                      {/* Public - Indigo */}
                      <div className="rounded-xl bg-indigo-500/5 border border-indigo-500/15 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 bg-indigo-500/10 rounded-lg">
                            <MapIcon className="h-3.5 w-3.5 text-indigo-400" />
                          </div>
                          <span className="text-[8px] font-bold uppercase tracking-wider text-indigo-400/70">Public</span>
                        </div>
                        <p className="text-2xl font-black text-white tracking-tight">{(stats?.totalMaps || 0).toLocaleString()}</p>
                      </div>

                      {/* Total Mindmaps - Blue */}
                      <div className="rounded-xl bg-blue-500/5 border border-blue-500/15 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 bg-blue-500/10 rounded-lg">
                            <Layers className="h-3.5 w-3.5 text-blue-400" />
                          </div>
                          <span className="text-[8px] font-bold uppercase tracking-wider text-blue-400/70">Total Mindmaps</span>
                        </div>
                        <p className="text-2xl font-black text-white tracking-tight">{totalMindmapsEver.toLocaleString()}</p>
                        <span className="text-[7px] text-zinc-500 mt-1 block">Including deleted</span>
                      </div>

                      {/* Current Mindmaps - Green */}
                      <div className="rounded-xl bg-green-500/5 border border-green-500/15 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 bg-green-500/10 rounded-lg">
                            <MapIcon className="h-3.5 w-3.5 text-green-400" />
                          </div>
                          <span className="text-[8px] font-bold uppercase tracking-wider text-green-400/70">Current Mindmaps</span>
                        </div>
                        <p className="text-2xl font-black text-white tracking-tight">{(stats?.totalMindmaps || 0).toLocaleString()}</p>
                        <span className="text-[7px] text-zinc-500 mt-1 block">Currently available</span>
                      </div>

                      {/* Active 24h - Yellow */}
                      <div className="rounded-xl bg-yellow-500/5 border border-yellow-500/15 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 bg-yellow-500/10 rounded-lg">
                            <Zap className="h-3.5 w-3.5 text-yellow-400" />
                          </div>
                          <span className="text-[8px] font-bold uppercase tracking-wider text-yellow-400/70">Active 24h</span>
                        </div>
                        <p className="text-2xl font-black text-white tracking-tight">{metrics?.activeUsers24h ?? 0}</p>
                      </div>
                    </div>

                {/* Row 2: Additional Stats - VIBGYOR */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {/* Engagement - Violet */}
                  <div className="rounded-xl bg-violet-500/5 border border-violet-500/15 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-1.5 bg-violet-500/10 rounded-lg">
                        <ActivityIcon className="h-3.5 w-3.5 text-violet-400" />
                      </div>
                      <span className="text-[8px] font-bold uppercase tracking-wider text-violet-400/70">Engagement</span>
                    </div>
                    <p className="text-2xl font-black text-white tracking-tight">{metrics?.engagementRate ?? 0}%</p>
                  </div>

                  {/* New Users - Indigo */}
                  <div className="rounded-xl bg-indigo-500/5 border border-indigo-500/15 p-4">
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
                      <span className="text-[7px] text-zinc-500">{metrics?.newUsersYesterday ?? 0} yesterday</span>
                    </div>
                  </div>

                  {/* New Maps - Blue */}
                  <div className="rounded-xl bg-blue-500/5 border border-blue-500/15 p-4">
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
                      <span className="text-[7px] text-zinc-500">{metrics?.newMapsYesterday ?? 0} yesterday</span>
                    </div>
                  </div>

                  {/* Maps/User - Green */}
                  <div className="rounded-xl bg-green-500/5 border border-green-500/15 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-1.5 bg-green-500/10 rounded-lg">
                        <TrendingUp className="h-3.5 w-3.5 text-green-400" />
                      </div>
                      <span className="text-[8px] font-bold uppercase tracking-wider text-green-400/70">Maps/User</span>
                    </div>
                    <p className="text-2xl font-black text-white tracking-tight">{metrics?.avgMapsPerUser?.toFixed(1) ?? 0}</p>
                  </div>

                  {/* Chats/User - Yellow */}
                  <div className="rounded-xl bg-yellow-500/5 border border-yellow-500/15 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-1.5 bg-yellow-500/10 rounded-lg">
                        <BarChart3 className="h-3.5 w-3.5 text-yellow-400" />
                      </div>
                      <span className="text-[8px] font-bold uppercase tracking-wider text-yellow-400/70">Chats/User</span>
                    </div>
                    <p className="text-2xl font-black text-white tracking-tight">{metrics?.avgChatsPerUser?.toFixed(1) ?? 0}</p>
                  </div>

                  {/* Avg Nodes - Orange */}
                  <div className="rounded-xl bg-orange-500/5 border border-orange-500/15 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-1.5 bg-orange-500/10 rounded-lg">
                        <Layers className="h-3.5 w-3.5 text-orange-400" />
                      </div>
                      <span className="text-[8px] font-bold uppercase tracking-wider text-orange-400/70">Avg Nodes</span>
                    </div>
                    <p className="text-2xl font-black text-white tracking-tight">{metrics?.mapAnalytics?.avgNodesPerMap ?? 0}</p>
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
                      {metrics?.heatmapDays.map((day) => {
                          const totalActivity = day.newUsers + day.newMaps + day.newSubMaps + day.activeUsers;
                          const intensity = totalActivity === 0 ? 'bg-zinc-800' : totalActivity <= 2 ? 'bg-violet-900/60' : totalActivity <= 5 ? 'bg-violet-700/70' : totalActivity <= 10 ? 'bg-violet-500' : 'bg-violet-400';
                          const isToday = format(new Date(), 'yyyy-MM-dd') === day.date;
                          return (
                            <Tooltip key={day.date}>
                              <TooltipTrigger asChild>
                                <div className={`aspect-square flex flex-col items-center justify-center rounded-sm ${intensity} hover:ring-2 hover:ring-violet-400/50 transition-all cursor-default ${isToday ? 'ring-2 ring-white/30' : ''}`}>
                                  <span className="text-[7px] text-white/70 font-bold">{format(new Date(day.date), 'd')}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="bg-zinc-900 border-zinc-700 text-[10px] font-bold p-3 min-w-[180px]">
                                <p className="text-zinc-300 font-black mb-2 border-b border-zinc-700 pb-1">{format(new Date(day.date), 'EEEE, MMMM d, yyyy')}</p>
                                <div className="space-y-1">
                                  <p className="text-blue-400 flex items-center gap-2"><Users className="h-3 w-3" /> {day.newUsers} new user{day.newUsers !== 1 ? 's' : ''}</p>
                                  <p className="text-violet-400 flex items-center gap-2"><MapIcon className="h-3 w-3" /> {day.newMaps} new map{day.newMaps !== 1 ? 's' : ''}</p>
                                  <p className="text-pink-400 flex items-center gap-2"><Layers className="h-3 w-3" /> {day.newSubMaps} sub-map{day.newSubMaps !== 1 ? 's' : ''}</p>
                                  <p className="text-emerald-400 flex items-center gap-2"><Zap className="h-3 w-3" /> {day.activeUsers} active user{day.activeUsers !== 1 ? 's' : ''}</p>
                                  <p className="text-amber-400 flex items-center gap-2"><Globe className="h-3 w-3" /> {day.publicMaps} public / {day.privateMaps} private</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </TooltipProvider>
                  </div>

                  {/* Row 4: Map Analytics Section - Professional UI */}
                  <div className="space-y-6">
                  {/* Section Header with Overview Stats */}
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
                    {metrics?.mapAnalytics && (
                      <div className="flex items-center gap-4 px-4 py-2 bg-gradient-to-r from-violet-500/10 to-indigo-500/10 rounded-xl border border-violet-500/20">
                        <div className="text-center">
                          <p className="text-lg font-black text-white">{metrics.mapAnalytics.totalAnalyzed.toLocaleString()}</p>
                          <p className="text-[8px] text-violet-400/70 font-bold uppercase">Total Mindmap</p>
                        </div>
                        <div className="w-px h-8 bg-violet-500/20" />
                        <div className="text-center">
                          <p className="text-lg font-black text-blue-400">{metrics.mapAnalytics.topPersona || 'N/A'}</p>
                          <p className="text-[8px] text-blue-400/70 font-bold uppercase">Top Persona</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Row 4a: Mode & Depth - Combined (7 cards) */}
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
                        {metrics?.mapAnalytics ? (
                          <div className="grid grid-cols-3 gap-3">
                            {([
                              { key: 'single', label: 'Single', value: metrics.mapAnalytics!.modeCounts.single, color: 'violet', icon: FileText },
                              { key: 'compare', label: 'Compare', value: metrics.mapAnalytics!.modeCounts.compare, color: 'indigo', icon: Copy },
                              { key: 'multi', label: 'Multi', value: metrics.mapAnalytics!.modeCounts.multi, color: 'blue', icon: Layers },
                            ] as const).map(({ key, label, value, color, icon: Icon }) => {
                              const total = metrics.mapAnalytics!.totalAnalyzed || 1;
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
                        {metrics?.mapAnalytics ? (
                          <div className="grid grid-cols-3 gap-3">
                            {([
                              { key: 'low', label: 'Quick', value: (metrics.mapAnalytics!.depthCounts.low || 0) + (metrics.mapAnalytics!.depthCounts.unspecified || 0), color: 'emerald', icon: Zap },
                              { key: 'medium', label: 'Balanced', value: metrics.mapAnalytics!.depthCounts.medium, color: 'yellow', icon: Layers },
                              { key: 'deep', label: 'Detailed', value: metrics.mapAnalytics!.depthCounts.deep, color: 'orange', icon: Layers },
                            ] as const).map(({ key, label, value, color, icon: Icon }) => {
                              const total = metrics.mapAnalytics!.totalAnalyzed || 1;
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

                  {/* Row 4c: Source Types - Card Style */}
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
                      {metrics?.mapAnalytics ? (
                        <div className="grid grid-cols-6 gap-3">
                          {Object.entries(metrics.mapAnalytics.sourceCounts)
                            .sort(([, a], [, b]) => b - a)
                            .map(([source, count], index) => {
                              const getSourceConfig = (src: string) => {
                                switch (src) {
                                  case 'pdf': return { icon: FileText, label: 'PDF' };
                                  case 'text':
                                  case 'document': return { icon: FileText, label: 'Text' };
                                  case 'website': return { icon: Globe, label: 'Website' };
                                  case 'image': return { icon: ImageIcon, label: 'Image' };
                                  case 'youtube':
                                  case 'youtube_short': return { icon: Youtube, label: 'YouTube' };
                                  default: return { icon: FileText, label: src };
                                }
                              };
                              const vibgyor = ['violet', 'indigo', 'blue', 'emerald', 'yellow', 'orange', 'red'];
                              const color = vibgyor[index % vibgyor.length];
                              const config = getSourceConfig(source);
                              const Icon = config.icon;
                              const total = metrics.mapAnalytics!.totalAnalyzed || 1;
                              const percentage = Math.round((count / total) * 100);
                              
                              return (
                                <div 
                                  key={source} 
                                  className={`rounded-xl bg-${color}-500/5 border border-${color}-500/15 p-4 transition-all hover:bg-${color}-500/10`}
                                >
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className={`p-1.5 bg-${color}-500/10 rounded-lg`}>
                                      <Icon className={`h-3.5 w-3.5 text-${color}-400`} />
                                    </div>
                                    <span className="text-[8px] font-bold uppercase tracking-wider text-${color}-400/70">{config.label}</span>
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

                  {/* Row 4d: Sub-Maps & Public vs Private - Combined */}
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
                        {metrics?.mapAnalytics ? (
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { label: 'Sub-Maps', value: metrics.mapAnalytics.subMapStats.total, color: 'violet', icon: Layers },
                              { label: 'Parents', value: metrics.mapAnalytics.subMapStats.parents, color: 'indigo', icon: MapIcon },
                              { label: 'Avg/Parent', value: metrics.mapAnalytics.subMapStats.avgPerParent, color: 'blue', icon: TrendingUp },
                            ].map(({ label, value, color, icon: Icon }) => (
                              <div key={label} className={`rounded-xl bg-${color}-500/5 border border-${color}-500/15 p-4 transition-all hover:bg-${color}-500/10`}>
                                <div className="flex items-center gap-2 mb-2">
                                  <div className={`p-1.5 bg-${color}-500/10 rounded-lg`}>
                                    <Icon className={`h-3.5 w-3.5 text-${color}-400`} />
                                  </div>
                                  <span className="text-[8px] font-bold uppercase tracking-wider text-${color}-400/70">{label}</span>
                                </div>
                                <div className="flex items-end justify-between">
                                  <p className="text-2xl font-black text-white tracking-tight">{typeof value === 'number' ? value.toLocaleString() : value}</p>
                                </div>
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
                        {metrics?.mapAnalytics ? (
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { label: 'Public', value: metrics.mapAnalytics.publicPrivate.public, color: 'emerald', icon: Unlock },
                              { label: 'Private', value: metrics.mapAnalytics.publicPrivate.private, color: 'yellow', icon: Lock },
                              { label: 'Public Rate', value: metrics.mapAnalytics.totalAnalyzed > 0 ? Math.round((metrics.mapAnalytics.publicPrivate.public / metrics.mapAnalytics.totalAnalyzed) * 100) : 0, color: 'orange', icon: TrendingUp, isPercent: true },
                            ].map(({ label, value, color, icon: Icon, isPercent }) => (
                              <div key={label} className={`rounded-xl bg-${color}-500/5 border border-${color}-500/15 p-4 transition-all hover:bg-${color}-500/10`}>
                                <div className="flex items-center gap-2 mb-2">
                                  <div className={`p-1.5 bg-${color}-500/10 rounded-lg`}>
                                    <Icon className={`h-3.5 w-3.5 text-${color}-400`} />
                                  </div>
                                  <span className="text-[8px] font-bold uppercase tracking-wider text-${color}-400/70">{label}</span>
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

                  {/* Row 4f: Persona (2x2) + Top Contributors */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Maps by Persona - 2x2 Grid */}
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
                        {metrics?.mapAnalytics?.personaCounts ? (
                          <div className="grid grid-cols-2 gap-3">
                            {([
                              { key: 'Teacher', label: 'Teacher', color: 'violet', icon: UserRound },
                              { key: 'Concise', label: 'Concise', color: 'indigo', icon: Zap },
                              { key: 'Creative', label: 'Creative', color: 'blue', icon: Palette },
                              { key: 'Sage', label: 'Cognitive Sage', color: 'emerald', icon: Brain },
                            ] as const).map(({ key, label, color, icon: Icon }) => {
                              const count = metrics.mapAnalytics?.personaCounts?.[key] || 0;
                              const total = metrics.mapAnalytics?.totalAnalyzed || 1;
                              const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                              
                              return (
                                <div key={key} className={`rounded-xl bg-${color}-500/5 border border-${color}-500/15 p-4 transition-all hover:bg-${color}-500/10`}>
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className={`p-1.5 bg-${color}-500/10 rounded-lg`}>
                                      <Icon className={`h-3.5 w-3.5 text-${color}-400`} />
                                    </div>
                                    <span className="text-[8px] font-bold uppercase tracking-wider text-${color}-400/70">{label}</span>
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

                    {/* Top Contributors - Right Side */}
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
                            const filtered = metrics?.topUsers?.sort((a: any, b: any) => {
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
                            }).slice(0, 5) || [];
                            
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
                                    {topContributorsStatFilter === 'totalMapsCreated' && <Flame className="h-3 w-3 text-orange-400" />}
                                    {topContributorsStatFilter === 'totalNodes' && <Layers className="h-3 w-3 text-blue-400" />}
                                    {topContributorsStatFilter === 'totalImagesGenerated' && <ImageIcon className="h-3 w-3 text-pink-400" />}
                                    {topContributorsStatFilter === 'currentStreak' && <Zap className="h-3 w-3 text-yellow-400" />}
                                    <span className="text-[10px] font-black text-orange-400">{displayValue}</span>
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
                  {/* Latest Users - Indigo */}
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
                              {u.createdAt ? formatDistanceToNow(toDate(u.createdAt), { addSuffix: true }) : 'Recently'}
                            </span>
                          </div>
                        </button>
                      ))}
                      {(!metrics?.latestUsers || metrics.latestUsers.length === 0) && (
                        <div className="col-span-4 py-8 text-center">
                          <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">No recent registrations</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Latest Maps - Blue */}
                  <div className="rounded-2xl bg-zinc-900/40 border border-white/5 overflow-hidden">
                    <div className="p-5 border-b border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/15">
                          <MapIcon className="h-4 w-4 text-blue-400" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-white">Latest Public Maps</h3>
                          <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">New community maps</p>
                        </div>
                      </div>
                      <button onClick={() => setActiveTab('moderation')} className="text-[9px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-widest transition-colors flex items-center gap-1">
                        View All <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4">
                      {metrics?.latestMaps.slice(0, 4).map((m) => (
                        <button
                          key={m.id}
                          onClick={() => window.open(`/map/${m.id}`, '_blank')}
                          className="rounded-xl p-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-blue-500/25 transition-all text-left"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                              <MapIcon className="h-5 w-5 text-blue-400" />
                            </div>
                            {m.isFeatured && (
                              <Badge className="shrink-0 bg-blue-500/20 text-blue-400 border-none text-[7px] font-black uppercase tracking-wider">
                                Prime
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs font-black text-white truncate mb-1">
                            {m.shortTitle || m.title || m.topic || 'Untitled'}
                          </p>
                          <p className="text-[9px] text-zinc-500 truncate mb-2">by {m.originalAuthorId || m.userId || 'Unknown'}</p>
                          <div className="flex items-center justify-between">
                            <Badge className="bg-zinc-800 text-zinc-400 border border-zinc-700 text-[7px] font-black">
                              {m.nodeCount || 0} nodes
                            </Badge>
                            <span className="text-[10px] text-zinc-600">
                              {m.timestamp ? formatDistanceToNow(toDate(m.timestamp), { addSuffix: true }) : 'Recently'}
                            </span>
                          </div>
                        </button>
                      ))}
                      {(!metrics?.latestMaps || metrics.latestMaps.length === 0) && (
                        <div className="col-span-4 py-8 text-center">
                          <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">No public maps yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                  </>
                )}
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="space-y-8 pb-20">
                <div className="relative">
                  <Users className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <input 
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    placeholder="Search users by name, email, or ID..."
                    className="w-full h-14 bg-zinc-900/60 border border-white/5 rounded-2xl pl-14 pr-6 text-sm font-medium text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/30 transition-all"
                  />
                </div>

                <div className="flex items-center justify-between flex-wrap gap-4">
                  <p className="text-sm font-black text-zinc-500">
                    {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <div className="flex gap-1 p-1 bg-zinc-800/50 rounded-lg">
                      {([
                        { key: 'latest', label: 'Latest' },
                        { key: 'oldest', label: 'Oldest' },
                        { key: 'a-z', label: 'A-Z' },
                        { key: 'z-a', label: 'Z-A' },
                        { key: 'all', label: 'All' },
                        { key: 'new', label: 'New' },
                      ] as const).map((s) => (
                        <button
                          key={s.key}
                          onClick={() => setUserSortBy(s.key)}
                          className={`px-3 py-1.5 text-[9px] font-black rounded-md transition-all ${
                            userSortBy === s.key
                              ? 'bg-violet-500 text-white'
                              : 'text-zinc-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {isUsersLoading ? (
                  <div className="flex flex-col items-center justify-center p-24 space-y-4">
                    <Loader2 className="animate-spin text-violet-500 h-12 w-12" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Loading Users...</p>
                  </div>
                ) : filteredUsers.length > 0 ? (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {filteredUsers.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          setSelectedUser(u);
                          setIsUserDetailOpen(true);
                        }}
                        className="group relative rounded-2xl p-5 bg-zinc-900/40 border border-white/5 hover:border-violet-500/25 transition-all duration-500 text-left"
                      >
                        <div className="flex items-start gap-4">
                          <Avatar className="h-12 w-12 rounded-xl border border-white/10 shrink-0">
                            <AvatarImage src={u.photoURL} />
                            <AvatarFallback className="bg-zinc-800 text-sm font-bold text-violet-400">
                              {u.displayName?.substring(0, 2).toUpperCase() || '??'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-black text-white group-hover:text-violet-400 transition-colors truncate">
                                {u.displayName || u.email?.split('@')[0] || 'MindScape Explorer'}
                              </p>
                              <Badge className={`
                                shrink-0 text-[10px] font-black uppercase tracking-widest
                                ${(() => {
                                  const now = new Date();
                                  const createdAt = u.createdAt?.toDate?.() || (u.createdAt ? new Date(u.createdAt) : null);
                                  const createdHoursAgo = createdAt ? Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)) : null;
                                  const lastActive = u.statistics?.lastActiveDate;
                                  const lastActiveDate = lastActive ? new Date(lastActive) : null;
                                  const hoursSinceActive = lastActiveDate ? Math.floor((now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60)) : null;
                                  
                                  if (createdHoursAgo !== null && createdHoursAgo <= 48) return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'; // New (48h)
                                  if (hoursSinceActive !== null && hoursSinceActive <= 48) return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'; // Active (48h)
                                  return 'hidden'; // Remove Inactive
                                })()}
                              `}>
                                {(() => {
                                  const now = new Date();
                                  const createdAt = u.createdAt?.toDate?.() || (u.createdAt ? new Date(u.createdAt) : null);
                                  const createdHoursAgo = createdAt ? Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)) : null;
                                  const lastActive = u.statistics?.lastActiveDate;
                                  const lastActiveDate = lastActive ? new Date(lastActive) : null;
                                  const hoursSinceActive = lastActiveDate ? Math.floor((now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60)) : null;
                                  
                                  if (createdHoursAgo !== null && createdHoursAgo <= 48) return 'New';
                                  if (hoursSinceActive !== null && hoursSinceActive <= 48) return 'Active';
                                  return '';
                                })()}
                              </Badge>
                            </div>
                            <p className="text-[12px] text-zinc-500 truncate mb-2">{u.email || 'No email'}</p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5">
                                  <MapIcon className="h-3 w-3 text-violet-400" />
                                  <span className="text-[12px] font-bold text-zinc-400">{u.statistics?.totalMapsCreated || 0}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Clock className="h-3 w-3 text-zinc-600" />
                                  <span className="text-[12px] font-bold text-zinc-500">
                                    {u.statistics?.lastActiveDate 
                                      ? (u.statistics.lastActiveDate.includes('T') 
                                          ? format(new Date(u.statistics.lastActiveDate), 'dd/MM/yyyy hh:mm a')
                                          : format(new Date(u.statistics.lastActiveDate + 'T12:00:00'), 'dd/MM/yyyy'))
                                      : 'Never'}
                                  </span>
                                </div>
                              </div>
                              <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-violet-400 transition-colors" />
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-24 space-y-4 rounded-2xl bg-zinc-900/20 border border-white/5">
                    <Users className="h-12 w-12 text-zinc-700" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">No users found</p>
                  </div>
                )}
              </div>
            )}

            {/* Moderation Tab */}
            {activeTab === 'moderation' && (
              <div className="space-y-8 pb-20">
                <ModerationCards onViewMap={(mapId) => window.open(`/map/${mapId}`, '_blank')} />
              </div>
            )}

            {/* Activity Log Tab */}
            {activeTab === 'logs' && (
              <div className="space-y-6 pb-20">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="p-3 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl border border-amber-500/20">
                        <Activity className="h-6 w-6 text-amber-400" />
                      </div>
                      <div className="absolute -top-1 -right-1 h-3 w-3 bg-emerald-500 rounded-full border-2 border-zinc-950 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-black text-white">Activity Log</h2>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase tracking-wider">
                          Live
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500">{activityLogs.length} events recorded</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Filter Pills */}
                    <div className="flex items-center gap-1 p-1 bg-zinc-900/60 rounded-xl border border-white/5">
                      {FILTER_CATEGORIES.map((category) => (
                        <button
                          key={category.value}
                          onClick={() => setLogFilter(category.value as any)}
                          className={`
                            px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all
                            ${logFilter === category.value
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                            }
                          `}
                        >
                          {category.label}
                        </button>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadActivityLogs}
                      className="h-10 px-3 rounded-xl border-white/10 bg-white/5 hover:bg-white/10"
                    >
                      <RefreshCw className={`h-4 w-4 ${isLogsLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>

                {/* Activity Log Container */}
                <div className="rounded-2xl bg-zinc-900/40 border border-white/5 overflow-hidden backdrop-blur-sm">
                  {isLogsLoading ? (
                    <ActivityLogSkeleton count={8} />
                  ) : activityLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-6">
                      <div className="relative mb-6">
                        <div className="w-20 h-20 rounded-full bg-zinc-800/50 flex items-center justify-center">
                          <Activity className="h-10 w-10 text-zinc-700" />
                        </div>
                        <div className="absolute inset-0 w-20 h-20 rounded-full border-2 border-dashed border-zinc-700/30 animate-pulse" />
                      </div>
                      <p className="text-lg font-bold text-zinc-400 mb-2">No Activity Yet</p>
                      <p className="text-sm text-zinc-600 text-center max-w-md">
                        System activities will appear here as they happen. Actions like user creation, 
                        map publishing, and admin operations are tracked in real-time.
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar">
                      {groupLogsByDate(activityLogs).map((group, groupIndex) => (
                        <div key={group.title}>
                          {/* Date Group Header */}
                          <div className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-sm border-b border-white/5 px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-700/30 to-transparent" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
                                {group.title}
                              </span>
                              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-700/30 to-transparent" />
                              <span className="px-2 py-0.5 rounded-full bg-zinc-800/50 text-[9px] font-bold text-zinc-500">
                                {group.data.length}
                              </span>
                            </div>
                          </div>

                          {/* Activity Cards */}
                          <div className="divide-y divide-white/5">
                            {group.data.map((log, index) => (
                              <ActivityLogCard
                                key={log.id}
                                log={log}
                                isFirst={index === 0 && groupIndex === 0}
                                isLast={index === group.data.length - 1}
                              />
                            ))}
                          </div>
                        </div>
                      ))}

                      {/* Load More */}
                      {activityLogs.length >= 100 && (
                        <div className="p-4 border-t border-white/5">
                          <Button
                            variant="outline"
                            className="w-full h-12 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white font-bold"
                          >
                            Load More Events
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* User Detail Dialog */}
      <UserDetailDialog 
        user={selectedUser} 
        isOpen={isUserDetailOpen} 
        onClose={() => setIsUserDetailOpen(false)} 
        onUserDeleted={fetchUsers}
        rank={metrics?.topUsers?.findIndex((u: any) => u.id === selectedUser?.id) !== -1 
          ? (metrics?.topUsers?.findIndex((u: any) => u.id === selectedUser?.id) ?? -1) + 1 
          : undefined}
      />
    </div>
  );
}

function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

function StatCard({ title, value, icon: Icon, color, isLoading }: {
  title: string;
  value: string | number;
  icon: any;
  color: 'blue' | 'violet' | 'emerald' | 'orange' | 'pink' | 'cyan';
  isLoading?: boolean;
}) {
  const colorMap: Record<string, { bg: string; border: string; text: string }> = {
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/15', text: 'text-blue-400' },
    violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/15', text: 'text-violet-400' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/15', text: 'text-emerald-400' },
    orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/15', text: 'text-orange-400' },
    pink: { bg: 'bg-pink-500/10', border: 'border-pink-500/15', text: 'text-pink-400' },
    cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/15', text: 'text-cyan-400' },
  };
  
  return (
    <div className="flex items-center gap-4 p-5 rounded-2xl bg-zinc-900/40 border border-white/5 hover:border-white/10 transition-all">
      <div className={`p-3 rounded-xl border ${colorMap[color].bg} ${colorMap[color].border} shrink-0`}>
        <Icon className={`h-4 w-4 ${colorMap[color].text}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-2xl font-black text-white tracking-tighter">
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-violet-400 inline" /> : value}
        </p>
        <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">{title}</p>
      </div>
    </div>
  );
}

function ChangeCard({ title, value, previousValue, icon: Icon, color, isLoading, showChange = true }: {
  title: string;
  value: number;
  previousValue: number;
  icon: any;
  color: 'blue' | 'violet';
  isLoading?: boolean;
  showChange?: boolean;
}) {
  const colorMap = {
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/15', text: 'text-blue-400' },
    violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/15', text: 'text-violet-400' },
  };
  
  const change = previousValue > 0 ? ((value - previousValue) / previousValue * 100).toFixed(0) : '0';
  const isPositive = parseInt(change as string) >= 0;

  return (
    <div className="flex items-center gap-4 p-5 rounded-2xl bg-zinc-900/40 border border-white/5 hover:border-white/10 transition-all">
      <div className={`p-3 rounded-xl border ${colorMap[color].bg} ${colorMap[color].border} shrink-0`}>
        <Icon className={`h-4 w-4 ${colorMap[color].text}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-black text-white tracking-tighter">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-violet-400 inline" /> : value}
          </p>
          {showChange && !isLoading && (
            <span className={`text-[10px] font-black flex items-center gap-0.5 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(parseInt(change as string))}%
            </span>
          )}
        </div>
        <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">{title}</p>
      </div>
    </div>
  );
}
