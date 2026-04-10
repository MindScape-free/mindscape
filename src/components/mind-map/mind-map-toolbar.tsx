'use client';

import React from 'react';
import {
    Languages,
    Zap,
    Minimize2,
    Maximize2,
    Check,
    Share2,
    Save,
    Rocket,
    Library,
    Network,
    Image as ImageIcon,
    Database,
    Loader2,
    RefreshCw,
    Copy,
    Activity,
    AlertCircle as AlertIcon,
    Table,
    Layers,
    Share,
    BookOpen,
    X,
    Bot,
    UserRound,
    Palette,
    Brain,
    BrainCircuit,
    Sparkles,
    HelpCircle,
    Search,
    FileText,
    Pin,
    Trash2
} from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { languages } from '@/lib/languages';
import { MindMapStatus } from '@/hooks/use-mind-map-stack';
import { cn } from '@/lib/utils';

interface MindMapToolbarProps {
    languageUI: string;
    onLanguageChange: (lang: string) => void;
    isTranslating: boolean;
    isAllExpanded: boolean;
    onToggleExpandAll: () => void;
    isCopied: boolean;
    onCopyPath: () => void;
    isSaved: boolean;
    hasUnsavedChanges?: boolean;
    onSave: () => void;
    onOpenAiContent: () => void;
    onOpenNestedMaps: () => void;
    onOpenGallery: () => void;
    onDuplicate: () => void;
    isDuplicating: boolean;
    onRegenerate: () => void;
    isRegenerating: boolean;
    canRegenerate: boolean;
    nestedExpansionsCount: number;
    imagesCount: number;
    viewMode: 'accordion' | 'map' | 'roadmap';
    onViewModeChange: (mode: 'accordion' | 'map' | 'roadmap') => void;
    onPublish: () => void;
    isPublishing: boolean;
    isPublic: boolean;
    isCompare?: boolean;
    onStartGlobalQuiz?: () => void;
    onOpenSummary?: () => void;
    isSummarizing?: boolean;
    isSharing?: boolean;
    status?: MindMapStatus;
    useSearch?: boolean;
    onToggleSearch?: () => void;
    useFileAware?: boolean;
    onToggleFileAware?: () => void;
    hasSourceFile?: boolean;
    onViewSource?: () => void;
    pinnedMessagesCount?: number;
    onOpenPinnedMessages?: () => void;
    onOpenChat?: () => void;
}

