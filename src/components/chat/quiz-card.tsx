'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronRight, ChevronLeft, BrainCircuit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Quiz, QuizQuestion } from '@/ai/schemas/quiz-schema';
import { cn, cleanCitations } from '@/lib/utils';

interface QuizCardProps {
    quiz: Quiz;
    onSubmit: (answers: Record<string, string>) => void;
    isSubmitting?: boolean;
}

export function QuizCard({ quiz, onSubmit, isSubmitting }: QuizCardProps) {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});

    const currentQuestion = quiz.questions[currentIdx];
    const totalQuestions = quiz.questions.length;
    const progress = ((currentIdx + 1) / totalQuestions) * 100;
    const isLastQuestion = currentIdx === totalQuestions - 1;
    const allAnswered = Object.keys(answers).length === totalQuestions;

    const handleSelect = (optionId: string) => {
        setAnswers(prev => ({ ...prev, [currentQuestion.id]: optionId }));
    };

    const next = () => currentIdx < totalQuestions - 1 && setCurrentIdx(prev => prev + 1);
    const prev = () => currentIdx > 0 && setCurrentIdx(prev => prev - 1);

    return (
        <div className="w-full max-w-lg mx-auto bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            {/* Header & Progress - Compact */}
            <div className="p-3 border-b border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <BrainCircuit className="w-4 h-4 text-primary" />
                        </div>
                        <div className="space-y-0.5">
                            <h3 className="text-xs font-bold text-white truncate max-w-[150px]">
                                {quiz.topic}
                            </h3>
                            <p className="text-[9px] text-zinc-500 uppercase tracking-tighter">
                                {quiz.difficulty} • Q{currentIdx + 1}/{totalQuestions}
                            </p>
                        </div>
                    </div>
                    <div className="text-[10px] font-mono text-primary font-bold">
                        {Math.round(progress)}%
                    </div>
                </div>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-primary"
                    />
                </div>
            </div>

            {/* Question Content - Optimized spacing */}
            <div className="p-4 flex flex-col justify-center min-h-[220px]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentQuestion.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4"
                    >
                        <h4 className="text-sm md:text-base font-semibold text-white leading-relaxed font-sans normal-case">
                            {cleanCitations(currentQuestion.question)}
                        </h4>

                        <div className="grid grid-cols-1 gap-2">
                            {currentQuestion.options.map((option) => {
                                const isSelected = answers[currentQuestion.id] === option.id;
                                return (
                                    <button
                                        key={option.id}
                                        onClick={() => handleSelect(option.id)}
                                        className={cn(
                                            "group flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left relative overflow-hidden normal-case font-sans tracking-normal",
                                            isSelected
                                                ? "bg-primary/20 border-primary/50 shadow-md scale-[1.01]"
                                                : "bg-white/5 border-white/5 hover:bg-white/10"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black border transition-colors flex-shrink-0",
                                            isSelected
                                                ? "bg-primary border-primary text-white"
                                                : "bg-zinc-950 border-white/10 text-zinc-500 group-hover:border-white/30"
                                        )}>
                                            {option.id}
                                        </div>
                                        <span className={cn(
                                            "text-[13px] font-medium transition-colors leading-snug pr-6",
                                            isSelected ? "text-white" : "text-zinc-400 group-hover:text-zinc-200"
                                        )}>
                                            {cleanCitations(option.text)}
                                        </span>
                                        {isSelected && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="absolute right-3"
                                            >
                                                <Check className="w-3 h-3 text-primary" />
                                            </motion.div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Footer Navigation - Slim */}
            <div className="px-4 py-3 bg-black/20 border-t border-white/5 flex items-center justify-between">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={prev}
                    disabled={currentIdx === 0}
                    className="h-8 text-[10px] text-zinc-500 hover:text-white gap-1.5 rounded-lg font-bold"
                >
                    <ChevronLeft className="w-3 h-3" />
                    BACK
                </Button>

                {isLastQuestion ? (
                    <Button
                        size="sm"
                        disabled={!allAnswered || isSubmitting}
                        onClick={() => onSubmit(answers)}
                        className="h-8 rounded-lg shadow-glow gap-1.5 px-4 text-[10px] font-black"
                    >
                        {isSubmitting ? 'SUBMITTING...' : 'FINISH QUIZ'}
                        <Check className="w-3 h-3" />
                    </Button>
                ) : (
                    <Button
                        size="sm"
                        onClick={next}
                        disabled={!answers[currentQuestion.id]}
                        className="h-8 rounded-lg gap-1.5 px-4 text-[10px] font-black"
                    >
                        NEXT
                        <ChevronRight className="w-3 h-3" />
                    </Button>
                )}
            </div>
        </div>
    );
}
