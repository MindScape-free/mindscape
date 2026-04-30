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
  FileText
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { parsePdfContent } from '@/lib/pdf-processor';
import { safeSetItem, safeGetItem, safeRemoveItem, STORAGE_LIMITS } from '@/lib/storage';
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

import dynamic from 'next/dynamic';
import { useMultiSource } from '@/hooks/use-multi-source';
import { MultiSourceInput } from '@/components/mind-map/MultiSourceInput';
import { SourcePillList } from '@/components/mind-map/SourcePillList';
import { resolveDepthWithConfidence, getDepthLabel, getDepthColor } from '@/lib/depth-analysis';

// #6 — Source-type depth presets
const SOURCE_DEPTH_PRESETS: Record<string, 'low' | 'medium' | 'deep'> = {
  pdf:     'deep',
  youtube: 'medium',
  image:   'low',
  website: 'medium',
  text:    'medium',
  multi:   'deep',
};

const ChatPanel = dynamic(() => import('@/components/chat-panel').then(mod => mod.ChatPanel), {
  ssr: false,
  loading: () => null
});

const PERSONAS = [
  { id: 'teacher', label: 'Explain like a teacher', icon: UserRound, color: 'text-blue-400', description: 'Explains concepts with detailed examples and educational step-by-step guidance.' },
  { id: 'concise', label: 'Concise', icon: Zap, color: 'text-amber-400', description: 'Provides direct, short, and to-the-point answers without fluff.' },
  { id: 'creative', label: 'Creative', icon: Palette, color: 'text-pink-400', description: 'Uses imaginative and out-of-the-box thinking for brainstorming.' },
  { id: 'sage', label: 'Cognitive Sage', icon: Brain, color: 'text-purple-400', description: 'Deep, philosophical, and analytical thinker for complex problems.' }
];

const DEPTHS = [
  { id: 'low', label: 'Quick', icon: FastForward, color: 'text-green-400', description: 'Brief and fast overview.' },
  { id: 'medium', label: 'Balanced', icon: Scale, color: 'text-blue-400', description: 'Optimal mix of detail and brevity.' },
  { id: 'deep', label: 'Detailed', icon: BookOpen, color: 'text-purple-400', description: 'Comprehensive, in-depth exploration.' },
  { id: 'auto', label: 'Auto', icon: Sparkles, color: 'text-pink-400', description: 'AI decides the best depth based on topic complexity.' }
];

const fade = (delay = 0) => ({
    initial: { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.5, delay, ease: 'easeOut' },
});

const PIPELINE_STEPS = [
    { label: "Input", desc: "PDF, URL, Image or Text", icon: Paperclip },
    { label: "Structure", desc: "SKEE Deterministic Analysis", icon: GitBranch },
    { label: "AI Synthesis", desc: "Modular Pipeline Processing", icon: Sparkles },
    { label: "Knowledge Map", desc: "Interactive Visual Exploration", icon: Network }
];

