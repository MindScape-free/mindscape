'use client';

import React from 'react';
import { v4 as uuidv4 } from 'uuid';

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

type ComponentType<P> = React.ComponentType<P>;

export function withAnalytics<P extends object>(
  WrappedComponent: ComponentType<P>,
  pageName: string
): ComponentType<P> {
  const AnalyticsWrapper = (props: P) => {
    if (typeof window !== 'undefined') {
      analytics.trackPageView(pageName);
    }
    return React.createElement(WrappedComponent, props);
  };
  return AnalyticsWrapper;
}
