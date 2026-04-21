'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { useUser } from '@/lib/auth-context';

const API_BASE = '/api/admin/stats';

interface AdminStats {
  totalCreated: number;
  activeCount: number;
  deletedCount: number;
  publicCount: number;
  privateCount: number;
  totalNodes: number;
  lastUpdatedAt: number;
}

interface MindmapListItem {
  id: string;
  userId: string;
  title: string;
  summary?: string;
  mode: string;
  depth: string;
  isPublic: boolean;
  isDeleted: boolean;
  nodeCount: number;
  views: number;
  createdAt: number;
  updatedAt: number;
  sourceType?: string;
  persona?: string;
}

interface StatsResponse {
  success: boolean;
  data: AdminStats;
  meta: {
    cached: boolean;
    cacheAge: number;
    source: string;
  };
}

interface MindmapsResponse {
  success: boolean;
  data: MindmapListItem[];
  pagination: {
    lastDoc: string | null;
    lastTime: number | null;
    hasMore: boolean;
  };
}

async function fetchWithAuth(url: string, token?: string | null): Promise<any> {
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const res = await fetch(url, { headers });
  if (!res.ok) {
    if (res.status === 403) {
      throw new Error('Unauthorized: Admin access required');
    }
    throw new Error('Failed to fetch admin stats');
  }
  
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || 'Failed to fetch admin stats');
  }
  return json;
}

export function useAdminStats(options?: {
  refreshInterval?: number;
  revalidateOnFocus?: boolean;
}) {
  const { session, user } = useAuth();
  const { refreshInterval = 60000, revalidateOnFocus = false } = options || {};

  const getToken = useCallback(async (): Promise<string | null> => {
    return session?.access_token || null;
  }, [session]);

  const fetcher = useCallback(async (): Promise<StatsResponse> => {
    const token = await getToken();
    return fetchWithAuth(API_BASE, token);
  }, [getToken]);

  const { data, error, isLoading, isValidating, mutate: revalidate } = useSWR<StatsResponse>(
    [API_BASE, user?.uid],
    () => fetcher(),
    {
      refreshInterval,
      revalidateOnFocus,
      revalidateOnReconnect: false,
      dedupingInterval: 30000,
      onError: (err) => {
        console.error('[useAdminStats] Error:', err);
      },
    }
  );

  const refresh = useCallback(async (forceRefresh = false) => {
    const url = forceRefresh ? `${API_BASE}?refresh=true` : API_BASE;
    const token = await getToken();
    await mutate([API_BASE, user?.uid], fetchWithAuth(url, token), { revalidate: true });
  }, [getToken, user?.uid, revalidate]);

  return {
    stats: data?.data || null,
    meta: data?.meta || null,
    isLoading,
    isValidating,
    error,
    refresh,
  };
}

export function useAdminMindmaps(options?: {
  limit?: number;
  initialData?: MindmapListItem[];
}) {
  const { session } = useAuth();

  const getToken = useCallback(async (): Promise<string | null> => {
    return session?.access_token || null;
  }, [session]);

  const fetcher = useCallback(async (): Promise<MindmapsResponse> => {
    const token = await getToken();
    return fetchWithAuth(`${API_BASE}?action=mindmaps&limit=${limit}`, token);
  }, [getToken, limit]);

  const { data, error, isLoading, isValidating, mutate: revalidate } = useSWR<MindmapsResponse>(
    ['adminMindmaps', limit],
    () => fetcher(),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000,
    }
  );

  return {
    mindmaps: data?.data || [],
    pagination: data?.pagination || { lastDoc: null, lastTime: null, hasMore: false },
    isLoading,
    isValidating,
    error,
    refresh: () => revalidate(),
  };
}

export function invalidateAdminStatsCache() {
  mutate((key: any) => typeof key === 'string' && key.includes('admin/stats'));
  mutate((key: any) => typeof key === 'string' && key.includes('adminMindmaps'));
}
