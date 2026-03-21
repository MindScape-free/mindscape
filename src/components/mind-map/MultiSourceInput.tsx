'use client';

import { useState, useEffect } from 'react';
import { 
  Globe, 
  Youtube, 
  FileText, 
  Sparkles, 
  Paperclip, 
  Plus, 
  ArrowRight,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { detectInputType } from '@/lib/detect-source-type';

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
  const [value, setValue] = useState('');
  const [detectedType, setDetectedType] = useState<'youtube' | 'website' | 'text'>('text');

  useEffect(() => {
    if (!value.trim()) {
      setDetectedType('text'); // Neutral state
    } else {
      setDetectedType(detectInputType(value));
    }
  }, [value]);

  const handleAdd = () => {
    if (!value.trim()) return;
    onAdd(value);
    setValue('');
  };

  const getIcon = () => {
    if (!value.trim()) return <Sparkles className="w-5 h-5 text-zinc-600" />;
    switch (detectedType) {
      case 'youtube': return <Youtube className="w-4 h-4 text-red-500" />;
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
          {/* Smart Icon Badge */}
          <div className="absolute left-6 top-1/2 -translate-y-1/2 z-10">
            {getIcon()}
          </div>

          <input
            autoFocus
            placeholder={getPlaceholder()}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full h-16 rounded-3xl bg-black/40 pl-16 pr-44 text-zinc-100 outline-none placeholder:text-zinc-600 border border-white/5 focus:border-primary/50 focus:bg-black/60 transition-all text-lg font-medium"
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
