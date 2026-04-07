'use client';

import { useCallback, useEffect, useRef } from 'react';
import { analytics } from '@/lib/analytics-tracker';
import { useAdminActivityLog } from '@/lib/admin-utils';

interface MapEngagementMeta {
  mapId: string;
  userId?: string;
  title?: string;
  isPublic?: boolean;
}

export function useMapTracking(meta: MapEngagementMeta) {
  const { logAdminActivity } = useAdminActivityLog();
  const viewStartRef = useRef<number | null>(null);
  const hasLoggedViewRef = useRef(false);

  const trackMapView = useCallback(async (source: 'gallery' | 'direct' | 'shared' | 'admin' = 'direct') => {
    if (hasLoggedViewRef.current) return;
    hasLoggedViewRef.current = true;

    viewStartRef.current = Date.now();
    const duration = viewStartRef.current;

    analytics.trackMapView(meta.mapId, source, duration);

    await logAdminActivity({
      type: 'MAP_VIEWED',
      targetType: 'mindmap',
      targetId: meta.mapId,
      details: `Map viewed: ${meta.title || meta.mapId}`,
      performedBy: meta.userId,
      metadata: {
        source,
        isPublic: meta.isPublic,
        title: meta.title,
      },
    });
  }, [meta.mapId, meta.userId, meta.title, meta.isPublic, logAdminActivity]);

  const trackMapShared = useCallback(async (
    shareMethod: 'email' | 'link' | 'social' | 'embed',
    recipientEmail?: string
  ) => {
    analytics.trackMapShared(meta.mapId, shareMethod, recipientEmail);

    await logAdminActivity({
      type: 'MAP_SHARED',
      targetType: 'mindmap',
      targetId: meta.mapId,
      details: `Map shared via ${shareMethod}`,
      performedBy: meta.userId,
      metadata: {
        shareMethod,
        recipientEmail,
        isPublic: meta.isPublic,
      },
    });
  }, [meta.mapId, meta.userId, meta.isPublic, logAdminActivity]);

  const trackMapExported = useCallback(async (format: 'pdf' | 'png' | 'json' | 'markdown') => {
    analytics.trackMapExport(meta.mapId, format);

    await logAdminActivity({
      type: 'MAP_EXPORTED',
      targetType: 'mindmap',
      targetId: meta.mapId,
      details: `Map exported as ${format.toUpperCase()}`,
      performedBy: meta.userId,
      metadata: {
        format,
        isPublic: meta.isPublic,
      },
    });
  }, [meta.mapId, meta.userId, meta.isPublic, logAdminActivity]);

  const trackNodeExpanded = useCallback(async (nodeId: string, expansionCount: number) => {
    analytics.trackNodeExpansion(nodeId, meta.mapId, expansionCount);

    await logAdminActivity({
      type: 'NODE_EXPANDED',
      targetType: 'node',
      targetId: nodeId,
      details: `Node expanded`,
      performedBy: meta.userId,
      metadata: {
        mapId: meta.mapId,
        expansionCount,
      },
    });
  }, [meta.mapId, meta.userId, logAdminActivity]);

  const trackSubmapCreated = useCallback(async (submapId: string, parentNodeId?: string) => {
    await logAdminActivity({
      type: 'SUBMAP_CREATED',
      targetType: 'submap',
      targetId: submapId,
      details: `Sub-map created from nested expansion`,
      performedBy: meta.userId,
      metadata: {
        parentMapId: meta.mapId,
        parentNodeId,
      },
    });
  }, [meta.mapId, meta.userId, logAdminActivity]);

  const trackMapPublished = useCallback(async () => {
    await logAdminActivity({
      type: 'MAP_PUBLISHED',
      targetType: 'mindmap',
      targetId: meta.mapId,
      details: `Map published to public gallery`,
      performedBy: meta.userId,
      metadata: {
        title: meta.title,
      },
    });
  }, [meta.mapId, meta.userId, meta.title, logAdminActivity]);

  const trackMapUnpublished = useCallback(async () => {
    await logAdminActivity({
      type: 'MAP_UNPUBLISHED',
      targetType: 'mindmap',
      targetId: meta.mapId,
      details: `Map unpublished from public gallery`,
      performedBy: meta.userId,
      metadata: {
        title: meta.title,
      },
    });
  }, [meta.mapId, meta.userId, meta.title, logAdminActivity]);

  const trackMapCloned = useCallback(async (originalMapId?: string) => {
    analytics.track('map_cloned', 'map', {
      originalMapId,
      clonedMapId: meta.mapId,
    });

    await logAdminActivity({
      type: 'MAP_CLONED',
      targetType: 'mindmap',
      targetId: meta.mapId,
      details: `Map cloned${originalMapId ? ` from ${originalMapId}` : ''}`,
      performedBy: meta.userId,
      metadata: {
        originalMapId,
        title: meta.title,
      },
    });
  }, [meta.mapId, meta.userId, meta.title, logAdminActivity]);

  useEffect(() => {
    return () => {
      if (viewStartRef.current && !hasLoggedViewRef.current) {
        const duration = Date.now() - viewStartRef.current;
        analytics.trackMapView(meta.mapId, 'direct', duration);
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
