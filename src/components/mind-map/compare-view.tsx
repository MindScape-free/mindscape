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
    Zap,
    Scale,
    Activity,
    Compass,
    Bot,
    UserRound
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
import { toPascalCase } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
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
    const topicA = topicParts[0] || 'Topic A';
    const topicB = topicParts[1] || 'Topic B';

    return (
        <div className="relative min-h-screen py-10 px-4 sm:px-6 lg:px-8 space-y-16 max-w-7xl mx-auto overflow-hidden">
            {/* Background Orbs */}
            <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/20 rounded-full mix-blend-multiply filter blur-[128px] animate-pulse opacity-30 pointer-events-none" />
            <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-500/20 rounded-full mix-blend-multiply filter blur-[128px] animate-pulse opacity-30 pointer-events-none delay-700" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-500/10 rounded-full mix-blend-multiply filter blur-[128px] animate-pulse opacity-20 pointer-events-none" />

            {/* Header Section - Minimalist & Strategic */}
            <div className="relative space-y-8">
                <div className="flex flex-col items-center">
                    <TopicHeader
                        mindMap={data}
                        mindMapStack={[]}
                        activeStackIndex={0}
                        showBadge={false}
                        isMinimal={true}
                    />
                </div>

                {/* Strategy Command Deck - Sleek & High-Tech */}
                <div className="flex flex-col items-center gap-8 animate-in fade-in slide-in-from-top-4 duration-1000 delay-200">
                    <div className="inline-flex items-center p-2 rounded-full bg-white/[0.02] border border-white/5 backdrop-blur-3xl shadow-2xl ring-1 ring-white/10 hover:bg-white/[0.04] transition-all duration-500">
                        <Button
                            onClick={() => onStartDebate?.(topicA, topicB)}
                            variant="ghost"
                            className="rounded-full h-12 px-10 gap-3 group hover:bg-primary/20 transition-all duration-500"
                        >
                            <Sword className="w-4 h-4 text-primary group-hover:rotate-12 transition-transform" />
                            <div className="flex flex-col items-start leading-none">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Clash</span>
                                <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-tight group-hover:text-primary/70">Strategic Debate</span>
                            </div>
                        </Button>

                        <div className="w-px h-8 bg-white/10 mx-2" />

                        <Button
                            onClick={() => onStartContrastQuiz?.()}
                            variant="ghost"
                            className="rounded-full h-12 px-10 gap-3 group hover:bg-amber-500/20 transition-all duration-500"
                        >
                            <Target className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
                            <div className="flex flex-col items-start leading-none">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Quiz</span>
                                <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-tight group-hover:text-amber-500/70">Core Alignment</span>
                            </div>
                        </Button>



                        <div className="w-px h-8 bg-white/10 mx-2" />

                        <Button
                            onClick={onShowTimeline}
                            variant="ghost"
                            className="rounded-full h-12 px-10 gap-3 group hover:bg-emerald-500/20 transition-all duration-500"
                        >
                            <Activity className="w-4 h-4 text-emerald-500 group-hover:animate-pulse" />
                            <div className="flex flex-col items-start leading-none">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Evolution</span>
                                <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-tight group-hover:text-emerald-500/70">Historical Path</span>
                            </div>
                        </Button>
                    </div>

                </div>
            </div>

            {/* Unity Nexus - Foundational Layer */}
            <section className="relative space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                <div className="flex flex-col items-center text-center space-y-6">
                    <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full border border-emerald-500/30 bg-emerald-500/5 text-emerald-400/80 backdrop-blur-xl">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Shared Core Identity</span>
                    </div>
                    <div>
                        <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase font-orbitron mb-4 italic">Shared DNA</h2>
                        <div className="h-1 w-24 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent mx-auto rounded-full" />
                    </div>
                    <p className="max-w-2xl text-zinc-500 text-base font-medium leading-relaxed tracking-tight px-4">
                        Where the boundaries dissolve. These fundamental principles form the unified foundation shared by both <span className="text-white font-bold">{topicA}</span> and <span className="text-white font-bold">{topicB}</span>.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-4">
                    {compareData.unityNexus?.map((node, i) => (
                        <NexusCard key={i} node={node} index={i} />
                    ))}
                </div>
            </section>

            {/* Dimensional Battleground - The 2-Column Grid */}
            <section className="relative space-y-16 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary">
                        <Sword className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Contrast Arena</span>
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase font-orbitron">Dimensional Arena</h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-4">
                    {compareData.dimensions?.map((dimension, i) => (
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
                        />
                    ))}
                </div>
            </section>

            {/* Synthesis Horizon - Final Conclusion */}
            <section className="relative animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-500" >
                <div className="max-w-4xl mx-auto rounded-[3rem] p-12 bg-zinc-900/40 border border-white/5 backdrop-blur-3xl shadow-3xl ring-1 ring-white/10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 transition-transform duration-700 group-hover:rotate-0">
                        <Compass className="w-64 h-64 text-white" />
                    </div>

                    <div className="relative z-10 space-y-10">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-2">
                                <h3 className="text-sm font-black text-primary uppercase tracking-[0.3em] font-orbitron">Synthesis Horizon</h3>
                                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tighter uppercase italic">Strategic Convergence</h2>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button
                                    onClick={() => onGenerateHybrid?.()}
                                    variant="outline"
                                    className="rounded-2xl border-primary/20 bg-primary/5 hover:bg-primary/20 text-[10px] font-black uppercase tracking-widest px-6"
                                >
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Synthetic Hybrid
                                </Button>
                                <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500">
                                    <Zap className="w-8 h-8" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8 border-t border-white/5">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                        The Expert Verdict
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-zinc-600 hover:text-white"
                                        onClick={() => {
                                            const text = `Expert Verdict on ${data.topic}: ${compareData.synthesisHorizon?.expertVerdict}`;
                                            navigator.clipboard.writeText(text);
                                        }}
                                    >
                                        <Copy className="h-3 w-3" />
                                    </Button>
                                </div>
                                <p className="text-zinc-200 text-lg font-medium leading-relaxed italic">
                                    "{compareData.synthesisHorizon?.expertVerdict}"
                                </p>
                            </div>
                            <div className="space-y-4">
                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                    Future Evolution
                                </span>
                                <p className="text-zinc-400 text-base font-medium leading-relaxed">
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
                                    className="group relative overflow-hidden rounded-[2.5rem] bg-zinc-900/40 border border-white/5 hover:border-amber-500/40 hover:bg-white/[0.04] transition-all duration-700 p-8 flex flex-col h-full shadow-2xl ring-1 ring-white/5"
                                >
                                    <h4 className="text-lg font-black text-zinc-100 mb-2 truncate group-hover:text-amber-400 transition-colors">{link.title}</h4>
                                    <p className="text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors line-clamp-2">{link.description}</p>
                                    <div className="mt-6 flex items-center justify-between">
                                        <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest group-hover:text-amber-500 transition-colors">Access Intelligence</span>
                                        <ArrowRight className="w-4 h-4 text-zinc-800 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
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

const NexusCard = ({ node, index }: { node: CompareNode, index: number }) => {
    const Icon = (LucideIcons as any)[toPascalCase(node.icon || 'circle')] || Target;
    return (
        <div
            className="group relative p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:bg-emerald-500/5 hover:border-emerald-500/30 transition-all duration-700 overflow-hidden shadow-2xl hover:scale-[1.02]"
            style={{ animationDelay: `${index * 100}ms` }}
        >
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-10 transition-opacity">
                <Icon className="w-16 h-16 text-emerald-400" />
            </div>
            <div className="relative z-10 flex flex-col space-y-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500">
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="text-base font-black text-zinc-100 tracking-tight group-hover:text-white mb-1 uppercase font-orbitron">{node.title}</h4>
                    <p className="text-xs text-zinc-500 group-hover:text-emerald-100/60 leading-relaxed font-medium">
                        {node.description}
                    </p>
                </div>
            </div>
        </div>
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
}) => {
    const Icon = (LucideIcons as any)[toPascalCase(dimension.icon || 'layers')] || Activity;
    const [isCopied, setIsCopied] = React.useState(false);
    const { toast } = useToast();

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        const text = `${dimension.name}\n${topicA}: ${dimension.topicAInsight}\n${topicB}: ${dimension.topicBInsight}\nSynthesis: ${dimension.neutralSynthesis}`;
        navigator.clipboard.writeText(text);
        setIsCopied(true);
        toast({ title: "Copied", description: "Dimension insights copied to clipboard." });
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <Card className="group relative overflow-hidden rounded-[2.5rem] bg-[#0B0B12] border-white/5 hover:bg-white/[0.02] transition-all duration-700 flex flex-col h-full shadow-2xl ring-1 ring-white/5 animate-in fade-in slide-in-from-bottom-8 shadow-primary/5">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            <CardHeader className="relative z-10 p-8 pb-4 flex flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary transition-all duration-700 shadow-[0_0_20px_rgba(var(--primary),0.1)]">
                        <Icon className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-xl md:text-2xl font-black text-white tracking-tighter uppercase font-orbitron transition-all duration-500 truncate">
                        {dimension.name}
                    </CardTitle>
                </div>

            </CardHeader>

            <CardContent className="relative z-10 p-8 pt-4 space-y-10 flex-grow flex flex-col">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Topic A Insight */}
                    <div className="relative space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-px h-10 bg-gradient-to-b from-red-500 to-transparent" />
                            <span className="text-[10px] font-black text-red-500/80 uppercase tracking-[0.2em]">{topicA}</span>
                        </div>
                        <div className="pl-4">
                            <p className="text-base font-normal text-zinc-200 leading-relaxed tracking-tight">
                                {dimension.topicAInsight}
                            </p>
                        </div>
                    </div>

                    {/* Topic B Insight */}
                    <div className="relative space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-px h-10 bg-gradient-to-b from-blue-500 to-transparent" />
                            <span className="text-[10px] font-black text-blue-500/80 uppercase tracking-[0.2em]">{topicB}</span>
                        </div>
                        <div className="pl-4">
                            <p className="text-base font-normal text-zinc-200 leading-relaxed tracking-tight">
                                {dimension.topicBInsight}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Styled Convergence Divider */}
                <div className="flex items-center gap-4 py-2 opacity-30 group-hover:opacity-60 transition-opacity duration-700">
                    <div className="h-px flex-grow bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    <span className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.6em]">Convergence</span>
                    <div className="h-px flex-grow bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                </div>

                {/* Architect's Synthesis */}
                <div className="mt-auto">
                    <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 group-hover:bg-primary/[0.03] group-hover:border-primary/20 transition-all duration-700 shadow-inner">
                        <div className="flex items-center gap-2 mb-3">
                            <Scale className="w-4 h-4 text-primary animate-pulse" />
                            <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Architect's Synthesis</span>
                        </div>
                        <p className="text-sm leading-relaxed text-zinc-500 group-hover:text-zinc-300 transition-colors font-normal">
                            {dimension.neutralSynthesis}
                        </p>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="flex items-center justify-between gap-2 pt-6 mt-6 border-t border-white/5">
                        <div className="flex items-center gap-1">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 rounded-xl text-zinc-500 hover:text-primary hover:bg-primary/10 transition-all"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onExplainInChat?.(`Deep dive into ${dimension.name} comparing ${topicA} and ${topicB}.`);
                                            }}
                                            disabled={isGlobalBusy}
                                        >
                                            <MessageCircle className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="glassmorphism"><p>Ask AI Assistant</p></TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 rounded-xl text-zinc-500 hover:text-pink-400 hover:bg-pink-400/10 transition-all"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onGenerateImage?.({ name: dimension.name, description: dimension.neutralSynthesis } as any);
                                            }}
                                            disabled={isGlobalBusy}
                                        >
                                            <Sparkles className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="glassmorphism"><p>Visual Insight</p></TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 rounded-xl text-zinc-500 hover:text-emerald-400 hover:bg-emerald-400/10 transition-all"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onStartQuiz?.(dimension.name);
                                            }}
                                            disabled={isGlobalBusy}
                                        >
                                            <Target className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="glassmorphism"><p>Start Concept Quiz</p></TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 rounded-xl text-zinc-500 hover:text-blue-400 hover:bg-blue-400/10 transition-all"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDrillDown?.(dimension.name);
                                            }}
                                            disabled={isGlobalBusy}
                                        >
                                            <BrainCircuit className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="glassmorphism"><p>Architectural Deep-Dive</p></TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 rounded-xl text-zinc-500 hover:text-amber-400 hover:bg-amber-400/10 transition-all"
                                            onClick={handleCopy}
                                        >
                                            {isCopied ? <LucideIcons.Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="glassmorphism"><p>{isCopied ? 'Copied!' : 'Copy Insights'}</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>

                        <Button
                            onClick={(e) => {
                                e.stopPropagation();
                                onSubCategoryClick?.({ title: dimension.name, description: dimension.neutralSynthesis } as any);
                            }}
                            variant="ghost"
                            className="h-9 py-0 px-4 text-xs font-bold text-zinc-500 hover:text-white hover:bg-white/5 rounded-full group-hover:bg-primary/20 group-hover:text-primary transition-all flex items-center gap-2"
                        >
                            Deep Dive Analysis <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
