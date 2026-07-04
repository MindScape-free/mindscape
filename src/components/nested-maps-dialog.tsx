'use client';

import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import * as LucideIcons from 'lucide-react';
import {
    ChevronRight,
    RefreshCw,
    Trash2,
    Loader2,
    Network,
    Clock,
    Layers,
    ExternalLink,
    Sparkles,
    MoreVertical,
    MessageCircle,
    Search,
    X,
    ChevronsLeft,
    Hash,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn, formatShortDistanceToNow } from '@/lib/utils';
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
import { useToast } from '@/hooks/use-toast';

import { NestedExpansionItem } from '@/types/mind-map';

const MAX_DEPTH = 5;

const LEVEL_STYLES = [
    { color: 'text-indigo-400', border: 'border-indigo-500/20', bg: 'bg-indigo-500/[0.07]', accent: 'bg-indigo-500', glow: 'shadow-indigo-500/5', ring: 'ring-indigo-500/15', gradient: 'from-indigo-500/[0.03] via-transparent to-transparent', badgeBorder: 'border-indigo-500/15', hoverBorder: 'hover:border-indigo-500/30', iconBg: 'bg-indigo-950/60', iconBorder: 'border-indigo-500/20', activeBg: 'bg-indigo-500/10', activeText: 'text-indigo-400', label: 'L0', labelDesc: 'Root', levelBorder: 'border-indigo-500/20' },
    { color: 'text-sky-400', border: 'border-sky-500/20', bg: 'bg-sky-500/[0.07]', accent: 'bg-sky-500', glow: 'shadow-sky-500/5', ring: 'ring-sky-500/15', gradient: 'from-sky-500/[0.03] via-transparent to-transparent', badgeBorder: 'border-sky-500/15', hoverBorder: 'hover:border-sky-500/30', iconBg: 'bg-sky-950/60', iconBorder: 'border-sky-500/20', activeBg: 'bg-sky-500/10', activeText: 'text-sky-400', label: 'L1', labelDesc: 'Level 1', levelBorder: 'border-sky-500/20' },
    { color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/[0.07]', accent: 'bg-emerald-500', glow: 'shadow-emerald-500/5', ring: 'ring-emerald-500/15', gradient: 'from-emerald-500/[0.03] via-transparent to-transparent', badgeBorder: 'border-emerald-500/15', hoverBorder: 'hover:border-emerald-500/30', iconBg: 'bg-emerald-950/60', iconBorder: 'border-emerald-500/20', activeBg: 'bg-emerald-500/10', activeText: 'text-emerald-400', label: 'L2', labelDesc: 'Level 2', levelBorder: 'border-emerald-500/20' },
    { color: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/[0.07]', accent: 'bg-amber-500', glow: 'shadow-amber-500/5', ring: 'ring-amber-500/15', gradient: 'from-amber-500/[0.03] via-transparent to-transparent', badgeBorder: 'border-amber-500/15', hoverBorder: 'hover:border-amber-500/30', iconBg: 'bg-amber-950/60', iconBorder: 'border-amber-500/20', activeBg: 'bg-amber-500/10', activeText: 'text-amber-400', label: 'L3', labelDesc: 'Level 3', levelBorder: 'border-amber-500/20' },
    { color: 'text-rose-400', border: 'border-rose-500/20', bg: 'bg-rose-500/[0.07]', accent: 'bg-rose-500', glow: 'shadow-rose-500/5', ring: 'ring-rose-500/15', gradient: 'from-rose-500/[0.03] via-transparent to-transparent', badgeBorder: 'border-rose-500/15', hoverBorder: 'hover:border-rose-500/30', iconBg: 'bg-rose-950/60', iconBorder: 'border-rose-500/20', activeBg: 'bg-rose-500/10', activeText: 'text-rose-400', label: 'L4', labelDesc: 'Level 4', levelBorder: 'border-rose-500/20' },
    { color: 'text-fuchsia-400', border: 'border-fuchsia-500/20', bg: 'bg-fuchsia-500/[0.07]', accent: 'bg-fuchsia-500', glow: 'shadow-fuchsia-500/5', ring: 'ring-fuchsia-500/15', gradient: 'from-fuchsia-500/[0.03] via-transparent to-transparent', badgeBorder: 'border-fuchsia-500/15', hoverBorder: 'hover:border-fuchsia-500/30', iconBg: 'bg-fuchsia-950/60', iconBorder: 'border-fuchsia-500/20', activeBg: 'bg-fuchsia-500/10', activeText: 'text-fuchsia-400', label: 'L5', labelDesc: 'Level 5 (Max)', levelBorder: 'border-fuchsia-500/20' },
];

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
    hierarchyLoading?: boolean;
}

const toPascalCase = (str: string) => {
    if (!str) return 'FileText';
    return str.replace(/(^\w|-\w)/g, (text) => text.replace(/-/, '').toUpperCase());
};

const getDisplayDate = (d: any): Date | null => {
    if (!d) return null;
    if (d instanceof Date) return d;
    if (typeof d === 'number') return new Date(d);
    if (typeof d === 'string') return new Date(d);
    if (d?.toDate && typeof d.toDate === 'function') return d.toDate();
    if (d?.toMillis && typeof d.toMillis === 'function') return new Date(d.toMillis());
    return null;
};

// ── Animated Entrance Wrapper ──────────────────────────────────────────
function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
    return (
        <div
            className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
            style={{ animationDelay: `${delay}ms`, animationDuration: '400ms' }}
        >
            {children}
        </div>
    );
}

