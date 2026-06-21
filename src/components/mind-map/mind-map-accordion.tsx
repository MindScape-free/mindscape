"use client";

import React, { useState, memo } from 'react';
import * as LucideIcons from 'lucide-react';
import { 
    ChevronDown, 
    Network, 
    Layers, 
    BrainCircuit, 
    MessageCircle, 
    Sparkles, 
    FolderOpen,
    Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { LeafNodeCard } from './leaf-node-card';
import { InsightCard } from './insight-card';
import { toPascalCase } from '@/lib/utils';

interface MindMapAccordionProps {
    mindMap: any;
    mainTopic?: string;
    onGenerateNewMap: (topic: string, parentId: string, contextPath: string, mode?: 'foreground' | 'background') => void;
    onExplainInChat: (text: string) => void;
    onStartQuiz: (topic: string) => void;
    onOpenNestedMap?: (data: any, id: string) => void;
    generatingNode: string | null;
    nestedExpansions: any[];
    isGlobalBusy?: boolean;
    onPracticeClick: (topic: string) => void;
    onExplainWithExample?: (node: any) => void;
    deepeningTags?: any;
    status?: any;
    isSynthesisMode?: boolean;
    synthesisSelection?: string[];
    onToggleNodeSelection?: (nodeName: string) => void;
    onGenerateImage: (node: any) => void;
    onSubCategoryClick: (node: any) => void;
    openSubTopics: string[];
    setOpenSubTopics: (topics: string[] | ((prev: string[]) => string[])) => void;
    openCategories: string[];
    setOpenCategories: (categories: string[] | ((prev: string[]) => string[])) => void;
}

const cleanCitations = (text: string) => {
    return text.replace(/\[\d+\]/g, '').trim();
};

const MindMapAccordionComponent = ({
    mindMap,
    onGenerateNewMap,
    onExplainInChat,
    onStartQuiz,
    onOpenNestedMap,
    generatingNode,
    nestedExpansions,
    isGlobalBusy,
    onGenerateImage,
    onSubCategoryClick,
    onPracticeClick,
    isSynthesisMode,
    synthesisSelection = [],
    onToggleNodeSelection,
    openSubTopics,
    setOpenSubTopics,
    openCategories,
    setOpenCategories
}: MindMapAccordionProps) => {
    const [showInsight, setShowInsight] = useState<string | null>(null);

    const toggleInsight = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setShowInsight(showInsight === id ? null : id);
    };

    if (!mindMap || !mindMap.subTopics) return null;

    const mainTopic = mindMap.topic;

    return (
        <Accordion 
            type="multiple" 
            value={openSubTopics} 
            onValueChange={setOpenSubTopics} 
            className="w-full space-y-4 px-4 pb-20"
        >
            {mindMap.subTopics.map((subTopic: any, index: number) => {
                const SubTopicIcon = (LucideIcons as any)[toPascalCase(subTopic.icon)] || Layers;
                const subTopicId = `topic-${index}`;
                const deepeningTags = (mindMap as any).deepeningTags || [];

                return (
                    <AccordionItem 
                        key={index} 
                        value={subTopicId}
                        className="border-none rounded-3xl bg-zinc-900/40 backdrop-blur-xl border border-white/5 overflow-hidden shadow-2xl transition-all duration-500 hover:bg-zinc-900/60"
                    >
                        <div 
                            className="group/subtopic px-8 py-7 flex items-center justify-between cursor-pointer relative"
                            onClick={() => {
                                setOpenSubTopics(openSubTopics.includes(subTopicId) ? openSubTopics.filter(x => x !== subTopicId) : [...openSubTopics, subTopicId]);
                            }}
                        >
                            {/* #10 — Shimmer overlay while quiz-deepening this branch */}
                            {deepeningTags.some((t: string) => subTopic.name.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(subTopic.name.toLowerCase())) && (
                                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                    <div className="absolute inset-0 bg-amber-500/5" />
                                    <div className="absolute top-0 bottom-0 w-1/3 bg-gradient-to-r from-transparent via-amber-400/10 to-transparent animate-shimmer" />
                                    <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
                                </div>
                            )}

                            <div className="flex items-center gap-6 flex-1">
                                {isSynthesisMode ? (
                                    <div 
                                        className={cn(
                                            "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-500 shrink-0 cursor-pointer hover:scale-110",
                                            synthesisSelection.includes(subTopic.name)
                                                ? "bg-amber-500 border-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                                                : "bg-white/5 border-white/10 text-transparent"
                                        )}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onToggleNodeSelection) onToggleNodeSelection(subTopic.name);
                                        }}
                                    >
                                        <LucideIcons.Check className="w-5 h-5 stroke-[4px]" />
                                    </div>
                                ) : (
                                    <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-primary text-white shadow-[0_0_30px_rgba(139,92,246,0.3)] ring-1 ring-white/20 group-hover/subtopic:scale-110 transition-all duration-500 shrink-0">
                                        <SubTopicIcon className="h-6 w-6" />
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <h3 className="text-2xl font-semibold text-zinc-100 tracking-tight group-hover/subtopic:translate-x-1 transition-transform duration-300 truncate">
                                        {cleanCitations(subTopic.name)}
                                    </h3>
                                    <div className="flex gap-4 mt-1">
                                        {subTopic.name === "Synthesizing..." ? (
                                            <span className="text-xs font-medium text-amber-400 uppercase tracking-widest flex items-center gap-2 animate-pulse">
                                                <LucideIcons.Loader2 className="w-3 h-3 animate-spin" />
                                                Merging Knowledge...
                                            </span>
                                        ) : (
                                            <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                                                {subTopic.categories?.length || 0} Concept Categories
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {!isSynthesisMode && subTopic.insight && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button 
                                                    onClick={(e) => toggleInsight(subTopicId, e)}
                                                    className={cn(
                                                        "w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-300",
                                                        showInsight === subTopicId 
                                                            ? "bg-primary text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]" 
                                                            : "bg-white/5 text-zinc-500 hover:bg-white/10 hover:text-primary"
                                                    )}
                                                >
                                                    <Info className="h-4 w-4" />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent className="glassmorphism"><p>Branch Insights</p></TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}

                                {!isSynthesisMode && (
                                    <div className="flex items-center gap-1.5">
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onGenerateNewMap(subTopic.name, subTopicId, `${mainTopic} > ${subTopic.name}`);
                                                        }}
                                                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 text-zinc-500 hover:bg-primary hover:text-white transition-all duration-300"
                                                    >
                                                        <Network className="w-4 h-4" />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent><p>Generate Concept Map</p></TooltipContent>
                                            </Tooltip>
                                            
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onExplainInChat(`Deep dive into ${subTopic.name} from the map ${mainTopic}.`);
                                                        }}
                                                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 text-zinc-500 hover:bg-primary hover:text-white transition-all duration-300"
                                                    >
                                                        <BrainCircuit className="w-4 h-4" />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent><p>Deep Intelligence</p></TooltipContent>
                                            </Tooltip>

                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onPracticeClick(subTopic.name);
                                                        }}
                                                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 text-zinc-500 hover:bg-primary hover:text-white transition-all duration-300"
                                                    >
                                                        <LucideIcons.Swords className="w-4 h-4" />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent><p>Cognitive Duel</p></TooltipContent>
                                            </Tooltip>

                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onExplainInChat(`Summarize ${subTopic.name}.`);
                                                        }}
                                                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 text-zinc-500 hover:bg-primary hover:text-white transition-all duration-300"
                                                    >
                                                        <MessageCircle className="w-4 h-4" />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent><p>Contextual Chat</p></TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                )}

                                <div className={cn(
                                    "w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 text-zinc-500 transition-transform duration-500",
                                    openSubTopics.includes(subTopicId) && "rotate-180 bg-primary/10 text-primary"
                                )}>
                                    <ChevronDown className="w-5 h-5" />
                                </div>
                            </div>
                        </div>

                        {showInsight === subTopicId && subTopic.insight && (
                            <div className="px-8 pb-4">
                                <InsightCard text={subTopic.insight} title={subTopic.name} mode="topic" />
                            </div>
                        )}

                        <AccordionContent className="px-8 pb-8 pt-2">
                            <div className="space-y-3">
                                {subTopic.categories?.map((category: any, catIndex: number) => {
                                    const CategoryIcon = (LucideIcons as any)[toPascalCase(category.icon)] || FolderOpen;
                                    const catId = `cat-${index}-${catIndex}`;

                                    return (
                                        <div key={catIndex} className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden shadow-inner">
                                            <div
                                                className="group/cat px-6 py-5 flex items-center justify-between hover:bg-white/[0.04] transition-colors cursor-pointer"
                                                onClick={() => {
                                                    setOpenCategories(prev => prev.includes(catId) ? prev.filter(x => x !== catId) : [...prev, catId]);
                                                }}
                                            >
                                                <div className="flex items-center gap-5 flex-1">
                                                    {isSynthesisMode ? (
                                                        <div 
                                                            className={cn(
                                                                "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-500 shrink-0 cursor-pointer hover:scale-110",
                                                                synthesisSelection.includes(category.name)
                                                                    ? "bg-amber-500 border-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                                                                    : "bg-white/5 border-white/10 text-transparent"
                                                            )}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (onToggleNodeSelection) onToggleNodeSelection(category.name);
                                                            }}
                                                        >
                                                            <LucideIcons.Check className="w-4 h-4 stroke-[4px]" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-10 h-10 flex items-center justify-center rounded-2xl bg-zinc-800 text-zinc-300 border border-white/10 group-hover/cat:bg-primary group-hover/cat:text-white transition-all duration-500 shrink-0">
                                                            {category.name === "Synthesizing..." ? <LucideIcons.Loader2 className="h-5 w-5 animate-spin text-amber-400" /> : <CategoryIcon className="h-5 w-5" />}
                                                        </div>
                                                    )}
                                                    <h4 className="text-lg font-semibold text-zinc-200 group-hover/cat:translate-x-1 transition-transform duration-300 truncate">{cleanCitations(category.name)}</h4>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    {!isSynthesisMode && category.insight && (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <button 
                                                                        onClick={(e) => toggleInsight(catId, e)}
                                                                        className={cn(
                                                                            "w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-300",
                                                                            showInsight === catId 
                                                                                ? "bg-primary text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]" 
                                                                                : "bg-white/5 text-zinc-500 hover:bg-white/10 hover:text-primary"
                                                                        )}
                                                                    >
                                                                        <Info className="h-4 w-4" />
                                                                    </button>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="glassmorphism"><p>Conceptual Insights</p></TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}

                                                    {!isSynthesisMode && (
                                                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-primary hover:bg-primary/10 transition-all rounded-lg" onClick={() => onGenerateNewMap(category.name, catId, `${mainTopic} > ${subTopic.name}`, 'background')} disabled={isGlobalBusy}>
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
                                                                            <LucideIcons.Swords className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent className="glassmorphism"><p>Practice Arena</p></TooltipContent>
                                                                </Tooltip>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-blue-400 hover:bg-blue-400/10 transition-all rounded-lg" onClick={() => onExplainInChat(`Detail ${category.name}.`)}>
                                                                            <MessageCircle className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent className="glassmorphism"><p>Ask AI Assistant</p></TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </div>
                                                    )}

                                                    <div className={cn(
                                                        "w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 text-zinc-500 transition-transform duration-300",
                                                        openCategories.includes(catId) && "rotate-180 bg-primary/10 text-primary"
                                                    )}>
                                                        <ChevronDown className="w-4 h-4" />
                                                    </div>
                                                </div>
                                            </div>

                                            {showInsight === catId && category.insight && (
                                                <div className="px-6 pb-2">
                                                    <InsightCard text={category.insight} title={category.name} mode="category" />
                                                </div>
                                            )}

                                            {openCategories.includes(catId) && (
                                                <div className="px-6 pb-6 pt-2 animate-in slide-in-from-top-4 duration-500">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                        {category.subCategories?.map((sub: any, subIndex: number) => (
                                                            <LeafNodeCard
                                                                key={subIndex}
                                                                node={sub}
                                                                onSubCategoryClick={onSubCategoryClick}
                                                                onGenerateImage={onGenerateImage}
                                                                onExplainInChat={onExplainInChat}
                                                                onGenerateNewMap={onGenerateNewMap}
                                                                onStartQuiz={onStartQuiz}
                                                                isGeneratingMap={generatingNode === `node-${index}-${catIndex}-${subIndex}`}
                                                                mainTopic={mainTopic}
                                                                nodeId={`node-${index}-${catIndex}-${subIndex}`}
                                                                contextPath={`${mainTopic} > ${subTopic.name} > ${category.name} > ${sub.name}`}
                                                                existingExpansion={nestedExpansions.find(e => e.topic === sub.name)}
                                                                onOpenMap={onOpenNestedMap}
                                                                isGlobalBusy={isGlobalBusy}
                                                                onPracticeClick={onPracticeClick}
                                                                videoId={mindMap.videoId}
                                                                isSynthesisMode={isSynthesisMode}
                                                                isSelected={synthesisSelection.includes(sub.name)}
                                                                onToggleSelection={onToggleNodeSelection}
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
};

MindMapAccordionComponent.displayName = 'MindMapAccordion';
export const MindMapAccordion = memo(MindMapAccordionComponent);
