'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Target, AlertTriangle, RefreshCw, Check } from 'lucide-react';
import { Quiz, QuizQuestion, QuizResult } from '@/ai/schemas/quiz-schema';
import { Button } from '@/components/ui/button';
import { cn, cleanCitations } from '@/lib/utils';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

interface QuizResultCardProps {
    result: QuizResult;
    quiz?: Quiz;
    onRegenerate: () => void;
    isRegenerating?: boolean;
    onDeepenMap?: (weakSections: { tag: string; score: number }[]) => void;
    isDeepeningMap?: boolean;
    deepenedTags?: string[];
}

export function QuizResultCard({ result, quiz, onRegenerate, isRegenerating, onDeepenMap, isDeepeningMap, deepenedTags = [] }: QuizResultCardProps) {
    const percentage = (result.score / result.totalQuestions) * 100;

    // Compute weak sections the same way chat-panel does
    const tagQuestionCounts = quiz?.questions.reduce((acc: Record<string, number>, q) => {
        acc[q.conceptTag] = (acc[q.conceptTag] || 0) + 1;
        return acc;
    }, {}) ?? {};

    const weakSections = Object.entries(result.weakAreas)
        .map(([tag, mistakeCount]) => ({
            tag,
            score: tagQuestionCounts[tag]
                ? Math.round(((tagQuestionCounts[tag] - mistakeCount) / tagQuestionCounts[tag]) * 100)
                : 0
        }))
        .filter(s => s.score < 60)
        .sort((a, b) => a.score - b.score);

    // Separate deepened vs not-deepened sections
    const deepenedSections = weakSections.filter(s => deepenedTags.includes(s.tag));
    const notDeepenedSections = weakSections.filter(s => !deepenedTags.includes(s.tag));

    const getScoreColor = () => {
        if (percentage >= 80) return 'text-emerald-400';
        if (percentage >= 50) return 'text-yellow-400';
        return 'text-red-400';
    };

    const entries = Object.entries(result.weakAreas).sort((a, b) => b[1] - a[1]);

    return (
        <div className="w-full max-w-lg mx-auto space-y-3">
            <div className="p-5 bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl overflow-hidden relative">
                {/* Confetti-like background glow */}
                <div className={cn(
                    "absolute -top-10 -right-10 w-32 h-32 blur-[60px] rounded-full opacity-10",
                    percentage >= 70 ? "bg-emerald-500" : "bg-red-500"
                )} />

                <div className="relative z-10 text-center space-y-4">
                    <div className="flex justify-center">
                        <motion.div
                            initial={{ scale: 0, rotate: -45 }}
                            animate={{ scale: 1, rotate: 0 }}
                            className={cn(
                                "w-14 h-14 rounded-xl flex items-center justify-center shadow-lg border border-white/10",
                                percentage >= 70 ? "bg-emerald-500/20" : "bg-zinc-800"
                            )}
                        >
                            {percentage >= 70 ? (
                                <Trophy className="w-7 h-7 text-emerald-400" />
                            ) : (
                                <Target className="w-7 h-7 text-primary" />
                            )}
                        </motion.div>
                    </div>

                    <div className="space-y-1">
                        <h3 className="text-lg font-black text-white tracking-tight uppercase">Quiz Complete!</h3>
                        <div className="flex items-center justify-center gap-2">
                            <span className={cn("text-4xl font-black", getScoreColor())}>
                                {result.score}
                            </span>
                            <span className="text-zinc-500 text-xl font-bold">/ {result.totalQuestions}</span>
                        </div>
                    </div>

                    {/* Compact Concepts Overview */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-left">
                            <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-400 uppercase tracking-tighter mb-1">
                                <Target className="w-2.5 h-2.5" />
                                Strong
                            </div>
                            <p className="text-[10px] text-white font-medium">
                                {result.strongAreas.length > 0 ? result.strongAreas.join(', ') : '...'}
                            </p>
                        </div>
                        <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-left">
                            <div className="flex items-center gap-1.5 text-[9px] font-black text-red-400 uppercase tracking-tighter mb-1">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                Focused
                            </div>
                            <p className="text-[10px] text-white font-medium">
                                {entries.length > 0 ? entries.map(e => e[0]).join(', ') : 'Perfect!'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Compact Learning Plan with Mistake Details */}
            {entries.length > 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-zinc-900/30 border border-white/5 rounded-xl overflow-hidden"
                >
                    <Accordion type="single" collapsible className="w-full">
                        {entries.map(([tag, count], idx) => (
                            <AccordionItem key={tag} value={`item-${idx}`} className="border-white/5">
                                <AccordionTrigger className="hover:no-underline py-2.5 px-3 group">
                                    <div className="flex items-center gap-2 text-left">
                                        <div className="w-5 h-5 rounded bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 text-[8px] font-bold">
                                            !
                                        </div>
                                        <p className="text-[10px] font-bold text-white group-hover:text-primary transition-colors uppercase">
                                            {tag} ({count} mistakes)
                                        </p>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-3 pb-3 space-y-3">
                                    <p className="text-[10px] leading-snug text-zinc-500 italic mb-2">
                                        We'll focus the next quiz on {tag}. Review these specific mistakes:
                                    </p>
                                    <div className="space-y-3">
                                        {quiz?.questions
                                            .filter((q: QuizQuestion) => q.conceptTag === tag && result.wrongAnswers.includes(q.id))
                                            .map((q: QuizQuestion) => (
                                                <div key={q.id} className="p-2.5 rounded-lg bg-red-400/5 border border-red-400/10 space-y-2">
                                                    <p className="text-[10px] font-bold text-white leading-relaxed">
                                                        <span className="text-red-400 mr-1.5">Q:</span>
                                                        {cleanCitations(q.question)}
                                                    </p>
                                                    <div className="flex items-center gap-2 p-1.5 rounded-md bg-emerald-400/10 border border-emerald-400/20">
                                                        <span className="text-emerald-400 text-[10px] font-black">{q.correctOptionId}</span>
                                                        <span className="text-[10px] text-zinc-300 font-medium">
                                                            {cleanCitations(q.options.find((o: any) => o.id === q.correctOptionId)?.text || '')}
                                                        </span>
                                                    </div>
                                                    <p className="text-[9px] text-zinc-500 leading-relaxed pl-1 border-l border-white/10">
                                                        <span className="font-bold text-zinc-400 uppercase mr-1 text-[8px]">Explanation:</span>
                                                        {cleanCitations(q.explanation)}
                                                    </p>
                                                </div>
                                            ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </motion.div>
            )
            }

            {/* Action CTA - Streamlined */}
            <div className="space-y-2 pt-2">
                {/* Show deepened sections with checkmark */}
                {deepenedSections.length > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-bold text-emerald-400">Deepened:</span>
                            {deepenedSections.map(s => (
                                <span key={s.tag} className="text-[9px] text-emerald-300/80 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                    {s.tag}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* #10 — Deepen weak areas CTA - only for non-deepened sections */}
                {notDeepenedSections.length > 0 && onDeepenMap && (
                    <button
                        onClick={() => onDeepenMap(notDeepenedSections)}
                        disabled={isDeepeningMap}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/15 hover:border-amber-500/50 transition-all group disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <div className="flex items-center gap-2.5">
                            {isDeepeningMap ? (
                                <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
                            ) : (
                                <span className="text-base">🎯</span>
                            )}
                            <div className="text-left">
                                <p className="text-[11px] font-black text-amber-300 uppercase tracking-widest">
                                    {isDeepeningMap ? 'Adding insights to map...' : 'Deepen Weak Areas'}
                                </p>
                                <p className="text-[10px] text-amber-500/70 mt-0.5">
                                    {notDeepenedSections.map(s => `${s.tag} (${s.score}%)`).join(' · ')}
                                </p>
                            </div>
                        </div>
                        {!isDeepeningMap && (
                            <span className="text-[9px] font-black text-amber-400/60 uppercase tracking-widest group-hover:text-amber-400 transition-colors">Add nodes →</span>
                        )}
                    </button>
                )}

                {/* Show when all sections are deepened */}
                {weakSections.length > 0 && deepenedSections.length === weakSections.length && (
                    <div className="text-center py-2">
                        <span className="text-[10px] font-bold text-emerald-400">✓ All weak areas deepened</span>
                    </div>
                )}

                <Button
                    onClick={onRegenerate}
                    disabled={isRegenerating}
                    className="w-full rounded-xl h-10 bg-white text-black hover:bg-zinc-200 shadow-glow font-black text-[10px] uppercase gap-2"
                >
                    {isRegenerating ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                        <RefreshCw className="w-3 h-3" />
                    )}
                    Regenerate Quiz
                </Button>
                <p className="text-[8px] text-zinc-600 text-center uppercase tracking-widest">
                    Adaptive Engine Active
                </p>
            </div>
        </div >
    );
}
