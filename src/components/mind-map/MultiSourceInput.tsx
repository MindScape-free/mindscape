'use client';

import { useState, useEffect } from 'react';
import { 
  Globe, 
  Video, 
  FileText, 
  Sparkles, 
  Paperclip, 
  Plus, 
  ArrowRight,
  Loader2,
  Brain,
  BrainCircuit
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { detectInputType, SourceType } from '@/lib/detect-source-type';
import { useAIConfig } from '@/contexts/ai-config-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MultiSourceInputProps {
  onAdd: (value: string) => void;
  onAttachFile: () => void;
  onGenerate: () => void;
  isGenerating: boolean;
  canGenerate: boolean;
  sourceCount: number;
}

export function MultiSourceInput({
  onAdd,
  onAttachFile,
  onGenerate,
  isGenerating,
  canGenerate,
  sourceCount
}: MultiSourceInputProps) {
  const { config, updateConfig } = useAIConfig();
  const [value, setValue] = useState('');
  const detectedType: SourceType = !value.trim() ? 'text' : detectInputType(value);

  const handleAdd = () => {
    if (!value.trim()) return;
    onAdd(value);
    setValue('');
  };

  const getIcon = () => {
    if (!value.trim()) return <Sparkles className="w-5 h-5 text-zinc-600" />;
    switch (detectedType) {
      case 'youtube': return <Video className="w-4 h-4 text-red-500" />;
      case 'website': return <Globe className="w-4 h-4 text-blue-400" />;
      default: return <FileText className="w-4 h-4 text-green-400" />;
    }
  };

  const getPlaceholder = () => {
    if (!value.trim()) return "Paste a URL, YouTube link, or type a note...";
    if (detectedType === 'youtube') return "Add YouTube video...";
    if (detectedType === 'website') return "Add website link...";
    return "Add text note...";
  };

  return (
    <div className="relative flex items-center gap-2">
      <div className="relative flex-1 group/input flex flex-row">
        <div className="relative flex-1">
          {/* Provider Selector on the Left */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-9 px-2.5 rounded-full text-xs font-bold gap-1.5 transition-all border border-white/5 shadow-none select-none",
                    config.provider === 'openrouter'
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                      : config.provider === 'nvidia'
                        ? "bg-lime-500/10 text-lime-400 border-lime-500/20 hover:bg-lime-500/20"
                        : "bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/20"
                  )}
                  title={`Active Provider: ${config.provider === 'openrouter' ? 'OpenRouter' : config.provider === 'nvidia' ? 'NVIDIA' : 'Pollinations'}. Click to switch.`}
                >
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full animate-pulse",
                    config.provider === 'openrouter'
                      ? "bg-emerald-400"
                      : config.provider === 'nvidia'
                        ? "bg-lime-400"
                        : "bg-violet-400"
                  )} />
                  <span>
                    {config.provider === 'openrouter'
                      ? 'OR'
                      : config.provider === 'nvidia'
                        ? 'NV'
                        : 'PL'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-36 glassmorphism border-white/10 z-[110]">
                <DropdownMenuItem
                  onClick={() => updateConfig({ provider: 'nvidia' })}
                  className={cn(
                    "text-xs font-bold font-orbitron uppercase tracking-wider gap-2 px-3 py-2 cursor-pointer",
                    config.provider === 'nvidia' ? "text-lime-400 bg-lime-500/10 focus:bg-lime-500/20" : "text-zinc-400"
                  )}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-lime-400" />
                  NVIDIA
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => updateConfig({ provider: 'openrouter' })}
                  className={cn(
                    "text-xs font-bold font-orbitron uppercase tracking-wider gap-2 px-3 py-2 cursor-pointer",
                    config.provider === 'openrouter' ? "text-emerald-400 bg-emerald-500/10 focus:bg-emerald-500/20" : "text-zinc-400"
                  )}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  OpenRouter
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => updateConfig({ provider: 'pollinations' })}
                  className={cn(
                    "text-xs font-bold font-orbitron uppercase tracking-wider gap-2 px-3 py-2 cursor-pointer",
                    config.provider === 'pollinations' ? "text-violet-400 bg-violet-500/10 focus:bg-violet-500/20" : "text-zinc-400"
                  )}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                  Pollinations
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Smart Icon Badge */}
          <div className="absolute left-20 top-1/2 -translate-y-1/2 z-10">
            {getIcon()}
          </div>

          <input
            autoFocus
            placeholder={getPlaceholder()}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full h-16 rounded-3xl bg-black/40 pl-28 pr-44 text-zinc-100 outline-none placeholder:text-zinc-600 border border-white/5 focus:border-primary/50 focus:bg-black/60 transition-all text-lg font-medium"
            disabled={isGenerating}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
            }}
          />

          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onAttachFile}
              disabled={isGenerating}
              className="rounded-xl text-zinc-500 hover:text-zinc-100 hover:bg-white/10 transition-all duration-300 h-10 w-10"
            >
              <Paperclip className="h-5 w-5" />
            </Button>

            <Button
              onClick={handleAdd}
              disabled={!value.trim() || isGenerating}
              className="h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
            >
              <Plus className="w-3.5 h-3.5 mr-2" />
              Add
            </Button>
          </div>
        </div>
      </div>

      <Button
        onClick={onGenerate}
        disabled={isGenerating || !canGenerate}
        className={cn(
          "h-16 w-16 rounded-3xl bg-primary text-white hover:brightness-110 hover:scale-105 active:scale-95 transition-all font-bold shadow-lg shadow-primary/30 flex items-center justify-center p-0",
          !canGenerate && "opacity-50 grayscale cursor-not-allowed"
        )}
      >
        {isGenerating ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : (
          <ArrowRight className="w-7 h-7" />
        )}
      </Button>
    </div>
  );
}
