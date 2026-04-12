'use client';

import React, { useState, useEffect, memo, useRef, useMemo } from 'react';
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
  ExplanationMode
} from '@/types/mind-map';
import { categorizeMindMapAction, publishMindMapAction } from '@/app/actions/community';
import { MindMapStatus } from '@/hooks/use-mind-map-stack';
import { LeafNodeCard } from './mind-map/leaf-node-card';
import { useAIConfig } from '@/contexts/ai-config-context';
import { ExplanationDialog } from './mind-map/explanation-dialog';
import { SummaryDialog } from './summary-dialog';
import { MindMapToolbar } from './mind-map/mind-map-toolbar';
import { TopicHeader } from './mind-map/topic-header';
import { MindMapRadialView } from './mind-map/mind-map-radial-view';
import { cn } from '@/lib/utils';
import { MindMapAccordion } from './mind-map/mind-map-accordion';
import { CompareView } from './mind-map/compare-view';
import { BreadcrumbNavigation } from './breadcrumb-navigation';
import { NestedMapsDialog } from './nested-maps-dialog';
import { PracticeQuestionsDialog } from './practice-questions-dialog';
import { useToast } from '@/hooks/use-toast';
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
import { Badge } from './ui/badge';
import { toPascalCase } from '@/lib/utils';
import { toPlainObject } from '@/lib/serialize';
import { findMatchingCategory } from '@/lib/depth-analysis';

import { addDoc, collection, getDocs, query, where, serverTimestamp, doc, updateDoc, getDoc, deleteDoc, writeBatch, setDoc, limit } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { trackNestedExpansion, trackImageGenerated, trackMapCreated } from '@/lib/activity-tracker';




/**
 * Props for the main data component.
 */
