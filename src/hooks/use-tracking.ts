'use client';

// ─── React Tracking Hooks ────────────────────────────────────
// Extracted from src/lib/tracker.ts to fix Next.js build issue.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { analytics, logAdminActivity, logUserEvent } from '@/lib/tracker';

// ── Map Engagement Tracking ──

interface MapEngagementMeta {
  mapId: string;
  userId?: string;
  title?: string;
  isPublic?: boolean;
}

export function useMapTracking(meta: MapEngagementMeta) {
  const viewStartRef = useRef<number | null>(null);
  const hasLoggedViewRef = useRef(false);

  const trackMapView = useCallback(
    async (source: 'gallery' | 'direct' | 'shared' | 'admin' = 'direct') => {
      if (hasLoggedViewRef.current) return;
      hasLoggedViewRef.current = true;
      viewStartRef.current = Date.now();
      analytics.trackMapView(meta.mapId, source, viewStartRef.current);
      await logAdminActivity({
        type: 'MAP_VIEWED',
        targetType: 'mindmap',
        targetId: meta.mapId,
        details: 'Map viewed: ' + (meta.title || meta.mapId),
        performedBy: meta.userId,
        metadata: { source, isPublic: meta.isPublic, title: meta.title },
      });
      logUserEvent(
        meta.userId,
        'map_viewed',
        { mapId: meta.mapId, source, title: meta.title, isPublic: meta.isPublic },
        'map'
      );
    },
    [meta.mapId, meta.userId, meta.title, meta.isPublic]
  );

  const trackMapShared = useCallback(
    async (shareMethod: 'email' | 'link' | 'social' | 'embed', recipientEmail?: string) => {
      analytics.trackMapShared(meta.mapId, shareMethod, recipientEmail);
      await logAdminActivity({
        type: 'MAP_SHARED',
        targetType: 'mindmap',
        targetId: meta.mapId,
        details: 'Map shared via ' + shareMethod,
        performedBy: meta.userId,
        metadata: { shareMethod, recipientEmail, isPublic: meta.isPublic },
      });
      logUserEvent(meta.userId, 'map_shared', { mapId: meta.mapId, shareMethod, recipientEmail }, 'map');
    },
    [meta.mapId, meta.userId, meta.isPublic]
  );

  const trackMapExported = useCallback(
    async (format: 'pdf' | 'png' | 'json' | 'markdown') => {
      analytics.trackMapExport(meta.mapId, format);
      await logAdminActivity({
        type: 'MAP_EXPORTED',
        targetType: 'mindmap',
        targetId: meta.mapId,
        details: 'Map exported as ' + format.toUpperCase(),
        performedBy: meta.userId,
        metadata: { format, isPublic: meta.isPublic },
      });
      logUserEvent(meta.userId, 'map_exported', { mapId: meta.mapId, format }, 'map');
    },
    [meta.mapId, meta.userId, meta.isPublic]
  );

  const trackNodeExpanded = useCallback(
    async (nodeId: string, expansionCount: number) => {
      analytics.trackNodeExpansion(nodeId, meta.mapId, expansionCount);
      await logAdminActivity({
        type: 'NODE_EXPANDED',
        targetType: 'node',
        targetId: nodeId,
        details: 'Node expanded',
        performedBy: meta.userId,
        metadata: { expansionCount },
      });
      logUserEvent(meta.userId, 'node_expanded', { mapId: meta.mapId, nodeId, expansionCount }, 'map');
    },
    [meta.mapId, meta.userId]
  );

  const trackSubmapCreated = useCallback(
    async (submapId: string, parentNodeId?: string) => {
      await logAdminActivity({
        type: 'SUBMAP_CREATED',
        targetType: 'submap',
        targetId: submapId,
        details: 'Sub-map created from nested expansion',
        performedBy: meta.userId,
        metadata: { parentMapId: meta.mapId, parentNodeId },
      });
      logUserEvent(meta.userId, 'submap_created', { parentMapId: meta.mapId, submapId, parentNodeId }, 'map');
    },
    [meta.mapId, meta.userId]
  );

  const trackMapPublished = useCallback(async () => {
    await logAdminActivity({
      type: 'MAP_PUBLISHED',
      targetType: 'mindmap',
      targetId: meta.mapId,
      details: 'Map published to public gallery',
      performedBy: meta.userId,
      metadata: { title: meta.title },
    });
    logUserEvent(meta.userId, 'map_published', { mapId: meta.mapId, title: meta.title }, 'map');
  }, [meta.mapId, meta.userId, meta.title]);

  const trackMapUnpublished = useCallback(async () => {
    await logAdminActivity({
      type: 'MAP_UNPUBLISHED',
      targetType: 'mindmap',
      targetId: meta.mapId,
      details: 'Map unpublished from public gallery',
      performedBy: meta.userId,
      metadata: { title: meta.title },
    });
    logUserEvent(meta.userId, 'map_unpublished', { mapId: meta.mapId, title: meta.title }, 'map');
  }, [meta.mapId, meta.userId, meta.title]);

  const trackMapCloned = useCallback(async (originalMapId?: string) => {
    analytics.track('map_cloned', 'map', { originalMapId, clonedMapId: meta.mapId });
    await logAdminActivity({
      type: 'MAP_CLONED',
      targetType: 'mindmap',
      targetId: meta.mapId,
      details: 'Map cloned' + (originalMapId ? ' from ' + originalMapId : ''),
      performedBy: meta.userId,
      metadata: { originalMapId, title: meta.title },
    });
    logUserEvent(meta.userId, 'map_cloned', { mapId: meta.mapId, originalMapId, title: meta.title }, 'map');
  }, [meta.mapId, meta.userId, meta.title]);

  useEffect(() => {
    return () => {
      if (viewStartRef.current && !hasLoggedViewRef.current) {
        analytics.trackMapView(meta.mapId, 'direct', Date.now() - viewStartRef.current);
      }
    };
  }, [meta.mapId]);

  return {
    trackMapView,
    trackMapShared,
    trackMapExported,
    trackNodeExpanded,
    trackSubmapCreated,
    trackMapPublished,
    trackMapUnpublished,
    trackMapCloned,
  };
}

