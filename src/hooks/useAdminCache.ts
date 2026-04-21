'use client';

import { useCallback, useRef } from 'react';
// firebase/firestore removed

const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_COLLECTION = 'adminCache';
const CACHE_DOC = 'dashboard';

export interface CachedDashboardData {
  metrics: any;
  mapAnalytics: any;
  lastUpdated: number;
  heatmapDays: any[];
}

export function useAdminCache(firestore: Firestore | null) {
  const memoryCacheRef = useRef<CachedDashboardData | null>(null);

  const loadCache = useCallback(async (): Promise<CachedDashboardData | null> => {
    if (!firestore) return null;
    
    try {
      const cachedSnap = await getDoc(doc(firestore, CACHE_COLLECTION, CACHE_DOC));
      if (cachedSnap.exists()) {
        const data = cachedSnap.data() as CachedDashboardData;
        const age = Date.now() - data.lastUpdated;
        if (age < CACHE_TTL_MS) {
          memoryCacheRef.current = data;
          return data;
        }
      }
    } catch (error) {
      console.error('Error loading cache:', error);
    }
    return null;
  }, [firestore]);

  const setCache = useCallback(async (data: Partial<CachedDashboardData>): Promise<void> => {
    if (!firestore) return;

    const now = Date.now();
    const newCache: CachedDashboardData = {
      ...memoryCacheRef.current,
      ...data,
      lastUpdated: now,
    } as CachedDashboardData;

    memoryCacheRef.current = newCache;

    try {
      await setDoc(doc(firestore, CACHE_COLLECTION, CACHE_DOC), newCache, { merge: true });
    } catch (error) {
      console.error('Error saving cache:', error);
    }
  }, [firestore]);

  const clearCache = useCallback(async (): Promise<void> => {
    memoryCacheRef.current = null;

    if (firestore) {
      try {
        await setDoc(doc(firestore, CACHE_COLLECTION, CACHE_DOC), { 
          lastUpdated: 0,
          metrics: null,
          mapAnalytics: null,
          heatmapDays: []
        });
      } catch (error) {
        console.error('Error clearing cache:', error);
      }
    }
  }, [firestore]);

  return { loadCache, setCache, clearCache };
}

export function useUserListCache() {
  const cacheRef = useRef<{ users: any[]; lastFetched: number } | null>(null);

  const getCached = useCallback((): any[] | null => {
    if (!cacheRef.current) return null;
    const age = Date.now() - cacheRef.current.lastFetched;
    if (age < CACHE_TTL_MS) {
      return cacheRef.current.users;
    }
    return null;
  }, []);

  const setCache = useCallback((users: any[]) => {
    cacheRef.current = { users, lastFetched: Date.now() };
  }, []);

  const invalidate = useCallback(() => {
    cacheRef.current = null;
  }, []);

  return { getCached, setCache, invalidate };
}