// ── Column Header Component ──────────────────────────────────────────────
function ColumnHeader({ level, label, parentName, style, totalCount }: {
    level: number;
    label: string;
    parentName?: string;
    style: typeof LEVEL_STYLES[0];
    totalCount?: number;
}) {
    return (
        <div className="relative px-4 py-4 border-b border-white/[0.04] bg-zinc-950/60 backdrop-blur-xl">
            <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-bold text-zinc-100 flex items-center gap-2 uppercase tracking-wider">
                        <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", style.accent)} />
                        <span className={cn("inline-flex items-center gap-1.5", level === 0 ? '' : '')}>
                            <span className="truncate">{label}</span>
                        </span>
                        {totalCount !== undefined && (
                            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded-md border border-white/[0.04] ml-1">
                                {totalCount}
                            </span>
                        )}
                    </h3>
                    {parentName && level > 0 && (
                        <p className="text-[11px] text-zinc-500 truncate mt-1.5 flex items-center gap-1">
                            <span className="text-zinc-600">from</span>
                            <span className="text-zinc-400 font-medium">{parentName}</span>
                        </p>
                    )}
                    {level === 0 && (
                        <p className="text-[11px] text-zinc-500 mt-1.5 flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-zinc-600" />
                            Main Knowledge Base
                        </p>
                    )}
                    {level >= MAX_DEPTH && (
                        <p className="text-[11px] text-amber-500 mt-1.5 flex items-center gap-1">
                            <Hash className="w-3 h-3" />
                            Maximum depth reached
                        </p>
                    )}
                </div>
            </div>
            <div className={cn("absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-10", style.color)} />
        </div>
    );
}

