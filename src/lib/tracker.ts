// ─── Unified Tracking API ─────────────────────────────────────
// Single entry point for ALL tracking concerns:
//   • analytics — in-memory client-side event analytics (AnalyticsTracker singleton)
//   • activity — Supabase-backed user statistics & achievement tracking
// ─────────────────────────────────────────────────────────────
// Note: No 'use client' directive — AnalyticsTracker guards browser APIs with
// runtime checks (typeof window === 'undefined'), so this module is safe to
// import from both client components and server route handlers.

import { getSupabaseClient } from './supabase-db';
import type { AdminActivityLogEntry, ActivityType, ActivityCategory } from './admin-utils';
import { FILTER_CATEGORIES } from './admin-utils';
import { v4 as uuidv4 } from 'uuid';
import { SupabaseClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import { Achievement, getNewlyUnlockedAchievements, UserStatistics } from './achievements';

// ═══════════════════════════════════════════════════════════════
// SECTION 1 — Types
// ═══════════════════════════════════════════════════════════════

export interface AnalyticsEvent {
  eventName: string;
  category: 'page' | 'ai' | 'map' | 'chat' | 'engagement' | 'performance' | 'error';
  properties?: Record<string, any>;
  timestamp: number;
  sessionId: string;
  userId?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface PerformanceMetrics {
  pageName: string;
  loadTime: number;
  ttfb?: number;
  fcp?: number;
  lcp?: number;
  fid?: number;
  cls?: number;
  networkRequests?: number;
  cacheHitRate?: number;
}

// ═══════════════════════════════════════════════════════════════
// SECTION 2 — In-memory Analytics (AnalyticsTracker singleton)
// ═══════════════════════════════════════════════════════════════

class AnalyticsTracker {
  private sessionId: string;
  private eventQueue: AnalyticsEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly FLUSH_INTERVAL_MS = 5000;
  private readonly MAX_QUEUE_SIZE = 50;
  private readonly ENDPOINT = '/api/analytics/track';

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
    this.startFlushInterval();
    this.setupVisibilityHandler();
    this.setupPerformanceObserver();
  }

  private getOrCreateSessionId(): string {
    if (typeof window === 'undefined') return 'server';

    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = uuidv4();
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }

  private startFlushInterval(): void {
    if (typeof window === 'undefined') return;

    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.FLUSH_INTERVAL_MS);
  }

  private setupVisibilityHandler(): void {
    if (typeof window === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flush();
      }
    });

    window.addEventListener('beforeunload', () => {
      this.flush();
    });
  }

  private setupPerformanceObserver(): void {
    if (typeof window === 'undefined') return;

    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              const nav = entry as PerformanceNavigationTiming;
              this.trackPerformance({
                pageName: window.location.pathname,
                loadTime: nav.loadEventEnd - nav.fetchStart,
                ttfb: nav.responseStart - nav.requestStart,
                fcp: (entry as any).firstContentfulPaint,
              });
            }
          }
        });
        observer.observe({ entryTypes: ['navigation'] });
      } catch (e) {
        console.warn('PerformanceObserver not supported:', e);
      }
    }
  }

  async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      await fetch(this.ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
        keepalive: true,
      });
    } catch (error) {
      this.eventQueue.unshift(...events);
      console.error('Analytics flush failed:', error);
    }
  }

  track(eventName: string, category: AnalyticsEvent['category'], properties?: Record<string, any>): void {
    if (typeof window === 'undefined') return;

    const event: AnalyticsEvent = {
      eventName,
      category,
      properties,
      timestamp: Date.now(),
      sessionId: this.sessionId,
    };

    this.eventQueue.push(event);

    if (this.eventQueue.length >= this.MAX_QUEUE_SIZE) {
      this.flush();
    }
  }

  trackPageView(pageName: string, properties?: Record<string, any>): void {
    this.track('page_view', 'page', {
      page: pageName,
      referrer: typeof document !== 'undefined' ? document.referrer : null,
      ...properties,
    });
  }

  trackPerformance(metrics: PerformanceMetrics): void {
    this.track('performance', 'performance', metrics);
  }

  trackAIStart(sourceType: string, mode: string, depth: string, persona: string): void {
    this.track('ai_generation_start', 'ai', {
      sourceType,
      mode,
      depth,
      persona,
    });
  }

  trackAIComplete(sourceType: string, mode: string, nodeCount: number, duration: number, tokensUsed?: number): void {
    this.track('ai_generation_complete', 'ai', {
      sourceType,
      mode,
      nodeCount,
      duration,
      tokensUsed,
    });
  }

  trackAIFailed(sourceType: string, errorType: string, errorMessage: string): void {
    this.track('ai_generation_failed', 'ai', {
      sourceType,
      errorType,
      errorMessage,
    });
  }

  trackImageGeneration(prompt: string, model: string, duration: number, success: boolean): void {
    this.track('image_generation', 'ai', {
      prompt: prompt.substring(0, 100),
      model,
      duration,
      success,
    });
  }

  trackMapView(mapId: string, source: 'gallery' | 'direct' | 'shared' | 'admin', duration?: number): void {
    this.track('map_viewed', 'map', {
      mapId,
      source,
      duration,
    });
  }

  trackMapShared(mapId: string, shareMethod: 'email' | 'link' | 'social' | 'embed', recipientEmail?: string): void {
    this.track('map_shared', 'map', {
      mapId,
      shareMethod,
      recipientEmail,
    });
  }

  trackMapExport(mapId: string, format: 'pdf' | 'png' | 'json' | 'markdown'): void {
    this.track('map_exported', 'map', {
      mapId,
      format,
    });
  }

  trackNodeExpansion(nodeId: string, mapId: string, expansionCount: number): void {
    this.track('node_expanded', 'map', {
      nodeId,
      mapId,
      expansionCount,
    });
  }

  trackChatMessage(sessionId: string, messageType: 'user' | 'ai', responseTime?: number): void {
    this.track('chat_message', 'chat', {
      sessionId,
      messageType,
      responseTime,
    });
  }

  trackSearch(query: string, resultsCount: number, filters?: Record<string, any>): void {
    this.track('search', 'engagement', {
      query: query.substring(0, 200),
      resultsCount,
      filters,
    });
  }

  trackError(errorType: string, errorMessage: string, stackTrace?: string, context?: Record<string, any>): void {
    this.track('error', 'error', {
      errorType,
      errorMessage,
      stackTrace: stackTrace?.substring(0, 500),
      context,
    });
  }

  trackFeatureUsage(featureName: string, action: 'used' | 'skipped' | 'failed', metadata?: Record<string, any>): void {
    this.track('feature_usage', 'engagement', {
      featureName,
      action,
      ...metadata,
    });
  }

  setUserId(userId: string): void {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem('analytics_user_id', userId);
  }

  getSessionId(): string {
    return this.sessionId;
  }

  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush();
  }
}

