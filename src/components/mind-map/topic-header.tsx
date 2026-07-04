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
import { cn, truncateText } from '@/lib/utils';
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
    centered?: boolean;
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
    allSubMaps,
    centered = false
}: TopicHeaderProps) => {
    // Compute true hierarchical path based on rootMap and allSubMaps
    const hierarchicalPath = React.useMemo(() => {
        if (!rootMap || !allSubMaps) {
            const currentStack = mindMapStack.slice(0, activeStackIndex + 1);
            if (currentStack.length === 0) return [];

            const path = [];
            let currentMap: MindMapData | undefined = currentStack[currentStack.length - 1];
            let safeCount = 0;

            while (currentMap && safeCount < 10) {
                safeCount++;
                const parentId: string | undefined = (currentMap as any).parentMapId || (currentMap as any).parent_map_id;
                
                path.unshift({
                    id: currentMap.id,
                    topic: currentMap.shortTitle || currentMap.topic,
                    depth: 0, 
                    isStackFallback: true,
                    stackIndex: currentStack.findIndex(m => m.id === currentMap?.id)
                });

                if (parentId) {
                    currentMap = currentStack.find(m => m.id === parentId);
                } else {
                    currentMap = undefined;
                }
            }

            // Assign depths based on resolved hierarchy
            return path.map((item, idx) => ({ ...item, depth: idx }));
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
                currentId = subMap.fullData?.parentMapId || (subMap.fullData as any)?.parent_map_id;
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

    // Responsive font-size scaling based on title length
    const titleText = mindMap.shortTitle || mindMap.topic;
    const titleLen = titleText?.length || 0;

    const titleSizeClass = isMinimal
        ? titleLen > 80
            ? "text-3xl md:text-5xl"
            : titleLen > 50
                ? "text-4xl md:text-6xl"
                : titleLen > 30
                    ? "text-5xl md:text-7xl"
                    : "text-5xl md:text-8xl"
        : titleLen > 90
            ? "text-xl md:text-3xl"
            : titleLen > 55
                ? "text-2xl md:text-4xl"
                : titleLen > 30
                    ? "text-3xl md:text-5xl"
                    : "text-4xl md:text-6xl";

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
                    (isMinimal || centered) ? "p-4 items-center text-center" : "p-8 md:px-14 md:py-12 h-full min-h-[220px]"
                )}>

                    {/* Badge Integration */}
                    {showBadge && (
                        <div className={cn("mb-6 flex flex-wrap gap-2", (isMinimal || centered) && "justify-center")}>
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
                        <div className={cn("flex flex-wrap items-center gap-2 mb-6", (isMinimal || centered) && "justify-center")}>
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
                                            <span>{truncateText(pathItem.topic, 25)}</span>
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
                        "font-black text-white tracking-tighter transition-transform duration-500 break-words text-balance",
                        isMinimal
                            ? cn(titleSizeClass, "leading-[0.8] mb-2 uppercase font-orbitron bg-clip-text text-transparent bg-gradient-to-b from-white via-white/90 to-white/40")
                            : cn(titleSizeClass, "leading-[1.1]", !centered && "group-hover:-translate-x-1")
                    )}>
                        {titleText}
                    </h1>

                    {/* Mission Objective Subtitle */}
                    <div className={cn("flex items-center gap-2 mt-3 animate-in fade-in duration-700 delay-200", (isMinimal || centered) ? "justify-center" : "slide-in-from-left-4")}>
                        <div className="p-1 rounded-full bg-white/5 border border-white/10">
                            <Search className="w-3 h-3 text-zinc-500" />
                        </div>
                        <span className="text-sm font-bold text-zinc-500 uppercase tracking-widest font-orbitron break-words">
                            {mindMap.topic}
                        </span>
                    </div>

                    {description && (
                        <p className={cn("text-lg md:text-xl text-zinc-400 font-medium leading-relaxed max-w-2xl mt-6 animate-in fade-in duration-700 delay-300", (isMinimal || centered) ? "text-center mx-auto" : "slide-in-from-left-4")}>
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
