'use client';

import { motion } from 'framer-motion';
import {
  FileText,
  Youtube,
  Globe,
  Image,
  PenLine,
  Layers,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SourceTypeCard {
  icon: any;
  title: string;
  subtitle: string;
  action: string;
  color: string;
  bgColor: string;
  borderColor: string;
  iconBg: string;
}

const SOURCE_TYPES: SourceTypeCard[] = [
  {
    icon: FileText,
    title: 'PDF',
    subtitle: 'Upload a research paper, ebook, or report',
    action: 'Upload PDF →',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    iconBg: 'bg-emerald-500/10',
  },
  {
    icon: Youtube,
    title: 'YouTube',
    subtitle: 'Paste a video link — transcript auto-extracted',
    action: 'Paste URL →',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    iconBg: 'bg-red-500/10',
  },
  {
    icon: Globe,
    title: 'Website',
    subtitle: 'Enter any URL — content auto-scraped',
    action: 'Enter URL →',
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/20',
    iconBg: 'bg-sky-500/10',
  },
  {
    icon: Image,
    title: 'Image',
    subtitle: 'Upload a diagram, screenshot, or infographic',
    action: 'Upload Image →',
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/20',
    iconBg: 'bg-pink-500/10',
  },
  {
    icon: PenLine,
    title: 'Text',
    subtitle: 'Paste or type any content directly',
    action: 'Type text →',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/20',
    iconBg: 'bg-violet-500/10',
  },
  {
    icon: Layers,
    title: 'Multi-Source',
    subtitle: 'Combine PDFs, URLs, and text in one map',
    action: 'Combine sources →',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    iconBg: 'bg-amber-500/10',
  },
];

interface SourceTypeCardsProps {
  onSourceSelect?: (type: string) => void;
  onScrollToInput?: () => void;
}

export function SourceTypeCards({ onSourceSelect, onScrollToInput }: SourceTypeCardsProps) {
  const handleClick = (type: string) => {
    if (onSourceSelect) onSourceSelect(type);
    if (onScrollToInput) onScrollToInput();
  };

  return (
    <section className="py-12 md:py-16 relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-8 md:mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Start from any source
          </h2>
          <p className="text-zinc-500 text-sm mt-2 max-w-lg mx-auto">
            MindScape accepts all common formats. Pick your starting point.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 max-w-5xl mx-auto">
          {SOURCE_TYPES.map((type, index) => (
            <motion.button
              key={type.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.04 }}
              onClick={() => handleClick(type.title)}
              className={cn(
                "group relative flex flex-col items-center text-center p-4 sm:p-5 rounded-2xl border transition-all duration-300",
                "hover:scale-[1.03] hover:shadow-lg active:scale-95 cursor-pointer",
                type.borderColor,
                type.bgColor,
                "hover:brightness-125"
              )}
            >
              <div className={cn(
                "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-3",
                "bg-zinc-950 border border-white/5 shadow-inner transition-transform group-hover:rotate-6",
                type.color
              )}>
                <type.icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white mb-1">
                {type.title}
              </h3>
              <p className="text-[10px] sm:text-xs text-zinc-500 leading-relaxed mb-3 line-clamp-3">
                {type.subtitle}
              </p>
              <span className={cn(
                "text-[9px] sm:text-[10px] font-bold uppercase tracking-wider",
                "opacity-0 group-hover:opacity-100 transition-opacity",
                type.color
              )}>
                {type.action}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}
