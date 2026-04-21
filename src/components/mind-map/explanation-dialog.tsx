'use client';

import React, { useState, useEffect } from 'react';
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
    RefreshCw,
    Star,
    AlertTriangle,
    CheckCircle2,
    Zap,
    ArrowRight,
    Clock,
    BarChart3,
    Globe,
    Circle,
    ChevronRight,
    Map,
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
import { cn, formatText, toPascalCase } from '@/lib/utils';
import { ExplanationMode, NodeEnrichment, ConfidenceLevel } from '@/types/mind-map';

interface ExplanationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    content: string[];
    isLoading: boolean;
    isContentRefreshing?: boolean;
    onExplainInChat: (message: string) => void;
    explanationMode: ExplanationMode;
    onExplanationModeChange: (mode: ExplanationMode) => void;
    showInitialSelection?: boolean;
    isGlobalBusy?: boolean;
    availableModes?: ExplanationMode[];
    enrichment: NodeEnrichment | null;
    isEnrichmentLoading: boolean;
    confidenceRating: ConfidenceLevel | null;
    onConfidenceChange: (level: ConfidenceLevel) => void;
    quizAnswer: string | null;
    onQuizAnswer: (answer: string) => void;
    onGenerateSubMap?: (topic: string) => void;
    onRegenerateQuiz?: () => Promise<void>;
}

const DOMAIN_COLORS: Record<string, { text: string; bg: string; border: string }> = {
    rose:    { text: 'text-rose-400',    bg: 'hover:bg-rose-500/5',    border: 'hover:border-rose-500/20' },
    emerald: { text: 'text-emerald-400', bg: 'hover:bg-emerald-500/5', border: 'hover:border-emerald-500/20' },
    sky:     { text: 'text-sky-400',     bg: 'hover:bg-sky-500/5',     border: 'hover:border-sky-500/20' },
    orange:  { text: 'text-orange-400',  bg: 'hover:bg-orange-500/5',  border: 'hover:border-orange-500/20' },
    violet:  { text: 'text-violet-400',  bg: 'hover:bg-violet-500/5',  border: 'hover:border-violet-500/20' },
    pink:    { text: 'text-pink-400',    bg: 'hover:bg-pink-500/5',    border: 'hover:border-pink-500/20' },
    amber:   { text: 'text-amber-400',   bg: 'hover:bg-amber-500/5',   border: 'hover:border-amber-500/20' },
    cyan:    { text: 'text-cyan-400',    bg: 'hover:bg-cyan-500/5',    border: 'hover:border-cyan-500/20' },
};

const getColorClasses = (color: string) => DOMAIN_COLORS[color] ?? DOMAIN_COLORS['sky'];

const LucideIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    Globe, Circle, Zap, Star, BookOpen, Brain, Activity, Compass,
    GraduationCap, Lightbulb, MessageCircle, ChevronRight, ArrowRight,
    AlertTriangle, CheckCircle2, Clock, BarChart3, Sparkles, Map,
};

function getIconComponent(iconName: string): React.ComponentType<{ className?: string }> {
    const pascalName = toPascalCase(iconName);
    return LucideIcons[pascalName] ?? LucideIcons['Globe'];
}

function SectionDivider({ icon: Icon, title, isOpen, onToggle }: { icon: React.ComponentType<{ className?: string }>; title: string; isOpen: boolean; onToggle: () => void; }) {
    return (
        <button onClick={onToggle} className="flex items-center gap-3 mt-8 mb-4 w-full group">
            <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-[8px] rounded-full" />
                <Icon className="relative h-3.5 w-3.5 text-primary" />
            </div>
            <span className="font-orbitron text-[11px] font-bold uppercase tracking-[0.2em] text-white">
                {title}
            </span>
            <div className="flex-1 h-[1px] relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/50 via-primary/20 to-transparent rounded-full" />
            </div>
            <ChevronRight className={cn("h-3.5 w-3.5 text-zinc-500 transition-transform flex-shrink-0", isOpen && "rotate-90")} />
        </button>
    );
}

