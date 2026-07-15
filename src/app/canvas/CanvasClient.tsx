
'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { MindMap } from '@/components/mind-map';
import { MindMapData, NestedExpansionItem, MindMapWithId } from '@/types/mind-map';
import { FAQSection } from '@/components/faq-section';
import { CANVAS_FAQS } from '@/data/faq';
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
  Scale, RefreshCw, Sparkles, Loader2, ZapOff, List, UserRound, Zap as ZapIcon, Globe, Palette, Brain, FileText, Image as ImageIcon, Video, Key, Trash2, HelpCircle
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

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
  generateTopicFAQsAction,
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
import { useCanvasSourceFiles } from '@/hooks/use-canvas-source-files';
import { useCanvasChatState } from '@/hooks/use-canvas-chat-state';
import { useCanvasDialogs } from '@/hooks/use-canvas-dialogs';
import { Profiler } from '@/components/debug/profiler';
import { useAIHealth } from '@/hooks/use-ai-health';
import { useActivity } from '@/contexts/activity-context';
import { resolveDepthWithConfidence, analyzeTopicComplexity } from '@/lib/depth-analysis';
import { trackGenerationStart, trackGenerationComplete, trackGenerationFailed, type AIGenerationMeta } from '@/lib/tracker';
import { useMapTracking } from '@/hooks/use-tracking';

