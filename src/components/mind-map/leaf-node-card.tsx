'use client';

import React, { memo } from 'react';
import * as LucideIcons from 'lucide-react';
import {
    FileText,
    Loader2,
    Network,
    Image as ImageIcon,
    MessageCircle,
    ArrowRight,
    Copy,
    Check,
    BrainCircuit
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn, toPascalCase, cleanCitations } from '@/lib/utils';
import { SubCategory, MindMapData } from '@/types/mind-map';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface LeafNodeCardProps {
    node: SubCategory;
    onSubCategoryClick: (subCategory: SubCategory) => void;
    onGenerateImage: (subCategory: SubCategory) => void;
    onExplainInChat: (message: string) => void;
    onGenerateNewMap: (topic: string, nodeId: string, contextPath: string, mode?: 'foreground' | 'background') => void;
    isGeneratingMap: boolean;
    mainTopic: string;
    nodeId: string;
    contextPath: string;
    existingExpansion?: any;
    onOpenMap?: (mapData: MindMapData, id: string) => void;
    onStartQuiz: (topic: string) => void;
    isGlobalBusy?: boolean;
    onPracticeClick: (topic: string) => void;
    videoId?: string;
}

export const LeafNodeCard = memo(function LeafNodeCard({
    node,
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
    onPracticeClick,
    videoId,
}: LeafNodeCardProps) {
    const Icon = (LucideIcons as any)[toPascalCase(node.icon || 'FileText')] || FileText;

    const { toast } = useToast();
    const [isCopied, setIsCopied] = useState(false);

    const handleExpandClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onGenerateNewMap(node.name, nodeId, contextPath, 'background');
    };

    const handleChatClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onExplainInChat(`Explain "${node.name}" in the context of ${mainTopic}.`);
    };

    const handleImageClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onGenerateImage(node);
    };

    const handleQuizClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onStartQuiz(node.name);
    };

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        const text = `${node.name}: ${node.description}`;
        navigator.clipboard.writeText(text);
        setIsCopied(true);
        toast({ title: "Copied", description: "Node content copied to clipboard." });
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <Card
            className="group/item relative h-full cursor-pointer rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-primary/40 hover:shadow-[0_0_40px_rgba(139,92,246,0.1)] transition-all duration-500 overflow-hidden flex flex-col"
            onClick={() => onSubCategoryClick(node)}
        >
            {/* #10 — Quiz insight pill */}
            {node.source === 'quiz' && node.quizScore !== undefined && (
                <div className="absolute -top-2 right-3 z-10 pointer-events-none">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-black uppercase tracking-widest"
                        style={{ animation: 'quizPulse 2.5s ease-in-out infinite' }}>
                        📊 Quiz · {node.quizScore}%
                    </span>
                </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-500" />

            <div className="relative z-10 p-5 flex flex-col h-full">
                <div className="flex items-start gap-4 mb-4">
                    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary group-hover/item:scale-110 group-hover/item:bg-primary group-hover/item:text-white transition-all duration-500">
                        <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-base font-semibold text-zinc-100 leading-snug group-hover/item:text-white transition-colors">
                            {cleanCitations(node.name)}
                        </h4>
                        <div className="flex items-center mt-1 gap-2">
                            {existingExpansion && <Badge variant="outline" className="text-[10px] h-4 py-0 px-1.5 border-emerald-500/30 text-emerald-400 font-medium bg-emerald-500/5">Expanded</Badge>}
                            {node.timestamp !== undefined && videoId && (
                                <a
                                    href={`https://youtu.be/${videoId}?t=${Math.floor(node.timestamp)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="no-underline"
                                >
                                    <Badge variant="secondary" className="text-[10px] h-4 py-0 px-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30 flex items-center gap-1 cursor-pointer transition-colors">
                                        <LucideIcons.Play className="w-2 h-2 fill-current" />
                                        {Math.floor(node.timestamp / 60)}:{(node.timestamp % 60).toString().padStart(2, '0')}
                                    </Badge>
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                <p className="text-sm text-zinc-400 leading-relaxed mb-6 flex-grow group-hover/item:text-zinc-300 transition-colors">
                    {cleanCitations(node.description)}
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
                                            existingExpansion ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-500 hover:text-primary hover:bg-primary/10'
                                        )}
                                        onClick={(e) => {
                                            if (existingExpansion?.fullData && onOpenMap) {
                                                onOpenMap(existingExpansion.fullData, existingExpansion.id);
                                            } else {
                                                handleExpandClick(e);
                                            }
                                        }}
                                        disabled={isGeneratingMap || isGlobalBusy}
                                    >
                                        {isGeneratingMap ? <Loader2 className="h-4 w-4 animate-spin" /> : <Network className="h-4 w-4" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="glassmorphism"><p>Generate Sub-Map</p></TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-zinc-500 hover:text-pink-400 hover:bg-pink-400/10 transition-all" onClick={handleImageClick}>
                                        <ImageIcon className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="glassmorphism"><p>Visual Insight</p></TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-emerald-400/10 transition-all" onClick={handleQuizClick}>
                                        <BrainCircuit className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="glassmorphism"><p>Start Concept Quiz</p></TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-zinc-500 hover:text-orange-400 hover:bg-orange-400/10 transition-all" onClick={(e) => {
                                        e.stopPropagation();
                                        onPracticeClick(node.name);
                                    }}>
                                        <LucideIcons.Swords className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="glassmorphism"><p>Practice Arena</p></TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-zinc-500 hover:text-blue-400 hover:bg-blue-400/10 transition-all" onClick={handleChatClick}>
                                        <MessageCircle className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="glassmorphism"><p>Ask AI Assistant</p></TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-zinc-500 hover:text-amber-400 hover:bg-amber-400/10 transition-all" onClick={handleCopy}>
                                        {isCopied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="glassmorphism"><p>{isCopied ? 'Copied!' : 'Copy Context'}</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>

                    <Button
                        onClick={(e) => {
                            e.stopPropagation();
                            onSubCategoryClick(node);
                        }}
                        variant="ghost"
                        className="h-8 py-0 px-3 text-xs font-bold text-zinc-400 hover:text-white hover:bg-white/5 rounded-full group-hover/item:bg-primary/20 group-hover/item:text-primary transition-all flex items-center gap-1"
                    >
                        More <ArrowRight className="w-3 h-3 group-hover/item:translate-x-1 transition-transform" />
                    </Button>
                </div>
            </div>
        </Card >
    );
});
