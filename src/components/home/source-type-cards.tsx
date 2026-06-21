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
  Upload,
  Link2,
  Type,
  Combine,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SourceTypeCard {
  id: string;
  icon: any;
  actionIcon: any;
  title: string;
  subtitle: string;
  action: string;
  color: string;
  gradient: string;
  iconBg: string;
}

const SOURCE_TYPES: SourceTypeCard[] = [
  {
    id: 'pdf',
    icon: FileText,
    actionIcon: Upload,
    title: 'PDF',
    subtitle: 'Upload a research paper, ebook, or report',
    action: 'Upload PDF',
    color: 'text-emerald-400',
    gradient: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
    iconBg: 'bg-emerald-500/10 border-emerald-500/20',
  },
  {
    id: 'youtube',
    icon: Youtube,
    actionIcon: Link2,
    title: 'YouTube',
    subtitle: 'Paste a video link — transcript auto-extracted',
    action: 'Paste URL',
    color: 'text-red-400',
    gradient: 'from-red-500/20 via-red-500/5 to-transparent',
    iconBg: 'bg-red-500/10 border-red-500/20',
  },
  {
    id: 'website',
    icon: Globe,
    actionIcon: Link2,
    title: 'Website',
    subtitle: 'Enter any URL — content auto-scraped',
    action: 'Enter URL',
    color: 'text-sky-400',
    gradient: 'from-sky-500/20 via-sky-500/5 to-transparent',
    iconBg: 'bg-sky-500/10 border-sky-500/20',
  },
  {
    id: 'image',
    icon: Image,
    actionIcon: Upload,
    title: 'Image',
    subtitle: 'Upload a diagram, screenshot, or infographic',
    action: 'Upload Image',
    color: 'text-pink-400',
    gradient: 'from-pink-500/20 via-pink-500/5 to-transparent',
    iconBg: 'bg-pink-500/10 border-pink-500/20',
  },
  {
    id: 'text',
    icon: PenLine,
    actionIcon: Type,
    title: 'Text',
    subtitle: 'Paste or type any content directly',
    action: 'Type text',
    color: 'text-violet-400',
    gradient: 'from-violet-500/20 via-violet-500/5 to-transparent',
    iconBg: 'bg-violet-500/10 border-violet-500/20',
  },
  {
    id: 'multi',
    icon: Layers,
    actionIcon: Combine,
    title: 'Multi-Source',
    subtitle: 'Combine PDFs, URLs, and text in one map',
    action: 'Combine sources',
    color: 'text-amber-400',
    gradient: 'from-amber-500/20 via-amber-500/5 to-transparent',
    iconBg: 'bg-amber-500/10 border-amber-500/20',
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
    <section className="relative py-20 md:py-24 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/4 w-72 h-72 bg-violet-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-14">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                6 source types supported
              </span>
            </div>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white"
          >
            Start from <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-emerald-400">any source</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="text-zinc-500 text-sm md:text-base mt-3 max-w-xl mx-auto"
          >
            MindScape accepts all common formats. Pick your starting point below.
          </motion.p>
        </div>

        {/* Source Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 max-w-6xl mx-auto">
          {SOURCE_TYPES.map((type, index) => (
            <motion.button
              key={type.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.06 }}
              onClick={() => handleClick(type.id)}
              className={cn(
                "group relative flex flex-col items-start text-left p-5 md:p-6 rounded-2xl",
                "border border-white/10 bg-white/[0.03]",
                "hover:border-white/20 hover:bg-white/[0.06]",
                "transition-all duration-300 ease-out",
                "cursor-pointer overflow-hidden",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
              )}
            >
              {/* Gradient overlay on hover */}
              <div className={cn(
                "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br pointer-events-none",
                type.gradient
              )} />

              {/* Icon */}
              <div className={cn(
                "relative z-10 w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center mb-4",
                "border shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3",
                type.iconBg,
                type.color
              )}>
                <type.icon className="w-5 h-5 md:w-5.5 md:h-5.5" />
              </div>

              {/* Title */}
              <h3 className="relative z-10 text-base md:text-lg font-bold text-white mb-1.5">
                {type.title}
              </h3>

              {/* Subtitle */}
              <p className="relative z-10 text-xs md:text-sm text-zinc-500 leading-relaxed mb-5 flex-1">
                {type.subtitle}
              </p>

              {/* Action CTA — always visible, not just on hover */}
              <div className={cn(
                "relative z-10 inline-flex items-center gap-2 px-3.5 py-2 rounded-lg",
                "text-[11px] md:text-xs font-bold uppercase tracking-wider transition-all duration-300",
                type.color,
                "bg-white/5 border border-white/10",
                "group-hover:bg-white/10 group-hover:border-white/20 group-hover:shadow-lg"
              )}>
                <type.actionIcon className="w-3.5 h-3.5" />
                <span>{type.action}</span>
                <ArrowRight className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-0.5" />
              </div>
            </motion.button>
          ))}
        </div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center text-zinc-600 text-xs mt-10 flex items-center justify-center gap-2"
        >
          <ShieldCheck className="w-3 h-3" />
          All sources are processed client-side — your data stays private
        </motion.p>
      </div>
    </section>
  );
}
