'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { MindMapData } from '@/types/mind-map';
import { useToast } from '@/hooks/use-toast';
import { trackMapCreated, trackStudyTime, trackNodesAdded, trackNestedExpansion } from '@/lib/activity-tracker';
import { Achievement } from '@/lib/achievements';
import { saveMindMap, updateMindMapField, getUserProfile, updateUserField } from '@/lib/supabase-db';

interface PersistenceOptions {
  onRemoteUpdate?: (data: MindMapData) => void;
  userApiKey?: string;
  preferredModel?: string;
}

export function useMindMapPersistence(options: PersistenceOptions = {}) {
  const { user, supabase } = useAuth();
  const { toast } = useToast();
  const isSavingRef = useRef(false);
  const generatingThumbnailsRef = useRef<Set<string>>(new Set());
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
    if (!user || !supabase) return;
    getUserProfile(supabase, user.id).then(profile => {
      if (isCancelled) return;
      if (profile?.preferences?.defaultAIPersona) setAiPersona(profile.preferences.defaultAIPersona);
    });
    return () => { isCancelled = true; };
  }, [user, supabase]);

  const updatePersona = useCallback(async (newPersona: string) => {
    setAiPersona(newPersona);
    if (!user || !supabase) return;
    const { data: profile } = await supabase.from('users').select('preferences').eq('id', user.id).single();
    await updateUserField(supabase, user.id, {
      preferences: { ...(profile?.preferences || {}), defaultAIPersona: newPersona },
    });
  }, [user, supabase]);

  // Real-time sync via Supabase Realtime
  const onRemoteUpdateRef = useRef(options.onRemoteUpdate);
  useEffect(() => { onRemoteUpdateRef.current = options.onRemoteUpdate; }, [options.onRemoteUpdate]);

  const subscribeToMap = useCallback((mapId: string, currentMap: MindMapData | undefined, isIdle: boolean) => {
    if (!user || !supabase || !mapId || !isIdle) return () => {};
    const channel = supabase
      .channel(`mindmap-${mapId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mindmaps', filter: `id=eq.${mapId}` }, (payload) => {
        const remoteData = payload.new as any;
        // Bug #11: normalize both timestamps to milliseconds before comparing
        const getMillis = (ts: any): number => {
          if (!ts) return 0;
          if (typeof ts === 'number') return ts;
          if (ts instanceof Date) return ts.getTime();
          return new Date(ts).getTime();
        };
        const remoteUpdatedAt = getMillis(remoteData.updated_at);
        const localUpdatedAt = getMillis((currentMap as any)?.updatedAt);
        // 1 s tolerance to suppress same-save echoes
        if (remoteUpdatedAt > localUpdatedAt + 1000 && onRemoteUpdateRef.current) {
          const content = remoteData.content || {};
          onRemoteUpdateRef.current({ ...remoteData, ...content, id: mapId } as MindMapData);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, supabase]);

  const saveMap = useCallback(async (mapToSave: MindMapData, existingId?: string, isSilent = false) => {
    if (!mapToSave || !user || !supabase || isSavingRef.current) return;
    if (mapToSave.mode === 'compare' && !mapToSave.compareData) { console.warn('Refused to save empty comparison map'); return; }
    if (mapToSave.mode !== 'compare' && (!mapToSave.subTopics || mapToSave.subTopics.length === 0)) { console.warn('Refused to save empty mind map'); return; }

    isSavingRef.current = true;
    const targetId = existingId || mapToSave.id || null;

    try {
      const safeTopic = mapToSave.topic || 'mind map topic';
      const summary = mapToSave.summary || `A detailed mind map exploration of ${safeTopic}.`;

      const { 
        subTopics, compareData, nodes, edges, explanations, 
        sourceFileContent, originalPdfFileContent, id, 
        aiPersona: mapAiPersona, nodeCount: mapNodeCount, isSubMap: mapIsSubMap, 
        sourceFileType: mapSourceFileType, isPublic: mapIsPublic, thumbnailUrl: mapThumbnailUrl,
        shortTitle, thumbnailPrompt,        summaryAudioUrl, isShared, publicCategories,
        publicViews, originalAuthorId, authorName, authorAvatar, searchSources,
        searchImages, searchTimestamp, pdfContext, videoId, sourceType,
        categoriesCount, sourcesCount, pinnedMessages, enrichments,
        confidenceRatings, quizAnswers, createdAt, updatedAt,
        ...metadata // eslint-disable-line @typescript-eslint/no-unused-vars  
      } = mapToSave as any;

      // Calculate node count
      let nodeCount = 0;
      if (mapToSave.mode === 'compare' && compareData) {
        nodeCount = 1 + (compareData.unityNexus?.length || 0) + (compareData.dimensions?.length || 0);
      } else if (subTopics) {
        nodeCount = 1;
        subTopics.forEach((st: any) => {
          nodeCount++;
          st.categories?.forEach((cat: any) => {
            nodeCount++;
            nodeCount += cat.subCategories?.length || 0;
          });
        });
      }

      const metadataToSave: any = {
        topic: safeTopic,
        summary,
        user_id: user.id,
        mode: mapToSave.mode || 'single',
        depth: mapToSave.depth || 'medium',
        ai_persona: mapAiPersona || aiPersona || 'Teacher',
        source_file_type: mapSourceFileType || mapToSave.sourceFileType || null,
        source_url: mapToSave.sourceUrl || null,
        thumbnail_prompt: mapToSave.thumbnailPrompt || '',
        node_count: nodeCount || mapNodeCount || 0,
        is_public: mapIsPublic || mapToSave.isPublic || false,
        is_sub_map: mapToSave.mode === 'single' ? (mapIsSubMap || mapToSave.isSubMap || false) : false,
        parent_map_id: mapToSave.parentMapId || null,
        pinned_messages: mapToSave.pinnedMessages || [],
        search_sources: mapToSave.searchSources || null,
        search_timestamp: mapToSave.searchTimestamp || null,
      };

      // Only include thumbnail_url if it's actually provided to avoid overwriting background generation
      if (mapThumbnailUrl || mapToSave.thumbnailUrl) {
        metadataToSave.thumbnail_url = mapThumbnailUrl || mapToSave.thumbnailUrl;
      }

      const contentToSave = {
        subTopics: subTopics || [],
        compareData: compareData || null,
        nodes: nodes || [],
        edges: edges || [],
        explanations: explanations || {},
        sourceFileContent: sourceFileContent || null,
        originalPdfFileContent: originalPdfFileContent || null,
        shortTitle: shortTitle || mapToSave.shortTitle || null,
      };

      const finalId = await saveMindMap(supabase, user.id, targetId, metadataToSave, contentToSave);

      // Background thumbnail generation - Only if missing, not already generating, and not a temporary synthesis state
      const isSynthesizing = (mapToSave as any).subTopics?.some((st: any) => st.name === "Synthesizing...");
      if (!mapToSave.thumbnailUrl && !generatingThumbnailsRef.current.has(finalId) && !isSynthesizing) {
        generatingThumbnailsRef.current.add(finalId);
        (async () => {
          try {
            console.log(`🖼️ Auto-generating topic-oriented thumbnail for map: ${finalId} (Topic: ${safeTopic})`);
            
            const { enhanceImagePromptAction } = await import('@/app/actions');
            
            // 1. Enhance the prompt based on the topic
            const enhancement = await enhanceImagePromptAction({
              prompt: safeTopic,
              style: 'cinematic',
              mood: 'mystical',
              composition: 'wide-shot'
            }, { 
              apiKey: options.userApiKey, 
              userId: user.id 
            });

            const finalPrompt = enhancement.enhancedPrompt?.enhancedPrompt || 
                               `Cinematic professional conceptual illustration of ${safeTopic}, dark premium background, purple and gold accents, 8k quality, sharp focus, no text, no watermarks`;

            // 2. Generate the image
            const response = await fetch('/api/generate-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                prompt: finalPrompt, 
                model: 'nanobanana-2', 
                width: 512, 
                height: 288, 
                userId: user.id, 
                userApiKey: options.userApiKey 
              }),
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.imageUrl) {
                // Save to DB
                await updateMindMapField(supabase, finalId, { thumbnail_url: data.imageUrl });
                console.log(`✅ Thumbnail generated and saved for map: ${finalId}`);
                
                // Update locally if callback provided
                if (options.onRemoteUpdate) {
                  options.onRemoteUpdate({ ...mapToSave, thumbnailUrl: data.imageUrl } as any);
                }
              } else {
                console.warn(`⚠️ API responded OK but missing imageUrl field`);
              }
            } else {
              const errText = await response.text();
              console.warn(`⚠️ Thumbnail generation API error [${response.status}]:`, errText.substring(0, 200));
            }
          } catch (err) {
            console.error('❌ Background thumbnail generation fatal error:', err);
          } finally {
            // Keep in set for a bit to prevent immediate retry if it failed or was slow
            setTimeout(() => {
              generatingThumbnailsRef.current.delete(finalId);
            }, 60000); // 1m lockout
          }
        })();
      }

      if (!targetId) {
        // New map — log activity
        try {
          const { logAdminActivityAction } = await import('@/app/actions');
          await logAdminActivityAction({ type: 'MAP_CREATED', targetId: finalId, targetType: 'mindmap', details: `Mindmap created: ${safeTopic}`, performedBy: user.id, performedByEmail: user.email || 'anonymous', metadata: { persona: metadataToSave.ai_persona, nodeCount, mode: mapToSave.mode, isSubMap: metadataToSave.is_sub_map } });
        } catch (e) { console.error('Failed to log map creation:', e); }

        const mapAchievements = await trackMapCreated(supabase, user.id, { mode: mapToSave.mode, sourceFileType: mapToSave.sourceFileType, nodeCount, aiPersona: mapToSave.aiPersona || aiPersona });
        showAchievementToasts(mapAchievements);
        
        if (nodes?.length > 0) {
          const nodeAchievements = await trackNodesAdded(supabase, user.id, nodes.length);
          showAchievementToasts(nodeAchievements);
        }
        
        if (metadataToSave.is_sub_map) {
          const expansionAchievements = await trackNestedExpansion(supabase, user.id);
          showAchievementToasts(expansionAchievements);
        }
      }

      if (!isSilent) toast({ title: targetId ? 'Map Updated!' : 'Map Auto-Saved!', description: `Mind map "${safeTopic}" has been ${targetId ? 'updated' : 'saved'}.` });
      return finalId;
    } catch (err: any) {
      console.error('Supabase save failed:', err);
      toast({ variant: 'destructive', title: 'Save Failed', description: err.message || 'An unknown error occurred.' });
    } finally {
      isSavingRef.current = false;
    }
  }, [user, supabase, toast, aiPersona, options.userApiKey]);

  // Track study time every 5 minutes (only if user has been active)
  const lastActivityRef = useRef(Date.now());
  useEffect(() => {
    if (!user || !supabase) return;
    const onActivity = () => { lastActivityRef.current = Date.now(); };
    window.addEventListener('mousedown', onActivity);
    window.addEventListener('keydown', onActivity);
    window.addEventListener('touchstart', onActivity);
    const intervalId = setInterval(() => {
      const idleMs = Date.now() - lastActivityRef.current;
      if (idleMs < 10 * 60 * 1000) {
        trackStudyTime(supabase, user.id, 5).catch(console.error);
      }
    }, 5 * 60 * 1000);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('mousedown', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('touchstart', onActivity);
    };
  }, [user, supabase]);

  const setupAutoSave = useCallback((mindMap: MindMapData | undefined, hasUnsavedChanges: boolean, isSelfReference: boolean, persistFn: (silent: boolean) => void) => {
    if (!user || !mindMap || isSelfReference || !hasUnsavedChanges) return () => {};
    const timer = setTimeout(() => persistFn(true), 3000);
    return () => clearTimeout(timer);
  }, [user]);

  return { aiPersona, updatePersona, subscribeToMap, saveMap, setupAutoSave };
}
