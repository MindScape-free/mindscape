'use client';

import React from 'react';
import * as LucideIcons from 'lucide-react';
import {
    Library,
    ChevronDown,
    Network,
    MessageCircle,
    FolderOpen,
    Lightbulb,
    Info,
    Sparkles,
    BrainCircuit,
    Swords,
    Layers,
} from 'lucide-react';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn, toPascalCase, cleanCitations } from '@/lib/utils';
import { LeafNodeCard } from './leaf-node-card';
import { Icons } from '../icons';
import {
    MindMapData,
    SubCategory,
    NestedExpansionItem,
    MindMapWithId,
    ExplainableNode,
    SubCategoryInfo,
} from '@/types/mind-map';
import { MindMapStatus } from '@/hooks/use-mind-map-stack';

interface MindMapAccordionProps {
    mindMap: MindMapData;
    openSubTopics: string[];
    setOpenSubTopics: (value: string[]) => void;
    openCategories: string[];
    setOpenCategories: (value: string[] | ((prev: string[]) => string[])) => void;
    onGenerateNewMap: (topic: string, nodeId: string, contextPath: string, mode?: 'foreground' | 'background', depth?: 'low' | 'medium' | 'deep') => void;
    handleSubCategoryClick: (subCategory: SubCategoryInfo) => void;
    handleGenerateImageClick: (subCategory: SubCategory) => void;
    onExplainInChat: (message: string) => void;
    nestedExpansions: NestedExpansionItem[];
    onOpenNestedMap?: (mapData: MindMapData, expansionId: string) => void;
    generatingNode: string | null;
    mainTopic: string;
    onExplainWithExample: (node: ExplainableNode) => void;
    onStartQuiz: (topic: string) => void;
    status: MindMapStatus;
    onPracticeClick: (topic: string) => void;
    deepeningTags?: string[]; // #10 — tags currently being deepened (shows shimmer)
}

