
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { LogIn, Search, Share2, Trash2, Eye, Loader2, Clock, Rocket, Info, ExternalLink, Download, ChevronRight, Sparkles, Copy, Check, Database, Plus, LayoutGrid, Globe, BarChart3, Binary, Layers, Image as ImageIcon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { GenerateMindMapOutput } from '@/ai/flows/generate-mind-map';
import { generateMindMapAction } from '@/app/actions';
import { Icons } from '@/components/icons';
import { useUser, useFirestore, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, deleteDoc, getDoc, updateDoc, setDoc, addDoc, serverTimestamp, Timestamp, query, where, orderBy, limit } from 'firebase/firestore';
import { MindMapData } from '@/types/mind-map';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { formatShortDistanceToNow } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { useNotifications } from '@/contexts/notification-context';
import { useAIConfig } from '@/contexts/ai-config-context';
import { categorizeMindMapAction, suggestRelatedTopicsAction } from '@/app/actions/community';
import { enhanceImagePromptAction } from '@/app/actions';
import { RefreshCw, Zap, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { jsPDF } from 'jspdf';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DepthBadge } from '@/components/mind-map/depth-badge';
import { SourceBadge } from '@/components/mind-map/source-badge';
import { ModeBadge } from '@/components/mind-map/mode-badge';
import { ImageGenerationDialog, ImageSettings } from '@/components/mind-map/image-generation-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useMindMapPersistence } from '@/hooks/use-mind-map-persistence';
import { sanitizeFirestoreData } from '@/lib/sanitize-firestore';

// ── Shared thumbnail prompt engine (mirrors use-mind-map-persistence.ts) ──
function buildThumbnailPrompt(topic: string): string {
  const t = topic.toLowerCase();
  if (/\b(einstein|newton|tesla|darwin|freud|curie|hawking|turing|jobs|gates|musk|gandhi|lincoln|napoleon|aristotle|plato|socrates|shakespeare|beethoven|picasso|van gogh|obama|zuckerberg|lovelace|feynman|galileo|torvalds)\b/i.test(t) ||
      /\b(scientist|mathematician|philosopher|artist|founder|engineer|architect|designer|leader|inventor)\b/i.test(t)) {
    return `Dramatic cinematic portrait photograph of ${topic}, professional studio lighting with deep shadows, shallow depth of field, photorealistic, 8k resolution, film grain, rich tonal contrast, dark moody background, sharp facial detail`;
  }
  if (/\b(ai|machine learning|deep learning|neural|algorithm|programming|software|code|data|cloud|blockchain|crypto|quantum|computing|database|api|framework|javascript|python|react|typescript|linux|cybersecurity|devops)\b/i.test(t)) {
    return `Futuristic digital visualization of ${topic}, glowing circuit patterns and data streams, deep space dark background, electric blue and violet neon accents, holographic interface elements, cinematic depth of field, ultra-detailed 3D render, 8k quality, no text`;
  }
  if (/\b(physics|chemistry|biology|astronomy|neuroscience|genetics|evolution|thermodynamics|relativity|cosmology|ecology|geology|mathematics|calculus|biochemistry|molecular|astrophysics)\b/i.test(t)) {
    return `Scientific visualization of ${topic}, photorealistic macro or cosmic scale imagery, dramatic studio lighting, rich color gradients from deep blue to gold, ultra-sharp detail, cinematic composition, professional science photography, 8k resolution, no text`;
  }
  if (/\b(philosophy|consciousness|ethics|metaphysics|epistemology|existentialism|psychology|sociology|economics|politics|history|culture|religion|spirituality|mindfulness|creativity|innovation|strategy|leadership|productivity)\b/i.test(t)) {
    return `Abstract conceptual art representing ${topic}, flowing geometric shapes and light particles, deep dark background with rich purple and indigo gradients, ethereal atmospheric glow, cinematic composition, digital art masterpiece, 8k quality, no text, no people`;
  }
  if (/\b(ocean|forest|mountain|space|universe|galaxy|planet|climate|weather|ecosystem|wildlife|animal|plant|flower|tree|water|fire|earth|wind|nature|environment)\b/i.test(t)) {
    return `Breathtaking cinematic nature photography of ${topic}, golden hour or dramatic storm lighting, ultra-sharp foreground detail with atmospheric depth, rich saturated colors, professional landscape photography, 8k resolution, award-winning composition`;
  }
  return `Cinematic conceptual illustration of ${topic}, dramatic studio lighting, dark premium background, rich purple and gold accent colors, ultra-detailed professional digital art, sharp focus, 8k quality, no text, no watermarks`;
}


function DashboardLoadingSkeleton() {
  return (
    <div className="container mx-auto p-4 sm:p-8">
      <div className="text-center mb-12">
        <Skeleton className="h-10 w-1/2 mx-auto mb-4" />
        <Skeleton className="h-5 w-3/4 mx-auto" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-2xl glassmorphism" />
        ))}
      </div>
    </div>
  );
}

type SavedMindMap = GenerateMindMapOutput & {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  summary: string;
  thumbnailUrl?: string;
  thumbnailPrompt?: string;
  isSubMap?: boolean;
};

type SortOption = 'recent' | 'alphabetical' | 'oldest';

