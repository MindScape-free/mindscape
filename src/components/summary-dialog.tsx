'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  X,
  Volume2,
  VolumeX,
  Download,
  Loader2,
  Music,
  List,
  AlignLeft,
  FastForward,
  Pause,
  Play,
  RotateCcw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function VoiceWaveform({ isPlaying }: { isPlaying: boolean }) {
  return (
    <div className="flex items-end gap-[3px] h-6 px-2">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div
          key={i}
          className={cn(
            "w-[3px] bg-gradient-to-t from-purple-500 to-pink-500 rounded-full transition-all duration-300",
            isPlaying ? "animate-pulse" : "h-1 opacity-30"
          )}
          style={{
            height: isPlaying ? `${Math.random() * 80 + 20}%` : '4px',
            animationDelay: `${i * 0.1}s`,
            animationDuration: isPlaying ? `${0.5 + Math.random()}s` : '0s'
          }}
        />
      ))}
    </div>
  );
}

interface SummaryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  summary: string;
  isLoading?: boolean;
  onReload?: () => void;
}

export function SummaryDialog({
  isOpen,
  onClose,
  title,
  summary,
  isLoading = false,
  onReload,
}: SummaryDialogProps) {
  const { toast } = useToast();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('male');
  const [viewMode, setViewMode] = useState<'paragraph' | 'bullets'>('bullets');
  const [speechRate, setSpeechRate] = useState(1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentCharIndex = useRef(0);
  const isInternalCancel = useRef(false);

  // Load voices dynamically
  useEffect(() => {
    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      // Filter for high-quality or preferred languages (English by default for this app)
      const filteredVoices = allVoices.filter(v => v.lang.includes('en')).sort((a, b) => a.name.localeCompare(b.name));
      setVoices(filteredVoices);

      // Set default voice if not set
      if (filteredVoices.length > 0 && selectedVoiceName === 'male') {
        const defaultMale = filteredVoices.find(v => v.name.includes('Male') || v.name.includes('David')) || filteredVoices[0];
        setSelectedVoiceName(defaultMale.name);
      }
    };

    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Stop speaking when dialog closes or component unmounts
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
    }
  }, [isOpen]);

  // Parse summary into bullets - Handle markdown lists and sentences
  const bulletPoints = summary
    .split(/\n/)
    .map(line => line.trim())
    .filter(line => line.startsWith('- ') || line.startsWith('* ') || line.match(/^\d+\./))
    .map(line => line.replace(/^[-*\d.]+\s+/, ''))
    .concat(
      // fallback to sentence splitting if no markdown bullets found
      summary.split(/\n/).every(line => !line.startsWith('- ') && !line.startsWith('* '))
        ? summary.split(/[.!?]/).map(s => s.trim()).filter(s => s.length > 20)
        : []
    )
    .filter(s => s.length > 0);

  // Pre-calculate clean text for stable indexing
  const cleanSummary = useMemo(() => {
    return summary.replace(/\*\*|\*|_|#/g, '');
  }, [summary]);

  const startSpeech = (startIndex: number = 0, rate: number = speechRate) => {
    if (typeof window === 'undefined' || !window.speechSynthesis || !cleanSummary) return;

    const remainingText = cleanSummary.substring(startIndex);

    if (!remainingText.trim()) {
      setIsSpeaking(false);
      currentCharIndex.current = 0;
      return;
    }

    const utterance = new SpeechSynthesisUtterance(remainingText);

    // Voice selection logic
    const selectedVoice = voices.find(v => v.name === selectedVoiceName);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.rate = rate;

    utterance.onstart = () => {
      // Once the new utterance starts, we can safely clear the internal cancel flag
      isInternalCancel.current = false;
    };

    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        currentCharIndex.current = startIndex + event.charIndex;
      }
    };

    utterance.onend = () => {
      if (isInternalCancel.current) return;

      if (window.speechSynthesis.speaking === false) {
        setIsSpeaking(false);
        currentCharIndex.current = 0;
      }
    };

    utterance.onerror = () => {
      if (isInternalCancel.current) return;

      setIsSpeaking(false);
      currentCharIndex.current = 0;
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const handleToggleSpeech = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      toast({
        variant: "destructive",
        title: "Speech Not Supported",
        description: "Your browser does not support text-to-speech.",
      });
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    currentCharIndex.current = 0;
    startSpeech(0);
  };

  const handleRateChange = (newRate: number) => {
    setSpeechRate(newRate);
    if (isSpeaking) {
      isInternalCancel.current = true;
      window.speechSynthesis.cancel();
      // Small timeout to allow the browser to process the cancel
      setTimeout(() => {
        startSpeech(currentCharIndex.current, newRate);
      }, 10);
    }
  };

  const handleDownloadMp3 = async () => {
    if (!summary) return;
    setIsDownloading(true);

    try {
      const blob = new Blob([summary], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/\s+/g, '_')}_Summary.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Summary Saved",
        description: "Your text summary has been downloaded.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Could not save the summary.",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg rounded-[2.5rem] glassmorphism p-0 shadow-2xl shadow-purple-900/40 border border-white/10 overflow-hidden outline-none ring-0" showCloseButton={false}>
        <DialogClose asChild>
          <Button variant="ghost" size="icon" className="rounded-full absolute top-5 right-5 z-20 hover:bg-white/10 text-zinc-400">
            <X className="h-4 w-4" />
          </Button>
        </DialogClose>

        {/* Minimalist Audio-First Header */}
        <div className="relative pt-8 pb-4 px-8 text-center bg-gradient-to-b from-purple-500/10 via-transparent to-transparent">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-purple-500/50" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400/80">AI Synthesis</span>
            <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-purple-500/50" />
          </div>
          <DialogTitle className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-200 to-white tracking-tight leading-none uppercase italic">
            {title}
          </DialogTitle>
        </div>

        <div className="px-6 pb-8 space-y-6">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="absolute inset-0 bg-purple-500 blur-2xl opacity-20 animate-pulse" />
                <Loader2 className="h-12 w-12 text-purple-500 animate-spin relative z-10" />
              </div>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest animate-pulse">Distilling Intelligence...</p>
            </div>
          ) : (
            <>
              {/* Content View Selector */}
              <div className="flex justify-center -mt-2">
                <div className="flex p-1 bg-white/5 rounded-full border border-white/5 scale-90">
                  <button
                    onClick={() => setViewMode('bullets')}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-bold transition-all",
                      viewMode === 'bullets' ? "bg-white/10 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    <List className="w-3 h-3" />
                    Key Points
                  </button>
                  <button
                    onClick={() => setViewMode('paragraph')}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-bold transition-all",
                      viewMode === 'paragraph' ? "bg-white/10 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    <AlignLeft className="w-3 h-3" />
                    Narrative
                  </button>
                </div>
              </div>

              {/* Enhanced Content Area */}
              <div className="relative group mx-1">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                <div className="relative w-full bg-[#0B0B12]/80 rounded-3xl border border-white/10 shadow-[inset_0_2px_20px_rgba(0,0,0,0.4)] overflow-hidden">
                  <ScrollArea className="h-[220px] p-6 lg:p-7">
                    {viewMode === 'bullets' ? (
                      <ul className="space-y-4 pr-2">
                        {bulletPoints.map((point, i) => (
                          <li key={i} className="flex gap-3 text-zinc-300 text-[14px] leading-relaxed group/item">
                            <div className="mt-2 w-1.5 h-1.5 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 shadow-[0_0_8px_rgba(168,85,247,0.5)] shrink-0" />
                            <span className="group-hover/item:text-white transition-colors">{point}.</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[15px] leading-[1.8] text-zinc-300 font-medium font-space-grotesk tracking-wide">
                        {summary}
                      </p>
                    )}
                  </ScrollArea>
                </div>
              </div>

              {/* Redesigned Audio Integration Hub */}
              <div className="bg-white/5 rounded-[2rem] p-5 border border-white/10 shadow-inner backdrop-blur-xl space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="px-1 text-purple-400 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                      <Music className="w-3 h-3" /> Narrator
                    </span>
                    <Select value={selectedVoiceName} onValueChange={setSelectedVoiceName}>
                      <SelectTrigger className="h-11 bg-black/40 border-white/5 rounded-2xl text-[11px] text-zinc-300 hover:bg-black/60 transition-all border-none ring-1 ring-white/10 shadow-2xl">
                        <SelectValue placeholder="Select Voice" />
                      </SelectTrigger>
                      <SelectContent className="glassmorphism rounded-2xl border-white/10 max-h-[250px] shadow-2xl">
                        {voices.map((voice) => (
                          <SelectItem key={voice.name} value={voice.name} className="text-[11px] text-zinc-300 py-2.5 focus:bg-purple-500/20">
                            {voice.name.split(' - ')[0]}
                            <span className="ml-2 opacity-30 text-[9px] uppercase tracking-tighter">({voice.lang.split('-')[0]})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <span className="px-1 text-pink-400 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                      <FastForward className="w-3 h-3" /> Pace
                    </span>
                    <div className="flex bg-black/40 rounded-2xl p-1 gap-1 ring-1 ring-white/10 h-11">
                      {[1, 1.25, 1.5].map(rate => (
                        <button
                          key={rate}
                          onClick={() => handleRateChange(rate)}
                          className={cn(
                            "flex-1 rounded-xl text-[11px] font-black transition-all",
                            speechRate === rate
                              ? "bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-white shadow-lg ring-1 ring-white/20"
                              : "text-zinc-500 hover:text-zinc-300"
                          )}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Primary Interaction Area */}
                <div className="flex items-center gap-3">
                  <Button
                    className={cn(
                      "flex-1 h-16 rounded-[1.5rem] text-[16px] font-black uppercase tracking-[0.2em] transition-all active:scale-[0.98] shadow-2xl border-none group relative overflow-hidden",
                      isSpeaking
                        ? "bg-zinc-900 border border-white/5 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.1)]"
                        : "bg-gradient-to-r from-[#9333EA] via-[#A855F7] to-[#EC4899] text-white hover:brightness-110 shadow-[0_0_30px_rgba(168,85,247,0.4)]"
                    )}
                    onClick={handleToggleSpeech}
                    disabled={isLoading}
                  >
                    <div className="relative z-10 flex items-center justify-center gap-3">
                      {isSpeaking ? (
                        <Pause className="h-6 w-6 fill-current" />
                      ) : (
                        <Play className="h-6 w-6 fill-current" />
                      )}
                      <span>{isSpeaking ? 'Stop' : 'Listen'}</span>
                      {isSpeaking && <VoiceWaveform isPlaying={isSpeaking} />}
                    </div>
                    {/* Animated Shine Effect */}
                    <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[45deg] -translate-x-full group-hover:animate-[shine_1.5s_infinite]" />
                  </Button>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="w-16 h-16 rounded-[1.5rem] border-white/5 bg-black/40 hover:bg-black/60 transition-all hover:scale-105 active:scale-95 group shrink-0 shadow-xl ring-1 ring-white/10"
                      onClick={handleDownloadMp3}
                      disabled={isDownloading}
                    >
                      {isDownloading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
                      ) : (
                        <Download className="h-5 w-5 text-zinc-400 group-hover:text-purple-400 transition-colors" />
                      )}
                    </Button>

                    {onReload && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="w-16 h-16 rounded-[1.5rem] border-white/5 bg-black/40 hover:bg-black/60 transition-all hover:scale-105 active:scale-95 group shrink-0 shadow-xl ring-1 ring-white/10"
                        onClick={onReload}
                        disabled={isLoading}
                      >
                        <RotateCcw className={cn("h-5 w-5 text-zinc-400 group-hover:text-blue-400 transition-colors", isLoading && "animate-spin")} />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