function SkeletonCard({ lines = 2 }: { lines?: number }) {
    return (
        <div className="animate-pulse bg-white/[0.03] border border-white/8 rounded-xl p-3 space-y-2">
            {[...Array(lines)].map((_, i) => (
                <div key={i} className={cn("h-2 bg-white/5 rounded", i === 0 ? "w-3/4" : "w-1/2")} />
            ))}
        </div>
    );
}

function D_ConceptSnapshot({ snapshot }: { snapshot: NodeEnrichment['snapshot'] }) {
    const difficultyColors: Record<string, string> = {
        Beginner: 'text-emerald-400',
        Intermediate: 'text-sky-400',
        Advanced: 'text-violet-400',
    };

    return (
        <div className="flex items-center gap-2 flex-wrap">
            <div className={cn(
                "bg-white/5 border border-white/8 rounded-full px-3 py-1 text-[11px] font-medium flex items-center gap-1.5",
                difficultyColors[snapshot.difficulty]
            )}>
                <BarChart3 className="h-3 w-3" />
                {snapshot.difficulty}
            </div>
            <div className="bg-white/5 border border-white/8 rounded-full px-3 py-1 text-[11px] font-medium text-zinc-400 flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                ~{snapshot.readTimeMinutes}min
            </div>
            <div className="bg-white/5 border border-white/8 rounded-full px-3 py-1 text-[11px] font-medium text-zinc-400 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" />
                ≈ {snapshot.similarTo}
            </div>
        </div>
    );
}

function C_LearningPath({
    learningPath,
    currentName,
    onExplainInChat
}: {
    learningPath: NodeEnrichment['learningPath'];
    currentName: string;
    onExplainInChat: (msg: string) => void;
}) {
    return (
        <div className="flex items-stretch gap-2 w-full">
            {/* Before */}
            <div className="flex-1 min-w-0">
                {learningPath.before ? (
                    <button
                        onClick={() => onExplainInChat(`Before learning "${currentName}", you should understand "${learningPath.before}". Can you explain "${learningPath.before}" and how it connects to "${currentName}"?`)}
                        className="w-full h-full flex flex-col items-start gap-1.5 bg-white/5 border border-white/10 rounded-xl p-3 hover:border-primary/30 hover:bg-white/[0.07] transition-all text-left"
                    >
                        <span className="font-orbitron text-[9px] uppercase tracking-widest text-zinc-600">Previous</span>
                        <span className="text-[12px] text-zinc-400 leading-snug">{learningPath.before}</span>
                    </button>
                ) : <div className="flex-1" />}
            </div>

            <div className="flex items-center flex-shrink-0">
                <ArrowRight className="h-3.5 w-3.5 text-zinc-700" />
            </div>

            {/* Current */}
            <div className="flex-1 min-w-0 flex flex-col items-start gap-1.5 bg-primary/10 border border-primary/40 rounded-xl p-3 shadow-[0_0_15px_rgba(139,92,246,0.1)]">
                <span className="font-orbitron text-[9px] uppercase tracking-widest text-primary/70">Current</span>
                <span className="text-[12px] text-white font-semibold leading-snug flex items-center gap-1.5">
                    <Star className="h-3 w-3 text-primary fill-primary flex-shrink-0" />
                    {currentName}
                </span>
            </div>

            <div className="flex items-center flex-shrink-0">
                <ArrowRight className="h-3.5 w-3.5 text-zinc-700" />
            </div>

            {/* After */}
            <div className="flex-1 min-w-0">
                {learningPath.after ? (
                    <button
                        onClick={() => onExplainInChat(`Now that I understand "${currentName}", what is "${learningPath.after}" and how does it build on what I just learned?`)}
                        className="w-full h-full flex flex-col items-start gap-1.5 bg-white/5 border border-white/10 rounded-xl p-3 hover:border-primary/30 hover:bg-white/[0.07] transition-all text-left"
                    >
                        <span className="font-orbitron text-[9px] uppercase tracking-widest text-zinc-600">Next</span>
                        <span className="text-[12px] text-zinc-400 leading-snug">{learningPath.after}</span>
                    </button>
                ) : <div className="flex-1" />}
            </div>
        </div>
    );
}