const CORE_FEATURES = [
    {
      title: "Knowledge Graphs",
      desc: "Explore structured mind maps instead of flat summaries.",
      icon: Network,
      color: "text-violet-400 bg-violet-500/10"
    },
    {
      title: "Deterministic Analysis",
      desc: "SKEE extracts structure (headings, keywords) before AI generation.",
      icon: Gauge,
      color: "text-sky-400 bg-sky-500/10"
    },
    {
      title: "Adaptive Learning",
      desc: "Quizzes deepen weak areas automatically based on map content.",
      icon: GraduationCap,
      color: "text-emerald-400 bg-emerald-500/10"
    },
    {
      title: "Context-Aware Chat",
      desc: "Ask follow-up questions directly on your knowledge map.",
      icon: MessageSquare,
      color: "text-pink-400 bg-pink-500/10"
    },
    {
      title: "Multi-Source Synthesis",
      desc: "Combine PDFs, links, and notes into one unified knowledge graph.",
      icon: Layers,
      color: "text-amber-400 bg-amber-500/10"
    },
    {
      title: "Gamified Progress",
      desc: "XP, streaks, and ranks drive consistent learning behavior.",
      icon: Zap,
      color: "text-rose-400 bg-rose-500/10"
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
  onCompare: (topic1: string, topic2: string) => void;
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
    userId: user?.uid
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
      const finalTopic1 = uploadedFile ? (topic ? `${topic}\n\n[File]: ${uploadedFile.content}` : uploadedFile.content) : topic;
      const finalTopic2 = uploadedFile2 ? (topic2 ? `${topic2}\n\n[File]: ${uploadedFile2.content}` : uploadedFile2.content) : topic2;
      onCompare(finalTopic1, finalTopic2);
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
        if (file.size > 2 * 1024 * 1024) {
          toast({ title: "Image Too Large", description: "Max 2MB", variant: "destructive" });
          return;
        }
        type = 'image';
        content = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
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

        <motion.h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
          Turn complex information into <br />
          <span className="text-primary">structured knowledge.</span>
        </motion.h1>

        <motion.p className="text-zinc-400 text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed">
          Convert PDFs, videos, websites, and text into interactive mind maps using deterministic analysis + AI.
        </motion.p>

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
        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
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
      safeSetItem(`session-type-${sessionId}`, fileInfo.type);
      safeSetItem(`session-content-${sessionId}`, { file: fileInfo.content, text: topic, originalFile: fileInfo.originalContent });
      router.push(`/canvas?sessionId=${sessionId}&lang=${lang}&depth=${resolvedDepth}&persona=${persona}`);
      return;
    }

    router.push(`/canvas?topic=${encodeURIComponent(topic)}&lang=${lang}&depth=${resolvedDepth}&persona=${persona}`);
  };

  const handleCompare = (t1: string, t2: string) => {
    setIsGenerating(true);
    router.push(`/canvas?topic1=${encodeURIComponent(t1)}&topic2=${encodeURIComponent(t2)}&lang=${lang}&depth=medium&persona=${persona}`);
  };

  const handleMultiGenerate = (merged: string, t: string) => {
    setIsGenerating(true);
    const sessionId = `multi-${Date.now()}`;
    safeSetItem(`session-type-${sessionId}`, 'multi');
    safeSetItem(`session-content-${sessionId}`, { file: merged, text: t });
    router.push(`/canvas?sessionId=${sessionId}&lang=${lang}&depth=deep&persona=${persona}`);
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

      <div className="relative z-10 px-6 max-w-7xl mx-auto space-y-32 py-24">
         <section className="grid md:grid-cols-4 gap-4">
            {PIPELINE_STEPS.map((step, i) => (
                <div key={i} className="p-8 rounded-[2rem] border border-white/5 bg-white/[0.02] backdrop-blur-3xl text-center group hover:bg-white/[0.04] transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                        <step.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{step.label}</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">{step.desc}</p>
                </div>
            ))}
         </section>

         <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {CORE_FEATURES.map((f, i) => (
                <div key={i} className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-8 space-y-6 group">
                    <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg', f.color.split(' ')[1])}>
                        <f.icon className={cn('w-6 h-6', f.color.split(' ')[0])} />
                    </div>
                    <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors">{f.title}</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed">{f.desc}</p>
                </div>
            ))}
         </section>

         <section className="text-center">
            <Button 
                variant="ghost"
                onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                className="group flex flex-col items-center gap-4 text-zinc-500 hover:text-primary transition-all h-auto py-10 px-12 rounded-[3rem] border border-transparent hover:border-white/5"
            >
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <ArrowUp className="w-8 h-8 group-hover:-translate-y-2 transition-transform duration-500" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-[0.5em] opacity-50 group-hover:opacity-100 transition-opacity">Go to Input</span>
            </Button>
         </section>
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
