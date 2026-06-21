import useSWR, { mutate } from 'swr';
import { useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { DEFAULT_MAP_ANALYTICS } from '@/types/admin';
import { sortByTimestamp } from '@/lib/timestamp-utils';

const API_BASE = '/api/admin/unified';

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

/** Shape returned by the new unified endpoint with scope=full */
interface UnifiedFullResponse {
  platform: {
    total_users: number;
    total_maps: number;
    total_maps_ever: number;
    total_chats: number;
    total_nodes: number;
    total_images: number;
    total_events: number;
    new_users_24h: number;
    new_maps_24h: number;
    active_users_24h: number;
    active_users_7d: number;
    new_users_7d: number;
    new_maps_7d: number;
    health_score: number;
    engagement_rate: number;
    top_persona: string;
    top_source_type: string;
    avg_maps_per_user: number;
    avg_nodes_per_map: number;
    daily_snapshot: { date: string; new_events: number; new_maps: number; active_users: number }[];
    updated_at: string;
  };
  profiles: any[];
  events: any[];
  metrics: {
    mapAnalytics: typeof DEFAULT_MAP_ANALYTICS;
    topUsers: any[];
    latestUsers: any[];
  };
  bundles: {
    feedback: any[];
    aiCalls: any[];
  };
  meta: {
    cached: boolean;
    source: string;
    totalProfiles: number;
    totalEvents: number;
  };
}

interface AdminBundle {
  users: any[];
  logs: any[];
  feedback: any[];
  aiCalls: any[];
  serverTime: string;
}

const STABLE_URL = `${API_BASE}?scope=full`;

export function useAdminDashboard() {
  const { user, session } = useAuth();
  const [persistentBundle, setPersistentBundle] = useState<AdminBundle>({
    users: [],
    logs: [],
    feedback: [],
    aiCalls: [],
    serverTime: new Date().toISOString(),
  });
  const [isSyncing, setIsSyncing] = useState(false);

  const getToken = useCallback((): string | null => {
    return session?.access_token ?? null;
  }, [session]);

  const swrKey = user?.id ? [STABLE_URL, user.id] : null;

  const { data, error, isLoading, isValidating } = useSWR<UnifiedFullResponse>(
    swrKey,
    () => fetcherWithAuth(STABLE_URL, getToken),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
      shouldRetryOnError: false,
      onSuccess: (newData) => {
        if (!newData) return;
        setPersistentBundle({
          users: newData.profiles || [],
          logs: newData.events || [],
          feedback: newData.bundles?.feedback || [],
          aiCalls: newData.bundles?.aiCalls || [],
          serverTime: new Date().toISOString(),
        });
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
      const url = STABLE_URL;
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

      const newData: UnifiedFullResponse = await response.json();
      setPersistentBundle({
        users: newData.profiles || [],
        logs: newData.events || [],
        feedback: newData.bundles?.feedback || [],
        aiCalls: newData.bundles?.aiCalls || [],
        serverTime: new Date().toISOString(),
      });
      mutate([STABLE_URL, user?.id], newData, false);
    } catch (err) {
      console.error('Bundle refresh error:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, session, user, getToken]);

  // Sort users by createdAt desc for the UI
  const sortedUsers = sortByTimestamp(persistentBundle.users || [], u => u.createdAt, 'desc');

  return {
    data,
    isLoading: isLoading || (isSyncing && persistentBundle.users.length === 0),
    isValidating: isValidating || isSyncing,
    bundle: { ...persistentBundle, users: sortedUsers },
    error,
    refreshBundle,
  };
}

export async function refreshAllStats() {
  await mutate((key: any) => typeof key === 'string' && key.startsWith(API_BASE));
}
