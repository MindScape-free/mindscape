import React from 'react';
import {
    ChevronRight,
    BrainCircuit,
    Sparkles,
    Bot,
    UserRound,
    Zap,
    Palette,
    Brain,
    RefreshCw,
    List,
    Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MindMapData } from '@/types/mind-map';
import Image from 'next/image';

interface TopicHeaderProps {
    mindMap: MindMapData;
    mindMapStack: MindMapData[];
    activeStackIndex: number;
    onStackSelect?: (index: number) => void;
    description?: string;
    showBadge?: boolean;
    badgeText?: string;
    persona?: string;
    depth?: 'low' | 'medium' | 'deep';
    isMinimal?: boolean;
    rootMap?: { id: string; topic: string; icon?: string } | null;
    allSubMaps?: any[];
}

/**
 * TopicHeader component for MindScape
 */
export const TopicHeader = ({
    mindMap,
    mindMapStack,
    activeStackIndex,
    onStackSelect,
    description,
    showBadge,
    badgeText,
    persona,
    depth,
    isMinimal = false,
    rootMap,
    allSubMaps
}: TopicHeaderProps) => {
    // Compute true hierarchical path based on rootMap and allSubMaps
    const hierarchicalPath = React.useMemo(() => {
        if (!rootMap || !allSubMaps) {
            return mindMapStack.slice(0, activeStackIndex + 1).map((m, idx) => ({
                id: m.id,
                topic: m.shortTitle || m.topic,
                depth: idx,
                isStackFallback: true,
                stackIndex: idx
            }));
        }

        const path = [];
        let currentId: string | undefined = mindMap.id;
        let safeCount = 0;

        while (currentId && safeCount < 10) {
            safeCount++;
            if (currentId === rootMap.id) {
                path.unshift({
                    id: rootMap.id,
                    topic: rootMap.topic,
                    depth: 0
                });
                break;
            }

            const subMap = allSubMaps.find(m => m.id === currentId);
            if (subMap) {
                path.unshift({
                    id: subMap.id,
                    topic: subMap.topic || subMap.fullData?.shortTitle,
                    depth: subMap.depth
                });
                currentId = subMap.fullData?.parentMapId;
            } else {
                if (currentId === mindMap.id) {
                    const parentId = (mindMap as any).parentMapId;
                    const parentDepth = parentId ? (allSubMaps.find(m => m.id === parentId)?.depth || 0) : 0;
                    path.unshift({
                        id: mindMap.id,
                        topic: mindMap.shortTitle || mindMap.topic,
                        depth: parentDepth + 1
                    });
                    currentId = parentId;
                } else {
                    break;
                }
            }
        }
        return path;
    }, [mindMap, rootMap, allSubMaps, mindMapStack, activeStackIndex]);

    const handlePathClick = (item: any) => {
        if (item.isStackFallback && item.stackIndex !== undefined) {
            onStackSelect?.(item.stackIndex);
            return;
        }
        if (item.id) {
            const stackIdx = mindMapStack.findIndex(m => m.id === item.id);
            if (stackIdx !== -1) {
                onStackSelect?.(stackIdx);
            }
        }
    };

    return (
        <div className={cn(
            "relative animate-in fade-in slide-in-from-top-4 duration-1000 mt-8",
            isMinimal ? "mb-0" : "mb-6"
        )}>
            {/* Premium Container */}
            <div className={cn(
                "relative overflow-hidden transition-all duration-500 group",
                isMinimal
                    ? "bg-transparent border-none shadow-none min-h-0"
                    : "rounded-3xl border border-white/10 bg-[#09090b] shadow-2xl min-h-[220px] hover:border-primary/30"
            )}>

                {/* Content Layer */}
                <div className={cn(
                    "relative z-10 flex flex-col justify-center max-w-full transition-all duration-500",
                    isMinimal ? "p-4 items-center text-center" : "p-8 md:px-14 md:py-12 h-full min-h-[220px]"
                )}>

                    {/* Badge Integration */}
                    {showBadge && (
                        <div className="mb-6 flex flex-wrap gap-2">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/20 border border-primary/30 text-primary text-[10px] font-black tracking-[0.2em] uppercase backdrop-blur-md shadow-[0_0_15px_rgba(var(--primary),0.1)]">
                                <Sparkles className="h-3.5 w-3.5" />
                                {badgeText || 'Mind Map'}
                            </div>

                            {/* Persona Badge */}
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900/50 border border-white/10 text-zinc-300 text-[10px] font-black tracking-[0.2em] uppercase backdrop-blur-md">
                                {!persona && <Bot className="h-3 w-3 text-zinc-400" />}
                                {persona === 'Teacher' && <UserRound className="h-3 w-3 text-blue-400" />}
                                {persona === 'Concise' && <Zap className="h-3 w-3 text-amber-400" />}
                                {persona === 'Creative' && <Palette className="h-3 w-3 text-pink-400" />}
                                {persona === 'Sage' && <Brain className="h-3 w-3 text-purple-400" />}
                                {persona || 'Teacher'}
                            </div>

                            {/* Depth Badge */}
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900/50 border border-white/10 text-zinc-300 text-[10px] font-black tracking-[0.2em] uppercase backdrop-blur-md">
                                {depth === 'low' && <RefreshCw className="h-3 w-3 opacity-50" />}
                                {depth === 'medium' && <List className="h-3 w-3 opacity-50" />}
                                {depth === 'deep' && <Sparkles className="h-3 w-3 text-purple-400" />}
                                {depth === 'low' ? 'Quick' : depth === 'medium' ? 'Balanced' : depth === 'deep' ? 'Detailed' : 'Balanced'}
                            </div>
                        </div>
                    )}

                    {/* Breadcrumbs / Navigation Stack */}
                    {hierarchicalPath.length > 1 && (
                        <div className="flex flex-wrap items-center gap-2 mb-6">
                            {hierarchicalPath.map((pathItem, idx) => {
                                const isCurrentMap = idx === hierarchicalPath.length - 1;
                                const levelLabel = `L${pathItem.depth}`;

                                return (
                                    <React.Fragment key={idx}>
                                        <button
                                            onClick={() => handlePathClick(pathItem)}
                                            className={cn(
                                                "text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5",
                                                isCurrentMap
                                                    ? "text-primary/90 cursor-default pointer-events-none"
                                                    : "text-zinc-500 hover:text-zinc-300"
                                            )}
                                        >
                                            <span className="opacity-50">{levelLabel}</span>
                                            <span>{pathItem.topic}</span>
                                        </button>
                                        {!isCurrentMap && (
                                            <ChevronRight className="w-3 h-3 text-zinc-700" />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    )}

                    <h1 className={cn(
                        "font-black text-white tracking-tighter transition-transform duration-500",
                        isMinimal
                            ? "text-5xl md:text-8xl leading-[0.8] mb-2 uppercase font-orbitron bg-clip-text text-transparent bg-gradient-to-b from-white via-white/90 to-white/40"
                            : "text-4xl md:text-6xl leading-[0.9] group-hover:-translate-x-1"
                    )}>
                        {mindMap.shortTitle || mindMap.topic}
                    </h1>

                    {/* Mission Objective Subtitle */}
                    <div className="flex items-center gap-2 mt-3 animate-in fade-in slide-in-from-left-4 duration-700 delay-200">
                        <div className="p-1 rounded-full bg-white/5 border border-white/10">
                            <Search className="w-3 h-3 text-zinc-500" />
                        </div>
                        <span className="text-sm font-bold text-zinc-500 uppercase tracking-widest font-orbitron">
                            {mindMap.topic}
                        </span>
                    </div>

                    {description && (
                        <p className="text-lg md:text-xl text-zinc-400 font-medium leading-relaxed max-w-2xl mt-6 animate-in fade-in slide-in-from-left-4 duration-700 delay-300">
                            {description}
                        </p>
                    )}
                </div>
            </div>

            {/* Animated Background Glow */}
            <div className="absolute -top-32 -left-32 w-80 h-80 bg-primary/10 rounded-full blur-[120px] opacity-40 group-hover:opacity-60 transition-opacity duration-1000 animate-pulse" />

            {/* Decorative Grid Pattern Overlay */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:32px_32px]" />
        </div>
    );
};