export const MindMapToolbar = ({
    languageUI,
    onLanguageChange,
    isTranslating,
    isAllExpanded,
    onToggleExpandAll,
    isCopied,
    onCopyPath,
    isSaved,
    hasUnsavedChanges,
    onSave,
    onOpenAiContent,
    onOpenNestedMaps,
    onOpenGallery,
    onDuplicate,
    isDuplicating,
    onRegenerate,
    isRegenerating,
    canRegenerate,
    nestedExpansionsCount,
    imagesCount,
    viewMode,
    onViewModeChange,
    onPublish,
    isPublishing,
    isPublic,
    isCompare = false,
    onStartGlobalQuiz,
    onOpenSummary,
    isSummarizing,
    isSharing = false,
    status = 'idle',
    useSearch = false,
    onToggleSearch,
    useFileAware = false,
    onToggleFileAware,
    hasSourceFile = false,
    onViewSource,
    pinnedMessagesCount = 0,
    onOpenPinnedMessages,
    onOpenChat,
}: MindMapToolbarProps) => {
    // Helper to determine if interaction should be disabled
    const isBusy = status !== 'idle' || isTranslating || isPublishing;
    const isSyncing = status === 'syncing';

    return (
        <div className="fixed top-[70px] left-0 right-0 z-50 transition-all duration-300 px-4 flex justify-center">
            <div className="glass-panel p-1.5 rounded-2xl inline-flex items-center justify-center gap-1 sm:gap-2 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl bg-black/40">

                {/* 1. LEFT SECTION: View & Navigation */}
                <div className="flex items-center gap-1 pr-2 sm:pr-3 border-r border-white/10">

                    {/* View Mode Toggle */}
                    {!isCompare && (
                        <div className="flex items-center bg-white/5 rounded-xl p-0.5 border border-white/5">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onViewModeChange('accordion')}
                                        className={cn(
                                            "h-8 w-8 rounded-lg transition-all",
                                            viewMode === 'accordion' ? "bg-white/10 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                                        )}
                                    >
                                        <Table className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="glassmorphism"><p>Explore View</p></TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onViewModeChange('map')}
                                        className={cn(
                                            "h-8 w-8 rounded-lg transition-all",
                                            viewMode === 'map' ? "bg-purple-500/20 text-purple-400 shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                                        )}
                                    >
                                        <Layers className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="glassmorphism"><p>Map View</p></TooltipContent>
                            </Tooltip>

                        </div>
                    )}

                    {/* Language Selector - Hidden on mobile */}
                    <div className="hidden lg:block">
                        {(viewMode === 'accordion' || isCompare) && (
                            <Select value={languageUI} onValueChange={onLanguageChange} disabled={isTranslating || isBusy}>
                                <SelectTrigger className="h-9 w-[70px] px-2 bg-white/5 border-none text-[10px] rounded-xl hover:bg-white/10 transition-all font-black text-zinc-200 disabled:opacity-50 font-orbitron uppercase tracking-widest text-center">
                                    <span className="w-full text-center">{(languages.find(l => l.code === languageUI)?.code || 'EN').toUpperCase()}</span>
                                </SelectTrigger>
                                <SelectContent className="glassmorphism rounded-xl overflow-hidden min-w-[120px]">
                                    {languages.map(l => (
                                        <SelectItem key={l.code} value={l.code} className="text-xs font-space-grotesk">{l.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>

                    {/* Expand/Collapse - Hidden on mobile */}
                    <div className="hidden sm:block">
                        {(viewMode === 'accordion' || isCompare) && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={onToggleExpandAll}
                                        className="h-9 w-9 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white"
                                    >
                                        {isAllExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="glassmorphism"><p>{isAllExpanded ? 'Collapse All' : 'Expand All'}</p></TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                </div>

                {/* 2. CENTER SECTION: AI Creation Studio (Highlighted) */}
                <div className="flex items-center gap-1 sm:gap-2 px-1 sm:px-2">

                    {/* Quiz - Hidden on small mobile */}
                    {(!isCompare && onStartGlobalQuiz) && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onStartGlobalQuiz}
                            className="hidden sm:flex h-9 gap-2 text-[10px] font-black font-orbitron uppercase tracking-widest px-3 sm:px-4 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 hover:bg-sky-500/20 hover:scale-105 transition-all active:scale-95 shadow-[0_0_10px_-4px_rgba(14,165,233,0.3)]"
                        >
                            <BrainCircuit className="h-4 w-4" />
                            <span className="hidden sm:inline">Quiz</span>
                        </Button>
                    )}

                    {/* Summarize - Hidden on small mobile */}
                    {onOpenSummary && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onOpenSummary}
                            disabled={isSummarizing || isBusy}
                            className="hidden sm:flex h-9 gap-2 text-[10px] font-black font-orbitron uppercase tracking-widest px-3 sm:px-4 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:scale-105 transition-all active:scale-95 shadow-[0_0_10px_-4px_rgba(16,185,129,0.3)]"
                        >
                            {isSummarizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
                            <span className="hidden sm:inline">Summary</span>
                        </Button>
                    )}

                    {/* File Aware Toggle - HIGHLIGHTED GOLD/YELLOW - Hidden on small mobile */}
                    {hasSourceFile && onToggleFileAware && (
                        <div className="hidden sm:block">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={onToggleFileAware}
                                        className={cn(
                                            "h-9 gap-2 text-[10px] font-black font-orbitron uppercase tracking-widest px-3 rounded-xl transition-all active:scale-95 shadow-[0_0_10px_-4px_rgba(234,179,8,0.3)]",
                                            useFileAware
                                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30 scale-105"
                                                : "bg-white/5 text-zinc-500 border border-white/10 hover:bg-white/10 hover:text-zinc-400"
                                        )}
                                    >
                                        <Sparkles className={cn("h-4 w-4", useFileAware && "text-amber-400 animate-pulse")} />
                                        {useFileAware ? 'Aware ON' : 'Aware OFF'}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="glassmorphism">
                                    <p>{useFileAware ? 'AI is using uploaded file as context' : 'AI is using general knowledge'}</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    )}

                    {/* View Source File - BLUE - Hidden on small mobile */}
                    {hasSourceFile && onViewSource && (
                        <div className="hidden md:block">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={onViewSource}
                                        className="h-9 gap-2 text-[10px] font-black font-orbitron uppercase tracking-widest px-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 hover:scale-105 transition-all active:scale-95 shadow-[0_0_10px_-4px_rgba(59,130,246,0.3)]"
                                    >
                                        <FileText className="h-4 w-4" />
                                        Source
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="glassmorphism"><p>View uploaded source file</p></TooltipContent>
                            </Tooltip>
                        </div>
                    )}
                </div>

                {/* 3. RIGHT SECTION: Actions & Tools */}
                <div className="flex items-center gap-1 pl-2 sm:pl-3 border-l border-white/10">

                    {/* View Tools Group - Hidden on very small screens */}
                    <div className="hidden sm:flex items-center gap-1 mr-1 sm:mr-2">
                        {(viewMode === 'accordion' || isCompare) && (
                            <>
                                {viewMode === 'accordion' && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" onClick={onOpenAiContent} className="h-9 w-9 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-blue-400">
                                                <Library className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent className="glassmorphism"><p>Data View</p></TooltipContent>
                                    </Tooltip>
                                )}

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={onOpenNestedMaps} className="h-9 w-9 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-purple-400 relative">
                                            <Network className="h-4 w-4" />
                                            {nestedExpansionsCount > 0 && (
                                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-purple-500 text-[10px] font-bold text-white">
                                                    {nestedExpansionsCount}
                                                </span>
                                            )}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="glassmorphism"><p>Nested Maps</p></TooltipContent>
                                </Tooltip>

                                {viewMode === 'accordion' && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" onClick={onOpenGallery} className="h-9 w-9 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-pink-400 relative">
                                                <ImageIcon className="h-4 w-4" />
                                                {imagesCount > 0 && (
                                                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-pink-500 text-[10px] font-bold text-white">
                                                        {imagesCount}
                                                    </span>
                                                )}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent className="glassmorphism"><p>Image Gallery</p></TooltipContent>
                                    </Tooltip>
                                )}
                            </>
                        )}
                    </div>

                    {/* Divider between tools and actions */}
                    <div className="hidden sm:block h-6 w-px bg-white/10 mr-1" />

                    {/* Primary Actions - Always visible */}
                    {(viewMode === 'accordion' || isCompare) && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onCopyPath}
                                    className="h-9 w-9 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-emerald-400"
                                >
                                    {isCopied ? <Check className="h-4 w-4" /> : (isSharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />)}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="glassmorphism"><p>Share Link</p></TooltipContent>
                        </Tooltip>
                    )}

                    {(isSaved && hasUnsavedChanges) && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onSave}
                                    disabled={isBusy}
                                    className="h-9 w-9 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white"
                                >
                                    {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="glassmorphism"><p>{isSyncing ? 'Saving...' : 'Save Map'}</p></TooltipContent>
                        </Tooltip>
                    )}

                    {!isSaved && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="default"
                                    size="icon"
                                    onClick={onSave}
                                    disabled={isBusy}
                                    className="h-9 w-9 rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
                                >
                                    {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="glassmorphism"><p>Save Map</p></TooltipContent>
                        </Tooltip>
                    )}

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onPublish}
                                disabled={isBusy || isPublishing || !isSaved}
                                className={cn(
                                    "h-9 w-9 rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50",
                                    isPublic
                                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                                        : "hover:bg-white/10 text-zinc-400 hover:text-emerald-400"
                                )}
                            >
                                {isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className={cn("h-4 w-4", isPublic && "fill-current")} />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent className="glassmorphism"><p>{isPublic ? 'View in Community' : 'Publish'}</p></TooltipContent>
                    </Tooltip>

                    {/* Pin Button */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onOpenPinnedMessages}
                                className="h-9 w-9 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-amber-400 relative"
                            >
                                <Pin className="h-4 w-4" />
                                {pinnedMessagesCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                                        {pinnedMessagesCount > 99 ? '99+' : pinnedMessagesCount}
                                    </span>
                                )}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent className="glassmorphism"><p>Pinned Messages</p></TooltipContent>
                    </Tooltip>


                    {/* System Status - Hidden on mobile */}
                    <div className="hidden sm:flex items-center gap-1 ml-1 pl-2 border-l border-white/10">
                        {canRegenerate && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={onRegenerate}
                                        disabled={isRegenerating || isBusy}
                                        className="h-8 w-8 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-red-400 disabled:opacity-50"
                                    >
                                        {isRegenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="glassmorphism"><p>Regenerate</p></TooltipContent>
                            </Tooltip>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};
