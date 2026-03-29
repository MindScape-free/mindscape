'use client';

import { useState, useCallback } from 'react';
import { useFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';

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
  const { user, firestore } = useFirebase();
  const [isSharing, setIsSharing] = useState(false);

  const publishMap = useCallback(async (options: ShareOptions): Promise<ShareResult> => {
    if (!user || !firestore) {
      return { success: false, error: 'User not authenticated' };
    }

    setIsSharing(true);

    try {
      const { publishMindMapAction } = await import('@/app/actions/community');
      
      const publicData = {
        originalAuthorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        authorAvatar: user.photoURL || undefined,
        topic: options.topic,
        summary: options.summary,
        publicCategories: options.categories || [],
        isPublic: true,
      };

      const result = await publishMindMapAction(options.mapId, publicData, user.uid);
      
      if (result.success) {
        const mapRef = doc(firestore, 'users', user.uid, 'mindmaps', options.mapId);
        await updateDoc(mapRef, { isPublic: true });
      }

      return { success: result.success, error: result.error ?? undefined };
    } catch (error) {
      console.error('Share error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to share map' 
      };
    } finally {
      setIsSharing(false);
    }
  }, [user, firestore]);

  const unpublishMap = useCallback(async (mapId: string): Promise<ShareResult> => {
    if (!user || !firestore) {
      return { success: false, error: 'User not authenticated' };
    }

    setIsSharing(true);

    try {
      const { removeFromCommunityAction } = await import('@/app/actions/community');
      const result = await removeFromCommunityAction(mapId, user.uid);
      
      if (result.success) {
        const mapRef = doc(firestore, 'users', user.uid, 'mindmaps', mapId);
        await updateDoc(mapRef, { isPublic: false });
      }

      return { success: result.success, error: result.error ?? undefined };
    } catch (error) {
      console.error('Unshare error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to unshare map' 
      };
    } finally {
      setIsSharing(false);
    }
  }, [user, firestore]);

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
      } catch {
        return false;
      }
    }
  }, []);

  return {
    isSharing,
    publishMap,
    unpublishMap,
    copyShareLink,
  };
}