function MindMapPageContent() {
  const { params, navigateToMap, changeLanguage, clearRegenFlag, getParamKey, router } = useMindMapRouter();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const supabase = getSupabaseClient();
  const { config, refreshBalance } = useAIConfig();
  const { awardXP } = useXP();

  const [mode, setMode] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pinnedMessagesCount, setPinnedMessagesCount] = useState(0);

  // Dynamic Topic-specific FAQs
  const [dynamicFAQs, setDynamicFAQs] = useState<Array<{ question: string; answer: string }> | null>(null);
  const [isFAQLoading, setIsFAQLoading] = useState(false);
  const [faqGeneratedTopic, setFaqGeneratedTopic] = useState<string>('');

  // Universal Nested Maps Dialog state
  const [mapHierarchy, setMapHierarchy] = useState<{
    rootMap: { id: string; topic: string; icon?: string } | null;
    allSubMaps: NestedExpansionItem[];
  }>({ rootMap: null, allSubMaps: [] });
  const [hierarchyLoading, setHierarchyLoading] = useState(false);


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
  // sourceContextRefs is provided by useCanvasSourceFiles() above

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

  const mapTracker = useMapTracking({
    mapId: mindMap?.id || params.mapId || 'pending',
    userId: user?.id,
    title: mindMap?.topic || params.topic || undefined,
    isPublic: !!params.publicMapId,
  });

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

  const {
    sourceFileContent, sourceFileType, originalPdfFileContent,
    sourceFile2Content, sourceFile2Type, originalPdf2FileContent,
    isSourceFileModalOpen, sourceContextRefs,
    setSourceFileContent, setSourceFileType, setOriginalPdfFileContent,
    setSourceFile2Content, setSourceFile2Type, setOriginalPdf2FileContent,
    setIsSourceFileModalOpen,
    syncFromMapData: syncSourceFromMapData,
    syncFromSession: syncSourceFromSession,
    closeSourceModal,
  } = useCanvasSourceFiles();

  // Chat state
  const {
    isChatOpen, chatInitialMessage, chatInitialView, chatMode, chatTopic, useFileAwareContext,
    handleToggleFileAware, handleOpenPinnedMessages,
    handleExplainInChat: chatExplainInChat,
    handleStartQuizForTopic: chatStartQuizForTopic,
    setIsChatOpen, setChatInitialMessage, setChatInitialView, setChatMode, setChatTopic, setUseFileAwareContext,
    closeChat,
  } = useCanvasChatState();

  // Dialog state
  const {
    isRegenDialogOpen, tempPersona, tempDepth, dynamicItemRange,
    pendingDeleteId,
    setTempPersona, setTempDepth, setDynamicItemRange, setIsRegenDialogOpen, setPendingDeleteId,
    closeRegenDialog, cancelDelete, requestDelete,
  } = useCanvasDialogs();

  const isLoading = (hookStatus === 'generating' && generationScope === 'foreground') || isInitialLoading;
  const error = hookError || initialError;
  const activeGeneratingNodeId = generatingNodeId || localGeneratingNodeId;

  const setIsLoading = setIsInitialLoading;
  const setError = setInitialError;
  const setGeneratingNodeId = setLocalGeneratingNodeId;

  const isSaved = !!mindMap?.id;

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

      const trackingId = params.sessionId || 'pending';

      const trackCompletion = (mapId: string, nodeCount: number, sourceType: string, mode: string) => {
        trackGenerationComplete(trackingId, {
          sourceType: (sourceType || 'text') as AIGenerationMeta['sourceType'],
          mode: (mode || 'single') as AIGenerationMeta['mode'],
          depth: (params.depth || 'low') as AIGenerationMeta['depth'],
          persona: params.persona || aiPersona,
          userId: user?.id
        }, {
          nodeCount,
          mapId: mapId
        });
      };

      const trackFailure = (errorType: string, message: string, sourceType: string, mode: string) => {
        trackGenerationFailed(trackingId, {
          sourceType: (sourceType || 'text') as AIGenerationMeta['sourceType'],
          mode: (mode || 'single') as AIGenerationMeta['mode'],
          depth: (params.depth || 'low') as AIGenerationMeta['depth'],
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

            trackGenerationStart(trackingId, {
              sourceType: 'text',
              mode: 'single',
              depth: (params.depth || 'low') as AIGenerationMeta['depth'],
              persona: params.persona || aiPersona,
              userId: user?.id
            });
            result = await generateMindMapAction({
              topic: topicToRegen!,
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
              if (row) result.data = { ...row, ...(row.content || {}), id: row.id } as unknown as MindMapData;
            } else if (params.publicMapId || params.mapId?.startsWith('public_')) {
              const pubId = params.publicMapId || params.mapId!;
              const { data: row } = await supabase.from('public_mindmaps').select('*').eq('id', pubId).single();
              if (row) {
                result.data = { ...row, ...(row.content || {}), id: row.id } as unknown as MindMapData;
                await supabase.from('public_mindmaps').update({ public_views: (row.public_views || 0) + 1 }).eq('id', pubId);
              }
            } else if ((user || params.ownerId) && params.mapId) {
              const targetUid = params.ownerId || user?.id;
              if (targetUid) {
                const { data: row } = await supabase.from('mindmaps').select('*').eq('id', params.mapId).eq('user_id', targetUid).single();
                if (row) result.data = { ...row, ...(row.content || {}), id: row.id } as unknown as MindMapData;
              }
            }
            // Fallback: try public_mindmaps
            if (!result.data && params.mapId) {
              const { data: row } = await supabase.from('public_mindmaps').select('*').eq('id', params.mapId).single();
              if (row) result.data = { ...row, ...(row.content || {}), id: row.id } as unknown as MindMapData;
            }

            if (!result.data && !result.error) {
              result.error = "Mind map not found or you don't have permission to view it.";
            }
          } else if (params.topic1 && params.topic2) {
            currentMode = 'compare';
            trackGenerationStart(trackingId, {
              sourceType: 'text',
              mode: 'compare',
              depth: (params.depth || 'low') as AIGenerationMeta['depth'],
              persona: params.persona || aiPersona,
              userId: user?.id
            });
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
            trackGenerationStart(trackingId, {
              sourceType: 'text',
              mode: 'single',
              depth: (params.depth || 'low') as AIGenerationMeta['depth'],
              persona: params.persona || aiPersona,
              userId: user?.id
            });
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
                trackGenerationStart(trackingId, {
                  sourceType: 'image',
                  mode: 'single',
                  depth: (params.depth || 'low') as AIGenerationMeta['depth'],
                  persona: params.persona || aiPersona,
                  userId: user?.id
                });
                result = await generateMindMapFromImageAction({
                  imageDataUri: fileContent!,
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
              } else if (sessionType === 'youtube') {
                currentMode = 'youtube';
                trackGenerationStart(trackingId, {
                  sourceType: 'youtube',
                  mode: 'single',
                  depth: (params.depth || 'low') as AIGenerationMeta['depth'],
                  persona: params.persona || aiPersona,
                  userId: user?.id
                });
                result = await generateYouTubeMindMapAction({
                  url: fileContent!,
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
              } else if (sessionType === 'pdf') {
                currentMode = 'vision-pdf';
                trackGenerationStart(trackingId, {
                  sourceType: 'pdf',
                  mode: 'single',
                  depth: (params.depth || 'low') as AIGenerationMeta['depth'],
                  persona: params.persona || aiPersona,
                  userId: user?.id
                });
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
                trackGenerationStart(trackingId, {
                  sourceType: 'text',
                  mode: 'single',
                  depth: (params.depth || 'low') as AIGenerationMeta['depth'],
                  persona: params.persona || aiPersona,
                  userId: user?.id
                });
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
                trackGenerationStart(trackingId, {
                  sourceType: 'website',
                  mode: 'single',
                  depth: (params.depth || 'low') as AIGenerationMeta['depth'],
                  persona: params.persona || aiPersona,
                  userId: user?.id
                });
                result = await generateMindMapFromWebsiteAction({
                  url: fileContent!,
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
              } else if (sessionType === 'compare') {
                currentMode = 'compare';
                const compContent = sessionContent as { file1?: string; file2?: string; file1Type?: string; file2Type?: string; topic1?: string; topic2?: string };
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

                trackGenerationStart(trackingId, {
                  sourceType: 'text',
                  mode: 'compare',
                  depth: (params.depth || 'low') as AIGenerationMeta['depth'],
                  persona: params.persona || aiPersona,
                  userId: user?.id
                });
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
                trackGenerationStart(trackingId, {
                  sourceType: 'multi',
                  mode: 'single',
                  depth: (params.depth || 'low') as AIGenerationMeta['depth'],
                  persona: params.persona || aiPersona,
                  userId: user?.id
                });
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
                    result.data = await mapToMindMapData(parsed.data, (params.depth || 'low') as 'low' | 'medium' | 'deep') as MindMapWithId;
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

        // Daily Challenge tracking
        if (params.challenge === 'true' && user) {
          const dateString = new Date().toISOString().split('T')[0];
          awardXP('DAILY_CHALLENGE', { topic: result.data.topic });
          
          supabase.from('user_daily_challenges').upsert({
             user_id: user.id,
             date_string: dateString,
             map_id: result.data.id || params.mapId || null,
             xp_awarded: 500
          }, { onConflict: 'user_id, date_string' })
          .then(({ error }) => {
             if (error) console.error('Failed to log daily challenge completion:', error);
             else console.log('Daily challenge marked complete!');
          });
        }

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
              sourceFile2Content: (sessionContent as { file2?: string })?.file2,
              sourceFile2Type: (sessionContent as { file2Type?: string })?.file2Type,
              parentMapId: (params as Record<string, unknown>).parentMapId as string | undefined,
              isSubMap: !!(params as Record<string, unknown>).parentMapId,
            } as unknown as MindMapData;

            const existingMapWithId = mindMapsRef.current.find(m => m.topic?.toLowerCase() === result.data!.topic?.toLowerCase() && m.id);
            handleSaveMap(dataToSave, existingMapWithId?.id).then((savedId: any) => {
              if (savedId && !existingMapWithId?.id) {
                setMindMaps((prev: any[]) => prev.map(m =>
                  m.topic === (result.data!.topic || params.topic) ? { ...m, id: savedId } : m
                ));
                handleUpdateCurrentMap({ id: savedId });
                currentMapIdRef.current = savedId;
                navigateToMap(savedId!);

                // Award points for creating a new map
                const topicName = result.data!.topic;
                if (currentMode === 'compare') {
                  awardXP('MAP_COMPARE', { topic: topicName }).catch((err) => console.error("[XP] Failed:", err));
                } else if (currentMode === 'multi-source') {
                  awardXP('MAP_MULTI_SOURCE', { topic: topicName }).catch((err) => console.error("[XP] Failed:", err));
                } else {
                  awardXP('MAP_CREATED', { topic: topicName, mode: currentMode }).catch((err) => console.error("[XP] Failed:", err));
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
    // Dependencies are intentionally minimized: adding all referenced vars would
    // cause infinite re-render loops. The effect uses getParamKey as the primary
    // trigger and reads stable refs/closures for the rest.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getParamKey, user, isUserLoading, handleSaveMap, toast, params, config, aiPersona, setMindMaps, setActiveMindMapIndexState, activeMindMapIndex, navigateToMap, isLoading, handleUpdateCurrentMap, setActiveMindMapIndex]);


  // Track views for community maps
  useEffect(() => {
    if (mindMap?.id && mindMap.isPublic) {
      supabase.from('public_mindmaps')
        .update({ views: (mindMap.views || 0) + 1 })
        .eq('id', mindMap.id)
        .then(({ error }) => {
          if (error) console.error('Failed to update views:', error);
        });
    }
    // `mindMap.views` and `supabase` intentionally omitted: views is mutated inside
    // the callback and would cause re-triggering. supabase is the stable client.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mindMap?.id, mindMap?.isPublic]);


  const handleSaveMapFromHook = useCallback(async (silent = true) => {
    if (!mindMapRef.current || params.isSelfReference) return;
    const activeId = mindMapRef.current.id || currentMapIdRef.current || undefined;
    await handleSaveMap(mindMapRef.current, activeId, silent);
  }, [handleSaveMap, params.isSelfReference]);

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
  const currentMapIdRef = useRef<string | null>(null);
  useEffect(() => {
    mindMapRef.current = mindMap;
    if (mindMap?.id) {
      currentMapIdRef.current = mindMap.id;
    }
  }, [mindMap]);

  // Fetch complete map hierarchy (root + all sub-maps) — single query
  const fetchMapHierarchy = useCallback(async (currentMapData: MindMapData) => {
    if (!user) return;
    setHierarchyLoading(true);
    try {
      const currentMapId = currentMapData.id;
      if (!currentMapId) { setHierarchyLoading(false); return; }

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
      let currentId = currentMapId;
      let iterations = 0;

      while (currentId && iterations < 10) {
        let nextParentId = null;

        // 1. Try upward pointer: does the current map declare a parent?
        const currentData = currentId === currentMapId ? currentMapData : mapById.get(currentId);
        if (currentData) {
          nextParentId = (currentData as Record<string, any>).parent_map_id as string || (currentData as Record<string, any>).content?.parentMapId as string || (currentData as Record<string, any>).parentMapId as string;
        }

        // 2. Fallback downward pointer: does ANY map in allMaps claim this map as a child?
        if (!nextParentId) {
          const parentMap = allMaps.find(m => {
            const content = m.content as Record<string, any>;
            return content?.nestedExpansions?.some((e: any) => e.id === currentId);
          });
          if (parentMap) {
            nextParentId = parentMap.id;
          }
        }

        if (nextParentId && nextParentId !== currentId) {
          const parent = mapById.get(nextParentId);
          if (parent) {
            rootMapId = nextParentId;
            currentId = nextParentId;
          } else {
            break; // Parent not fetched or doesn't exist
          }
        } else {
          break; // This is the root
        }
        iterations++;
      }

      let rootMapData: { id: string; topic: string; icon?: string; createdAt?: string } | null = null;
      const rootParent = mapById.get(rootMapId);
      if (rootParent) {
        rootMapData = { id: rootMapId, topic: rootParent.topic || 'Untitled', icon: rootParent.icon, createdAt: rootParent.created_at };
      } else if (rootMapId === currentMapId) {
        rootMapData = { id: currentMapId, topic: currentMapData.topic, icon: currentMapData.icon, createdAt: (currentMapData as unknown as Record<string, unknown>).created_at as string || currentMapData.createdAt as string };
      }

      // Build descendant tree in memory (no recursive DB queries)
      const allSubMaps: NestedExpansionItem[] = [];
      const visitedIds = new Set<string>();

      const buildDescendants = (parentId: string, parentName: string, currentDepth: number) => {
        // Find all direct children from our local map dictionary using bi-directional checks
        const children = allMaps.filter(m => {
          const isUpwardChild = m.parent_map_id === parentId || (m.content as Record<string, any>)?.parentMapId === parentId;
          const isDownwardChild = (mapById.get(parentId)?.content as Record<string, any>)?.nestedExpansions?.some((e: any) => e.id === m.id);
          return isUpwardChild || isDownwardChild;
        });
        for (const child of children) {
          if (visitedIds.has(child.id)) continue;
          visitedIds.add(child.id);
          const subMapData = { ...child, ...(child.content || {}), id: child.id, parentMapId: child.parent_map_id } as MindMapWithId;
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
    finally { setHierarchyLoading(false); }
    // `supabase` intentionally omitted: it is the stable getSupabaseClient() result
    // and adding it would cause unnecessary re-creation on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Update hierarchy when mindMap changes
  useEffect(() => {
    if (mindMap?.id) {
      fetchMapHierarchy(mindMap);
    }
  }, [mindMap, fetchMapHierarchy]);

  // Reset generated FAQs when mind map topic changes
  useEffect(() => {
    setDynamicFAQs(null);
    setFaqGeneratedTopic('');
  }, [mindMap?.topic]);

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
          awardXPRef.current('STUDY_TIME_CANVAS').catch((err) => console.error("[XP] Failed:", err));
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
      if (resolved !== currentMap && JSON.stringify((resolved as unknown as Record<string, unknown>)[key]) !== JSON.stringify((currentMap as unknown as Record<string, unknown>)[key])) {
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
        const activeId = currentMap?.id || currentMapIdRef.current || undefined;
        handleSaveMap(mergedMap, activeId, true);
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





  const handleGenerateAndOpenSubMap = useCallback(async (subTopic: string, nodeId?: string, _contextPath?: string, mode: 'foreground' | 'background' = 'background', branchDepth?: 'low' | 'medium' | 'deep', explicitParentMapId?: string) => {
    try {
      // First check if it already exists locally in the parent map to avoid duplicate generations
      const existingExpansion = mindMap?.nestedExpansions?.find(e => e.topic === subTopic);
      if (existingExpansion && existingExpansion.fullData) {
        setMindMaps(prev => [...prev.filter(m => m.topic !== subTopic), existingExpansion.fullData as MindMapWithId]);
        if (mode === 'foreground') {
          setActiveMindMapIndex(mindMaps.length);
          toast({ title: "Sub-Map Opened", description: `Opened existing map for "${subTopic}".` });
        } else {
          toast({ title: "Sub-Map Available", description: `An existing map for "${subTopic}" is already available as a Sub-Map.` });
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
        toast({ title: "🧠 Creating Sub-Map", description: `Generating "${subTopic}" in the background — it will appear as a Sub-Map shortly.` });
      }

      const expansionResult = await expandNode(subTopic, nodeId || `sub-${Date.now()}`, { mode, parentDepth: parentAbsoluteDepth, branchDepth, explicitParentMapId });
      const parentId = expansionResult?.parentId;
      refreshBalance();
      awardXP('SUB_MAP_CREATED', { topic: subTopic }).catch((err) => console.error("[XP] Failed:", err));

      // Mark unsaved so auto-save persists parent with the new nestedExpansions
      setHasUnsavedChanges(true);

      if (mode === 'foreground') {
        toast({ title: "Sub-Map Generated", description: `Created detailed map for "${subTopic}".` });
      } else {
        // Re-fetch hierarchy after background generation so the new map
        // appears in the Nested Maps list immediately.
        const currentMap = mindMapRef.current;
        if (currentMap) {
          // If currentMap doesn't have an ID yet (just saved), it will be parentId
          const effectiveId = currentMap.id || (!explicitParentMapId ? parentId : undefined);
          if (effectiveId) {
            fetchMapHierarchy({ ...currentMap, id: effectiveId });
          }
        }
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Generation Failed", description: error.message });
    }
    // `awardXP`, `mindMap?.nestedExpansions`, `refreshBalance` intentionally omitted:
    // they are used inside the callback body but their changes should not re-create
    // this callback. Stable refs/stale closures are handled via refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, expandNode, mindMaps.length, setMindMaps, setActiveMindMapIndex, toast, mindMap?.id, mapHierarchy, fetchMapHierarchy]);

  const handleDeleteNestedMapConfirm = useCallback(async () => {
    const id = pendingDeleteId;
    if (!mindMap || !id) return;

    const updatedExpansions = (mindMap.nestedExpansions || []).filter(e => e.id !== id);
    const updatedMap = { ...mindMap, nestedExpansions: updatedExpansions };

    handleUpdateCurrentMap({ nestedExpansions: updatedExpansions });

    if (mindMap.id) {
      try {
        await handleSaveMap(updatedMap, mindMap.id, true);
      } catch (err) {
        console.error("Failed to persist nested map deletion:", err);
        toast({ variant: "destructive", title: "Save Failed", description: "Could not save the deletion." });
        setPendingDeleteId(null);
        return;
      }
    }

    if (user) {
      // Find all descendant sub-maps to cascade delete and prevent orphans
      const getDescendantIds = (parentId: string, maps: any[]): string[] => {
        const children = maps.filter(m => m.parentMapId === parentId || m.parent_map_id === parentId).map(m => m.id);
        return children.reduce((acc, childId) => [...acc, childId, ...getDescendantIds(childId, maps)], [] as string[]);
      };
      
      const descendantIds = mapHierarchy?.allSubMaps ? getDescendantIds(id, mapHierarchy.allSubMaps) : [];
      const idsToDelete = [id, ...descendantIds];

      const { error } = await supabase.from('mindmaps').delete().in('id', idsToDelete).eq('user_id', user.id);
      if (error) console.error('Failed to delete nested map(s):', error);
    }
    toast({ title: "Sub-Map Deleted", description: "The Sub-Map has been permanently removed." });
    setPendingDeleteId(null);
    // `supabase` intentionally omitted: it is the stable getSupabaseClient() result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mindMap, pendingDeleteId, handleUpdateCurrentMap, handleSaveMap, toast, user, mapHierarchy]);


  const handleDeleteNestedMap = useCallback((id: string) => {
    setPendingDeleteId(id);
  }, []);

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
    // `supabase` intentionally omitted: it is the stable getSupabaseClient() result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // `supabase` intentionally omitted: it is the stable getSupabaseClient() result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        persona: aiPersona
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
      
      awardXP('ALCHEMY_FUSION').catch((err) => console.error("[XP] Failed:", err));
      
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
            hierarchyLoading={hierarchyLoading}
            onShare={handleShare}
            isSharing={isSharing}
            onOpenPinnedMessages={handleOpenPinnedMessages}
            pinnedMessagesCount={pinnedMessagesCount}
            onQuizDeepenRef={quizDeepenRef}
            zoomToNodeRef={zoomToNodeRef}
            resonanceNodes={resonanceNodes}
            onSynthesize={handleSynthesize}
          />
          </Profiler>              {/* Dynamic Topic-Specific FAQs */}
              <div className="mx-auto w-full max-w-4xl px-4 py-8 mb-16">
                <Accordion 
                  type="single" 
                  collapsible 
                  className="w-full bg-background rounded-xl border border-white/5 shadow-sm"
                  onValueChange={(value) => {
                    // Generate FAQs only on first open for the current topic
                    if (value === 'canvas-faq' && !faqGeneratedTopic && !isFAQLoading && mindMap) {
                      setIsFAQLoading(true);
                      generateTopicFAQsAction(
                        { 
                          topic: mindMap.topic, 
                          summary: mindMap.summary 
                        },
                        {
                          provider: config.provider,
                          apiKey: config.provider === 'pollinations' ? config.pollinationsApiKey : config.apiKey,
                          userId: user?.id,
                        }
                      ).then(({ data, error }) => {
                        if (data && data.length > 0) {
                          setDynamicFAQs(data);
                          setFaqGeneratedTopic(mindMap.topic);
                        }
                        setIsFAQLoading(false);
                      }).catch((err) => {
                        console.error('[FAQs] Failed:', err);
                        setIsFAQLoading(false);
                      });
                    }
                  }}
                >
                  <AccordionItem value="canvas-faq" className="border-none">
                    <AccordionTrigger className="px-6 py-6 hover:no-underline hover:bg-white/5 rounded-xl transition-colors">
                      <div className="flex flex-col items-center justify-center text-center w-full">
                        <div className="flex items-center justify-center gap-2 mb-3">
                          <HelpCircle className="w-5 h-5 text-primary" />
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-2">
                          Topic FAQs
                        </h2>
                        <p className="text-zinc-500 text-sm max-w-xl mx-auto">
                          {mindMap ? `Frequently asked questions about ${mindMap.topic}` : 'Frequently asked questions about this topic'}
                        </p>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-0 pb-0 pt-0">
                      {isFAQLoading ? (
                        <div className="space-y-3 px-6 py-4">
                          {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="rounded-xl border border-white/5 bg-zinc-900/30 px-5 py-4 animate-pulse">
                              <div className="h-4 w-3/4 bg-zinc-800 rounded mb-3" />
                              <div className="h-3 w-full bg-zinc-800/50 rounded" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <FAQSection
                          items={dynamicFAQs && dynamicFAQs.length > 0 ? dynamicFAQs : CANVAS_FAQS}
                          showSearch={false}
                          hideHeader={true}
                          className="py-6 md:py-8"
                        />
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

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

      {/* Delete Sub-Map Confirmation Dialog */}
      <Dialog open={!!pendingDeleteId} onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}>
        <DialogContent className="sm:max-w-[400px] rounded-[2rem] border-red-500/20 bg-zinc-950">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-white flex items-center gap-3">
              <Trash2 className="h-5 w-5 text-red-400" />
              Delete Sub-Map?
            </DialogTitle>
            <DialogDescription className="text-zinc-400 font-medium">
              This will permanently delete the Sub-Map and all its data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="ghost" onClick={() => setPendingDeleteId(null)} className="rounded-xl border border-white/5 text-zinc-400 hover:text-white hover:bg-white/5 font-bold px-6 h-11">
              Cancel
            </Button>
            <Button onClick={handleDeleteNestedMapConfirm} variant="destructive" className="rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold px-6 h-11 shadow-lg shadow-red-600/20">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Permanently
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
            <Video className="h-5 w-5 text-red-500" />
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



      <ErrorBoundary sectionName="Chat Panel">
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
      </ErrorBoundary>

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
