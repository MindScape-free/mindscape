
'use client';

import { Suspense, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { MindMap } from '@/components/mind-map';
import { MindMapData, NestedExpansionItem, MindMapWithId } from '@/types/mind-map';
import { PinnedMessage } from '@/types/chat';
import { NeuralLoader } from '@/components/loading/neural-loader';
import { safeGetItem, safeRemoveItem } from '@/lib/storage';
import { useXP } from '@/contexts/xp-context';
import dynamic from 'next/dynamic';

const ChatPanel = dynamic(() => import('@/components/chat-panel').then(mod => mod.ChatPanel), {
  ssr: false,
  loading: () => null
});

import { SearchReferencesPanel, SourceFileModal } from '@/components/canvas';

import { Button } from '@/components/ui/button';
import {
  RefreshCw, Sparkles, Loader2, ZapOff, List, Bot, UserRound, Zap as ZapIcon, Globe, Palette, Brain, FileText, Image as ImageIcon, X, Youtube, ArrowRight
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
import type { GenerateMindMapOutput } from '@/ai/flows/generate-mind-map';
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
  mapToMindMapData,
} from '@/app/actions';
// shareMindMapAction removed - using client-side sharing
import { formatText, extractYoutubeId } from '@/lib/utils';
import { toPlainObject } from '@/lib/serialize';
import { mindscapeMap } from '@/lib/mindscape-data';
import { useMindMapStack } from '@/hooks/use-mind-map-stack';
import { useAIConfig } from '@/contexts/ai-config-context';
import { useMindMapRouter } from '@/hooks/use-mind-map-router';
import { useMindMapPersistence } from '@/hooks/use-mind-map-persistence';
import { useMindMapPinnedMessages } from '@/hooks/use-mind-map-pinned-messages';
import { useAIHealth } from '@/hooks/use-ai-health';
import { useActivity } from '@/contexts/activity-context';
import { resolveDepthWithConfidence, getDepthLabel, getDepthColor, analyzeTopicComplexity } from '@/lib/depth-analysis';

const EMPTY_ARRAY: never[] = [];

function MindMapPageContent() {
  const { params, navigateToMap, changeLanguage, regenerate, clearRegenFlag, getParamKey, router } = useMindMapRouter();
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
  const [showReferences, setShowReferences] = useState(false);
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
      };
      const result = await generateMindMapAction({
        topic,
        parentTopic,
        targetLang: params.lang,
        persona: params.persona || aiPersona,
        depth: branchDepth || params.depth,
        useSearch: params.useSearch === 'true',
      }, aiOptions);
      
      // Refresh balance after successful expansion
      refreshBalance();
      
      return result;
    }
  }), [params.persona, aiPersona, params.lang, params.depth, config.provider, config.apiKey, config.pollinationsModel]);
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

  // Sync ref with actual function
  useEffect(() => {
    handleUpdateRef.current = handleUpdateCurrentMap;
  }, [handleUpdateCurrentMap]);

  // PINNED MESSAGES
  const { pinnedMessages, addPinnedMessage, addSoloPinnedMessage, removePinnedMessage, getPinnedMessagesCount } = useMindMapPinnedMessages({
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
  const [studioData, setStudioData] = useState<any>(null);
  const [studioType, setStudioType] = useState<string | null>(null);

  // Source File Data State
  const [sourceFileContent, setSourceFileContent] = useState<string | null>(null);
  const [sourceFileType, setSourceFileType] = useState<string | null>(null);
  const [originalPdfFileContent, setOriginalPdfFileContent] = useState<string | null>(null);
  const [isSourceFileModalOpen, setIsSourceFileModalOpen] = useState(false);

  // Toolbar pin button → open chat panel at canvas-pins view
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

      // Keep track of source file locally during fetch to inject into first save
      let pendingSourceFileContent: string | null = null;
      let pendingSourceFileType: string | null = null;
      let pendingOriginalPdfContent: string | null = null;

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
              strict: true
            };
            result = await generateMindMapAction({
              topic: topicToRegen!,
              parentTopic: params.parent || undefined,
              targetLang: params.lang,
              persona: params.persona || aiPersona,
              depth: params.depth,
              useSearch: params.useSearch === 'true',
            }, aiOptions);

            if (result.data) {
              await handleSaveMap(result.data, effectiveMapId);
            }
          } else if (effectiveMapId) {
            currentMode = 'saved';

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
              const targetUid = params.ownerId || user?.uid;
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
              model: config.pollinationsModel,
              userId: user?.uid,
            });
          } else if (params.topic) {
            currentMode = 'standard';
            result = await generateMindMapAction({
              topic: params.topic!,
              parentTopic: params.parent || undefined,
              targetLang: params.lang,
              persona: params.persona || aiPersona,
              depth: params.depth,
              useSearch: params.useSearch === 'true',
            }, {
              provider: config.provider,
              apiKey: config.provider === 'pollinations' ? config.pollinationsApiKey : config.apiKey,
              model: config.pollinationsModel,
              userId: user?.uid,
            });
          } else if (params.sessionId) {
            const sessionType = safeGetItem<string>(`session-type-${params.sessionId}`);
            const sessionContent = safeGetItem<{file?: string; text?: string; originalFile?: string}>(`session-content-${params.sessionId}`);
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
                  model: config.pollinationsModel,
                  userId: user?.uid,
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
                  model: config.pollinationsModel,
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
                  model: config.pollinationsModel,
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
                  model: config.pollinationsModel,
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
                  model: config.pollinationsModel,
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
                  model: config.pollinationsModel,
                  userId: user?.id,
                });
              }
            }
          } else if (params.studioId) {
            const rawStudioData = sessionStorage.getItem(`studio-data-${params.studioId}`);
            if (rawStudioData) {
              try {
                const parsed = JSON.parse(rawStudioData);
                setStudioData(parsed);
                setStudioType(parsed.type);
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

        if (result.error) throw new Error(result.error);

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

          const isNewlyGenerated = !['saved', 'self-reference', 'studio'].includes(currentMode);
          if (isNewlyGenerated && user && result.data) {

            // Inject source file content that we just parsed from session storage
            const dataToSave = {
              ...result.data,
              sourceFileContent: pendingSourceFileContent || result.data.sourceFileContent,
              sourceFileType: pendingSourceFileType || result.data.sourceFileType,
              originalPdfFileContent: pendingOriginalPdfContent || result.data.originalPdfFileContent
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

  // Fetch complete map hierarchy (root + all sub-maps)
  const fetchMapHierarchy = useCallback(async (currentMapData: MindMapData) => {
    if (!user) return;
    try {
      const currentMapId = (currentMapData as any).id;
      if (!currentMapId) return;
      let rootMapId = currentMapId;
      let rootMapData: { id: string; topic: string; icon?: string } | null = null;
      if ((currentMapData as any).parentMapId) {
        let parentId = (currentMapData as any).parentMapId;
        let iterations = 0;
        while (parentId && iterations < 10) {
          const { data: p } = await supabase.from('mindmaps').select('id,topic,icon,parent_map_id').eq('id', parentId).eq('user_id', user.id).single();
          if (p) { rootMapId = parentId; rootMapData = { id: parentId, topic: p.topic || 'Untitled', icon: p.icon }; parentId = p.parent_map_id; }
          else break;
          iterations++;
        }
      } else {
        rootMapData = { id: currentMapId, topic: currentMapData.topic, icon: currentMapData.icon };
      }
      const allSubMaps: NestedExpansionItem[] = [];
      const visitedIds = new Set<string>();
      const fetchDescendants = async (parentId: string, parentName: string, currentDepth: number) => {
        const { data: children } = await supabase.from('mindmaps').select('id,topic,icon,created_at,content,parent_map_id').eq('user_id', user.id).eq('parent_map_id', parentId);
        if (!children) return;
        for (const child of children) {
          if (visitedIds.has(child.id)) continue;
          visitedIds.add(child.id);
          const subMapData = { ...child, ...(child.content || {}), id: child.id } as MindMapWithId;
          allSubMaps.push({ id: child.id, topic: child.topic, parentName, icon: child.icon || 'file-text', subCategories: [], createdAt: new Date(child.created_at).getTime(), depth: currentDepth, fullData: subMapData, status: 'completed' });
          await fetchDescendants(child.id, child.topic, currentDepth + 1);
        }
      };
      if (rootMapId) await fetchDescendants(rootMapId, rootMapData?.topic || 'Parent', 1);
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
          awardXP('STUDY_TIME_CANVAS').catch(() => {});
        }
      }
    }, 10000);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [awardXP]);

  const onMapUpdate = useCallback((updatedData: Partial<MindMapData> | ((prev: MindMapData) => Partial<MindMapData>)) => {
    const currentMap = mindMapRef.current;
    if (!currentMap) return;

    // Resolve functional updater
    const resolved = typeof updatedData === 'function' ? updatedData(currentMap) : updatedData;

    let hasActualChanges = false;
    for (const key in resolved) {
      if (JSON.stringify((resolved as any)[key]) !== JSON.stringify((currentMap as any)[key])) {
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

  const handleRegenerateClick = useCallback(() => {
    // Ensure we match the Title Case values in our SelectItems
    const currentPersona = aiPersona || 'Teacher';
    const normalizedPersona = currentPersona.charAt(0).toUpperCase() + currentPersona.slice(1).toLowerCase();
    setTempPersona(normalizedPersona);
    const depth = params.depth || 'low';
    setTempDepth(depth as 'low' | 'medium' | 'deep');
    const analysis = analyzeTopicComplexity(params.topic || '');
    const itemCount = resolveDepthWithConfidence(params.topic || '').suggestedItems;
    setDynamicItemRange({ min: itemCount.min, max: itemCount.max });
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





  const handleGenerateAndOpenSubMap = useCallback(async (subTopic: string, nodeId?: string, contextPath?: string, mode: 'foreground' | 'background' = 'background', branchDepth?: 'low' | 'medium' | 'deep') => {
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

      await expandNode(subTopic, nodeId || `sub-${Date.now()}`, { mode, parentDepth: parentAbsoluteDepth, branchDepth });
      refreshBalance();
      awardXP('SUB_MAP_CREATED', { topic: subTopic }).catch(() => {});
      if (mode === 'foreground') {
        toast({ title: "Sub-Map Generated", description: `Created detailed map for "${subTopic}".` });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Generation Failed", description: error.message });
    }
  }, [user, expandNode, mindMaps.length, setMindMaps, setActiveMindMapIndex, toast, mindMap?.id, mapHierarchy]);

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
        <div className="w-full max-w-6xl mx-auto">
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
            onToggleFileAware={() => setUseFileAwareContext(!useFileAwareContext)}
            onViewSource={() => setIsSourceFileModalOpen(true)}
            rootMap={mapHierarchy.rootMap}
            allSubMaps={mapHierarchy.allSubMaps}
            onShare={handleShare}
            isSharing={isSharing}
            onOpenPinnedMessages={handleOpenPinnedMessages}
            pinnedMessagesCount={pinnedMessagesCount}
            onQuizDeepenRef={quizDeepenRef}
          />

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
              <Select value={tempDepth} onValueChange={(val: any) => {
                setTempDepth(val);
                const analysis = analyzeTopicComplexity(params.topic || '');
                const suggestion = resolveDepthWithConfidence(params.topic || '');
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
      {sourceFileContent && sourceFileType && (
        <button
          onClick={() => setIsSourceFileModalOpen(true)}
          className="fixed bottom-24 right-6 rounded-full bg-zinc-800/80 backdrop-blur-md border border-white/10 p-4 text-zinc-300 shadow-lg transition-all hover:scale-110 hover:text-white hover:bg-zinc-700/80 z-50 group flex items-center justify-center"
          aria-label="View Source File"
          title="View Source File"
        >
          {sourceFileType === 'image' ? (
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
          await handleSaveMap(data, data.id, true);
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
        onTopicClick={(topic) => handleGenerateAndOpenSubMap(topic, undefined, undefined, 'foreground')}
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
    <TooltipProvider delayDuration={300}>
      <Suspense fallback={<NeuralLoader />}>
        <MindMapPageContent />
      </Suspense>
    </TooltipProvider>
  );
}
