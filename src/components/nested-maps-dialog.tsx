'use client';

import React from 'react';
import * as LucideIcons from 'lucide-react';
import {
    ChevronRight,
    RefreshCw,
    Trash2,
    Loader2,
    Network,
    ArrowRight,
    Clock,
    Layers,
    ExternalLink,
    Info,
    Sparkles,
    Image as ImageIcon
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn, cleanCitations, formatShortDistanceToNow } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { NestedExpansionItem } from '@/types/mind-map';

interface NestedMapsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    expansions: NestedExpansionItem[];
    onDelete: (id: string) => void;
    onRegenerate: (parentName: string, id: string) => void;
    onExpandFurther: (nodeName: string, nodeDescription: string, parentId: string) => void;
    expandingId: string | null;
    onExplainInChat?: (message: string) => void;
    mainTopic: string;
    onOpenMap: (mapData: any, id: string) => void;
    isGlobalBusy?: boolean;
    rootMap?: { id: string; topic: string; icon?: string } | null;
    currentMapId?: string;
    onGenerateImage?: (expansion: any) => void;
    generatingImageId?: string | null;
}

const toPascalCase = (str: string) => {
    if (!str) return 'FileText';
    return str.replace(/(^\w|-\w)/g, (text) => text.replace(/-/, '').toUpperCase());
};

/**
 * Dialog for viewing and managing nested mindmap expansions.
 * Displays a simplified list of sub-maps that can be opened.
 */
