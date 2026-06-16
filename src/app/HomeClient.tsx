'use client';

import { useState, useRef, createRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Bot,
  Paperclip,
  List,
  Gauge,
  ArrowRight,
  Globe,
  GitBranch,
  Zap,
  Image as ImageIcon,
  Loader2,
  UserRound,
  Palette,
  Brain,
  X,
  MessageCircle,
  FastForward,
  Scale,
  BookOpen,
  Youtube,
  MessageSquare,
  GraduationCap,
  Layers,
  Mic,
  Network,
  ArrowDown,
  ArrowUp,
  FileText,
  Share2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { parsePdfContent } from '@/lib/pdf-processor';
import { safeSetItem, safeGetItem, safeRemoveItem, STORAGE_LIMITS } from '@/lib/storage';
import { resizeImage } from '@/lib/image-processor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { languages } from '@/lib/languages';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/lib/auth-context';
import { getSupabaseClient } from '@/lib/supabase-db';
import { useAIConfig } from '@/contexts/ai-config-context';
import { OnboardingWizard, TRIGGER_ONBOARDING_EVENT } from '@/components/onboarding-wizard';
import { useAITracking } from '@/hooks/use-ai-tracking';
import { useSessionTracking } from '@/hooks/use-session-tracking';

import dynamic from 'next/dynamic';
import { useMultiSource } from '@/hooks/use-multi-source';
import { MultiSourceInput } from '@/components/mind-map/MultiSourceInput';
import { SourcePillList } from '@/components/mind-map/SourcePillList';
import { resolveDepthWithConfidence, getDepthLabel, getDepthColor } from '@/lib/depth-analysis';
import { SectionContainer } from '@/components/home/section-container';
import { FeatureBlock } from '@/components/home/feature-block';
import { ProcessStep } from '@/components/home/process-step';

// #6 — Source-type depth presets
const SOURCE_DEPTH_PRESETS: Record<string, 'quick' | 'balanced' | 'detailed'> = {
  pdf:     'detailed',
  youtube: 'balanced',
  image:   'quick',
  website: 'balanced',
  text:    'balanced',
  multi:   'detailed',
};

const ChatPanel = dynamic(() => import('@/components/chat-panel').then(mod => mod.ChatPanel), {
  ssr: false,
  loading: () => null
});

const PERSONAS = [
  { id: 'teacher', label: 'Teacher', icon: UserRound, color: 'text-blue-400', description: 'Explains concepts with detailed examples and educational step-by-step guidance.' },
  { id: 'concise', label: 'Concise', icon: Zap, color: 'text-amber-400', description: 'Provides direct, short, and to-the-point answers without fluff.' },
  { id: 'creative', label: 'Creative', icon: Palette, color: 'text-pink-400', description: 'Uses imaginative and out-of-the-box thinking for brainstorming.' },
  { id: 'sage', label: 'Cognitive Sage', icon: Brain, color: 'text-purple-400', description: 'Deep, philosophical, and analytical thinker for complex problems.' }
];

const DEPTHS = [
  { id: 'quick', label: 'Quick', icon: FastForward, color: 'text-green-400', description: 'Brief and fast overview.' },
  { id: 'balanced', label: 'Balanced', icon: Scale, color: 'text-blue-400', description: 'Optimal mix of detail and brevity.' },
  { id: 'detailed', label: 'Detailed', icon: BookOpen, color: 'text-purple-400', description: 'Comprehensive, in-depth exploration.' },
  { id: 'auto', label: 'Auto', icon: Sparkles, color: 'text-pink-400', description: 'AI decides the best depth based on topic complexity.' }
];

const fade = (delay = 0) => ({
    initial: { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.5, delay, ease: 'easeOut' },
});

const HERO_CONTENT_OPTIONS = [
  {
    headlineLine1: "Turn complex data into",
    headlineLine2: "structured knowledge.",
    subheadline: "Convert PDFs, videos, websites, and text into interactive mind maps using deterministic analysis + AI."
  },
  {
    headlineLine1: "Synthesize chaos into",
    headlineLine2: "visual clarity.",
    subheadline: "Ingest dense documents and leverage deterministic AI to instantly generate interactive, explorable knowledge graphs."
  },
  {
    headlineLine1: "Structure the",
    headlineLine2: "unstructured.",
    subheadline: "Combine strict structural extraction with AI synthesis to prevent hallucinations and accelerate deep learning."
  },
  {
    headlineLine1: "Don't just read data—",
    headlineLine2: "explore it.",
    subheadline: "MindScape maps the hidden structures within your content to create interactive, visual learning graphs."
  },
  {
    headlineLine1: "See the bigger picture,",
    headlineLine2: "instantly.",
    subheadline: "Turn any source into an accurate mind map. Master complex topics faster through interactive visual learning."
  }
];

// ---------- HERO ----------
function Hero({
  onGenerate,
  onCompare,
  onMultiGenerate,
  lang,
  setLang,
  isGenerating,
  languageSelectRef,
  fileInputRef,
  depth,
  setDepth,
  persona,
  setPersona,
  onActiveModeChange,
  topic,
  setTopic,
  depthSuggestion,
}: {
  onGenerate: (
    topic: string,
    fileInfo?: { name: string; type: string; content: string; originalContent?: string }
  ) => void;
  onCompare: (topic1: string, topic2: string, file1?: any, file2?: any) => void;
  onMultiGenerate: (mergedContent: string, topic: string) => void;
  lang: string;
  setLang: (lang: string) => void;
  isGenerating: boolean;
  languageSelectRef: React.RefObject<HTMLButtonElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  depth: string;
  setDepth: (depth: string) => void;
  persona: string;
  setPersona: (persona: string) => void;
  onActiveModeChange: (mode: 'single' | 'compare' | 'multi') => void;
  topic: string;
  setTopic: (topic: string) => void;
  depthSuggestion: any;
}) {
  const [topic2, setTopic2] = useState('');
  const [activeMode, setActiveMode] = useState<'single' | 'compare' | 'multi'>('single');
  const [contentIndex, setContentIndex] = useState(0);

  useEffect(() => {
    const randomIdx = Math.floor(Math.random() * HERO_CONTENT_OPTIONS.length);
    if (randomIdx !== 0) {
      setContentIndex(randomIdx);
    }

    const interval = setInterval(() => {
      setContentIndex((prev) => (prev + 1) % HERO_CONTENT_OPTIONS.length);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const currentContent = HERO_CONTENT_OPTIONS[contentIndex];

  const isCompareMode = activeMode === 'compare';
  const isMultiMode = activeMode === 'multi';
  const { toast } = useToast();
  const [uploadedFile, setUploadedFile] = useState<any>(null);
  const [uploadedFile2, setUploadedFile2] = useState<any>(null);
  const [uploadTarget, setUploadTarget] = useState<'file1' | 'file2'>('file1');
  const [pdfProgress, setPdfProgress] = useState<any>(null);
  const [openSelect, setOpenSelect] = useState<string | null>(null);
  const { user } = useUser();
  const { config } = useAIConfig();
  const isSetupComplete = !!user && config?.pollinationsApiKey;

  const { sources, addSource, addFile, removeSource, buildPayload, contextUsage, canGenerate, clearSources } = useMultiSource({
    apiKey: config.pollinationsApiKey,
    userId: user?.id
  });

  const handleModeChange = (mode: 'single' | 'compare' | 'multi') => {
    setActiveMode(mode);
    onActiveModeChange(mode);
  };

  const handleInternalSubmit = () => {
    if (!isSetupComplete) {
      window.dispatchEvent(new CustomEvent(TRIGGER_ONBOARDING_EVENT));
      return;
    }
    if (isCompareMode) {
      if (!topic.trim() && !uploadedFile && !topic2.trim() && !uploadedFile2) {
        toast({ variant: 'destructive', title: 'Topics Required', description: 'Please enter topics or attach files.' });
        return;
      }
      
      const cleanName = (t: string, f?: any) => {
        if (t.trim()) return t.trim();
        if (f?.name) return f.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, ' ');
        return 'Topic';
      };

      onCompare(cleanName(topic, uploadedFile), cleanName(topic2, uploadedFile2), uploadedFile, uploadedFile2);
    } else {
      if (!topic && !uploadedFile) return;
      onGenerate(topic, uploadedFile);
    }
  };

  const handleFileIconClick = (target: 'file1' | 'file2' = 'file1') => {
    setUploadTarget(target);
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (activeMode === 'multi') {
      Array.from(event.target.files || []).forEach(f => addFile(f));
      event.target.value = '';
      return;
    }
    try {
      let content = '';
      let type: 'text' | 'pdf' | 'image' = 'text';
      if (file.type.startsWith('image/')) {
        if (file.size > 20 * 1024 * 1024) {
          toast({ title: "Image Too Large", description: "Max 20MB", variant: "destructive" });
          return;
        }
        type = 'image';
        const rawBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        // Resize before storage to stay under sessionStorage limits
        try {
          content = await resizeImage(rawBase64, 2048, 0.8);
        } catch (resizeErr) {
          console.warn('Image resize failed, using original:', resizeErr);
          content = rawBase64;
        }
      } else if (file.type === 'application/pdf') {
        type = 'pdf';
        const arrayBuffer = await file.arrayBuffer();
        const { content: text } = await parsePdfContent(arrayBuffer, (p) => setPdfProgress(p));
        content = text;
      } else {
        content = await file.text();
      }
      const data = { name: file.name, type, content };
      if (uploadTarget === 'file2') setUploadedFile2(data);
      else setUploadedFile(data);
    } catch (err) {
      toast({ title: "Upload Failed", variant: "destructive" });
    }
  };

  return (
    <section className="relative mx-auto max-w-7xl px-6 pt-[58px] pb-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center text-center">
        <Badge variant="outline" className="mb-6 px-4 py-1.5 border-primary/30 bg-primary/5 text-primary-foreground backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 mr-2" />
          Visual Intelligence Engine
        </Badge>

        <motion.h1 className="grid text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight mb-6 min-h-[120px] md:min-h-[160px] w-full items-center justify-center [perspective:1200px]">
          <AnimatePresence>
            <motion.div
              key={`headline-${contentIndex}`}
              initial={{ opacity: 0, y: 30, scale: 0.95, filter: 'blur(12px)', rotateX: 8 }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', rotateX: 0 }}
              exit={{ opacity: 0, y: -30, scale: 1.03, filter: 'blur(12px)', rotateX: -5 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              style={{ gridArea: '1 / 1', transformStyle: 'preserve-3d' }}
              className="flex flex-col justify-center items-center w-full"
            >
              <div className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 leading-tight py-2 px-4 whitespace-nowrap">
                {currentContent.headlineLine1} <br />
                <span className="text-primary">{currentContent.headlineLine2}</span>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.h1>

        <div className="grid min-h-[100px] md:min-h-[60px] mb-12 max-w-2xl mx-auto w-full items-center justify-center [perspective:800px]">
          <AnimatePresence>
            <motion.p
              key={`subhead-${contentIndex}`}
              initial={{ opacity: 0, y: 20, filter: 'blur(8px)', rotateX: 5 }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)', rotateX: 0 }}
              exit={{ opacity: 0, y: -20, filter: 'blur(8px)', rotateX: -3 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
              style={{ gridArea: '1 / 1', transformStyle: 'preserve-3d' }}
              className="flex items-center justify-center text-zinc-400 text-lg md:text-xl leading-relaxed text-center w-full px-4"
            >
              {currentContent.subheadline}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="w-full max-w-4xl mx-auto relative group rounded-[2.5rem] border border-white/10 bg-zinc-900/60 backdrop-blur-3xl p-2 shadow-2xl">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-3 pt-2 pb-1">
              <div className="flex items-center gap-1 p-1 bg-black/40 rounded-full border border-white/5">
                {['single', 'compare', 'multi'].map((m) => (
                  <Button
                    key={m}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "rounded-full text-[10px] font-extrabold tracking-widest uppercase px-5 h-8 transition-all duration-500",
                      activeMode === m ? "bg-primary/10 border-primary/50 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                    )}
                    onClick={() => handleModeChange(m as any)}
                  >
                    {m === 'multi' ? 'Multi-Source' : m}
                  </Button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <Select value={depth} onValueChange={setDepth}>
                  <SelectTrigger className="w-auto h-9 border border-white/5 bg-black/40 text-[10px] font-black uppercase tracking-widest text-zinc-400 rounded-full hover:bg-black/60 px-4">
                    <List className="w-3.5 h-3.5 mr-2" />
                    <span>{DEPTHS.find(d => d.id === depth)?.label || 'Depth'}</span>
                  </SelectTrigger>
                  <SelectContent className="glassmorphism border-white/10">
                    {DEPTHS.map(d => (
                      <SelectItem key={d.id} value={d.id} className="text-[11px] font-bold uppercase py-3">{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={persona} onValueChange={setPersona}>
                  <SelectTrigger className="w-auto h-9 border border-white/5 bg-black/40 text-[10px] font-black uppercase tracking-widest text-zinc-400 rounded-full hover:bg-black/60 px-4">
                    <Bot className="w-3.5 h-3.5 mr-2" />
                    <span>{PERSONAS.find(p => p.id === persona)?.label || 'Persona'}</span>
                  </SelectTrigger>
                  <SelectContent className="glassmorphism border-white/10">
                    {PERSONAS.map(p => (
                      <SelectItem key={p.id} value={p.id} className="text-[11px] font-bold uppercase py-3">{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={lang} onValueChange={setLang}>
                  <SelectTrigger className="w-auto h-9 border border-white/5 bg-black/40 text-[10px] font-black uppercase tracking-widest text-zinc-400 rounded-full hover:bg-black/60 px-4">
                    <Globe className="w-3.5 h-3.5 mr-2" />
                    <span>{languages.find(l => l.code === lang)?.name || 'Language'}</span>
                  </SelectTrigger>
                  <SelectContent className="glassmorphism border-white/10">
                    {languages.map(l => (
                      <SelectItem key={l.code} value={l.code} className="text-[10px] font-bold uppercase">{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-2 relative">
              {activeMode === 'multi' ? (
                <>
                  <MultiSourceInput 
                      onAdd={addSource} 
                      isGenerating={isGenerating} 
                      onGenerate={async () => {
                          const p = await buildPayload();
                          if (p) onMultiGenerate(p, topic);
                      }} 
                      onAttachFile={() => handleFileIconClick('file1')}
                      canGenerate={canGenerate}
                      sourceCount={sources.length}
                  />
                  <SourcePillList 
                      sources={sources} 
                      onRemove={removeSource} 
                      onClearAll={clearSources} 
                      contextUsage={contextUsage} 
                  />
                </>
              ) : (
                <div className="relative flex items-center gap-2">
                  <div className={cn("relative flex-1 flex transition-all duration-500", isCompareMode ? "flex-col sm:flex-row gap-3" : "flex-row")}>
                    <div className="relative flex-1">
                      <input
                        placeholder={isCompareMode ? 'First topic...' : 'Enter topic or URL...'}
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        className="w-full h-16 rounded-3xl bg-black/40 px-8 text-zinc-100 outline-none placeholder:text-zinc-600 border border-white/5 focus:border-primary/50 text-lg font-medium"
                        onKeyDown={(e) => e.key === 'Enter' && handleInternalSubmit()}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        {uploadedFile && (
                          <Badge variant="secondary" className="bg-primary/20 text-primary-foreground border-primary/30 h-9 px-3 rounded-xl backdrop-blur-sm">
                            <span className="max-w-[80px] truncate text-[10px] font-bold uppercase">{uploadedFile.name}</span>
                            <X className="h-3 w-3 ml-2 cursor-pointer" onClick={(e) => { e.stopPropagation(); setUploadedFile(null); }} />
                          </Badge>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleFileIconClick('file1')} className="rounded-xl text-zinc-500 hover:text-white h-10 w-10">
                          <Paperclip className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>

                    {isCompareMode && (
                      <div className="relative flex-1">
                        <input
                          placeholder="Second topic..."
                          value={topic2}
                          onChange={(e) => setTopic2(e.target.value)}
                          className="w-full h-16 rounded-3xl bg-black/40 px-8 text-zinc-100 outline-none placeholder:text-zinc-600 border border-white/5 focus:border-primary/50 text-lg font-medium"
                          onKeyDown={(e) => e.key === 'Enter' && handleInternalSubmit()}
                        />
                         <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            {uploadedFile2 && (
                              <Badge variant="secondary" className="bg-primary/20 text-primary-foreground border-primary/30 h-9 px-3 rounded-xl backdrop-blur-sm">
                                <span className="max-w-[80px] truncate text-[10px] font-bold uppercase">{uploadedFile2.name}</span>
                                <X className="h-3 w-3 ml-2 cursor-pointer" onClick={(e) => { e.stopPropagation(); setUploadedFile2(null); }} />
                              </Badge>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => handleFileIconClick('file2')} className="rounded-xl text-zinc-500 hover:text-white h-10 w-10">
                              <Paperclip className="h-5 w-5" />
                            </Button>
                          </div>
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={handleInternalSubmit}
                    disabled={isGenerating || (!topic && !uploadedFile)}
                    className="h-16 w-16 rounded-3xl bg-primary text-white shadow-lg flex items-center justify-center p-0 shrink-0"
                  >
                    {isGenerating ? <Loader2 className="w-6 h-6 animate-spin" /> : <ArrowUp className="w-7 h-7" />}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
        <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileUpload} />
      </motion.div>
    </section>
  );
}

// ---------- ROOT COMPONENT ----------
export default function Home() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [lang, setLang] = useState('en');
  const [depth, setDepth] = useState('auto');
  const [depthSuggestion, setDepthSuggestion] = useState<any>(null);
  const [persona, setPersona] = useState('teacher');
  const [activeMode, setActiveMode] = useState<'single' | 'compare' | 'multi'>('single');
  const [topic, setTopic] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const supabase = getSupabaseClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const languageSelectRef = useRef<HTMLButtonElement>(null);

  const { trackGenerationStart } = useAITracking();
  const { trackPageView } = useSessionTracking(user?.id);

  useEffect(() => {
    trackPageView('Home');
  }, [trackPageView]);

  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const handleScroll = () => setShowScrollTop(container.scrollTop > 400);
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const handleGenerate = async (topic: string, fileInfo?: any) => {
    setIsGenerating(true);
    let resolvedDepth = depth === 'auto' ? resolveDepthWithConfidence(topic).depth : depth;
    if (fileInfo?.type && SOURCE_DEPTH_PRESETS[fileInfo.type]) resolvedDepth = SOURCE_DEPTH_PRESETS[fileInfo.type];

    const websiteRegex = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    const trimmed = topic.trim();

    if (youtubeRegex.test(trimmed)) {
      const sessionId = `yt-${Date.now()}`;
      safeSetItem(`session-type-${sessionId}`, 'youtube');
      safeSetItem(`session-content-${sessionId}`, { file: trimmed, text: '' });
      router.push(`/canvas?sessionId=${sessionId}&lang=${lang}&depth=${SOURCE_DEPTH_PRESETS.youtube}&persona=${persona}`);
      return;
    }

    if (websiteRegex.test(trimmed)) {
      const sessionId = `web-${Date.now()}`;
      safeSetItem(`session-type-${sessionId}`, 'website');
      safeSetItem(`session-content-${sessionId}`, { file: trimmed, text: '' });
      router.push(`/canvas?sessionId=${sessionId}&lang=${lang}&depth=${SOURCE_DEPTH_PRESETS.website}&persona=${persona}`);
      return;
    }

    if (fileInfo) {
      const sessionId = `vision-${Date.now()}`;
      
      trackGenerationStart(sessionId, {
        sourceType: fileInfo.type as any,
        mode: 'single',
        depth: resolvedDepth as any,
        persona,
        userId: user?.id
      });

      safeSetItem(`session-type-${sessionId}`, fileInfo.type);
      safeSetItem(`session-content-${sessionId}`, { file: fileInfo.content, text: topic, originalFile: fileInfo.originalContent });
      router.push(`/canvas?sessionId=${sessionId}&lang=${lang}&depth=${resolvedDepth}&persona=${persona}`);
      return;
    }

    const genId = `text-${Date.now()}`;
    trackGenerationStart(genId, {
      sourceType: 'text',
      mode: 'single',
      depth: resolvedDepth as any,
      persona,
      userId: user?.id
    });

    router.push(`/canvas?topic=${encodeURIComponent(topic)}&lang=${lang}&depth=${resolvedDepth}&persona=${persona}`);
  };

  const handleCompare = (t1: string, t2: string, f1?: any, f2?: any) => {
    setIsGenerating(true);
    const genId = `comp-${Date.now()}`;
    
    trackGenerationStart(genId, {
      sourceType: (f1 || f2) ? 'image' : 'text', // simplified for tracking
      mode: 'compare',
      depth: 'medium',
      persona,
      userId: user?.id
    });

    if (f1 || f2) {
      // Use session storage for comparison with files
      safeSetItem(`session-type-${genId}`, 'compare');
      safeSetItem(`session-content-${genId}`, { 
        topic1: t1, 
        topic2: t2, 
        file1: f1?.content, 
        file2: f2?.content,
        file1Type: f1?.type,
        file2Type: f2?.type
      });
      router.push(`/canvas?sessionId=${genId}&lang=${lang}&depth=balanced&persona=${persona}`);
    } else {
      router.push(`/canvas?topic1=${encodeURIComponent(t1)}&topic2=${encodeURIComponent(t2)}&lang=${lang}&depth=balanced&persona=${persona}`);
    }
  };

  const handleMultiGenerate = (merged: string, t: string) => {
    setIsGenerating(true);
    const sessionId = `multi-${Date.now()}`;
    trackGenerationStart(sessionId, {
      sourceType: 'multi',
      mode: 'multi',
      depth: 'deep',
      persona,
      userId: user?.id
    });
    safeSetItem(`session-type-${sessionId}`, 'multi');
    safeSetItem(`session-content-${sessionId}`, { file: merged, text: t });
    router.push(`/canvas?sessionId=${sessionId}&lang=${lang}&depth=detailed&persona=${persona}`);
  };

  return (
    <div ref={scrollRef} className="min-h-screen flex flex-col bg-[#0A0A0A] overflow-y-auto overflow-x-hidden relative">
      <Hero 
        onGenerate={handleGenerate} 
        onCompare={handleCompare} 
        onMultiGenerate={handleMultiGenerate}
        lang={lang} setLang={setLang} depth={depth} setDepth={setDepth}
        persona={persona} setPersona={setPersona} isGenerating={isGenerating}
        languageSelectRef={languageSelectRef} fileInputRef={fileInputRef}
        onActiveModeChange={setActiveMode} topic={topic} setTopic={setTopic}
        depthSuggestion={depthSuggestion}
      />

      <div className="relative z-10 space-y-12 pb-24">
         <SectionContainer className="bg-white/[0.02] border-y border-white/5">
            <div className="max-w-4xl mx-auto text-center space-y-6">
                <h2 className="text-3xl font-bold text-white mb-6">About MindScape</h2>
                <p className="text-zinc-400 text-lg leading-relaxed">
                    MindScape is a <strong className="text-zinc-200">Visual Intelligence Engine</strong> built for researchers, students, and professionals to combat information overload. Instead of flat text summaries, it converts complex sources into explorable, interconnected knowledge graphs.
                </p>
                <p className="text-zinc-400 text-lg leading-relaxed">
                    Powered by a unique deterministic pre-processing step (SKEE), MindScape guarantees structural accuracy before AI synthesis begins. This ensures that the generated mind maps are not just creative, but rigidly aligned with the source material's true hierarchy and intent.
                </p>
            </div>
         </SectionContainer>

         <SectionContainer 
            title="What MindScape Does" 
            subtitle="Built to handle complex information processing, converting noise into highly structured visual intelligence."
         >
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <FeatureBlock 
                    icon={Network} 
                    title="Knowledge Graphs" 
                    valueProp="Transform dense documents into explorable visual graphs." 
                    outcomes={["Interactive mapping", "Automatic grouping", "Visual relationship linking"]} 
                    iconColorClass="text-violet-400"
                    iconBgClass="bg-violet-500/10"
                />
                <FeatureBlock 
                    icon={GitBranch} 
                    title="Compare Mode" 
                    valueProp="Analyze overlapping concepts between two disparate topics." 
                    outcomes={["Side-by-side analysis", "Highlight structural differences", "Unified output generation"]} 
                    iconColorClass="text-sky-400"
                    iconBgClass="bg-sky-500/10"
                />
                <FeatureBlock 
                    icon={Gauge} 
                    title="Deterministic Structuring" 
                    valueProp="SKEE extracts pure structure before AI generation." 
                    outcomes={["High accuracy extraction", "No hallucinated headings", "Consistent hierarchy"]} 
                    iconColorClass="text-emerald-400"
                    iconBgClass="bg-emerald-500/10"
                />
                <FeatureBlock 
                    icon={FastForward} 
                    title="Multi-Depth Exploration" 
                    valueProp="Toggle between quick summaries and deep-dive analysis." 
                    outcomes={["Adjustable verbosity", "Macro to micro zooming", "On-demand detail expansion"]} 
                    iconColorClass="text-amber-400"
                    iconBgClass="bg-amber-500/10"
                />
                <FeatureBlock 
                    icon={Share2} 
                    title="Share & Collaborate" 
                    valueProp="Export maps to community or share permanent links." 
                    outcomes={["1-click publish", "Public knowledge links", "Community gallery"]} 
                    iconColorClass="text-pink-400"
                    iconBgClass="bg-pink-500/10"
                />
                <FeatureBlock 
                    icon={Layers} 
                    title="Multi-Source Knowledge Mapping" 
                    valueProp="Combine PDFs, links, and text into one unified graph." 
                    outcomes={["Cross-document linking", "Automated merging", "Holistic topic overview"]} 
                    iconColorClass="text-rose-400"
                    iconBgClass="bg-rose-500/10"
                />
            </div>
         </SectionContainer>

         <SectionContainer 
            title="How It Works" 
            subtitle="A deterministic pipeline designed for maximum accuracy."
         >
            <div className="grid md:grid-cols-4 gap-8">
                <ProcessStep 
                    stepNumber={1} 
                    icon={Paperclip} 
                    title="Input Processing" 
                    explanation="Ingest and merge PDFs, images, websites, and text via useMultiSource." 
                    microDetail="MULTI-SOURCE INGESTION"
                />
                <ProcessStep 
                    stepNumber={2} 
                    icon={Gauge} 
                    title="Knowledge Engine" 
                    explanation="Deterministic code extracts headings, sections, and keywords." 
                    microDetail="DETERMINISTIC EXTRACTION"
                />
                <ProcessStep 
                    stepNumber={3} 
                    icon={Sparkles} 
                    title="AI Synthesis" 
                    explanation="OpenRouter Agent generates structured mind map schemas from context." 
                    microDetail="STREAMING GENERATION"
                />
                <ProcessStep 
                    stepNumber={4} 
                    icon={Network} 
                    title="Visual Rendering" 
                    explanation="Explore the interactive knowledge graph with nested nodes and chat." 
                    microDetail="REACTFLOW UI"
                    isLast={true}
                />
            </div>
         </SectionContainer>
      </div>

      <AnimatePresence>
        {showScrollTop && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-28 right-8 z-[100]">
            <Button onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })} className="group flex flex-col items-center gap-1 h-20 w-14 rounded-full bg-primary text-white shadow-2xl p-0">
              <ArrowUp className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
              <span className="text-[9px] font-black uppercase tracking-tighter">GO TOP</span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <button onClick={() => setIsChatOpen(true)} className="fixed bottom-6 right-6 rounded-full bg-primary p-4 text-white shadow-2xl transition-transform hover:scale-110 active:scale-95 z-50">
        <Sparkles className="h-6 w-6" />
      </button>

      <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} topic={topic} />
      <OnboardingWizard />
    </div>
  );
}
