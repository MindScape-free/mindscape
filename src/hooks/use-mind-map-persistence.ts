'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useUser } from '@/lib/auth-context';
import { MindMapData } from '@/types/mind-map';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { trackMapCreated, trackStudyTime, trackNodesAdded, trackNestedExpansion } from '@/lib/activity-tracker';
import { Achievement } from '@/lib/achievements';
import { awardPointsAction } from '@/app/actions/award-points';
import { getSupabaseClient, saveMindMap, updateMindMapField, getUserProfile, updateUserField } from '@/lib/supabase-db';

interface PersistenceOptions {
  onRemoteUpdate?: (data: MindMapData) => void;
  userApiKey?: string;
  preferredModel?: string;
}

export function useMindMapPersistence(options: PersistenceOptions = {}) {
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const isSavingRef = useRef(false);
  const [aiPersona, setAiPersona] = useState<string>('Teacher');

  const showAchievementToasts = useCallback((achievements: Achievement[]) => {
    const tierEmoji: Record<string, string> = { bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎' };
    for (const a of achievements) {
      toast({ title: `${tierEmoji[a.tier] || '🏆'} Achievement Unlocked!`, description: `${a.name} — ${a.description}`, duration: 6000 });
    }
  }, [toast]);

  // Load user preferences
  useEffect(() => {
    let isCancelled = false;
    if (!user) return;
    const supabase = getSupabaseClient();
    getUserProfile(supabase, user.uid).then(profile => {
      if (isCancelled) return;
      if (profile?.preferences?.defaultAIPersona) setAiPersona(profile.preferences.defaultAIPersona);
    });
    return () => { isCancelled = true; };
  }, [user]);

  const updatePersona = useCallback(async (newPersona: string) => {
    setAiPersona(newPersona);
    if (!user) return;
    const supabase = getSupabaseClient();
    const { data: profile } = await supabase.from('users').select('preferences').eq('id', user.uid).single();
    await updateUserField(supabase, user.uid, {
      preferences: { ...(profile?.preferences || {}), defaultAIPersona: newPersona },
    });
  }, [user]);

  // Real-time sync via Supabase Realtime
  const onRemoteUpdateRef = useRef(options.onRemoteUpdate);
  useEffect(() => { onRemoteUpdateRef.current = options.onRemoteUpdate; }, [options.onRemoteUpdate]);

  const subscribeToMap = useCallback((mapId: string, currentMap: MindMapData | undefined, isIdle: boolean) => {
    if (!user || !mapId || !isIdle) return () => {};
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`mindmap-${mapId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mindmaps', filter: `id=eq.${mapId}` }, (payload) => {
        const remoteData = payload.new as any;
        const remoteUpdatedAt = new Date(remoteData.updated_at).getTime();
        const localUpdatedAt = (currentMap as any)?.updatedAt || 0;
        if (remoteUpdatedAt > localUpdatedAt && onRemoteUpdateRef.current) {
          const content = remoteData.content || {};
          onRemoteUpdateRef.current({ ...remoteData, ...content, id: mapId } as MindMapData);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const saveMap = useCallback(async (mapToSave: MindMapData, existingId?: string, isSilent = false) => {
    if (!mapToSave || !user || isSavingRef.current) return;
    if (mapToSave.mode === 'compare' && !mapToSave.compareData) { console.warn('Refused to save empty comparison map'); return; }
    if (mapToSave.mode !== 'compare' && (!mapToSave.subTopics || mapToSave.subTopics.length === 0)) { console.warn('Refused to save empty mind map'); return; }

    isSavingRef.current = true;
    const targetId = existingId || mapToSave.id || null;

    try {
      const supabase = getSupabaseClient();
      const safeTopic = mapToSave.topic || 'mind map topic';
      const summary = mapToSave.summary || `A detailed mind map exploration of ${safeTopic}.`;

      const { 
        subTopics, compareData, nodes, edges, explanations, 
        sourceFileContent, originalPdfFileContent, id, 
        aiPersona: mapAiPersona, nodeCount: mapNodeCount, isSubMap: mapIsSubMap, 
        sourceFileType: mapSourceFileType, isPublic: mapIsPublic, thumbnailUrl: mapThumbnailUrl,
        shortTitle, thumbnailPrompt, summaryAudioUrl, isShared, publicCategories,
        publicViews, originalAuthorId, authorName, authorAvatar, searchSources,
        searchImages, searchTimestamp, pdfContext, videoId, sourceType,
        categoriesCount, sourcesCount, pinnedMessages, enrichments,
        confidenceRatings, quizAnswers, createdAt, updatedAt,
        ...metadata 
      } = mapToSave as any;

      // Calculate node count
      let nodeCount = 0;
      if (mapToSave.mode === 'compare' && compareData) {
        nodeCount = 1 + (compareData.unityNexus?.length || 0) + (compareData.dimensions?.length || 0);
      } else if (subTopics) {
        nodeCount = 1;
        subTopics.forEach((st: any) => {
          nodeCount++;
          st.categories?.forEach((cat: any) => { nodeCount++; nodeCount += cat.subCategories?.length || 0; });
        });
      }

      const metadataToSave = {
        topic: safeTopic,
        summary,
        user_id: user.uid,
        mode: mapToSave.mode || 'single',
        depth: mapToSave.depth || 'medium',
        ai_persona: mapAiPersona || aiPersona || 'Teacher',
        source_file_type: mapSourceFileType || mapToSave.sourceFileType || null,
        source_url: mapToSave.sourceUrl || null,
        thumbnail_url: mapThumbnailUrl || mapToSave.thumbnailUrl || '',
        thumbnail_prompt: mapToSave.thumbnailPrompt || '',
        node_count: nodeCount || mapNodeCount || 0,
        is_public: mapIsPublic || mapToSave.isPublic || false,
        is_sub_map: mapToSave.mode === 'single' ? (mapIsSubMap || mapToSave.isSubMap || false) : false,
        parent_map_id: mapToSave.parentMapId || null,
        pinned_messages: mapToSave.pinnedMessages || [],
        search_sources: mapToSave.searchSources || null,
        search_timestamp: mapToSave.searchTimestamp || null,
      };

      const contentToSave = {
        subTopics: subTopics || [],
        compareData: compareData || null,
        nodes: nodes || [],
        edges: edges || [],
        explanations: explanations || {},
        sourceFileContent: sourceFileContent || null,
        originalPdfFileContent: originalPdfFileContent || null,
      };

      const finalId = await saveMindMap(supabase, user.uid, targetId, metadataToSave, contentToSave);

      // Background thumbnail generation
      if (!mapToSave.thumbnailUrl) {
        (async () => {
          try {
            const response = await fetch('/api/generate-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: `Cinematic conceptual illustration of ${safeTopic}, dark premium background, purple and gold accents, 8k quality, no text`, model: 'flux', width: 512, height: 288, userId: user.uid, userApiKey: options.userApiKey }),
            });
            if (response.ok) {
              const data = await response.json();
              if (data.imageUrl) await updateMindMapField(supabase, finalId, { thumbnail_url: data.imageUrl });
            }
          } catch { /* non-critical */ }
        })();
      }

      if (!targetId) {
        // New map — log activity
        try {
          const { logAdminActivityAction } = await import('@/app/actions');
          await logAdminActivityAction({ type: 'MAP_CREATED', targetId: finalId, targetType: 'mindmap', details: `Mindmap created: ${safeTopic}`, performedBy: user.uid, performedByEmail: user.email || 'anonymous', metadata: { persona: metadataToSave.ai_persona, nodeCount, mode: mapToSave.mode, isSubMap: metadataToSave.is_sub_map } });
        } catch (e) { console.error('Failed to log map creation:', e); }

        const mapAchievements = await trackMapCreated(supabase, user.uid, { mode: mapToSave.mode, sourceFileType: mapToSave.sourceFileType, nodeCount, aiPersona: mapToSave.aiPersona || aiPersona });
        showAchievementToasts(mapAchievements);
        if (nodes?.length > 0) showAchievementToasts(await trackNodesAdded(supabase, user.uid, nodes.length));
        if (metadataToSave.is_sub_map) showAchievementToasts(await trackNestedExpansion(supabase, user.uid));
      }

      if (!isSilent) toast({ title: targetId ? 'Map Updated!' : 'Map Auto-Saved!', description: `Mind map "${safeTopic}" has been ${targetId ? 'updated' : 'saved'}.` });
      return finalId;
    } catch (err: any) {
      console.error('Supabase save failed:', err);
      toast({ variant: 'destructive', title: 'Save Failed', description: err.message || 'An unknown error occurred.' });
    } finally {
      isSavingRef.current = false;
    }
  }, [user, toast, aiPersona, options.userApiKey]);

  // Track study time every 5 minutes
  useEffect(() => {
    if (!user) return;
    const supabase = getSupabaseClient();
    const intervalId = setInterval(() => {
      trackStudyTime(supabase, user.uid, 5).catch(console.error);
    }, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [user]);

  const setupAutoSave = useCallback((mindMap: MindMapData | undefined, hasUnsavedChanges: boolean, isSelfReference: boolean, persistFn: (silent: boolean) => void) => {
    if (!user || !mindMap || isSelfReference || !hasUnsavedChanges) return () => {};
    const timer = setTimeout(() => persistFn(true), 3000);
    return () => clearTimeout(timer);
  }, [user]);

  return { aiPersona, updatePersona, subscribeToMap, saveMap, setupAutoSave };
}