function NotLoggedIn() {
  const router = useRouter();
  return (
    <div className="container mx-auto p-4 sm:p-8">
      <div className="text-center py-16 border-2 border-dashed rounded-lg">
        <LogIn className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">Please Log In</h3>
        <p className="mt-2 text-sm text-muted-foreground">You need to be logged in to view your saved mind maps.</p>
        <Button className="mt-6" onClick={() => router.push('/login')}>Log In</Button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { config, refreshBalance } = useAIConfig();
  const persistenceOptions = useMemo(() => ({
    userApiKey: config.pollinationsApiKey,
    preferredModel: config.pollinationsModel,
  }), [config.pollinationsApiKey, config.pollinationsModel]);

  const { saveMap: persistMindMap } = useMindMapPersistence(persistenceOptions);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('recent');
  const [mapToDelete, setMapToDelete] = useState<string | null>(null);
  const [deletingMapIds, setDeletingMapIds] = useState<Set<string>>(new Set());
  const [selectedMapForPreview, setSelectedMapForPreview] = useState<SavedMindMap | null>(null);
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
  const [isSuggestingTopics, setIsSuggestingTopics] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [isSuggestingQuestions, setIsSuggestingQuestions] = useState(false);
  const [isPublishingMapId, setIsPublishingMapId] = useState<string | null>(null);
  const [isUnpublishingMapId, setIsUnpublishingMapId] = useState<string | null>(null);
  const [previewMapPublishStatus, setPreviewMapPublishStatus] = useState<boolean | null>(null);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [isSharingMapId, setIsSharingMapId] = useState<string | null>(null);
  const [isCopiedMapId, setIsCopiedMapId] = useState<string | null>(null);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [isDownloadingFullData, setIsDownloadingFullData] = useState(false);
  const [selectedMapFullData, setSelectedMapFullData] = useState<MindMapData | null>(null);
  const [isFullDataLoading, setIsFullDataLoading] = useState(false);
  const [regeneratingMapIds, setRegeneratingMapIds] = useState<Set<string>>(new Set());
  const [imageErrorMapIds, setImageErrorMapIds] = useState<Set<string>>(new Set());
  const [isImageLabOpen, setIsImageLabOpen] = useState(false);
  const [mapForImageLab, setMapForImageLab] = useState<SavedMindMap | null>(null);
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);

  // Recommendation Action State
  const [showChoiceDialog, setShowChoiceDialog] = useState(false);
  const [selectedIdeaForAction, setSelectedIdeaForAction] = useState<string | null>(null);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [hasUnseenUpdates, setHasUnseenUpdates] = useState(false);
  const { addNotification, updateNotification } = useNotifications();

  // Version Control & Changelog Auto-Popup (v1.6.5)
  const CURRENT_VERSION = '1.6.5';

  useEffect(() => {
    const lastViewed = localStorage.getItem('mindscape_viewed_version');
    if (lastViewed !== CURRENT_VERSION) {
      setHasUnseenUpdates(true);
      // Short delay to allow dashboard to settle before popping up
      const timer = setTimeout(() => {
        setIsChangelogOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleCloseChangelog = () => {
    setIsChangelogOpen(false);
    setHasUnseenUpdates(false);
    localStorage.setItem('mindscape_viewed_version', CURRENT_VERSION);
  };

  // Fetch dynamic suggestions and full data when previewing
  useEffect(() => {
    let isMounted = true;
    if (selectedMapForPreview) {
      setSuggestedTopics([]);
      setIsSuggestingTopics(true);
      setSelectedMapFullData(null);
      setIsFullDataLoading(true);

      // Fetch dynamic topics
      suggestRelatedTopicsAction({
        topic: selectedMapForPreview.topic,
        summary: selectedMapForPreview.summary
      }, {
        provider: config.provider,
        apiKey: config.provider === 'pollinations' ? config.pollinationsApiKey : config.apiKey,
        userId: user?.uid
      }).then(res => {
        if (isMounted && res.topics) setSuggestedTopics(res.topics);
        if (isMounted) {
          setIsSuggestingTopics(false);
          refreshBalance();
        }
      }).catch(() => {
        if (isMounted) setIsSuggestingTopics(false);
      });

      // Fetch dynamic questions
      setSuggestedQuestions([]);
      setIsSuggestingQuestions(true);
      import('@/app/actions').then(({ generateRelatedQuestionsAction }) => {
        generateRelatedQuestionsAction({
          topic: selectedMapForPreview.topic,
          pdfContext: selectedMapForPreview.summary // Use summary as context for questions
        }, {
          provider: config.provider,
          apiKey: config.provider === 'pollinations' ? config.pollinationsApiKey : config.apiKey,
          userId: user?.uid
        }).then(res => {
          if (isMounted && res.data?.questions) setSuggestedQuestions(res.data.questions.slice(0, 3));
          if (isMounted) {
            setIsSuggestingQuestions(false);
            refreshBalance();
          }
        }).catch(() => {
          if (isMounted) setIsSuggestingQuestions(false);
        });
      });

      // Fetch full content for Data Pack
      if (user && firestore) {
        const contentRef = doc(firestore, 'users', user.uid, 'mindmaps', selectedMapForPreview.id, 'content', 'tree');
        getDoc(contentRef).then(snap => {
          if (isMounted && snap.exists()) {
            // Merge metadata (containing mode) with content data
            setSelectedMapFullData({
              ...selectedMapForPreview,
              ...snap.data()
            } as any);
          }
          if (isMounted) setIsFullDataLoading(false);
        }).catch(err => {
          console.error("Error fetching full data:", err);
          if (isMounted) setIsFullDataLoading(false);
        });
      } else {
        setIsFullDataLoading(false);
      }
    }
    return () => { isMounted = false; };
  }, [selectedMapForPreview, user, firestore]);

  // Calculate detailed stats for the previewed map
  const previewStats = useMemo(() => {
    if (!selectedMapFullData) return { totalNodes: 0, concepts: 0 };

    let totalNodes = 1; // Root
    let concepts = 0;

    const countNodesRecursive = (items: any[]): number => {
      let count = 0;
      items.forEach(item => {
        count++;
        if (item.categories) count += countNodesRecursive(item.categories);
        if (item.subCategories) count += countNodesRecursive(item.subCategories);
      });
      return count;
    };

    const isMultiMode = (selectedMapFullData.mode as any) === 'multi' || 
                       (selectedMapFullData as any).sourceFileType === 'multi' ||
                       (selectedMapFullData as any).sourceType === 'multi' ||
                       (selectedMapFullData as any).sourceFileContent?.includes('--- SOURCE:');

    if (isMultiMode || (selectedMapFullData as any).mode === 'single') {
      const subTopics = (selectedMapFullData as any).subTopics || [];
      concepts = subTopics.length;
      totalNodes += countNodesRecursive(subTopics);
    } else if (selectedMapFullData.mode === 'compare' || (selectedMapFullData as any).compareData) {
      const cd = (selectedMapFullData as any).compareData;
      if (cd) {
        totalNodes = 1; // root
        const simCount = cd.similarities?.length || 0;
        const diffACount = cd.differences?.topicA?.length || 0;
        const diffBCount = cd.differences?.topicB?.length || 0;

        concepts = simCount + diffACount + diffBCount;
        totalNodes += concepts;
        totalNodes += (cd.relevantLinks?.length || 0);
        totalNodes += (cd.topicADeepDive?.length || 0);
        totalNodes += (cd.topicBDeepDive?.length || 0);
      }
    }

    return { totalNodes, concepts };
  }, [selectedMapFullData]);

  // Helper function to convert Firestore Timestamps to plain Date objects
  const sanitizeMapForState = (map: SavedMindMap): SavedMindMap => {
    return sanitizeFirestoreData(map);
  };

  const handleDownloadFullData = async (map: SavedMindMap) => {
    if (!selectedMapFullData) {
      toast({ variant: "destructive", title: "Data Error", description: "Full mind map content is not yet aavailable. Please wait a moment." });
      return;
    }

    setIsDownloadingFullData(true);
    try {
      const doc = new jsPDF();
      let y = 20;

      // Title - Centered and All Caps
      const topicUpper = (map.topic || 'UNTITLED').toUpperCase();
      doc.setFontSize(24);
      doc.setTextColor(124, 58, 237); // Purple
      doc.setFont("helvetica", "bold");

      const pageWidth = doc.internal.pageSize.getWidth();
      const titleLines = doc.splitTextToSize(topicUpper, 160);
      titleLines.forEach((line: string, index: number) => {
        doc.text(line, pageWidth / 2, y + (index * 10), { align: 'center' });
      });
      y += (titleLines.length * 10) + 15;

      // Detailed Content
      doc.setFontSize(18);
      doc.setTextColor(0);
      doc.text("Detailed Knowledge Structure", 20, y);
      y += 10;

      if (selectedMapFullData.mode === 'compare') {
        const cd = selectedMapFullData.compareData;

        // Unity Nexus (Shared)
        doc.setFontSize(14);
        doc.setTextColor(16, 185, 129); // Emerald
        doc.text("Unity Nexus (Shared Core Concepts)", 20, y);
        y += 8;
        (cd.unityNexus || []).forEach((node: any) => {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.setFontSize(11);
          doc.setTextColor(0);
          doc.setFont("helvetica", "bold");
          doc.text(`• ${node.title}`, 20, y);
          y += 5;
          doc.setFont("helvetica", "normal");
          doc.setTextColor(80);
          const desc = doc.splitTextToSize(node.description || "", 160);
          doc.text(desc, 25, y);
          y += (desc.length * 5) + 8;
        });

        // Dimensions
        if (y > 250) { doc.addPage(); y = 20; }
        y += 10;
        doc.setFontSize(14);
        doc.setTextColor(124, 58, 237);
        doc.text("Comparison Dimensions", 20, y);
        y += 8;
        (cd.dimensions || []).forEach((dim: any) => {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.setFontSize(11);
          doc.setTextColor(0);
          doc.setFont("helvetica", "bold");
          doc.text(`- ${dim.name}`, 20, y);
          y += 5;
          doc.setFont("helvetica", "normal");
          doc.setTextColor(80);
          const desc = doc.splitTextToSize(`${dim.topicAInsight} | ${dim.topicBInsight}`, 160);
          doc.text(desc, 25, y);
          y += (desc.length * 5) + 6;
        });
      } else {
        selectedMapFullData.subTopics.forEach((st: any, i: number) => {
          if (y > 250) { doc.addPage(); y = 20; }
          doc.setFontSize(16);
          doc.setTextColor(124, 58, 237);
          doc.setFont("helvetica", "bold");
          doc.text(`${i + 1}. ${st.name}`, 20, y);
          y += 10;

          st.categories.forEach((cat: any) => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.setFontSize(13);
            doc.setTextColor(50);
            doc.setFont("helvetica", "bold");
            doc.text(cat.name, 25, y);
            y += 7;

            cat.subCategories.forEach((sc: any) => {
              if (y > 270) { doc.addPage(); y = 20; }
              doc.setFontSize(11);
              doc.setTextColor(0);
              doc.setFont("helvetica", "bold");
              doc.text(`• ${sc.name}`, 30, y);
              y += 5;
              doc.setFont("helvetica", "normal");
              doc.setTextColor(80);
              const desc = doc.splitTextToSize(sc.description || "", 150);
              doc.text(desc, 35, y);
              y += (desc.length * 5) + 6;
            });
            y += 4;
          });
          y += 10;
        });
      }

      const addHeaderFooter = (doc: any) => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);

          // Header - Cleaner look
          doc.setDrawColor(240);
          doc.line(20, 12, pageWidth - 20, 12);

          // Footer
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(150);
          doc.text(`MindScape Intelligence • mindscape-free.vercel.app`, 20, pageHeight - 10);

          // Clickable link overlay
          doc.link(20, pageHeight - 15, 80, 10, { url: 'https://mindscape-free.vercel.app/' });

          doc.text(`Page ${i} of ${pageCount}`, pageWidth - 40, pageHeight - 10);
        }
      };

      addHeaderFooter(doc);

      doc.save(`${map.topic.replace(/\s+/g, '_')}_Knowledge_Pack.pdf`);
      toast({ title: "Knowledge Pack Ready", description: "Detailed PDF has been downloaded." });
    } catch (err) {
      console.error("PDF Export Error:", err);
      toast({ variant: "destructive", title: "Export Failed", description: "Could not generate Knowledge Pack." });
    } finally {
      setIsDownloadingFullData(false);
    }
  };

  const handleRecommendationAction = async (mode: 'background' | 'immediate') => {
    if (!selectedMapForPreview || !selectedIdeaForAction) return;

    const topic = selectedIdeaForAction.includes(selectedMapForPreview.topic)
      ? selectedIdeaForAction
      : `${selectedIdeaForAction} of ${selectedMapForPreview.topic}`;

    setShowChoiceDialog(false);

    if (mode === 'background') {
      // BACKGROUND - Notification-based generation
      const notifId = addNotification({
        message: `Generating: ${topic}`,
        type: 'loading',
        details: 'Generating a fresh mind map for this topic in the background.'
      });

      toast({
        title: "Generation Started",
        description: `"${topic}" is being built in the background. Check notifications for progress.`,
      });

      try {
        const { data, error } = await generateMindMapAction({
          topic,
          depth: (selectedMapForPreview as any).depth || 'low'
        }, {
          provider: config.provider,
          apiKey: config.provider === 'pollinations' ? config.pollinationsApiKey : config.apiKey,
          userId: user?.uid,
        });

        if (error) throw new Error(error);

        // Refresh balance after AI operation
        refreshBalance();

        // Save using unified persistence (handles thumbnails, split schema, etc.)
        if (user && firestore && data) {
          const mindMapToSave = {
            ...data,
            isPublic: false,
            mode: 'single' as const,
            depth: data.depth || 'low'
          };

          const savedId = await persistMindMap(mindMapToSave as any, undefined, true);

          if (!savedId) throw new Error("Failed to save map properly.");

          updateNotification(notifId, {
            message: `Map Ready: ${data.shortTitle}`,
            type: 'success',
            details: `Generation complete! Click to open "${data.topic}".`,
            link: `/canvas?mapId=${savedId}`
          });

          toast({
            title: "Success",
            description: `"${data.shortTitle}" has been generated and saved.`,
          });
        }
      } catch (err: any) {
        updateNotification(notifId, {
          message: `Generation Failed`,
          type: 'error',
          details: err.message
        });
        toast({
          variant: "destructive",
          title: "Generation Failed",
          description: err.message,
        });
      }
    } else {
      // IMMEDIATE - Push to Canvas
      router.push(`/canvas?topic=${encodeURIComponent(topic)}&depth=${(selectedMapForPreview as any).depth || 'low'}`);
      toast({
        title: "Initializing...",
        description: `Redirecting to Canvas to create "${topic}".`,
      });
    }
  };

  const handleDownloadPDF = async (map: SavedMindMap) => {
    setIsDownloadingPDF(true);
    try {
      const doc = new jsPDF();

      // Title - Centered and All Caps
      const topicUpper = (map.topic || 'UNTITLED').toUpperCase();
      doc.setFontSize(24);
      doc.setTextColor(124, 58, 237); // Purple
      doc.setFont("helvetica", "bold");

      const pageWidth = doc.internal.pageSize.getWidth();
      const titleLines = doc.splitTextToSize(topicUpper, 160);
      titleLines.forEach((line: string, index: number) => {
        doc.text(line, pageWidth / 2, 20 + (index * 10), { align: 'center' });
      });
      let y = 20 + (titleLines.length * 10) + 15;

      // Metadata
      doc.setFontSize(10);
      doc.setTextColor(100);
      const pdfCreatedDate = map.createdAt instanceof Date ? map.createdAt : (map.createdAt as any)?.toDate ? (map.createdAt as any).toDate() : null;
      doc.text(`Created: ${pdfCreatedDate?.toLocaleDateString() || 'Recently'}`, 20, y);
      y += 5;
      doc.text(`Complexity: ${(map as any).depth || 'Low'}`, 20, y);
      y += 15;

      // Suggestions
      if (suggestedTopics.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text("AI Recommendations", 20, y);
        doc.setFontSize(11);
        suggestedTopics.forEach((topic, i) => {
          doc.text(`• ${topic}`, 25, y + 10 + (i * 7));
        });
      }

      const addHeaderFooter = (doc: any) => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setDrawColor(240);
          doc.line(20, 12, pageWidth - 20, 12);

          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(150);
          doc.text(`MindScape Intelligence • mindscape-free.vercel.app`, 20, pageHeight - 10);
          doc.link(20, pageHeight - 15, 80, 10, { url: 'https://mindscape-free.vercel.app/' });

          doc.text(`Page ${i} of ${pageCount}`, pageWidth - 40, pageHeight - 10);
        }
      };

      addHeaderFooter(doc);

      doc.save(`${map.topic.replace(/\s+/g, '_')}_MindMap.pdf`);
      toast({ title: "PDF Downloaded", description: "Your mind map overview is ready." });
    } catch (err) {
      console.error("PDF Export Error:", err);
      toast({ variant: "destructive", title: "Export Failed", description: "Could not generate PDF." });
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const handlePublish = async (map: SavedMindMap) => {
    if (!user || !firestore || isPublishingMapId) return;

    setIsPublishingMapId(map.id);
    const { id: toastId, update } = toast({
      title: 'Publishing to Community...',
      description: 'AI is categorizing your mind map.',
      duration: Infinity,
    });

    try {
      const { categories, error: catError } = await categorizeMindMapAction({
        topic: map.topic,
        summary: map.summary,
      }, {
        provider: config.provider,
        apiKey: config.provider === 'pollinations' ? config.pollinationsApiKey : config.apiKey,
        userId: user?.uid
      });

      // Refresh balance after AI operation
      refreshBalance();

      if (catError) throw new Error(catError);

      const docRef = doc(firestore, 'users', user.uid, 'mindmaps', map.id);
      const contentRef = doc(firestore, 'users', user.uid, 'mindmaps', map.id, 'content', 'tree');

      const [metaSnap, contentSnap] = await Promise.all([
        getDoc(docRef),
        getDoc(contentRef)
      ]);

      if (!metaSnap.exists()) throw new Error("Mind map metadata not found.");

      const fullData = {
        ...metaSnap.data(),
        ...(contentSnap.exists() ? contentSnap.data() : {}),
        id: map.id
      };

      const publicData: any = {
        ...fullData,
        isPublic: true,
        publicCategories: categories,
        originalMapId: map.id,
        originalAuthorId: user.uid,
        authorName: user.displayName || 'ADMIN',
        authorAvatar: user.photoURL || '',
        updatedAt: serverTimestamp(),
        views: 0,
      };

      const publicDocRef = doc(firestore, 'publicMindmaps', map.id);
      await setDoc(publicDocRef, publicData);
      await updateDoc(docRef, { isPublic: true, publicCategories: categories });

      // Update only the publish status without triggering full re-render
      if (selectedMapForPreview && selectedMapForPreview.id === map.id) {
        setPreviewMapPublishStatus(true);
      }

      update({
        id: toastId,
        title: 'Mind Map Published!',
        description: 'Your mind map is now live on the Community Dashboard.',
        duration: 5000,
      });
    } catch (err: any) {
      console.error('Publish error:', err);
      update({
        id: toastId,
        title: 'Publishing Failed',
        variant: 'destructive',
        description: err.message || 'An error occurred.',
        duration: 5000,
      });
    } finally {
      setIsPublishingMapId(null);
    }
  };

  const handleUnpublish = async (map: SavedMindMap) => {
    if (!user || !firestore || isUnpublishingMapId) return;

    setIsUnpublishingMapId(map.id);

    const { id: toastId, update } = toast({
      title: 'Unpublishing from Community...',
      description: 'Removing your mind map from the community.',
      duration: Infinity,
    });

    try {
      // Delete from publicMindmaps collection
      const publicDocRef = doc(firestore, 'publicMindmaps', map.id);
      await deleteDoc(publicDocRef);

      // Update user's map to set isPublic = false
      const userMapRef = doc(firestore, 'users', user.uid, 'mindmaps', map.id);
      await updateDoc(userMapRef, {
        isPublic: false,
        updatedAt: Date.now()
      });

      // Update only the publish status without triggering full re-render
      if (selectedMapForPreview && selectedMapForPreview.id === map.id) {
        setPreviewMapPublishStatus(false);
      }

      update({
        id: toastId,
        title: 'Unpublished Successfully',
        description: 'Your mind map has been removed from the community.',
        duration: 5000,
      });
    } catch (err: any) {
      console.error('Unpublish error:', err);
      update({
        id: toastId,
        title: 'Unpublish Failed',
        variant: 'destructive',
        description: err.message || 'An error occurred.',
        duration: 5000,
      });
    } finally {
      setIsUnpublishingMapId(null);
    }
  };

  const handleShareLink = async (map: SavedMindMap) => {
    if (!user || !firestore) return;

    // If already shared, just copy the link
    if ((map as any).isShared) {
      const shareUrl = `${window.location.origin}/canvas?mapId=share_${map.id}`;
      await navigator.clipboard.writeText(shareUrl);
      setIsCopiedMapId(map.id);
      setTimeout(() => setIsCopiedMapId(null), 2000);
      toast({ title: 'Link Copied', description: 'Anyone with this link can view your map.' });
      return;
    }

    setIsSharingMapId(map.id);
    try {
      // 1. Fetch full content from the split schema
      const docRef = doc(firestore, 'users', user.uid, 'mindmaps', map.id);
      const contentRef = doc(firestore, 'users', user.uid, 'mindmaps', map.id, 'content', 'tree');
      const [metaSnap, contentSnap] = await Promise.all([getDoc(docRef), getDoc(contentRef)]);

      if (!metaSnap.exists()) throw new Error('Mind map not found.');

      const fullData = { ...metaSnap.data(), ...(contentSnap.exists() ? contentSnap.data() : {}), id: map.id };

      // 2. Create shared entry (unlisted) - Using stable share_ prefix
      const shareId = `share_${map.id}`;
      const sharedData = {
        ...fullData,
        id: shareId,
        isShared: true,
        isPublic: false,
        sharedAt: serverTimestamp(),
        originalAuthorId: user.uid,
        authorName: user.displayName || 'ADMIN',
      };
      await setDoc(doc(firestore, 'sharedMindmaps', shareId), sharedData);

      // 3. Mark user's map as shared
      await updateDoc(docRef, { isShared: true });

      // 4. Copy link
      const shareUrl = `${window.location.origin}/canvas?mapId=${shareId}`;
      await navigator.clipboard.writeText(shareUrl);

      setIsCopiedMapId(map.id);
      setTimeout(() => setIsCopiedMapId(null), 2000);
      toast({ title: 'Sharing Enabled!', description: 'Unlisted link copied to clipboard. Share it with anyone!' });
    } catch (err: any) {
      console.error('Share failed:', err);
      toast({ title: 'Sharing Failed', description: err.message || 'An error occurred.', variant: 'destructive' });
    } finally {
      setIsSharingMapId(null);
    }
  };

  const mindMapsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, 'users', user.uid, 'mindmaps'),
      orderBy('updatedAt', 'desc'), // Default sort by recent
      limit(50)
    );
  }, [firestore, user]);

  const { data: savedMaps, isLoading: isMindMapsLoading } = useCollection<SavedMindMap>(mindMapsQuery);


  const filteredAndSortedMaps = useMemo(() => {
    // Filter out sub-maps: either explicitly marked OR has a parentMapId
    let maps = (savedMaps || []).filter(map => {
      // Exclude if explicitly marked as sub-map
      if (map.isSubMap === true) return false;
      // Exclude if it has a parentMapId (legacy sub-maps)
      if ((map as any).parentMapId) return false;
      return true;
    });

    if (searchQuery) {
      maps = maps.filter((map) => map.topic.toLowerCase().includes(searchQuery.toLowerCase()));
    }


    switch (sortOption) {
      case 'alphabetical':
        maps.sort((a, b) => a.topic.localeCompare(b.topic));
        break;
      case 'oldest':
        maps.sort((a, b) => {
          const aTime = typeof a.createdAt === 'number' ? a.createdAt : (a.createdAt?.toMillis() ?? 0);
          const bTime = typeof b.createdAt === 'number' ? b.createdAt : (b.createdAt?.toMillis() ?? 0);
          return aTime - bTime;
        });
        break;
      case 'recent':
      default:
        maps.sort((a, b) => {
          const aTime = typeof a.updatedAt === 'number' ? a.updatedAt : (a.updatedAt?.toMillis() ?? 0);
          const bTime = typeof b.updatedAt === 'number' ? b.updatedAt : (b.updatedAt?.toMillis() ?? 0);
          return bTime - aTime;
        });
        break;
    }

    // Strip heavy fields for dashboard metadata (Phase 1 Performance Improvement)
    return maps
      .filter(map => !deletingMapIds.has(map.id))
      .map(({ nodes, edges, subTopics, ...meta }: any) => meta);
  }, [savedMaps, searchQuery, sortOption, deletingMapIds]);



  const handleMindMapClick = (mapId: string) => {
    // If it's a shared map ID, keep it, otherwise use regular mapId
    const finalMapId = mapId.startsWith('share_') || mapId.startsWith('public_') ? mapId : mapId;
    router.push(`/canvas?mapId=${finalMapId}`);
  };

  const handleGenerateThumbnail = async (mapToUpdate: SavedMindMap) => {
    if (!user || regeneratingMapIds.has(mapToUpdate.id)) return;

    const mapId = mapToUpdate.id;
    setRegeneratingMapIds(prev => new Set(prev).add(mapId));
    setImageErrorMapIds(prev => {
      const next = new Set(prev);
      next.delete(mapId);
      return next;
    });

    const prompt = buildThumbnailPrompt(mapToUpdate.topic);

    toast({
      title: 'Generating Thumbnail...',
      description: `Creating silent thumbnail for ${mapToUpdate.topic}`,
    });

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model: config.imageModel || config.pollinationsModel || 'flux',
          width: 512,
          height: 288,
          userId: user.uid,
          userApiKey: config.pollinationsApiKey,
        })
      });

      if (!response.ok) {
        throw new Error('Image generation failed');
      }

      const data = await response.json();
      const finalImageUrl = data.imageUrl;

      const mapRef = doc(firestore, 'users', user.uid, 'mindmaps', mapId);
      await updateDoc(mapRef, {
        thumbnailUrl: finalImageUrl,
        updatedAt: Date.now()
      });

      if (selectedMapForPreview?.id === mapId) {
        setSelectedMapForPreview(prev => prev ? ({ ...prev, thumbnailUrl: finalImageUrl }) : null);
      }
      // setSavedMaps(prev => prev.map(m => m.id === mapId ? { ...m, thumbnailUrl: finalImageUrl } : m)); // This line is commented out in the provided snippet, so I'll keep it commented.

      toast({
        title: "Thumbnail Updated!",
        description: "Your new AI-crafted thumbnail is ready.",
      });
    } catch (err: any) {
      setImageErrorMapIds(prev => new Set(prev).add(mapId));
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: err.message || "Failed to generate thumbnail."
      });
    } finally {
      setRegeneratingMapIds(prev => {
        const next = new Set(prev);
        next.delete(mapId);
        return next;
      });
    }
  };

  const handleDeleteMap = async () => {
    if (!user || !mapToDelete) return;

    // Optimistic UI: tracking deleting maps locally
    const idToRemove = mapToDelete;
    setDeletingMapIds(prev => new Set(prev).add(idToRemove));
    setMapToDelete(null);

    const docRef = doc(firestore, 'users', user.uid, 'mindmaps', idToRemove);
    try {
      await deleteDoc(docRef);

      // Log activity for real-time stats
      try {
        const { logAdminActivityAction } = await import('@/app/actions');
        await logAdminActivityAction({
          type: 'MAP_DELETED',
          targetId: idToRemove,
          targetType: 'mindmap',
          details: `Mindmap deleted`,
          performedBy: user.uid,
          performedByEmail: user.email || 'anonymous'
        });
      } catch (logErr) {
        console.error('Failed to log map deletion:', logErr);
      }
    } catch (serverError) {
      const permissionError = new FirestorePermissionError({ path: docRef.path, operation: 'delete' });
      errorEmitter.emit('permission-error', permissionError);
      // Revert optimistic UI on error
      setDeletingMapIds(prev => {
        const next = new Set(prev);
        next.delete(idToRemove);
        return next;
      });
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: 'You do not have permission to delete this map or a network error occurred.'
      });
    }
  };

  const handleRegenerateImageWithSettings = async (settings: ImageSettings) => {
    if (!user || !mapForImageLab || regeneratingMapIds.has(mapForImageLab.id)) return;

    const mapId = mapForImageLab.id;
    setRegeneratingMapIds(prev => new Set(prev).add(mapId));
    setImageErrorMapIds(prev => {
      const next = new Set(prev);
      next.delete(mapId);
      return next;
    });

    try {
      console.log('🎨 Regenerating thumbnail with settings for:', mapForImageLab.topic);

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
          userId: user.uid,
          userApiKey: config.pollinationsApiKey
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Generation failed: ${response.status}`);
      }

      const data = await response.json();
      const finalImageUrl = data.imageUrl;

      // Update Firestore
      const mapRef = doc(firestore, 'users', user.uid, 'mindmaps', mapId);
      await updateDoc(mapRef, {
        thumbnailUrl: finalImageUrl,
        updatedAt: Date.now()
      });

      // Update local state for immediate feedback
      if (selectedMapForPreview?.id === mapId) {
        setSelectedMapForPreview(prev => prev ? ({ ...prev, thumbnailUrl: finalImageUrl }) : null);
      }

      toast({
        title: "Thumbnail Updated!",
        description: "Your new AI-crafted thumbnail is ready.",
      });
    } catch (err: any) {
      console.error("Regeneration failed:", err);
      setImageErrorMapIds(prev => new Set(prev).add(mapId));
      toast({
        variant: "destructive",
        title: "Regeneration Failed",
        description: err.message || "Failed to regenerate thumbnail."
      });
    } finally {
      setRegeneratingMapIds(prev => {
        const next = new Set(prev);
        next.delete(mapId);
        return next;
      });
      setIsImageLabOpen(false);
      setMapForImageLab(null);
    }
  };

  const handleEnhancePrompt = async (prompt: string, style?: string, composition?: string, mood?: string, colorPalette?: string, lighting?: string) => {
    setIsEnhancingPrompt(true);
    try {
      const { enhancedPrompt, error } = await enhanceImagePromptAction({
        prompt,
        style,
        composition,
        mood,
        colorPalette,
        lighting
      }, {
        provider: config.provider,
        apiKey: config.provider === 'pollinations' ? config.pollinationsApiKey : config.apiKey,
        model: config.textModel || config.pollinationsModel
      });

      if (error) throw new Error(error);
      return enhancedPrompt?.enhancedPrompt || prompt;
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Enhancement Failed",
        description: err.message,
      });
      return prompt;
    } finally {
      setIsEnhancingPrompt(false);
    }
  };



  if (isUserLoading) {
    return <DashboardLoadingSkeleton />;
  }

  if (!user) {
    return <NotLoggedIn />;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="container mx-auto px-4 sm:px-8 pt-24 pb-8">
        <div
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold tracking-tight mb-2">Your Saved Mind Maps</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Easily access, organize and continue your knowledge maps.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-2xl justify-center">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search maps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full flex pl-10 h-11 rounded-full bg-black/40 text-zinc-100 outline-none focus:ring-0 placeholder:text-zinc-600 border border-white/5 focus:border-primary/50 focus:bg-black/60 transition-all font-medium"
              />
            </div>

            {/* What's New Release Trigger - v1.6.5 */}
            <button
              onClick={() => {
                setIsChangelogOpen(true);
                setHasUnseenUpdates(false);
                localStorage.setItem('mindscape_viewed_version', CURRENT_VERSION);
              }}
              className={cn(
                "relative h-11 px-6 rounded-full bg-black/40 border transition-all group flex items-center gap-2 shadow-lg shrink-0",
                hasUnseenUpdates 
                  ? "border-violet-500/50 bg-violet-600/10 shadow-[0_0_20px_rgba(139,92,246,0.2)] animate-pulse" 
                  : "border-white/5 hover:border-violet-500/30 hover:bg-black/60"
              )}
            >
              <Zap className={cn("h-4 w-4 transition-transform group-hover:scale-110", hasUnseenUpdates ? "text-violet-400 fill-violet-400" : "text-amber-400")} />
              <span className={cn("text-[10px] font-black uppercase tracking-widest italic transition-colors", hasUnseenUpdates ? "text-violet-200" : "text-zinc-400 group-hover:text-zinc-100")}>v1.6.5 Highlights</span>
              {hasUnseenUpdates && (
                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-violet-600 rounded-full border-2 border-zinc-950 animate-bounce shadow-[0_0_15px_rgba(139,92,246,0.6)]" />
              )}
            </button>
          </div>
          <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
            <SelectTrigger className="w-full sm:w-[180px] h-11 rounded-full glassmorphism border-white/5 bg-black/40 hover:bg-black/60 focus:ring-0 focus:ring-offset-0 transition-all">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="glassmorphism border-white/10">
              {[
                { value: 'recent', label: 'Most Recent' },
                { value: 'alphabetical', label: 'A-Z' },
                { value: 'oldest', label: 'Oldest' }
              ].map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  hideIndicator
                  className="w-full cursor-pointer py-2.5 px-3 mb-1 last:mb-0 rounded-xl border border-transparent focus:bg-white/5 data-[state=checked]:bg-primary/10 data-[state=checked]:border-primary/50 data-[state=checked]:shadow-[0_0_15px_rgba(139,92,246,0.15)] text-[11px] font-bold uppercase tracking-wider transition-all"
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className={cn("inline-flex w-1.5 h-1.5 rounded-full transition-all", sortOption === option.value ? "bg-primary shadow-[0_0_8px_rgba(139,92,246,0.6)]" : "bg-zinc-600")} />
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>


        {isMindMapsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-[300px]">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-full rounded-2xl glassmorphism" />
            ))}
          </div>
        ) : filteredAndSortedMaps.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-[300px]">
            <AnimatePresence mode="popLayout">
            {filteredAndSortedMaps.map((rawMap, idx) => {
              // Sanitize map to prevent Firestore Timestamp serialization errors
              const map = sanitizeMapForState(rawMap);
              const mapId = map.id || `temp-map-${idx}`;

              // Robust date parsing for display
              const getDisplayDate = (d: any) => {
                if (d instanceof Date) return d;
                if (typeof d === 'number') return new Date(d);
                if (d?.toDate && typeof d.toDate === 'function') return d.toDate();
                if (d?.toMillis && typeof d.toMillis === 'function') return new Date(d.toMillis());
                return null;
              };

              const updatedAt = getDisplayDate(map.updatedAt) || getDisplayDate(map.createdAt);



              return (
                <motion.div
                  key={mapId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                  className="h-full w-full"
                >
                  <div
                    className="group relative cursor-pointer rounded-2xl bg-white/5 backdrop-blur-xl p-4 flex flex-col h-full w-full overflow-hidden border border-white/10 transition-all duration-500 hover:border-purple-600/50 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] hover:-translate-y-1"
                  >
                  <div className="w-full aspect-video relative mb-4 overflow-hidden rounded-xl bg-[#0A0A0A] group/image shrink-0" onClick={() => handleMindMapClick(mapId)}>
                    <img
                      src={map.thumbnailUrl || `https://gen.pollinations.ai/image/${encodeURIComponent(buildThumbnailPrompt(map.topic))}?width=512&height=288&nologo=true&private=true&model=flux&enhance=false`}
                      alt={map.topic}
                      className={cn(
                        "w-full h-full object-cover transition-all duration-700 group-hover:scale-110",
                        (regeneratingMapIds.has(map.id) || imageErrorMapIds.has(map.id)) && "opacity-40 grayscale blur-[2px]"
                      )}
                      loading="lazy"
                      onError={() => setImageErrorMapIds(prev => new Set(prev).add(map.id))}
                    />

                    {/* Regeneration loading state */}
                    {regeneratingMapIds.has(map.id) && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-30">
                        <Loader2 className="h-8 w-8 text-purple-500 animate-spin mb-2" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-purple-300">Regenerating...</p>
                      </div>
                    )}

                    {/* Error State Overlay */}
                    {!regeneratingMapIds.has(map.id) && imageErrorMapIds.has(map.id) && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/80 z-30 p-4 text-center">
                        <AlertCircle className="h-6 w-6 text-zinc-500 mb-2" />
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight mb-3">Generation Failed</p>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMapForImageLab(map);
                            setIsImageLabOpen(true);
                          }}
                          className="h-8 rounded-full bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/40 text-purple-100 text-[10px] font-bold uppercase tracking-widest px-4"
                        >
                          <Sparkles className="h-3 w-3 mr-2" />
                          AI Repaint
                        </Button>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0E] via-transparent to-transparent opacity-60" />
                    <div className="absolute top-2 left-2 right-2 z-10 grid grid-cols-3 items-center">
                      <div className="flex justify-start">
                        <DepthBadge depth={(map as any).depth} />
                      </div>
                      <div className="flex justify-center">
                        {(map as any).isPublic && (
                          <Badge 
                            variant="outline"
                            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                            className="bg-black/60 text-purple-400 border-purple-500/30 border backdrop-blur-xl text-[10px] uppercase font-black tracking-widest gap-1.5 px-2.5 h-5 shadow-lg ring-1 ring-black/20"
                          >
                            <Globe className="h-2.5 w-2.5" />
                            PUBLISHED
                          </Badge>
                        )}
                      </div>
                      <div className="flex justify-end">
                        <SourceBadge 
                          type={(map as any).mode === 'multi' ? 'multi' : ((map as any).sourceFileType || (map as any).sourceType || 'text')} 
                          sourceFileContent={(map as any).sourceFileContent}
                        />
                      </div>
                    </div>
                    {/* Glassmorphism overlay with buttons on hover */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover/image:opacity-100 group-hover/image:bg-black/40 transition-all duration-300 pointer-events-none">
                      <div className="flex items-center gap-3 pointer-events-auto" onClick={() => handleMindMapClick(map.id)}>
                        <div className="rounded-full bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/20 text-white text-[10px] h-9 px-6 font-black uppercase tracking-widest shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer">
                          <ExternalLink className="w-3.5 h-3.5" />
                          Open Full Map
                        </div>
                      </div>
                    </div>
                  </div>

                  <h3 className="font-bold text-lg text-white mb-2 line-clamp-2 group-hover:text-purple-400 transition-colors font-orbitron tracking-tight pb-1 leading-snug" onClick={() => handleMindMapClick(map.id)}>
                    {(map as any).shortTitle || map.topic}
                  </h3>

                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
                    {updatedAt && (
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {formatShortDistanceToNow(updatedAt)}
                      </p>
                    )}

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full text-zinc-500 hover:text-purple-400 hover:bg-purple-500/10 transition-all duration-300"
                            onClick={() => {
                              const sanitizedMap = sanitizeMapForState(map);
                              setSelectedMapForPreview(sanitizedMap);
                              setPreviewMapPublishStatus((sanitizedMap as any).isPublic ?? false);
                            }}
                          >
                            <Info className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>Quick Details</p>
                        </TooltipContent>
                      </Tooltip>

                      {!(map as any).isPublic && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-8 w-8 rounded-full text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all duration-300",
                                isPublishingMapId === map.id && "animate-pulse"
                              )}
                              onClick={() => handlePublish(map)}
                              disabled={isPublishingMapId === map.id}
                            >
                              {isPublishingMapId === map.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p>Share to Community</p>
                          </TooltipContent>
                        </Tooltip>
                      )}

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all duration-300"
                            onClick={() => handleShareLink(map)}
                            disabled={isSharingMapId === map.id}
                          >
                            {isCopiedMapId === map.id ? (
                              <Check className="h-4 w-4 text-emerald-400" />
                            ) : isSharingMapId === map.id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                            ) : (
                              <Share2 className={cn("h-4 w-4", (map as any).isShared && "text-blue-400")} />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>{isCopiedMapId === map.id ? 'Copied!' : isSharingMapId === map.id ? 'Sharing...' : (map as any).isShared ? 'Copy Share Link' : 'Create Share Link'}</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-8 w-8 rounded-full text-zinc-500 hover:text-purple-400 hover:bg-purple-500/10 transition-all duration-300",
                              regeneratingMapIds.has(map.id) && "animate-pulse text-purple-400"
                            )}
                            onClick={() => {
                              setMapForImageLab(map);
                              setIsImageLabOpen(true);
                            }}
                            disabled={regeneratingMapIds.has(map.id)}
                          >
                            {regeneratingMapIds.has(map.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <ImageIcon className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>New Thumbnail</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300"
                            onClick={() => setMapToDelete(map.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>Delete Forever</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-16 border-2 border-dashed rounded-lg mt-12">
            <Icons.logo className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">
              {searchQuery ? 'No Mind Maps Found' : 'No Saved Mind Maps'}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {searchQuery ? 'Try a different search term.' : "You haven't saved any mind maps yet."}
            </p>
            <Button className="mt-6" onClick={() => router.push('/')}>
              Generate a Mind Map
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={!!mapToDelete} onOpenChange={(open) => !open && setMapToDelete(null)}>
        <AlertDialogContent className="glassmorphism border-white/10 rounded-[2rem] p-8 shadow-2xl max-w-[400px]">
          <AlertDialogHeader className="space-y-3">
            <AlertDialogTitle className="text-xl font-bold tracking-tight text-white text-center">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400 text-sm text-center">
              This action cannot be undone. This will permanently delete this mind map.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex sm:justify-center">
            <div className="flex items-center gap-1 p-1 bg-black/40 rounded-full border border-white/5 backdrop-blur-md w-full sm:w-auto">
              <AlertDialogCancel className="flex-1 sm:flex-none rounded-full text-[10px] font-extrabold px-8 h-10 uppercase tracking-widest border-transparent bg-transparent text-zinc-500 hover:text-white hover:bg-white/5 transition-all duration-300">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteMap}
                className="flex-1 sm:flex-none rounded-full text-[10px] font-extrabold px-8 h-10 uppercase tracking-widest bg-red-500 hover:bg-red-600 text-white hover:scale-105 active:scale-95 shadow-lg shadow-red-500/20 transition-all duration-300"
              >
                Delete
              </AlertDialogAction>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={!!selectedMapForPreview} onOpenChange={(open) => !open && setSelectedMapForPreview(null)}>
        <SheetContent className="bg-zinc-950/40 backdrop-blur-3xl border-white/5 text-white w-full sm:max-w-md overflow-hidden flex flex-col p-0 shadow-2xl">
          {selectedMapForPreview && (
            <>
              <SheetHeader className="px-8 pt-8 pb-4 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-violet-500/10 rounded-xl border border-violet-500/20 shadow-lg shadow-violet-500/5">
                    <Info className="h-5 w-5 text-violet-400" />
                  </div>
                  <SheetTitle className="text-2xl font-black tracking-tight text-white leading-tight flex-1">
                    {(selectedMapForPreview as any).shortTitle || selectedMapForPreview.topic}
                  </SheetTitle>
                </div>
                <SheetDescription className="text-zinc-500 text-xs font-bold uppercase tracking-[0.15em] line-clamp-2 mt-2">
                  {selectedMapForPreview.summary}
                </SheetDescription>
              </SheetHeader>

              <ScrollArea className="flex-1 min-h-0">
                <div className="p-8 space-y-8 pb-12">
                  {/* Glass Actions Bar */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className={cn(
                        "h-12 rounded-2xl border-white/5 bg-white/5 hover:bg-white/10 transition-all duration-300 text-[10px] font-black uppercase tracking-widest gap-2 shadow-xl",
                        isLinkCopied ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/5" : "text-zinc-400"
                      )}
                      onClick={() => {
                        const shareId = `share_${selectedMapForPreview.id}`;
                        navigator.clipboard.writeText(`${window.location.origin}/canvas?mapId=${shareId}`);
                        setIsLinkCopied(true);
                        setTimeout(() => setIsLinkCopied(false), 2000);
                        toast({ title: "Share Link Copied", description: "Standardized shared URL is in your clipboard." });
                      }}
                    >
                      {isLinkCopied ? <Check className="h-3 w-3" /> : <Share2 className="h-3 w-3 text-emerald-400" />}
                      {isLinkCopied ? 'Copied' : 'Share Link'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleDownloadFullData(selectedMapForPreview)}
                      disabled={isDownloadingFullData || isFullDataLoading}
                      className="h-12 rounded-2xl border-white/5 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-zinc-400 gap-2 shadow-xl"
                    >
                      {isDownloadingFullData || isFullDataLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Database className="h-3 w-3 text-blue-400" />
                      )}
                      {isDownloadingFullData ? 'Exporting...' : 'Knowledge Pack'}
                    </Button>
                  </div>

                  {/* Premium Visual Preview */}
                  <div className="relative group/preview w-full aspect-video rounded-2xl overflow-hidden bg-black/60 border border-white/10 shadow-2xl ring-1 ring-white/5">
                    <img
                      src={selectedMapForPreview.thumbnailUrl || `https://gen.pollinations.ai/image/${encodeURIComponent(buildThumbnailPrompt(selectedMapForPreview.topic))}?width=512&height=288&nologo=true&private=true&model=flux&enhance=false`}
                      alt={selectedMapForPreview.topic}
                      className={cn(
                        "w-full h-full object-cover transition-all duration-700 ease-out group-hover/preview:scale-105",
                        (regeneratingMapIds.has(selectedMapForPreview.id) || isFullDataLoading) ? "blur-xl opacity-30 grayscale" : "opacity-60 group-hover/preview:opacity-100"
                      )}
                    />
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                    {regeneratingMapIds.has(selectedMapForPreview.id) ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
                        <Loader2 className="h-8 w-8 text-purple-500 animate-spin mb-2" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-purple-300">Syncing Neurons...</p>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover/preview:opacity-100 transition-all duration-500 translate-y-4 group-hover/preview:translate-y-0">
                        <Button
                          className="rounded-full bg-white text-black hover:bg-zinc-200 text-[10px] h-10 px-8 font-black uppercase tracking-widest shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2"
                          onClick={() => handleMindMapClick(selectedMapForPreview.id)}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Enter Canvas
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGenerateThumbnail(selectedMapForPreview);
                          }}
                          className="rounded-full h-10 w-10 bg-black/60 backdrop-blur-xl border border-white/20 hover:bg-white/20 text-white transition-all duration-300 hover:scale-110 active:scale-90"
                        >
                          <Sparkles className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* VIBGYOR Stats Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/10 backdrop-blur-sm flex items-center gap-4 group/stat transition-all hover:bg-purple-500/10 hover:border-purple-500/20 shadow-sm">
                      <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20 group-hover/stat:scale-110 transition-transform">
                        <BarChart3 className="h-4 w-4 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-[8px] uppercase font-black text-purple-500 tracking-[0.2em] mb-1">Depth</p>
                        <p className="text-xs font-black text-white uppercase tracking-tight">
                          {(selectedMapForPreview as any).depth === 'low' ? 'Quick' : 
                          (selectedMapForPreview as any).depth === 'medium' ? 'Balanced' : 
                          (selectedMapForPreview as any).depth === 'deep' ? 'Detailed' : 
                          ((selectedMapForPreview as any).depth || 'Quick')}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 backdrop-blur-sm flex items-center gap-4 group/stat transition-all hover:bg-blue-500/10 hover:border-blue-500/20 shadow-sm">
                      <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20 group-hover/stat:scale-110 transition-transform">
                        <Zap className="h-4 w-4 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-[8px] uppercase font-black text-blue-500 tracking-[0.2em] mb-1">Architecture</p>
                        <p className="text-xs font-black text-white uppercase tracking-tight">
                          {(selectedMapForPreview as any).mode || 'Single'}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 backdrop-blur-sm flex items-center gap-4 group/stat transition-all hover:bg-emerald-500/10 hover:border-emerald-500/20 shadow-sm">
                      <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 group-hover/stat:scale-110 transition-transform">
                        <Binary className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-[8px] uppercase font-black text-emerald-500 tracking-[0.2em] mb-1">Nodes</p>
                        <p className="text-xs font-black text-white family-mono">
                          {isFullDataLoading ? '--' : previewStats.totalNodes}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 backdrop-blur-sm flex items-center gap-4 group/stat transition-all hover:bg-amber-500/10 hover:border-amber-500/20 shadow-sm">
                      <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20 group-hover/stat:scale-110 transition-transform">
                        <Layers className="h-4 w-4 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-[8px] uppercase font-black text-amber-500 tracking-[0.2em] mb-1">Pathways</p>
                        <p className="text-xs font-black text-white family-mono">
                          {isFullDataLoading ? '--' : previewStats.concepts}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Status Control Card */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (previewMapPublishStatus) handleUnpublish(selectedMapForPreview);
                      else handlePublish(selectedMapForPreview);
                    }}
                    disabled={isPublishingMapId === selectedMapForPreview.id || isUnpublishingMapId === selectedMapForPreview.id}
                    className={cn(
                      "w-full flex items-center justify-between p-6 rounded-[32px] border transition-all duration-500 group/publish relative overflow-hidden",
                      previewMapPublishStatus 
                        ? "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/15" 
                        : "bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/15"
                    )}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover/publish:translate-x-full transition-transform duration-1000" />
                    
                    <div className="flex items-center gap-4 relative z-10 text-left">
                      <div className={cn(
                        "p-2.5 rounded-xl border transition-all duration-500",
                        previewMapPublishStatus ? "bg-emerald-500/20 border-emerald-400/30" : "bg-purple-500/20 border-purple-400/30"
                      )}>
                        <Globe className={cn("h-4 w-4", previewMapPublishStatus ? "text-emerald-400" : "text-purple-400")} />
                      </div>
                      <div>
                        <p className="text-[8px] uppercase font-black tracking-widest text-zinc-500 mb-0.5">Publication Hub</p>
                        <p className={cn("text-xs font-black uppercase tracking-tight", previewMapPublishStatus ? "text-emerald-400" : "text-purple-400")}>
                          {previewMapPublishStatus ? 'Live on Community' : 'Private to Library'}
                        </p>
                      </div>
                    </div>

                    <div className="relative z-10">
                      {(isPublishingMapId === selectedMapForPreview.id || isUnpublishingMapId === selectedMapForPreview.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                      ) : (
                        <Badge className={cn(
                          "rounded-lg border font-black text-[9px] px-4 py-1.5 shadow-sm",
                          previewMapPublishStatus ? "bg-emerald-500/20 text-emerald-400 border-emerald-400/20" : "bg-purple-500/20 text-purple-400 border-purple-400/20"
                        )}>
                          {previewMapPublishStatus ? 'UNPUBLISH' : 'PUBLISH'}
                        </Badge>
                      )}
                    </div>
                  </button>

                    {/* Neural Expansion Paths */}
                    <div className="space-y-5">
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2.5">
                          <Sparkles className="h-4 w-4 text-amber-400" />
                          <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">
                            Neural Expansion Paths
                          </h4>
                        </div>
                        {isSuggestingTopics && <Loader2 className="h-3 w-3 animate-spin text-zinc-700" />}
                      </div>
                      
                      <div className="grid gap-3">
                        {isSuggestingTopics ? (
                          Array(3).fill(0).map((_, i) => (
                            <div key={i} className="h-16 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse" />
                          ))
                        ) : (
                          (suggestedTopics.length > 0 ? suggestedTopics : [
                            `Technical deep dive into the underlying architecture`,
                            `Practical implementation & Professional use-cases`,
                            `Historical development & Future evolution`
                          ]).map((idea, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                setSelectedIdeaForAction(idea);
                                setShowChoiceDialog(true);
                              }}
                              className="flex items-center justify-between p-5 rounded-2xl bg-zinc-900/40 border border-white/5 hover:border-violet-500/30 hover:bg-violet-500/5 transition-all duration-300 text-left group/path shadow-sm"
                            >
                                <div className="flex-1 min-w-0">
                                  <span className="text-xs font-black uppercase tracking-tight text-zinc-400 group-hover:text-violet-300 transition-colors leading-relaxed block">{idea}</span>
                                </div>
                              <ChevronRight className="h-4 w-4 text-zinc-700 group-hover/path:text-violet-500 group-hover/path:translate-x-1 transition-all" />
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Recommendation Choice Dialog - Refined for Creation Flow */}
      <AlertDialog open={showChoiceDialog} onOpenChange={setShowChoiceDialog}>
        <AlertDialogContent className="z-[400] glassmorphism border-white/10 sm:max-w-[450px] p-0 overflow-hidden shadow-[0_0_50px_rgba(139,92,246,0.15)] animate-in zoom-in-95 duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-emerald-500/5 pointer-events-none" />

          <div className="relative p-8 space-y-6">
            <AlertDialogHeader className="space-y-4">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-purple-500/20 rotate-3 transition-transform duration-500">
                <Sparkles className="h-8 w-8 text-white animate-pulse" />
              </div>
              <div className="space-y-2 text-center">
                <AlertDialogTitle className="text-2xl font-black tracking-tighter uppercase font-orbitron text-white">
                  Knowledge <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-400">Expansion</span>
                </AlertDialogTitle>
                <AlertDialogDescription className="text-zinc-400 text-sm leading-relaxed px-4">
                  How would you like to build the mind map for "<span className="text-purple-300 font-bold italic">{selectedIdeaForAction}</span>"?
                </AlertDialogDescription>
              </div>
            </AlertDialogHeader>

            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => handleRecommendationAction('background')}
                className="group relative flex items-center gap-4 p-5 rounded-2xl border border-white/5 bg-white/5 hover:bg-purple-500/10 hover:border-purple-500/30 transition-all duration-300 text-left overflow-hidden h-24"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative h-12 w-12 rounded-xl bg-purple-500/20 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                  <Database className="h-6 w-6 text-purple-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-black text-white uppercase tracking-tight">Generate in Background</h4>
                  <p className="text-[10px] text-zinc-500 font-medium italic">Stay here; we'll notify you when it's ready.</p>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-700 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => handleRecommendationAction('immediate')}
                className="group relative flex items-center gap-4 p-5 rounded-2xl border border-white/5 bg-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all duration-300 text-left overflow-hidden h-24"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                  <ExternalLink className="h-6 w-6 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-black text-white uppercase tracking-tight">Start Creation Now</h4>
                  <p className="text-[10px] text-zinc-500 font-medium italic">Jump to the Canvas to begin right away.</p>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-700 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="pt-2 text-center">
              <AlertDialogCancel className="w-full h-11 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                Cancel
              </AlertDialogCancel>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
      {/* What's New Modal - v1.6.5 Highlights */}
      <AlertDialog open={isChangelogOpen} onOpenChange={setIsChangelogOpen}>
        <AlertDialogContent className="z-[500] glassmorphism border-white/10 sm:max-w-[550px] p-0 overflow-hidden shadow-[0_0_80px_rgba(139,92,246,0.2)] animate-in zoom-in-95 duration-500">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-transparent to-emerald-500/5 pointer-events-none" />

          <div className="relative">
            <div className="p-8 pb-4">
              <AlertDialogHeader className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                  <Badge className="bg-violet-500/10 text-violet-400 border-violet-500/20 px-3 py-1 font-orbitron text-[10px] tracking-[0.2em] font-black uppercase">
                    v1.6.5
                  </Badge>
                </div>
                <div className="space-y-2">
                  <AlertDialogTitle className="text-3xl font-black tracking-tighter uppercase font-orbitron text-white leading-none">
                    Intelligence <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Refined</span>
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-zinc-400 text-sm font-medium uppercase tracking-tight">
                    Discovery Edition • Platform Modernization
                  </AlertDialogDescription>
                </div>
              </AlertDialogHeader>
            </div>

            <ScrollArea className="h-[400px] px-8">
              <div className="space-y-8 py-4">
                {/* Modernization */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-violet-500" />
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">Dashboard Modernization</h4>
                  </div>
                  <p className="text-zinc-300 text-sm leading-relaxed">
                    The Library and User Profile have been reimagined with a <span className="text-white font-bold italic">premium glassmorphic Aesthetic</span>, featuring standardized VIBGYOR analytics and 3XL backdrop blurs.
                  </p>
                </div>

                {/* Intelligence */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-emerald-500" />
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Neural Source Intelligence</h4>
                  </div>
                  <p className="text-zinc-300 text-sm leading-relaxed">
                    Introducing interactive source tooltips. Hover over source symbols to see a full breakdown of <span className="text-white font-bold italic">PDF, YouTube, and Website</span> counts powering your maps.
                  </p>
                </div>

                {/* Reliability */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-amber-500" />
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">Structural Stability</h4>
                  </div>
                  <p className="text-zinc-300 text-sm leading-relaxed">
                    Embedded a new <span className="text-white font-bold italic">Dual-Layered JSON Repair Engine</span>. Deep mindmap generations are now more robust, ensuring your complex data renders flawlessly even at extreme density.
                  </p>
                </div>

                {/* Expansion */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-rose-500" />
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400">Streamlined Exploration</h4>
                  </div>
                  <p className="text-zinc-300 text-sm leading-relaxed">
                    Refined the "Neural Expansion Paths" workflow. Choose between <span className="text-white font-bold italic">Background Generation</span> OR jumping straight to the Canvas for your next deep dive.
                  </p>
                </div>
              </div>
            </ScrollArea>

            <div className="p-8 pt-4">
              <AlertDialogCancel
                className="w-full h-12 rounded-xl border-white/5 bg-zinc-900/50 hover:bg-white/5 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all border-none"
                onClick={handleCloseChangelog}
              >
                Dismiss Updates
              </AlertDialogCancel>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {mapForImageLab && (
        <ImageGenerationDialog
          isOpen={isImageLabOpen}
          onClose={() => {
            setIsImageLabOpen(false);
            setMapForImageLab(null);
          }}
          onGenerate={handleRegenerateImageWithSettings}
          nodeName={mapForImageLab.topic}
          nodeDescription={`Updating thumbnail for your mind map: ${mapForImageLab.topic}`}
          initialPrompt={mapForImageLab.topic}
          onEnhancePrompt={handleEnhancePrompt}
          isEnhancing={isEnhancingPrompt}
        />
      )}
    </TooltipProvider >

  );
}