export const analytics = new AnalyticsTracker();

export function useAnalytics() {
  return analytics;
}

import { createElement, ComponentType } from 'react';

export function withAnalytics<P extends object>(
  WrappedComponent: ComponentType<P>,
  pageName: string
): ComponentType<P> {
  const AnalyticsWrapper = (props: P) => {
    if (typeof window !== 'undefined') {
      analytics.trackPageView(pageName);
    }
    return createElement(WrappedComponent, props);
  };
  return AnalyticsWrapper;
}

// ═══════════════════════════════════════════════════════════════
// SECTION 3A — User Events (Immutable Event Log)
// Writes to the user_events table for the unified data store.
// Called by all tracking functions below.
// ═══════════════════════════════════════════════════════════════

export type UserEventType =
  | 'login'
  | 'map_created'
  | 'map_deleted'
  | 'map_viewed'
  | 'map_shared'
  | 'map_exported'
  | 'map_published'
  | 'map_unpublished'
  | 'map_cloned'
  | 'submap_created'
  | 'node_expanded'
  | 'chat_sent'
  | 'image_generated'
  | 'study_time'
  | 'page_viewed'
  | 'search_performed'
  | 'session_end'
  | 'client_error'
  | 'explanation_requested'
  | 'quiz_generated';

/**
 * Fire-and-forget writer to the user_events table.
 * This is the single source of truth for all user activity.
 * Safe to call from any context — swallows errors silently.
 */