// ── Unified LevelCard Component (L0–L5) ─────────────────────────────────
function LevelCard({
    item,
    level,
    levelStyle,
    isCurrentMap,
    childCount,
    isExpanding,
    onSelect,
    onOpen,
    onExplain,
    onRegenerate,
    onDelete,
    onExpandFurther,
    isGlobalBusy,
    index,
}: {
    item: { id: string; topic: string; icon?: string; parentName?: string; createdAt?: string | number | Date };
    level: number;
    levelStyle: typeof LEVEL_STYLES[0];
    isCurrentMap: boolean;
    childCount: number;
    isExpanding: boolean;
    onSelect?: () => void;
    onOpen?: () => void;
    onExplain?: (message: string) => void;
    onRegenerate?: () => void;
    onDelete?: () => void;
    onExpandFurther?: (topic: string, desc: string, id: string) => void;
    isGlobalBusy: boolean;
    index: number;
}) {
    const TopicIcon = (LucideIcons as any)[toPascalCase(item.icon || 'file-text')] || Network;
    const createdAt = getDisplayDate(item.createdAt);
    const hasChildren = childCount > 0;
    const isExpandable = level < MAX_DEPTH;
    const isAtMaxDepth = level >= MAX_DEPTH;

    return (
        <FadeIn delay={index * 50}>
            <div
                className={cn(
                    "group relative cursor-pointer rounded-2xl flex flex-col overflow-hidden border transition-all duration-400",
                    isCurrentMap
                        ? `bg-zinc-900/90 border-zinc-700/50 shadow-lg shadow-black/20 ring-1 ${levelStyle.ring}`
                        : "bg-zinc-950/70 border-white/[0.06] hover:bg-zinc-900/80 hover:border-white/[0.12] shadow-md hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5"
                )}
                onClick={onSelect}
            >
                <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br", levelStyle.gradient)} />

                {/* Selected indicator bar for non-root clickable items */}
                {onSelect && (
                    <div className={cn("absolute top-0 left-0 w-1 h-full opacity-0 group-hover:opacity-100 transition-opacity", levelStyle.accent)} />
                )}

                <div className="relative z-10 p-4 flex flex-col gap-3">
                    {/* Top row */}
                    <div className="flex items-start gap-3.5">
                        <div className={cn(
                            "p-2.5 rounded-xl shrink-0 border transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg",
                            isCurrentMap
                                ? `bg-zinc-800/80 ${levelStyle.iconBorder} ${levelStyle.color}`
                                : "bg-zinc-900/80 border-white/[0.06] text-zinc-400 group-hover:text-zinc-200 group-hover:border-white/[0.12]"
                        )}>
                            <TopicIcon className="h-5 w-5" />
                        </div>

                        <div className="flex-1 min-w-0 pt-0.5">
                            <h3 className="font-semibold text-sm text-zinc-100 line-clamp-2 leading-relaxed group-hover:text-white transition-colors">
                                {item.topic}
                            </h3>
                            {item.parentName && level > 0 && (
                                <p className="text-xs text-zinc-500 truncate mt-1 flex items-center gap-1">
                                    <span className="text-zinc-600">under</span>
                                    <span className="text-zinc-400 font-medium">{item.parentName}</span>
                                </p>
                            )}
                        </div>

                        {/* Three-dot menu (only for sub-maps with ids that match expansions) */}
                        {onRegenerate && onDelete && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/80 shrink-0 -mr-2 -mt-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52 bg-zinc-900/95 backdrop-blur-xl border-zinc-800 p-1.5 rounded-2xl shadow-2xl">
                                    {onExplain && (
                                        <DropdownMenuItem
                                            className="text-xs cursor-pointer focus:bg-white/[0.06] focus:text-white py-2.5 rounded-xl"
                                            onClick={(e: React.MouseEvent) => {
                                                e.stopPropagation();
                                                onExplain(`Explain the concepts within the sub-map: ${item.topic}`);
                                            }}
                                        >
                                            <MessageCircle className="h-3.5 w-3.5 mr-2.5 text-blue-400" />
                                            Discuss Map
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                        className="text-xs cursor-pointer focus:bg-white/[0.06] focus:text-white py-2.5 rounded-xl"
                                        onClick={(e: React.MouseEvent) => {
                                            e.stopPropagation();
                                            onRegenerate();
                                        }}
                                        disabled={isGlobalBusy || isExpanding}
                                    >
                                        <RefreshCw className="h-3.5 w-3.5 mr-2.5 text-indigo-400" />
                                        Regenerate
                                    </DropdownMenuItem>
                                    <div className="h-px bg-white/[0.06] mx-2 my-1" />
                                    <DropdownMenuItem
                                        className="text-xs cursor-pointer text-red-400 focus:bg-red-500/10 focus:text-red-300 py-2.5 rounded-xl"
                                        onClick={(e: React.MouseEvent) => {
                                            e.stopPropagation();
                                            onDelete();
                                        }}
                                        disabled={isGlobalBusy || isExpanding}
                                    >
                                        <Trash2 className="h-3.5 w-3.5 mr-2.5" />
                                        Delete Sub-Map
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>

                    {/* Badge row: level badge + child counter + active/status */}
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        {/* Level Badge removed as requested */}

                        {/* Child counter badge */}
                        {hasChildren && (
                            <Badge variant="secondary" className={cn(
                                "border-transparent text-[10px] px-2.5 py-0.5 rounded-lg font-medium backdrop-blur-md",
                                "bg-zinc-800/60 text-zinc-300"
                            )}>
                                <Layers className="h-3 w-3 mr-1.5" />
                                {childCount} sub-map{childCount !== 1 ? 's' : ''}
                            </Badge>
                        )}

                        {/* Active badge */}
                        {isCurrentMap && (
                            <Badge variant="secondary" className={cn(
                                "border-transparent text-[10px] px-2.5 py-0.5 rounded-lg font-medium backdrop-blur-md",
                                levelStyle.activeBg,
                                levelStyle.activeText
                            )}>
                                <ExternalLink className="h-3 w-3 mr-1.5" />
                                Active
                            </Badge>
                        )}

                        {/* Expanding animation */}
                        {isExpanding && (
                            <Badge variant="secondary" className="bg-amber-500/10 text-amber-400 border-transparent text-[10px] px-2.5 py-0.5 rounded-lg font-medium animate-pulse backdrop-blur-md flex items-center">
                                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                                Expanding
                            </Badge>
                        )}

                        {/* Max depth indicator */}
                        {isAtMaxDepth && !isCurrentMap && (
                            <Badge variant="secondary" className="bg-fuchsia-500/10 text-fuchsia-400 border-transparent text-[10px] px-2.5 py-0.5 rounded-lg font-medium backdrop-blur-md">
                                <Hash className="h-3 w-3 mr-1" />
                                Max Depth
                            </Badge>
                        )}
                    </div>

                    {/* Footer: timestamp + actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.04] mt-0.5">
                        {createdAt ? (
                            <div className="flex items-center gap-1.5 text-zinc-500">
                                <Clock className="h-3 w-3" />
                                <span className="text-[10px] font-medium">
                                    {formatShortDistanceToNow(createdAt)} ago
                                </span>
                            </div>
                        ) : <div />}

                        <div className="flex items-center gap-2">
                            {/* Expand Further button — only if not at max depth and not root */}
                            {onExpandFurther && isExpandable && level > 0 && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 rounded-lg text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-all"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onExpandFurther(item.topic, '', item.id);
                                            }}
                                            disabled={isGlobalBusy}
                                        >
                                            <Sparkles className="h-3.5 w-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Generate Sub-Map</p></TooltipContent>
                                </Tooltip>
                            )}

                            {/* Explore hint for selected items with children */}
                            {!onExpandFurther && hasChildren && isExpandable && (
                                <div className="flex items-center text-[10px] font-semibold text-zinc-400">
                                    Explore <ChevronRight className="h-3 w-3 ml-0.5 animate-pulse" />
                                </div>
                            )}

                            {/* Open Map button */}
                            {!isCurrentMap && onOpen && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/80 opacity-0 group-hover:opacity-100 transition-all"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onOpen();
                                            }}
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Open Map</p></TooltipContent>
                                </Tooltip>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </FadeIn>
    );
}

