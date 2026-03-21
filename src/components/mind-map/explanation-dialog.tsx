'use client';

import React from 'react';
import {
    Sparkles,
    ChevronDown,
    Loader2,
    Lightbulb,
    MessageCircle,
    GraduationCap,
    BookOpen,
    Brain,
    Activity,
    Compass,
    RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipPortal,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn, formatText } from '@/lib/utils';
import { ExplanationMode } from '@/types/mind-map';

interface ExplanationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    content: string[];
    isLoading: boolean;
    onExplainInChat: (message: string) => void;
    explanationMode: ExplanationMode;
    onExplanationModeChange: (mode: ExplanationMode) => void;
    showInitialSelection?: boolean;
    isGlobalBusy?: boolean;
    availableModes?: ExplanationMode[];
}

export function ExplanationDialog({
    isOpen,
    onClose,
    title,
    content,
    isLoading,
    onExplainInChat,
    explanationMode,
    onExplanationModeChange,
    showInitialSelection = false,
    isGlobalBusy = false,
    availableModes = [],
}: ExplanationDialogProps) {
    const isBusy = isLoading || isGlobalBusy;

    const [loadingMessageIndex, setLoadingMessageIndex] = React.useState(0);
    const loadingMessages = [
        "Scanning concepts...",
        "Synthesizing detailed insights...",
        "Generating clarifying examples...",
        "Structuring cognitive map...",
        "Finalizing explanation..."
    ];

    React.useEffect(() => {
        if (isLoading) {
            const interval = setInterval(() => {
                setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
            }, 2500);
            return () => clearInterval(interval);
        } else {
            setLoadingMessageIndex(0);
        }
    }, [isLoading, loadingMessages.length]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl glassmorphism border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
                <DialogHeader className="px-10 pt-10 pb-6 flex-row justify-between items-start bg-gradient-to-b from-white/[0.04] to-transparent relative">
                    <div className="flex flex-col gap-2 relative z-10">
                        <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.1)]">
                                <Sparkles className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <div className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500 flex items-center gap-2">
                                Explanation Lab
                                <div className="h-[1px] w-8 bg-gradient-to-r from-zinc-800 to-transparent" />
                            </div>
                        </div>
                        <DialogTitle className="text-3xl font-black font-orbitron tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/40 leading-[1.1] py-1">
                            {title}
                        </DialogTitle>
                    </div>
                    {!showInitialSelection && (
                        <div className="flex items-center gap-3 relative z-10">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-10 rounded-2xl border-white/5 bg-zinc-900/50 hover:bg-zinc-800/80 text-[10px] font-black uppercase tracking-[0.15em] px-5 backdrop-blur-md transition-all duration-300 hover:border-primary/30 group"
                                        disabled={isBusy}
                                    >
                                        <span className="text-zinc-400 group-hover:text-primary transition-colors">{explanationMode}</span>
                                        <ChevronDown className="h-3.5 w-3.5 ml-2.5 text-zinc-500 group-hover:text-primary transition-all group-hover:rotate-180" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="glassmorphism border-white/10 rounded-[1.5rem] p-1.5 shadow-2xl min-w-[140px] backdrop-blur-2xl">
                                    {['Beginner', 'Intermediate', 'Expert'].map((mode) => (
                                        <DropdownMenuItem
                                            key={mode}
                                            onSelect={() => onExplanationModeChange(mode as ExplanationMode)}
                                            className={cn(
                                                "rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer mb-0.5 last:mb-0",
                                                explanationMode === mode ? "bg-primary/20 text-primary" : "text-zinc-400 hover:bg-white/5 hover:text-white"
                                            )}
                                        >
                                            <div className="flex items-center justify-between w-full">
                                                {mode}
                                                {availableModes.includes(mode as ExplanationMode) && (
                                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]" />
                                                )}
                                            </div>
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}
                    <div className="absolute top-0 right-0 left-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] px-8 pb-8">
                    <AnimatePresence mode="wait">
                        {isLoading ? (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="flex flex-col items-center justify-center py-20 gap-8"
                            >
                                <div className="relative">
                                    <motion.div
                                        animate={{
                                            scale: [1, 1.3, 1],
                                            opacity: [0.2, 0.4, 0.2]
                                        }}
                                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                        className="absolute inset-0 bg-primary/30 blur-[60px] rounded-full"
                                    />
                                    <div className="relative z-10 bg-zinc-950/50 backdrop-blur-2xl p-8 rounded-full border border-white/10 shadow-2xl">
                                        <Loader2 className="h-14 w-14 animate-spin text-primary" />
                                    </div>
                                </div>
                                <div className="flex flex-col items-center gap-3 text-center">
                                    <motion.p
                                        key={loadingMessageIndex}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="text-xl font-bold text-white tracking-tight"
                                    >
                                        {loadingMessages[loadingMessageIndex]}
                                    </motion.p>
                                    <p className="text-xs text-zinc-500 uppercase tracking-[0.2em] font-medium animate-pulse">
                                        Synthesizing Cognitive Bridge for {title}
                                    </p>
                                </div>
                            </motion.div>
                        ) : showInitialSelection ? (
                            <motion.div
                                key="selection"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-6 px-4"
                            >
                                {[
                                    {
                                        mode: 'Beginner' as ExplanationMode,
                                        icon: GraduationCap,
                                        color: 'text-emerald-400',
                                        bg: 'bg-emerald-500/10',
                                        border: 'hover:border-emerald-500/30',
                                        accent: 'bg-emerald-500',
                                        glow: 'hover:shadow-[0_20px_50px_-12px_rgba(16,185,129,0.15)]',
                                        points: ['Simple language', 'Core concepts', 'Easy analogies']
                                    },
                                    {
                                        mode: 'Intermediate' as ExplanationMode,
                                        icon: BookOpen,
                                        color: 'text-sky-400',
                                        bg: 'bg-sky-500/10',
                                        border: 'hover:border-sky-500/30',
                                        accent: 'bg-sky-500',
                                        glow: 'hover:shadow-[0_20px_50px_-12px_rgba(14,165,233,0.15)]',
                                        points: ['Detailed analysis', 'Practical context', 'Balanced depth']
                                    },
                                    {
                                        mode: 'Expert' as ExplanationMode,
                                        icon: Brain,
                                        color: 'text-violet-400',
                                        bg: 'bg-violet-500/10',
                                        border: 'hover:border-violet-500/30',
                                        accent: 'bg-violet-500',
                                        glow: 'hover:shadow-[0_20px_50px_-12px_rgba(139,92,246,0.15)]',
                                        points: ['Advanced terminology', 'Technical architecture', 'Edge cases']
                                    },
                                ].map((item, idx) => {
                                    const isAvailable = availableModes.includes(item.mode);
                                    return (
                                        <motion.button
                                            key={item.mode}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.1 }}
                                            onClick={() => onExplanationModeChange(item.mode)}
                                            className={cn(
                                                "group flex flex-col items-center gap-6 p-8 rounded-2xl border border-white/5 transition-all duration-500",
                                                "bg-white/[0.03] backdrop-blur-xl hover:bg-white/[0.06] hover:border-primary/40 hover:shadow-[0_0_40px_rgba(var(--primary),0.1)]",
                                                "relative overflow-hidden cursor-pointer"
                                            )}
                                        >
                                            {isAvailable && (
                                                <div className="absolute top-5 right-5 z-20">
                                                    <div className="bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-full border border-emerald-500/20 backdrop-blur-md flex items-center gap-1.5 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                        Ready
                                                    </div>
                                                </div>
                                            )}

                                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                            {/* Bottom accent line */}
                                            <div className={cn(
                                                "absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 rounded-t-full opacity-20 group-hover:opacity-100 transition-all duration-500",
                                                item.accent,
                                                "group-hover:w-24 group-hover:blur-[2px]"
                                            )} />

                                            <div className={cn("p-6 rounded-[2rem] shadow-inner relative z-10 transition-transform duration-500", item.bg)}>
                                                <item.icon className={cn("h-12 w-12", item.color)} />
                                            </div>

                                            <div className="text-center relative z-10 w-full mt-2">
                                                <div className="font-orbitron font-bold text-sm tracking-widest uppercase mb-6 group-hover:text-white transition-colors">
                                                    {item.mode}
                                                </div>

                                                <div className="flex flex-col gap-3 min-h-[100px] w-fit mx-auto items-start text-left">
                                                    {item.points.map((point, pIdx) => (
                                                        <div key={pIdx} className="flex items-center gap-2.5 group/point">
                                                            <div className={cn("h-1 w-1 rounded-full opacity-40 group-hover/point:opacity-100 transition-opacity", item.accent)} />
                                                            <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest leading-none opacity-80 group-hover:opacity-100 transition-all">
                                                                {point}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </motion.button>
                                    );
                                })}
                            </motion.div>
                        ) : Array.isArray(content) && content.length > 0 ? (
                            <motion.div
                                key="content"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="space-y-4 py-4"
                            >
                                {content.map((point, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                    >
                                        <Card className="bg-zinc-950/40 group relative overflow-hidden border border-white/5 hover:border-primary/20 hover:bg-zinc-900/60 transition-all duration-500 rounded-[1.5rem] backdrop-blur-xl">
                                            <CardContent className="p-6 pr-14 flex items-start gap-5">
                                                <div className="mt-1 p-2.5 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-all duration-300 border border-primary/10 group-hover:scale-110 shadow-[0_0_15px_rgba(var(--primary),0.05)]">
                                                    <Lightbulb className="h-4.5 w-4.5 text-primary flex-shrink-0" />
                                                </div>
                                                <div
                                                    className="prose prose-invert prose-sm max-w-none flex-1 leading-[1.7] text-zinc-300 group-hover:text-white transition-colors duration-300 selection:bg-primary/30 font-medium"
                                                    dangerouslySetInnerHTML={{ __html: formatText(point) }}
                                                />
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                disabled={isBusy}
                                                                className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-all h-8 w-8 rounded-xl hover:bg-primary/10 hover:text-primary active:scale-95 z-20"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onExplainInChat(
                                                                        `Can you elaborate on this point: "${point}" in the context of ${title}?`
                                                                    );
                                                                }}
                                                            >
                                                                <MessageCircle className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipPortal>
                                                            <TooltipContent side="left" align="center" className="bg-zinc-900/90 backdrop-blur-md border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest text-white shadow-2xl">
                                                                <p>Elaborate in Chat</p>
                                                            </TooltipContent>
                                                        </TooltipPortal>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </CardContent>

                                            {/* Idea card decorative elements */}
                                            <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-primary/50 via-primary/20 to-transparent group-hover:w-1 transition-all duration-500" />
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-[40px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 -mr-12 -mt-12" />
                                        </Card>
                                    </motion.div>
                                ))}

                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: content.length * 0.1 + 0.5 }}
                                    className="flex justify-center pt-6 pb-2"
                                >
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/20 px-4 py-2 rounded-full border border-white/5">
                                        <Activity className="h-3 w-3 text-primary animate-pulse" />
                                        <span>AI generation complete based on {explanationMode} context</span>
                                    </div>
                                </motion.div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center justify-center py-20 gap-4"
                            >
                                <div className="p-6 rounded-full bg-secondary/20 border border-white/5 shadow-inner">
                                    <Compass className="h-12 w-12 text-muted-foreground/40 animate-pulse" />
                                </div>
                                <p className="text-base text-muted-foreground font-medium">
                                    No detailed insights available for this node yet.
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onExplanationModeChange(explanationMode)}
                                    className="mt-2 rounded-full border-primary/20 hover:border-primary/50"
                                >
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Try Refreshing
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