const InsightCard = ({ text, title, mode }: { text: string; title: string, mode: 'topic' | 'category' }) => (
    <div className={cn(
        "mb-4 animate-in mt-2 fade-in slide-in-from-top-4 duration-700",
        mode === 'topic' ? "px-0" : "px-0"
    )}>
        {/* Ultra-Minimalist Content-First Container */}
        <div className="relative overflow-hidden rounded-2xl bg-[#0c0c0e]/40 border border-white/5 p-5 backdrop-blur-2xl shadow-lg group/insight-card hover:border-primary/30 transition-all duration-500">

            <div className="relative z-10">
                {/* Content: Pure Typography */}
                <p className="text-base md:text-lg text-zinc-200 leading-relaxed font-serif italic text-balance">
                    "{cleanCitations(text)}"
                </p>
            </div>

            {/* Subtle Gradient Hint */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(circle_at_50%_0%,#8b5cf6_0,transparent_50%)]" />
        </div>
    </div>
);

export const MindMapAccordion = React.memo(({
    mindMap,
    openSubTopics,
    setOpenSubTopics,
    openCategories,
    setOpenCategories,
    onGenerateNewMap,
    handleSubCategoryClick,
    handleGenerateImageClick,
    onExplainInChat,
    nestedExpansions,
    onOpenNestedMap,
    generatingNode,
    mainTopic,
    onExplainWithExample,
    onStartQuiz,
    status,
    onPracticeClick,
    deepeningTags = [],
}: MindMapAccordionProps) => {
    const [showInsight, setShowInsight] = React.useState<string | null>(null);

    const toggleInsight = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setShowInsight(prev => prev === id ? null : id);
    };

    const isGlobalBusy = status !== 'idle';
    return (
        <Accordion
            type="multiple"
            value={openSubTopics}
            onValueChange={setOpenSubTopics}
            className="space-y-4"
        >
            {mindMap.mode === 'single' && (mindMap.subTopics || []).map((subTopic, index) => {
                const SubTopicIcon = (LucideIcons as any)[toPascalCase(subTopic.icon)] || Library;
                const subTopicId = `topic-${index}`;

                return (
                    <AccordionItem
                        key={index}
                        value={subTopicId}
                        className="border-none rounded-2xl bg-zinc-900/20 backdrop-blur-3xl shadow-3xl ring-1 ring-white/5 overflow-hidden data-[state=open]:ring-primary/30 transition-all duration-700"
                    >
                        <div
                            className={cn(
                                "group/subtopic px-8 py-5 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer relative overflow-hidden",
                                deepeningTags.some(t => subTopic.name.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(subTopic.name.toLowerCase())) && "ring-1 ring-amber-500/30"
                            )}
                            onClick={() => {
                                setOpenSubTopics(openSubTopics.includes(subTopicId) ? openSubTopics.filter(x => x !== subTopicId) : [...openSubTopics, subTopicId]);
                            }}
                        >
                            {/* #10 — Shimmer overlay while quiz-deepening this branch */}
                            {deepeningTags.some(t => subTopic.name.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(subTopic.name.toLowerCase())) && (
                                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                    <div className="absolute inset-0 bg-amber-500/5" />
                                    <div className="absolute top-0 bottom-0 w-1/3 bg-gradient-to-r from-transparent via-amber-400/10 to-transparent animate-shimmer" />
                                    <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
                                </div>
                            )}
                            <div className="flex items-center gap-6 flex-1">
                                <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-primary text-white shadow-[0_0_30px_rgba(139,92,246,0.3)] ring-1 ring-white/20 group-hover/subtopic:scale-110 transition-all duration-500">
                                    <SubTopicIcon className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-semibold text-zinc-100 tracking-tight group-hover/subtopic:translate-x-1 transition-transform duration-300">
                                        {subTopic.name}
                                    </h3>
                                    <div className="flex gap-4 mt-1">
                                        <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                                            {subTopic.categories?.length || 0} Concept Categories
                                        </span>
                                        {subTopic.insight && (
                                            <button
                                                onClick={(e) => toggleInsight(subTopicId, e)}
                                                className={cn(
                                                    "h-8 px-4 rounded-full border transition-all duration-300 flex items-center gap-2.5 group/insight",
                                                    showInsight === subTopicId
                                                        ? "bg-primary/20 border-primary/50 text-primary shadow-[0_0_20px_rgba(139,92,246,0.3)] scale-105"
                                                        : "bg-white/5 border-white/10 text-zinc-500 hover:border-primary/30 hover:text-zinc-300"
                                                )}
                                            >
                                                <Sparkles className={cn("w-3.5 h-3.5 transition-transform duration-500", showInsight === subTopicId ? "rotate-180 fill-primary" : "group-hover/insight:rotate-12")} />
                                                <span className="text-[9px] font-black uppercase tracking-[0.2em]">Insight</span>
                                                <div className={cn(
                                                    "w-1 h-1 rounded-full transition-all duration-500",
                                                    showInsight === subTopicId ? "bg-primary animate-pulse w-3" : "bg-zinc-700"
                                                )} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <ChevronDown className={`w-6 h-6 text-zinc-600 transition-transform duration-500 ${openSubTopics.includes(subTopicId) ? 'rotate-180' : ''}`} />
                            </div>

                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-10 w-10 text-zinc-500 hover:text-primary hover:bg-primary/10 rounded-xl" onClick={() => onGenerateNewMap(subTopic.name, subTopicId, mindMap.topic, 'background')} disabled={isGlobalBusy}>
                                                <Network className="h-5 w-5" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent className="glassmorphism"><p>Generate Sub-Map</p></TooltipContent>
                                    </Tooltip>
                                    {/* #4 — Per-branch depth selector */}
                                    <DropdownMenu>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-10 w-10 text-zinc-500 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-xl" disabled={isGlobalBusy}>
                                                        <Layers className="h-5 w-5" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                            </TooltipTrigger>
                                            <TooltipContent className="glassmorphism"><p>Expand at Depth</p></TooltipContent>
                                        </Tooltip>
                                        <DropdownMenuContent className="glassmorphism border-white/10 w-44" align="end">
                                            <div className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-zinc-500">Expand this branch at</div>
                                            {(['low', 'medium', 'deep'] as const).map(d => (
                                                <DropdownMenuItem
                                                    key={d}
                                                    onClick={() => onGenerateNewMap(subTopic.name, subTopicId, mindMap.topic, 'background', d)}
                                                    className="cursor-pointer rounded-lg text-[11px] font-bold uppercase tracking-wide"
                                                >
                                                    <span className={cn('mr-2 w-1.5 h-1.5 rounded-full inline-block', d === 'low' ? 'bg-green-400' : d === 'medium' ? 'bg-blue-400' : 'bg-purple-400')} />
                                                    {d === 'low' ? 'Quick' : d === 'medium' ? 'Balanced' : 'Detailed'}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-10 w-10 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-xl" onClick={() => onStartQuiz(subTopic.name)}>
                                                <BrainCircuit className="h-5 w-5" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent className="glassmorphism"><p>Start Topic Quiz</p></TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-10 w-10 text-zinc-500 hover:text-orange-400 hover:bg-orange-400/10 rounded-xl" onClick={(e) => { e.stopPropagation(); onPracticeClick(subTopic.name); }}>
                                                <Swords className="h-5 w-5" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent className="glassmorphism"><p>Practice Arena</p></TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-10 w-10 text-zinc-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-xl" onClick={() => onExplainInChat(`Explain "${subTopic.name}" in the context of ${mindMap.topic}.`)}>
                                                <MessageCircle className="h-5 w-5" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent className="glassmorphism"><p>Ask AI Assistant</p></TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </div>

                        {/* Top-Level Insight: Independent of AccordionContent */}
                        {showInsight === subTopicId && subTopic.insight && (
                            <div className="px-8 pb-4">
                                <InsightCard text={subTopic.insight} title={subTopic.name} mode="topic" />
                            </div>
                        )}

                        <AccordionContent className="px-8 pb-8 pt-2">
                            <div className="space-y-3">
                                {(subTopic.categories || []).map((category: any, catIndex: number) => {
                                    const CategoryIcon = (LucideIcons as any)[toPascalCase(category.icon)] || FolderOpen;
                                    const catId = `cat-${index}-${catIndex}`;

                                    return (
                                        <div key={catIndex} className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden shadow-inner">
                                            <div
                                                className="group/cat px-6 py-5 flex items-center justify-between hover:bg-white/[0.04] transition-colors cursor-pointer"
                                                onClick={() => setOpenCategories(prev => prev.includes(catId) ? prev.filter(x => x !== catId) : [...prev, catId])}
                                            >
                                                <div className="flex items-center gap-5 flex-1">
                                                    <div className="w-10 h-10 flex items-center justify-center rounded-2xl bg-zinc-800 text-zinc-300 border border-white/10 group-hover/cat:bg-primary group-hover/cat:text-white transition-all duration-500">
                                                        <CategoryIcon className="h-5 w-5" />
                                                    </div>
                                                    <h4 className="text-lg font-semibold text-zinc-200 group-hover/cat:translate-x-1 transition-transform duration-300">{category.name}</h4>
                                                    {category.insight && (
                                                        <button
                                                            onClick={(e) => toggleInsight(catId, e)}
                                                            className={cn(
                                                                "ml-3 h-7 px-3 rounded-full border transition-all duration-300 flex items-center gap-2 group/insight",
                                                                showInsight === catId
                                                                    ? "bg-primary/20 border-primary/50 text-primary shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                                                                    : "bg-white/5 border-white/10 text-zinc-600 hover:border-primary/20 hover:text-zinc-400"
                                                            )}
                                                        >
                                                            <Sparkles className={cn("w-3 h-3 transition-transform duration-500", showInsight === catId ? "rotate-180 fill-primary" : "group-hover/insight:rotate-12")} />
                                                            <span className="text-[8px] font-black uppercase tracking-[0.15em] hidden sm:inline">Insight</span>
                                                        </button>
                                                    )}
                                                    <ChevronDown className={`w-4 h-4 text-zinc-600 transition-transform duration-300 ${openCategories.includes(catId) ? 'rotate-180' : ''}`} />
                                                </div>

                                                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-primary hover:bg-primary/10 transition-all rounded-lg" onClick={() => onGenerateNewMap(category.name, catId, `${mindMap.topic} > ${subTopic.name}`, 'background')} disabled={isGlobalBusy}>
                                                                    <Network className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="glassmorphism"><p>Generate Sub-Map</p></TooltipContent>
                                                        </Tooltip>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-400/10 transition-all rounded-lg" onClick={() => onStartQuiz(category.name)}>
                                                                    <BrainCircuit className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="glassmorphism"><p>Start Category Quiz</p></TooltipContent>
                                                        </Tooltip>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-orange-400 hover:bg-orange-400/10 transition-all rounded-lg" onClick={(e) => { e.stopPropagation(); onPracticeClick(category.name); }}>
                                                                    <Swords className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="glassmorphism"><p>Practice Arena</p></TooltipContent>
                                                        </Tooltip>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-blue-400 hover:bg-blue-400/10 transition-all rounded-lg" onClick={() => onExplainInChat(`Detail the category "${category.name}" within ${subTopic.name}.`)}>
                                                                    <MessageCircle className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="glassmorphism"><p>Ask AI Assistant</p></TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            </div>

                                            {/* Category-Level Insight: Visible even if collapsible grid is hidden */}
                                            {showInsight === catId && category.insight && (
                                                <div className="px-6 pb-2">
                                                    <InsightCard text={category.insight} title={category.name} mode="category" />
                                                </div>
                                            )}

                                            {openCategories.includes(catId) && (
                                                <div className="px-6 pb-6 pt-2 animate-in slide-in-from-top-4 duration-500">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                        {(category.subCategories || []).map((sub: any, subIndex: number) => (
                                                            <LeafNodeCard
                                                                key={subIndex}
                                                                node={sub}
                                                                onSubCategoryClick={handleSubCategoryClick}
                                                                onGenerateImage={handleGenerateImageClick}
                                                                onExplainInChat={onExplainInChat}
                                                                onGenerateNewMap={onGenerateNewMap}
                                                                onStartQuiz={onStartQuiz}
                                                                isGeneratingMap={generatingNode === `node-${index}-${catIndex}-${subIndex}`}
                                                                mainTopic={mindMap.topic}
                                                                nodeId={`node-${index}-${catIndex}-${subIndex}`}
                                                                contextPath={`${mindMap.topic} > ${subTopic.name} > ${category.name} > ${sub.name}`}
                                                                existingExpansion={nestedExpansions.find(e => e.topic === sub.name)}
                                                                onOpenMap={onOpenNestedMap}
                                                                isGlobalBusy={isGlobalBusy}
                                                                onPracticeClick={onPracticeClick}
                                                                videoId={mindMap.videoId}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                );
            })}
        </Accordion>
    );
});