export function NestedMapsDialog({
    isOpen,
    onClose,
    expansions,
    onDelete,
    onRegenerate,
    onExpandFurther,
    expandingId,
    onExplainInChat,
    mainTopic,
    onOpenMap,
    isGlobalBusy = false,
    rootMap,
    currentMapId,
    onGenerateImage,
    generatingImageId,
}: NestedMapsDialogProps) {

    // State for Miller Columns path (levelIndex -> array of selected item IDs)
    const [expandedLevels, setExpandedLevels] = React.useState<Record<number, string[]>>({});
    const [isExpandAll, setIsExpandAll] = React.useState(false);

    // Auto-expand to current map on open
    React.useEffect(() => {
        if (isOpen && currentMapId && rootMap && currentMapId !== rootMap.id) {
            const path: NestedExpansionItem[] = [];
            let current = expansions.find(e => e.id === currentMapId);

            let safety = 20;
            while (current && current.parentName !== rootMap.topic && safety > 0) {
                path.unshift(current);
                const parent = expansions.find(e => e.topic === current!.parentName);
                current = parent;
                safety--;
            }
            if (current && current.parentName === rootMap.topic) {
                path.unshift(current);
            }

            const newLevels: Record<number, string[]> = {};
            path.forEach((item, index) => {
                newLevels[index + 1] = [item.id];
            });
            setExpandedLevels(newLevels);
        } else if (isOpen) {
            setExpandedLevels({});
        }
    }, [isOpen, currentMapId, rootMap, expansions]);

    const hasSubMaps = expansions.length > 0;
    const totalExpansions = expansions.filter((e, i, self) => self.findIndex(t => t.id === e.id) === i).length;

    const handleOpenMap = (expansion: NestedExpansionItem) => {
        if (!isGlobalBusy && (expansion.fullData || expansion.id)) {
            onOpenMap(expansion.fullData, expansion.id);
            onClose();
        }
    };

    const handleSelect = (item: NestedExpansionItem, levelIndex: number) => {
        let didExpand = false;

        setExpandedLevels(prev => {
            const next = { ...prev };
            const currentLevelExpanded = [...(next[levelIndex] || [])];
            const isAlreadyExpanded = currentLevelExpanded.includes(item.id);

            if (isExpandAll) {
                if (isAlreadyExpanded) {
                    next[levelIndex] = currentLevelExpanded.filter(id => id !== item.id);
                } else {
                    next[levelIndex] = [...currentLevelExpanded, item.id];
                    didExpand = true;
                }
            } else {
                // Exclusive mode: wipe all deeper levels
                Object.keys(next).forEach(key => {
                    const k = parseInt(key);
                    if (k > levelIndex) delete next[k];
                });

                if (isAlreadyExpanded) {
                    // Clicked same item again to close
                    next[levelIndex] = [];
                } else {
                    // Clicked a different item, exclusively select it
                    next[levelIndex] = [item.id];
                    didExpand = true;
                }
            }
            return next;
        });

        // Scroll the container slightly to the right to reveal the new column only if expanding
        if (didExpand) {
            setTimeout(() => {
                const container = document.getElementById('miller-columns-container');
                if (container) {
                    container.scrollTo({
                        left: container.scrollWidth,
                        behavior: 'smooth'
                    });
                }
            }, 50);
        }
    };

    // Build the columns
    const columns: Array<{
        level: number;
        items: NestedExpansionItem[];
        parentName: string;
        isRootColumn?: boolean;
    }> = [];

    if (rootMap) {
        // Column 0: Root Map
        columns.push({
            level: 0,
            items: [],
            parentName: 'System',
            isRootColumn: true
        });

        // Column 1: L1 Maps
        const l1Maps = expansions.filter(e => e.depth === 1 || e.parentName === rootMap.topic);
        if (l1Maps.length > 0) {
            columns.push({
                level: 1,
                items: l1Maps,
                parentName: rootMap.topic
            });
        }

        // Subsequent Columns dynamically built using expandedLevels
        let currentLevel = 1;
        let previousColumnItems = l1Maps;

        while (previousColumnItems.length > 0) {
            const currentExpandedIds = isExpandAll
                ? previousColumnItems.map(i => i.id)
                : (expandedLevels[currentLevel] || []);

            if (currentExpandedIds.length === 0) break;

            const expandedItems = previousColumnItems.filter(i => currentExpandedIds.includes(i.id));
            if (expandedItems.length === 0) break;

            const parentNames = new Set(expandedItems.map(i => i.topic));
            // Ensure we match both the parent name AND the correct depth to avoid cross-map duplication
            const children = expansions.filter(e => parentNames.has(e.parentName) && e.depth === currentLevel + 1);

            if (children.length > 0) {
                columns.push({
                    level: currentLevel + 1,
                    items: children,
                    parentName: currentExpandedIds.length > 1 ? 'Multiple selections' : expandedItems[0].topic
                });
                previousColumnItems = children;
                currentLevel++;
            } else {
                break;
            }
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[95vw] w-[1400px] h-[90vh] flex flex-col p-0 gap-0 border-white/10 bg-[#050505] shadow-2xl overflow-hidden rounded-2xl">
                {/* Header Section */}
                <DialogHeader className="p-6 pb-4 border-b border-white/5 sticky top-0 z-50 bg-[#0A0A0C]/80 backdrop-blur-xl">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="flex items-center gap-3 text-2xl font-bold font-orbitron tracking-wide text-white">
                            <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30 shadow-inner">
                                <Network className="h-6 w-6 text-purple-400" />
                            </div>
                            Knowledge Navigator
                            {totalExpansions > 0 && (
                                <Badge variant="secondary" className="ml-2 bg-white/5 text-zinc-400 hover:bg-white/10 transition-colors hidden sm:inline-flex">
                                    {totalExpansions} Total Sub-Maps
                                </Badge>
                            )}
                        </DialogTitle>

                        {hasSubMaps && (
                            <div className="flex items-center gap-2.5 bg-zinc-950/50 rounded-xl px-3 py-1.5 border border-white/5 shadow-inner backdrop-blur-md transition-colors hover:border-white/10 ml-auto">
                                <label htmlFor="expand-toggle" className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 cursor-pointer select-none flex items-center gap-1.5 transition-colors hover:text-white">
                                    <Layers className="h-3.5 w-3.5" /> Expand All
                                </label>
                                <button
                                    id="expand-toggle"
                                    role="switch"
                                    aria-checked={isExpandAll}
                                    onClick={() => setIsExpandAll(!isExpandAll)}
                                    className={cn(
                                        "relative inline-flex h-[22px] w-[42px] shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-zinc-950 shadow-inner",
                                        isExpandAll ? "bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)] border-purple-400/50" : "bg-black/50 border-white/10"
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out",
                                            isExpandAll ? "translate-x-5 shadow-[0_0_10px_rgba(255,255,255,0.8)]" : "translate-x-0.5 opacity-70"
                                        )}
                                    />
                                </button>
                            </div>
                        )}
                    </div>
                </DialogHeader>

                <div
                    id="miller-columns-container"
                    className="flex-1 min-h-0 relative flex flex-nowrap overflow-x-auto overflow-y-hidden p-6 gap-6 custom-scrollbar scroll-smooth"
                >
                    {!hasSubMaps && !rootMap && (
                        <div className="text-center w-full flex-col justify-center items-center h-full flex mt-[-5vh]">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shadow-2xl shadow-purple-500/5">
                                <Network className="h-10 w-10 text-purple-400/50" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2 font-orbitron tracking-wide">
                                Void Space
                            </h3>
                            <p className="text-zinc-400 max-w-sm mx-auto leading-relaxed">
                                No deeper dimensions discovered yet. Use the <Sparkles className="inline h-4 w-4 mx-1 text-purple-400" /> Sparkles icon on any node to expand your map.
                            </p>
                        </div>
                    )}

                    {columns.map((col, colIndex) => {
                        const isL0 = col.level === 0;
                        const isL1 = col.level === 1;
                        const isL2 = col.level === 2;

                        const levelColor = isL0 ? 'text-purple-400' : isL1 ? 'text-blue-400' : isL2 ? 'text-emerald-400' : 'text-amber-400';
                        const levelBg = isL0 ? 'bg-purple-500/10 border-purple-500/20' : isL1 ? 'bg-blue-500/10 border-blue-500/20' : isL2 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20';

                        return (
                            <div key={`col-${col.level}`} className="flex-none w-[320px] sm:w-[340px] flex flex-col h-full bg-zinc-950/60 rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                                {/* Column Header */}
                                <div className={cn("p-4 border-b border-white/5 backdrop-blur-md sticky top-0 z-40", levelBg)}>
                                    <h3 className={cn("text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2", levelColor)}>
                                        <Layers className="h-4 w-4" />
                                        Level {col.level} {isL0 ? ': Root' : ''}
                                    </h3>
                                    {!isL0 && (
                                        <p className="text-[10px] text-zinc-500 truncate mt-1.5 font-medium">
                                            from {col.parentName}
                                        </p>
                                    )}
                                </div>

                                {/* Column Content */}
                                <ScrollArea className="flex-1 p-4 pb-8">
                                    <div className="flex flex-col gap-4">
                                        {col.isRootColumn && rootMap ? (
                                            // Root Map Special Card
                                            <div
                                                className={cn(
                                                    "group relative cursor-pointer rounded-2xl p-5 flex flex-col overflow-hidden border transition-all duration-300",
                                                    rootMap.id === currentMapId
                                                        ? 'bg-purple-500/10 border-purple-500/40 shadow-[0_0_30px_rgba(168,85,247,0.15)] ring-1 ring-purple-500/50'
                                                        : 'bg-zinc-900/60 border-white/10 hover:bg-zinc-800/80 hover:border-purple-500/40'
                                                )}
                                                onClick={() => {
                                                    // Selecting root doesn't do much if we are in Miller columns, 
                                                    // selecting root clears active levels
                                                    setExpandedLevels({});
                                                    if (rootMap.id !== currentMapId) {
                                                        onOpenMap(null, rootMap.id);
                                                        onClose();
                                                    }
                                                }}
                                            >
                                                <div className="flex items-center gap-4 mb-4">
                                                    <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400">
                                                        {(() => {
                                                            const RootIcon = (LucideIcons as any)[toPascalCase(rootMap.icon || 'file-text')] || Network;
                                                            return <RootIcon className="h-6 w-6" />;
                                                        })()}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-base text-white font-bold truncate leading-tight group-hover:text-purple-300 transition-colors">
                                                            {rootMap.topic}
                                                        </h4>
                                                        <p className="text-[11px] text-zinc-500 mt-1 uppercase tracking-wider font-bold">
                                                            {rootMap.id === currentMapId ? 'Active Root' : 'Base Knowledge'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {rootMap.id !== currentMapId && (
                                                    <Button variant="secondary" size="sm" className="w-full bg-purple-500/20 text-purple-300 hover:text-white hover:bg-purple-500/40 transition-all font-bold tracking-widest uppercase text-[10px] h-9">
                                                        <span>Open Main Map</span>
                                                    </Button>
                                                )}
                                                {rootMap.id === currentMapId && (
                                                    <div className="flex items-center justify-center h-9 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] uppercase tracking-widest font-bold">
                                                        Currently Viewing
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            // Mapping Standard Cards
                                            col.items.map((expansion) => {
                                                const currentLevelExpanded = expandedLevels[col.level] || [];
                                                const numChildren = expansions.filter(e => e.parentName === expansion.topic).length;
                                                // If Expand All is active, visually select it if it has children (since it auto-expands)
                                                const isSelected = isExpandAll ? numChildren > 0 : currentLevelExpanded.includes(expansion.id);
                                                const isExpanding = expandingId === expansion.id;
                                                const isGenerating = expansion.status === 'generating' || generatingImageId === expansion.id;
                                                const isCurrentMap = currentMapId === expansion.id;

                                                const getDisplayDate = (d: any) => {
                                                    if (d instanceof Date) return d;
                                                    if (typeof d === 'number') return new Date(d);
                                                    if (d?.toDate && typeof d.toDate === 'function') return d.toDate();
                                                    if (d?.toMillis && typeof d.toMillis === 'function') return new Date(d.toMillis());
                                                    return null;
                                                };
                                                const createdAt = getDisplayDate(expansion.createdAt);

                                                const mapDataForUrl = expansion.fullData || expansion;
                                                const fallbackImage = `https://gen.pollinations.ai/image/${encodeURIComponent(`${expansion.topic}, professional photography, high quality, detailed, 8k`)}?width=512&height=288&model=flux&enhance=true`;
                                                const thumbnailUrl = (expansion as any).thumbnailUrl || (mapDataForUrl as any).thumbnailUrl || fallbackImage;

                                                return (
                                                    <div
                                                        key={`map-${expansion.id}`}
                                                        className={cn(
                                                            "group relative cursor-pointer rounded-2xl flex flex-col overflow-hidden border transition-all duration-300 h-[280px] shadow-lg",
                                                            isSelected
                                                                ? `bg-zinc-900 border-${levelColor.replace('text-', '')}/60 shadow-[0_0_30px_rgba(255,255,255,0.05)] ring-1 ring-${levelColor.replace('text-', '')}/40`
                                                                : "bg-zinc-950/80 border-white/10 hover:bg-zinc-900 hover:border-white/30 shadow-md"
                                                        )}
                                                        onClick={() => handleSelect(expansion, col.level)}
                                                    >
                                                        {/* Thumbnail Area - fixed height */}
                                                        <div className="relative h-[140px] w-full overflow-hidden bg-[#0A0A0A]">
                                                            {thumbnailUrl ? (
                                                                <>
                                                                    <img
                                                                        src={thumbnailUrl}
                                                                        alt={expansion.topic}
                                                                        className={cn(
                                                                            "w-full h-full object-cover transition-all duration-1000",
                                                                            isSelected ? "scale-105 opacity-100" : "scale-100 opacity-60 group-hover:opacity-80",
                                                                            isGenerating && "blur-md opacity-30"
                                                                        )}
                                                                        loading="lazy"
                                                                        onError={(e) => {
                                                                            if (e.currentTarget.src !== fallbackImage) {
                                                                                e.currentTarget.src = fallbackImage;
                                                                            }
                                                                        }}
                                                                    />
                                                                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                                                                </>
                                                            ) : (
                                                                <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-[#0A0A0A] flex items-center justify-center">
                                                                    {(() => {
                                                                        const TopicIcon = (LucideIcons as any)[toPascalCase(expansion.icon)] || Network;
                                                                        return <TopicIcon className={cn("h-12 w-12 opacity-10", levelColor)} />;
                                                                    })()}
                                                                </div>
                                                            )}

                                                            {/* Top Badges */}
                                                            <div className="absolute top-3 left-3 flex items-center gap-2">
                                                                <Badge variant="outline" className={cn("bg-black/40 backdrop-blur-md border border-white/10 text-[9px] uppercase tracking-widest font-black shadow-xl", levelColor)}>
                                                                    <Layers className="h-2.5 w-2.5 mr-1.5 opacity-70" />
                                                                    Level {col.level}
                                                                </Badge>

                                                                {numChildren > 0 && (
                                                                    <Badge variant="outline" className="bg-black/40 backdrop-blur-md border border-white/10 text-[9px] uppercase tracking-widest font-black text-zinc-300 shadow-xl">
                                                                        {numChildren} Sub{numChildren > 1 ? 's' : ''}
                                                                    </Badge>
                                                                )}

                                                                {isCurrentMap && (
                                                                    <Badge className="bg-white/10 text-white backdrop-blur-md border border-white/20 text-[9px] uppercase tracking-widest font-black shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                                                                        Active
                                                                    </Badge>
                                                                )}
                                                            </div>

                                                            {/* Path Indicator/Arrow for selected items */}
                                                            {isSelected && numChildren > 0 && (
                                                                <div className="absolute -right-1 top-1/2 -translate-y-1/2 h-8 w-8 bg-[#0A0A0A] border border-white/10 rounded-full flex items-center justify-center shadow-xl z-10 translate-x-1/2">
                                                                    <ChevronRight className={cn("h-4 w-4", levelColor)} />
                                                                </div>
                                                            )}

                                                            {/* Generation Overlay */}
                                                            {(isGenerating || isExpanding) && (
                                                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-transparent backdrop-blur-sm z-20">
                                                                    <Loader2 className={cn("h-8 w-8 animate-spin mb-3 drop-shadow-2xl", levelColor)} />
                                                                    <Badge className="bg-black/60 border border-white/10 text-[10px] uppercase tracking-widest text-white backdrop-blur-xl">
                                                                        {isGenerating ? 'Synthesizing...' : 'Expanding...'}
                                                                    </Badge>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Content Area */}
                                                        <div className="relative flex flex-col flex-1 p-4 bg-zinc-950">
                                                            <div>
                                                                <h3 className={cn(
                                                                    "font-bold text-[15px] leading-snug mb-0.5 transition-colors line-clamp-2",
                                                                    isSelected ? "text-white" : "text-zinc-200 group-hover:text-white"
                                                                )}>
                                                                    {expansion.topic}
                                                                </h3>
                                                                <p className="text-[10px] text-zinc-500 truncate w-full">
                                                                    from {expansion.parentName}
                                                                </p>
                                                            </div>

                                                            {/* Actions Footer */}
                                                            <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
                                                                <div className="flex items-center gap-2">
                                                                    {createdAt ? (
                                                                        <TooltipProvider>
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <div className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors">
                                                                                        <Clock className="h-3 w-3" />
                                                                                        <span className="text-[9px] font-bold uppercase tracking-widest">
                                                                                            {formatShortDistanceToNow(createdAt)}
                                                                                        </span>
                                                                                    </div>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent side="bottom" className="text-xs bg-zinc-900 border-zinc-800 text-zinc-300">
                                                                                    Created {createdAt.toLocaleString()}
                                                                                </TooltipContent>
                                                                            </Tooltip>
                                                                        </TooltipProvider>
                                                                    ) : <div />}
                                                                </div>

                                                                <div className="flex items-center gap-1">
                                                                    {!isCurrentMap && (
                                                                        <TooltipProvider>
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="icon"
                                                                                        className="h-7 w-7 rounded-full text-zinc-400 hover:text-white hover:bg-white/10"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            handleOpenMap(expansion);
                                                                                        }}
                                                                                        disabled={isGlobalBusy || isGenerating || isExpanding}
                                                                                    >
                                                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                                                    </Button>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent side="top">Open in Canvas</TooltipContent>
                                                                            </Tooltip>
                                                                        </TooltipProvider>
                                                                    )}

                                                                    {onGenerateImage && (
                                                                        <TooltipProvider>
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="icon"
                                                                                        className="h-7 w-7 rounded-full text-zinc-400 hover:text-purple-400 hover:bg-purple-500/10 transition-colors bg-purple-500/5 group/btn"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            onGenerateImage(expansion);
                                                                                        }}
                                                                                        disabled={isGlobalBusy || isGenerating}
                                                                                    >
                                                                                        <Sparkles className="h-3 w-3 group-hover/btn:animate-pulse" />
                                                                                    </Button>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent side="top">Visual Insight Lab</TooltipContent>
                                                                            </Tooltip>
                                                                        </TooltipProvider>
                                                                    )}

                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                                                                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-zinc-500 hover:text-white hover:bg-white/10">
                                                                                <LucideIcons.MoreVertical className="h-3.5 w-3.5" />
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent align="end" className="w-48 bg-zinc-950 border-zinc-800 p-1">
                                                                            {onExplainInChat && (
                                                                                <DropdownMenuItem
                                                                                    className="text-xs cursor-pointer focus:bg-white/5 focus:text-white py-2"
                                                                                    onClick={(e: React.MouseEvent) => {
                                                                                        e.stopPropagation();
                                                                                        onExplainInChat(`Explain the concepts within the sub-map: ${expansion.topic}`);
                                                                                        onClose();
                                                                                    }}
                                                                                >
                                                                                    <LucideIcons.MessageCircle className="h-3.5 w-3.5 mr-2 text-blue-400" />
                                                                                    Discuss Map
                                                                                </DropdownMenuItem>
                                                                            )}
                                                                            <DropdownMenuItem
                                                                                className="text-xs cursor-pointer focus:bg-white/5 focus:text-white py-2"
                                                                                onClick={(e: React.MouseEvent) => {
                                                                                    e.stopPropagation();
                                                                                    onRegenerate(expansion.parentName, expansion.id);
                                                                                }}
                                                                                disabled={isGlobalBusy || isGenerating || isExpanding}
                                                                            >
                                                                                <RefreshCw className="h-3.5 w-3.5 mr-2 text-indigo-400" />
                                                                                Regenerate Mind Map
                                                                            </DropdownMenuItem>
                                                                            <DropdownMenuItem
                                                                                className="text-xs cursor-pointer text-red-500 focus:bg-red-500/10 focus:text-red-400 py-2"
                                                                                onClick={(e: React.MouseEvent) => {
                                                                                    e.stopPropagation();
                                                                                    onDelete(expansion.id);
                                                                                }}
                                                                                disabled={isGlobalBusy || isGenerating || isExpanding}
                                                                            >
                                                                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                                                                Delete Sub-Map
                                                                            </DropdownMenuItem>
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                    <div className="h-10" /> {/* Bottom padding buffer */}
                                </ScrollArea>
                            </div>
                        );
                    })}
                </div>

                <div className="p-4 border-t border-purple-500/10 bg-[#0A0A0C]/95 backdrop-blur-xl mt-auto z-50">
                    <Button
                        variant="ghost"
                        className="w-full text-zinc-400 hover:bg-white/5 hover:text-white font-bold tracking-[0.2em] h-12 rounded-2xl uppercase text-xs"
                        onClick={onClose}
                    >
                        Close Navigator
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
