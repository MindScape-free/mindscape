'use client';

import { useState, useCallback } from 'react';
import { useUser } from '@/lib/auth-context';
import { getSupabaseClient, updateMindMapField } from '@/lib/supabase-db';

export interface ShareOptions {
  mapId: string;
  topic: string;
  summary?: string;
  categories?: string[];
}

export interface ShareResult {
  success: boolean;
  error?: string;
}

export function useMapSharing() {
  const { user } = useUser();
  const [isSharing, setIsSharing] = useState(false);

  const publishMap = useCallback(async (options: ShareOptions): Promise<ShareResult> => {
    if (!user) return { success: false, error: 'User not authenticated' };
    setIsSharing(true);
    try {
      const { publishMindMapAction } = await import('@/app/actions/community');
      const result = await publishMindMapAction(options.mapId, {
        originalAuthorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        topic: options.topic,
        summary: options.summary,
        publicCategories: options.categories || [],
        isPublic: true,
      }, user.uid);

      if (result.success) {
        const supabase = getSupabaseClient();
        await updateMindMapField(supabase, options.mapId, { is_public: true });
      }
      return { success: result.success, error: result.error ?? undefined };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to share map' };
    } finally {
      setIsSharing(false);
    }
  }, [user]);

  const unpublishMap = useCallback(async (mapId: string): Promise<ShareResult> => {
    if (!user) return { success: false, error: 'User not authenticated' };
    setIsSharing(true);
    try {
      const { removeFromCommunityAction } = await import('@/app/actions/community');
      const result = await removeFromCommunityAction(mapId, user.uid);
      if (result.success) {
        const supabase = getSupabaseClient();
        await updateMindMapField(supabase, mapId, { is_public: false });
      }
      return { success: result.success, error: result.error ?? undefined };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to unshare map' };
    } finally {
      setIsSharing(false);
    }
  }, [user]);

  const copyShareLink = useCallback(async (mapId: string): Promise<boolean> => {
    const shareUrl = `${window.location.origin}/canvas?publicMapId=${mapId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      return true;
    } catch {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return true;
      } catch { return false; }
    }
  }, []);

  return { isSharing, publishMap, unpublishMap, copyShareLink };
}