function A_RelatedConcepts({
    relatedNodes,
    onExplainInChat,
    onGenerateSubMap
}: {
    relatedNodes: NodeEnrichment['relatedNodes'];
    onExplainInChat: (msg: string) => void;
    onGenerateSubMap?: (topic: string) => void;
}) {
    return (
        <div className="grid grid-cols-2 gap-2">
            {relatedNodes.slice(0, 4).map((node, idx) => {
                const IconComponent = getIconComponent(node.icon);
                return (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-white/[0.03] border border-white/8 rounded-xl p-3 hover:border-primary/30 hover:bg-white/[0.05] transition-all"
                    >
                        <div className="flex items-start gap-2.5">
                            <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                                <IconComponent className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-zinc-100 truncate">{node.name}</div>
                                <div className="text-sm text-zinc-400 leading-relaxed line-clamp-2 mt-0.5">{node.description}</div>
                            </div>
                        </div>
                        <div className="flex gap-1.5 mt-2">
                            {onGenerateSubMap && (
                                <button
                                    onClick={() => onGenerateSubMap(node.name)}
                                    className="flex-1 bg-white/5 hover:bg-primary/20 text-zinc-500 hover:text-primary rounded-lg py-2 text-[10px] font-normal transition-all flex items-center justify-center gap-1"
                                >
                                    <Map className="h-3 w-3" />
                                </button>
                            )}
                            <button
                                onClick={() => onExplainInChat(`Explain ${node.name}`)}
                                className="flex-1 bg-white/5 hover:bg-primary/20 text-zinc-500 hover:text-primary rounded-lg py-2 text-[10px] font-normal transition-all flex items-center justify-center gap-1"
                            >
                                <MessageCircle className="h-3 w-3" />
                            </button>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}

function I_RealWorldRadar({ radar }: { radar: NodeEnrichment['realWorldRadar'] }) {
    return (
        <div className="grid grid-cols-2 gap-2">
            {radar.map((item, idx) => {
                const colors = getColorClasses(item.color);
                const IconComponent = getIconComponent(item.icon);
                return (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className={cn(
                            "bg-white/[0.03] border border-white/8 rounded-xl p-3 transition-all cursor-default",
                            colors.bg, colors.border
                        )}
                    >
                        <div className="flex items-center gap-1.5 mb-2">
                            <IconComponent className={cn("h-4 w-4", colors.text)} />
                            <span className={cn("text-[11px] font-medium uppercase tracking-wide", colors.text)}>
                                {item.domain}
                            </span>
                        </div>
                        <p className="text-sm text-zinc-400 leading-relaxed line-clamp-2">{item.application}</p>
                    </motion.div>
                );
            })}
        </div>
    );
}

function G_ConceptTimeline({ timeline }: { timeline: NodeEnrichment['timeline'] }) {
    return (
        <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-white/10">
            {timeline.map((event, idx) => (
                <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={cn(
                        "flex-shrink-0 w-36 snap-start rounded-xl p-3 border transition-all",
                        event.isKey 
                            ? "bg-primary/10 border-primary/30" 
                            : "bg-white/[0.03] border-white/8"
                    )}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <div className={cn(
                            "w-2 h-2 rounded-full",
                            event.isKey 
                                ? "bg-primary shadow-[0_0_6px_rgba(139,92,246,0.5)]" 
                                : "bg-zinc-600"
                        )} />
                        <span className={cn(
                            "text-[10px] font-medium uppercase",
                            event.isKey ? "text-primary" : "text-zinc-500"
                        )}>
                            {event.year}
                        </span>
                    </div>
                    <p className={cn(
                        "text-sm leading-relaxed",
                        event.isKey ? "text-zinc-100" : "text-zinc-400"
                    )}>
                        {event.event}
                    </p>
                </motion.div>
            ))}
        </div>
    );
}

function H_MisconceptionBuster({ misconceptions }: { misconceptions: NodeEnrichment['misconceptions'] }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {misconceptions.map((item, idx) => (
                <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-xl p-4 hover:border-amber-500/40 transition-colors"
                >
                    <div className="flex items-start gap-3">
                        <div className="bg-amber-500/20 p-2 rounded-lg">
                            <AlertTriangle className="h-5 w-5 text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-amber-200 font-medium mb-3 italic leading-relaxed">
                                {item.claim}
                            </p>
                            <div className="flex items-start gap-2 bg-emerald-500/10 rounded-lg p-3">
                                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-emerald-300 leading-relaxed">
                                    {item.correction}
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}

function E_MicroQuiz({
    quiz,
    initialAnswer,
    onAnswer,
    onRegenerateQuiz,
    nodeName,
    mainTopic
}: {
    quiz: NodeEnrichment['microQuiz'];
    initialAnswer: string | null;
    onAnswer: (answer: string) => void;
    onRegenerateQuiz?: () => void;
    nodeName?: string;
    mainTopic?: string;
}) {
    const [selectedOption, setSelectedOption] = useState<string | null>(initialAnswer);
    const [isRevealed, setIsRevealed] = useState(!!initialAnswer);
    const [isRegenerating, setIsRegenerating] = useState(false);

    useEffect(() => {
        setSelectedOption(initialAnswer);
        setIsRevealed(!!initialAnswer);
    }, [initialAnswer]);

    const handleCheck = () => {
        if (!selectedOption) return;
        setIsRevealed(true);
        onAnswer(selectedOption);
    };

    const handleNextQuiz = async () => {
        if (onRegenerateQuiz && nodeName && mainTopic) {
            setIsRegenerating(true);
            setSelectedOption(null);
            setIsRevealed(false);
            onAnswer('');
            try {
                await onRegenerateQuiz();
            } finally {
                setIsRegenerating(false);
            }
        } else {
            setSelectedOption(null);
            setIsRevealed(false);
            onAnswer('');
        }
    };

    const isCorrect = selectedOption === quiz.correctId;

    if (isRegenerating) {
        return (
            <div className="relative bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 border border-white/10 rounded-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-[shimmer_2s_infinite]" />
                <div className="relative p-5">
                    <div className="flex items-center justify-center gap-4 py-10">
                        <div className="relative">
                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                            <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full" />
                        </div>
                        <span className="text-[12px] font-medium text-white">Generating new question...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 border border-white/10 rounded-2xl overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-violet-500 to-primary" />
            
            <div className="relative p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/20 rounded-xl border border-primary/30">
                            <Brain className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-[11px] font-medium uppercase tracking-widest text-zinc-400">
                            Quick Check
                        </span>
                    </div>
                    {isRevealed && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium",
                                isCorrect
                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                    : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            )}
                        >
                            {isCorrect ? (
                                <>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Correct
                                </>
                            ) : (
                                <>
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    Incorrect
                                </>
                            )}
                        </motion.div>
                    )}
                </div>

                <h4 className="text-sm font-normal text-zinc-100 leading-relaxed mb-5">
                    {quiz.question}
                </h4>

                <div className="space-y-2.5">
                    {quiz.options.map((opt) => {
                        const isSelected = selectedOption === opt.id;
                        const isThisCorrect = opt.id === quiz.correctId;
                        const showCorrect = isRevealed && isThisCorrect;
                        const showWrong = isRevealed && isSelected && !isThisCorrect;

                        return (
                            <motion.button
                                key={opt.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                whileHover={!isRevealed ? { scale: 1.01 } : {}}
                                whileTap={!isRevealed ? { scale: 0.99 } : {}}
                                onClick={() => !isRevealed && setSelectedOption(opt.id)}
                                disabled={isRevealed}
                                className={cn(
                                    "w-full group relative flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all duration-200",
                                    !isRevealed && !isSelected && "bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.05]",
                                    !isRevealed && isSelected && "bg-primary/20 border-primary/40 shadow-[0_0_20px_rgba(139,92,246,0.15)]",
                                    isRevealed && showCorrect && "bg-emerald-500/10 border-emerald-500/30",
                                    isRevealed && showWrong && "bg-red-500/10 border-red-500/30",
                                    isRevealed && !showCorrect && !showWrong && "bg-white/[0.02] border-white/10 opacity-60"
                                )}
                            >
                                <div className={cn(
                                    "w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-medium transition-all",
                                    !isRevealed && !isSelected && "bg-white/5 text-zinc-400 group-hover:bg-white/10",
                                    !isRevealed && isSelected && "bg-primary text-white",
                                    isRevealed && showCorrect && "bg-emerald-500 text-white",
                                    isRevealed && showWrong && "bg-red-500 text-white",
                                    isRevealed && !showCorrect && !showWrong && "bg-white/5 text-zinc-500"
                                )}>
                                    {opt.id}
                                </div>
                                <span className={cn(
                                    "flex-1 text-left text-sm transition-colors font-normal",
                                    !isRevealed && "text-zinc-400",
                                    !isRevealed && isSelected && "text-zinc-100",
                                    isRevealed && showCorrect && "text-emerald-300",
                                    isRevealed && showWrong && "text-red-300",
                                    isRevealed && !showCorrect && !showWrong && "text-zinc-500"
                                )}>
                                    {opt.text.charAt(0).toUpperCase() + opt.text.slice(1)}
                                </span>
                                {showCorrect && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="flex-shrink-0"
                                    >
                                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                                    </motion.div>
                                )}
                                {showWrong && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="flex-shrink-0"
                                    >
                                        <Circle className="h-5 w-5 text-red-400 fill-red-400/20" />
                                    </motion.div>
                                )}
                                {!isRevealed && isSelected && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-primary rounded-r-full" />
                                )}
                            </motion.button>
                        );
                    })}
                </div>

                <AnimatePresence>
                    {isRevealed && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={{ opacity: 0, y: -10, height: 0 }}
                            className="mt-4 overflow-hidden"
                        >
                            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                    <div className="p-1.5 bg-primary/10 rounded-lg flex-shrink-0 mt-0.5">
                                        <Lightbulb className="h-3.5 w-3.5 text-primary" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 block mb-1">Explanation</span>
                                        <p className="text-sm text-zinc-400 leading-relaxed font-normal">
                                            {quiz.explanation}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="mt-4 flex gap-3">
                    {!isRevealed ? (
                        <Button
                            onClick={handleCheck}
                            disabled={!selectedOption}
                            className={cn(
                                "flex-1 h-10 rounded-xl font-medium text-[12px] uppercase tracking-wider transition-all",
                                selectedOption
                                    ? "bg-gradient-to-r from-primary to-violet-500 hover:from-primary/90 hover:to-violet-500/90 text-white shadow-lg shadow-primary/25"
                                    : "bg-white/5 text-zinc-500 cursor-not-allowed"
                            )}
                        >
                            Check Answer
                        </Button>
                    ) : (
                        <Button
                            onClick={handleNextQuiz}
                            className="flex-1 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-[12px] uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                        >
                            Next Question
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

function J_ConfidenceMeter({
    rating,
    onChange
}: {
    rating: ConfidenceLevel | null;
    onChange: (level: ConfidenceLevel) => void;
}) {
    const levels: { level: ConfidenceLevel; emoji: string; label: string }[] = [
        { level: 1, emoji: '😕', label: 'Not' },
        { level: 2, emoji: '🤔', label: 'Getting' },
        { level: 3, emoji: '😊', label: 'Solid' },
        { level: 4, emoji: '🔥', label: 'Expert' },
    ];

    return (
        <div className="text-center">
            <p className="font-orbitron text-[10px] font-medium uppercase tracking-widest text-zinc-600 mb-3">
                Confidence
            </p>
            <div className="flex items-center justify-center gap-3">
                {levels.map(({ level, emoji, label }) => (
                    <button
                        key={level}
                        onClick={() => onChange(level)}
                        className={cn(
                            "flex flex-col items-center gap-1 p-3 rounded-xl border transition-all",
                            rating === level
                                ? "border-primary/40 bg-primary/10 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                                : "border-white/8 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15"
                        )}
                    >
                        <span className="text-2xl">{emoji}</span>
                        <span className="text-[10px] font-normal text-zinc-500 uppercase tracking-wider">
                            {label}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}

function CompactExplanationCard({ 
    point, 
    title, 
    isBusy, 
    onExplainInChat 
}: { 
    point: string; 
    title: string; 
    isBusy: boolean;
    onExplainInChat: (msg: string) => void;
}) {
    return (
        <Card className="bg-zinc-950/40 group relative overflow-hidden border border-white/5 hover:border-primary/20 hover:bg-zinc-900/60 transition-all duration-300 rounded-xl backdrop-blur-xl">
            <CardContent className="p-5 pt-5 pb-3 pr-12 flex items-start gap-3">
                <div className="mt-0.5 p-2 bg-primary/10 rounded-lg group-hover:bg-primary/15 transition-all duration-300 border border-primary/10 group-hover:scale-105 shadow-[0_0_10px_rgba(var(--primary),0.05)]">
                    <Lightbulb className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                </div>
                <div
                    className="prose prose-invert prose-sm max-w-none flex-1 leading-relaxed text-zinc-400 group-hover:text-zinc-300 transition-colors duration-300 selection:bg-primary/30"
                    dangerouslySetInnerHTML={{ __html: formatText(point) }}
                />
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                disabled={isBusy}
                                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary active:scale-95 z-20"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onExplainInChat(`Explain: "${point}"`);
                                }}
                            >
                                <MessageCircle className="h-3.5 w-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipPortal>
                            <TooltipContent side="left" align="center" className="bg-zinc-900/95 backdrop-blur-md border-white/10 rounded-lg text-[10px] font-medium uppercase tracking-wider text-white shadow-xl px-2 py-1">
                                <p>Ask in Chat</p>
                            </TooltipContent>
                        </TooltipPortal>
                    </Tooltip>
                </TooltipProvider>
            </CardContent>
            <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-primary/40 via-primary/20 to-transparent group-hover:w-0.5 transition-all duration-300" />
        </Card>
    );
}

export function ExplanationDialog({
    isOpen,
    onClose,
    title,
    content,
    isLoading,
    isContentRefreshing = false,
    onExplainInChat,
    explanationMode,
    onExplanationModeChange,
    showInitialSelection = false,
    isGlobalBusy = false,
    availableModes = [],
    enrichment,
    isEnrichmentLoading,
    confidenceRating,
    onConfidenceChange,
    quizAnswer,
    onQuizAnswer,
    onGenerateSubMap,
    onRegenerateQuiz,
}: ExplanationDialogProps) {
    const isBusy = isLoading || isGlobalBusy;
    const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        learningPath: false,
        related: false,
        applications: false,
        timeline: false,
        myths: false,
        quiz: false,
    });
    const toggleSection = (key: string) => setOpenSections(prev => {
        const isCurrentlyOpen = prev[key];
        // Close all, then open the clicked one (unless it was already open)
        const allClosed = Object.keys(prev).reduce((acc, k) => ({ ...acc, [k]: false }), {} as Record<string, boolean>);
        return { ...allClosed, [key]: !isCurrentlyOpen };
    });
    const loadingMessages = [
        "Analyzing...",
        "Synthesizing...",
        "Structuring...",
        "Finalizing..."
    ];

    useEffect(() => {
        if (isLoading) {
            const interval = setInterval(() => {
                setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
            }, 2000);
            return () => clearInterval(interval);
        } else {
            setLoadingMessageIndex(0);
        }
    }, [isLoading, loadingMessages.length]);

    const hasExistingContent = content.length > 0;
    const showPartialLoading = isContentRefreshing && hasExistingContent;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-3xl glassmorphism border-white/10 rounded-[2rem] p-0 overflow-hidden shadow-2xl max-h-[85vh]">
                <DialogHeader className="px-6 pt-6 pb-4 flex-row justify-between items-start bg-gradient-to-b from-white/[0.04] to-transparent relative">
                    <div className="flex flex-col gap-2 relative z-10">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-primary/10 border border-primary/20 rounded-md">
                                <Sparkles className="h-3 w-3 text-primary" />
                            </div>
                            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-600">
                                Explanation
                            </span>
                        </div>
                        <DialogTitle className="text-2xl font-medium tracking-tight text-white leading-tight">
                            {title}
                        </DialogTitle>
                        {enrichment?.snapshot && (
                            <D_ConceptSnapshot snapshot={enrichment.snapshot} />
                        )}
                    </div>
                    {!showInitialSelection && (
                        <div className="flex items-center gap-2 relative z-10">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-9 rounded-xl border-white/5 bg-zinc-900/50 hover:bg-zinc-800/80 text-[11px] font-medium uppercase tracking-[0.1em] px-4 backdrop-blur-md transition-all duration-300 hover:border-primary/30 group"
                                        disabled={isBusy}
                                    >
                                        <span className="text-zinc-400 group-hover:text-primary transition-colors">{explanationMode}</span>
                                        <ChevronDown className="h-3 w-3 ml-2 text-zinc-500 group-hover:text-primary transition-all" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="glassmorphism border-white/10 rounded-xl p-1.5 shadow-xl min-w-[130px] backdrop-blur-2xl">
                                    {['Beginner', 'Intermediate', 'Expert'].map((mode) => (
                                        <DropdownMenuItem
                                            key={mode}
                                            onSelect={() => onExplanationModeChange(mode as ExplanationMode)}
                                            className={cn(
                                                "rounded-lg px-3 py-2.5 text-[11px] font-medium uppercase tracking-wider transition-all cursor-pointer",
                                                explanationMode === mode ? "bg-primary/20 text-primary" : "text-zinc-400 hover:bg-white/5 hover:text-white"
                                            )}
                                        >
                                            <div className="flex items-center justify-between w-full">
                                                {mode}
                                                {availableModes.includes(mode as ExplanationMode) && (
                                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
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
                <ScrollArea className="max-h-[calc(85vh-120px)] px-4 pb-4">
                    <AnimatePresence mode="wait">
                        {isLoading && !hasExistingContent ? (
                            <motion.div
                                key="full-loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center py-16 gap-4"
                            >
                                <div className="relative">
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className="absolute inset-0 bg-primary/30 blur-[40px] rounded-full"
                                    />
                                    <div className="relative z-10 bg-zinc-950/50 p-6 rounded-full border border-white/10">
                                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                    </div>
                                </div>
                                <p className="text-[12px] font-medium text-white">
                                    {loadingMessages[loadingMessageIndex]}
                                </p>
                            </motion.div>
                        ) : showInitialSelection ? (
                            <motion.div
                                key="selection"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="grid grid-cols-3 gap-3 py-4"
                            >
                                {[
                                    { mode: 'Beginner' as ExplanationMode, icon: GraduationCap, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                                    { mode: 'Intermediate' as ExplanationMode, icon: BookOpen, color: 'text-sky-400', bg: 'bg-sky-500/10' },
                                    { mode: 'Expert' as ExplanationMode, icon: Brain, color: 'text-violet-400', bg: 'bg-violet-500/10' },
                                ].map((item) => {
                                    const isAvailable = availableModes.includes(item.mode);
                                    return (
                                        <motion.button
                                            key={item.mode}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            onClick={() => onExplanationModeChange(item.mode)}
                                            className={cn(
                                                "group flex flex-col items-center gap-3 p-5 rounded-xl border border-white/5 transition-all duration-300",
                                                "bg-white/[0.03] hover:bg-white/[0.06] hover:border-primary/40 relative"
                                            )}
                                        >
                                            {isAvailable && (
                                                <div className="absolute top-2 right-2">
                                                    <div className="bg-emerald-500/10 text-emerald-400 text-[9px] font-medium uppercase px-2 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                        Ready
                                                    </div>
                                                </div>
                                            )}
                                            <div className={cn("p-4 rounded-2xl shadow-inner", item.bg)}>
                                                <item.icon className={cn("h-9 w-9", item.color)} />
                                            </div>
                                            <div className="font-medium text-[11px] uppercase tracking-widest text-zinc-400 group-hover:text-white transition-colors">
                                                {item.mode}
                                            </div>
                                        </motion.button>
                                    );
                                })}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="content"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="space-y-4 py-3"
                            >
                                {showPartialLoading && (
                                    <div className="flex items-center justify-center py-2 mb-2">
                                        <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-medium uppercase tracking-wider">
                                            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                                            Refreshing content...
                                        </div>
                                    </div>
                                )}

                                <AnimatePresence mode="wait">
                                    {!showPartialLoading && content.map((point, index) => (
                                        <motion.div
                                            key={`${point}-${index}`}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                        >
                                            <CompactExplanationCard
                                                point={point}
                                                title={title}
                                                isBusy={isBusy}
                                                onExplainInChat={onExplainInChat}
                                            />
                                        </motion.div>
                                    ))}
                                </AnimatePresence>

                                {content.length > 0 && !showPartialLoading && (
                                    <div className="flex justify-center pt-2">
                                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-600 bg-white/5 px-3 py-1 rounded-full border border-white/5 font-normal">
                                            <Activity className="h-3 w-3 text-primary" />
                                            {explanationMode} level
                                        </div>
                                    </div>
                                )}

                                {enrichment?.learningPath && (
                                    <>
                                        <SectionDivider icon={Compass} title="Learning Path" isOpen={openSections.learningPath} onToggle={() => toggleSection('learningPath')} />
                                        <AnimatePresence>
                                        {openSections.learningPath && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                <C_LearningPath learningPath={enrichment.learningPath} currentName={title} onExplainInChat={onExplainInChat} />
                                            </motion.div>
                                        )}
                                        </AnimatePresence>
                                    </>
                                )}

                                {enrichment?.relatedNodes && enrichment.relatedNodes.length > 0 && (
                                    <>
                                        <SectionDivider icon={Globe} title="Related" isOpen={openSections.related} onToggle={() => toggleSection('related')} />
                                        <AnimatePresence>
                                        {openSections.related && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                <A_RelatedConcepts relatedNodes={enrichment.relatedNodes} onExplainInChat={onExplainInChat} onGenerateSubMap={onGenerateSubMap} />
                                            </motion.div>
                                        )}
                                        </AnimatePresence>
                                    </>
                                )}

                                {enrichment?.realWorldRadar && enrichment.realWorldRadar.length > 0 && (
                                    <>
                                        <SectionDivider icon={Zap} title="Applications" isOpen={openSections.applications} onToggle={() => toggleSection('applications')} />
                                        <AnimatePresence>
                                        {openSections.applications && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                <I_RealWorldRadar radar={enrichment.realWorldRadar} />
                                            </motion.div>
                                        )}
                                        </AnimatePresence>
                                    </>
                                )}

                                {enrichment?.timeline && enrichment.timeline.length > 0 && (
                                    <>
                                        <SectionDivider icon={Clock} title="Timeline" isOpen={openSections.timeline} onToggle={() => toggleSection('timeline')} />
                                        <AnimatePresence>
                                        {openSections.timeline && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                <G_ConceptTimeline timeline={enrichment.timeline} />
                                            </motion.div>
                                        )}
                                        </AnimatePresence>
                                    </>
                                )}

                                {enrichment?.misconceptions && enrichment.misconceptions.length > 0 && (
                                    <>
                                        <SectionDivider icon={AlertTriangle} title="Myths" isOpen={openSections.myths} onToggle={() => toggleSection('myths')} />
                                        <AnimatePresence>
                                        {openSections.myths && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                <H_MisconceptionBuster misconceptions={enrichment.misconceptions} />
                                            </motion.div>
                                        )}
                                        </AnimatePresence>
                                    </>
                                )}

                                {enrichment?.microQuiz && (
                                    <>
                                        <SectionDivider icon={Brain} title="Quiz" isOpen={openSections.quiz} onToggle={() => toggleSection('quiz')} />
                                        <AnimatePresence>
                                        {openSections.quiz && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                <E_MicroQuiz quiz={enrichment.microQuiz} initialAnswer={quizAnswer} onAnswer={onQuizAnswer} onRegenerateQuiz={onRegenerateQuiz} nodeName={title} mainTopic={title} />
                                            </motion.div>
                                        )}
                                        </AnimatePresence>
                                    </>
                                )}

                                <SectionDivider icon={Star} title="Confidence" />
                                <J_ConfidenceMeter
                                    rating={confidenceRating}
                                    onChange={onConfidenceChange}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