// ── Session Tracking ──

interface SessionMetrics {
  searches: number;
  mapsViewed: number;
  aiGenerations: number;
  chatsStarted: number;
  startTime: number;
  lastActivity: number;
}

export function useSessionTracking(userId?: string) {
  const [metricsRef] = useState<{ current: SessionMetrics }>(() => ({
    current: {
      searches: 0,
      mapsViewed: 0,
      aiGenerations: 0,
      chatsStarted: 0,
      startTime: Date.now(),
      lastActivity: Date.now(),
    }
  }));
  const sessionIdRef = useRef<string>(uuidv4());

  useEffect(() => {
    if (userId) analytics.setUserId(userId);
  }, [userId]);

  const trackSearch = useCallback(
    (query: string, resultsCount: number, filters?: Record<string, any>) => {
      metricsRef.current.searches++;
      metricsRef.current.lastActivity = Date.now();
      analytics.trackSearch(query, resultsCount, filters);
      logAdminActivity({
        type: 'SEARCH_PERFORMED',
        targetType: 'system',
        details: 'Search: "' + query + '" (' + resultsCount + ' results)',
        performedBy: userId,
        metadata: { query, resultsCount, filters, sessionId: sessionIdRef.current },
      });
      logUserEvent(userId, 'search_performed', { query, resultsCount, filters }, 'app');
    },
    [userId]
  );

  const trackMapViewed = useCallback((mapId: string) => {
    metricsRef.current.mapsViewed++;
    metricsRef.current.lastActivity = Date.now();
  }, []);

  const trackAIGeneration = useCallback(() => {
    metricsRef.current.aiGenerations++;
    metricsRef.current.lastActivity = Date.now();
  }, []);

  const trackChatStarted = useCallback(() => {
    metricsRef.current.chatsStarted++;
    metricsRef.current.lastActivity = Date.now();
  }, []);

  const trackSessionEnd = useCallback(async () => {
    const metrics = metricsRef.current;
    const sessionDuration = Date.now() - metrics.startTime;
    await logAdminActivity({
      type: 'USER_LOGGED_OUT',
      targetType: 'system',
      details: 'Session ended',
      performedBy: userId,
      duration: sessionDuration,
      metadata: {
        sessionId: sessionIdRef.current,
        sessionDuration,
        searches: metrics.searches,
        mapsViewed: metrics.mapsViewed,
        aiGenerations: metrics.aiGenerations,
        chatsStarted: metrics.chatsStarted,
      },
    });
    logUserEvent(
      userId,
      'session_end',
      { sessionDuration, searches: metrics.searches },
      'app'
    );
  }, [userId]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      analytics.track('session_end', 'engagement', {
        sessionId: sessionIdRef.current,
        metrics: metricsRef.current,
      });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') analytics.flush();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    const sessionId = sessionIdRef.current;
    const metrics = metricsRef.current;
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      analytics.track('session_end', 'engagement', {
        sessionId,
        metrics,
      });
    };
  }, []);

  return {
    trackSearch,
    trackMapViewed,
    trackAIGeneration,
    trackChatStarted,
    trackSessionEnd,
    getMetrics: () => ({ ...metricsRef.current }),
    getSessionId: () => sessionIdRef.current,
  };
}

// ── Error Tracking ──

export function useErrorTracking() {
  const trackError = useCallback(
    async (
      errorType: string,
      errorMessage: string,
      context?: { userId?: string; mapId?: string; page?: string; action?: string },
      stackTrace?: string
    ) => {
      analytics.trackError(errorType, errorMessage, stackTrace, context);
      await logAdminActivity({
        type: 'CLIENT_ERROR',
        targetType: 'system',
        details: errorType + ': ' + errorMessage,
        performedBy: context?.userId,
        errorType,
        stackTrace,
        metadata: {
          errorType,
          errorMessage,
          mapId: context?.mapId,
          page: context?.page,
          action: context?.action,
        },
      });
      logUserEvent(
        context?.userId,
        'client_error',
        { errorType, errorMessage, mapId: context?.mapId, page: context?.page, action: context?.action },
        'app'
      );
    },
    []
  );

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      trackError('UnhandledError', event.message, { page: window.location.pathname }, event.error?.stack);
    };
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      trackError('UnhandledPromiseRejection', String(event.reason), { page: window.location.pathname }, event.reason?.stack);
    };
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [trackError]);

  return { trackError };
}