// ── Empty State ──────────────────────────────────────────────────────────
function EmptyState() {
    return (
        <div className="text-center w-full flex-col justify-center items-center h-full flex">
            <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-3xl border border-zinc-700/50 shadow-xl" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <Network className="h-9 w-9 text-zinc-500" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-zinc-800 rounded-full border-2 border-zinc-950 flex items-center justify-center">
                    <X className="h-2 w-2 text-zinc-500" />
                </div>
            </div>
            <h3 className="text-lg font-semibold text-zinc-200 mb-2">
                No Nested Maps
            </h3>
            <p className="text-zinc-500 max-w-sm mx-auto text-sm leading-relaxed">
                There are no sub-maps to display. Use the <Sparkles className="inline h-3.5 w-3.5 mx-0.5 text-indigo-400" /> icon on a node to expand your map and dive deeper into specific topics.
            </p>
        </div>
    );
}

// ── Main Dialog Component ───────────────────────────────────────────────
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
    hierarchyLoading = false,
}: NestedMapsDialogProps) {

    const { toast } = useToast();

    // State for Search

    const [searchQuery, setSearchQuery] = React.useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    
    const hasSubMaps = expansions.length > 0;
    const totalExpansions = useMemo(
        () => expansions.filter((e, i, self) => self.findIndex(t => t.id === e.id) === i).length,
        [expansions]
    );

    // Filter expansions by search query
    const filteredExpansions = useMemo(() => {
        if (!searchQuery.trim()) return expansions;
        const q = searchQuery.toLowerCase().trim();
        return expansions.filter(e =>
            e.topic.toLowerCase().includes(q) ||
            (e.parentName && e.parentName.toLowerCase().includes(q))
        );
    }, [expansions, searchQuery]);

    // Clear search
    const handleClearSearch = useCallback(() => {
        setSearchQuery('');
        searchInputRef.current?.focus();
    }, []);


    const handleClose = useCallback(() => {
        onClose();
        setSearchQuery('');
    }, [onClose]);

    const handleOpenMap = useCallback((expansion: NestedExpansionItem) => {
        if (!isGlobalBusy && (expansion.fullData || expansion.id)) {
            onOpenMap(expansion.fullData, expansion.id);
            onClose();
        }
    }, [isGlobalBusy, onOpenMap, onClose]);

    const handleOpenRoot = useCallback(() => {
        if (rootMap && rootMap.id !== currentMapId) {
            onOpenMap(null, rootMap.id);
            onClose();
        }
    }, [rootMap, currentMapId, onOpenMap, onClose]);


    // Compute child counts for all expansions
    const childCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const exp of filteredExpansions) {
            if (exp.parentName) {
                const parentTopic = exp.parentName;
                counts[parentTopic] = (counts[parentTopic] || 0) + 1;
            }
        }
        // Also count for root
        if (rootMap) {
            const rootChildren = filteredExpansions.filter(e =>
                e.parentName && e.parentName.toLowerCase().trim() === rootMap.topic.toLowerCase().trim()
            ).length;
            if (rootChildren > 0) counts[rootMap.topic] = rootChildren;
        }
        return counts;
    }, [filteredExpansions, rootMap]);

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-[95vw] w-[1400px] h-[85vh] flex flex-col p-0 gap-0 border-white/[0.08] bg-[#0A0A0A] shadow-2xl overflow-hidden rounded-2xl">
                {/* ── Header ── */}
                <DialogHeader className="relative p-5 border-b border-white/[0.06] bg-zinc-950/80 backdrop-blur-xl">
                    <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/[0.02] to-transparent pointer-events-none" />

                    <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/[0.06] rounded-xl shadow-lg shadow-black/20">
                                <Network className="h-5 w-5 text-zinc-200" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold text-zinc-100 flex items-center gap-3 tracking-tight">
                                    Knowledge Navigator
                                    {totalExpansions > 0 && (
                                        <Badge variant="secondary" className="bg-zinc-800/80 text-zinc-400 font-semibold px-2.5 py-0.5 text-[10px] rounded-lg border-transparent backdrop-blur-md">
                                            {totalExpansions} map{totalExpansions !== 1 ? 's' : ''}
                                        </Badge>
                                    )}
                                </DialogTitle>
                                <p className="text-sm text-zinc-500 mt-1 flex items-center gap-1.5">
                                    Exploring hierarchy of <span className="text-zinc-300 font-medium">{mainTopic}</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Search */}
                            {hasSubMaps && (
                                <div className="relative hidden sm:block">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search maps..."
                                        className="w-48 h-9 pl-9 pr-8 text-xs bg-zinc-900/80 border border-white/[0.06] rounded-xl text-zinc-300 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500/30 transition-all"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={handleClearSearch}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                            )}

                        </div>
                    </div>
                </DialogHeader>

                {/* ── Miller Columns ── */}
                <div
                    ref={containerRef}
                    className="flex-1 min-h-0 relative flex flex-nowrap overflow-x-auto overflow-y-hidden bg-[#0A0A0A] custom-scrollbar scroll-smooth"
                >

                    {/* Search no-results state */}
                    {searchQuery.trim() && filteredExpansions.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                                <Search className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
                                <p className="text-sm text-zinc-500">No maps matching <span className="text-zinc-300 font-medium">&quot;{searchQuery}&quot;</span></p>
                                <Button variant="ghost" size="sm" onClick={handleClearSearch} className="mt-3 text-xs text-zinc-400 hover:text-zinc-200">
                                    <X className="h-3 w-3 mr-1" /> Clear search
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Loading state: hierarchy is being fetched */}
                    {!rootMap && hierarchyLoading && !searchQuery && (
                        <div className="flex-1 flex items-center justify-center p-8">
                            <div className="text-center">
                                <div className="relative w-20 h-20 mx-auto mb-6">
                                    <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-3xl border border-zinc-700/50 shadow-xl" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
                                    </div>
                                </div>
                                <h3 className="text-lg font-semibold text-zinc-200 mb-2">
                                    Loading Hierarchy
                                </h3>
                                <p className="text-zinc-500 max-w-sm mx-auto text-sm leading-relaxed">
                                    Fetching your nested map structure from the knowledge base...
                                </p>
                            </div>
                        </div>
                    )}

                    {/* True empty state: no hierarchy data at all and none expected */}
                    {!hasSubMaps && !rootMap && !hierarchyLoading && !searchQuery && (
                        <div className="flex-1 flex items-center justify-center p-8">
                            <EmptyState />
                        </div>
                    )}

                    {/* Main Content Grid */}
                    {(rootMap || filteredExpansions.length > 0) && (
                        <div className="max-w-6xl mx-auto flex flex-col gap-12 pb-12 w-full">
                            
                            {/* Root Map Section */}
                            {rootMap && (
                                <div className="flex flex-col gap-4">
                                    <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-2 mt-4">
                                        <Network className="w-4 h-4 text-indigo-400" />
                                        Parent Map
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        <LevelCard
                                            item={rootMap as any}
                                            level={0}
                                            levelStyle={LEVEL_STYLES[0]}
                                            isCurrentMap={currentMapId === rootMap.id}
                                            childCount={childCounts[rootMap.topic] || 0}
                                            isExpanding={false}
                                            onOpen={rootMap.id !== currentMapId ? () => {
                                                onOpenMap(null, rootMap.id);
                                                onClose();
                                            } : undefined}
                                            isGlobalBusy={isGlobalBusy}
                                            index={0}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Sub-Maps Grouped by Depth */}
                            {Array.from(new Set(filteredExpansions.map(e => Number(e.depth) || 1)))
                                .sort((a, b) => a - b)
                                .map(depth => {
                                    const items = filteredExpansions.filter(e => (Number(e.depth) || 1) === depth);
                                    if (items.length === 0) return null;

                                    const styleIndex = Math.min(depth, LEVEL_STYLES.length - 1);
                                    const style = LEVEL_STYLES[styleIndex];

                                    return (
                                        <div key={`depth-${depth}`} className="flex flex-col gap-4">
                                            <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                                <Layers className={cn("w-4 h-4", style.color)} />
                                                Nested Level {depth}
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                                {items.map((expansion, itemIndex) => {
                                                    const childCount = childCounts[expansion.topic] || 0;
                                                    const isExpanding = expandingId === expansion.id;
                                                    const isCurrentMap = currentMapId === expansion.id;

                                                    return (
                                                        <LevelCard
                                                            key={`map-${expansion.id}`}
                                                            item={expansion}
                                                            level={depth}
                                                            levelStyle={style}
                                                            isCurrentMap={isCurrentMap}
                                                            childCount={childCount}
                                                            isExpanding={isExpanding}
                                                            onOpen={() => handleOpenMap(expansion)}
                                                            onExplain={onExplainInChat ? (msg) => {
                                                                onExplainInChat(msg);
                                                                onClose();
                                                            } : undefined}
                                                            onRegenerate={() => onRegenerate(expansion.parentName, expansion.id)}
                                                            onDelete={() => onDelete(expansion.id)}
                                                            onExpandFurther={depth < MAX_DEPTH ? (topic, desc, id) => {
                                                                onExpandFurther(topic, desc, id);
                                                                onClose();
                                                            } : undefined}
                                                            isGlobalBusy={isGlobalBusy}
                                                            index={itemIndex}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="relative p-4 border-t border-white/[0.06] bg-zinc-950/80 backdrop-blur-xl">
                    <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/[0.01] to-transparent pointer-events-none" />
                    <Button
                        variant="ghost"
                        className="relative w-full text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80 h-10 rounded-xl transition-all"
                        onClick={handleClose}
                    >
                        Close Navigator
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
