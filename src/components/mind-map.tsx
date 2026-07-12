'use client';

import React, { useState, useEffect, memo, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Library,
  FolderOpen,
  FileText,
  Book,
  Loader2,
  Sparkles,
  MessageCircle,
  Lightbulb,
  GitBranch,
  Save,
  Check,
  MoreVertical,
  TestTube2,
  ChevronDown,
  BookOpen,
  ArrowRight,
  File,
  Image as ImageIcon,
  RefreshCw,
  Images,
  Share,
  Share2,
  Copy,
  ClipboardCheck,
  Network,
  Minimize2,
  Maximize2,
  Fingerprint,
  BrainCircuit,
  Languages,
  Download,
  X,
  Info,
  GraduationCap,
  Palette,
  Link2,
  UploadCloud,
  Cloud,
  ZapOff,
  Search,
  Target,
  Brain,
  Eye,
  Settings,
  Shield,
  Zap,
  Circle,
  HelpCircle,
  Clock,
  ExternalLink,
} from 'lucide-react';
const LucideIcons = {
  Library,
  FolderOpen,
  FileText,
  Book,
  Loader2,
  Sparkles,
  MessageCircle,
  Lightbulb,
  GitBranch,
  Save,
  Check,
  MoreVertical,
  TestTube2,
  ChevronDown,
  BookOpen,
  ArrowRight,
  File,
  Image: ImageIcon,
  RefreshCw,
  Images,
  Share,
  Share2,
  Copy,
  ClipboardCheck,
  Network,
  Minimize2,
  Maximize2,
  Fingerprint,
  BrainCircuit,
  Languages,
  Download,
  X,
  Info,
  GraduationCap,
  Zap,
  Palette,
  Link2,
  UploadCloud,
  Cloud,
  ZapOff,
  Search,
  Target,
  Brain,
  Eye,
  Settings,
  Shield,
  Circle,
  HelpCircle,
  Clock,
  ExternalLink,
};
import {
  enhanceImagePromptAction,
  translateMindMapAction,
  explainNodeAction,
  explainWithExampleAction,
  summarizeTopicAction,
  generateRelatedQuestionsAction,
} from '@/app/actions';

import {
  MindMapData,
  NestedExpansionItem,
  GeneratedImage,
  MindMapWithId,
  SubCategoryInfo,
  ExplainableNode,
  ExplanationMode,
  NodeEnrichment,
  ConfidenceLevel,
} from '@/types/mind-map';
import { categorizeMindMapAction, publishMindMapAction } from '@/app/actions/community';
import { MindMapStatus } from '@/hooks/use-mind-map-stack';
import { LeafNodeCard } from './mind-map/leaf-node-card';
import { useRenderTiming } from '@/hooks/use-render-timing';
import { useAIConfig } from '@/contexts/ai-config-context';
import { ExplanationDialog } from './mind-map/explanation-dialog';
import { SummaryDialog } from './summary-dialog';
import { MindMapToolbar } from './mind-map/mind-map-toolbar';
import { TopicHeader } from './mind-map/topic-header';
import { MindMapTreeView } from './mind-map/mind-map-tree-view';
import { cn } from '@/lib/utils';
import { MindMapAccordion } from './mind-map/mind-map-accordion';
import { CompareView } from './mind-map/compare-view';
import { BreadcrumbNavigation } from './breadcrumb-navigation';
import { NestedMapsDialog } from './nested-maps-dialog';
import { PracticeQuestionsDialog } from './practice-questions-dialog';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { ImageGenerationDialog, ImageSettings } from './mind-map/image-generation-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipPortal,
  TooltipTrigger,
} from './ui/tooltip';
import { formatText } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { languages } from '@/lib/languages';
import { AiContentDialog } from './ai-content-dialog';
import { ExampleDialog } from './example-dialog';
import { Icons } from './icons';
import { ImageGalleryDialog } from './image-gallery-dialog';
import Image from 'next/image';
import { toPascalCase } from '@/lib/utils';
import { toPlainObject } from '@/lib/serialize';
import { findMatchingCategory } from '@/lib/depth-analysis';

// Supabase logic
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { trackNestedExpansion, trackImageGenerated, trackMapCreated } from '@/lib/tracker';
import { useXP } from '@/contexts/xp-context';




/**
 * Props for the main data component.
 */
interface MindMapProps {
  data: MindMapData;
  isExpanded?: boolean;
  isSaved: boolean;
  onSaveMap: () => void;
  onExplainInChat: (message: string) => void;
  onGenerateNewMap: (topic: string, nodeId?: string, contextPath?: string, mode?: 'foreground' | 'background', branchDepth?: 'low' | 'medium' | 'deep', explicitParentMapId?: string) => void | Promise<void>;
  onViewSource?: () => void;
  onOpenNestedMap?: (mapData: any, expansionId: string) => void;
  onStartQuiz: (topic?: string) => void;
  generatingNode: string | null;
  selectedLanguage: string;
  onLanguageChange: (langCode: string) => void;
  onAIPersonaChange: (persona: string) => void;
  aiPersona: string;
  onRegenerate: () => void;
  isRegenerating: boolean;
  canRegenerate: boolean;
  nestedExpansions?: NestedExpansionItem[];
  mindMapStack?: MindMapData[];
  activeStackIndex?: number;
  onStackSelect?: (index: number) => void;
  onUpdate?: (updatedData: Partial<MindMapData> | ((prev: MindMapData) => Partial<MindMapData>)) => void;
  status: MindMapStatus;
  aiHealth?: { name: string, status: string }[];
  hasUnsavedChanges?: boolean;
  onDeleteNestedMap?: (id: string) => void;
  onRegenerateNestedMap?: (topic: string, id: string) => void;
  onPracticeQuestionClick?: (question: string) => void;
  rootMap?: { id: string; topic: string; icon?: string } | null;
  allSubMaps?: NestedExpansionItem[];
  hierarchyLoading?: boolean;
  onShare?: () => void;
  isSharing?: boolean;
  useFileAware?: boolean;
  onToggleFileAware?: () => void;
  onOpenPinnedMessages?: () => void;
  pinnedMessagesCount?: number;
  onQuizDeepenRef?: React.MutableRefObject<((w: { tag: string; score: number }[], t: string) => void) | null>;
  zoomToNodeRef?: React.MutableRefObject<((nodeName: string) => void) | null>;
  resonanceNodes?: string[];
  onSynthesize?: (nodeLabels: string[]) => void;
}

/**
 * Props for the ExplanationDialog component.
 */
interface ExplanationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string[];
  isLoading: boolean;
  onExplainInChat: (message: string) => void;
  explanationMode: ExplanationMode;
  onExplanationModeChange: (mode: ExplanationMode) => void;
}


/**
 * The main component for displaying and interacting with a mind map.
 */
