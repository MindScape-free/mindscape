'use client';

import React from 'react';
import * as LucideIcons from 'lucide-react';
import {
    CheckCircle2,
    ExternalLink,
    Target,
    Layers,
    Sparkles,
    ArrowRight,
    Copy,
    MessageCircle,
    Network,
    Loader2,
    CheckIcon,
    ChevronDown,
    BrainCircuit,
    Sword,
    Swords,
    Zap,
    Scale,
    Activity,
    Compass,
    Bot,
    UserRound,
    Image as ImageIcon
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    CompareMindMapData,
    ComparisonDimension,
    CompareNode,
    MindMapData,
    NestedExpansionItem,
    SubCategory
} from '@/types/mind-map';
import { toPascalCase, cn, truncateText } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { TopicHeader } from './topic-header';

interface CompareViewProps {
    data: CompareMindMapData;
    onExplainNode?: (node: CompareNode) => void;
    onGenerateNewMap?: (topic: string, nodeId: string, contextPath: string, mode?: 'foreground' | 'background') => void;
    onExplainInChat?: (message: string) => void;
    onSubCategoryClick?: (node: CompareNode) => void;
    onOpenMap?: (mapData: MindMapData, id: string) => void;
    onGenerateImage?: (node: SubCategory) => void;
    generatingNode?: string | null;
    nestedExpansions?: NestedExpansionItem[];
    isGlobalBusy?: boolean;
    // New Action Callbacks
    onStartDebate?: (topicA: string, topicB: string) => void;
    onGenerateHybrid?: () => void;
    onStartContrastQuiz?: () => void;
    onDrillDown?: (dimensionName: string) => void;

    onShowTimeline?: () => void;
    onStartQuiz?: (topic: string) => void;
}

