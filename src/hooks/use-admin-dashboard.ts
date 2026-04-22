import useSWR, { mutate } from 'swr';
import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';

const API_BASE = '/api/admin/dashboard';

async function fetcherWithAuth(url: string, getToken: () => string | null): Promise<any> {
  const token = getToken();
  if (!token) {
    console.warn('[AdminDashboard] No token available, skipping fetch');
    return null;
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  const res = await fetch(url, { headers });
  
  if (res.status === 403) {
    console.warn('[AdminDashboard] 403 - User is not admin or session expired');
    return null;
  }
  if (!res.ok) {
    const error = new Error('Failed to fetch dashboard data');
    (error as any).status = res.status;
    throw error;
  }
  return res.json();
}

interface AdminBundle {
  users: any[];
  logs: any[];
  feedback: any[];
  serverTime: string;
  isIncremental: boolean;
}

interface DashboardStats {
  stats: {
    totalUsers: number;
    totalMindmaps: number;
    totalChats: number;
    activeUsers: number;
    healthScore: number;
    lastUpdated: number | null;
    timestamp: string | null;
  };
  mapAnalytics: any;
  bundle: AdminBundle;
  meta: {
    cached: boolean;
    cacheAge: number | null;
    source: string;
  };
  [key: string]: any;
}

const STABLE_URL = `${API_BASE}?range=all`;

export function useAdminDashboard() {
  const { user, session, supabase } = useAuth();
  const [persistentBundle, setPersistentBundle] = useState<{
    users: any[];
    logs: any[];
    feedback: any[];
    lastFetchTime: string | null;
  }>({
    users: [],
    logs: [],
    feedback: [],
    lastFetchTime: null,
  });

  const [isSyncing, setIsSyncing] = useState(false);

  const mergeData = useCallback((newData: DashboardStats | null) => {
    if (!newData?.bundle) return;

    setPersistentBundle(prev => {
      const { users, logs, feedback, serverTime, isIncremental } = newData.bundle;

      if (!isIncremental || !prev.lastFetchTime) {
        return { users, logs, feedback, lastFetchTime: serverTime };
      }

      const userMap = new Map(prev.users.map(u => [u.id, u]));
      users.forEach((u: any) => userMap.set(u.id, { ...userMap.get(u.id), ...u }));

      const logMap = new Map(prev.logs.map(l => [l.id, l]));
      logs.forEach((l: any) => logMap.set(l.id, l));

      const feedbackMap = new Map(prev.feedback.map(f => [f.id, f]));
      feedback.forEach((f: any) => feedbackMap.set(f.id, f));

      return {
        users: Array.from(userMap.values()).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()),
        logs: Array.from(logMap.values()).sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()),
        feedback: Array.from(feedbackMap.values()).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()),
        lastFetchTime: serverTime,
      };
    });
  }, []);

  const getToken = useCallback((): string | null => {
    return session?.access_token ?? null;
  }, [session]);

  const swrKey = user?.id ? [STABLE_URL, user.id] : null;

  const { data, error, isLoading, isValidating } = useSWR<DashboardStats>(
    swrKey,
    () => fetcherWithAuth(STABLE_URL, getToken),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
      shouldRetryOnError: false,
      onSuccess: (newData) => {
        if (!newData?.bundle) return;
        mergeData(newData);
      },
      onError: (err) => {
        console.error('[AdminDashboard] Fetch error:', err);
      },
    }
  );

  const refreshBundle = useCallback(async (forceFullRefresh = false) => {
    if (isSyncing || !session) return;
    setIsSyncing(true);
    try {
      const url = (!forceFullRefresh && persistentBundle.lastFetchTime)
        ? `${STABLE_URL}&since=${persistentBundle.lastFetchTime}`
        : STABLE_URL;

      const token = getToken();
      if (!token) {
        console.warn('[AdminDashboard] No token, cannot refresh');
        return;
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      const response = await fetch(url, { headers });
      if (response.status === 403) {
        console.warn('[AdminDashboard] Sync blocked - not admin or session expired');
        return;
      }
      if (!response.ok) {
        console.error('[AdminDashboard] Refresh failed:', response.status);
        return;
      }

      const newData = await response.json();
      if (forceFullRefresh) {
        setPersistentBundle({
          users: newData.bundle?.users || [],
          logs: newData.bundle?.logs || [],
          feedback: newData.bundle?.feedback || [],
          lastFetchTime: newData.bundle?.serverTime || null,
        });
      } else {
        mergeData(newData);
      }
      mutate([STABLE_URL, user?.id], newData, false);
    } catch (err) {
      console.error('Bundle refresh error:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, persistentBundle.lastFetchTime, mergeData, session, user, getToken]);

  return {
    data,
    isLoading: isLoading || (isSyncing && persistentBundle.users.length === 0),
    isValidating: isValidating || isSyncing,
    bundle: persistentBundle,
    error,
    refreshBundle,
  };
}

export async function refreshAllStats() {
  await mutate((key: any) => typeof key === 'string' && key.startsWith(API_BASE));
}
