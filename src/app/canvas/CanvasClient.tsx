
'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { MindMap } from '@/components/mind-map';
import { MindMapData, NestedExpansionItem, MindMapWithId } from '@/types/mind-map';
import { NeuralLoader } from '@/components/loading/neural-loader';
import { ErrorBoundary } from '@/components/error-boundary';
import { safeGetItem } from '@/lib/storage';
import { useXP } from '@/contexts/xp-context';
import dynamic from 'next/dynamic';

const ChatPanel = dynamic(() => import('@/components/chat-panel').then(mod => mod.ChatPanel), {
  ssr: false,
  loading: () => null
});

import { SearchReferencesPanel, SourceFileModal } from '@/components/canvas';

import { Button } from '@/components/ui/button';
import {
  Scale, RefreshCw, Sparkles, Loader2, ZapOff, List, UserRound, Zap as ZapIcon, Globe, Palette, Brain, FileText, Image as ImageIcon, Youtube, Key
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TooltipProvider,
} from '@/components/ui/tooltip';

import { useUser } from '@/lib/auth-context';
import { getSupabaseClient } from '@/lib/supabase-db';
import {
  generateMindMapAction,
  generateMindMapFromImageAction,
  generateMindMapFromPdfAction,
  generateMindMapFromTextAction,
  generateYouTubeMindMapAction,
  generateMindMapFromWebsiteAction,
  generateComparisonMapAction,
  synthesizeNodesAction,
  mapToMindMapData,
} from '@/app/actions';
// shareMindMapAction removed - using client-side sharing
import { cn, depthFromServer } from '@/lib/utils';
import { toPlainObject } from '@/lib/serialize';
import { mindscapeMap } from '@/lib/mindscape-data';
import { useMindMapStack } from '@/hooks/use-mind-map-stack';
import { useAIConfig } from '@/contexts/ai-config-context';
import { useMindMapRouter } from '@/hooks/use-mind-map-router';
import { useMindMapPersistence } from '@/hooks/use-mind-map-persistence';
import { useMindMapPinnedMessages } from '@/hooks/use-mind-map-pinned-messages';
import { Profiler } from '@/components/debug/profiler';
import { useAIHealth } from '@/hooks/use-ai-health';
import { useActivity } from '@/contexts/activity-context';
import { resolveDepthWithConfidence, analyzeTopicComplexity } from '@/lib/depth-analysis';
import { useAITracking } from '@/hooks/use-ai-tracking';
import { useSessionTracking } from '@/hooks/use-session-tracking';
import { useMapTracking } from '@/hooks/use-map-tracking';