export const CompareView = ({
    data,
    onExplainNode,
    onGenerateNewMap,
    onExplainInChat,
    onSubCategoryClick,
    onOpenMap,
    onGenerateImage,
    generatingNode,
    nestedExpansions = [],
    isGlobalBusy = false,
    onStartDebate,
    onGenerateHybrid,
    onStartContrastQuiz,
    onDrillDown,

    onShowTimeline,
    onStartQuiz,
}: CompareViewProps) => {
    const { compareData } = data;

    // ── State must be declared before any early returns (Rules of Hooks) ──
    const [copiedNodeId, setCopiedNodeId] = React.useState<string | null>(null);

    // Safety fallback: If compareData is missing, it's likely a legacy format or a generation error.
    if (!compareData || (!compareData.unityNexus && !compareData.dimensions)) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center space-y-6 animate-in fade-in duration-700">
                <div className="w-20 h-20 rounded-3xl bg-zinc-900 border border-white/5 flex items-center justify-center shadow-2xl">
                    <Compass className="w-10 h-10 text-zinc-700 animate-spin-slow" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter font-orbitron">Intelligence Sync Required</h3>
                    <p className="text-sm text-zinc-500 max-w-sm mx-auto leading-relaxed">
                        This comparison uses an older intelligence architecture. Please regenerate to unlock the new Dimensional Architect dashboard.
                    </p>
                </div>
                <Button
                    onClick={() => window.location.reload()}
                    variant="outline"
                    className="rounded-full border-white/10 hover:bg-white/5 text-[10px] font-black uppercase tracking-widest px-8"
                >
                    Update Intelligence Stream
                </Button>
            </div>
        );
    }

    // Extract names for Topic A and B
    const topicParts = data.topic.split(/\s+vs\s+/i);
    const topicA = truncateText(topicParts[0] || 'Topic A', 25);
    const topicB = truncateText(topicParts[1] || 'Topic B', 25);

    return (
        <div className="relative min-h-screen py-10 px-4 sm:px-6 lg:px-8 space-y-16 max-w-[1600px] mx-auto overflow-hidden">
            {/* Background Orbs */}
            <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/20 rounded-full mix-blend-multiply filter blur-[128px] animate-pulse opacity-30 pointer-events-none" />
            <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-500/20 rounded-full mix-blend-multiply filter blur-[128px] animate-pulse opacity-30 pointer-events-none delay-700" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-500/10 rounded-full mix-blend-multiply filter blur-[128px] animate-pulse opacity-20 pointer-events-none" />

            {/* Header Section - Minimalist & Strategic */}
            <div className="relative space-y-8">
                <TopicHeader
                    mindMap={data}
                    mindMapStack={[]}
                    activeStackIndex={0}
                    showBadge={true}
                    badgeText="Comparison Intelligence"
                    persona={data.aiPersona}
                    depth={data.depth}
                    centered={true}
                />

                {/* Strategy Command Deck - Sleek & High-Tech */}
                <div className="flex flex-col items-center gap-8 animate-in fade-in slide-in-from-top-4 duration-1000 delay-200">
                    <div className="inline-flex items-center p-2 rounded-full bg-white/[0.02] border border-white/5 backdrop-blur-3xl shadow-2xl ring-1 ring-white/10 hover:bg-white/[0.04] transition-all duration-500">
                        <Button
                            onClick={() => onStartDebate?.(topicA, topicB)}
                            variant="ghost"
                            className="rounded-full h-12 px-10 gap-3 group hover:bg-primary/20 transition-all duration-500"
                        >
                            <Swords className="w-4 h-4 text-primary group-hover:rotate-12 transition-transform" />
                            <div className="flex flex-col items-start leading-none">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Practice Arena</span>
                                <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-tight group-hover:text-primary/70">Strategic Debate</span>
                            </div>
                        </Button>

                        <div className="w-px h-8 bg-white/10 mx-2" />

                        <Button
                            onClick={() => onStartContrastQuiz?.()}
                            variant="ghost"
                            className="rounded-full h-12 px-10 gap-3 group hover:bg-amber-500/20 transition-all duration-500"
                        >
                            <BrainCircuit className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
                            <div className="flex flex-col items-start leading-none">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Start Topic Quiz</span>
                                <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-tight group-hover:text-amber-500/70">Core Alignment</span>
                            </div>
                        </Button>



                        <div className="w-px h-8 bg-white/10 mx-2" />

                        <Button
                            onClick={onShowTimeline}
                            variant="ghost"
                            className="rounded-full h-12 px-10 gap-3 group hover:bg-emerald-500/20 transition-all duration-500"
                        >
                            <MessageCircle className="w-4 h-4 text-emerald-500 group-hover:animate-pulse" />
                            <div className="flex flex-col items-start leading-none">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Ask AI Assistant</span>
                                <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-tight group-hover:text-emerald-500/70">Historical Path</span>
                            </div>
                        </Button>
                    </div>

                </div>
            </div>

            {/* Similarities - Leaf Node Card Grid (Single Mode style) */}
            <section className="relative space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                {/* Section heading */}
                <div className="flex flex-col items-center text-center space-y-2">
                    <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-[0_0_30px_rgba(16,185,129,0.3)] ring-1 ring-white/20 mb-1">
                        <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase font-orbitron">Similarities</h2>
                    <p className="text-zinc-500 text-sm font-medium tracking-tight px-4">
                        The core ideas and features that both <span className="text-white font-bold">{topicA}</span> and <span className="text-white font-bold">{topicB}</span> have in common.
                    </p>
                </div>

                {/* Leaf node card grid — mirrors single mode exactly */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
                    {compareData.unityNexus?.map((node, i) => {
                        const Icon = (LucideIcons as any)[toPascalCase(node.icon || 'FileText')] || CheckCircle2;
                        const nodeId = `nexus-${i}`;
                        const isCopied = copiedNodeId === nodeId;
                        const existingExpansion = nestedExpansions?.find(e => e.topic === node.title);
                        const isGeneratingMap = generatingNode === nodeId;

                        const handleCopy = (e: React.MouseEvent) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(`${node.title}: ${node.description}`);
                            setCopiedNodeId(nodeId);
                            setTimeout(() => setCopiedNodeId(null), 2000);
                        };

                        return (
                            <div
                                key={i}
                                className="group/item relative h-full cursor-pointer rounded-2xl bg-white/[0.03] border border-white/5 hover:border-emerald-500/40 hover:bg-white/[0.06] hover:shadow-[0_0_40px_rgba(16,185,129,0.1)] transition-all duration-500 overflow-hidden flex flex-col"
                                onClick={() => onSubCategoryClick?.(node)}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-500" />

                                <div className="relative z-10 p-5 flex flex-col h-full">
                                    {/* Header */}
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl border bg-emerald-500/10 border-emerald-500/20 text-emerald-400 group-hover/item:bg-emerald-500 group-hover/item:text-white transition-all duration-500 group-hover/item:scale-110">
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-base font-semibold text-zinc-100 leading-snug group-hover/item:text-white transition-colors">
                                                {node.title}
                                            </h4>
                                            {existingExpansion && (
                                                <span className="inline-block mt-1 text-[10px] font-medium text-emerald-400 border border-emerald-500/30 bg-emerald-500/5 rounded px-1.5 py-0.5 uppercase tracking-wider">Expanded</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <p className="text-sm text-zinc-400 leading-relaxed mb-6 flex-grow group-hover/item:text-zinc-300 transition-colors">
                                        {node.description}
                                    </p>

                                    {/* Action strip */}
                                    <div className="flex items-center justify-between gap-2 mt-auto pt-4 border-t border-white/5">
                                        <div className="flex items-center gap-0.5">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost" size="icon"
                                                            className={cn('h-8 w-8 rounded-lg transition-all', existingExpansion ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-500 hover:text-primary hover:bg-primary/10')}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (existingExpansion?.fullData && onOpenMap) {
                                                                    onOpenMap(existingExpansion.fullData, existingExpansion.id);
                                                                } else {
                                                                    onGenerateNewMap?.(node.title, nodeId, `${data.topic} > Shared Foundation > ${node.title}`, 'background');
                                                                }
                                                            }}
                                                            disabled={isGeneratingMap || isGlobalBusy}
                                                        >
                                                            {isGeneratingMap ? <Loader2 className="h-4 w-4 animate-spin" /> : <Network className="h-4 w-4" />}
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="glassmorphism"><p>{existingExpansion ? 'Open Sub-Map' : 'Generate Sub-Map'}</p></TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-zinc-500 hover:text-pink-400 hover:bg-pink-400/10 transition-all" onClick={(e) => { e.stopPropagation(); onGenerateImage?.(node as any); }}>
                                                            <ImageIcon className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="glassmorphism"><p>Generate Image</p></TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-emerald-400/10 transition-all" onClick={(e) => { e.stopPropagation(); onStartQuiz?.(node.title); }}>
                                                            <BrainCircuit className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="glassmorphism"><p>Start Topic Quiz</p></TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-zinc-500 hover:text-blue-400 hover:bg-blue-400/10 transition-all" onClick={(e) => { e.stopPropagation(); onExplainInChat?.(`Explain "${node.title}" in the context of ${data.topic}.`); }}>
                                                            <MessageCircle className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="glassmorphism"><p>Ask AI Assistant</p></TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-zinc-500 hover:text-amber-400 hover:bg-amber-400/10 transition-all" onClick={handleCopy}>
                                                            {isCopied ? <CheckIcon className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="glassmorphism"><p>{isCopied ? 'Copied!' : 'Copy Context'}</p></TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                        <Button
                                            onClick={(e) => { e.stopPropagation(); onSubCategoryClick?.(node); }}
                                            variant="ghost"
                                            className="h-8 py-0 px-3 text-xs font-bold text-zinc-400 hover:text-white hover:bg-white/5 rounded-full group-hover/item:bg-emerald-500/20 group-hover/item:text-emerald-400 transition-all flex items-center gap-1"
                                        >
                                            More <ArrowRight className="w-3 h-3 group-hover/item:translate-x-1 transition-transform" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Dimensional Battleground - The 2-Column Grid */}
            <section className="relative space-y-12 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 flex items-center justify-center rounded-2xl bg-primary text-white shadow-[0_0_30px_rgba(139,92,246,0.3)] ring-1 ring-white/20 mb-2">
                        <Sword className="h-8 w-8" />
                    </div>
                    <div>
                        <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase font-orbitron">Differences</h2>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-4">
                    {compareData.dimensions?.map((dimension, i) => {
                        const isLast = i === compareData.dimensions.length - 1;
                        const isOdd = compareData.dimensions.length % 2 !== 0;
                        const shouldBeFullWidth = isLast && isOdd;

                        return (
                            <DimensionBentoCard
                                key={i}
                                dimension={dimension}
                                topicA={topicA}
                                topicB={topicB}
                                onDrillDown={onDrillDown}
                                onExplainNode={onExplainNode}
                                onGenerateImage={onGenerateImage}
                                onStartQuiz={onStartQuiz}
                                onExplainInChat={onExplainInChat}
                                onSubCategoryClick={onSubCategoryClick}
                                isGlobalBusy={isGlobalBusy}
                                isFullWidth={shouldBeFullWidth}
                            />
                        );
                    })}
                </div>
            </section>

            {/* Synthesis Horizon - Final Conclusion */}
            <section className="relative animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-500">
                <div className="max-w-4xl mx-auto rounded-3xl overflow-hidden border border-white/10 bg-zinc-900/30 backdrop-blur-3xl shadow-2xl ring-1 ring-white/5 relative group">

                    {/* Ambient glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-blue-500/5 opacity-60 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                    {/* ── Header Band ── */}
                    <div className="relative z-10 flex items-center justify-between gap-4 px-8 py-6 border-b border-white/5 bg-white/[0.02]">
                        <div className="flex items-center gap-4">
                            <div className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-2xl bg-primary/20 border border-primary/30 text-primary shadow-[0_0_20px_rgba(139,92,246,0.2)]">
                                <Zap className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-primary/70 uppercase tracking-[0.35em] font-orbitron mb-0.5">Final Analysis</p>
                                <h2 className="text-lg font-black text-white tracking-tight uppercase font-orbitron leading-none">Synthesis Horizon</h2>
                            </div>
                        </div>
                        <Button
                            onClick={() => onGenerateHybrid?.()}
                            className="rounded-xl bg-primary/10 border border-primary/30 hover:bg-primary/25 text-primary text-[10px] font-black uppercase tracking-widest px-5 h-9 gap-2 transition-all hover:shadow-[0_0_20px_rgba(139,92,246,0.2)]"
                            variant="ghost"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            Synthetic Hybrid
                        </Button>
                    </div>

                    {/* ── Two Insight Panels ── */}
                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/5">

                        {/* Expert Verdict */}
                        <div className="p-7 space-y-4 group/panel hover:bg-white/[0.02] transition-colors duration-300">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center">
                                        <Scale className="w-3.5 h-3.5 text-primary" />
                                    </div>
                                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">Expert Verdict</span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-lg text-zinc-600 hover:text-white hover:bg-white/5 opacity-0 group-hover/panel:opacity-100 transition-all"
                                    onClick={() => {
                                        const text = `Expert Verdict on ${data.topic}: ${compareData.synthesisHorizon?.expertVerdict}`;
                                        navigator.clipboard.writeText(text);
                                    }}
                                >
                                    <Copy className="h-3 w-3" />
                                </Button>
                            </div>
                            <div className="pl-1 border-l-2 border-primary/30">
                                <p className="text-zinc-200 text-base font-medium leading-relaxed italic">
                                    &ldquo;{compareData.synthesisHorizon?.expertVerdict}&rdquo;
                                </p>
                            </div>
                        </div>

                        {/* Future Evolution */}
                        <div className="p-7 space-y-4 group/panel hover:bg-white/[0.02] transition-colors duration-300">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
                                        <Activity className="w-3.5 h-3.5 text-blue-400" />
                                    </div>
                                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">Future Evolution</span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-lg text-zinc-600 hover:text-white hover:bg-white/5 opacity-0 group-hover/panel:opacity-100 transition-all"
                                    onClick={() => {
                                        const text = `Future Evolution of ${data.topic}: ${compareData.synthesisHorizon?.futureEvolution}`;
                                        navigator.clipboard.writeText(text);
                                    }}
                                >
                                    <Copy className="h-3 w-3" />
                                </Button>
                            </div>
                            <div className="pl-1 border-l-2 border-blue-500/30">
                                <p className="text-zinc-300 text-base font-medium leading-relaxed">
                                    {compareData.synthesisHorizon?.futureEvolution}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Authoritative Resources */}
            {
                compareData.relevantLinks && compareData.relevantLinks.length > 0 && (
                    <section className="space-y-8 animate-in fade-in slide-in-from-bottom-20 duration-1000 delay-700">
                        <div className="flex items-center gap-4 px-2">
                            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-xl shadow-amber-500/10">
                                <ExternalLink className="h-6 w-6 text-amber-500" />
                            </div>
                            <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter font-orbitron text-zinc-100">Intelligence Resources</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {compareData.relevantLinks.map((link, i) => (
                                <a
                                    key={i}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group relative overflow-hidden rounded-2xl bg-zinc-900/40 border border-white/10 hover:border-amber-500/40 hover:bg-white/[0.04] transition-all duration-700 p-6 flex flex-col h-full shadow-2xl ring-1 ring-white/5"
                                >
                                    <h4 className="text-base font-bold text-zinc-100 mb-2 group-hover:text-amber-400 transition-colors uppercase tracking-tight font-orbitron leading-tight">{link.title}</h4>
                                    <p className="text-sm text-zinc-500 group-hover:text-zinc-300 transition-colors line-clamp-2 leading-relaxed">{link.description}</p>
                                    <div className="mt-auto pt-6 flex items-center justify-between">
                                        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] group-hover:text-amber-500 transition-colors">Access Intelligence</span>
                                        <ArrowRight className="w-4 h-4 text-zinc-700 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
                                    </div>
                                </a>
                            ))}
                        </div>
                    </section>
                )
            }
        </div>
    );
};

