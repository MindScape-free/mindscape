'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HelpCircle,
    MessageCircle,
    X,
    Loader2,
    Swords,
    ChevronRight,
    Sparkles,
    Brain,
    Target,
    Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { cleanCitations } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface PracticeQuestionsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    topic: string;
    questions: string[];
    isLoading: boolean;
    onQuestionClick: (question: string) => void;
    onRegenerate?: () => void;
}

export function PracticeQuestionsDialog({
    isOpen,
    onClose,
    topic,
    questions: rawQuestions,
    isLoading,
    onQuestionClick,
    onRegenerate
}: PracticeQuestionsDialogProps) {
    const questions = rawQuestions || [];

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl glassmorphism border-white/10 bg-black/40 backdrop-blur-xl p-0 overflow-hidden gap-0">
                <DialogHeader className="p-6 pb-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                                <Swords className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-orange-200 to-amber-200">
                                    Practice Arena
                                </DialogTitle>
                                <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest mt-0.5">
                                    Interactive Challenge Mode
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-white/5">
                        <h3 className="text-lg font-medium text-zinc-100 leading-tight">
                            {topic}
                        </h3>
                        <p className="text-xs text-zinc-500 mt-1">
                            Select a question to launch a focused debate session with the AI.
                        </p>
                    </div>
                </DialogHeader>

                <div className="relative min-h-[300px] max-h-[60vh] flex flex-col">
                    {isLoading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-6 bg-zinc-950/20">
                            <div className="relative">
                                <div className="absolute inset-0 bg-amber-500/20 blur-3xl rounded-full animate-pulse" />
                                <div className="relative z-10 w-16 h-16 rounded-2xl border border-amber-500/20 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm shadow-xl">
                                    <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-sm font-bold text-zinc-300 animate-pulse">
                                    Constructing Challenge...
                                </h4>
                                <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
                                    Analyzing Concepts
                                </p>
                            </div>
                        </div>
                    ) : !questions || questions.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
                            <div className="w-16 h-16 bg-zinc-900/50 rounded-2xl flex items-center justify-center border border-white/5 rotate-3 shadow-lg">
                                <Brain className="w-8 h-8 text-zinc-600" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-zinc-400 font-medium">Ready to Practice?</p>
                                <p className="text-xs text-zinc-600 max-w-[200px] mx-auto">
                                    Generate a specific set of questions for this topic.
                                </p>
                            </div>
                            {onRegenerate && (
                                <Button
                                    onClick={onRegenerate}
                                    size="sm"
                                    className="gap-2 bg-amber-600/20 hover:bg-amber-500/30 text-amber-500 border border-amber-500/30"
                                >
                                    <Zap className="w-3.5 h-3.5 fill-current" />
                                    Generate Questions
                                </Button>
                            )}
                        </div>
                    ) : (
                        <ScrollArea className="flex-1 p-6 pt-0">
                            <motion.div
                                variants={containerVariants}
                                initial="hidden"
                                animate="show"
                                className="space-y-3 pb-4"
                            >
                                {questions.map((q, idx) => (
                                    <motion.button
                                        key={idx}
                                        variants={itemVariants}
                                        onClick={() => onQuestionClick(cleanCitations(q))}
                                        className="w-full group relative text-left p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-amber-500/30 transition-all duration-300 overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/0 to-amber-500/0 group-hover:via-amber-500/5 group-hover:to-amber-500/10 transition-all duration-500" />

                                        <div className="flex gap-4 relative z-10">
                                            <div className="flex-shrink-0 mt-0.5">
                                                <div className="w-6 h-6 rounded-md bg-black/40 border border-white/10 flex items-center justify-center text-[10px] font-bold text-zinc-500 font-mono group-hover:bg-amber-500 group-hover:text-white group-hover:border-amber-400 transition-all duration-300">
                                                    {idx + 1}
                                                </div>
                                            </div>

                                            <div className="flex-1 space-y-2">
                                                <p className="text-sm text-zinc-300 group-hover:text-white font-medium leading-relaxed transition-colors">
                                                    {cleanCitations(q)}
                                                </p>

                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500">
                                                        Start Session <ChevronRight className="w-3 h-3" />
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.button>
                                ))}
                            </motion.div>
                        </ScrollArea>
                    )}
                </div>
                {/* Footer Actions */}
                {onRegenerate && !isLoading && questions.length > 0 && (
                    <div className="p-4 border-t border-white/5 bg-black/20 flex justify-end">
                        <Button
                            onClick={onRegenerate}
                            variant="ghost"
                            size="sm"
                            className="text-xs gap-2 text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            Refresh Challenge Set
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