function MindMapPageContent() {
  const { params, navigateToMap, changeLanguage, clearRegenFlag, getParamKey, router } = useMindMapRouter();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const supabase = getSupabaseClient();
  const { config, refreshBalance } = useAIConfig();
  const { awardXP } = useXP();

  const [mode, setMode] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInitialMessage, setChatInitialMessage] = useState<string | undefined>(undefined);
  const [chatInitialView, setChatInitialView] = useState<'chat' | 'history' | 'pins' | 'canvas-pins' | undefined>(undefined);
  const [chatMode, setChatMode] = useState<'chat' | 'quiz'>('chat');
  const [chatTopic, setChatTopic] = useState<string | undefined>(undefined);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isRegenDialogOpen, setIsRegenDialogOpen] = useState(false);
  const [tempPersona, setTempPersona] = useState<string>('Teacher');
  const [tempDepth, setTempDepth] = useState<'low' | 'medium' | 'deep'>('low');
  const [dynamicItemRange, setDynamicItemRange] = useState<{ min: number; max: number }>({ min: 24, max: 40 });

  const [useFileAwareContext, setUseFileAwareContext] = useState(false);
  const [pinnedMessagesCount, setPinnedMessagesCount] = useState(0);

  // Universal Nested Maps Dialog state
  const [mapHierarchy, setMapHierarchy] = useState<{
    rootMap: { id: string; topic: string; icon?: string } | null;
    allSubMaps: NestedExpansionItem[];
  }>({ rootMap: null, allSubMaps: [] });


  const aiHealth = useAIHealth();
  const { setStatus: setGlobalStatus, setAiHealth: setGlobalHealth, setActiveTaskName } = useActivity();
  const handleUpdateRef = useRef<(data: Partial<MindMapData>) => void>(() => { });
  const quizDeepenRef = useRef<((w: { tag: string; score: number }[], t: string) => void) | null>(null);
  const zoomToNodeRef = useRef<((nodeName: string) => void) | null>(null);
  const [resonanceNodes, setResonanceNodes] = useState<string[]>([]);

  const persistenceOptions = useMemo(() => ({
    onRemoteUpdate: (data: MindMapData) => handleUpdateRef.current(data),
    userApiKey: config.pollinationsApiKey,
    preferredModel: config.textModel || config.pollinationsModel,
  }), [config.pollinationsApiKey, config.textModel, config.pollinationsModel]);

  const { aiPersona, updatePersona: handlePersonaChange, subscribeToMap, saveMap: handleSaveMap, setupAutoSave } = useMindMapPersistence(persistenceOptions);

  // Sync URL persona with persistence on mount
  useEffect(() => {
    if (params.persona && params.persona.toLowerCase() !== aiPersona.toLowerCase()) {
      handlePersonaChange(params.persona);
    }
  }, [params.persona, handlePersonaChange, aiPersona]);

  // 1. ADAPTERS
  const expansionAdapter = useMemo(() => ({
    generate: async (topic: string, parentTopic?: string, branchDepth?: 'low' | 'medium' | 'deep') => {
      const aiOptions = {
        provider: config.provider,
        apiKey: config.provider === 'pollinations' ? config.pollinationsApiKey : config.apiKey,
        model: config.textModel || config.pollinationsModel,
        userId: user?.id,
      };
      const result = await generateMindMapAction({
        topic,
        parentTopic,
        targetLang: params.lang,
        persona: params.persona || aiPersona,
        depth: depthFromServer(branchDepth || params.depth),
        useSearch: params.useSearch === 'true',
      }, aiOptions);
      
      // Refresh balance after successful expansion
      refreshBalance();
      
      return result;
    }
  }), [params.persona, aiPersona, params.lang, params.depth, params.useSearch, config.provider, config.apiKey, config.pollinationsApiKey, config.textModel, config.pollinationsModel, user?.id, refreshBalance]);
  // Keep a ref of the current source context for the persistence adapter closure
  const sourceContextRefs = useRef({ content: null as string | null, type: null as string | null, originalPdf: null as string | null });

  // 2. HOOK INITIALIZATION
  const {
    stack: mindMaps,
    activeIndex: activeMindMapIndex,
    currentMap: mindMap,
    status: hookStatus,
    error: hookError,
    generatingNodeId,
    generatingTopic,
    push: expandNode,
    navigate: setActiveMindMapIndex,
    update: handleUpdateCurrentMap,
    sync: handleSaveMapFromHook,
    setStack: setMindMaps,
    setActiveIndex: setActiveMindMapIndexState,
    replace: handleReplaceCurrentMap,
    generationScope
  } = useMindMapStack({
    expansionAdapter,
    persistenceAdapter: {
      persist: async (map, id, silent) => {
        const mapToSave = {
          ...map,
          sourceFileContent: sourceContextRefs.current.content || undefined,
          sourceFileType: sourceContextRefs.current.type || undefined,
          originalPdfFileContent: sourceContextRefs.current.originalPdf || undefined,
        };
        const finalId = await handleSaveMap(mapToSave, id, silent);
        return finalId;
      }
    }
  });

  const { trackGenerationComplete, trackGenerationFailed } = useAITracking();
  const { trackPageView } = useSessionTracking(user?.id);
  const mapTracker = useMapTracking({
    mapId: mindMap?.id || params.mapId || 'pending',
    userId: user?.id,
    title: mindMap?.topic || params.topic || undefined,
    isPublic: !!params.publicMapId,
  });

  useEffect(() => {
    trackPageView('Canvas', { 
      topic: params.topic, 
      mapId: params.mapId,
      mode: params.topic1 && params.topic2 ? 'compare' : 'single'
    });
  }, [trackPageView, params.topic, params.mapId, params.topic1, params.topic2]);

  // Sync ref with actual function
  useEffect(() => {
    handleUpdateRef.current = handleUpdateCurrentMap;
  }, [handleUpdateCurrentMap]);

  // PINNED MESSAGES
  const { pinnedMessages, addPinnedMessage, removePinnedMessage } = useMindMapPinnedMessages({
    mindMapId: mindMap?.id,
    pinnedMessages: mindMap?.pinnedMessages || [],
    onPinsUpdate: (updatedPins) => {
      handleUpdateCurrentMap({ pinnedMessages: updatedPins });
      setPinnedMessagesCount(updatedPins.length);
    },
  });

  // Update pinned count when mindMap changes
  useEffect(() => {
    setPinnedMessagesCount(mindMap?.pinnedMessages?.length || 0);
  }, [mindMap?.pinnedMessages]);

  // Local state for initial fetch/regenerate only
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [localGeneratingNodeId, setLocalGeneratingNodeId] = useState<string | null>(null);

  // Source File Data State
  const [sourceFileContent, setSourceFileContent] = useState<string | null>(null);
  const [sourceFileType, setSourceFileType] = useState<string | null>(null);
  const [originalPdfFileContent, setOriginalPdfFileContent] = useState<string | null>(null);
  const [sourceFile2Content, setSourceFile2Content] = useState<string | null>(null);
  const [sourceFile2Type, setSourceFile2Type] = useState<string | null>(null);
  const [originalPdf2FileContent, setOriginalPdf2FileContent] = useState<string | null>(null);
  const [isSourceFileModalOpen, setIsSourceFileModalOpen] = useState(false);

  // Toolbar pin button → open chat panel at canvas-pins view
  const handleToggleFileAware = useCallback(() => {
    setUseFileAwareContext(prev => !prev);
  }, []);

  const handleOpenPinnedMessages = useCallback(() => {
    setChatInitialView('canvas-pins');
    setIsChatOpen(true);
  }, []);


  // Sync refs whenever state changes
  useEffect(() => {
    sourceContextRefs.current = { content: sourceFileContent, type: sourceFileType, originalPdf: originalPdfFileContent };
  }, [sourceFileContent, sourceFileType, originalPdfFileContent]);

  const isLoading = (hookStatus === 'generating' && generationScope === 'foreground') || isInitialLoading;
  const error = hookError || initialError;
  const activeGeneratingNodeId = generatingNodeId || localGeneratingNodeId;

  const setIsLoading = setIsInitialLoading;
  const setError = setInitialError;
  const setGeneratingNodeId = setLocalGeneratingNodeId;

  const isSaved = !!(mindMap && (mindMap as any).id);

  // Real-time sync listener (Phase 3.3)
  useEffect(() => {
    if (!mindMap?.id || hookStatus !== 'idle') return;
    const unsubscribe = subscribeToMap(mindMap.id, mindMap, hookStatus === 'idle');
    return () => unsubscribe();
  }, [mindMap?.id, hookStatus, subscribeToMap, mindMap]);

  // Sync to Global Activity Context
  useEffect(() => {
    setGlobalStatus(hookStatus);
    return () => setGlobalStatus('idle');
  }, [hookStatus, setGlobalStatus]);

  useEffect(() => {
    setGlobalHealth(aiHealth || []);
    return () => setGlobalHealth([]);
  }, [aiHealth, setGlobalHealth]);

  useEffect(() => {
    if (generatingTopic) {
      setActiveTaskName(generatingTopic);
    } else {
      setActiveTaskName(null);
    }
    return () => setActiveTaskName(null);
  }, [generatingTopic, setActiveTaskName]);

  // No manual persona change needed here - handled by hook

  /* Safe auto-save with race condition lock */
  const lastFetchedParamsRef = useRef<string>('');

  // Refs to avoid effect dependencies
  const mindMapsRef = useRef(mindMaps);
  useEffect(() => { mindMapsRef.current = mindMaps; }, [mindMaps]);

  useEffect(() => {
    const fetchMindMapData = async () => {
      if (isUserLoading) return;

      const currentParamsKey = getParamKey();

      // If we already have this map in our state, just switch to it
      const existingMapIndex = mindMaps.findIndex((m: any) => {
        if (params.mapId && m.id === params.mapId) return true;
        if (params.topic && m.topic?.toLowerCase() === params.topic.toLowerCase()) return true;
        if (params.isSelfReference && m.topic?.toLowerCase() === 'mindscape core architecture') return true;
        return false;
      });

      if (existingMapIndex !== -1 && !params.isRegenerating) {
        if (activeMindMapIndex !== existingMapIndex) {
          setActiveMindMapIndexState(existingMapIndex);
        }
        setIsLoading(false);
        return;
      }

      if (lastFetchedParamsRef.current === currentParamsKey) return;
      lastFetchedParamsRef.current = currentParamsKey;

      setIsLoading(true);
      setError(null);

      let result: { data: MindMapData | null; error: string | null } = { data: null, error: null };
      let currentMode = 'standard';

      let pendingSourceFileContent: string | null = null;
      let pendingSourceFileType: string | null = null;
      let pendingOriginalPdfContent: string | null = null;

      const trackCompletion = (mapId: string, nodeCount: number, sourceType: string, mode: string) => {
        trackGenerationComplete(params.sessionId || mapId || 'pending', {
          sourceType: sourceType as any,
          mode: mode as any,
          depth: params.depth as any,
          persona: params.persona || aiPersona,
          userId: user?.id
        }, {
          nodeCount,
          mapId: mapId
        });
      };

      const trackFailure = (errorType: string, message: string, sourceType: string, mode: string) => {
        trackGenerationFailed(params.sessionId || 'pending', {
          sourceType: sourceType as any,
          mode: mode as any,
          depth: params.depth as any,
          persona: params.persona || aiPersona,
          userId: user?.id
        }, {
          type: errorType,
          message: message
        });
      };

      let sessionContent: any = null;

      try {
        if (params.isSelfReference) {
          currentMode = 'self-reference';
          result.data = { ...mindscapeMap, id: 'mindscape' } as MindMapWithId;
        } else {
          const effectiveMapId = params.mapId || params.sharedMapId || params.publicMapId;

          if (params.isRegenerating && effectiveMapId) {
            currentMode = 'saved';
            let topicToRegen = params.topic || (mindMapsRef.current.find((m: any) => m.id === effectiveMapId)?.topic);
            if (!topicToRegen && user) {
              const { data: mapRow } = await supabase.from('mindmaps').select('topic').eq('id', effectiveMapId).eq('user_id', user.id).single();
              topicToRegen = mapRow?.topic;
            }

            if (!topicToRegen) throw new Error("Could not determine topic for regeneration.");

            const aiOptions = {
              provider: config.provider,
              apiKey: config.provider === 'pollinations' ? config.pollinationsApiKey : config.apiKey,
              model: config.textModel || config.pollinationsModel,
              strict: true,
              userId: user?.id,
            };
            result = await generateMindMapAction({
              topic: topicToRegen!,
              parentTopic: params.parent || undefined,
              targetLang: params.lang,
              persona: params.persona || aiPersona,
              depth: depthFromServer(params.depth),
              useSearch: params.useSearch === 'true',
            }, aiOptions);

            if (result.data) {
              await handleSaveMap(result.data, effectiveMapId);
            }
          } else if (effectiveMapId) {
            currentMode = 'saved';
            mapTracker.trackMapView(params.publicMapId ? 'shared' : 'direct');

            // Shared map
            if (params.sharedMapId || params.mapId?.startsWith('share_')) {
              const shareId = params.sharedMapId || params.mapId!;
              const { data: row } = await supabase.from('shared_mindmaps').select('*').eq('id', shareId).single();
              if (row) result.data = { ...row, ...(row.content || {}), id: row.id } as any;
            } else if (params.publicMapId || params.mapId?.startsWith('public_')) {
              const pubId = params.publicMapId || params.mapId!;
              const { data: row } = await supabase.from('public_mindmaps').select('*').eq('id', pubId).single();
              if (row) {
                result.data = { ...row, ...(row.content || {}), id: row.id } as any;
                await supabase.from('public_mindmaps').update({ public_views: (row.public_views || 0) + 1 }).eq('id', pubId);
              }
            } else if ((user || params.ownerId) && params.mapId) {
              const targetUid = params.ownerId || user?.id;
              if (targetUid) {
                const { data: row } = await supabase.from('mindmaps').select('*').eq('id', params.mapId).eq('user_id', targetUid).single();
                if (row) result.data = { ...row, ...(row.content || {}), id: row.id } as any;
              }
            }
            // Fallback: try public_mindmaps
            if (!result.data && params.mapId) {
              const { data: row } = await supabase.from('public_mindmaps').select('*').eq('id', params.mapId).single();
              if (row) result.data = { ...row, ...(row.content || {}), id: row.id } as any;
            }

            if (!result.data && !result.error) {
              result.error = "Mind map not found or you don't have permission to view it.";
            }
          } else if (params.topic1 && params.topic2) {
            currentMode = 'compare';
            result = await generateComparisonMapAction({
              topic1: params.topic1!,
              topic2: params.topic2!,
              targetLang: params.lang,
              persona: params.persona || aiPersona,
              depth: params.depth,
              useSearch: params.useSearch === 'true',
            }, {
              provider: config.provider,
              apiKey: config.provider === 'pollinations' ? config.pollinationsApiKey : config.apiKey,
              model: config.textModel || config.pollinationsModel,
              userId: user?.id,
            });
          } else if (params.topic) {
            currentMode = 'standard';
            result = await generateMindMapAction({
              topic: params.topic!,
              parentTopic: params.parent || undefined,
              targetLang: params.lang,
              persona: params.persona || aiPersona,
              depth: depthFromServer(params.depth),
              useSearch: params.useSearch === 'true',
            }, {
              provider: config.provider,
              apiKey: config.provider === 'pollinations' ? config.pollinationsApiKey : config.apiKey,
              model: config.textModel || config.pollinationsModel,
              userId: user?.id,
            });
          }
 else if (params.sessionId) {
            const sessionType = safeGetItem<string>(`session-type-${params.sessionId}`);
            sessionContent = safeGetItem<{file?: string; text?: string; originalFile?: string}>(`session-content-${params.sessionId}`);

            // Bug #14: surface expired/missing session immediately instead of hanging loader
            if (!sessionContent || !sessionType) {
              setError('Your session has expired. Please go back and try again.');
              setIsLoading(false);
              return;
            }

            if (sessionContent) {
              let fileContent, additionalText, originalPdf;
              try {
                fileContent = sessionContent.file;
                additionalText = sessionContent.text;
                originalPdf = sessionContent.originalFile;
              } catch {
                fileContent = '';
                additionalText = '';
              }

              if (sessionType) {
                setSourceFileType(sessionType);
                pendingSourceFileType = sessionType;
              }
              if (fileContent) {
                setSourceFileContent(fileContent);
                pendingSourceFileContent = fileContent;
              }
              if (originalPdf) {
                setOriginalPdfFileContent(originalPdf);
                pendingOriginalPdfContent = originalPdf;
              }

              if (sessionType === 'image') {
                currentMode = 'vision-image';
                result = await generateMindMapFromImageAction({
                  imageDataUri: fileContent!,
                  targetLang: params.lang,
                  persona: params.persona || aiPersona,
                  depth: params.depth,
                  sessionId: params.sessionId || undefined,
                }, {
                  provider: config.provider,
                  apiKey: config.provider === 'pollinations' ? config.pollinationsApiKey : config.apiKey,
                  model: config.textModel || config.pollinationsModel,
                  userId: user?.id,
                });
              } else if (sessionType === 'youtube') {
                currentMode = 'youtube';
                result = await generateYouTubeMindMapAction({
                  url: fileContent!,
                  targetLang: params.lang,
                  persona: params.persona || aiPersona,
                  depth: params.depth,
                  sessionId: params.sessionId || undefined,
                }, {
                  provider: config.provider,
                  apiKey: config.provider === 'pollinations' ? config.pollinationsApiKey : config.apiKey,
                  model: config.textModel || config.pollinationsModel,
                  userId: user?.id,
                });
              } else if (sessionType === 'pdf') {
                currentMode = 'vision-pdf';
                result = await generateMindMapFromPdfAction({
                  text: fileContent!,
                  context: additionalText, // Include custom topic if provided
                  targetLang: params.lang,
                  persona: params.persona || aiPersona,
                  depth: params.depth,
                  sessionId: params.sessionId || undefined,
                }, {
                  provider: config.provider,
                  apiKey: config.provider === 'pollinations' ? config.pollinationsApiKey : config.apiKey,
                  model: config.textModel || config.pollinationsModel,
                  userId: user?.id,
                });
              } else if (sessionType === 'text') {
                currentMode = 'vision-text';
                result = await generateMindMapFromTextAction({
                  text: fileContent!,
                  context: additionalText,
                  targetLang: params.lang,
                  persona: params.persona || aiPersona,
                  depth: params.depth,
                  sessionId: params.sessionId || undefined,
                }, {
                  provider: config.provider,
                  apiKey: config.provider === 'pollinations' ? config.pollinationsApiKey : config.apiKey,
                  model: config.textModel || config.pollinationsModel,
                  userId: user?.id,
                });
              } else if (sessionType === 'website') {
                currentMode = 'website';
                result = await generateMindMapFromWebsiteAction({
                  url: fileContent!,
                  targetLang: params.lang,
                  persona: params.persona || aiPersona,
                  depth: params.depth,
                  sessionId: params.sessionId || undefined,
                }, {
                  provider: config.provider,
                  apiKey: config.provider === 'pollinations' ? config.pollinationsApiKey : config.apiKey,
                  model: config.textModel || config.pollinationsModel,
                  userId: user?.id,
                });
              } else if (sessionType === 'compare') {
                currentMode = 'compare';
                const compContent = sessionContent as any;
                const images: { inlineData: { mimeType: string; data: string } }[] = [];
                
                if (compContent.file1 && compContent.file1Type === 'image') {
                  const parts = compContent.file1.split(';');
                  const mimeType = parts[0].split(':')[1];
                  const data = parts[1].split(',')[1];
                  images.push({ inlineData: { mimeType, data } });
                }
                
                if (compContent.file2 && compContent.file2Type === 'image') {
                  const parts = compContent.file2.split(';');
                  const mimeType = parts[0].split(':')[1];
                  const data = parts[1].split(',')[1];
                  images.push({ inlineData: { mimeType, data } });
                }

                result = await generateComparisonMapAction({
                  topic1: compContent.topic1 || 'Topic A',
                  topic2: compContent.topic2 || 'Topic B',
                  targetLang: params.lang,
                  persona: params.persona || aiPersona,
                  depth: params.depth,
                  useSearch: params.useSearch === 'true',
                  images: images.length > 0 ? images : undefined
                }, {
                  provider: config.provider,
                  apiKey: config.provider === 'pollinations' ? config.pollinationsApiKey : config.apiKey,
                  model: config.textModel || config.pollinationsModel,
                  userId: user?.id,
                });
              } else if (sessionType === 'multi') {
                currentMode = 'multi-source';
                result = await generateMindMapFromTextAction({
                  text: additionalText || params.topic || 'Multi-Source Synthesis',
                  context: fileContent!, 
                  targetLang: params.lang,
                  persona: params.persona || aiPersona,
                  depth: params.depth,
                  sessionId: params.sessionId || undefined,
                }, {
                  provider: config.provider,
                  apiKey: config.provider === 'pollinations' ? config.pollinationsApiKey : config.apiKey,
                  model: config.textModel || config.pollinationsModel,
                  userId: user?.id,
                });
              } else {
                // Bug #14: unknown sessionType — don't leave loader hanging
                setError(`Unknown session type: "${sessionType}". Please go back and try again.`);
                setIsLoading(false);
                return;
              }
            }
          } else if (params.studioId) {
            const rawStudioData = sessionStorage.getItem(`studio-data-${params.studioId}`);
            if (rawStudioData) {
              try {
                const parsed = JSON.parse(rawStudioData);
                if (parsed.type === 'mindmap' || parsed.type === 'roadmap') {
                  if (parsed.data) {
                    result.data = await mapToMindMapData(parsed.data, params.depth as any || 'low') as MindMapWithId;
                    result.data.id = params.studioId;
                  }
                }
              } catch (e) {
                console.error('Failed to parse studio data', e);
                setError('Failed to load generated content.');
              }
            }
          } else {
            setIsLoading(false);
            return;
          }
        }

        setMode(currentMode);

        if (result.error) {
          trackFailure('GenerationError', result.error, pendingSourceFileType || 'text', currentMode);
          throw new Error(result.error);
        }
        if (!result.data) {
          trackFailure('NoData', 'No data returned', pendingSourceFileType || 'text', currentMode);
          throw new Error("No data returned from AI.");
        }

        // track completion for all modes that result in a new map
        trackCompletion(result.data.id || params.mapId || 'pending', result.data.nodeCount || 0, pendingSourceFileType || 'text', currentMode);

        if (result.data) {
          // Refresh balance after any successful AI generation
          refreshBalance();
          setMindMaps((prevMaps: any[]) => {
            if (params.isSelfReference) {
              const idIndex = prevMaps.findIndex(m => m.id === 'mindscape');
              if (idIndex !== -1) {
                const newMaps = [...prevMaps];
                newMaps[idIndex] = result.data!;
                setActiveMindMapIndexState(idIndex);
                return newMaps;
              }
            }

            const exists = prevMaps.some(m => m.topic?.toLowerCase() === result.data!.topic?.toLowerCase());
            if (exists) {
              const newIndex = prevMaps.findIndex(m => m.topic?.toLowerCase() === result.data!.topic?.toLowerCase());
              if (newIndex !== -1) setActiveMindMapIndex(newIndex);
              return prevMaps;
            }
            const newMaps = [...prevMaps, result.data!];
            setActiveMindMapIndexState(newMaps.length - 1);
            return newMaps;
          });

          setIsLoading(false);

          if (result.data.pdfContext || result.data.sourceFileContent) {
            setUseFileAwareContext(true);
          }

          if (result.data.sourceFileContent) setSourceFileContent(result.data.sourceFileContent);
          if (result.data.sourceFileType) setSourceFileType(result.data.sourceFileType);
          if (result.data.originalPdfFileContent) setOriginalPdfFileContent(result.data.originalPdfFileContent);
          if (result.data.sourceFile2Content) setSourceFile2Content(result.data.sourceFile2Content);
          if (result.data.sourceFile2Type) setSourceFile2Type(result.data.sourceFile2Type);
          if (result.data.originalPdf2FileContent) setOriginalPdf2FileContent(result.data.originalPdf2FileContent);

          const isNewlyGenerated = !['saved', 'self-reference', 'studio'].includes(currentMode);
          if (isNewlyGenerated && user && result.data) {

            // Inject source file content that we just parsed from session storage
            const dataToSave = {
              ...result.data,
              sourceFileContent: pendingSourceFileContent || result.data.sourceFileContent,
              sourceFileType: pendingSourceFileType || result.data.sourceFileType,
              originalPdfFileContent: pendingOriginalPdfContent || result.data.originalPdfFileContent,
              sourceFile2Content: (sessionContent as any)?.file2,
              sourceFile2Type: (sessionContent as any)?.file2Type,
            };

            const existingMapWithId = mindMapsRef.current.find(m => m.topic?.toLowerCase() === result.data!.topic?.toLowerCase() && m.id);
            handleSaveMap(dataToSave, existingMapWithId?.id).then((savedId: any) => {
              if (savedId && !existingMapWithId?.id) {
                setMindMaps((prev: any[]) => prev.map(m =>
                  m.topic === result.data!.topic ? { ...m, id: savedId } : m
                ));
                handleUpdateCurrentMap({ id: savedId });
                navigateToMap(savedId!);

                // Award points for creating a new map
                const topicName = result.data!.topic;
                if (currentMode === 'compare') {
                  awardXP('MAP_COMPARE', { topic: topicName }).catch(() => {});
                } else if (currentMode === 'multi-source') {
                  awardXP('MAP_MULTI_SOURCE', { topic: topicName }).catch(() => {});
                } else {
                  awardXP('MAP_CREATED', { topic: topicName, mode: currentMode }).catch(() => {});
                }
              }
            });
          }
          if (params.sessionId) {
            sessionStorage.removeItem(`session-type-${params.sessionId}`);
            sessionStorage.removeItem(`session-content-${params.sessionId}`);
          }
        } else {
          setIsLoading(false);
        }
      } catch (e: any) {
        setError(e.message || 'An unknown error occurred.');
        setIsLoading(false);
      } finally {
        setGeneratingNodeId(null);
        clearRegenFlag();
      }
    };

    fetchMindMapData();
  }, [getParamKey, user, isUserLoading, handleSaveMap, toast, params, config, aiPersona, setMindMaps, setActiveMindMapIndexState, activeMindMapIndex, navigateToMap, isLoading, handleUpdateCurrentMap, setActiveMindMapIndex]);


  // Track views for community maps
  useEffect(() => {
    if (mindMap?.id && (mindMap as any).isPublic) {
      supabase.from('public_mindmaps')
        .update({ views: ((mindMap as any).views || 0) + 1 })
        .eq('id', mindMap.id)
        .then(({ error }) => {
          if (error) console.error('Failed to update views:', error);
        });
    }
  }, [mindMap?.id, (mindMap as any)?.isPublic]);


  // 4. Auto-Save Effect

  useEffect(() => {
    const persistFn = async (silent: boolean) => {
      await handleSaveMapFromHook(silent);
      setHasUnsavedChanges(false);
    };

    // Warn on tab close if unsaved
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    const cleanupAutoSave = setupAutoSave(mindMap, hasUnsavedChanges, params.isSelfReference, persistFn);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      cleanupAutoSave();
    };
  }, [mindMap, hasUnsavedChanges, params.isSelfReference, handleSaveMapFromHook, setupAutoSave]);

  // Ref to track mindMap for stable callbacks
  const mindMapRef = useRef(mindMap);
  useEffect(() => { mindMapRef.current = mindMap; }, [mindMap]);

  // Fetch complete map hierarchy (root + all sub-maps) — single query
  const fetchMapHierarchy = useCallback(async (currentMapData: MindMapData) => {
    if (!user) return;
    try {
      const currentMapId = (currentMapData as any).id;
      if (!currentMapId) return;

      // Single query: fetch all user maps at once instead of N sequential round trips
      const { data: allMaps } = await supabase
        .from('mindmaps')
        .select('id,topic,icon,created_at,content,parent_map_id')
        .eq('user_id', user.id)
        .limit(500);
      if (!allMaps) return;

      // Build a local lookup map for O(1) parent traversal
      const mapById = new Map(allMaps.map(m => [m.id, m]));

      // Walk up to find the root map (now O(1) per hop via mapById, no DB calls)
      let rootMapId = currentMapId;
      let rootMapData: { id: string; topic: string; icon?: string } | null = null;

      if ((currentMapData as any).parentMapId) {
        let currentId = (currentMapData as any).parentMapId;
        let iterations = 0;
        while (currentId && iterations < 10) {
          const parent = mapById.get(currentId);
          if (parent) {
            rootMapId = currentId;
            rootMapData = { id: currentId, topic: parent.topic || 'Untitled', icon: parent.icon };
            currentId = parent.parent_map_id as string | null;
          } else { break; }
          iterations++;
        }
      } else {
        rootMapData = { id: currentMapId, topic: currentMapData.topic, icon: currentMapData.icon };
      }

      // Build descendant tree in memory (no recursive DB queries)
      const allSubMaps: NestedExpansionItem[] = [];
      const visitedIds = new Set<string>();

      const buildDescendants = (parentId: string, parentName: string, currentDepth: number) => {
        // Find all direct children from our local map dictionary
        const children = allMaps.filter(m => m.parent_map_id === parentId);
        for (const child of children) {
          if (visitedIds.has(child.id)) continue;
          visitedIds.add(child.id);
          const subMapData = { ...child, ...(child.content || {}), id: child.id } as MindMapWithId;
          allSubMaps.push({
            id: child.id,
            topic: child.topic,
            parentName,
            icon: child.icon || 'file-text',
            subCategories: [],
            createdAt: new Date(child.created_at).getTime(),
            depth: currentDepth,
            fullData: subMapData,
            status: 'completed',
          });
          buildDescendants(child.id, child.topic, currentDepth + 1);
        }
      };

      if (rootMapId) buildDescendants(rootMapId, rootMapData?.topic || 'Parent', 1);
      setMapHierarchy({ rootMap: rootMapData, allSubMaps });
    } catch (error) { console.error('Error fetching map hierarchy:', error); }
  }, [user]);

  // Update hierarchy when mindMap changes
  useEffect(() => {
    if (mindMap && (mindMap as any).id) {
      fetchMapHierarchy(mindMap);
    }
  }, [mindMap, fetchMapHierarchy]);

  // Set default chat mode to PDF-Aware if the mind map has PDF context
  useEffect(() => {
    if (mindMap?.pdfContext || mindMap?.sourceFileContent) {
      setUseFileAwareContext(true);
    }
  }, [mindMap]);

  // Bug #39: stable ref so awardXP changes never recreate the interval
  const awardXPRef = useRef(awardXP);
  useEffect(() => { awardXPRef.current = awardXP; }, [awardXP]);

  // Study time tracking — award XP every 10 min of active canvas time
  useEffect(() => {
    let seconds = 0;
    let visible = !document.hidden;
    const onVisibility = () => { visible = !document.hidden; };
    document.addEventListener('visibilitychange', onVisibility);
    const interval = setInterval(() => {
      if (visible) {
        seconds += 10;
        if (seconds % 600 === 0) {
          awardXPRef.current('STUDY_TIME_CANVAS').catch(() => {});
        }
      }
    }, 10000);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []); // empty — stable via awardXPRef

  const onMapUpdate = useCallback((updatedData: Partial<MindMapData> | ((prev: MindMapData) => Partial<MindMapData>)) => {
    const currentMap = mindMapRef.current;
    if (!currentMap) return;

    // Resolve functional updater
    const resolved = typeof updatedData === 'function' ? updatedData(currentMap) : updatedData;

    let hasActualChanges = false;
    for (const key in resolved) {
      if (resolved !== currentMap && JSON.stringify((resolved as any)[key]) !== JSON.stringify((currentMap as any)[key])) {
        hasActualChanges = true;
        break;
      }
    }

    if (hasActualChanges) {
      // If subTopics changed (quiz deepening), update mindMapRef IMMEDIATELY
      // before scheduling the React state update. This prevents the supabase
      // real-time listener from overwriting new nodes with stale local data.
      if ('subTopics' in resolved) {
        const mergedMap = { ...currentMap, ...resolved } as MindMapData;
        // Update ref FIRST so the supabase listener has the correct data when it fires
        mindMapRef.current = mergedMap;
        handleUpdateCurrentMap(resolved);
        setHasUnsavedChanges(true);
        // Save immediately - mindMapRef now has the correct data
        handleSaveMap(mergedMap, (currentMap as any).id, true);
      } else {
        handleUpdateCurrentMap(resolved);
        setHasUnsavedChanges(true);
      }
    }
  }, [handleUpdateCurrentMap, handleSaveMap]);

  const onManualSave = useCallback(async () => {
    await handleSaveMapFromHook();
    setHasUnsavedChanges(false);
  }, [handleSaveMapFromHook]);

  const handleExplainInChat = useCallback((message: string) => {
    if (mindMapRef.current?.pdfContext || mindMapRef.current?.sourceFileContent) {
      setUseFileAwareContext(true);
    }
    setChatInitialMessage(message);
    setChatMode('chat');
    setChatInitialView(undefined);
    setIsChatOpen(true);
  }, []);

  const handleStartQuizForTopic = useCallback((topic?: string) => {
    setChatTopic(topic);
    setChatMode('quiz');
    setIsChatOpen(true);
  }, []);

  const handleRegenerateClick = useCallback(async () => {
    // Ensure we match the Title Case values in our SelectItems
    const currentPersona = aiPersona || 'Teacher';
    const normalizedPersona = currentPersona.charAt(0).toUpperCase() + currentPersona.slice(1).toLowerCase();
    setTempPersona(normalizedPersona);
    const depth = params.depth || 'low';
    setTempDepth(depth as 'low' | 'medium' | 'deep');
    const depthSuggestion = await resolveDepthWithConfidence(params.topic || '');
    setDynamicItemRange({ min: depthSuggestion.suggestedItems.min, max: depthSuggestion.suggestedItems.max });
    setIsRegenDialogOpen(true);
  }, [aiPersona, params.depth, params.topic]);

  const handleConfirmRegeneration = useCallback(() => {
    setIsRegenDialogOpen(false);

    const newParams = new URLSearchParams(window.location.search);
    newParams.set('persona', tempPersona);
    newParams.set('depth', tempDepth);
    newParams.set('_r', Date.now().toString());

    router.replace(`/canvas?${newParams.toString()}`);
  }, [router, tempPersona, tempDepth]);





  const handleGenerateAndOpenSubMap = useCallback(async (subTopic: string, nodeId?: string, _contextPath?: string, mode: 'foreground' | 'background' = 'background', branchDepth?: 'low' | 'medium' | 'deep') => {
    try {
      // First check if it already exists locally in the parent map to avoid duplicate generations
      const existingExpansion = mindMap?.nestedExpansions?.find(e => e.topic === subTopic);
      if (existingExpansion && existingExpansion.fullData) {
        setMindMaps(prev => [...prev.filter(m => m.topic !== subTopic), existingExpansion.fullData as MindMapWithId]);
        if (mode === 'foreground') {
          setActiveMindMapIndex(mindMaps.length);
          toast({ title: "Sub-Map Opened", description: `Opened existing map for "${subTopic}".` });
        } else {
          toast({ title: "Sub-Map Available", description: `An existing map for "${subTopic}" is already in your Nested Maps.` });
        }
        return;
      }

      let parentAbsoluteDepth = 0;
      if (mindMap?.id && mapHierarchy.rootMap?.id && mindMap.id !== mapHierarchy.rootMap.id) {
        const matchingSub = mapHierarchy.allSubMaps.find(m => m.id === mindMap.id);
        parentAbsoluteDepth = matchingSub?.depth || 0;
      }

      // Notify user that background generation has started
      if (mode === 'background') {
        toast({ title: "🧠 Creating Sub-Map", description: `Generating "${subTopic}" in the background — it will appear in your Nested Maps shortly.` });
      }

      const expansionResult = await expandNode(subTopic, nodeId || `sub-${Date.now()}`, { mode, parentDepth: parentAbsoluteDepth, branchDepth });
      const parentId = expansionResult?.parentId;
      refreshBalance();
      awardXP('SUB_MAP_CREATED', { topic: subTopic }).catch(() => {});

      if (mode === 'foreground') {
        toast({ title: "Sub-Map Generated", description: `Created detailed map for "${subTopic}".` });
      } else {
        // Re-fetch hierarchy after background generation so the new map
        // appears in the Nested Maps list immediately.
        const currentMap = mindMapRef.current;
        if (currentMap || parentId) {
          // If the parent map was just saved for the first time, use parentId
          const mapToRefresh = currentMap ? { ...currentMap, id: parentId || currentMap.id } : { id: parentId } as any;
          fetchMapHierarchy(mapToRefresh);
        }
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Generation Failed", description: error.message });
    }
  }, [user, expandNode, mindMaps.length, setMindMaps, setActiveMindMapIndex, toast, mindMap?.id, mapHierarchy, fetchMapHierarchy]);

  const handleDeleteNestedMap = useCallback(async (id: string) => {
    if (!mindMap) return;
    const updatedExpansions = (mindMap.nestedExpansions || []).filter(e => e.id !== id);

    // Create the updated map object
    const updatedMap = { ...mindMap, nestedExpansions: updatedExpansions };

    // Update local state
    handleUpdateCurrentMap({ nestedExpansions: updatedExpansions });

    // Directly persist the updated map to avoid race condition
    // where handleSaveMapFromHook might save the old state
    if (mindMap.id) {
      try {
        await handleSaveMap(updatedMap, mindMap.id, true);
      } catch (err) {
        console.error("Failed to persist nested map deletion:", err);
        toast({ variant: "destructive", title: "Save Failed", description: "Could not save the deletion." });
        return;
      }
    }

    if (user) {
      const { error } = await supabase.from('mindmaps').delete().eq('id', id).eq('user_id', user.id);
      if (error) console.error('Failed to delete nested map:', error);
    }
    toast({ title: "Nested Map Deleted", description: "The link has been removed." });
  }, [mindMap, handleUpdateCurrentMap, handleSaveMap, toast, user]);

  const handleRegenerateNestedMap = useCallback(async (topic: string, id: string) => {
    if (!mindMap) return;

    // 1. Remove the old nested map reference first so expandNode allows adding it back
    const updatedExpansions = (mindMap.nestedExpansions || []).filter(e => e.id !== id);
    handleUpdateCurrentMap({ nestedExpansions: updatedExpansions });

    // 2. Generate new map (background)
    toast({ title: "Regenerating Sub-map", description: `Creating fresh insights for "${topic}"...` });
    try {
      let parentAbsoluteDepth = 0;
      if (mindMap?.id && mapHierarchy.rootMap?.id && mindMap.id !== mapHierarchy.rootMap.id) {
        const matchingSub = mapHierarchy.allSubMaps.find(m => m.id === mindMap.id);
        parentAbsoluteDepth = matchingSub?.depth || 0;
      }

      await expandNode(topic, `regen-${Date.now()}`, { mode: 'background', parentDepth: parentAbsoluteDepth });
    } catch (e) {
      toast({ variant: "destructive", title: "Regeneration Failed", description: "Could not create new map." });
    }
  }, [mindMap, handleUpdateCurrentMap, expandNode, toast, mapHierarchy]);

  const handleBreadcrumbSelect = useCallback((index: number) => {
    setActiveMindMapIndex(index);
    const activeMap = mindMaps[index];
    if (activeMap) {
      navigateToMap(activeMap.id || '', activeMap.topic);
    }
  }, [mindMaps, navigateToMap, setActiveMindMapIndex]);

  const handleOpenNestedMap = useCallback(async (mapData: any, expansionId: string) => {
    // If neither mapData nor expansionId is provided, we can't proceed
    if (!mapData && !expansionId) {
      toast({ variant: "destructive", title: "Cannot Open Map", description: "This map data is not available." });
      return;
    }

    let finalMapData = mapData || { id: expansionId };
    const mapIdToFetch = mapData?.id || expansionId;
    if (mapIdToFetch && user) {
      try {
        const { data: row } = await supabase.from('mindmaps').select('*').eq('id', mapIdToFetch).eq('user_id', user.id).single();
        if (row) finalMapData = { ...row, ...(row.content || {}), id: row.id };
        else if (!mapData) { toast({ variant: "destructive", title: "Cannot Open Map", description: "This map could not be found." }); return; }
      } catch (e) {
        if (!mapData) { toast({ variant: "destructive", title: "Cannot Open Map", description: "Failed to load map data." }); return; }
      }
    }

    const existingIndex = mindMaps.findIndex(m => m.topic === finalMapData.topic);
    if (existingIndex !== -1) {
      setActiveMindMapIndex(existingIndex);
    } else {
      setMindMaps(prev => [...prev.filter(m => m.topic !== finalMapData.topic), finalMapData]);
      setMindMaps(prev => {
        const idx = prev.findIndex(m => m.topic === finalMapData.topic);
        if (idx !== -1) setActiveMindMapIndex(idx);
        return prev;
      });
    }

    navigateToMap(finalMapData.id || '', finalMapData.topic);
  }, [mindMaps, navigateToMap, toast, setMindMaps, setActiveMindMapIndex, user]);

  const handleShare = useCallback(async () => {
    if (!mindMap || isSharing) return;
    setIsSharing(true);
    try {
      const shareId = `share_${mindMap.id}`;
      await supabase.from('shared_mindmaps').upsert({
        id: shareId, original_map_id: mindMap.id, original_author_id: user?.id || 'anonymous',
        content: toPlainObject(mindMap), is_shared: true,
        shared_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      await navigator.clipboard.writeText(`${baseUrl}/canvas?mapId=${shareId}`);
      toast({ title: "Link Copied!", description: "Anyone with this link can now view this mind map." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Sharing Failed", description: err.message || "Failed to generate share link." });
    } finally { setIsSharing(false); }
  }, [mindMap, isSharing, user, toast]);

  const handleSynthesize = useCallback(async (nodeLabels: string[]) => {
    const currentMap = mindMapRef.current;
    if (nodeLabels.length !== 2 || !currentMap) return;
    
    setGlobalStatus('generating');
    setActiveTaskName(`Synthesizing ${nodeLabels[0]} and ${nodeLabels[1]}...`);
    
    const dummyId = `alchemy-loading-${Date.now()}`;
    const dummyNode = {
      id: dummyId,
      name: "Synthesizing...",
      description: "Fusing concepts in the background...",
      categories: []
    };

    // Add dummy loading node using functional update
    onMapUpdate((prev: any) => ({
      subTopics: [...(prev.subTopics || []), dummyNode]
    }));
    setGeneratingNodeId("Synthesizing...");
    
    try {
      const { data, error } = await synthesizeNodesAction({
        nodeA: nodeLabels[0],
        nodeB: nodeLabels[1],
        topic: currentMap.topic,
        persona: aiPersona as any
      }, {
        apiKey: config.pollinationsApiKey,
        provider: config.provider,
        userId: user?.id
      });

      if (error || !data) throw new Error(error || 'Synthesis failed');

      // Add the synthesis result to the current map as a 'Nexus' node
      const nexusId = `nexus-${Date.now()}`;
      const newNode = {
        id: nexusId,
        name: data.nexusTitle,
        description: data.explanation,
        icon: 'Zap',
        categories: data.subConcepts.map((s: any, i: number) => ({
          id: `${nexusId}-cat-${i}`,
          name: s.title,
          thought: s.description,
          icon: 'Sparkles',
          subCategories: s.leafNodes.map((l: any, j: number) => ({
            id: `${nexusId}-cat-${i}-leaf-${j}`,
            name: l.title,
            description: l.description,
            icon: 'FileText'
          }))
        }))
      };

      // Replace dummy node with actual result using functional update
      onMapUpdate((prev: any) => ({
        subTopics: [...(prev.subTopics || []).filter((st: any) => st.id !== dummyId), newNode]
      }));
      
      toast({
        title: 'Alchemy Successful ⚗️',
        description: `Born from ${nodeLabels[0]} and ${nodeLabels[1]}: "${data.nexusTitle}"`,
      });
      
      awardXP('ALCHEMY_FUSION').catch(() => {});
      
    } catch (e: any) {
      console.error("Synthesis failed:", e);
      // Remove dummy node on failure
      onMapUpdate((prev: any) => ({
        subTopics: (prev.subTopics || []).filter((st: any) => st.id !== dummyId)
      }));
      toast({
        variant: 'destructive',
        title: 'Alchemy Failed',
        description: e.message,
      });
    } finally {
      setGeneratingNodeId(null);
      setGlobalStatus('idle');
      setActiveTaskName(null);
    }
  }, [aiPersona, config, user?.id, setGlobalStatus, setActiveTaskName, toast, awardXP, onMapUpdate, setGeneratingNodeId]);

  if (isLoading) return <NeuralLoader sourceType={sourceFileType || undefined} />;

  if (error) {
    const isAuthError = error.toLowerCase().includes('api key') || error.toLowerCase().includes('unauthorized') || error.toLowerCase().includes('401');
    const isRateLimit = error.toLowerCase().includes('rate limit') || error.toLowerCase().includes('429');

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-zinc-400 p-8 max-w-2xl mx-auto text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-2 shadow-2xl shadow-red-500/10">
          <ZapOff className="h-10 w-10 text-red-500" />
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-black text-white tracking-tight">Something went wrong</h2>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-sm font-mono text-zinc-300 break-words max-w-md mx-auto">
            {error.includes('StructuredOutputError') ? 'AI Coordination Error: Structure Mismatch' : error}
          </div>
          <p className="text-zinc-400 leading-relaxed max-w-lg mx-auto">
            {error.includes('StructuredOutputError') ? "The AI generated a response, but it didn't fit the structure." : isAuthError ? "Verify your API key in settings." : isRateLimit ? "AI is busy, please wait." : "Unexpected error during generation."}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button onClick={() => window.location.reload()} size="lg" className="rounded-2xl bg-white text-black hover:bg-zinc-200 gap-2 font-bold px-8">
            <RefreshCw className="h-4 w-4" /> Try Again
          </Button>
          {(isAuthError || error.toLowerCase().includes('pollen') || error.toLowerCase().includes('balance')) && (
            <Button onClick={() => router.push('/profile?tab=lab')} size="lg" className="rounded-2xl bg-violet-600 hover:bg-violet-700 text-white gap-2 font-bold px-8 shadow-[0_0_20px_rgba(139,92,246,0.3)]">
              <Key className="h-4 w-4" /> Manage API Key
            </Button>
          )}
          <Button variant="ghost" onClick={() => router.push('/')} size="lg" className="rounded-2xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 gap-2 font-bold px-8">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  if (!mindMap) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-zinc-400 animate-in fade-in zoom-in duration-700">
        <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
        <p className="text-xl font-semibold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Preparing your knowledge universe...</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col items-center px-4 sm:px-8 pb-8">
        <div className={cn(
          "w-full mx-auto",
          mindMap.mode === 'compare' ? "max-w-[1600px]" : "max-w-6xl"
        )}>
          <Profiler id="MindMap" threshold={1}>
          <MindMap
            key={activeMindMapIndex}
            data={mindMap}
            isSaved={isSaved}
            hasUnsavedChanges={hasUnsavedChanges}
            onSaveMap={onManualSave}
            onExplainInChat={handleExplainInChat}
            onGenerateNewMap={handleGenerateAndOpenSubMap}
            onOpenNestedMap={handleOpenNestedMap}
            onStartQuiz={handleStartQuizForTopic}
            generatingNode={activeGeneratingNodeId}
            selectedLanguage={params.lang}
            onLanguageChange={changeLanguage}
            onAIPersonaChange={handlePersonaChange}
            aiPersona={aiPersona}
            onRegenerate={handleRegenerateClick}
            isRegenerating={isLoading}
            canRegenerate={mode !== 'self-reference'}
            nestedExpansions={mindMap?.nestedExpansions || []}
            mindMapStack={mindMaps}
            activeStackIndex={activeMindMapIndex}
            onStackSelect={handleBreadcrumbSelect}
            onUpdate={onMapUpdate}
            status={hookStatus}
            aiHealth={aiHealth}
            onDeleteNestedMap={handleDeleteNestedMap}
            onRegenerateNestedMap={handleRegenerateNestedMap}
            onPracticeQuestionClick={handleExplainInChat}
            useFileAware={useFileAwareContext}
            onToggleFileAware={handleToggleFileAware}
            onViewSource={() => setIsSourceFileModalOpen(true)}
            rootMap={mapHierarchy.rootMap}
            allSubMaps={mapHierarchy.allSubMaps}
            onShare={handleShare}
            isSharing={isSharing}
            onOpenPinnedMessages={handleOpenPinnedMessages}
            pinnedMessagesCount={pinnedMessagesCount}
            onQuizDeepenRef={quizDeepenRef}
            zoomToNodeRef={zoomToNodeRef}
            resonanceNodes={resonanceNodes}
            onSynthesize={handleSynthesize}
          />
          </Profiler>

          {/* Search References Panel */}
          {mindMap.searchSources && mindMap.searchSources.length > 0 && (
            <SearchReferencesPanel
              sources={mindMap.searchSources}
              images={mindMap.searchImages}
              timestamp={mindMap.searchTimestamp}
            />
          )}
        </div>
      </div>

      {/* Regeneration Configuration Dialog */}
      <Dialog open={isRegenDialogOpen} onOpenChange={setIsRegenDialogOpen}>
        <DialogContent className="glassmorphism border-white/10 sm:max-w-[425px] rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-white flex items-center gap-3 font-orbitron uppercase tracking-tighter">
              <RefreshCw className="h-6 w-6 text-purple-400" />
              Regenerate Mind Map
            </DialogTitle>
            <DialogDescription className="text-zinc-400 font-medium tracking-tight">
              Customize how you want the AI to rethink this topic.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-6">
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1 font-orbitron">AI Persona</label>
              <Select value={tempPersona} onValueChange={setTempPersona}>
                <SelectTrigger className="w-full h-12 border border-white/10 bg-black/60 text-[11px] font-bold uppercase tracking-widest text-zinc-100 rounded-2xl hover:bg-black/80 transition px-4 font-orbitron shadow-inner flex items-center justify-between group">
                  <SelectValue placeholder="Select Persona" />
                </SelectTrigger>
                <SelectContent className="glassmorphism border-white/10 z-[1000] !pointer-events-auto">
                  <SelectItem value="Teacher" className="text-[11px] font-bold uppercase font-orbitron py-3 focus:bg-white/10 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <UserRound className="w-4 h-4 text-blue-400" />
                      <span>Teacher (Educational)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Concise" className="text-[11px] font-bold uppercase font-orbitron py-3 focus:bg-white/10 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <ZapIcon className="w-4 h-4 text-amber-400" />
                      <span>Concise (Brief)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Creative" className="text-[11px] font-bold uppercase font-orbitron py-3 focus:bg-white/10 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Palette className="w-4 h-4 text-pink-400" />
                      <span>Creative (Imaginative)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Sage" className="text-[11px] font-bold uppercase font-orbitron py-3 focus:bg-white/10 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4 text-purple-400" />
                      <span>Cognitive Sage (Philosophical)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1 font-orbitron">Structural Depth</label>
              <Select value={tempDepth}              onValueChange={async (val: any) => {
                setTempDepth(val);
                const analysis = await analyzeTopicComplexity(params.topic || '');
                const suggestion = await resolveDepthWithConfidence(params.topic || '');
                const depthRanges = {
                  low: { min: 24, max: 40 },
                  medium: { min: 60, max: 90 },
                  deep: { min: 100, max: 150 },
                };
                const base = depthRanges[val as keyof typeof depthRanges];
                const bonus = Math.min(30, analysis.complexity * 5 + (val === 'deep' ? 15 : val === 'medium' ? 10 : 0));
                setDynamicItemRange({ min: base.min + bonus, max: base.max + bonus });
              }}>
                <SelectTrigger className="w-full h-12 border border-white/10 bg-black/60 text-[11px] font-bold uppercase tracking-widest text-zinc-100 rounded-2xl hover:bg-black/80 transition px-4 font-orbitron shadow-inner flex items-center justify-between group">
                  <SelectValue placeholder="Select Depth" />
                </SelectTrigger>
                <SelectContent className="glassmorphism border-white/10 z-[1000] !pointer-events-auto">
                  <SelectItem value="low" className="text-[11px] font-bold uppercase font-orbitron py-3 focus:bg-white/10 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 opacity-40 shrink-0" />
                      <span>Quick Overview ({dynamicItemRange.min >= 24 && dynamicItemRange.max <= 40 ? '24-40' : `${dynamicItemRange.min}-${dynamicItemRange.max}`} items)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="medium" className="text-[11px] font-bold uppercase font-orbitron py-3 focus:bg-white/10 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <List className="w-4 h-4 opacity-40 shrink-0" />
                      <span>Balanced Exploration ({dynamicItemRange.min >= 60 && dynamicItemRange.max <= 90 ? '75' : `${dynamicItemRange.min}-${dynamicItemRange.max}`} items)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="deep" className="text-[11px] font-bold uppercase font-orbitron py-3 focus:bg-white/10 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span>Deep Knowledge Dive ({dynamicItemRange.min >= 100 && dynamicItemRange.max <= 150 ? '120' : `${dynamicItemRange.min}-${dynamicItemRange.max}`} items)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-3 sm:gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsRegenDialogOpen(false)} className="rounded-2xl border border-white/5 text-zinc-400 hover:text-white hover:bg-white/5 font-black font-orbitron uppercase tracking-widest px-6 h-12">
              Cancel
            </Button>
            <Button onClick={handleConfirmRegeneration} className="rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black font-orbitron uppercase tracking-widest px-8 h-12 shadow-[0_0_25px_rgba(139,92,246,0.2)] hover:shadow-[0_0_35px_rgba(139,92,246,0.4)] transition-all">
              Regenerate Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-white shadow-lg transition-transform hover:scale-110 z-50"
        aria-label="Open AI Chat Assistant"
      >
        <Sparkles className="h-6 w-6" />
      </button>

      {/* View Source File Button */}
      {(sourceFileContent || sourceFile2Content) && (sourceFileType || sourceFile2Type) && (
        <button
          onClick={() => setIsSourceFileModalOpen(true)}
          className="fixed bottom-24 right-6 rounded-full bg-zinc-800/80 backdrop-blur-md border border-white/10 p-4 text-zinc-300 shadow-lg transition-all hover:scale-110 hover:text-white hover:bg-zinc-700/80 z-50 group flex items-center justify-center"
          aria-label="View Source File"
          title="View Source File"
        >
          {mindMap.mode === 'compare' ? (
             <Scale className="h-5 w-5 text-primary" />
          ) : sourceFileType === 'image' ? (
            <ImageIcon className="h-5 w-5" />
          ) : sourceFileType === 'youtube' ? (
            <Youtube className="h-5 w-5 text-red-500" />
          ) : sourceFileType === 'website' ? (
            <Globe className="h-5 w-5 text-blue-400" />
          ) : (
            <FileText className="h-5 w-5" />
          )}
        </button>
      )}

      <SourceFileModal
        isOpen={isSourceFileModalOpen}
        onClose={() => setIsSourceFileModalOpen(false)}
        sourceFileContent={sourceFileContent}
        sourceFileType={sourceFileType}
        originalPdfFileContent={originalPdfFileContent}
        sourceFile2Content={sourceFile2Content}
        sourceFile2Type={sourceFile2Type}
        originalPdf2FileContent={originalPdf2FileContent}
        mindMap={mindMap}
      />



      <ChatPanel
        isOpen={isChatOpen}
        onClose={() => {
          setIsChatOpen(false);
          setChatInitialMessage(undefined);
          setChatInitialView(undefined);
        }}
        initialView={chatInitialView}
        canvasPinnedMessages={pinnedMessages}
        onCanvasUnpin={removePinnedMessage}
        topic={chatTopic || (mindMap?.topic) || 'General Conversation'}
        initialMode={chatMode}
        initialMessage={chatInitialMessage}
        mindMapData={mindMap || undefined}
        sessionId={params.mapId || params.sessionId || undefined}
        usePdfContext={useFileAwareContext}
        onUsePdfContextChange={setUseFileAwareContext}
        sourceFileContent={sourceFileContent}
        sourceFileType={sourceFileType as "text" | "image" | "pdf"}
        onMindMapGenerated={async (data) => {
          handleReplaceCurrentMap(data);
          setHasUnsavedChanges(true);
          return await handleSaveMap(data, data.id, true);
        }}
        onOpenPinnedMessages={handleOpenPinnedMessages}
        onAddMindMapPin={(question, response) => {
          addPinnedMessage(question, response, params.mapId || params.sessionId || undefined);
        }}
        onRemoveMindMapPin={(messageId) => {
          const pinToRemove = pinnedMessages.find(p => 
            p.question?.messageId === messageId || p.soloMessage?.messageId === messageId
          );
          if (pinToRemove) {
            removePinnedMessage(pinToRemove.id);
          }
        }}
        onQuizDeepen={(weakSections, quizTopic) => {
          quizDeepenRef.current?.(weakSections, quizTopic);
        }}
        onTopicClick={(topic) => {
          // 1. Try to zoom if it exists in current map
          if (zoomToNodeRef.current) {
            zoomToNodeRef.current(topic);
          }
          // 2. Also generate/open submap if it doesn't exist or as a fallback
          handleGenerateAndOpenSubMap(topic, undefined, undefined, 'background');
        }}
        onLatestResponse={(answer) => {
          const regex = /\[\[(.*?)\]\]/g;
          const matches = [];
          let match;
          while ((match = regex.exec(answer)) !== null) {
            matches.push(match[1]);
          }
          setResonanceNodes(matches);
          // Clear resonance after 5 seconds to prevent visual clutter
          setTimeout(() => setResonanceNodes([]), 5000);
        }}
      />

    </>
  );
}

/**
 * The main wrapper for the mind map page.
 * It uses Suspense to show a loading fallback while the page content is being prepared.
 */
export default function MindMapPage() {
  return (
    <ErrorBoundary sectionName="Canvas">
      <TooltipProvider delayDuration={300}>
          <MindMapPageContent />
      </TooltipProvider>
    </ErrorBoundary>
  );
}

// ── Performance Monitoring ───────────────────────────────────────────────
// Key components are wrapped with Profiler inside the render section below