/* --- Sub-Components --- */

const NexusCard = ({
    node,
    index,
    onSubCategoryClick,
    onGenerateImage,
    onExplainInChat,
    onGenerateNewMap,
    isGeneratingMap,
    mainTopic,
    nodeId,
    contextPath,
    existingExpansion,
    onOpenMap,
    onStartQuiz,
    isGlobalBusy = false,
}: {
    node: CompareNode,
    index: number,
    onSubCategoryClick?: (node: any) => void;
    onGenerateImage?: (node: any) => void;
    onExplainInChat?: (message: string) => void;
    onGenerateNewMap?: (topic: string, nodeId: string, contextPath: string, mode?: 'foreground' | 'background') => void;
    isGeneratingMap: boolean;
    mainTopic: string;
    nodeId: string;
    contextPath: string;
    existingExpansion?: any;
    onOpenMap?: (mapData: MindMapData, id: string) => void;
    onStartQuiz?: (topic: string) => void;
    isGlobalBusy?: boolean;
}) => {
    const Icon = (LucideIcons as any)[toPascalCase(node.icon || 'circle')] || Target;
    const [isCopied, setIsCopied] = React.useState(false);
    const { toast } = useToast();

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        const text = `${node.title}: ${node.description}`;
        navigator.clipboard.writeText(text);
        setIsCopied(true);
        toast({ title: "Copied", description: "Node content copied to clipboard." });
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <Card
            className="group relative p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-emerald-500/40 hover:bg-white/[0.06] hover:shadow-[0_0_40px_rgba(16,185,129,0.1)] transition-all duration-500 overflow-hidden flex flex-col h-full cursor-pointer"
            style={{ animationDelay: `${index * 100}ms` }}
            onClick={() => onSubCategoryClick?.(node)}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-start gap-4 mb-4">
                    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500">
                        <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-base font-semibold text-zinc-100 leading-snug group-hover:text-white transition-colors uppercase tracking-tight font-orbitron">
                            {node.title}
                        </h4>
                        {existingExpansion && (
                            <div className="mt-1">
                                <Badge variant="outline" className="text-[9px] h-4 py-0 px-1.5 border-emerald-500/30 text-emerald-400 font-medium bg-emerald-500/5 uppercase tracking-widest">Expanded</Badge>
                            </div>
                        )}
                    </div>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors mb-6 flex-grow">
                    {node.description}
                </p>

                <div className="flex items-center justify-between gap-2 mt-auto pt-4 border-t border-white/5">
                    <div className="flex items-center gap-0.5">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn(
                                            "h-8 w-8 rounded-lg transition-all",
                                            existingExpansion ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-500 hover:text-emerald-500 hover:bg-emerald-500/10'
                                        )}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (existingExpansion?.fullData && onOpenMap) {
                                                onOpenMap(existingExpansion.fullData, existingExpansion.id);
                                            } else {
                                                onGenerateNewMap?.(node.title, nodeId, contextPath, 'background');
                                            }
                                        }}
                                        disabled={isGeneratingMap || isGlobalBusy}
                                    >
                                        {isGeneratingMap ? <Loader2 className="h-4 w-4 animate-spin" /> : <Network className="h-4 w-4" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="glassmorphism"><p>{existingExpansion ? 'Open Sub-Map' : 'Generate Sub-Map'}</p></TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-zinc-500 hover:text-pink-400 hover:bg-pink-400/10 transition-all" onClick={(e) => { e.stopPropagation(); onGenerateImage?.(node as any); }}>
                                        <LucideIcons.Image className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="glassmorphism"><p>Generate Image</p></TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-emerald-400/10 transition-all" onClick={(e) => { e.stopPropagation(); onStartQuiz?.(node.title); }}>
                                        <BrainCircuit className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="glassmorphism"><p>Start Topic Quiz</p></TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-zinc-500 hover:text-blue-400 hover:bg-blue-400/10 transition-all" onClick={(e) => { e.stopPropagation(); onExplainInChat?.(`Explain "${node.title}" in the context of the comparison of ${mainTopic}.`); }}>
                                        <MessageCircle className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="glassmorphism"><p>Ask AI Assistant</p></TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-zinc-500 hover:text-amber-400 hover:bg-amber-400/10 transition-all" onClick={handleCopy}>
                                        {isCopied ? <LucideIcons.Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="glassmorphism"><p>{isCopied ? 'Copied!' : 'Copy Context'}</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>

                    <Button
                        onClick={(e) => {
                            e.stopPropagation();
                            onSubCategoryClick?.(node);
                        }}
                        variant="ghost"
                        className="h-8 py-0 px-3 text-xs font-bold text-zinc-500 hover:text-white hover:bg-white/5 rounded-full group-hover:bg-emerald-500/20 group-hover:text-emerald-400 transition-all flex items-center gap-1"
                    >
                        More <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </div>
            </div>
        </Card>
    );
};

