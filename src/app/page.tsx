
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
  { id: 'teacher', label: 'Teacher', icon: UserRound, color: 'text-blue-400', description: 'Explains concepts with detailed examples and educational step-by-step guidance.' },
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
  onMultiSourceTrigger?: () => void;
  topic: string;
  setTopic: (topic: string) => void;
  depthSuggestion: { depth: 'low' | 'medium' | 'deep'; confidence: number; reasons: string[]; suggestedItems: { min: number; max: number; label: string } } | null;
}) {
  // Web search is always enabled for real-time information
  const useSearch = true;
  const router = useRouter();
  const [topic2, setTopic2] = useState('');
  const [activeMode, setActiveMode] = useState<'single' | 'compare' | 'multi'>('single');
  const isCompareMode = activeMode === 'compare';
  const isMultiMode = activeMode === 'multi';

  const handleModeChange = (mode: 'single' | 'compare' | 'multi') => {
    setActiveMode(mode);
    onActiveModeChange(mode);
  };

  const { toast } = useToast();
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    type: 'text' | 'pdf' | 'image';
    content: string;
    originalContent?: string;
  } | null>(null);
  const [uploadedFile2, setUploadedFile2] = useState<{
    name: string;
    type: 'text' | 'pdf' | 'image';
    content: string;
    originalContent?: string;
  } | null>(null);
  const [uploadTarget, setUploadTarget] = useState<'file1' | 'file2'>('file1');

  const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number } | null>(null);
  const [openSelect, setOpenSelect] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const { user } = useUser();
  const { config } = useAIConfig();
  const isSetupComplete = !!user && config?.pollinationsApiKey;

  const {
    sources,
    addSource,
    addFile,
    removeSource,
    isProcessing,
    buildPayload,
    contextUsage,
    canGenerate,
    clearSources
  } = useMultiSource({
    apiKey: config.pollinationsApiKey,
    userId: user?.uid
  });

  const handleGenerateClick = async () => {
    if (!isSetupComplete) {
      window.dispatchEvent(new CustomEvent(TRIGGER_ONBOARDING_EVENT));
      return;
    }
    const payload = await buildPayload();
    if (payload) {
      onMultiGenerate(payload, topic);
    }
  };

  // Trigger generation when a file is uploaded (Single Mode Only)
  useEffect(() => {
    if (uploadedFile && activeMode === 'single') {
      if (!isSetupComplete) {
        window.dispatchEvent(new CustomEvent(TRIGGER_ONBOARDING_EVENT));
        return;
      }
      onGenerate(topic, uploadedFile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedFile, activeMode]);

  const handleInternalSubmit = () => {
    if (!isSetupComplete) {
      window.dispatchEvent(new CustomEvent(TRIGGER_ONBOARDING_EVENT));
      return;
    }

    if (isCompareMode) {
      if (!topic.trim() && !uploadedFile && !topic2.trim() && !uploadedFile2) {
        toast({
          variant: 'destructive',
          title: 'Topics Required',
          description: 'Please enter topics or attach files for comparison.',
        });
        return;
      }
      
      // If files are attached, we use their content as the base topic
      const finalTopic1 = uploadedFile ? (topic ? `${topic}\n\n[Content from ${uploadedFile.name}]: ${uploadedFile.content}` : uploadedFile.content) : topic;
      const finalTopic2 = uploadedFile2 ? (topic2 ? `${topic2}\n\n[Content from ${uploadedFile2.name}]: ${uploadedFile2.content}` : uploadedFile2.content) : topic2;
      
      onCompare(finalTopic1, finalTopic2);
    } else {
      if (!topic && !uploadedFile) return;
      // For file uploads in single mode, generation is triggered by the useEffect
      if (!uploadedFile) {
        onGenerate(topic);
      } else {
        onGenerate(topic, {
          name: uploadedFile.name,
          type: uploadedFile.type,
          content: uploadedFile.content,
          originalContent: uploadedFile.originalContent
        });
      }
    }
  };

  const handleFileIconClick = (target: 'file1' | 'file2' = 'file1') => {
    setUploadTarget(target);
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (activeMode === 'multi') {
      const files = Array.from(event.target.files || []);
      files.forEach(f => addFile(f));
      event.target.value = '';
      return;
    }

    try {
      let content = '';
      let type: 'text' | 'pdf' | 'image' = 'text';

      if (file.type.startsWith('image/')) {
        // Enforce 2MB limit for images to prevent memory bloat and session storage limits
        if (file.size > 2 * 1024 * 1024) {
          toast({
            title: "Image Too Large",
            description: "Please upload an image smaller than 2MB.",
            variant: "destructive"
          });
          return;
        }

        type = 'image';
        content = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        
        if (uploadTarget === 'file2') setUploadedFile2({ name: file.name, type, content });
        else setUploadedFile({ name: file.name, type, content });
      } else if (file.type === 'application/pdf') {
        type = 'pdf';
        const arrayBuffer = await file.arrayBuffer();
        setPdfProgress({ current: 0, total: 1 });

        try {
          const { content: cleanedText } = await parsePdfContent(
            arrayBuffer,
            (progress) => setPdfProgress(progress),
            100000
          );
          const originalPdfDataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });

          setPdfProgress(null);
          const pdfData = {
            name: file.name,
            type: 'pdf' as const,
            content: cleanedText,
            originalContent: originalPdfDataUrl
          };
          
          if (uploadTarget === 'file2') setUploadedFile2(pdfData);
          else setUploadedFile(pdfData);
        } catch (err: any) {
          console.error("PDF Parsing error:", err);
          setPdfProgress(null);
          toast({
            title: "PDF Parse Failed",
            description: err.message || "Could not parse PDF.",
            variant: "destructive"
          });
        }
        return;
      } else {
        content = await file.text();
        const textData = { name: file.name, type: 'text' as const, content };
        if (uploadTarget === 'file2') setUploadedFile2(textData);
        else setUploadedFile(textData);
      }

    } catch (err) {
      console.error('Error uploading file:', err);
      toast({ title: "Upload Failed", description: "Could not process file.", variant: "destructive" });
      setPdfProgress(null);
    }
  };

  const handleRemoveFile = (e: React.MouseEvent, target: 'file1' | 'file2' = 'file1') => {
    e.stopPropagation();
    if (target === 'file1') {
      setUploadedFile(null);
    } else {
      setUploadedFile2(null);
    }
    setPdfProgress(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <section className="relative mx-auto max-w-7xl px-6 pt-[58px] pb-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-center text-center"
      >
        <Badge variant="outline" className="mb-6 px-4 py-1.5 border-primary/30 bg-primary/5 text-primary-foreground animate-fade-in backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 mr-2" />
          Next-Gen AI Mind Mapping
        </Badge>

        {!isSetupComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4"
          >
            <button
              onClick={() => window.dispatchEvent(new CustomEvent(TRIGGER_ONBOARDING_EVENT))}
              className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-black uppercase tracking-widest text-amber-500 hover:bg-amber-500/20 transition-all"
            >
              <Zap className="w-3 h-3 animate-pulse" />
              Complete Setup to Generate
            </button>
          </motion.div>
        )}

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60"
        >
          Everything starts with <br />
          <span className="text-primary">a thought.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          className="text-zinc-400 text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed"
        >
          MindScape transforms your unstructured ideas into clear, explorable knowledge through intelligent AI-powered visualization.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-4xl mx-auto relative group"
        >

          <div className="relative rounded-[2.5rem] border border-white/10 bg-zinc-900/60 backdrop-blur-3xl p-2 shadow-2xl ring-1 ring-white/10 overflow-hidden group-focus-within:border-primary/30 transition-all duration-300">
            {/* Subtle top highlight */}
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

            <div className="flex flex-col gap-2">
              {/* Toolbar Section: Modes & Settings */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-3 pt-2 pb-1">
                {/* Mode Selector */}
                <div className="flex items-center gap-1 p-1 bg-black/40 rounded-full border border-white/5 backdrop-blur-md">
                  {[
                    { id: 'single', label: 'Single' },
                    { id: 'compare', label: 'Compare' },
                    { id: 'multi', label: 'Multi-Source' }
                  ].map((mode) => (
                    <Button
                      key={mode.id}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "rounded-full text-[10px] font-extrabold tracking-widest uppercase px-5 h-8 transition-all duration-500 border relative",
                        activeMode === mode.id
                          ? "bg-primary/10 border-primary/50 shadow-[0_0_15px_rgba(139,92,246,0.15)] text-white scale-105"
                          : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                      )}
                      onClick={() => handleModeChange(mode.id as any)}
                    >
                      {mode.label}
                    </Button>
                  ))}
                </div>

                {/* Settings Controls */}
                <div className="flex items-center gap-2">
                  <Select value={depth} onValueChange={setDepth} open={openSelect === 'depth'} onOpenChange={(open) => {
                    if (open) setOpenSelect('depth');
                    else if (openSelect === 'depth') setOpenSelect(null);
                  }}>
                    <SelectTrigger className="w-auto h-9 border border-white/5 bg-black/40 text-[10px] font-black uppercase tracking-widest text-zinc-400 rounded-full hover:bg-black/60 hover:text-primary transition-all group px-4 focus:ring-0 focus:ring-offset-0 focus:outline-none">
                      {(() => {
                        const active = DEPTHS.find(d => d.id === depth);
                        if (!active) {
                          return (
                            <>
                              <List className="w-3.5 h-3.5 mr-2 group-hover:scale-110 transition-transform" />
                              <span>Depth</span>
                            </>
                          );
                        }
                        if (depth === 'auto' && depthSuggestion) {
                          const suggestedLabel = getDepthLabel(depthSuggestion.depth);
                          const suggestedColor = getDepthColor(depthSuggestion.depth);
                          return (
                            <>
                              <Sparkles className="w-3.5 h-3.5 mr-2 group-hover:scale-110 transition-transform text-pink-400" />
                              <span>Auto</span>
                              <span className="ml-1.5 text-[9px] opacity-60">({suggestedLabel} {depthSuggestion.confidence}%)</span>
                            </>
                          );
                        }
                        return (
                          <>
                            <active.icon className={cn("w-3.5 h-3.5 mr-2 group-hover:scale-110 transition-transform", active.color)} />
                            <span>{active.label}</span>
                          </>
                        );
                      })()}
                    </SelectTrigger>
                    <SelectContent className="glassmorphism border-white/10 min-w-[200px]" position="popper">
                      <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1 border-b border-white/5">Exploration Depth</div>
                      {DEPTHS.map((d) => (
                        <SelectItem
                          key={d.id}
                          value={d.id}
                          hideIndicator
                          className="w-full cursor-pointer py-3 px-3 mb-1 last:mb-0 rounded-xl border border-transparent focus:bg-white/5 data-[state=checked]:bg-primary/10 data-[state=checked]:border-primary/50 data-[state=checked]:shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                        >
                          <div className="flex flex-col items-start gap-1.5 w-full text-left">
                            <div className="flex items-center gap-2 w-full">
                              <d.icon className={cn("w-4 h-4", d.color)} />
                              <span className="font-bold tracking-wide uppercase text-[11px]">{d.label}</span>
                              {d.id === 'auto' && depthSuggestion && (
                                <Badge variant="outline" className="ml-auto text-[8px] h-4 px-1.5 bg-pink-500/10 border-pink-500/30 text-pink-400">
                                  {depthSuggestion.confidence}% conf
                                </Badge>
                              )}
                              {/* #7 — Show mismatch hint on manual depth options */}
                              {d.id !== 'auto' && depthSuggestion && depth !== 'auto' && depthSuggestion.depth !== d.id && d.id === depth && (
                                <Badge variant="outline" className="ml-auto text-[8px] h-4 px-1.5 bg-amber-500/10 border-amber-500/30 text-amber-400">
                                  AI suggests {getDepthLabel(depthSuggestion.depth)}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-zinc-400 font-normal leading-relaxed whitespace-normal normal-case tracking-normal">
                              {d.description}
                            </p>
                            {d.id === 'auto' && depthSuggestion && depthSuggestion.reasons.length > 0 && (
                              <div className="mt-1 pt-1 border-t border-white/5 w-full">
                                <div className="flex items-center gap-1 text-[9px] text-zinc-500">
                                  <Gauge className="w-3 h-3" />
                                  <span className="font-medium">Detected: </span>
                                  <span className={getDepthColor(depthSuggestion.depth)}>{getDepthLabel(depthSuggestion.depth)}</span>
                                  <span className="text-zinc-600">•</span>
                                  <span className="text-zinc-500">{depthSuggestion.reasons[0]}</span>
                                </div>
                                <div className="flex items-center gap-1 mt-0.5 text-[9px] text-zinc-600">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  <span>~{depthSuggestion.suggestedItems.min}-{depthSuggestion.suggestedItems.max} items</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={persona} onValueChange={setPersona} open={openSelect === 'persona'} onOpenChange={(open) => {
                    if (open) setOpenSelect('persona');
                    else if (openSelect === 'persona') setOpenSelect(null);
                  }}>
                    <SelectTrigger className="w-auto h-9 border border-white/5 bg-black/40 text-[10px] font-black uppercase tracking-widest text-zinc-400 rounded-full hover:bg-black/60 hover:text-primary transition-all group px-4 focus:ring-0 focus:ring-offset-0 focus:outline-none">
                      {(() => {
                        const active = PERSONAS.find(p => p.id === persona);
                        if (!active) {
                          return (
                            <>
                              <Bot className="w-3.5 h-3.5 mr-2 group-hover:scale-110 transition-transform" />
                              <span>Persona</span>
                            </>
                          );
                        }
                        return (
                          <>
                            <active.icon className={cn("w-3.5 h-3.5 mr-2 group-hover:scale-110 transition-transform", active.color)} />
                            <span>{active.label}</span>
                          </>
                        );
                      })()}
                    </SelectTrigger>
                    <SelectContent className="glassmorphism border-white/10 min-w-[160px]" position="popper">
                      <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1 border-b border-white/5">AI Persona</div>
                      {PERSONAS.map((p) => (
                        <SelectItem
                          key={p.id}
                          value={p.id}
                          hideIndicator
                          className="w-full cursor-pointer py-3 px-3 mb-1 last:mb-0 rounded-xl border border-transparent focus:bg-white/5 data-[state=checked]:bg-primary/10 data-[state=checked]:border-primary/50 data-[state=checked]:shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                        >
                          <div className="flex flex-col items-start gap-1.5 w-full text-left">
                            <div className="flex items-center gap-2 w-full">
                              <p.icon className={cn("w-4 h-4", p.color)} />
                              <span className="font-bold tracking-wide uppercase text-[11px]">{p.label}</span>
                            </div>
                            <p className="text-[10px] text-zinc-400 font-normal leading-relaxed whitespace-normal normal-case tracking-normal line-clamp-2">
                              {p.description}
                            </p>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={lang} onValueChange={setLang} open={openSelect === 'lang'} onOpenChange={(open) => {
                    if (open) setOpenSelect('lang');
                    else if (openSelect === 'lang') setOpenSelect(null);
                  }}>
                    <SelectTrigger
                      ref={languageSelectRef}
                      className="w-auto h-9 border border-white/5 bg-black/40 text-[10px] font-black uppercase tracking-widest text-zinc-400 rounded-full hover:bg-black/60 hover:text-primary transition-all group px-4 focus:ring-0 focus:ring-offset-0 focus:outline-none"
                    >
                      <Globe className="w-3.5 h-3.5 mr-2 group-hover:scale-110 transition-transform" />
                      <SelectValue placeholder="Language" />
                    </SelectTrigger>
                    <SelectContent className="glassmorphism border-white/10 max-h-[300px]" position="popper">
                      {languages.map((language) => (
                        <SelectItem
                          key={language.code}
                          value={language.code}
                          hideIndicator
                          className="w-full cursor-pointer py-2.5 px-3 mb-1 last:mb-0 rounded-xl border border-transparent focus:bg-white/5 data-[state=checked]:bg-primary/10 data-[state=checked]:border-primary/50 text-[10px] font-bold uppercase tracking-wider transition-all"
                        >
                          <div className="flex items-center gap-2 w-full">
                            <span className={cn("inline-flex w-1.5 h-1.5 rounded-full", lang === language.code ? "bg-primary shadow-[0_0_8px_rgba(139,92,246,0.6)]" : "bg-zinc-600")} />
                            {language.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Input Section */}
              <div className="p-2 relative">
                <AnimatePresence mode="wait">
                  {activeMode === 'multi' ? (
                    <motion.div
                      key="multi-input"
                      initial={{ opacity: 0, scale: 0.98, y: 5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98, y: -5 }}
                      transition={{ duration: 0.3 }}
                      className="flex flex-col gap-4"
                    >
            <MultiSourceInput
              onAdd={addSource}
              isGenerating={isGenerating} // Removed isProcessing
              onGenerate={handleGenerateClick}
              onAttachFile={handleFileIconClick}
              canGenerate={canGenerate}
              sourceCount={sources.length}
            />
                      <SourcePillList
                        sources={sources}
                        onRemove={removeSource}
                        onClearAll={clearSources}
                        contextUsage={contextUsage}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="single-compare-input"
                      initial={{ opacity: 0, scale: 0.98, y: 5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98, y: -5 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="relative flex items-center gap-2">
                        <div className={cn(
                          "relative flex-1 group/input flex transition-all duration-500",
                          isCompareMode ? "flex-col sm:flex-row gap-3" : "flex-row"
                        )}>
                          <div className="relative flex-1">
                            <input
                              autoFocus
                              placeholder={isCompareMode ? 'First topic...' : uploadedFile ? 'Add context for the file...' : 'What sparks your curiosity today?'}
                              value={topic}
                              onChange={(e) => setTopic(e.target.value)}
                              className={cn(
                                "w-full h-16 rounded-3xl bg-black/40 px-8 text-zinc-100 outline-none placeholder:text-zinc-600 border border-white/5 focus:border-primary/50 focus:bg-black/60 transition-all text-lg font-medium",
                                !isCompareMode ? "pr-40" : "pr-8"
                              )}
                              disabled={isGenerating}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleInternalSubmit();
                              }}
                            />

                            {/* Integrated File Upload Badge for Single/Compare Mode */}
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                <AnimatePresence>
                                  {pdfProgress ? (
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.8, x: 10 }}
                                      animate={{ opacity: 1, scale: 1, y: 0 }}
                                      exit={{ opacity: 0, scale: 0.8, x: 10 }}
                                    >
                                      <Badge variant="secondary" className="bg-primary/20 text-primary-foreground border-primary/30 h-9 px-3 rounded-xl backdrop-blur-sm gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span className="text-[10px] font-bold uppercase">
                                          {pdfProgress.total > 1 ? `Parsing ${pdfProgress.current}/${pdfProgress.total}` : 'Parsing...'}
                                        </span>
                                      </Badge>
                                    </motion.div>
                                  ) : uploadedFile && (
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.8, x: 10 }}
                                      animate={{ opacity: 1, scale: 1, y: 0 }}
                                      exit={{ opacity: 0, scale: 0.8, x: 10 }}
                                    >
                                      <Badge variant="secondary" className="bg-primary/20 text-primary-foreground border-primary/30 h-9 px-3 rounded-xl backdrop-blur-sm">
                                        <span className="max-w-[80px] truncate text-[10px] font-bold uppercase">{uploadedFile.name}</span>
                                        <button onClick={(e) => handleRemoveFile(e, 'file1')} className="ml-2 hover:text-white transition p-0.5 rounded-full hover:bg-white/10">
                                          <X className="h-3 w-3" />
                                        </button>
                                      </Badge>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleFileIconClick('file1')}
                                  disabled={isGenerating}
                                  className="rounded-xl text-zinc-500 hover:text-zinc-100 hover:bg-white/10 transition-all duration-300 h-10 w-10 flex items-center justify-center p-0"
                                >
                                  <Paperclip className="h-5 w-5" />
                                </Button>
                              </div>
                            </div>

                          {isCompareMode && (
                            <motion.div
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="flex-1 relative"
                            >
                              <input
                                placeholder={uploadedFile2 ? 'Add context for the file...' : "Second topic to compare..."}
                                value={topic2}
                                onChange={(e) => setTopic2(e.target.value)}
                                className="w-full h-16 rounded-3xl bg-black/40 px-8 pr-40 text-zinc-100 outline-none placeholder:text-zinc-600 border border-white/5 focus:border-primary/50 focus:bg-black/60 transition-all text-lg font-medium"
                                disabled={isGenerating}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleInternalSubmit();
                                }}
                              />
                              
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                <AnimatePresence>
                                  {uploadedFile2 && (
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.8, x: 10 }}
                                      animate={{ opacity: 1, scale: 1, y: 0 }}
                                      exit={{ opacity: 0, scale: 0.8, x: 10 }}
                                    >
                                      <Badge variant="secondary" className="bg-primary/20 text-primary-foreground border-primary/30 h-9 px-3 rounded-xl backdrop-blur-sm">
                                        <span className="max-w-[80px] truncate text-[10px] font-bold uppercase">{uploadedFile2.name}</span>
                                        <button onClick={(e) => handleRemoveFile(e, 'file2')} className="ml-2 hover:text-white transition p-0.5 rounded-full hover:bg-white/10">
                                          <X className="h-3 w-3" />
                                        </button>
                                      </Badge>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleFileIconClick('file2')}
                                  disabled={isGenerating}
                                  className="rounded-xl text-zinc-500 hover:text-zinc-100 hover:bg-white/10 transition-all duration-300 h-10 w-10 flex items-center justify-center p-0"
                                >
                                  <Paperclip className="h-5 w-5" />
                                </Button>
                              </div>
                            </motion.div>
                          )}
                        </div>

                        {/* Main Submit Button - Integrated on the Right */}
                        <Button
                          onClick={handleInternalSubmit}
                          disabled={isGenerating || (!topic && !uploadedFile)}
                          className={cn(
                            "h-16 w-16 rounded-3xl bg-primary text-white hover:brightness-110 hover:scale-105 active:scale-95 transition-all font-bold shadow-lg shadow-primary/30 flex items-center justify-center p-0",
                          )}
                        >
                          {isGenerating ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                          ) : (
                            <ArrowRight className="w-7 h-7" />
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileUpload}
            accept="image/*,application/pdf,.txt,.md"
            multiple={activeMode === 'multi'}
          />
        </motion.div>
      </motion.div>
    </section>
  );
}

// Loading state is now handled by target page skeletons (canvas/loading.tsx, etc.)

// ---------- ROOT COMPONENT ----------
export default function Home() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [lang, setLang] = useState('en');
  const [depth, setDepth] = useState('auto');
  const [depthSuggestion, setDepthSuggestion] = useState<{ depth: 'low' | 'medium' | 'deep'; confidence: number; reasons: string[]; suggestedItems: { min: number; max: number; label: string } } | null>(null);
  const [persona, setPersona] = useState('teacher');
  const [activeMode, setActiveMode] = useState<'single' | 'compare' | 'multi'>('single');
  const useSearch = true;
  const languageSelectRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useUser();
  const supabase = getSupabaseClient();
  const [topic, setTopic] = useState('');

  // Load user's saved preferences from Supabase
  useEffect(() => {
    if (!user) return;
    supabase.from('users').select('preferences').eq('id', user.id).single().then(({ data }) => {
      const prefs = data?.preferences;
      if (prefs?.defaultDepth) setDepth(prefs.defaultDepth);
      if (prefs?.defaultAIPersona) setPersona(prefs.defaultAIPersona.toLowerCase());
      if (prefs?.preferredLanguage) setLang(prefs.preferredLanguage);
    });
  }, [user]);



  useEffect(() => {
    const welcomeFlag = sessionStorage.getItem('welcome_back');
    if (welcomeFlag) {
      toast({
        title: 'Welcome!',
        description: 'You have been successfully logged in.',
      });
      sessionStorage.removeItem('welcome_back');
    }
  }, [toast]);

  useEffect(() => {
    // Lock scroll on single/compare mode, unlock on multi mode so pill list is reachable
    document.body.style.overflow = activeMode === 'multi' ? 'unset' : 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [activeMode]);

  useEffect(() => {
    if (depth === 'auto' && topic.trim().length >= 3) {
      const suggestion = resolveDepthWithConfidence(topic);
      setDepthSuggestion(suggestion);
    } else if (depth !== 'auto' && topic.trim().length >= 3) {
      // #7 — Show suggestion hint even on manual depth so user knows if they're under/over
      const suggestion = resolveDepthWithConfidence(topic);
      setDepthSuggestion(suggestion);
    } else {
      setDepthSuggestion(null);
    }
  }, [depth, topic]);


  const handleGenerate = async (
    topic: string,
    fileInfo?: { name: string; type: string; content: string; originalContent?: string }
  ) => {
    setIsGenerating(true);

    // #2 — Resolve 'auto' depth client-side before navigation so server never sees 'auto'
    let resolvedDepth = depth;
    if (depth === 'auto') {
      const suggestion = resolveDepthWithConfidence(topic);
      resolvedDepth = suggestion.depth;
    }

    // #6 — Override depth with source-type preset when a file is attached
    if (fileInfo?.type && SOURCE_DEPTH_PRESETS[fileInfo.type]) {
      resolvedDepth = SOURCE_DEPTH_PRESETS[fileInfo.type];
    }

    // Check if user is searching for "MindScape" itself
    const normalizedTopic = topic.toLowerCase().trim();
    if ((normalizedTopic === 'mindscape' || normalizedTopic === 'mindscape core architecture') && !fileInfo) {
      // Redirect to mindmap page with special flag
      router.push(`/canvas?selfReference=true&lang=${lang}`);
      return;
    }

    // NEW: Handle Website URL Detection (excluding YouTube which is handled below)
    const websiteRegex = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    const trimmedTopic = topic.trim();

    if (websiteRegex.test(trimmedTopic) && !youtubeRegex.test(trimmedTopic)) {
      // #6 — website preset
      const websiteDepth = SOURCE_DEPTH_PRESETS['website'];
      const timestamp = Date.now();
      const sessionId = `web-${timestamp}`;
      safeSetItem(`session-type-${sessionId}`, 'website');
      safeSetItem(`session-content-${sessionId}`, { file: trimmedTopic, text: '' });
      safeSetItem(`session-persona-${sessionId}`, persona);
      router.push(`/canvas?sessionId=${sessionId}&lang=${lang}&depth=${websiteDepth}&persona=${persona}`);
      return;
    }

    // NEW: Handle YouTube URL Detection
    if (youtubeRegex.test(trimmedTopic)) {
      // #6 — youtube preset
      const ytDepth = SOURCE_DEPTH_PRESETS['youtube'];
      const timestamp = Date.now();
      const sessionId = `yt-${timestamp}`;
      safeSetItem(`session-type-${sessionId}`, 'youtube');
      safeSetItem(`session-content-${sessionId}`, { file: trimmedTopic, text: '' });
      safeSetItem(`session-persona-${sessionId}`, persona);
      router.push(`/canvas?sessionId=${sessionId}&lang=${lang}&depth=${ytDepth}&persona=${persona}`);
      return;
    }

    if (fileInfo) {
      try {
        const timestamp = Date.now();
        const sessionId = `vision-${timestamp}`;
        const finalSessionType = fileInfo.type;
        const contentToStore = {
          file: fileInfo.content,
          text: topic,
          originalFile: fileInfo.originalContent
        };

        const result = safeSetItem(`session-content-${sessionId}`, contentToStore, STORAGE_LIMITS.SOFT_LIMIT_BYTES);
        if (!result.success) {
          toast({
            variant: 'destructive',
            title: 'File Too Large',
            description: result.warning || 'Content exceeds storage limits.',
          });
          setIsGenerating(false);
          return;
        }
        safeSetItem(`session-type-${sessionId}`, finalSessionType);
        safeSetItem(`session-persona-${sessionId}`, persona);

        router.push(`/canvas?sessionId=${sessionId}&lang=${lang}&depth=${resolvedDepth}&persona=${persona}`);
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'File Processing Error',
          description: error.message || 'Could not process the uploaded file.',
        });
        setIsGenerating(false);
      }
      return;
    }

    // Handle regular text-based generation
    const query = new URLSearchParams({ topic, lang, depth: resolvedDepth, persona, useSearch: useSearch.toString() }).toString();
    router.push(`/canvas?${query}`);
  };

  const handleCompare = (topic1: string, topic2: string) => {
    setIsGenerating(true);
    // #2 — resolve auto before compare navigation
    let resolvedDepth = depth;
    if (depth === 'auto') {
      const suggestion = resolveDepthWithConfidence(`${topic1} vs ${topic2}`);
      resolvedDepth = suggestion.depth;
    }
    const query = new URLSearchParams({ topic1, topic2, lang, depth: resolvedDepth, persona, useSearch: useSearch.toString() }).toString();
    router.push(`/canvas?${query}`);
  };

  const handleMultiGenerate = async (mergedContent: string, topic: string) => {
    setIsGenerating(true);
    // #6 — multi-source always uses deep
    const multiDepth = SOURCE_DEPTH_PRESETS['multi'];
    const timestamp = Date.now();
    const sessionId = `multi-${timestamp}`;

    const contentToStore = {
      file: mergedContent,
      text: topic
    };

    const result = safeSetItem(`session-content-${sessionId}`, contentToStore, STORAGE_LIMITS.SOFT_LIMIT_BYTES);
    if (!result.success) {
      toast({
        variant: 'destructive',
        title: 'Content Too Large',
        description: result.warning || 'Multi-source content exceeds storage limits.',
      });
      setIsGenerating(false);
      return;
    }
    safeSetItem(`session-type-${sessionId}`, 'multi');
    safeSetItem(`session-persona-${sessionId}`, persona);

    router.push(`/canvas?sessionId=${sessionId}&lang=${lang}&depth=${multiDepth}&persona=${persona}`);
  };


  return (
    <div className={cn(
      "h-[calc(100dvh-5rem)] flex flex-col",
      activeMode === 'multi' ? 'overflow-y-auto' : 'overflow-hidden'
    )}>

      <Hero
        onGenerate={handleGenerate}
        onCompare={handleCompare}
        onMultiGenerate={handleMultiGenerate}
        lang={lang}
        setLang={setLang}
        depth={depth}
        setDepth={setDepth}
        persona={persona}
        setPersona={setPersona}
        isGenerating={isGenerating}
        languageSelectRef={languageSelectRef}
        fileInputRef={fileInputRef}
        onActiveModeChange={setActiveMode}
        topic={topic}
        setTopic={setTopic}
        depthSuggestion={depthSuggestion}
      />

      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-white shadow-lg transition-transform hover:scale-110"
        aria-label="Open AI Chat Assistant"
      >
        <Sparkles className="h-6 w-6" />
      </button>
      <ChatPanel
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        topic="General Conversation"
      />
    </div>
  );
}