export const MindMap = React.memo(({
  data,
  isSaved,
  onSaveMap,
  onExplainInChat,
  onGenerateNewMap,
  onOpenNestedMap,
  onStartQuiz,
  generatingNode,
  selectedLanguage,
  onLanguageChange,
  onAIPersonaChange,
  aiPersona,
  onRegenerate,
  isRegenerating,
  canRegenerate,
  nestedExpansions: propNestedExpansions,
  mindMapStack = [],
  activeStackIndex = 0,
  onStackSelect,
  onUpdate,
  status,
  aiHealth,
  hasUnsavedChanges,
  onDeleteNestedMap,
  onRegenerateNestedMap,
  onPracticeQuestionClick,
  rootMap,
  allSubMaps,
  hierarchyLoading,
  onShare,
  isSharing: propIsSharing,
  useFileAware = false,
  onToggleFileAware,
  onViewSource,
  onOpenPinnedMessages,
  pinnedMessagesCount = 0,
  onQuizDeepenRef,
  zoomToNodeRef,
  resonanceNodes = [],
  onSynthesize,
}: MindMapProps) => {
  const [focusedNodeName, setFocusedNodeName] = useState<string | null>(null);
  const [isSynthesisMode, setIsSynthesisMode] = useState(false);
  const [synthesisSelection, setSynthesisSelection] = useState<string[]>([]);

  const mindMapRef = React.useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { toast } = useToast();
  const { user, supabase } = useAuth();
  const { config, refreshBalance } = useAIConfig();
  const { awardXP } = useXP();

  const handleToggleNodeSelection = useCallback((label: string) => {
    setSynthesisSelection(prev => {
      if (prev.includes(label)) {
        return prev.filter(l => l !== label);
      }
      if (prev.length >= 2) {
        return [prev[1], label];
      }
      return [...prev, label];
    });
  }, []);

  const handleSynthesizeClick = useCallback(() => {
    if (synthesisSelection.length === 2 && onSynthesize) {
      onSynthesize(synthesisSelection);
      setIsSynthesisMode(false);
      setSynthesisSelection([]);
      toast({
        title: "Synthesis Initiated",
        description: "Your knowledge fusion is being prepared. Scroll to the bottom of the map to witness the birth of your new concept.",
      });
    }
  }, [synthesisSelection, onSynthesize, toast]);

  // Wire zoomToNode to the ref
  useEffect(() => {
    if (zoomToNodeRef) {
      zoomToNodeRef.current = (nodeName: string) => {
        setFocusedNodeName(nodeName);
        // Reset after a delay so it can be re-triggered for the same node
        setTimeout(() => setFocusedNodeName(null), 100);
      };
    }
  }, [zoomToNodeRef]);
  const [viewMode, setViewMode] = useState<'accordion' | 'map' | 'roadmap'>('accordion');
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setMountNode(document.body);
  }, []);

  // Mobile guard: Force accordion view on mobile devices and narrow windows
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined' && window.innerWidth < 768 && viewMode !== 'accordion') {
        setViewMode('accordion');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode]);

  const [activeTab, setActiveTab] = useState<'visual' | 'radial' | 'accordion' | 'compare'>('visual');
  const useSearch = true; // Always ON in background

  const providerOptions = useMemo(() => ({
    provider: config.provider,
    apiKey: config.provider === 'pollinations' ? config.pollinationsApiKey : config.apiKey,
    model: useSearch ? 'pollinations/gemini-search' : (config.textModel || config.pollinationsModel),
    userId: user?.id,
  }), [config.provider, config.apiKey, config.pollinationsApiKey, config.textModel, config.pollinationsModel, user?.id, useSearch]);

  const imageProviderOptions = useMemo(() => ({
    provider: config.provider as 'pollinations',
    apiKey: config.provider === 'pollinations' ? config.pollinationsApiKey : config.apiKey,
    model: config.imageModel || config.pollinationsModel,
    userId: user?.id,
  }), [config.provider, config.apiKey, config.pollinationsApiKey, config.imageModel, config.pollinationsModel, user?.id]);






  // Enrichment state — keyed by node name, generated once per node
  const [enrichments, setEnrichments] = useState<Record<string, NodeEnrichment>>(data.enrichments || {});
  const [isEnrichmentLoading, setIsEnrichmentLoading] = useState(false);
  const enrichmentInFlightRef = useRef<Set<string>>(new Set());

  // Confidence ratings — keyed by node name
  const [confidenceRatings, setConfidenceRatings] = useState<Record<string, ConfidenceLevel>>(data.confidenceRatings || {});

  // Micro quiz answers — keyed by node name
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>(data.quizAnswers || {});

  // State for images and expansions is initialized from data prop
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>(data.savedImages || []);
  const [nestedExpansions, setNestedExpansions] = useState<NestedExpansionItem[]>(propNestedExpansions || data.nestedExpansions || []);
  const [explanations, setExplanations] = useState<Record<string, string[]>>(data.explanations || {});

  const mergedExpansions = useMemo(() => {
    const expansionMap = new Map<string, any>();
    
    // Add all from hierarchy (the whole tree from DB)
    if (allSubMaps) {
      allSubMaps.forEach(item => expansionMap.set(item.id, item));
    }
    
    // Override or add from local nestedExpansions (immediate children, highly fresh)
    if (nestedExpansions) {
      nestedExpansions.forEach(item => expansionMap.set(item.id, item));
    }
    
    return Array.from(expansionMap.values());
  }, [allSubMaps, nestedExpansions]);

  // localMindMap state is removed. We use 'data' prop directly.
  const [isTranslating, setIsTranslating] = useState(false);

  const [isExplanationDialogOpen, setIsExplanationDialogOpen] = useState(false);
  const [explanationDialogContent, setExplanationDialogContent] = useState<
    string[]
  >([]);
  const [isExplanationLoading, setIsExplanationLoading] = useState(false);
  const [isExplanationRefreshing, setIsExplanationRefreshing] = useState(false);
  const [activeSubCategory, setActiveSubCategory] =
    useState<SubCategoryInfo | null>(null);
  const [currentMicroQuiz, setCurrentMicroQuiz] = useState<NodeEnrichment['microQuiz'] | null>(null);

  const [explanationMode, setExplanationMode] =
    useLocalStorage<ExplanationMode>('explanationMode', 'Intermediate');

  const [isExplanationInitialSelection, setIsExplanationInitialSelection] = useState(false);
  const [availableModes, setAvailableModes] = useState<ExplanationMode[]>([]);

  const [openSubTopics, setOpenSubTopics] = useState<string[]>(
    data.mode === 'single' && data.subTopics && data.subTopics.length > 0 ? ['topic-0'] : []
  );
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [openCompareNodes, setOpenCompareNodes] = useState<string[]>([]);
  const [isAllExpanded, setIsAllExpanded] = useState(false);
  const [isAiContentDialogOpen, setIsAiContentDialogOpen] = useState(false);



  const [isExampleDialogOpen, setIsExampleDialogOpen] = useState(false);
  const [exampleContent, setExampleContent] = useState('');
  const [isExampleLoading, setIsExampleLoading] = useState(false);
  const [activeExplainableNode, setActiveExplainableNode] = useState<any>(null);

  const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false);
  const [summaryContent, setSummaryContent] = useState(data.summary || '');
  const [isSummarizing, setIsSummarizing] = useState(false);

  useRenderTiming('MindMap');

  const [mounted, setMounted] = useState(false);
  const [languageUI, setLanguageUI] = useState(selectedLanguage);
  const [personaUI, setPersonaUI] = useState(aiPersona);

  // Sync UI state with props ONLY on mount or when props change externally
  useEffect(() => {
    setLanguageUI(selectedLanguage);
  }, [selectedLanguage]);

  useEffect(() => {
    setPersonaUI(aiPersona);
  }, [aiPersona, data]);

  // Forward ref so handleLanguageChangeInternal can call handleLanguageChange
  // without a TDZ issue (handleLanguageChange is defined much later in the file).
  const handleLanguageChangeRef = useRef<(langCode: string) => Promise<void>>(async () => {});

  // Handle user-initiated changes (only trigger parent callback, don't create loop)
  const handleLanguageChangeInternal = useCallback((newLang: string) => {
    setLanguageUI(newLang);
    if (mounted) {
      handleLanguageChangeRef.current(newLang);
    }
  }, [mounted]);

  const handlePersonaChangeInternal = useCallback((newPersona: string) => {
    setPersonaUI(newPersona);
    if (mounted) {
      onAIPersonaChange(newPersona);
    }
  }, [mounted, onAIPersonaChange]);

  useEffect(() => {
    setMounted(true);
  }, []);



  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Nested expansion state - load from saved data if available
  const [isNestedMapsDialogOpen, setIsNestedMapsDialogOpen] = useState(false);
  const [expandingNodeId, setExpandingNodeId] = useState<string | null>(null);

  // Advanced Image Generation (Visual Insight Lab)
  const [isImageLabOpen, setIsImageLabOpen] = useState(false);
  const [labNode, setLabNode] = useState<SubCategoryInfo | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);



  // Practice Mode State

  const [isPracticeDialogOpen, setIsPracticeDialogOpen] = useState(false);
  const [practiceQuestions, setPracticeQuestions] = useState<string[]>([]);
  const [isPracticeLoading, setIsPracticeLoading] = useState(false);
  const [practiceTopic, setPracticeTopic] = useState('');

  // #10 — Quiz-adaptive deepening state
  const [deepeningTags, setDeepeningTags] = useState<string[]>([]);



  // Update available modes whenever explanations change for the active node
  useEffect(() => {
    if (activeSubCategory) {
      const modes: ExplanationMode[] = ['Beginner', 'Intermediate', 'Expert'].filter(mode => {
        const key = `${activeSubCategory.name}-${mode}`;
        return explanations[key] && explanations[key].length > 0;
      }) as ExplanationMode[];
      setAvailableModes(modes);
    }
  }, [explanations, activeSubCategory]);


  // Sync images and expansions
  const lastSyncedImagesRef = useRef<string>('');
  const lastSyncedExpansionsRef = useRef<string>('');
  const lastSyncedExplanationsRef = useRef<string>('');

  useEffect(() => {
    if (data) {
      if (data.savedImages) {
        const imagesStr = JSON.stringify(data.savedImages);
        if (imagesStr !== lastSyncedImagesRef.current) {
          lastSyncedImagesRef.current = imagesStr;
          setGeneratedImages(data.savedImages);
        }
      }
      
      const currentExpansions = propNestedExpansions || data.nestedExpansions || [];
      const expansionsStr = JSON.stringify(currentExpansions);
      if (expansionsStr !== lastSyncedExpansionsRef.current) {
        lastSyncedExpansionsRef.current = expansionsStr;
        setNestedExpansions(currentExpansions);
      }

      if (data.explanations) {
        const explanationsStr = JSON.stringify(data.explanations);
        if (explanationsStr !== lastSyncedExplanationsRef.current) {
          lastSyncedExplanationsRef.current = explanationsStr;
          setExplanations(data.explanations);
        }
      }
    }
  }, [data.savedImages, data.nestedExpansions, data.explanations, propNestedExpansions]);

  // AUTO-SUMMARIZE when canvas content is fully loaded/generated
  const hasAutoSummarizedRef = useRef(false);

  // Reset the auto-summarize lock when the map changes topic
  const lastTopicRef = useRef(data.topic);
  useEffect(() => {
    if (data.topic !== lastTopicRef.current) {
      lastTopicRef.current = data.topic;
      hasAutoSummarizedRef.current = false;
      setSummaryContent(data.summary || '');
    } else if (data.summary) {
      setSummaryContent(data.summary);
    }
  }, [data.id, data.topic, data.summary]);

  useEffect(() => {
    const isReady = status === 'idle' && data && data.mode === 'single' && (data.subTopics?.length || 0) > 0;
    const isNewMap = !data.summary && !summaryContent && !isSummarizing;

    if (isReady && isNewMap && !hasAutoSummarizedRef.current) {
      hasAutoSummarizedRef.current = true;
      console.log('✨ Auto-summarizing new topic canvas...');
      const triggerAutoSummary = async () => {
        setIsSummarizing(true);
        try {
          const { summary, error } = await summarizeTopicAction({
            mindMapData: toPlainObject(data)
          }, providerOptions);

          if (summary && !error) {
            setSummaryContent(summary);
            if (onUpdate) onUpdate({ summary });
          }
        } catch (err) {
          console.error('Silent auto-summarization failed:', err);
          hasAutoSummarizedRef.current = false; // allow retry on next idle
        } finally {
          setIsSummarizing(false);
        }
      };

      triggerAutoSummary();
    }
  }, [status, data.id, data.topic, summaryContent, isSummarizing, providerOptions, onUpdate]);

  const handleSaveMap = useCallback(async () => {
    if (onSaveMap) onSaveMap();
  }, [onSaveMap]);

  const handleStartDebate = useCallback((topicA: string, topicB: string) => {
    const debatePrompt = `Let's have an "Intelligence Clash". Act as both ${topicA} and ${topicB}. Start a deep, analytical debate about your core philosophies, fundamental trade-offs, and real-world advantages. Challenge each other to prove which one offers a more optimal solution or superior experience in your respective domains.`;
    onExplainInChat(debatePrompt);
    toast({
      title: "Clash Arena Initiated",
      description: "Opening the debate floor in the chat panel...",
    });
  }, [onExplainInChat, toast]);

  const handleGenerateHybrid = useCallback(() => {
    if (data.mode !== 'compare') return;
    const parts = data.topic.split(/\s+(?:vs\.?|versus)\s+/i);
    if (parts.length < 2) return;

    const hybridTopic = `A hybrid fusion of ${parts[0]} and ${parts[1]}`;
    onGenerateNewMap(hybridTopic, 'hybrid-root', 'hybrid-context');
    toast({
      title: "Synthetic Hybrid Generation",
      description: "Designing a new species of technology...",
    });
  }, [data, onGenerateNewMap, toast]);

  const handleStartContrastQuiz = useCallback(() => {
    // Trigger the standard interactive quiz flow for the comparison topic
    onStartQuiz(data.topic);
    toast({
      title: "Contrast Quiz Ready",
      description: "Launching interactive 'Clash of Minds' quiz...",
    });
  }, [onStartQuiz, data.topic, toast]);

  const handleDimensionDrillDown = useCallback((dimensionName: string) => {
    const detailTopic = `${dimensionName} in depth: ${data.topic.replace(/\s+(?:vs\.?|versus)\s+/i, ' and ')}`;
    // Open a new map for this dimension
    onGenerateNewMap(detailTopic, `drill-${dimensionName}`, `dimension-context`, 'background');
    toast({
      title: "Drilling Into Dimension",
      description: `Generating a deep-dive map for "${dimensionName}" in the background.`,
    });
  }, [data.topic, onGenerateNewMap, toast]);

  const handleShowTimeline = useCallback(() => {
    const parts = data.topic.split(/\s+(?:vs\.?|versus)\s+/i);
    const names = parts.length >= 2 ? `${parts[0]} vs ${parts[1]}` : data.topic;
    const timelineTopic = `Historical Timeline and Evolution of ${names}`;
    onGenerateNewMap(timelineTopic, 'timeline-root', 'history-context');
    toast({
      title: "Evolution Timeline Triggered",
      description: "Tracing the path through time...",
    });
  }, [data.topic, onGenerateNewMap, toast]);


  const handleReloadSummary = useCallback(async () => {
    if (isSummarizing) return;
    setIsSummarizing(true);
    setSummaryContent('');

    try {
      const { summary, error } = await summarizeTopicAction({
        mindMapData: toPlainObject(data)
      }, providerOptions);

      if (error) throw new Error(error);
      if (summary) {
        setSummaryContent(summary);
        if (onUpdate) onUpdate({ summary });
        toast({
          title: "Summary Updated",
          description: "A fresh AI synthesis has been generated.",
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Regeneration Failed",
        description: err.message,
      });
    } finally {
      setIsSummarizing(false);
    }
  }, [isSummarizing, data, providerOptions, onUpdate, toast]);

  useEffect(() => {
    if (propNestedExpansions) {
      const nestedStr = JSON.stringify(propNestedExpansions);
      if (nestedStr !== lastSyncedExpansionsRef.current) {
        lastSyncedExpansionsRef.current = nestedStr;
        setNestedExpansions(propNestedExpansions);
      }
    }
  }, [propNestedExpansions]);

  // Notify parent of updates — memoized to avoid recomputing on every render
  const lastNotifiedRef = useRef<string>('');
  const dataToNotify = useMemo(() => {
    if (!onUpdate) return null;    return toPlainObject({
      nestedExpansions,
      savedImages: generatedImages,
      explanations,
      enrichments,
      confidenceRatings,
      quizAnswers,
    });
  }, [nestedExpansions, generatedImages, explanations, enrichments, confidenceRatings, quizAnswers, onUpdate]);

  useEffect(() => {
    if (!onUpdate || !dataToNotify) return;
    const stringified = JSON.stringify(dataToNotify);
    if (stringified === lastNotifiedRef.current) return;
    lastNotifiedRef.current = stringified;
    onUpdate(dataToNotify);
  }, [dataToNotify, onUpdate]);



  // Internal auto-saves removed. 
  // All persistence is now handled by the parent component via onUpdate and its debounced auto-save.


  const handleDownloadImage = useCallback((url: string, name: string) => {
    try {
      const link = document.createElement('a');
      link.href = url;
      const mimeType = url.substring(url.indexOf(':') + 1, url.indexOf(';'));
      const extension = mimeType.split('/')[1] || 'png';
      link.download = `${name.replace(/ /g, '_')}_${Date.now()}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download image:', error);
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: 'Could not download the image. Please try saving it directly.',
      });
    }
  }, [toast]);


  const handleLanguageChange = useCallback(async (langCode: string) => {
    if (isTranslating) return;
    setIsTranslating(true);

    try {
      // Use toPlainObject to sanitize Firestore data
      const plainMindMapData = toPlainObject(data);

      const { translation, error } = await translateMindMapAction({
        mindMapData: plainMindMapData,
        targetLang: langCode,
      }, providerOptions);

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Translation Failed',
          description: error,
        });
        // Revert UI if failed
        setLanguageUI(selectedLanguage);
      } else if (translation) {
        if (onUpdate) onUpdate(translation);
        onLanguageChange(langCode);
        awardXP('MAP_TRANSLATED', { targetLang: langCode }).catch((err) => console.error("[XP] Failed:", err));
      }
    } catch (err: any) {
      console.error("Translation error:", err);
      setLanguageUI(selectedLanguage);
    } finally {
      setIsTranslating(false);
    }
  }, [isTranslating, data, providerOptions, toast, onUpdate, onLanguageChange, awardXP, selectedLanguage]);

  // Keep the forward ref in sync so handleLanguageChangeInternal (defined above near mounted)
  // can call handleLanguageChange without a TDZ issue.
  useEffect(() => {
    handleLanguageChangeRef.current = handleLanguageChange;
  }, [handleLanguageChange]);

  const fetchExplanation = async () => {
    if (!activeSubCategory) return;

    // Cache Key: unique combo of category name and persona/mode
    const cacheKey = `${activeSubCategory.name}-${explanationMode}`;

    // 1. Check Cache
    if (explanations[cacheKey]) {
      console.log(`⚡ Using cached explanation for ${cacheKey}`);
      setExplanationDialogContent(explanations[cacheKey]);
      setIsExplanationRefreshing(false);
      return;
    }

    // Track if we're refreshing (content exists) vs initial load
    const isRefreshing = explanationDialogContent.length > 0;
    
    if (isRefreshing) {
      setIsExplanationRefreshing(true);
    } else {
      setIsExplanationLoading(true);
    }

    try {
      const { explanation, error } = await explainNodeAction({
        subCategoryName: activeSubCategory!.name,
        mainTopic: data.topic,
        explanationMode: explanationMode,
        targetLanguage: selectedLanguage,
        usePdfContext: useFileAware,
        pdfContext: (data as any).pdfContext ? JSON.stringify((data as any).pdfContext) : undefined,
        subCategoryDescription: activeSubCategory!.description || ''
      }, providerOptions);

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Explanation Failed',
          description: error,
        });
      } else if (explanation) {
        setExplanationDialogContent(explanation.explanationPoints);

        // Award XP for completing explanation
        awardXP('EXPLANATION_COMPLETED', { node: activeSubCategory!.name, mode: explanationMode }).catch((err) => console.error("[XP] Failed:", err));

        // 2. Save to State (triggers auto-save)
        setExplanations(prev => ({
          ...prev,
          [cacheKey]: explanation.explanationPoints
        }));

        // Refresh balance after AI operation
        refreshBalance();
      }
    } catch (err) {
      console.error('Explanation fetch error:', err);
    } finally {
      setIsExplanationLoading(false);
      setIsExplanationRefreshing(false);
    }
  };

  useEffect(() => {
    if (activeSubCategory && isExplanationDialogOpen && !isExplanationInitialSelection) {
      fetchExplanation();
    }
    // `fetchExplanation` is intentionally omitted: it is a regular function
    // defined in the component body and would change reference on every
    // render, causing an infinite loop. The effect already depends on the
    // key inputs that `fetchExplanation` uses internally.
  }, [activeSubCategory, explanationMode, isExplanationDialogOpen, isExplanationInitialSelection]);


  const fetchExample = async () => {
    if (!activeExplainableNode) return;
    setIsExampleLoading(true);
    const { example, error } = await explainWithExampleAction({
      mainTopic: data.topic,
      topicName: activeExplainableNode.name,
      explanationMode,
      usePdfContext: useFileAware,
      pdfContext: useFileAware && (data as any).pdfContext ? JSON.stringify((data as any).pdfContext) : undefined,
    }, providerOptions);
    setIsExampleLoading(false);

    // Refresh balance after AI operation
    refreshBalance();

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to get example',
        description: error,
      });
      setIsExampleDialogOpen(false);
    } else if (example) {
      setExampleContent(example.example);
    }
  };

  useEffect(() => {
    if (activeExplainableNode && isExampleDialogOpen) {
      fetchExample();
    }
    // `fetchExample` is intentionally omitted: it is a regular function
    // defined in the component body and would change reference on every
    // render, causing an infinite loop. The effect already depends on the
    // key inputs that `fetchExample` uses internally.
  }, [activeExplainableNode, explanationMode, isExampleDialogOpen]);


  const handleGeneratePracticeQuestions = useCallback(async (topic: string) => {
    setPracticeTopic(topic);
    setIsPracticeDialogOpen(true);
    // Clear previous if different topic? Or just always clear
    setPracticeQuestions([]);
    setIsPracticeLoading(true);

    try {
      const { data: qData, error } = await generateRelatedQuestionsAction({
        topic,
        mindMapData: toPlainObject(data),
        usePdfContext: useFileAware,
        pdfContext: useFileAware && (data as any).pdfContext ? JSON.stringify((data as any).pdfContext) : undefined,
      }, providerOptions);

      // Refresh balance after AI operation
      refreshBalance();

      if (error) {
        toast({ title: "Failed to generate questions", description: error, variant: "destructive" });
      } else if (qData?.questions) {
        setPracticeQuestions(qData.questions);
      }
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error", description: "Could not generate practice questions.", variant: "destructive" });
    } finally {
      setIsPracticeLoading(false);
    }
  }, [data, providerOptions, refreshBalance, toast, useFileAware]);



  // Keep a stable ref to the latest data.subTopics for quiz deepening
  const subTopicsRef = useRef(data.mode === 'single' ? (data as any).subTopics : []);
  useEffect(() => {
    if (data.mode === 'single') {
      subTopicsRef.current = (data as any).subTopics || [];
    }
  }, [data]);

  // #10 — Quiz-adaptive deepening: generate + merge nodes for weak sections
  const handleQuizDeepen = React.useCallback(async (
    weakSections: { tag: string; score: number }[],
    quizTopic: string
  ) => {
    if (data.mode !== 'single' || !onUpdate) return;
    const { generateQuizDepthNodesAction } = await import('@/app/actions');

    // Always process all weak sections - deduplication happens during merge
    const sectionsToProcess = weakSections;

    if (sectionsToProcess.length === 0) {
      return;
    }

    // Start shimmer on matched branches
    setDeepeningTags(sectionsToProcess.map(s => s.tag));

    // Pre-compute the anchor: if quizTopic matches a specific node in the map,
    // lock all new nodes into that node's parent category instead of fuzzy-matching concept tags.
    const findNodeAnchor = (topic: string, subTopics: any[]): { subTopicIndex: number; categoryIndex: number } | null => {
      const norm = (s: string) => s.toLowerCase().trim();
      const t = norm(topic);
      for (let si = 0; si < subTopics.length; si++) {
        // Match at SubTopic level
        if (norm(subTopics[si].name) === t) return { subTopicIndex: si, categoryIndex: 0 };
        for (let ci = 0; ci < subTopics[si].categories.length; ci++) {
          const cat = subTopics[si].categories[ci];
          // Match at Category level
          if (norm(cat.name) === t) return { subTopicIndex: si, categoryIndex: ci };
          // Match at SubCategory level → inject into its parent category
          if (cat.subCategories?.some((sc: any) => norm(sc.name) === t))
            return { subTopicIndex: si, categoryIndex: ci };
        }
      }
      return null;
    };

    const nodeAnchor = findNodeAnchor(quizTopic, subTopicsRef.current);

    for (const section of sectionsToProcess) {
      // Always read the LATEST subTopics from the ref, not the stale closure
      const currentSubTopics = subTopicsRef.current;

      // If quizTopic maps to a specific node, use that anchor.
      // Otherwise fall back to concept-tag fuzzy matching.
      const match = nodeAnchor ?? findMatchingCategory(section.tag, currentSubTopics);
      if (!match) {
        console.warn(`Quiz deepen: No matching category found for "${section.tag}", skipping.`);
        continue;
      }
      const targetCat = currentSubTopics[match.subTopicIndex]?.categories[match.categoryIndex];
      const existingNodes = targetCat?.subCategories.map((sc: any) => sc.name) ?? [];

      const { data: newNodes, error } = await generateQuizDepthNodesAction({
        mainTopic: quizTopic,
        sectionName: nodeAnchor ? (targetCat?.name ?? section.tag) : section.tag,
        existingNodes,
        quizScore: section.score,
        persona: aiPersona,
      }, providerOptions);

      if (error || !newNodes || newNodes.length === 0) {
        console.warn(`Quiz deepen failed for "${section.tag}":`, error);
        continue;
      }

      // Capture match indices for the closure below
      const { subTopicIndex, categoryIndex } = match;
      const nodeCount = newNodes.length;
      const targetCatName = targetCat?.name ?? section.tag;
      const sectionScore = section.score;

      // Functional update: always merges onto the LATEST state, not the stale closure
      onUpdate((prevData: any) => {
        const prevSubTopics: any[] = prevData?.subTopics ?? subTopicsRef.current;
        const updatedSubTopics = prevSubTopics.map((st: any, si: number) => ({
          ...st,
          categories: st.categories.map((cat: any, ci: number) => {
            if (si !== subTopicIndex || ci !== categoryIndex) return cat;
            const existingNames = new Set(cat.subCategories.map((sc: any) => sc.name));
            const dedupedNew = newNodes.filter((n: any) => !existingNames.has(n.name));
            return { ...cat, subCategories: [...cat.subCategories, ...dedupedNew] };
          })
        }));
        return { subTopics: updatedSubTopics };
      });

      // Also update the ref immediately so the next loop iteration sees the new nodes
      subTopicsRef.current = subTopicsRef.current.map((st: any, si: number) => ({
        ...st,
        categories: st.categories.map((cat: any, ci: number) => {
          if (si !== subTopicIndex || ci !== categoryIndex) return cat;
          const existingNames = new Set(cat.subCategories.map((sc: any) => sc.name));
          const dedupedNew = newNodes.filter((n: any) => !existingNames.has(n.name));
          return { ...cat, subCategories: [...cat.subCategories, ...dedupedNew] };
        })
      }));

      // Auto-open the matched SubTopic + Category so user sees the new nodes
      const subTopicId = `topic-${subTopicIndex}`;
      const catId = `cat-${subTopicIndex}-${categoryIndex}`;
      setOpenSubTopics(prev => prev.includes(subTopicId) ? prev : [...prev, subTopicId]);
      setOpenCategories(prev => prev.includes(catId) ? prev : [...prev, catId]);

      toast({
        title: '🎯 Quiz Insights Added',
        description: `${nodeCount} new nodes added to "${targetCatName}" (score: ${sectionScore}%)`,
        duration: 5000,
      });
    }

    setDeepeningTags([]);
  }, [data.mode, aiPersona, providerOptions, onUpdate, toast]);

  // Wire handleQuizDeepen to the ref so canvas/chat-panel can call it
  useEffect(() => {
    if (onQuizDeepenRef) {
      onQuizDeepenRef.current = handleQuizDeepen;
    }
  }, [handleQuizDeepen, onQuizDeepenRef]);

  const handleSubCategoryClick = useCallback((subCategory: SubCategoryInfo) => {
    setActiveSubCategory(subCategory);
    setExplanationDialogContent([]);
    setCurrentMicroQuiz(null);

    // Check if we have ANY explanation cached for this node
    const availableModes: ExplanationMode[] = ['Beginner', 'Intermediate', 'Expert'].filter(mode => {
      const key = `${subCategory.name}-${mode}`;
      return explanations[key] && explanations[key].length > 0;
    }) as ExplanationMode[];

    setAvailableModes(availableModes);

    if (availableModes.length > 0) {
      setIsExplanationInitialSelection(false);
      const currentModeAvailable = availableModes.includes(explanationMode);
      if (!currentModeAvailable) {
        setExplanationMode(availableModes[0]);
      } else {
        setExplanationDialogContent(explanations[`${subCategory.name}-${explanationMode}`]);
      }
    } else {
      setIsExplanationInitialSelection(true);
    }

    setIsExplanationDialogOpen(true);

    // Award XP for opening explanation
    awardXP('EXPLANATION_OPENED', { node: subCategory.name }).catch((err) => console.error("[XP] Failed:", err));

    // Fire-and-forget enrichment fetch — only if not already cached or in-flight
    const enrichKey = subCategory.name;
    if (!enrichments[enrichKey] && !enrichmentInFlightRef.current.has(enrichKey)) {
      enrichmentInFlightRef.current.add(enrichKey);
      setIsEnrichmentLoading(true);
      import('@/app/actions/enrich-node').then(({ enrichNodeAction }) => {
        enrichNodeAction(
          { nodeName: subCategory.name, nodeDescription: subCategory.description, mainTopic: data.topic },
          providerOptions
        ).then(({ data: enrichData }) => {
          enrichmentInFlightRef.current.delete(enrichKey);
          if (enrichData) {
            setEnrichments(prev => ({ ...prev, [enrichKey]: enrichData }));
          }
          setIsEnrichmentLoading(false);
        }).catch(() => {
          enrichmentInFlightRef.current.delete(enrichKey);
          setIsEnrichmentLoading(false);
        });
      });
    }
  }, [explanations, explanationMode, enrichments, data.topic, providerOptions, awardXP]);

  const handleInitialLevelSelect = useCallback((mode: ExplanationMode) => {
    setExplanationMode(mode);
    setIsExplanationInitialSelection(false);
    // The useEffect will catch the state change and trigger fetchExplanation()
  }, []);

  const handleExplainWithExample = useCallback((node: ExplainableNode) => {
    setExampleContent('');
    setActiveExplainableNode(node);
    setIsExampleDialogOpen(true);
  }, []);

  const handleGenerateImageClick = useCallback((subCategory: SubCategoryInfo) => {
    // Instead of immediately generating, open the "Visual Insight Lab"
    setLabNode(subCategory);
    setIsImageLabOpen(true);
  }, []);

  const handleEnhancePrompt = useCallback(async (prompt: string, style?: string, composition?: string, mood?: string, colorPalette?: string, lighting?: string) => {
    setIsEnhancing(true);
    try {
      const { enhancedPrompt, error } = await enhanceImagePromptAction({
        prompt,
        style,
        composition,
        mood,
        colorPalette,
        lighting
      }, providerOptions);

      // Refresh balance after AI completion
      refreshBalance();

      if (error) throw new Error(error);
      return enhancedPrompt?.enhancedPrompt || prompt;
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Enhancement Failed',
        description: err.message,
      });
      return prompt;
    } finally {
      setIsEnhancing(false);
    }
  }, [providerOptions, refreshBalance, toast]);

  const handleGenerateImageWithSettings = async (settings: ImageSettings) => {
    if (!labNode) return;

    const generationId = `img-${Date.now()}`;

    const placeholderImage: GeneratedImage = {
      id: generationId,
      url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgZmlsbD0iIzI3MjcyNyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5HZW5lcmF0aW5nLi4uPC90ZXh0Pjwvc3ZnPg==',
      name: labNode.name,
      description: labNode.description,
      status: 'generating',
    };
    setGeneratedImages(prev => [...prev, placeholderImage]);

    const { id: toastId, update } = toast({
      title: 'Generating Insight...',
      description: `Creating ${settings.aspectRatio} ${settings.style} render using ${settings.model}`,
      duration: Infinity,
    });

    // Opening the Gallery immediately so the user can see the progress
    setIsGalleryOpen(true);

    try {
      console.log('🎨 Generating with custom settings:', settings);
      console.log(`🎨 Using client key from context: ${config.pollinationsApiKey ? 'Yes' : 'No'}`);

      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: settings.enhancedPrompt,
          model: settings.model,
          style: settings.style,
          composition: settings.composition,
          mood: settings.mood,
          colorPalette: settings.colorPalette,
          lighting: settings.lighting,
          width: settings.width,
          height: settings.height,
          userId: user?.id,
          userApiKey: config.pollinationsApiKey
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Image generation failed');
      }

      const imageData = await response.json();

      const newImage: GeneratedImage = {
        id: generationId,
        url: imageData.imageUrl,
        name: labNode.name,
        description: labNode.description,
        status: 'completed',
        settings: {
          initialPrompt: settings.initialPrompt,
          enhancedPrompt: settings.enhancedPrompt,
          model: settings.model,
          aspectRatio: settings.aspectRatio,
          style: settings.style,
          composition: settings.composition,
          mood: settings.mood
        }
      };

      setGeneratedImages(prev => prev.map(img => img.id === generationId ? newImage : img));

      // Award XP for image generation
      awardXP('IMAGE_GENERATED', { model: settings.model, node: labNode.name }).catch((err) => console.error("[XP] Failed:", err));

      if (supabase && user) {
        try {
          const achievements = await trackImageGenerated(supabase, user.id);
          // Show achievement toasts
          const tierEmoji: Record<string, string> = { bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎' };
          for (const a of achievements) {
            toast({
              title: `${tierEmoji[a.tier] || '🏆'} Achievement Unlocked!`,
              description: `${a.name} — ${a.description}`,
              duration: 6000,
            });
          }
        } catch (fE: any) {
          console.warn('⚠️ Could not track usage:', fE.message);
        }
      }

      // Refresh global pollen balance
      await refreshBalance();

      update({
        id: toastId,
        title: 'Insight Generated!',
        description: `Created successfully using ${imageData.model}`,
        duration: 5000,
      });

    } catch (err: any) {
      console.error('Generation failed:', err);
      setGeneratedImages(prev => prev.map(img => img.id === generationId ? { ...img, status: 'failed' } : img));
      update({
        id: toastId,
        title: 'Generation Failed',
        description: err.message || 'Failed to generate image.',
        variant: 'destructive',
        duration: 5000,
      });
    }
  };

  const handleDeleteImage = useCallback((id: string) => {
    setGeneratedImages(prev => prev.filter(img => img.id !== id));
    toast({
      description: "Image removed from gallery.",
    });
  }, [toast]);





  const handleDuplicate = useCallback(async () => {
    if (!data || isDuplicating) return;
    setIsDuplicating(true);

    try {
      if (!user || !supabase) {
        throw new Error("You must be logged in to duplicate a mind map.");
      }

      const singleData = data as any;
      // Build a properly snake_case row matching the mindmaps table schema
      const { data: newMap, error: insertError } = await supabase.from('mindmaps').insert({
        topic: data.topic,
        summary: data.summary || '',
        user_id: user.id,
        mode: data.mode || 'single',
        depth: data.depth || 'medium',
        ai_persona: data.aiPersona || 'Teacher',
        node_count: data.nodeCount || 0,
        is_public: false,
        is_sub_map: false,
        parent_map_id: null,
        forked_from: data.isPublic ? data.id : null,
        content: {
          subTopics: singleData.subTopics || [],
          compareData: singleData.compareData || null,
          explanations: {},
          shortTitle: data.shortTitle || null,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).select('id').single();

      if (insertError) throw insertError;

      if (data.isPublic) {
        // Increment fork count on the original map
        await supabase.rpc('increment_fork_count', { map_id: data.id });
        awardXP('MAP_CLONED', { topic: data.topic });
      }

      toast({
        title: "Mind Map Duplicated",
        description: "A copy has been saved to your library.",
      });

      router.push(`/canvas?mapId=${newMap.id}`);

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Duplicate Failed",
        description: error.message || "Could not duplicate mind map.",
      });
    } finally {
      setIsDuplicating(false);
    }
  }, [data, isDuplicating, user, supabase, toast, router]);

  const copyLinkToClipboard = useCallback((id: string, isPublicOrShared: boolean) => {
    let url = window.location.href;
    if (id) {
      const baseUrl = `${window.location.origin}${window.location.pathname}`;
      const params = new URLSearchParams();
      if (isPublicOrShared) {
        if (data.isPublic) {
          params.set('mapId', id.startsWith('public_') ? id : `public_${id}`);
        } else {
          params.set('mapId', id.startsWith('share_') ? id : `share_${id}`);
        }
      } else {
        params.set('mapId', id);
      }


      // Transfer relevant status flags but drop 'topic'
      if (selectedLanguage && selectedLanguage !== 'en') {
        params.set('lang', selectedLanguage);
      }
      url = `${baseUrl}?${params.toString()}`;
    }

    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    toast({
      title: "Link Copied",
      description: isPublicOrShared
        ? "Link copied to clipboard. Anyone with this link can view."
        : "Private link copied. Only you can view this.",
    });
  }, [selectedLanguage, data, toast]);


  const handleShareLink = useCallback(async () => {
    const sParams = new URLSearchParams(window.location.search);
    const effectiveId = data.id || sParams.get('mapId');

    if (!effectiveId) {
      toast({ title: "Save Required", description: "Please save the map before sharing.", variant: "destructive" });
      return;
    }

    if (data.isPublic || data.isShared) {
      copyLinkToClipboard(effectiveId, true);
      return;
    }

    if (!user || !supabase) {
      // Fallback for non-logged in users (shouldn't happen for saved maps usually)
      copyLinkToClipboard(effectiveId, false);
      return;
    }

    setIsSharing(true);
    try {
      // 1. Create shared entry (Unlisted)
      const shareId = `share_${effectiveId}`;
      const sharedData = {
        topic: data.topic,
        summary: data.summary,
        content: (data as any).content || {},
        id: shareId,
        is_shared: true,
        is_public: false,
        shared_at: new Date().toISOString(),
        original_author_id: user.id,
        author_name: user.displayName || 'Explorer'
      };

      await supabase.from('shared_mindmaps').upsert(sharedData);

      // 2. Update user map to reflect shared status
      await supabase.from('mindmaps').update({
        is_shared: true
      }).eq('id', effectiveId).eq('user_id', user.id);

      // 3. Update local state
      if (onUpdate) onUpdate({ isShared: true });

      copyLinkToClipboard(effectiveId, true);
      toast({ title: "Sharing Enabled", description: "Unlisted link generated. Share it with anyone!" });

    } catch (e: any) {
      console.error("Share failed:", e);
      toast({ title: "Sharing Failed", description: e.message, variant: "destructive" });
    } finally {
      setIsSharing(false);
    }
  }, [data, user, supabase, onUpdate, toast, copyLinkToClipboard]);

  const expandAll = useCallback(() => {
    if (data.mode === 'compare') {
      setIsAllExpanded(true);
    } else {
      const singleData = data as any;
      const allTopicIds = (singleData.subTopics as any[] || []).map((_: any, i: number) => `topic-${i}`);
      const allCategoryIds = (singleData.subTopics as any[] || []).flatMap((t: any, i: number) =>
        (t.categories as any[] || []).map((_: any, j: number) => `cat-${i}-${j}`)
      );
      setOpenSubTopics(allTopicIds);
      setOpenCategories(allCategoryIds);
    }
    setIsAllExpanded(true);
  }, [data]);

  const collapseAll = useCallback(() => {
    setOpenSubTopics([]);
    setOpenCategories([]);
    setIsAllExpanded(false);
  }, []);

  const handlePublish = useCallback(async () => {
    if (!user || !supabase || isPublishing) return;

    // 1. Check if it's already public
    if (data.isPublic) {
      toast({ title: "Already Public", description: "This mind map is already in the community dashboard." });
      return;
    }

    setIsPublishing(true);
    const { id: toastId, update } = toast({
      title: 'Publishing to Community...',
      description: 'AI is categorizing your mind map for the community.',
      duration: Infinity,
    });

    try {
      // 2. AI Categorization
      const { categories, error: catError } = await categorizeMindMapAction({
        topic: data.topic,
        summary: data.summary,
      }, providerOptions);

      // Refresh balance after AI operation
      refreshBalance();

      if (catError) throw new Error(catError);

      update({ id: toastId, title: 'Uploading Data...', description: 'Saving your mind map to the community repository.' });

      // 3. Prepare Community Data
      const targetUid = data.userId || data.uid || user.id;
      
      // Fix: Prioritize original author name from data, fallback to current user ONLY if it's their own map
      const authorName = data.authorName || 
                         (targetUid !== user.id ? 'Explorer' : (user.displayName || 'Anonymous'));
      
      const publicData: any = {
        topic: data.topic,
        summary: data.summary,
        content: data,
        isPublic: true,
        publicCategories: categories,
        originalMapId: data.id,
        originalAuthorId: targetUid,
        authorName: authorName,
        authorAvatar: data.authorAvatar || (targetUid === user.id ? (user.photoURL || '') : ''),
        views: 0,
      };

    // 4. Save via Server Action
      if (!data.id) {
        update({ id: toastId, title: 'Save Required', description: 'Please save your mind map before publishing.', variant: 'destructive', duration: 5000 });
        setIsPublishing(false);
        return;
      }
      const { success, error: publishError } = await publishMindMapAction(data.id, publicData, user.id);

      if (!success) {
        throw new Error(publishError || 'Failed to publish mind map.');
      }

      // 5. Update Local Status
      if (onUpdate) {
        onUpdate({ isPublic: true, publicCategories: categories });
      }

      update({
        id: toastId,
        title: 'Mind Map Published!',
        description: 'Your mind map is now live on the Community Dashboard.',
        duration: 5000,
        action: (
          <Button size="sm" onClick={() => router.push('/community')}>
            Browse Community
          </Button>
        )
      });

    } catch (err: any) {
      console.error('Publish error:', err);
      update({
        id: toastId,
        title: 'Publishing Failed',
        description: err.message || 'An unknown error occurred.',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setIsPublishing(false);
    }
  }, [user, supabase, isPublishing, data, providerOptions, refreshBalance, onUpdate, router, toast]);

  const handleOpenSummary = useCallback(async () => {
    setIsSummaryDialogOpen(true);
    if (summaryContent) return; // Already generated for this session

    setIsSummarizing(true);
    try {
      const { summary, error } = await summarizeTopicAction({
        mindMapData: toPlainObject(data)
      }, providerOptions);

      // Refresh balance after AI operation
      refreshBalance();

      if (error || !summary) {
        throw new Error(error || 'Failed to generate summary');
      }

      setSummaryContent(summary);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Summarization Failed",
        description: err.message
      });
      setIsSummaryDialogOpen(false);
    } finally {
      setIsSummarizing(false);
    }
  }, [summaryContent, data, providerOptions, refreshBalance, toast]);

  // ── Stabilized inline callbacks for memo'd children ──
  const handleToggleSynthesis = useCallback(() => {
    setIsSynthesisMode(prev => !prev);
    setSynthesisSelection([]);
  }, []);

  const handleCompareExplainNode = useCallback((node: any) => {
    const nodeTitle = node?.title || node?.name || '';
    onExplainInChat(`Explain "${nodeTitle}" in the context of the comparison of ${data.topic}.`);
  }, [onExplainInChat, data.topic]);

  const handleCompareSubCategoryClick = useCallback((node: any) => {
    handleSubCategoryClick({ name: node.title, description: node.description || '' });
  }, [handleSubCategoryClick]);

  const handleRadialNodeClick = useCallback((node: any) => {
    if (node.type === 'subcategory') handleSubCategoryClick(node);
  }, [handleSubCategoryClick]);

  const handleRadialGenerateNewMap = useCallback((topic: string, id?: string) => {
    onGenerateNewMap(topic, id || '', `${data.topic} > ${topic}`, 'background');
  }, [onGenerateNewMap, data.topic]);

  const handleRadialExplainWithExample = useCallback((topic: string) => {
    handleExplainWithExample({ name: topic, type: 'subTopic' });
  }, [handleExplainWithExample]);

  const handleRadialGenerateImage = useCallback((topic: string) => {
    handleGenerateImageClick({ name: topic, description: '' });
  }, [handleGenerateImageClick]);

  return (
    <div className="min-h-screen pb-20 relative" ref={mindMapRef}>
      <MindMapToolbar
        languageUI={languageUI}
        onLanguageChange={handleLanguageChangeInternal}
        isTranslating={isTranslating}
        isAllExpanded={isAllExpanded}
        onToggleExpandAll={isAllExpanded ? collapseAll : expandAll}
        isCopied={isCopied}
        onCopyPath={onShare || handleShareLink}
        isSharing={propIsSharing || isSharing}
        isSaved={isSaved}
        onSave={onSaveMap}
        onOpenAiContent={() => setIsAiContentDialogOpen(true)}
        onOpenNestedMaps={() => setIsNestedMapsDialogOpen(true)}
        onOpenGallery={() => setIsGalleryOpen(true)}
        onDuplicate={handleDuplicate}
        isDuplicating={isDuplicating}
        onRegenerate={onRegenerate}
        onStartGlobalQuiz={() => onStartQuiz(data.topic)}
        canRegenerate={canRegenerate}
        nestedExpansionsCount={mergedExpansions.length}
        imagesCount={generatedImages.length}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onPublish={handlePublish}
        isPublishing={isPublishing}
        isPublic={!!data.isPublic}
        isCompare={data.mode === 'compare'}
        onOpenSummary={handleOpenSummary}
        isSummarizing={isSummarizing}
        status={status}
        isRegenerating={isRegenerating}
        useFileAware={useFileAware}
        onToggleFileAware={onToggleFileAware}
        hasSourceFile={!!data.sourceFileContent}
        onViewSource={onViewSource}
        onOpenPinnedMessages={onOpenPinnedMessages}
        pinnedMessagesCount={pinnedMessagesCount}
        isSynthesisMode={isSynthesisMode}
        onToggleSynthesis={handleToggleSynthesis}
      />

      <div className={cn(
        "w-full mx-auto px-4 space-y-12 pt-12",
        data.mode === 'compare' ? "max-w-[1600px]" : "max-w-6xl"
      )}>
        {data.mode === 'compare' ? (
          <CompareView
            data={data}
            onExplainNode={handleCompareExplainNode}
            onGenerateNewMap={onGenerateNewMap}
            onExplainInChat={onExplainInChat}
            onSubCategoryClick={handleCompareSubCategoryClick}
            onOpenMap={onOpenNestedMap}
            onGenerateImage={handleGenerateImageClick}
            generatingNode={generatingNode}
            nestedExpansions={nestedExpansions}
            isGlobalBusy={status !== 'idle'}
            onStartDebate={handleStartDebate}
            onGenerateHybrid={handleGenerateHybrid}
            onStartContrastQuiz={handleStartContrastQuiz}
            onDrillDown={handleDimensionDrillDown}
            onShowTimeline={handleShowTimeline}
            onStartQuiz={onStartQuiz}
          />
        ) : viewMode === 'accordion' ? (
          <>
            <TopicHeader
              mindMap={data}
              mindMapStack={mindMapStack}
              activeStackIndex={activeStackIndex}
              onStackSelect={onStackSelect as any}
              showBadge={true}
              badgeText="Focused Intelligence"
              persona={aiPersona}
              depth={data.depth}
              rootMap={rootMap}
              allSubMaps={allSubMaps}
            />

            {(!data.subTopics || data.subTopics.length === 0) ? (
              <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
                <ZapOff className="h-12 w-12 text-zinc-700" />
                <h3 className="text-xl font-bold text-zinc-400">No Content Found</h3>
                <p className="text-sm text-zinc-600 max-w-xs">
                  The AI didn&apos;t return a structured map for this topic. Try a different topic or regenerate.
                </p>
              </div>
            ) : (
              <>
                <MindMapAccordion
                  mindMap={data}
                  openSubTopics={openSubTopics}
                  setOpenSubTopics={setOpenSubTopics}
                  openCategories={openCategories}
                  setOpenCategories={setOpenCategories}
                  onGenerateNewMap={onGenerateNewMap}
                  onSubCategoryClick={(subCategory) => {
                    const existingExpansion = mergedExpansions.find(
                      e => e.topic.toLowerCase().trim() === subCategory.name.toLowerCase().trim() &&
                           ((e as any).fullData?.parentMapId === data.id || (e as any).fullData?.parent_map_id === data.id || e.parentName === data.topic)
                    );
                    handleSubCategoryClick(subCategory);
                  }}
                  onGenerateImage={handleGenerateImageClick}
                  onExplainInChat={onExplainInChat}
                  nestedExpansions={mergedExpansions}
                  onOpenNestedMap={onOpenNestedMap}
                  generatingNode={expandingNodeId}
                  mainTopic={data.topic}
                  onExplainWithExample={handleExplainWithExample}
                  onStartQuiz={onStartQuiz}
                  status={status}
                  onPracticeClick={handleGeneratePracticeQuestions}
                  deepeningTags={deepeningTags}
                  isSynthesisMode={isSynthesisMode}
                  synthesisSelection={synthesisSelection}
                  onToggleNodeSelection={handleToggleNodeSelection}
                />

                {/* Synthesis / Alchemy Controls Floating Panel - Shared for Accordion/Roadmap */}
                <AnimatePresence>
                  {isSynthesisMode && (viewMode === 'accordion' || viewMode === 'roadmap') && (
                    <div className="fixed bottom-12 right-12 z-50 pointer-events-none">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="pointer-events-auto p-4 rounded-3xl bg-zinc-900/90 border border-white/10 backdrop-blur-2xl shadow-2xl flex flex-col gap-4 min-w-[240px] ring-1 ring-amber-500/20"
                      >
                        <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">
                            <Zap className="w-4 h-4 animate-pulse" />
                          </div>
                          <div>
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Knowledge Alchemy</h4>
                            <p className="text-[9px] text-zinc-400">Select 2 concepts to fuse</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2 min-h-[40px]">
                            {synthesisSelection.length === 0 && (
                              <div className="flex flex-col gap-1 w-full py-2">
                                <div className="h-1.5 w-2/3 bg-white/5 rounded-full" />
                                <div className="h-1.5 w-1/2 bg-white/5 rounded-full" />
                              </div>
                            )}
                            {synthesisSelection.map(label => (
                              <Badge key={label} variant="secondary" className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px] font-bold px-2 py-1 rounded-lg">
                                {label}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <Button
                          disabled={synthesisSelection.length !== 2}
                          onClick={handleSynthesizeClick}
                          className="w-full h-10 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-black text-[11px] uppercase tracking-widest shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                        >
                          FUSE KNOWLEDGE
                        </Button>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </>
            )}
          </>
        ) : (
          // Map Mode - Full Screen Portal (NO CONTAINER)
          mountNode && createPortal(
            <div className="fixed inset-0 top-[72px] z-40 bg-black animate-in fade-in duration-300">
              <MindMapTreeView
                data={data}
                onNodeClick={handleRadialNodeClick}
                onGenerateNewMap={handleRadialGenerateNewMap}
                generatingNode={generatingNode}
                onExplainInChat={onExplainInChat}
                onExplainWithExample={handleRadialExplainWithExample}
                onStartQuiz={onStartQuiz}
                onPracticeClick={handleGeneratePracticeQuestions}
                onGenerateImage={handleRadialGenerateImage}
                focusedNodeName={focusedNodeName}
                resonanceNodes={resonanceNodes}
                onSynthesize={onSynthesize}
                isSynthesisMode={isSynthesisMode}
                setIsSynthesisMode={setIsSynthesisMode}
                synthesisSelection={synthesisSelection}
                setSynthesisSelection={setSynthesisSelection}
              />
            </div>,
            mountNode
          )
        )}
      </div>

      {/* Dialogs */}
      <ExplanationDialog
        isOpen={isExplanationDialogOpen}
        onClose={() => setIsExplanationDialogOpen(false)}
        title={activeSubCategory?.name || ''}
        content={explanationDialogContent}
        isLoading={isExplanationLoading}
        isContentRefreshing={isExplanationRefreshing}
        onExplainInChat={onExplainInChat}
        explanationMode={explanationMode}
        onExplanationModeChange={isExplanationInitialSelection ? handleInitialLevelSelect : setExplanationMode}
        showInitialSelection={isExplanationInitialSelection}
        availableModes={availableModes}
        isGlobalBusy={status !== 'idle'}
        enrichment={activeSubCategory ? {
          ...(enrichments[activeSubCategory.name] || {}),
          microQuiz: currentMicroQuiz || enrichments[activeSubCategory.name]?.microQuiz || null
        } : null}
        isEnrichmentLoading={isEnrichmentLoading && !!(activeSubCategory && !enrichments[activeSubCategory.name])}
        confidenceRating={activeSubCategory ? (confidenceRatings[activeSubCategory.name] || null) : null}
        onConfidenceChange={(level) => {
          if (!activeSubCategory) return;
          const key = activeSubCategory.name;
          setConfidenceRatings(prev => ({ ...prev, [key]: level }));
          awardXP('CONFIDENCE_RATED', { node: key, level }).catch((err) => console.error("[XP] Failed:", err));
        }}
        quizAnswer={activeSubCategory ? (quizAnswers[activeSubCategory.name] || null) : null}
        onQuizAnswer={(answer) => {
          if (!activeSubCategory) return;
          setQuizAnswers(prev => ({ ...prev, [activeSubCategory.name]: answer }));
        }}
        onGenerateSubMap={(topic) => onGenerateNewMap(topic, activeSubCategory?.name, `${data.topic} > ${activeSubCategory?.name}`, 'background')}
        onRegenerateQuiz={async () => {
          if (!activeSubCategory) return;
          const { regenerateMicroQuiz } = await import('@/ai/flows/regenerate-micro-quiz');
          const newQuiz = await regenerateMicroQuiz(
            activeSubCategory.name,
            activeSubCategory.description,
            data.topic,
            providerOptions.apiKey
          );
          setCurrentMicroQuiz(newQuiz);
        }}
      />


      <AiContentDialog
        isOpen={isAiContentDialogOpen}
        onClose={() => setIsAiContentDialogOpen(false)}
        mindMap={data}
        isGlobalBusy={status !== 'idle'}
      />

      <SummaryDialog
        isOpen={isSummaryDialogOpen}
        onClose={() => setIsSummaryDialogOpen(false)}
        title={data.topic}
        summary={summaryContent}
        isLoading={isSummarizing}
        onReload={handleReloadSummary}
      />

      <ExampleDialog
        isOpen={isExampleDialogOpen}
        onClose={() => setIsExampleDialogOpen(false)}
        title={activeExplainableNode?.name || 'Example'}
        example={exampleContent}
        isLoading={isExampleLoading}
        explanationMode={explanationMode}
        onExplanationModeChange={setExplanationMode}
        isGlobalBusy={status !== 'idle'}
        onRegenerate={() => {
          if (activeExplainableNode) {
            setIsExampleLoading(true);
            setExampleContent('');
            setActiveExplainableNode({ ...activeExplainableNode });
          }
        }}
      />

      <ImageGalleryDialog
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        images={generatedImages}
        onDownload={handleDownloadImage}
        onRegenerate={(subCategory) => {
          handleGenerateImageClick({ name: subCategory.name, description: subCategory.description } as any);
        }}
        onDelete={handleDeleteImage}
      />



      <NestedMapsDialog
        isOpen={isNestedMapsDialogOpen}
        onClose={() => setIsNestedMapsDialogOpen(false)}
        expansions={mergedExpansions}
        rootMap={rootMap}
        currentMapId={(data as any).id}
        hierarchyLoading={!!hierarchyLoading}
        onDelete={(id) => {
          if (onDeleteNestedMap) {
            onDeleteNestedMap(id);
          } else {
            toast({ description: "Delete not persisted (Preview Mode)" });
          }
        }}
        onRegenerate={(parentName, id) => {
          if (onRegenerateNestedMap) {
            onRegenerateNestedMap(parentName, id);
          } else {
            toast({ description: `Regenerating ${parentName}... (Preview)` });
          }
        }}
        expandingId={null}
        onExplainInChat={onExplainInChat}
        mainTopic={data.topic}
        onOpenMap={(mapData, id) => {
          setIsNestedMapsDialogOpen(false);
          if (onOpenNestedMap) onOpenNestedMap(mapData, id);
        }}
        onExpandFurther={(name, desc, parentId) => {
          setIsNestedMapsDialogOpen(false);
          onGenerateNewMap(name, parentId, desc, 'background', undefined, parentId);
        }}
        isGlobalBusy={status !== 'idle'}
      />

      {isImageLabOpen && labNode && (
        <ImageGenerationDialog
          isOpen={isImageLabOpen}
          onClose={() => setIsImageLabOpen(false)}
          onGenerate={handleGenerateImageWithSettings}
          nodeName={labNode.name}
          nodeDescription={labNode.description}
          initialPrompt={`${labNode.name} in the context of "${data.topic}": ${labNode.description}`}
          onEnhancePrompt={handleEnhancePrompt}
          isEnhancing={isEnhancing}
        />
      )}

      <PracticeQuestionsDialog
        isOpen={isPracticeDialogOpen}
        onClose={() => setIsPracticeDialogOpen(false)}
        topic={practiceTopic}
        questions={practiceQuestions}
        isLoading={isPracticeLoading}
        onQuestionClick={(q) => {
          // Close dialog can be optional if we want to keep it open
          // But changing context to chat usually implies moving attention
          setIsPracticeDialogOpen(false);
          if (onPracticeQuestionClick) onPracticeQuestionClick(q);
        }}
        onRegenerate={() => handleGeneratePracticeQuestions(practiceTopic)}
      />
    </div>
  );
});

MindMap.displayName = 'MindMap';