const DimensionBentoCard = ({
    dimension,
    topicA,
    topicB,
    onDrillDown,
    onExplainNode,
    onGenerateImage,
    onStartQuiz,
    onExplainInChat,
    onSubCategoryClick,
    isGlobalBusy = false,
    isFullWidth = false,
}: {
    dimension: ComparisonDimension,
    topicA: string,
    topicB: string,
    onDrillDown?: (dimensionName: string) => void,
    onExplainNode?: (node: any) => void,
    onGenerateImage?: (node: any) => void,
    onStartQuiz?: (topic: string) => void,
    onExplainInChat?: (message: string) => void,
    onSubCategoryClick?: (node: any) => void,
    isGlobalBusy?: boolean,
    isFullWidth?: boolean,
}) => {
    const Icon = (LucideIcons as any)[toPascalCase(dimension.icon || 'layers')] || Activity;
    const [isCopied, setIsCopied] = React.useState(false);
    const [showInsight, setShowInsight] = React.useState(false);
    const { toast } = useToast();

    const toggleInsight = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowInsight(!showInsight);
    };

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        const text = `${dimension.name}\n${topicA}: ${dimension.topicAInsight}\n${topicB}: ${dimension.topicBInsight}\nSynthesis: ${dimension.neutralSynthesis}`;
        navigator.clipboard.writeText(text);
        setIsCopied(true);
        toast({ title: "Copied", description: "Dimension insights copied to clipboard." });
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <Card className={cn(
            "group relative overflow-hidden rounded-2xl bg-zinc-900/20 backdrop-blur-3xl border-none shadow-3xl ring-1 ring-white/5 hover:ring-primary/40 transition-all duration-700 flex flex-col h-full animate-in fade-in slide-in-from-bottom-8",
            isFullWidth && "lg:col-span-2"
        )}>
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            {/* ── Heading Card ── clean top band with icon + title */}
            <div className="relative z-10 flex items-center gap-4 px-6 py-5 border-b border-white/5 bg-white/[0.02]">
                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-2xl bg-primary text-white shadow-[0_0_30px_rgba(139,92,246,0.3)] ring-1 ring-white/20 group-hover:scale-105 transition-all duration-500">
                    <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                    <CardTitle className="text-xl font-bold text-white tracking-tight uppercase font-orbitron leading-tight truncate">
                        {dimension.name}
                    </CardTitle>
                </div>
            </div>

            {/* ── Insights Toggle Strip ── its own row */}
            <div className="relative z-10 flex items-center px-6 py-3 border-b border-white/5 bg-black/10">
                <button
                    onClick={toggleInsight}
                    className={cn(
                        "h-7 px-3 rounded-full border transition-all duration-300 flex items-center gap-2 group/insight",
                        showInsight
                            ? "bg-primary/20 border-primary/50 text-primary shadow-[0_0_15px_rgba(139,92,246,0.2)] scale-105"
                            : "bg-white/5 border-white/10 text-zinc-500 hover:border-primary/30 hover:text-zinc-300"
                    )}
                >
                    <Sparkles className={cn("w-3 h-3 transition-transform duration-500", showInsight ? "rotate-180 fill-primary" : "group-hover/insight:rotate-12")} />
                    <span className="text-[8px] font-black uppercase tracking-[0.2em]">Insights</span>
                    <div className={cn(
                        "w-1 h-1 rounded-full transition-all duration-500",
                        showInsight ? "bg-primary animate-pulse w-2.5" : "bg-zinc-700"
                    )} />
                </button>
            </div>

            <CardContent className="relative z-10 p-5 pt-3 space-y-4 flex-grow flex flex-col">
                {/* Insights Section - neutralSynthesis reveal */}
                <AnimatePresence>
                    {showInsight && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                            className="overflow-hidden px-1"
                        >
                            <div className="relative overflow-hidden rounded-2xl bg-[#0c0c0e]/40 border border-white/5 p-5 backdrop-blur-2xl shadow-lg group/insight-card hover:border-primary/30 transition-all duration-500">
                                <div className="relative z-10">
                                    <p className="text-base md:text-lg text-zinc-200 leading-relaxed font-serif italic text-balance">
                                        &ldquo;{dimension.neutralSynthesis}&rdquo;
                                    </p>
                                </div>
                                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(circle_at_50%_0%,#8b5cf6_0,transparent_50%)]" />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Two leaf-node cards, each with their own action strip ── */}
                <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow")}>

                    {/* ── Topic A Leaf Card ── */}
                    <div className={cn(
                        "relative flex flex-col rounded-xl bg-white/[0.02] border border-white/5 hover:border-red-500/20 hover:bg-red-500/[0.02] transition-all duration-500 overflow-hidden",
                        isFullWidth ? "p-0" : "p-0"
                    )}>
                        {/* Top accent bar */}
                        <div className="h-px w-full bg-gradient-to-r from-red-500/60 via-red-400/30 to-transparent" />

                        {/* Insight text */}
                        <div className={cn("flex-grow space-y-2", isFullWidth ? "p-5 pb-3" : "p-3 pb-2")}>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                <span className="text-[9px] font-black text-red-500/80 uppercase tracking-[0.2em]">{topicA}</span>
                            </div>
                            <p className={cn(
                                "font-normal text-zinc-300 leading-relaxed tracking-tight",
                                isFullWidth ? "text-base" : "text-sm"
                            )}>
                                {dimension.topicAInsight}
                            </p>
                        </div>

                        {/* Topic A action strip */}
                        <div className="flex items-center gap-0.5 px-2 py-2 border-t border-white/5 bg-black/10">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost" size="icon"
                                            className="h-7 w-7 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-all"
                                            onClick={(e) => { e.stopPropagation(); onExplainInChat?.(`Explain ${topicA}'s perspective on "${dimension.name}": ${dimension.topicAInsight}`); }}
                                            disabled={isGlobalBusy}
                                        >
                                            <MessageCircle className="h-3.5 w-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="glassmorphism"><p>Ask AI Assistant</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost" size="icon"
                                            className="h-7 w-7 rounded-lg text-zinc-600 hover:text-pink-400 hover:bg-pink-400/10 transition-all"
                                            onClick={(e) => { e.stopPropagation(); onGenerateImage?.({ name: `${topicA} — ${dimension.name}`, description: dimension.topicAInsight } as any); }}
                                            disabled={isGlobalBusy}
                                        >
                                            <ImageIcon className="h-3.5 w-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="glassmorphism"><p>Generate Image</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost" size="icon"
                                            className="h-7 w-7 rounded-lg text-zinc-600 hover:text-emerald-400 hover:bg-emerald-400/10 transition-all"
                                            onClick={(e) => { e.stopPropagation(); onStartQuiz?.(`${topicA} — ${dimension.name}`); }}
                                            disabled={isGlobalBusy}
                                        >
                                            <BrainCircuit className="h-3.5 w-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="glassmorphism"><p>Start Topic Quiz</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </div>

                    {/* ── Topic B Leaf Card ── */}
                    <div className={cn(
                        "relative flex flex-col rounded-xl bg-white/[0.02] border border-white/5 hover:border-blue-500/20 hover:bg-blue-500/[0.02] transition-all duration-500 overflow-hidden",
                        isFullWidth ? "p-0" : "p-0"
                    )}>
                        {/* Top accent bar */}
                        <div className="h-px w-full bg-gradient-to-r from-blue-500/60 via-blue-400/30 to-transparent" />

                        {/* Insight text */}
                        <div className={cn("flex-grow space-y-2", isFullWidth ? "p-5 pb-3" : "p-3 pb-2")}>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                <span className="text-[9px] font-black text-blue-500/80 uppercase tracking-[0.2em]">{topicB}</span>
                            </div>
                            <p className={cn(
                                "font-normal text-zinc-300 leading-relaxed tracking-tight",
                                isFullWidth ? "text-base" : "text-sm"
                            )}>
                                {dimension.topicBInsight}
                            </p>
                        </div>

                        {/* Topic B action strip */}
                        <div className="flex items-center gap-0.5 px-2 py-2 border-t border-white/5 bg-black/10">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost" size="icon"
                                            className="h-7 w-7 rounded-lg text-zinc-600 hover:text-blue-400 hover:bg-blue-400/10 transition-all"
                                            onClick={(e) => { e.stopPropagation(); onExplainInChat?.(`Explain ${topicB}'s perspective on "${dimension.name}": ${dimension.topicBInsight}`); }}
                                            disabled={isGlobalBusy}
                                        >
                                            <MessageCircle className="h-3.5 w-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="glassmorphism"><p>Ask AI Assistant</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost" size="icon"
                                            className="h-7 w-7 rounded-lg text-zinc-600 hover:text-pink-400 hover:bg-pink-400/10 transition-all"
                                            onClick={(e) => { e.stopPropagation(); onGenerateImage?.({ name: `${topicB} — ${dimension.name}`, description: dimension.topicBInsight } as any); }}
                                            disabled={isGlobalBusy}
                                        >
                                            <ImageIcon className="h-3.5 w-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="glassmorphism"><p>Generate Image</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost" size="icon"
                                            className="h-7 w-7 rounded-lg text-zinc-600 hover:text-emerald-400 hover:bg-emerald-400/10 transition-all"
                                            onClick={(e) => { e.stopPropagation(); onStartQuiz?.(`${topicB} — ${dimension.name}`); }}
                                            disabled={isGlobalBusy}
                                        >
                                            <BrainCircuit className="h-3.5 w-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="glassmorphism"><p>Start Topic Quiz</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </div>
                </div>

                {/* ── Shared cross-topic footer ── */}
                <div className="mt-auto flex items-center justify-between gap-2 pt-3 border-t border-white/5">
                    <div className="flex items-center gap-1">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost" size="icon"
                                        className="h-8 w-8 rounded-xl text-zinc-500 hover:text-blue-400 hover:bg-blue-400/10 transition-all"
                                        onClick={(e) => { e.stopPropagation(); onDrillDown?.(dimension.name); }}
                                        disabled={isGlobalBusy}
                                    >
                                        <Network className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="glassmorphism"><p>Generate Sub-Map</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost" size="icon"
                                        className="h-8 w-8 rounded-xl text-zinc-500 hover:text-amber-400 hover:bg-amber-400/10 transition-all"
                                        onClick={handleCopy}
                                    >
                                        {isCopied ? <LucideIcons.Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="glassmorphism"><p>{isCopied ? 'Copied!' : 'Copy All Insights'}</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>

                    <Button
                        onClick={(e) => {
                            e.stopPropagation();
                            onSubCategoryClick?.({ title: dimension.name, description: dimension.neutralSynthesis } as any);
                        }}
                        variant="ghost"
                        className="h-8 py-0 px-4 text-xs font-bold text-zinc-500 hover:text-white hover:bg-white/5 rounded-full group-hover:bg-primary/20 group-hover:text-primary transition-all flex items-center gap-2"
                    >
                        Deep Dive Analysis <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </div>
            </CardContent>
            </Card>
        );
    };
