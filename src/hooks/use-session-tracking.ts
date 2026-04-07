'use client';

import { useEffect, useCallback, useRef } from 'react';
import { analytics } from '@/lib/analytics-tracker';
import { useAdminActivityLog } from '@/lib/admin-utils';
import { v4 as uuidv4 } from 'uuid';

interface SessionMetrics {
  pageViews: number;
  searches: number;
  mapsViewed: number;
  aiGenerations: number;
  chatsStarted: number;
  startTime: number;
  lastActivity: number;
}

export function useSessionTracking(userId?: string) {
  const { logAdminActivity } = useAdminActivityLog();
  const metricsRef = useRef<SessionMetrics>({
    pageViews: 0,
    searches: 0,
    mapsViewed: 0,
    aiGenerations: 0,
    chatsStarted: 0,
    startTime: Date.now(),
    lastActivity: Date.now(),
  });
  const sessionIdRef = useRef<string>(uuidv4());

  useEffect(() => {
    if (userId) {
      analytics.setUserId(userId);
    }
  }, [userId]);

  const trackPageView = useCallback((pageName: string, additionalData?: Record<string, any>) => {
    metricsRef.current.pageViews++;
    metricsRef.current.lastActivity = Date.now();

    analytics.trackPageView(pageName, additionalData);
  }, []);

  const trackSearch = useCallback((query: string, resultsCount: number, filters?: Record<string, any>) => {
    metricsRef.current.searches++;
    metricsRef.current.lastActivity = Date.now();

    analytics.trackSearch(query, resultsCount, filters);

    logAdminActivity({
      type: 'SEARCH_PERFORMED',
      targetType: 'system',
      details: `Search: "${query}" (${resultsCount} results)`,
      performedBy: userId,
      metadata: {
        query,
        resultsCount,
        filters,
        sessionId: sessionIdRef.current,
      },
    });
  }, [userId, logAdminActivity]);

  const trackMapViewed = useCallback((mapId: string) => {
    metricsRef.current.mapsViewed++;
    metricsRef.current.lastActivity = Date.now();
  }, []);

  const trackAIGeneration = useCallback((sourceType: string, mode: string, nodeCount: number) => {
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
      details: `Session ended`,
      performedBy: userId,
      duration: sessionDuration,
      metadata: {
        sessionId: sessionIdRef.current,
        sessionDuration,
        pageViews: metrics.pageViews,
        searches: metrics.searches,
        mapsViewed: metrics.mapsViewed,
        aiGenerations: metrics.aiGenerations,
        chatsStarted: metrics.chatsStarted,
      },
    });
  }, [userId, logAdminActivity]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      analytics.track('session_end', 'engagement', {
        sessionId: sessionIdRef.current,
        metrics: metricsRef.current,
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        analytics.flush();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      analytics.track('session_end', 'engagement', {
        sessionId: sessionIdRef.current,
        metrics: metricsRef.current,
      });
    };
  }, []);

  return {
    trackPageView,
    trackSearch,
    trackMapViewed,
    trackAIGeneration,
    trackChatStarted,
    trackSessionEnd,
    getMetrics: () => ({ ...metricsRef.current }),
    getSessionId: () => sessionIdRef.current,
  };
}

export function useErrorTracking() {
  const { logAdminActivity } = useAdminActivityLog();

  const trackError = useCallback(async (
    errorType: string,
    errorMessage: string,
    context?: {
      userId?: string;
      mapId?: string;
      page?: string;
      action?: string;
    },
    stackTrace?: string
  ) => {
    analytics.trackError(errorType, errorMessage, stackTrace, context);

    await logAdminActivity({
      type: 'CLIENT_ERROR',
      targetType: 'system',
      details: `${errorType}: ${errorMessage}`,
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
  }, [logAdminActivity]);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      trackError(
        'UnhandledError',
        event.message,
        { page: window.location.pathname },
        event.error?.stack
      );
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      trackError(
        'UnhandledPromiseRejection',
        String(event.reason),
        { page: window.location.pathname },
        event.reason?.stack
      );
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
