'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Loader2,
  Lightbulb,
  MessageSquare,
  X,
  ChevronRight,
  ChevronLeft,
  History,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from './markdown-renderer';
import { EntityAction } from './entity-action-menu';
import { Quiz, QuizResult } from '@/ai/schemas/quiz-schema';
import { QuizResultCard } from './quiz-result';

export interface ExplanationHistoryItem {
  topic: string;
  content: string;
  timestamp: number;
}

interface QuickExplainDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  topic: string | null;
  context?: string;
  onAskInChat?: (message: string) => void;
  apiKey?: string;
  authToken?: string;
  panelWidth: number;
  historyExplanations: ExplanationHistoryItem[];
  onExplanationGenerated: (topic: string, explanation: string) => void;
  onEntityAction?: (action: EntityAction, topic: string) => void;
}

const LOADING_MESSAGES = [
  'Gathering context...',
  'Synthesizing insights...',
  'Crafting explanation...',
];

export function QuickExplainDrawer({
  isOpen,
  onClose,
  topic,
  context,
  onAskInChat,
  apiKey,
  authToken,
  panelWidth,
  historyExplanations,
  onExplanationGenerated,
  onEntityAction,
}: QuickExplainDrawerProps) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  const [activeView, setActiveView] = useState<'explain' | 'history' | 'detail'>('explain');
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<ExplanationHistoryItem | null>(null);
  const [quizResults, setQuizResults] = useState<{ quiz: Quiz; result: QuizResult } | null>(null);

  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    if (!isOpen) return;
    
    if (topic) {
      setActiveView('explain');
      setExplanation(null);
      setError(null);
      setLoadingMessageIndex(0);
    } else {
      setActiveView('history');
    }
  }, [isOpen, topic]);

  const onExplanationGeneratedRef = useRef(onExplanationGenerated);
  useEffect(() => {
    onExplanationGeneratedRef.current = onExplanationGenerated;
  }, [onExplanationGenerated]);

  useEffect(() => {
    if (!isOpen || !topic || activeView !== 'explain') return;

    // Reset quiz results when a new explanation is fetched
    if (topic) {
      setQuizResults(null);
    }

    // Check if we already have this topic explained in the session history to avoid AI call loops
    const existingItem = historyExplanations.find(
      (h) => h.topic.toLowerCase() === topic.toLowerCase()
    );
    if (existingItem) {
      setExplanation(existingItem.content);
      setIsLoading(false);
      return;
    }

    const fetchExplanation = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            question: `Explain "${topic}" briefly in 2-3 sentences. Be clear, concise, and insightful.${context ? ` Context: ${context}` : ''}`,
            topic: topic,
            history: [],
            persona: 'Teacher',
            apiKey: apiKey,
          }),
        });

        if (!response.ok) throw new Error('Failed to generate explanation');

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response stream');

        let fullText = '';
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          
          if (chunk.startsWith('[ERROR]')) {
            throw new Error(chunk.replace('[ERROR]', '').trim());
          }

          const events = chunk.split(/(?=[TRCAHSCO]:)/);
          for (const event of events) {
            if (event.startsWith('T:')) {
              const delta = event.slice(2);
              fullText += delta;
              setExplanation(fullText);
            } else if (!event.includes(':')) {
              fullText += event;
              setExplanation(fullText);
            }
          }
        }

        if (!fullText) throw new Error('No explanation generated');
        onExplanationGeneratedRef.current(topic, fullText);
      } catch (err: any) {
        console.error('Explanation Error:', err);
        setError(err.message || 'Failed to load explanation');
        const fallbackText = `${topic} is a key concept that encompasses a wide range of ideas. It relates to how we understand and interact with the system, with applications across multiple domains.`;
        setExplanation(fallbackText);
        onExplanationGeneratedRef.current(topic, fallbackText);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExplanation();
  }, [isOpen, topic, context, apiKey, authToken, activeView, historyExplanations]);

  /**
   * Handles quiz submission inside the explanation drawer
   */
  const handleQuizSubmit = useCallback(async (quiz: Quiz, answers: Record<string, string>) => {
    if (!quiz || !quiz.questions) return;

    const results: QuizResult = {
      score: 0,
      totalQuestions: quiz.questions.length,
      correctAnswers: [],
      wrongAnswers: [],
      weakAreas: {},
      strongAreas: []
    };

    const strongAreaTags = new Set<string>();

    quiz.questions.forEach(q => {
      if (answers[q.id] === q.correctOptionId) {
        results.score++;
        results.correctAnswers.push(q.id);
        strongAreaTags.add(q.conceptTag);
      } else {
        results.wrongAnswers.push(q.id);
        results.weakAreas[q.conceptTag] = (results.weakAreas[q.conceptTag] || 0) + 1;
      }
    });

    results.strongAreas = Array.from(strongAreaTags).filter(tag => !results.weakAreas[tag]);

    setQuizResults({ quiz, result: results });
  }, []);

  const handleAskInChat = useCallback((topicText: string) => {
    onAskInChat?.(`Tell me more about ${topicText}`);
    onClose();
  }, [onAskInChat, onClose]);

  const viewHistoryItem = (item: ExplanationHistoryItem) => {
    setSelectedHistoryItem(item);
    setActiveView('detail');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: '100%' }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: '100%',
            width: '380px',
            zIndex: 50,
          }}
          id="quick-explain-drawer"
          className="glassmorphism flex flex-col h-full shadow-2xl"
        >
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-primary/30 via-violet-500/20 to-transparent z-20" />

          <div className="p-4 border-b border-white/5 flex items-center justify-between bg-zinc-950/40 z-10 flex-shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              {activeView === 'detail' ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 -ml-1 flex-shrink-0"
                  onClick={() => setActiveView('history')}
                >
                  <ChevronLeft className="h-4.5 w-4.5" />
                </Button>
              ) : (
                <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 flex-shrink-0">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
              )}
              
              <div className="min-w-0 flex flex-col">
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500 leading-none mb-0.5">
                  {activeView === 'history' ? 'History' : 'Quick Explain'}
                </span>
                <h3 className="text-xs font-bold text-white leading-tight truncate">
                  {activeView === 'explain' ? topic : activeView === 'detail' ? selectedHistoryItem?.topic : 'Previous Explanations'}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {activeView === 'explain' && historyExplanations.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                  onClick={() => setActiveView('history')}
                  title="View History"
                >
                  <History className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-5 py-4">
              <AnimatePresence mode="wait">
                {activeView === 'explain' && (
                  <motion.div
                    key="explain-view"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    {isLoading && !explanation ? (
                      <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="relative">
                          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
                          <div className="relative bg-zinc-900 border border-white/10 p-3.5 rounded-full">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce" />
                        </div>
                        <p className="text-[11px] text-zinc-500 font-medium font-sans">
                          {LOADING_MESSAGES[loadingMessageIndex]}
                        </p>
                      </div>
                    ) : error && !explanation ? (
                      <div className="py-8 text-center">
                        <div className="w-10 h-10 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-3">
                          <X className="h-4 w-4 text-red-400" />
                        </div>
                        <p className="text-xs text-zinc-500">{error}</p>
                      </div>
                    ) : explanation ? (
                      <div className="relative rounded-2xl bg-gradient-to-br from-zinc-900/40 to-zinc-950/40 border border-white/[0.06] p-4.5">
                        <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-gradient-to-b from-primary/40 via-primary/20 to-transparent rounded-full" />
                        <div className="flex items-start gap-2.5 pl-3">
                          <div className="p-1 rounded-lg bg-primary/10 border border-primary/20 flex-shrink-0 mt-0.5">
                            <Lightbulb className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div className="text-[13px] text-zinc-300 leading-relaxed font-normal select-text flex-1 min-w-0 break-words space-y-6">
                            <MarkdownRenderer
                              content={explanation}
                              onEntityAction={onEntityAction}
                              onEntityClick={handleAskInChat}
                              onQuizSubmit={handleQuizSubmit}
                            />
                            {quizResults && quizResults.quiz && quizResults.result && (
                              <div className="border-t border-white/10 pt-6">
                                <QuizResultCard
                                  result={quizResults.result}
                                  quiz={quizResults.quiz}
                                  onRegenerate={() => setQuizResults(null)}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </motion.div>
                )}

                {activeView === 'history' && (
                  <motion.div
                    key="history-view"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-2.5"
                  >
                    {historyExplanations.length === 0 ? (
                      <div className="text-center py-20">
                        <History className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
                        <p className="text-xs text-zinc-500 font-medium">No explanations requested yet.</p>
                      </div>
                    ) : (
                      historyExplanations.map((item, idx) => (
                        <button
                          type="button"
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            viewHistoryItem(item);
                          }}
                          className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.04] hover:border-white/10 active:scale-[0.99] text-left transition-all group"
                        >
                          <div className="p-2 rounded-lg bg-zinc-900 border border-white/5 text-zinc-400 group-hover:text-primary transition-colors flex-shrink-0">
                            <BookOpen className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-zinc-200 group-hover:text-white truncate transition-colors mb-0.5">
                              {item.topic}
                            </h4>
                            <p className="text-[11px] text-zinc-500 truncate leading-none">
                              {item.content}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 transition-colors flex-shrink-0" />
                        </button>
                      ))
                    )}
                  </motion.div>
                )}

                {activeView === 'detail' && selectedHistoryItem && (
                  <motion.div
                    key="detail-view"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <div className="relative rounded-2xl bg-gradient-to-br from-zinc-900/40 to-zinc-950/40 border border-white/[0.06] p-4.5">
                      <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-gradient-to-b from-primary/40 via-primary/20 to-transparent rounded-full" />
                      <div className="flex items-start gap-2.5 pl-3">
                        <div className="p-1 rounded-lg bg-primary/10 border border-primary/20 flex-shrink-0 mt-0.5">
                          <Lightbulb className="h-3.5 w-3.5 text-primary" />
                        </div>                          <div className="text-[13px] text-zinc-300 leading-relaxed font-normal select-text flex-1 min-w-0 break-words">
                            <MarkdownRenderer
                              content={selectedHistoryItem.content}
                              onEntityAction={onEntityAction}
                              onEntityClick={handleAskInChat}
                            />
                          </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </ScrollArea>

          {(activeView === 'explain' && explanation) && (
            <div className="p-4 border-t border-white/5 bg-zinc-950/50 flex flex-col gap-2 flex-shrink-0">
              <Button
                onClick={() => handleAskInChat(topic || '')}
                className="w-full h-9.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold gap-1.5 transition-all active:scale-95 shadow-md font-sans"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Ask in Chat
                <ChevronRight className="h-3 w-3" />
              </Button>
              <p className="text-[9px] text-zinc-600 text-center font-medium">
                AI-generated · May include inaccuracies
              </p>
            </div>
          )}

          {(activeView === 'detail' && selectedHistoryItem) && (
            <div className="p-4 border-t border-white/5 bg-zinc-950/50 flex flex-col gap-2 flex-shrink-0">
              <Button
                onClick={() => handleAskInChat(selectedHistoryItem.topic)}
                className="w-full h-9.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold gap-1.5 transition-all active:scale-95 shadow-md font-sans"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Ask in Chat
                <ChevronRight className="h-3 w-3" />
              </Button>
              <Button
                onClick={() => setActiveView('history')}
                variant="ghost"
                className="w-full h-8.5 rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-white/5 text-[11px] font-bold"
              >
                Back to History
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