export async function logUserEvent(
  userId: string | undefined,
  eventType: UserEventType,
  eventData: Record<string, any> = {},
  source?: string
): Promise<void> {
  if (!userId) return;
  try {
    const supabase = getSupabaseClient();
    await supabase.from('user_events').insert({
      user_id: userId,
      event_type: eventType,
      event_data: eventData,
      source: source || 'system',
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    // Silently fail — don't disrupt the main action
    console.error(`[UserEvent] Failed to log ${eventType}:`, error);
  }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 3B — Supabase-backed Activity / Statistics Tracking
// ═══════════════════════════════════════════════════════════════

export async function updateUserStatistics(
  supabase: SupabaseClient,
  userId: string,
  updates: {
    mapsCreated?: number;
    nestedExpansions?: number;
    imagesGenerated?: number;
    studyTimeMinutes?: number;
    nodesCreated?: number;
    mapMetadata?: {
      mode?: string;
      sourceFileType?: string;
      sourceType?: string;
      sourceUrl?: string;
      videoId?: string;
      depth?: string;
      nodeCount?: number;
      aiPersona?: string;
    };
    chatsCount?: number;
  }
): Promise<Achievement[]> {
  const today = format(new Date(), 'yyyy-MM-dd');

  try {
    const { data: user } = await supabase.from('users').select('statistics, activity, unlocked_achievements').eq('id', userId).single();
    const stats = user?.statistics || {};
    const activity = user?.activity || {};

    // Update streak
    const lastActiveDate = stats.lastActiveDate;
    let currentStreak = stats.currentStreak || 0;
    let longestStreak = stats.longestStreak || 0;

    if (lastActiveDate !== today) {
      const lastDate = lastActiveDate ? new Date(lastActiveDate) : null;
      const todayDate = new Date(today);
      if (lastDate) {
        lastDate.setHours(0, 0, 0, 0);
        todayDate.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor((todayDate.getTime() - lastDate.getTime()) / 86400000);
        currentStreak = daysDiff === 1 ? currentStreak + 1 : 1;
      } else {
        currentStreak = 1;
      }
      longestStreak = Math.max(currentStreak, longestStreak);
    }

    const isSubMap = (updates.mapMetadata as any)?.isSubMap === true;
    const mapsToIncrement = (updates.mapsCreated || 0) > 0 ? (isSubMap ? 0 : updates.mapsCreated || 0) : 0;
    const nestedToIncrement = (updates.nestedExpansions || 0) + ((updates.mapsCreated || 0) > 0 && isSubMap ? 1 : 0);

    const newStats = {
      ...stats,
      totalMapsCreated: (stats.totalMapsCreated || 0) + mapsToIncrement,
      totalNestedExpansions: (stats.totalNestedExpansions || 0) + nestedToIncrement,
      totalImagesGenerated: (stats.totalImagesGenerated || 0) + (updates.imagesGenerated || 0),
      totalStudyTimeMinutes: (stats.totalStudyTimeMinutes || 0) + (updates.studyTimeMinutes || 0),
      totalNodes: (stats.totalNodes || 0) + (updates.nodesCreated || 0),
      totalChats: (stats.totalChats || 0) + (updates.chatsCount || 0),
      lastActiveDate: today,
      currentStreak,
      longestStreak,
    };

    const todayActivity = activity[today] || {};
    const newActivity = {
      ...activity,
      [today]: {
        ...todayActivity,
        mapsCreated: (todayActivity.mapsCreated || 0) + mapsToIncrement,
        nestedExpansions: (todayActivity.nestedExpansions || 0) + nestedToIncrement,
        imagesGenerated: (todayActivity.imagesGenerated || 0) + (updates.imagesGenerated || 0),
        studyTimeMinutes: (todayActivity.studyTimeMinutes || 0) + (updates.studyTimeMinutes || 0),
        nodesCreated: (todayActivity.nodesCreated || 0) + (updates.nodesCreated || 0),
        chatsCount: (todayActivity.chatsCount || 0) + (updates.chatsCount || 0),
      },
    };

    await supabase.from('users').update({ statistics: newStats, activity: newActivity }).eq('id', userId);

    // Check achievements
    const userStats: UserStatistics = {
      totalMapsCreated: newStats.totalMapsCreated,
      totalNestedExpansions: newStats.totalNestedExpansions,
      totalImagesGenerated: newStats.totalImagesGenerated,
      totalStudyTimeMinutes: newStats.totalStudyTimeMinutes,
      currentStreak: newStats.currentStreak,
      longestStreak: newStats.longestStreak,
    };
    const currentAchievements: string[] = user?.unlocked_achievements || [];
    const newlyUnlocked = getNewlyUnlockedAchievements(userStats, currentAchievements);

    if (newlyUnlocked.length > 0) {
      await supabase.from('users').update({
        unlocked_achievements: [...currentAchievements, ...newlyUnlocked.map(a => a.id)],
      }).eq('id', userId);
    }

    return newlyUnlocked;
  } catch (error) {
    console.error('Error updating user statistics:', error);
    return [];
  }
}

export async function trackLogin(supabase: SupabaseClient, userId: string, userMeta?: { displayName?: string | null; email?: string | null; photoURL?: string | null }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  try {
    const { data: user } = await supabase.from('users').select('id, statistics').eq('id', userId).single();
    if (!user) {
      await initializeUserProfile(supabase, userId, userMeta?.displayName || '', userMeta?.email || '', userMeta?.photoURL || undefined);
      return;
    }
    const lastActiveDate = user.statistics?.lastActiveDate;
    if (lastActiveDate !== today) {
      await updateUserStatistics(supabase, userId, {});
    }
  } catch (error) {
    console.error('Error tracking login:', error);
  }

  // Fire user event
  await logUserEvent(userId, 'login', {
    displayName: userMeta?.displayName,
    email: userMeta?.email,
  }, 'auth');
}

export async function trackMapCreated(supabase: SupabaseClient, userId: string, mapMetadata?: any): Promise<Achievement[]> {
  // Fire user event first (fire-and-forget)
  logUserEvent(userId, 'map_created', {
    mode: mapMetadata?.mode,
    sourceType: mapMetadata?.sourceFileType || mapMetadata?.sourceType,
    depth: mapMetadata?.depth,
    persona: mapMetadata?.aiPersona,
    nodeCount: mapMetadata?.nodeCount,
    isSubMap: mapMetadata?.isSubMap,
  }, 'canvas');
  return updateUserStatistics(supabase, userId, { mapsCreated: 1, mapMetadata });
}

export async function trackNestedExpansion(supabase: SupabaseClient, userId: string): Promise<Achievement[]> {
  logUserEvent(userId, 'node_expanded', {}, 'map');
  return updateUserStatistics(supabase, userId, { nestedExpansions: 1 });
}

export async function trackImageGenerated(supabase: SupabaseClient, userId: string): Promise<Achievement[]> {
  logUserEvent(userId, 'image_generated', {}, 'canvas');
  return updateUserStatistics(supabase, userId, { imagesGenerated: 1 });
}

export async function trackStudyTime(supabase: SupabaseClient, userId: string, minutes: number): Promise<Achievement[]> {
  logUserEvent(userId, 'study_time', { minutes }, 'canvas');
  return updateUserStatistics(supabase, userId, { studyTimeMinutes: minutes });
}

export async function trackNodesAdded(supabase: SupabaseClient, userId: string, count: number): Promise<Achievement[]> {
  if (count <= 0) return [];
  logUserEvent(userId, 'node_expanded', { nodesAdded: count }, 'canvas');
  return updateUserStatistics(supabase, userId, { nodesCreated: count });
}

export async function trackChat(supabase: SupabaseClient, userId: string): Promise<Achievement[]> {
  logUserEvent(userId, 'chat_sent', {}, 'chat');
  return updateUserStatistics(supabase, userId, { chatsCount: 1 });
}

export async function initializeUserProfile(
  supabase: SupabaseClient,
  userId: string,
  displayName: string,
  email: string,
  photoURL?: string
) {
  const today = format(new Date(), 'yyyy-MM-dd');
  await supabase.from('users').upsert({
    id: userId,
    display_name: displayName,
    email,
    photo_url: photoURL || null,
    created_at: new Date().toISOString(),
    preferences: {
      defaultExplanationMode: 'Intermediate',
      preferredLanguage: 'en',
      defaultAIPersona: 'Concise',
      autoGenerateImages: false,
      defaultMapView: 'collapsed',
      autoSaveFrequency: 5,
    },
    statistics: {
      totalMapsCreated: 0,
      totalNestedExpansions: 0,
      totalImagesGenerated: 0,
      totalStudyTimeMinutes: 0,
      lastActiveDate: today,
      currentStreak: 1,
      longestStreak: 1,
      totalNodes: 0,
    },
    activity: {},
    unlocked_achievements: [],
  }, { onConflict: 'id' });
}

// ═══════════════════════════════════════════════════════════════
// SECTION 4 — Admin Activity Log
// ═══════════════════════════════════════════════════════════════

/**
 * Standalone function to log an admin activity entry via server action.
 * Does NOT need to be a React hook — pure async function.
 */
// Re-export types so consumers can import everything from one place
export type { AdminActivityLogEntry, ActivityType, ActivityCategory };

/**
 * Standalone function to log an admin activity entry via server action.
 * Does NOT need to be a React hook — pure async function.
 */
export async function logAdminActivity(
  entry: Omit<AdminActivityLogEntry, 'timestamp'>
): Promise<void> {
  try {
    const { logAdminActivityAction } = await import('@/app/actions');
    await logAdminActivityAction(entry);
  } catch (error) {
    console.error('Error logging activity via server action:', error);
  }
}

/**
 * Fetch admin activity logs from Supabase with optional filtering.
 * Standalone function — no React hooks needed.
 */
export async function fetchAdminActivityLogs(
  filterType?: ActivityType | ActivityCategory | 'all',
  maxEntries: number = 100
): Promise<AdminActivityLogEntry[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('admin_activity_log')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(maxEntries);

    if (error || !data) return [];
    let entries = data.map(row => ({ id: row.id, ...row } as AdminActivityLogEntry));

    if (filterType && filterType !== 'all') {
      const typesToFilter = typeof filterType === 'string' && FILTER_CATEGORIES.find(c => c.value === filterType)
        ? FILTER_CATEGORIES.find(c => c.value === filterType)!.types
        : [filterType];
      entries = entries.filter(log => typesToFilter.includes(log.type));
    }

    return entries;
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return [];
  }
}

/**
 * Subscribe to real-time admin activity log updates.
 * Returns an unsubscribe function.
 */
export function subscribeToAdminActivityLogs(
  callback: (entries: AdminActivityLogEntry[]) => void,
  filterType?: ActivityType | ActivityCategory | 'all',
  maxEntries: number = 100
): () => void {
  const supabase = getSupabaseClient();
  const channel = supabase
    .channel('admin-activity-log')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_activity_log' }, async () => {
      const logs = await fetchAdminActivityLogs(filterType, maxEntries);
      callback(logs);
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

// ═══════════════════════════════════════════════════════════════
// SECTION 5 — AI Generation Tracking (standalone functions)
// These are NOT React hooks — they are safe to import from
// server route handlers. The React hooks (useMapTracking,
// useSessionTracking, useErrorTracking) have been moved to
// src/hooks/use-tracking.ts with 'use client'.
// ═══════════════════════════════════════════════════════════════

export interface AIGenerationMeta {
  sourceType: 'pdf' | 'website' | 'youtube' | 'text' | 'image' | 'multi';
  mode: 'single' | 'compare' | 'multi';
  depth: 'low' | 'medium' | 'deep';
  persona: string;
  userId?: string;
}

const fallbackStartMap = new Map<string, number>();

const getStartTime = (id: string): number | undefined => {
  if (typeof window !== 'undefined') {
    const val = sessionStorage.getItem(`ai-start-${id}`);
    if (val) return parseInt(val, 10);
  }
  return fallbackStartMap.get(id);
};

const setStartTime = (id: string, time: number) => {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(`ai-start-${id}`, time.toString());
  }
  fallbackStartMap.set(id, time);
};

const deleteStartTime = (id: string) => {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(`ai-start-${id}`);
  }
  fallbackStartMap.delete(id);
};

export async function trackGenerationStart(
  generationId: string,
  meta: AIGenerationMeta
) {
  const startTime = Date.now();
  setStartTime(generationId, startTime);

  analytics.trackAIStart(meta.sourceType, meta.mode, meta.depth, meta.persona);

  await logAdminActivity({
    type: 'AI_GENERATION_STARTED',
    targetType: 'mindmap',
    details: `AI generation started: ${meta.sourceType} -> ${meta.mode} mode`,
    performedBy: meta.userId,
    metadata: {
      sourceType: meta.sourceType,
      mode: meta.mode,
      depth: meta.depth,
      persona: meta.persona,
    },
  });

}

export async function trackGenerationComplete(
  generationId: string,
  meta: AIGenerationMeta,
  result: {
    nodeCount?: number;
    tokensUsed?: number;
    mapId?: string;
  }
) {
  const startTime = getStartTime(generationId);
  const duration = startTime ? Date.now() - startTime : undefined;
  deleteStartTime(generationId);

  analytics.trackAIComplete(
    meta.sourceType,
    meta.mode,
    result.nodeCount || 0,
    duration || 0,
    result.tokensUsed
  );

  await logAdminActivity({
    type: 'AI_GENERATION_COMPLETED',
    targetType: 'mindmap',
    targetId: result.mapId,
    details: `AI generation completed: ${result.nodeCount || 0} nodes in ${duration}ms`,
    performedBy: meta.userId,
    duration,
    metadata: {
      sourceType: meta.sourceType,
      mode: meta.mode,
      depth: meta.depth,
      persona: meta.persona,
      nodeCount: result.nodeCount,
      tokensUsed: result.tokensUsed,
    },
  });

}

export async function trackGenerationFailed(
  generationId: string,
  meta: AIGenerationMeta,
  error: {
    type: string;
    message: string;
  }
) {
  const startTime = getStartTime(generationId);
  const duration = startTime ? Date.now() - startTime : undefined;
  deleteStartTime(generationId);

  analytics.trackAIFailed(meta.sourceType, error.type, error.message);

  await logAdminActivity({
    type: 'AI_GENERATION_FAILED',
    targetType: 'mindmap',
    details: `AI generation failed: ${error.type} - ${error.message}`,
    performedBy: meta.userId,
    duration,
    metadata: {
      sourceType: meta.sourceType,
      mode: meta.mode,
      depth: meta.depth,
      persona: meta.persona,
      errorType: error.type,
      errorMessage: error.message,
    },
  });
}

export async function trackImageGeneration(
  meta: {
    userId?: string;
    prompt: string;
    model?: string;
  },
  result: {
    success: boolean;
    duration: number;
    error?: string;
  }
) {
  if (result.success) {
    await logAdminActivity({
      type: 'IMAGE_GENERATION_COMPLETED',
      targetType: 'mindmap',
      details: `Image generated successfully in ${result.duration}ms`,
      performedBy: meta.userId,
      duration: result.duration,
      metadata: {
        prompt: meta.prompt.substring(0, 100),
        model: meta.model,
      },
    });
  } else {
    await logAdminActivity({
      type: 'IMAGE_GENERATION_FAILED',
      targetType: 'mindmap',
      details: `Image generation failed: ${result.error}`,
      performedBy: meta.userId,
      duration: result.duration,
      metadata: {
        prompt: meta.prompt.substring(0, 100),
        model: meta.model,
        error: result.error,
      },
    });
  }

  analytics.trackImageGeneration(
    meta.prompt,
    meta.model || 'unknown',
    result.duration,
    result.success
  );

  logUserEvent(meta.userId, 'image_generated', {
    prompt: meta.prompt.substring(0, 100),
    model: meta.model,
    success: result.success,
    duration: result.duration,
  }, 'ai');
}

export async function trackExplanationRequest(
  meta: {
    userId?: string;
    nodeId: string;
    mapId: string;
    persona: string;
  }
) {
  await logAdminActivity({
    type: 'EXPLANATION_REQUESTED',
    targetType: 'node',
    targetId: meta.nodeId,
    details: `Explanation requested for node`,
    performedBy: meta.userId,
    metadata: {
      mapId: meta.mapId,
      persona: meta.persona,
    },
  });

  logUserEvent(meta.userId, 'explanation_requested', {
    nodeId: meta.nodeId,
    mapId: meta.mapId,
    persona: meta.persona,
  }, 'ai');
}

export async function trackQuizGeneration(
  meta: {
    userId?: string;
    mapId: string;
    questionCount: number;
  },
  result: {
    success: boolean;
    duration?: number;
  }
) {
  if (result.success) {
    await logAdminActivity({
      type: 'QUIZ_GENERATED',
      targetType: 'mindmap',
      targetId: meta.mapId,
      details: `Quiz generated: ${meta.questionCount} questions`,
      performedBy: meta.userId,
      duration: result.duration,
      metadata: {
        questionCount: meta.questionCount,
      },
    });
  }

  logUserEvent(meta.userId, 'quiz_generated', {
    mapId: meta.mapId,
    questionCount: meta.questionCount,
    success: result.success,
  }, 'ai');
}