interface MindMapProps {
  data: MindMapData;
  isExpanded?: boolean;
  isSaved: boolean;
  onSaveMap: () => void;
  onExplainInChat: (message: string) => void;
  onGenerateNewMap: (topic: string, parentTopic?: string, contextPath?: string, mode?: 'foreground' | 'background') => void;
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
  onUpdate?: (updatedData: Partial<MindMapData>) => void;
  status: MindMapStatus;
  aiHealth?: { name: string, status: string }[];
  hasUnsavedChanges?: boolean;
  onDeleteNestedMap?: (id: string) => void;
  onRegenerateNestedMap?: (topic: string, id: string) => void;
  onPracticeQuestionClick?: (question: string) => void;
  rootMap?: { id: string; topic: string; icon?: string } | null;
  allSubMaps?: NestedExpansionItem[];
  onShare?: () => void;
  isSharing?: boolean;
  useFileAware?: boolean;
  onToggleFileAware?: () => void;
  onOpenPinnedMessages?: () => void;
  pinnedMessagesCount?: number;
  onQuizDeepenRef?: React.MutableRefObject<((w: { tag: string; score: number }[], t: string) => void) | null>;
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
export const MindMap = ({
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
  onShare,
  isSharing: propIsSharing,
  useFileAware = false,
  onToggleFileAware,
  onViewSource,
  onOpenPinnedMessages,
  pinnedMessagesCount = 0,
  onQuizDeepenRef,
}: MindMapProps) => {
  const [viewMode, setViewMode] = useState<'accordion' | 'map' | 'roadmap'>('accordion');
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setMountNode(document.body);
  }, []);

  const mindMapRef = React.useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { toast } = useToast();
  const { user, firestore } = useFirebase();
  const { config, refreshBalance } = useAIConfig();
  const [activeTab, setActiveTab] = useState<'visual' | 'radial' | 'accordion' | 'compare'>('visual');
  const useSearch = true; // Always ON in background

  const providerOptions = useMemo(() => ({
    provider: config.provider,
    apiKey: config.provider === 'pollinations' ? config.pollinationsApiKey : config.apiKey,
    model: useSearch ? 'pollinations/gemini-search' : config.pollinationsModel,
    userId: user?.uid,
  }), [config.provider, config.apiKey, config.pollinationsApiKey, config.pollinationsModel, user?.uid, useSearch]);

  const imageProviderOptions = useMemo(() => ({
    provider: config.provider as 'pollinations',
    apiKey: config.provider === 'pollinations' ? config.pollinationsApiKey : config.apiKey,
    model: config.pollinationsModel,
    userId: user?.uid,
  }), [config.provider, config.apiKey, config.pollinationsApiKey, config.pollinationsModel, user?.uid]);






  // localMindMap state is removed. We use 'data' prop directly.
  const [isTranslating, setIsTranslating] = useState(false);

  const [isExplanationDialogOpen, setIsExplanationDialogOpen] = useState(false);
  const [explanationDialogContent, setExplanationDialogContent] = useState<
    string[]
  >([]);
  const [isExplanationLoading, setIsExplanationLoading] = useState(false);
  const [activeSubCategory, setActiveSubCategory] =
    useState<SubCategoryInfo | null>(null);

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

  const [nestedGeneratingImageId, setNestedGeneratingImageId] = useState<string | null>(null);
  const [thumbnailOverrides, setThumbnailOverrides] = useState<Record<string, string>>({});

  const [isExampleDialogOpen, setIsExampleDialogOpen] = useState(false);
  const [exampleContent, setExampleContent] = useState('');
  const [isExampleLoading, setIsExampleLoading] = useState(false);
  const [activeExplainableNode, setActiveExplainableNode] = useState<any>(null);

  const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false);
  const [summaryContent, setSummaryContent] = useState(data.summary || '');
  const [isSummarizing, setIsSummarizing] = useState(false);

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

  // Handle user-initiated changes (only trigger parent callback, don't create loop)
  const handleLanguageChangeInternal = (newLang: string) => {
    setLanguageUI(newLang);
    if (mounted) {
      handleLanguageChange(newLang);
    }
  };

  const handlePersonaChangeInternal = (newPersona: string) => {
    setPersonaUI(newPersona);
    if (mounted) {
      onAIPersonaChange(newPersona);
    }
  };

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

  // Advanced Image Generation for Nested Maps
  const [isNestedImageLabOpen, setIsNestedImageLabOpen] = useState(false);
  const [nestedLabNode, setNestedLabNode] = useState<NestedExpansionItem | null>(null);
  const [isEnhancingNested, setIsEnhancingNested] = useState(false);

  // Practice Mode State

  const [isPracticeDialogOpen, setIsPracticeDialogOpen] = useState(false);
  const [practiceQuestions, setPracticeQuestions] = useState<string[]>([]);
  const [isPracticeLoading, setIsPracticeLoading] = useState(false);
  const [practiceTopic, setPracticeTopic] = useState('');

  // #10 — Quiz-adaptive deepening state
  const [deepeningTags, setDeepeningTags] = useState<string[]>([]);


  // State for images and expansions is initialized from data prop
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>(data.savedImages || []);
  const [nestedExpansions, setNestedExpansions] = useState<NestedExpansionItem[]>(propNestedExpansions || data.nestedExpansions || []);
  const [explanations, setExplanations] = useState<Record<string, string[]>>(data.explanations || {});

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
      if (data.nestedExpansions) {
        const expansionsStr = JSON.stringify(data.nestedExpansions);
        if (expansionsStr !== lastSyncedExpansionsRef.current) {
          lastSyncedExpansionsRef.current = expansionsStr;
          setNestedExpansions(data.nestedExpansions);
        }
      }
      if (data.explanations) {
        const explanationsStr = JSON.stringify(data.explanations);
        if (explanationsStr !== lastSyncedExplanationsRef.current) {
          lastSyncedExplanationsRef.current = explanationsStr;
          setExplanations(data.explanations);
        }
      }
    }
  }, [data.savedImages, data.nestedExpansions, data.explanations]);

  // AUTO-SUMMARIZE when canvas content is fully loaded/generated
  useEffect(() => {
    const isReady = status === 'idle' && data && data.mode === 'single' && (data.subTopics?.length || 0) > 0;
    const isNewMap = !data.summary && !summaryContent && !isSummarizing;

    if (isReady && isNewMap) {
      console.log('✨ Auto-summarizing new topic canvas...');
      const triggerAutoSummary = async () => {
        setIsSummarizing(true);
        try {
          const { summary, error } = await summarizeTopicAction({
            mindMapData: toPlainObject(data)
          }, providerOptions);

          if (summary && !error) {
            setSummaryContent(summary);
            // Persist the summary back to Firestore
            if (onUpdate) onUpdate({ summary });
          }
        } catch (err) {
          console.error('Silent auto-summarization failed:', err);
        } finally {
          setIsSummarizing(false);
        }
      };

      triggerAutoSummary();
    }
  }, [status, data, summaryContent, isSummarizing, providerOptions, onUpdate]);

  const handleSaveMap = async () => {
    if (onSaveMap) onSaveMap();
  };

  const handleStartDebate = (topicA: string, topicB: string) => {
    const debatePrompt = `Let's have an "Intelligence Clash". Act as both ${topicA} and ${topicB}. Start a deep, analytical debate about your core philosophies, fundamental trade-offs, and real-world advantages. Challenge each other to prove which one offers a more optimal solution or superior experience in your respective domains.`;
    onExplainInChat(debatePrompt);
    toast({
      title: "Clash Arena Initiated",
      description: "Opening the debate floor in the chat panel...",
    });
  };

  const handleGenerateHybrid = () => {
    if (data.mode !== 'compare') return;
    const parts = data.topic.split(/\s+(?:vs\.?|versus)\s+/i);
    if (parts.length < 2) return;

    const hybridTopic = `A hybrid fusion of ${parts[0]} and ${parts[1]}`;
    onGenerateNewMap(hybridTopic, 'hybrid-root', 'hybrid-context');
    toast({
      title: "Synthetic Hybrid Generation",
      description: "Designing a new species of technology...",
    });
  };

  const handleStartContrastQuiz = () => {
    // Trigger the standard interactive quiz flow for the comparison topic
    onStartQuiz(data.topic);
    toast({
      title: "Contrast Quiz Ready",
      description: "Launching interactive 'Clash of Minds' quiz...",
    });
  };

  const handleDimensionDrillDown = (dimensionName: string) => {
    const detailTopic = `${dimensionName} in depth: ${data.topic.replace(/\s+(?:vs\.?|versus)\s+/i, ' and ')}`;
    // Open a new map for this dimension
    onGenerateNewMap(detailTopic, `drill-${dimensionName}`, `dimension-context`, 'background');
    toast({
      title: "Drilling Into Dimension",
      description: `Generating a deep-dive map for "${dimensionName}" in the background.`,
    });
  };

  const handleShowTimeline = () => {
    const parts = data.topic.split(/\s+(?:vs\.?|versus)\s+/i);
    const names = parts.length >= 2 ? `${parts[0]} vs ${parts[1]}` : data.topic;
    const timelineTopic = `Historical Timeline and Evolution of ${names}`;
    onGenerateNewMap(timelineTopic, 'timeline-root', 'history-context');
    toast({
      title: "Evolution Timeline Triggered",
      description: "Tracing the path through time...",
    });
  };


  const handleReloadSummary = async () => {
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
  };

  useEffect(() => {
    if (propNestedExpansions) {
      const nestedStr = JSON.stringify(propNestedExpansions);
      if (nestedStr !== lastSyncedExpansionsRef.current) {
        lastSyncedExpansionsRef.current = nestedStr;
        setNestedExpansions(propNestedExpansions);
      }
    }
  }, [propNestedExpansions]);

  // Notify parent of updates
  const lastNotifiedRef = useRef<string>('');
  useEffect(() => {
    if (onUpdate) {
      const sanitizedExpansions = nestedExpansions.map(item => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { fullData, ...rest } = item;
        return rest;
      });

      const dataToNotify = toPlainObject({
        nestedExpansions: sanitizedExpansions,
        savedImages: generatedImages,
        explanations: explanations
      });

      // Check if this data is actually different from what we received in props
      const hasMeaningfulChanges =
        JSON.stringify(nestedExpansions) !== JSON.stringify(propNestedExpansions || data.nestedExpansions || []) ||
        JSON.stringify(generatedImages) !== JSON.stringify(data.savedImages || []) ||
        JSON.stringify(explanations) !== JSON.stringify(data.explanations || {});

      if (!hasMeaningfulChanges) return;

      const stringified = JSON.stringify(dataToNotify);
      if (stringified !== lastNotifiedRef.current) {
        lastNotifiedRef.current = stringified;
        onUpdate(dataToNotify);
      }
    }
  }, [generatedImages, nestedExpansions, explanations, onUpdate, data.nestedExpansions, data.savedImages, data.explanations, propNestedExpansions]);



  // Internal auto-saves removed. 
  // All persistence is now handled by the parent component via onUpdate and its debounced auto-save.


  const handleDownloadImage = (url: string, name: string) => {
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
  };


  const handleLanguageChange = async (langCode: string) => {
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
      }
    } catch (err: any) {
      console.error("Translation error:", err);
      setLanguageUI(selectedLanguage);
    } finally {
      setIsTranslating(false);
    }
  };

  const fetchExplanation = async () => {
    if (!activeSubCategory) return;

    // Cache Key: unique combo of category name and persona/mode
    // We append explanationMode to keys to differentiate 'Simple' vs 'Expert' explanations for the same node
    const cacheKey = `${activeSubCategory.name}-${explanationMode}`;

    // 1. Check Cache
    if (explanations[cacheKey]) {
      console.log(`⚡ Using cached explanation for ${cacheKey}`);
      setExplanationDialogContent(explanations[cacheKey]);
      return;
    }

    setIsExplanationLoading(true);
    const { explanation, error } = await explainNodeAction({
      subCategoryName: activeSubCategory!.name,
      mainTopic: data.topic,
      explanationMode: explanationMode,
      targetLanguage: selectedLanguage,
      usePdfContext: useFileAware,
      pdfContext: (data as any).pdfContext ? JSON.stringify((data as any).pdfContext) : undefined
    }, providerOptions);

    // Refresh balance after AI operation
    refreshBalance();

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Explanation Failed',
        description: error,
      });
    } else if (explanation) {
      setExplanationDialogContent(explanation.explanationPoints);

      // 2. Save to State (triggers auto-save)
      setExplanations(prev => ({
        ...prev,
        [cacheKey]: explanation.explanationPoints
      }));
    }
    setIsExplanationLoading(false);
  };

  useEffect(() => {
    if (activeSubCategory && isExplanationDialogOpen && !isExplanationInitialSelection) {
      fetchExplanation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeExplainableNode, explanationMode, isExampleDialogOpen]);


  const handleGeneratePracticeQuestions = async (topic: string) => {
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
  };



  // #10 — Quiz-adaptive deepening: generate + merge nodes for weak sections
  const handleQuizDeepen = React.useCallback(async (
    weakSections: { tag: string; score: number }[],
    quizTopic: string
  ) => {
    if (data.mode !== 'single' || !onUpdate) return;
    const { generateQuizDepthNodesAction } = await import('@/app/actions');

    // Start shimmer on matched branches
    setDeepeningTags(weakSections.map(s => s.tag));

    for (const section of weakSections) {
      // Find the best matching category using the 4-level matcher
      const match = findMatchingCategory(section.tag, data.subTopics);
      const targetCat = data.subTopics[match.subTopicIndex]?.categories[match.categoryIndex];
      const existingNodes = targetCat?.subCategories.map(sc => sc.name) ?? [];

      const { data: newNodes, error } = await generateQuizDepthNodesAction({
        mainTopic: quizTopic,
        sectionName: section.tag,
        existingNodes,
        quizScore: section.score,
        persona: aiPersona,
      }, providerOptions);

      if (error || !newNodes || newNodes.length === 0) {
        console.warn(`Quiz deepen failed for "${section.tag}":`, error);
        continue;
      }

      // Append-only merge — deduplicate by name
      const updatedSubTopics = data.subTopics.map((st, si) => ({
        ...st,
        categories: st.categories.map((cat, ci) => {
          if (si !== match.subTopicIndex || ci !== match.categoryIndex) return cat;
          const existingNames = new Set(cat.subCategories.map(sc => sc.name));
          const dedupedNew = newNodes.filter(n => !existingNames.has(n.name));
          return { ...cat, subCategories: [...cat.subCategories, ...dedupedNew] };
        })
      }));

      onUpdate({ subTopics: updatedSubTopics });

      // Auto-open the matched SubTopic + Category so user sees the new nodes
      const subTopicId = `topic-${match.subTopicIndex}`;
      const catId = `cat-${match.subTopicIndex}-${match.categoryIndex}`;
      setOpenSubTopics(prev => prev.includes(subTopicId) ? prev : [...prev, subTopicId]);
      setOpenCategories(prev => prev.includes(catId) ? prev : [...prev, catId]);

      toast({
        title: '🎯 Quiz Insights Added',
        description: `${newNodes.length} new nodes added to "${targetCat?.name ?? section.tag}" (score: ${section.score}%)`,
        duration: 5000,
      });
    }

    setDeepeningTags([]);
  }, [data, aiPersona, providerOptions, onUpdate, toast]);

  // Wire handleQuizDeepen to the ref so canvas/chat-panel can call it
  useEffect(() => {
    if (onQuizDeepenRef) {
      onQuizDeepenRef.current = handleQuizDeepen;
    }
  }, [handleQuizDeepen, onQuizDeepenRef]);

  const handleSubCategoryClick = (subCategory: SubCategoryInfo) => {
    setActiveSubCategory(subCategory);
    setExplanationDialogContent([]);

    // Check if we have ANY explanation cached for this node
    const availableModes: ExplanationMode[] = ['Beginner', 'Intermediate', 'Expert'].filter(mode => {
      const key = `${subCategory.name}-${mode}`;
      return explanations[key] && explanations[key].length > 0;
    }) as ExplanationMode[];

    setAvailableModes(availableModes);

    if (availableModes.length > 0) {
      // If content exists, don't show initial selection
      setIsExplanationInitialSelection(false);

      // If current mode isn't available but others are, switch to an available one
      const currentModeAvailable = availableModes.includes(explanationMode);
      if (!currentModeAvailable) {
        setExplanationMode(availableModes[0]);
      } else {
        // Just trigger content loading from cache
        setExplanationDialogContent(explanations[`${subCategory.name}-${explanationMode}`]);
      }
    } else {
      // No cached data at all, show selection
      setIsExplanationInitialSelection(true);
    }

    setIsExplanationDialogOpen(true);
  };

  const handleInitialLevelSelect = (mode: ExplanationMode) => {
    setExplanationMode(mode);
    setIsExplanationInitialSelection(false);
    // The useEffect will catch the state change and trigger fetchExplanation()
  };

  const handleExplainWithExample = (node: ExplainableNode) => {
    setExampleContent('');
    setActiveExplainableNode(node);
    setIsExampleDialogOpen(true);
  };

  const handleGenerateImageClick = (subCategory: SubCategoryInfo) => {
    // Instead of immediately generating, open the "Visual Insight Lab"
    setLabNode(subCategory);
    setIsImageLabOpen(true);
  };

  const handleEnhancePrompt = async (prompt: string, style?: string, composition?: string, mood?: string, colorPalette?: string, lighting?: string) => {
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
  };

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
          userId: user?.uid,
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

      if (firestore && user) {
        try {
          const achievements = await trackImageGenerated(firestore, user.uid);
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

  const handleDeleteImage = (id: string) => {
    setGeneratedImages(prev => prev.filter(img => img.id !== id));
    toast({
      description: "Image removed from gallery.",
    });
  };





  const handleDuplicate = async () => {
    if (!data || isDuplicating) return;
    setIsDuplicating(true);

    try {
      if (!user) {
        throw new Error("You must be logged in to duplicate a mind map.");
      }

      // Create a new map object, excluding fields that shouldn't be copied
      const { id, parentMapId, isSubMap, createdAt: oldCreatedAt, updatedAt: oldUpdatedAt, ...cleanData } = data as any;

      const newMapData = {
        ...cleanData,
        userId: user.uid,
        nestedExpansions: [], // Start fresh
        savedImages: [], // Start fresh
      };

      // We essentially just "create new map" flow
      // But simpler: just tell parent we want to save this as a new map?
      // Actually, since this is "Duplicate", we should probably just save it directly to the user's collection

      const docRef = await addDoc(collection(firestore!, 'users', user.uid, 'mindmaps'), {
        ...newMapData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "Mind Map Duplicated",
        description: "A copy has been saved to your dashboard.",
      });

      // Redirect to the new map?
      router.push(`/data?id=${docRef.id}`);

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Duplicate Failed",
        description: error.message || "Could not duplicate mind map.",
      });
    } finally {
      setIsDuplicating(false);
    }
  };

  const copyLinkToClipboard = (id: string, isPublicOrShared: boolean) => {
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
  };


  const handleShareLink = async () => {
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

    if (!user || !firestore) {
      // Fallback for non-logged in users (shouldn't happen for saved maps usually)
      copyLinkToClipboard(effectiveId, false);
      return;
    }

    setIsSharing(true);
    try {
      // 1. Create shared entry (Unlisted)
      const shareId = `share_${effectiveId}`;
      const sharedData = {
        ...toPlainObject(data),
        id: shareId,
        isShared: true, // Mark as shared
        isPublic: false, // Explicitly not public in community
        sharedAt: serverTimestamp(),
        originalAuthorId: user.uid,
        authorName: user.displayName || 'Explorer'
      };

      // Save to 'sharedMindmaps' collection
      await setDoc(doc(firestore, 'sharedMindmaps', shareId), sharedData);

      // 2. Update user doc to reflect shared status
      await updateDoc(doc(firestore, 'users', user.uid, 'mindmaps', effectiveId), {
        isShared: true
      });

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
  };

  const expandAll = () => {
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
  };

  const collapseAll = () => {
    setOpenSubTopics([]);
    setOpenCategories([]);
    setIsAllExpanded(false);
  };

  const handlePublish = async () => {
    if (!user || !firestore || isPublishing) return;

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
      const targetUid = data.userId || data.uid || user.uid;
      
      // Fix: Prioritize original author name from data, fallback to current user ONLY if it's their own map
      const authorName = data.authorName || 
                         (targetUid !== user.uid ? 'Explorer' : (user.displayName || 'Anonymous'));
      
      const publicData: any = {
        ...toPlainObject(data),
        isPublic: true,
        publicCategories: categories,
        originalMapId: data.id,
        originalAuthorId: targetUid,
        authorName: authorName,
        authorAvatar: data.authorAvatar || (targetUid === user.uid ? (user.photoURL || '') : ''),
        views: 0,
      };

      // 4. Save via Server Action (handles Admin bypass)
      const { success, error: publishError } = await publishMindMapAction(data.id!, publicData, user.uid);

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
  };

  const handleOpenSummary = async () => {
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
  };

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
        nestedExpansionsCount={(allSubMaps?.length || 0)}
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
        useSearch={true}
        useFileAware={useFileAware}
        onToggleFileAware={onToggleFileAware}
        hasSourceFile={!!data.sourceFileContent}
        onViewSource={onViewSource}
        onOpenPinnedMessages={onOpenPinnedMessages}
        pinnedMessagesCount={pinnedMessagesCount}
      />

      <div className="container max-w-6xl mx-auto px-4 space-y-12 pt-12">
        {data.mode === 'compare' ? (
          <CompareView
            data={data}
            onExplainNode={(node) => onExplainInChat(`Explain "${node.title}" in the context of the comparison of ${data.topic}.`)}
            onGenerateNewMap={onGenerateNewMap}
            onExplainInChat={onExplainInChat}
            onSubCategoryClick={(node) => handleSubCategoryClick({ name: node.title, description: node.description || '' })}
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
                  The AI didn't return a structured map for this topic. Try a different topic or regenerate.
                </p>
              </div>
            ) : (
              <MindMapAccordion
                mindMap={data}
                openSubTopics={openSubTopics}
                setOpenSubTopics={setOpenSubTopics}
                openCategories={openCategories}
                setOpenCategories={setOpenCategories}
                onGenerateNewMap={onGenerateNewMap}
                handleSubCategoryClick={handleSubCategoryClick}
                handleGenerateImageClick={handleGenerateImageClick}
                onExplainInChat={onExplainInChat}
                nestedExpansions={nestedExpansions}
                onOpenNestedMap={onOpenNestedMap}
                generatingNode={generatingNode}
                mainTopic={data.topic}
                onExplainWithExample={handleExplainWithExample}
                onStartQuiz={onStartQuiz}
                status={status}
                onPracticeClick={handleGeneratePracticeQuestions}
                deepeningTags={deepeningTags}
              />
            )}
          </>
        ) : (
          // Map Mode - Full Screen Portal (NO CONTAINER)
          mountNode && createPortal(
            <div className="fixed inset-0 top-[72px] z-40 bg-black animate-in fade-in duration-300">
              <MindMapRadialView
                data={data}
                onNodeClick={(node) => {
                  if (node.type === 'subcategory') handleSubCategoryClick(node);
                }}
                onGenerateNewMap={(topic, id) => {
                  onGenerateNewMap(topic, id || '', `${data.topic} > ${topic}`, 'background');
                }}
                generatingNode={generatingNode}
                onExplainInChat={onExplainInChat}
                onExplainWithExample={(topic) => handleExplainWithExample({ name: topic, type: 'subTopic' })}
                onStartQuiz={onStartQuiz}
                onPracticeClick={handleGeneratePracticeQuestions}
                onGenerateImage={(topic) => handleGenerateImageClick({ name: topic, description: '' })}
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
        onExplainInChat={onExplainInChat}
        explanationMode={explanationMode}
        onExplanationModeChange={isExplanationInitialSelection ? handleInitialLevelSelect : setExplanationMode}
        showInitialSelection={isExplanationInitialSelection}
        availableModes={availableModes}
        isGlobalBusy={status !== 'idle'}
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
        expansions={(allSubMaps || nestedExpansions || []).map(item => ({
          ...item,
          thumbnailUrl: thumbnailOverrides[item.id] || (item.fullData as any)?.thumbnailUrl || (item as any).thumbnailUrl,
          path: item.path || ''
        }))}
        rootMap={rootMap}
        currentMapId={(data as any).id}
        onDelete={(id) => {
          if (onDeleteNestedMap) {
            onDeleteNestedMap(id);
          } else {
            toast({ description: "Delete not persisted (Preview Mode)" });
          }
        }}
        onRegenerate={(parentName, id) => {
          // Find criteria from nested item if needed, but parentName (which is actually topic in dialog) is sufficient
          if (onRegenerateNestedMap) {
            onRegenerateNestedMap(parentName, id);
          } else {
            toast({ description: `Regenerating ${parentName}... (Preview)` });
          }
        }}
        expandingId={null}
        onExplainInChat={onExplainInChat}
        mainTopic={data.topic}
        onGenerateImage={(expansion) => {
          setNestedLabNode(expansion);
          setIsNestedImageLabOpen(true);
        }}
        onOpenMap={(mapData, id) => {
          setIsNestedMapsDialogOpen(false);
          if (onOpenNestedMap) onOpenNestedMap(mapData, id);
        }}
        onExpandFurther={(name, desc, parentId) => {
          setIsNestedMapsDialogOpen(false);
          onGenerateNewMap(name, desc, parentId);
        }}
        isGlobalBusy={status !== 'idle'}
        generatingImageId={nestedGeneratingImageId}
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

      {/* Visual Insight Lab for Nested Maps */}
      {isNestedImageLabOpen && nestedLabNode && (
        <ImageGenerationDialog
          isOpen={isNestedImageLabOpen}
          onClose={() => {
            setIsNestedImageLabOpen(false);
            setNestedLabNode(null);
          }}
          onGenerate={async (settings) => {
            setNestedGeneratingImageId(nestedLabNode.id);
            toast({
              title: 'Generating Thumbnail...',
              description: `Creating thumbnail for ${nestedLabNode.topic}`,
            });

            try {
              console.log(`🎨 Generating nested thumbnail using client key: ${config.pollinationsApiKey ? 'Yes' : 'No'}`);

              const response = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  prompt: settings.enhancedPrompt || settings.initialPrompt,
                  model: settings.model || 'flux',
                  width: settings.width || 512,
                  height: settings.height || 288,
                  userId: user?.uid,
                  userApiKey: config.pollinationsApiKey
                })
              });

              if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Image generation failed');
              }

              const imageData = await response.json();

              // Refresh global pollen balance after successful generation
              await refreshBalance();

              // Update LOCAL nestedExpansions state
              setNestedExpansions((prev: any[]) => prev.map(exp =>
                exp.id === nestedLabNode.id
                  ? ({ ...exp, fullData: exp.fullData ? { ...exp.fullData, thumbnailUrl: imageData.imageUrl } : undefined } as any)
                  : exp
              ));

              // Immediate UI feedback via overrides
              if (nestedLabNode.id) {
                setThumbnailOverrides(prev => ({
                  ...prev,
                  [nestedLabNode.id]: imageData.imageUrl
                }));
              }

              // If allSubMaps is being used by the dialog, we need to ensure it's also updated locally
              // Since allSubMaps is a prop, we can't update it directly, BUT we can update the Firestore doc
              // and let the parent re-fetch, OR manage a local override map in MindMap.
              toast({
                title: 'Thumbnail Generated!',
                description: `Successfully created thumbnail for ${nestedLabNode.topic}`,
              });

              // Persist the new thumbnail URL to Firestore
              if (user && firestore && nestedLabNode.id) {
                try {
                  const docRef = doc(firestore, 'users', user.uid, 'mindmaps', nestedLabNode.id);
                  await updateDoc(docRef, { thumbnailUrl: imageData.imageUrl });
                } catch (dbError) {
                  console.error('Failed to save nested map thumbnail to db:', dbError);
                }
              }
            } catch (err: any) {
              toast({
                variant: 'destructive',
                title: 'Generation Failed',
                description: err.message || 'Failed to generate thumbnail.',
              });
            } finally {
              setNestedGeneratingImageId(null);
            }
          }}
          nodeName={nestedLabNode.topic}
          nodeDescription={`Updating thumbnail for ${nestedLabNode.topic}`}
          initialPrompt={`${nestedLabNode.topic}, concept visualization, abstract representation, professional illustration, clean design, high quality`}
          onEnhancePrompt={async (prompt, style, composition, mood, colorPalette, lighting) => {
            setIsEnhancingNested(true);
            try {
              const { enhancedPrompt, error } = await enhanceImagePromptAction({
                prompt,
                style,
                composition,
                mood,
                colorPalette,
                lighting
              }, providerOptions);
              if (error) throw new Error(error);
              return enhancedPrompt?.enhancedPrompt || prompt;
            } catch (err: any) {
              toast({ variant: 'destructive', title: 'Enhancement failed', description: err.message });
              return prompt;
            } finally {
              setIsEnhancingNested(false);
            }
          }}
          isEnhancing={isEnhancingNested}
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
};
