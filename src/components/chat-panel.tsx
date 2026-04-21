'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  Send,
  User,
  Bot,
  X,
  Wand2,
  HelpCircle,
  FileQuestion,
  TestTube2,
  GitCompareArrows,
  Save,
  Plus,
  History,
  ArrowLeft,
  MessageSquare,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  GraduationCap,
  Zap,
  Palette,
  Mic,
  MicOff,
  Download,
  Eraser,
  Github,
  ChevronRight,
  BrainCircuit,
  Paperclip,
  Image as ImageIcon,
  FileDigit,
  FileText,
  Pin,
  PinOff,
  Brain
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}
import { chatAction, summarizeChatAction, generateRelatedQuestionsAction, generateQuizAction } from '@/app/actions';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn, formatText, cleanCitations } from '@/lib/utils';
import { Separator } from './ui/separator';
import { formatDistanceToNow } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/lib/auth-context';
import { getSupabaseClient } from '@/lib/supabase-db';

import { MindMapData } from '@/types/mind-map';
import { Quiz, QuizResult } from '@/ai/schemas/quiz-schema';
import { QuizCard } from './chat/quiz-card';
import { QuizResultCard } from './chat/quiz-result';
import { CreateMindmapDialog } from './chat/CreateMindmapDialog';

// firebase/firestore removed
import { ChatSession, ChatMessage, ChatAttachment, PinnedMessage, toDate } from '@/types/chat';

import { toPlainObject } from '@/lib/serialize';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAIConfig } from '@/contexts/ai-config-context';

import { useXP } from '@/contexts/xp-context';
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}


import { useLocalStorage } from '@/hooks/use-local-storage';
import { useChatPersistence } from '@/hooks/use-chat-persistence';
import { useChatMigration } from '@/hooks/use-chat-migration';
import { useStreamingChat } from '@/hooks/use-streaming-chat';


export interface Attachment {
  type: 'text' | 'pdf' | 'image';
  name: string;
  content: string; // Text content for txt/pdf, base64 for image
}

type Persona = 'Teacher' | 'Concise' | 'Creative' | 'Sage';

const personas: { id: Persona; label: string; icon: any; color: string; description: string }[] = [
  { id: 'Teacher', label: 'Teacher', icon: GraduationCap, color: 'text-yellow-400', description: 'Explains concepts with detailed examples and educational step-by-step guidance.' },
  { id: 'Concise', label: 'Concise', icon: Zap, color: 'text-orange-400', description: 'Provides direct, short, and to-the-point answers without fluff.' },
  { id: 'Creative', label: 'Creative', icon: Palette, color: 'text-pink-400', description: 'Uses imaginative and out-of-the-box thinking for brainstorming.' },
  { id: 'Sage', label: 'Cognitive Sage', icon: Sparkles, color: 'text-purple-400', description: 'Deep, philosophical, and analytical thinker for complex problems.' },
];

/**
 * Props for the ChatPanel component.
 */
interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  topic: string;
  initialMessage?: string;
  initialMode?: 'chat' | 'quiz';
  mindMapData?: MindMapData;
  sessionId?: string;
  usePdfContext?: boolean;
  onUsePdfContextChange?: (usePdf: boolean) => void;
  sourceFileContent?: string | null;
  sourceFileType?: 'text' | 'pdf' | 'image' | null;
  onMindMapGenerated?: (data: MindMapData) => void;
  onOpenPinnedMessages?: () => void;
  onAddMindMapPin?: (question: ChatMessage, response?: ChatMessage) => void;
  onRemoveMindMapPin?: (messageId: string) => void;
  canvasPinnedMessages?: import('@/types/chat').PinnedMessage[];
  onCanvasUnpin?: (pinId: string) => void;
  onAllPinsUnpin?: (pinId: string, mapId?: string) => void;
  onQuizDeepen?: (weakSections: { tag: string; score: number }[], quizTopic: string) => void;
  initialView?: 'chat' | 'history' | 'pins' | 'canvas-pins';
  rememberLastView?: boolean;
}

const allSuggestionPrompts = [
  // Science & Tech
  { icon: Wand2, text: 'Generate a mind map about space exploration', color: 'text-purple-400' },
  { icon: GitCompareArrows, text: 'Compare AI vs Machine Learning', color: 'text-blue-400' },

  { icon: HelpCircle, text: 'Explain quantum computing simply', color: 'text-yellow-400' },
  { icon: Zap, text: 'Explain the theory of relativity', color: 'text-orange-400' },

  { icon: Github, text: 'Explain Blockchain technology', color: 'text-gray-400' }, // Assuming Github icon available or use generic

  // Creative & Ideas
  { icon: Palette, text: 'Brainstorm marketing ideas for a coffee shop', color: 'text-pink-400' },
  { icon: Sparkles, text: 'Write a short story about a time traveler', color: 'text-purple-300' },
  { icon: Wand2, text: 'Design a workout routine for beginners', color: 'text-blue-300' },
  { icon: GraduationCap, text: 'Give me 5 study tips for exams', color: 'text-yellow-500' },

  // Philosophy & Soft Skills
  { icon: HelpCircle, text: 'What is the philosophy of Stoicism?', color: 'text-orange-300' },
  { icon: GitCompareArrows, text: 'Analyze the pros and cons of remote work', color: 'text-blue-500' },
  { icon: Zap, text: 'How to improve public speaking skills?', color: 'text-yellow-300' },

  // Fun & Random
  { icon: Wand2, text: 'Suggest a creative hobby to start', color: 'text-pink-500' },
  { icon: Sparkles, text: 'Plan a 3-day trip to Japan', color: 'text-red-400' },

];

export function ChatPanel({
  isOpen,
  onClose,
  topic,
  initialMessage,
  initialMode = 'chat',
  mindMapData,
  sessionId,
  usePdfContext: propUsePdfContext = false,
  onUsePdfContextChange,
  sourceFileContent,
  sourceFileType,
  onMindMapGenerated,
  onOpenPinnedMessages,
  onAddMindMapPin,
  onRemoveMindMapPin,
  canvasPinnedMessages = [],
  onCanvasUnpin,
  onAllPinsUnpin,
  initialView,
  onQuizDeepen,
}: ChatPanelProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const { config: providerOptionsConfig, updateConfig } = useAIConfig();
  const { awardXP } = useXP();
  const providerOptions = useMemo(() => ({
    provider: providerOptionsConfig.provider,
    apiKey: providerOptionsConfig.provider === 'pollinations' ? providerOptionsConfig.pollinationsApiKey : providerOptionsConfig.apiKey,
    model: providerOptionsConfig.pollinationsModel,
    userId: user?.uid,
  }), [providerOptionsConfig.provider, providerOptionsConfig.apiKey, providerOptionsConfig.pollinationsApiKey, providerOptionsConfig.pollinationsModel, user?.uid]);

  // 1. MIGRATION & PERSISTENCE
  useChatMigration(); // Run migration on mount
  const { 
    sessions, 
    activeSessionId, 
    setActiveSessionId, 
    updateSession,
    createSession,
    deleteSession: deleteSessionFromDb,
    isLoading: isSessionLoading,
    isSyncing
  } = useChatPersistence();

  // 1. STATE MANAGEMENT
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<'chat' | 'history' | 'pins' | 'pin-chat' | 'canvas-pins'>('chat');
  const [allUserPins, setAllUserPins] = useState<PinnedMessage[]>([]);
  const [isLoadingPins, setIsLoadingPins] = useState(false);
  const [activeChatPin, setActiveChatPin] = useState<PinnedMessage | null>(null);
  const [pinChatMessages, setPinChatMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);
  const [pinChatInput, setPinChatInput] = useState('');
  const [isPinChatLoading, setIsPinChatLoading] = useState(false);
  const pinChatTopRef = useRef<HTMLDivElement>(null);
  const pinChatEndRef = useRef<HTMLDivElement>(null);
  const pinChatInitializedRef = useRef(false);
  const [persona, setPersona] = useState<Persona>('Teacher');
  const [displayedPrompts, setDisplayedPrompts] = useState<any[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [createMindmapOpen, setCreateMindmapOpen] = useState(false);
  const [createMindmapContent, setCreateMindmapContent] = useState('');
  const [createMindmapUserMessage, setCreateMindmapUserMessage] = useState('');
  const [unpinConfirmId, setUnpinConfirmId] = useState<string | null>(null);

  // ATTACHMENTS STATE
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // RESIZE STATE
  const [panelWidth, setPanelWidth] = useLocalStorage('mindscape-chat-panel-width', 500);
  const [isResizing, setIsResizing] = useState(false);

  // REMEMBER LAST VIEW
  const [lastView, setLastView] = useLocalStorage<'chat' | 'history' | 'pins' | 'canvas-pins' | 'pin-chat'>('mindscape-chat-last-view', 'chat');
  const [hasOpenedBefore, setHasOpenedBefore] = useLocalStorage('mindscape-chat-opened', false);
  const [savedView, setSavedView] = useState<'chat' | 'history' | 'pins' | 'canvas-pins' | 'pin-chat'>('chat');



  const scrollRef = useRef<HTMLDivElement>(null);
  const [isListening, setIsListening] = useState(false);
  const [relatedQuestions, setRelatedQuestions] = useState<string[]>([]);
  const [isGeneratingRelated, setIsGeneratingRelated] = useState(false);

  // Resize constants
  const MIN_WIDTH = 600;
  const MAX_WIDTH = 900;

  const [showRelatedQuestions, setShowRelatedQuestions] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasSentInitialMessage = useRef(false);
  const quizSelectorAddedRef = useRef(false);

  // QUIZ STATE
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [isDeepeningMap, setIsDeepeningMap] = useState(false);
  const [deepenedTags, setDeepenedTags] = useState<string[]>([]);
  const [quizDifficulty, setQuizDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [quizShowingDifficultySelector, setQuizShowingDifficultySelector] = useState(false);
  const [hiddenSelectorMessages, setHiddenSelectorMessages] = useState<Set<number>>(new Set());

  // PDF CONTEXT STATE
  const [localUsePdfContext, setLocalUsePdfContext] = useState(propUsePdfContext);

  // Sync with prop if it changes externally
  useEffect(() => {
    setLocalUsePdfContext(propUsePdfContext);
  }, [propUsePdfContext]);

  const usePdfContext = localUsePdfContext;
  const setUsePdfContext = (val: boolean) => {
    setLocalUsePdfContext(val);
    if (onUsePdfContextChange) onUsePdfContextChange(val);
  };

  // STREAMING STATE
  const [streamingMessages, setStreamingMessages] = useState<Record<string, string>>({});
  const [streamingIds, setStreamingIds] = useState<Set<string>>(new Set());

  const { startStream, stopStream, reset: resetStream, text: streamText, isStreaming, error: streamError } = useStreamingChat({
    onChunk: (chunk) => {
      // Chunk updates handled via effect below
    },
    onComplete: (fullText) => {
      // Stream complete - will be handled via effect
    },
    onError: (error) => {
      // Error handled via effect below
    }
  });

  // Track if streaming just completed (for triggering related questions once)
  const streamingCompletedRef = useRef(false);

  // Effect to sync streaming text to messages
  useEffect(() => {
    if (streamText && streamingIds.size > 0) {
      const firstStreamingId = Array.from(streamingIds)[0];
      setStreamingMessages(prev => ({
        ...prev,
        [firstStreamingId]: streamText
      }));
    }
  }, [streamText, streamingIds]);

  // Effect to handle stream completion - updates message and triggers related questions
  useEffect(() => {
    if (!isStreaming && streamText && streamingIds.size > 0) {
      const firstStreamingId = Array.from(streamingIds)[0];
      
      // Update the actual message with final content
      const currentSession = sessions.find(s => s.id === activeSessionId);
      if (currentSession) {
        const messageIndex = currentSession.messages.findIndex(m => m.id === firstStreamingId);
        if (messageIndex !== -1) {
          const updatedMessages = [...currentSession.messages];
          updatedMessages[messageIndex] = {
            ...updatedMessages[messageIndex],
            content: streamText
          };
          updateSession(activeSessionId, { messages: updatedMessages });
        }
      }
      
      // Generate related questions after a short delay
      setTimeout(() => {
        if (!streamingCompletedRef.current) {
          streamingCompletedRef.current = true;
          const session = sessions.find(s => s.id === activeSessionId);
          if (session && session.messages.length > 0) {
            const lastMsg = session.messages[session.messages.length - 1];
            if (lastMsg.role === 'ai' && !streamText.includes('error') && !streamText.includes('Sorry')) {
              setIsGeneratingRelated(true);
              generateRelatedQuestionsAction({
                topic,
                mindMapData: mindMapData ? toPlainObject(mindMapData) : undefined,
                history: session.messages.slice(-10).map(m => ({
                  role: m.role === 'ai' ? 'assistant' : 'user',
                  content: m.content
                })),
                usePdfContext,
                pdfContext: usePdfContext && mindMapData?.pdfContext ? JSON.stringify(mindMapData.pdfContext) : undefined
              }, providerOptions).then(({ data: relatedData }) => {
                if (relatedData?.questions) {
                  setRelatedQuestions(relatedData.questions);
                }
                setIsGeneratingRelated(false);
              }).catch(() => {
                setIsGeneratingRelated(false);
              });
            }
          }
        }
      }, 100);
      
      // Clear streaming state
      setStreamingIds(prev => {
        const next = new Set(prev);
        next.delete(firstStreamingId);
        return next;
      });
      setStreamingMessages(prev => {
        const next = { ...prev };
        delete next[firstStreamingId];
        return next;
      });
      
      // Reset the completion flag after a delay
      setTimeout(() => {
        streamingCompletedRef.current = false;
      }, 1000);
    }
  }, [isStreaming, streamText, streamingIds, activeSessionId, sessions, topic, mindMapData, usePdfContext, providerOptions, updateSession]);

  // Effect to handle stream errors
  useEffect(() => {
    if (streamError && streamingIds.size > 0) {
      const firstStreamingId = Array.from(streamingIds)[0];
      const currentSession = sessions.find(s => s.id === activeSessionId);
      if (currentSession) {
        const messageIndex = currentSession.messages.findIndex(m => m.id === firstStreamingId);
        if (messageIndex !== -1) {
          const updatedMessages = [...currentSession.messages];
          updatedMessages[messageIndex] = {
            ...updatedMessages[messageIndex],
            content: `Sorry, I encountered an error: ${streamError}`,
            type: 'text'
          };
          updateSession(activeSessionId, { messages: updatedMessages });
        }
      }
      // Clear streaming state
      setStreamingIds(new Set());
      setStreamingMessages({});
      toast({
        variant: 'destructive',
        title: 'Stream Error',
        description: streamError,
      });
    }
  }, [streamError, streamingIds, activeSessionId, sessions, updateSession, toast]);

  /**
   * Starts a new chat session.
   */
  const supabase = getSupabaseClient();
  const loadAllUserPins = useCallback(async () => {
    if (!user) return;
    setIsLoadingPins(true);
    try {
      const { data: mapsData } = await supabase
        .from('mindmaps')
        .select('pinned_messages')
        .eq('user_id', user.uid);
      
      const pins: PinnedMessage[] = [];
      mapsData?.forEach(d => {
        if (Array.isArray(d.pinned_messages)) pins.push(...d.pinned_messages);
      });
      pins.sort((a: any, b: any) => b.createdAt - a.createdAt);
      setAllUserPins(pins);
    } catch (e) {
      console.error('Failed to load user pins:', e);
    } finally {
      setIsLoadingPins(false);
    }
  }, [user]);

  const startNewChat = useCallback(async (newTopic: string = 'General Conversation') => {
    const mapId = mindMapData?.id || null;
    const mapTitle = topic || 'General';
    const newId = await createSession(newTopic, mapId, mapTitle);
    if (newId) {
       setRelatedQuestions([]);
       setView('chat');
       quizSelectorAddedRef.current = false;
    }
  }, [createSession, mindMapData?.id, topic]);

  // Handle initialMode to trigger quiz selector
  useEffect(() => {
    if (!isOpen || initialMode !== 'quiz') return;
    if (!activeSessionId || quizSelectorAddedRef.current) return;

    quizSelectorAddedRef.current = true;
    const currentSession = sessions.find(s => s.id === activeSessionId);
    if (currentSession?.messages.some(m => m.type === 'quiz-selector')) return;

    const quizSelectorMessage: ChatMessage = {
      id: `msg-${Date.now()}-quiz-sel`,
      role: 'ai',
      content: `I'm ready to prepare a comprehensive quiz for you on **${topic}**. Which level of challenge should I architect for you?`,
      type: 'quiz-selector',
      timestamp: Date.now()
    };
    updateSession(activeSessionId, { messages: [...(currentSession?.messages || []), quizSelectorMessage] });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialMode, activeSessionId]);

  const activeSession = useMemo(() => {
    return sessions.find(s => s.id === activeSessionId) || null;
  }, [sessions, activeSessionId]);

  const messages = activeSession?.messages ?? [];

  /**
   * Sends a message to the AI assistant and updates the current session.
   */
  const handleSend = useCallback(async (messageToSend?: string) => {
    const content = (messageToSend || input).trim();
    if (!content || !activeSessionId) return;

    const newMessage: ChatMessage = { 
      id: `msg-${Date.now()}-user`,
      role: 'user', 
      content,
      type: 'text',
      timestamp: Date.now()
    };
    const currentAttachments = [...attachments];
    setAttachments([]); // Clear UI immediately
    setRelatedQuestions([]); // Clear previous questions when a new one is sent

    // Update the state optimistically
    const currentMessages = activeSession?.messages ?? [];
    const updatedMessages = [...currentMessages, newMessage];

    updateSession(activeSessionId, { messages: updatedMessages });

    if (!messageToSend) {
      setInput('');
    }

    // Award XP for chat message
    awardXP('CHAT_MESSAGE').catch(() => {});

    // Don't show loading spinner - streaming handles the UI
    setIsLoading(false);

    // Create placeholder for streaming response
    const streamingMessageId = `msg-${Date.now()}-ai-stream`;
    const assistantMessagePlaceholder: ChatMessage = {
      id: streamingMessageId,
      role: 'ai',
      content: '', // Will be updated as stream progresses
      type: 'text',
      timestamp: Date.now()
    };

    // Add placeholder message
    updateSession(activeSessionId, { messages: [...updatedMessages, assistantMessagePlaceholder] });

    // Track this message as streaming
    setStreamingIds(prev => new Set([...prev, streamingMessageId]));
    setStreamingMessages(prev => ({ ...prev, [streamingMessageId]: '' }));

    // Prepare history (last 10 messages) for standard chat
    const history = updatedMessages.slice(-10).map(msg => ({
      role: msg.role === 'ai' ? 'assistant' : msg.role, // Action expects 'assistant'
      content: msg.content
    }));

    // If context toggle is on, and we have a source file, include it as an attachment
    const combinedAttachments = [...currentAttachments];
    if (usePdfContext && sourceFileContent && sourceFileType) {
      combinedAttachments.push({
        type: sourceFileType,
        name: `Source ${sourceFileType === 'image' ? 'Image' : 'Document'}`,
        content: sourceFileContent
      });
    }

    // Start streaming
    startStream({
      question: content,
      topic: activeSession?.title || topic,
      history: history.map(m => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.content
      })),
      persona,
      usePdfContext,
      pdfContext: usePdfContext ? mindMapData?.pdfContext : undefined,
      sessionId: sessionId || activeSessionId,
      attachments: combinedAttachments as any,
      apiKey: providerOptions.apiKey,
      model: providerOptionsConfig.pollinationsModel || 'openai',
    });

  }, [input, attachments, activeSessionId, activeSession?.messages, topic, persona, providerOptions, mindMapData, updateSession, startStream]);

  /**
   * Handles file selection and processing (PDF, TXT, Images)
   */
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsProcessingFiles(true);
    const newAttachments: Attachment[] = [];

    for (const file of Array.from(files)) {
      try {
        if (file.type.startsWith('image/')) {
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          newAttachments.push({ type: 'image', name: file.name, content: base64 });
        } else if (file.type === 'application/pdf') {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          let text = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map((item: any) => item.str).join(' ') + '\n';
          }
          newAttachments.push({ type: 'pdf', name: file.name, content: text });
        } else if (file.type === 'text/plain') {
          const text = await file.text();
          newAttachments.push({ type: 'text', name: file.name, content: text });
        } else {
          toast({ title: "Unsupported file type", description: `${file.name} cannot be attached.`, variant: "destructive" });
        }
      } catch (err) {
        console.error(`Error processing file ${file.name}:`, err);
        toast({ title: "File Error", description: `Could not process ${file.name}`, variant: "destructive" });
      }
    }

    setAttachments(prev => [...prev, ...newAttachments]);
    setIsProcessingFiles(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  /**
   * Generates a quiz based on the current topic.
   */
  const handleStartQuiz = useCallback(async (difficulty: 'easy' | 'medium' | 'hard' = 'medium', messageIndex?: number) => {
    if (!activeSessionId) return;

    // Mark this selector message as hidden if index provided
    if (messageIndex !== undefined) {
      setHiddenSelectorMessages(prev => new Set(prev).add(messageIndex));
    }

    setIsQuizLoading(true);
    setQuizShowingDifficultySelector(false);

    // Context for mind map if available - serialize Firestore Timestamps first
    const mindMapContext = mindMapData ? JSON.stringify(toPlainObject(mindMapData)) : undefined;

    const { data, error } = await generateQuizAction({
      topic: topic === 'General Conversation' ? 'General Knowledge' : topic,
      difficulty,
      mindMapContext,
      usePdfContext,
      pdfContext: usePdfContext && mindMapData?.pdfContext ? JSON.stringify(mindMapData.pdfContext) : undefined
    }, providerOptions);

    setIsQuizLoading(false);

    if (error || !data) {
      toast({
        title: "Quiz Generation Failed",
        description: error || "Try again later",
        variant: "destructive"
      });
      return;
    }

    const quizMessage: ChatMessage = {
      id: `msg-${Date.now()}-quiz`,
      role: 'ai',
      content: `I've generated a ${difficulty} quiz about ${topic}. Let's test your knowledge!`,
      type: 'quiz',
      quiz: data,
      timestamp: Date.now()
    };

    updateSession(activeSessionId, { messages: [...(activeSession?.messages || []), quizMessage] });
  }, [activeSessionId, activeSession?.messages, topic, mindMapData, providerOptions, updateSession, toast]);

  /**
   * Handles quiz submission and results calculation
   */
  const handleQuizSubmit = useCallback(async (messageIndex: number, answers: Record<string, string>) => {
    if (!activeSession || !activeSessionId) return;
    const message = activeSession.messages[messageIndex];
    if (!message.quiz) return;

    const results: QuizResult = {
      score: 0,
      totalQuestions: message.quiz.questions.length,
      correctAnswers: [],
      wrongAnswers: [],
      weakAreas: {},
      strongAreas: []
    };

    const strongAreaTags = new Set<string>();
    const sessionWeakTags = new Set<string>(activeSession.weakTags || []);

    message.quiz.questions.forEach(q => {
      if (answers[q.id] === q.correctOptionId) {
        results.score++;
        results.correctAnswers.push(q.id);
        strongAreaTags.add(q.conceptTag);
      } else {
        results.wrongAnswers.push(q.id);
        results.weakAreas[q.conceptTag] = (results.weakAreas[q.conceptTag] || 0) + 1;
        sessionWeakTags.add(q.conceptTag);
      }
    });

    results.strongAreas = Array.from(strongAreaTags).filter(tag => !results.weakAreas[tag]);

    const resultMessage: ChatMessage = {
      id: `msg-${Date.now()}-result`,
      role: 'ai',
      content: `Quiz Results: You scored ${results.score}/${results.totalQuestions}`,
      type: 'quiz-result',
      quizResult: results,
      quiz: message.quiz, // Keep original quiz for reference in regeneration
      timestamp: Date.now()
    };

    updateSession(activeSessionId, { 
      messages: [...activeSession.messages, resultMessage],
      quizHistory: [...(activeSession.quizHistory || []), results],
      weakTags: Array.from(sessionWeakTags)
    });

    // Award quiz XP
    const scorePct = Math.round((results.score / results.totalQuestions) * 100);
    awardXP('QUIZ_COMPLETED', { score: results.score, total: results.totalQuestions }).catch(() => {});
    if (scorePct === 100) awardXP('QUIZ_PERFECT').catch(() => {});
    else if (scorePct >= 80) awardXP('QUIZ_BONUS_80').catch(() => {});

    // #10 — Quiz-adaptive deepening
    // Correct denominator: questions per tag, not total questions
    if (onQuizDeepen && message.quiz) {
      const tagQuestionCounts = message.quiz.questions.reduce((acc: Record<string, number>, q) => {
        acc[q.conceptTag] = (acc[q.conceptTag] || 0) + 1;
        return acc;
      }, {});

      // Filter first (score < 60%), then take bottom 2 — avoids missing weak sections
      const weakSections = Object.entries(results.weakAreas)
        .map(([tag, mistakeCount]) => ({
          tag,
          score: Math.round(((tagQuestionCounts[tag] - mistakeCount) / tagQuestionCounts[tag]) * 100)
        }))
        .filter(s => s.score < 60)
        .sort((a, b) => a.score - b.score);

      if (weakSections.length > 0) {
        setTimeout(() => onQuizDeepen(weakSections, topic), 800);
      }
    }
  }, [activeSession, activeSessionId, updateSession, onQuizDeepen, topic]);

  /**
   * Handles adaptive quiz regeneration
   */
  const handleRegenerateQuiz = useCallback(async (prevQuiz: Quiz, result: QuizResult) => {
    if (!activeSessionId) return;

    const weakAreas = Object.keys(result.weakAreas);

    // Instead of immediately regenerating, show a difficulty selector
    const selectorMessage: ChatMessage = {
      id: `msg-${Date.now()}-reg-selector`,
      role: 'ai',
      content: `Based on your performance, I can prepare a follow-up quiz${weakAreas.length > 0 ? ` focusing on: ${weakAreas.join(', ')}` : ''}. Which difficulty level would you like?`,
      type: 'quiz-selector',
      timestamp: Date.now()
    };

    updateSession(activeSessionId, { messages: [...(activeSession?.messages || []), selectorMessage] });
  }, [activeSessionId, activeSession?.messages, updateSession]);





  // Load persona preference from user profile
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;

      try {
        const { data } = await supabase
          .from('users')
          .select('preferences')
          .eq('id', user.uid)
          .single();

        if (data?.preferences?.default_ai_persona) {
          const savedPersona = data.preferences.default_ai_persona as Persona;
          if (['Teacher', 'Concise', 'Creative', 'Sage'].includes(savedPersona)) {
            setPersona(savedPersona);
          }
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    };

    if (isOpen) {
      loadPreferences();
    }
  }, [isOpen, user]);

  // Shuffle prompts when starting a fresh 'General Conversation' chat
  useEffect(() => {
    if (activeSessionId && activeSession?.title === 'General Conversation' && activeSession.messages.length === 0) {
      const shuffled = [...allSuggestionPrompts].sort(() => 0.5 - Math.random());
      setDisplayedPrompts(shuffled.slice(0, 4));
    }
  }, [activeSessionId, activeSession?.title, activeSession?.messages.length]);

  /**
   * Scrolls the chat view to the latest assistant message or bottom.
   */
  const scrollToLatestMessage = () => {
    if (!isLoading && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'ai') {
        const el = document.getElementById(`message-${activeSessionId}-${messages.length - 1}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
      }
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && view === 'chat') {
      const timer = setTimeout(() => {
        scrollToLatestMessage();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, view, messages, isQuizLoading, isLoading]);

  // Summarize chat to generate a topic title
  useEffect(() => {
    if (
      activeSession &&
      activeSession.title === 'General Conversation' &&
      activeSession.messages.length >= 2 &&
      !isLoading
    ) {
      const sessionIdToUpdate = activeSession.id;
      // Pass providerOptions if available
      summarizeChatAction({ 
        history: activeSession.messages.slice(0, 4).map(m => ({
          role: m.role === 'ai' ? 'assistant' : 'user',
          content: m.content
        })) as any 
      }, providerOptions)
        .then(({ summary, error }) => {
          if (summary && !error) {
            updateSession(sessionIdToUpdate, { title: summary.topic });
          }
        });
    }
  }, [activeSession?.messages.length, isLoading, activeSession?.title, activeSession?.id, updateSession]);


  /**
   * Finds or creates a session for the current topic.
   */
  useEffect(() => {
    if (isOpen) {
      if (activeSessionId) {
        const current = sessions.find(s => s.id === activeSessionId);
        const isSessionRelevant = current && (
          (sessionId && current.mapId === sessionId) ||
          (current.title === topic)
        );
        if (isSessionRelevant) {
          if (!initialView) setView('chat');
          return;
        }
      }

      const existingSession = sessions.find(s =>
        (sessionId && s.mapId === sessionId) ||
        s.title === topic
      );

      if (existingSession) {
        setActiveSessionId(existingSession.id);
      } else if (!isSessionLoading) {
        startNewChat(topic);
      }
      // Only reset to chat if no specific view was requested
      if (!initialView) setView('chat');
    } else {
      hasSentInitialMessage.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, topic, isSessionLoading, sessionId]);

  // Apply initialView — runs after session effect so it wins
  useEffect(() => {
    if (isOpen) {
      // First time open → show chat home
      // Returning user → show last saved view
      const viewToSet = hasOpenedBefore ? (initialView || savedView) : 'chat';
      setView(viewToSet);
      if (hasOpenedBefore) {
        setLastView(viewToSet);
      }
      setHasOpenedBefore(true);
      // Pre-load all pins when opening a pin view
      if (viewToSet === 'pins' || viewToSet === 'canvas-pins') {
        loadAllUserPins();
      }
    }
  }, [isOpen, initialView, savedView, hasOpenedBefore]);

  /**
   * Handles sending an initial message if one is provided.
   * Resets the flag if the message changes (e.g. clicking different nodes)
   */
  useEffect(() => {
    if (initialMessage) {
      hasSentInitialMessage.current = false;
    }
  }, [initialMessage]);

  useEffect(() => {
    if (isOpen && initialMessage && !hasSentInitialMessage.current && activeSession) {
      handleSend(initialMessage);
      hasSentInitialMessage.current = true;
      hasSentInitialMessage.current = true;
    }
  }, [isOpen, initialMessage, initialMode, activeSession, handleSend, handleStartQuiz]);




  /**
   * Exports the current chat session to a PDF file.
   */
  const exportChatToPDF = async () => {
    if (!activeSession) return;

    try {
      // Dynamically import jsPDF to avoid SSR issues
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      // Helper function to clean markdown and emojis from text
      const cleanText = (text: string): string => {
        return cleanCitations(text)
          // Remove emojis and special unicode characters
          .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
          // Preserve headers but remove hashes (we'll style them dynamically later by checking for them first)
          // .replace(/^#{1,6}\s+(.*)$/gm, '$1') <- We will NOT strip headers here so we can detect them in the loop
          // Remove markdown bold/italic
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          // Remove inline code ticks
          .replace(/`([^`]+)`/g, '$1')
          // Clean spaces but preserve newlines
          .replace(/[ \t]+/g, ' ')
          .trim();
      };

      // Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('MindScape Chat Export', 105, 20, { align: 'center' });

      // Metadata box
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setDrawColor(200, 200, 200);
      doc.rect(15, 28, 180, 16);
      doc.text(`Topic: ${activeSession.title}`, 20, 34);
      doc.text(`Date: ${toDate(activeSession.createdAt).toLocaleString()}`, 20, 40);

      let yPosition = 55;
      const margin = 20;



      // Messages
      const pageHeight = doc.internal.pageSize.height;
      const pageWidth = doc.internal.pageSize.width;
      const maxWidth = pageWidth - (margin * 2);

      activeSession.messages.forEach((msg, index) => {
        // Check if we need a new page
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = 20;
        }

        // Role label with background
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        const roleLabel = msg.role === 'user' ? 'You' : 'MindScape AI';
        const roleColor = msg.role === 'user' ? [59, 130, 246] : [168, 85, 247]; // blue or purple

        // Draw role badge
        doc.setFillColor(roleColor[0], roleColor[1], roleColor[2]);
        doc.roundedRect(margin, yPosition - 4, 35, 7, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(roleLabel, margin + 2, yPosition);
        doc.setTextColor(0, 0, 0);

        yPosition += 10;

        // Message content - clean and format
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);

        // Split standard text into raw blocks based on newlines
        // We do not format all text entirely yet, so we can detect lists and headings
        const rawContent = cleanText(msg.content);
        // By keeping newlines, we can read them paragraph by paragraph
        const paragraphs = rawContent.split('\n').map(p => p.trim()).filter(p => p);

        paragraphs.forEach((paragraph) => {
          if (yPosition > pageHeight - 30) {
            doc.addPage();
            yPosition = 20;
          }

          let isHeader = false;
          let isBullet = false;
          let isNumbered = false;
          let displayParagraph = paragraph;

          // Header detection
          const headerMatch = paragraph.match(/^(#{1,6})\s+(.*)$/);
          if (headerMatch) {
            isHeader = true;
            displayParagraph = headerMatch[2]; // The text without the hashes
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
          } else {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);

            // List detection
            if (paragraph.startsWith('- ') || paragraph.startsWith('* ') || paragraph.startsWith('• ')) {
              isBullet = true;
              displayParagraph = '• ' + paragraph.substring(2);
            } else if (/^\d+\.\s+/.test(paragraph)) {
              isNumbered = true;
              // Keep the number, just note it's a list item for indenting
            }
          }

          const indent = (isBullet || isNumbered) ? margin + 5 : margin;
          const textWidth = (isBullet || isNumbered) ? maxWidth - 5 : maxWidth;

          const lines = doc.splitTextToSize(displayParagraph, textWidth);

          lines.forEach((line: string) => {
            if (yPosition > pageHeight - 20) {
              doc.addPage();
              yPosition = 20;
            }

            doc.text(line, indent, yPosition);
            yPosition += (isHeader ? 6 : 5);
          });

          // Extra spacing after headers or regular paragraphs
          yPosition += (isHeader ? 3 : 2);
        });

        // Add separator between messages
        yPosition += 3;
        doc.setDrawColor(230, 230, 230);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 8;
      });

      // Footer on last page
      const totalPages = doc.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${i} of ${totalPages} • Generated by MindScape`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      // Save PDF
      doc.save(`mindscape-chat-${activeSession.title.replace(/\s+/g, '-').toLowerCase()}.pdf`);

      toast({ title: 'Exported', description: 'Chat history downloaded as PDF.' });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        variant: 'destructive',
        title: 'Export failed',
        description: 'Could not generate PDF. Please try again.'
      });
    }
  };


  /**
    * Copies a message to clipboard.
   */
  const handleCopyMessage = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      toast({
        title: 'Copied!',
        description: 'Response copied to clipboard.',
      });
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Copy failed',
        description: 'Could not copy to clipboard.',
      });
    }
  };

  /**
   * Toggles pin state for a message.
   */
  const togglePinMessage = (messageId: string) => {
    if (!activeSessionId || !activeSession) return;

    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    const message = messages[messageIndex];
    if (message.type !== 'text') {
      toast({
        variant: 'destructive',
        title: 'Cannot pin',
        description: 'Only text messages can be pinned.',
      });
      return;
    }

    const updatedMessages = messages.map(m => 
      m.id === messageId ? { ...m, isPinned: !m.isPinned } : m
    );
    updateSession(activeSessionId, { messages: updatedMessages });
    
    if (!message.isPinned) {
      awardXP('CHAT_PINNED').catch(() => {});
      if (message.role === 'ai') {
        const userMessageIndex = messageIndex - 1;
        if (userMessageIndex >= 0 && messages[userMessageIndex].role === 'user' && messages[userMessageIndex].type === 'text') {
          onAddMindMapPin?.(messages[userMessageIndex], message);
        } else {
          onAddMindMapPin?.(message);
        }
      } else {
        onAddMindMapPin?.(message);
      }
    } else {
      onRemoveMindMapPin?.(messageId);
    }
  };

  /**
   * Regenerates the last assistant response.
   */
  const handleRegenerate = async (index: number) => {
    if (!activeSessionId || !activeSession) return;

    // Find the user message that prompted this response
    const userMessageIndex = index - 1;
    if (userMessageIndex < 0 || messages[userMessageIndex].role !== 'user') return;

    const userMessage = messages[userMessageIndex].content;

    // Remove the assistant message we're regenerating
    const updatedMessages = messages.slice(0, index);
    updateSession(activeSessionId, { messages: updatedMessages });

    setRelatedQuestions([]); // Clear when regenerating

    const history = updatedMessages.slice(-10).map(msg => ({
      role: msg.role === 'ai' ? 'assistant' : 'user',
      content: msg.content
    }));

    const combinedAttachments = [...attachments];
    if (usePdfContext && sourceFileContent && sourceFileType) {
      combinedAttachments.push({
        type: sourceFileType,
        name: `Source ${sourceFileType === 'image' ? 'Image' : 'Document'}`,
        content: sourceFileContent
      });
    }

    // Create streaming message placeholder
    const streamingMessageId = `msg-${Date.now()}-ai-regen`;
    const assistantMessagePlaceholder: ChatMessage = {
      id: streamingMessageId,
      role: 'ai',
      content: '',
      type: 'text',
      timestamp: Date.now()
    };

    // Add placeholder message
    updateSession(activeSessionId, { messages: [...updatedMessages, assistantMessagePlaceholder] });

    // Track this message as streaming
    setStreamingIds(prev => new Set([...prev, streamingMessageId]));
    setStreamingMessages(prev => ({ ...prev, [streamingMessageId]: '' }));

    // Start streaming
    startStream({
      question: userMessage,
      topic: activeSession.title,
      history: history.map(m => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.content
      })),
      persona,
      usePdfContext,
      pdfContext: usePdfContext ? mindMapData?.pdfContext : undefined,
      sessionId: sessionId || activeSessionId,
      attachments: combinedAttachments as any,
      apiKey: providerOptions.apiKey,
      model: providerOptionsConfig.pollinationsModel || 'openai',
    });
  };

  /**
   * Selects a session from the history view.
   */
  const selectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setRelatedQuestions([]);
    setView('chat');
  }

  /**
   * Deletes a chat session from history.
   */
  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();

    const remainingSessions = sessions.filter(s => s.id !== sessionId);

    // If we deleted the active session, switch to another one
    if (activeSessionId === sessionId) {
      if (remainingSessions.length > 0) {
        // Switch to the most recent remaining session
        setActiveSessionId(remainingSessions[0].id);
      } else {
        // No sessions left, create a new one
        setActiveSessionId(null);
        setTimeout(() => startNewChat(topic), 0);
      }
    }

    // Call the hook to delete from Firestore/State
    deleteSessionFromDb(sessionId);
  }

  /**
   * Handles resize start from the drag handle
   */
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🔧 Resize started at X:', e.clientX);
    setIsResizing(true);

    const startX = e.clientX;
    const startWidth = panelWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = startX - moveEvent.clientX;
      const newWidth = startWidth + deltaX;
      const clampedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));
      setPanelWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      console.log('✅ Resize ended, final width:', panelWidth);
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  };

  /**
   * Handles voice input using Web Speech API.
   */
  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        variant: 'destructive',
        title: 'Not supported',
        description: 'Voice input is not supported in this browser.',
      });
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      toast({
        title: 'Listening...',
        description: 'Speak now.',
      });
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => (prev ? `${prev} ${transcript}` : transcript));
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not recognize speech.',
      });
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };


  const renderChatView = () => {
    return (
      <>
        <ScrollArea className="flex-grow px-4">
          <div className="flex flex-col gap-4 py-4">
            {messages.length === 0 && (
              <div className="text-center p-6 relative min-h-full flex flex-col items-center justify-start pt-12 sm:pt-16">
                {/* Enhanced Animated Gradient Background Layer */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                  <div className="w-64 h-64 rounded-full bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-indigo-500/10 blur-[80px] animate-pulse-glow" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px]" />
                </div>

                {/* Central Hero Section */}
                <div className="relative z-10 mb-6 w-full">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="relative inline-block mb-6">
                      <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                      <Avatar className="h-20 w-20 border-2 border-primary/50 mx-auto shadow-2xl relative z-10 group-hover:scale-110 transition-transform duration-500">
                        <AvatarFallback className="bg-zinc-950 text-primary">
                          <Bot className="h-10 w-10 animate-float" />
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    <h2 className="text-xl md:text-2xl font-black text-white tracking-tight mb-2 line-clamp-2 px-6">
                      {topic === 'General Conversation' ? "How can I help you?" : `Explore ${topic}`}
                    </h2>
                    <p className="text-zinc-500 text-xs font-medium uppercase tracking-[0.2em] animate-pulse">
                      AI Knowledge Assistant Active
                    </p>
                  </motion.div>
                </div>

                {/* Bento Grid Suggestions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg relative z-10">
                  {[
                    {
                      title: "Deep Dive",
                      icon: Wand2,
                      prompt: `Give me a comprehensive deep dive into ${topic === 'General Conversation' ? 'a random interesting topic' : topic}`,
                      color: "bg-purple-500/10 hover:bg-purple-500/20",
                      border: "border-purple-500/20",
                      iconColor: "text-purple-400"
                    },
                    {
                      title: "Quick Quiz",
                      icon: BrainCircuit,
                      prompt: "quiz",
                      color: "bg-emerald-500/10 hover:bg-emerald-500/20",
                      border: "border-emerald-500/20",
                      iconColor: "text-emerald-400"
                    },
                    {
                      title: "Key Concepts",
                      icon: GraduationCap,
                      prompt: `What are the most important concepts to master in ${topic === 'General Conversation' ? 'Learning' : topic}?`,
                      color: "bg-blue-500/10 hover:bg-blue-500/20",
                      border: "border-blue-500/20",
                      iconColor: "text-blue-400"
                    },
                    {
                      title: "Fact Check",
                      icon: History,
                      prompt: `Surprise me with some incredible facts about ${topic === 'General Conversation' ? 'the universe' : topic}`,
                      color: "bg-orange-500/10 hover:bg-orange-500/20",
                      border: "border-orange-500/20",
                      iconColor: "text-orange-400"
                    }
                  ].map((item, index) => (
                    <div key={index} className="relative group">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + index * 0.05 }}
                        onClick={() => {
                          console.log('[DEBUG] Suggestion Clicked:', item.title);
                          if (item.title === 'Quick Quiz') {
                            setQuizShowingDifficultySelector(true);
                          } else {
                            handleSend(item.prompt);
                          }
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all duration-300 text-left hover:scale-[1.02] hover:shadow-lg active:scale-95 cursor-pointer",
                          item.color,
                          item.border
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center bg-zinc-950 border border-white/5 shadow-inner transition-transform group-hover:rotate-12",
                          item.iconColor
                        )}>
                          <item.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-grow">
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">{item.title}</h4>
                          <p className="text-[10px] text-zinc-500 group-hover:text-zinc-300 transition-colors line-clamp-1">
                            {item.title === 'Quick Quiz' ? 'Adaptive Learning Engine' : 'Get started instantly'}
                          </p>
                        </div>
                      </motion.div>

                      {item.title === 'Quick Quiz' && quizShowingDifficultySelector && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          className="absolute inset-0 z-20 bg-zinc-950/90 backdrop-blur-md rounded-2xl border border-emerald-500/30 p-2 flex flex-col justify-center gap-1.5"
                        >
                          <p className="text-[9px] font-bold text-center text-emerald-400 uppercase tracking-widest mb-1">Choose Difficulty</p>
                          <div className="flex items-center justify-center gap-1">
                            {['easy', 'medium', 'hard'].map((d) => (
                              <Button
                                key={d}
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartQuiz(d as any);
                                }}
                                className="h-8 text-[10px] font-bold uppercase rounded-lg hover:bg-emerald-500/20 hover:text-emerald-400 border border-white/5"
                              >
                                {d}
                              </Button>
                            ))}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setQuizShowingDifficultySelector(false); }}
                            className="text-[9px] text-zinc-500 hover:text-white uppercase font-bold mt-1"
                          >
                            Cancel
                          </button>
                        </motion.div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Quick Resume Link - Subtly placed at bottom */}
                {sessions.filter(s => s.id !== activeSessionId && s.messages.length > 0).length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="mt-8 flex items-center gap-2 text-zinc-600 hover:text-zinc-400 cursor-pointer transition-colors"
                    onClick={() => setView('history')}
                  >
                    <History className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest leading-none">View Recent Sessions</span>
                  </motion.div>
                )}
              </div>
            )}

            {/* Messages and Suggestions List */}
            <div className="flex flex-col gap-6">
              <AnimatePresence initial={false} mode="popLayout">
                {messages.map((message, index) => {
                  // Skip quiz-selector messages that have been hidden after selection
                  if (message.type === 'quiz-selector' && hiddenSelectorMessages.has(index)) {
                    return null;
                  }
                  const isTextMessage = message.type === 'text';
                  return (
                    <motion.div
                      key={`${activeSessionId}-${index}`}
                      id={`message-${activeSessionId}-${index}`}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="flex flex-col gap-3"
                    >
                      <div
                        className={cn(
                          'flex items-start gap-3',
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        {message.role === 'ai' ? (
                          <Avatar className="h-8 w-8 border flex-shrink-0">
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              <Bot className="h-5 w-5" />
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="order-2 flex-shrink-0">
                            <div className="h-8 w-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                              <User className="h-4 w-4 text-zinc-400" />
                            </div>
                          </div>
                        )}
                        <div
                          className={cn(
                            'max-w-[85%] overflow-hidden transition-all duration-300 break-words overflow-wrap-anywhere',
                            message.role === 'user'
                              ? 'order-1 rounded-2xl rounded-tr-sm bg-white/[0.06] border border-white/10 shadow-sm'
                              : 'bg-secondary/40 backdrop-blur-sm border border-white/5 rounded-2xl rounded-tl-sm'
                          )}
                        >
                          {message.isPinned && (
                            <div className="px-3 pt-2 flex items-center gap-1.5">
                              <Pin className="h-3 w-3 text-amber-400 fill-amber-400" />
                              <span className="text-[10px] font-bold text-amber-400/80 uppercase tracking-widest">Pinned</span>
                            </div>
                          )}
                          {message.role === 'user' && (
                            <div className="px-4 pt-3 pb-0 flex items-center gap-1.5">
                              <span className="font-orbitron text-[9px] uppercase tracking-widest text-zinc-600">You</span>
                            </div>
                          )}
                          <div className="p-4">
                            {message.type === 'quiz' && message.quiz ? (
                              <QuizCard
                                quiz={message.quiz}
                                onSubmit={(answers) => handleQuizSubmit(index, answers)}
                                isSubmitting={isQuizLoading}
                              />
                            ) : message.type === 'quiz-result' && message.quizResult ? (
                              <QuizResultCard
                                result={message.quizResult}
                                quiz={message.quiz}
                                onRegenerate={() => handleRegenerateQuiz(message.quiz!, message.quizResult!)}
                                isRegenerating={isQuizLoading}
                                deepenedTags={deepenedTags}
                                isDeepeningMap={isDeepeningMap}
                                onDeepenMap={onQuizDeepen ? async (weakSections) => {
                                  setIsDeepeningMap(true);
                                  try {
                                    // Filter out already deepened sections before deepening
                                    const sectionsToDeepen = weakSections.filter(s => !deepenedTags.includes(s.tag));
                                    if (sectionsToDeepen.length === 0) {
                                      return; // All sections already deepened
                                    }
                                    await onQuizDeepen(sectionsToDeepen, topic);
                                    // Track which tags were deepened
                                    setDeepenedTags(prev => [...new Set([...prev, ...sectionsToDeepen.map(s => s.tag)])]);
                                  } finally {
                                    setIsDeepeningMap(false);
                                  }
                                } : undefined}
                              />
                            ) : message.type === 'quiz-selector' ? (
                              <div className="flex flex-col gap-4">
                                <p className="text-sm font-medium leading-relaxed">
                                  I'm ready to prepare a comprehensive quiz for you on **{activeSession?.title || topic}**. Which level of challenge should I architect for you?
                                </p>
                                <div className="flex flex-wrap gap-2 pt-2">
                                  {[
                                    { id: 'easy', label: 'Easy', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
                                    { id: 'medium', label: 'Medium', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
                                    { id: 'hard', label: 'Hard', color: 'bg-red-500/10 text-red-400 border-red-500/20' }
                                  ].map((d) => (
                                    <Button
                                      key={d.id}
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleStartQuiz(d.id as any, index)}
                                      className={cn(
                                        "h-10 px-6 text-[10px] font-black font-orbitron uppercase tracking-[0.2em] rounded-2xl border hover:scale-105 active:scale-95 transition-all backdrop-blur-md",
                                        d.color
                                      )}
                                    >
                                      {d.label}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            ) : message.type !== 'quiz' && message.type !== 'quiz-result' && message.type !== 'quiz-selector' && message.role === 'user' ? (
                              <p className="text-sm text-zinc-200 leading-relaxed">{message.content}</p>
                            ) : (
                              <div
                                className="text-sm prose prose-sm max-w-none leading-relaxed prose-invert break-words whitespace-pre-wrap"
                                style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}
                              >
                                {(() => {
                                  const displayContent = streamingMessages[message.id] ?? message.content;
                                  const isCurrentlyStreaming = streamingIds.has(message.id);
                                  if (isCurrentlyStreaming && !displayContent) {
                                    return (
                                      <div className="flex items-center gap-1 py-1">
                                        <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                      </div>
                                    );
                                  }
                                  return (
                                    <>
                                      <span dangerouslySetInnerHTML={{ __html: formatText(displayContent) }} />
                                      {isCurrentlyStreaming && (
                                        <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse" />
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                          {isTextMessage && !streamingIds.has(message.id) && (
                            <div className="flex items-center gap-1 px-3 pb-2 pt-0">
                              {streamingIds.has(message.id) && streamingMessages[message.id] && (
                                <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-400" onClick={stopStream}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger><TooltipContent>Stop</TooltipContent></Tooltip></TooltipProvider>
                              )}
                              {message.role === 'ai' && (
                                <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => handleCopyMessage(streamingMessages[message.id] || message.content, index)}>
                                    {copiedIndex === index ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                  </Button>
                                </TooltipTrigger><TooltipContent>Copy</TooltipContent></Tooltip></TooltipProvider>
                              )}
{message.role === 'ai' && (
                                <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => handleRegenerate(index)}>
                                    <RefreshCw className={cn("h-3 w-3", isLoading && index === messages.length - 1 && "animate-spin")} />
                                  </Button>
                                </TooltipTrigger><TooltipContent>Regenerate</TooltipContent></Tooltip></TooltipProvider>
                              )}
                              {message.role === 'ai' && !streamingIds.has(message.id) && (
                                <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 text-muted-foreground hover:text-primary"
                                    onClick={() => {
                                      const userMsg = index > 0 && messages[index - 1]?.role === 'user'
                                        ? messages[index - 1].content
                                        : undefined;
                                      setCreateMindmapUserMessage(userMsg || '');
                                      setCreateMindmapContent(streamingMessages[message.id] || message.content);
                                      setCreateMindmapOpen(true);
                                    }}
                                  >
                                    <Brain className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger><TooltipContent>Create Mind Map</TooltipContent></Tooltip></TooltipProvider>
                              )}
                              {message.role === 'ai' && (
                                <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                  <Button
                                    variant="ghost" size="icon"
                                    className={cn("h-6 w-6 transition-all", message.isPinned ? "text-amber-400 hover:text-amber-300" : "text-muted-foreground hover:text-amber-400")}
                                    onClick={() => togglePinMessage(message.id)}
                                  >
                                    <motion.div animate={message.isPinned ? { scale: [1, 1.3, 1] } : { scale: 1 }} transition={{ duration: 0.3 }}>
                                      <Pin className={cn("h-3 w-3", message.isPinned && "fill-current")} />
                                    </motion.div>
                                  </Button>
                                </TooltipTrigger><TooltipContent>{message.isPinned ? 'Unpin' : 'Pin'}</TooltipContent></Tooltip></TooltipProvider>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Related Questions Section - Only show when not streaming */}
                      {message.role === 'ai' && index === messages.length - 1 && !streamingIds.has(message.id) && (
                        <div className="ml-11 flex flex-col gap-3">
                          {/* Toggle Header */}
                          {(isGeneratingRelated || relatedQuestions.length > 0) && (
                            <div className="flex items-center justify-between">
                              <button
                                onClick={() => setShowRelatedQuestions(!showRelatedQuestions)}
                                className="flex items-center gap-2 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest hover:text-primary transition-colors group"
                              >
                                <Sparkles className={cn("h-3 w-3", isGeneratingRelated ? "animate-spin text-primary" : "text-primary/50 group-hover:text-primary")} />
                                <span>Related Questions</span>
                                <motion.div
                                  animate={{ rotate: showRelatedQuestions ? 0 : -90 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <ChevronRight className="h-3 w-3" />
                                </motion.div>
                              </button>

                              {relatedQuestions.length > 0 && !isGeneratingRelated && (
                                <div className="h-[1px] flex-grow bg-border/30 ml-3" />
                              )}
                            </div>
                          )}

                          {/* Content Area */}
                          <AnimatePresence mode="wait">
                            {isGeneratingRelated ? (
                              <motion.div
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse py-1"
                              >
                                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                                <span>Finding relevant insights...</span>
                              </motion.div>
                            ) : showRelatedQuestions && relatedQuestions.length > 0 && (
                              <motion.div
                                key="questions"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                                className="overflow-hidden"
                              >
                                <div className="flex flex-col gap-2.5 pt-1">
                                  {relatedQuestions.map((q: string, qIndex: number) => (
                                    <motion.button
                                      key={qIndex}
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: qIndex * 0.05 }}
                                      onClick={() => handleSend(q)}
                                      className="text-[11px] bg-secondary/40 hover:bg-secondary/60 text-muted-foreground hover:text-primary border border-border/50 py-2.5 px-4 rounded-2xl transition-all flex items-start gap-3 group text-left w-full sm:w-auto sm:max-w-md shadow-sm hover:shadow-md hover:border-primary/30"
                                    >
                                      <HelpCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 opacity-50 group-hover:opacity-100 text-primary/70" />
                                      <span className="flex-grow leading-relaxed font-medium">{q}</span>
                                      <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all mt-0.5" />
                                    </motion.button>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Quiz Generation / Regeneration Loading State */}
              {isQuizLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-start gap-3 justify-start"
                >
                  <Avatar className="h-8 w-8 border">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Bot className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-secondary/40 backdrop-blur-sm border border-white/5 rounded-2xl rounded-bl-none overflow-hidden p-6 w-full max-w-lg shadow-xl relative mt-2">
                    {/* Animated background pulse */}
                    <div className="absolute inset-0 bg-primary/5 animate-pulse" />

                    <div className="relative z-10 flex flex-col items-center justify-center space-y-4">
                      <div className="relative">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                          className="w-16 h-16 rounded-full border-2 border-dashed border-primary/30"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <BrainCircuit className="w-8 h-8 text-primary animate-pulse" />
                        </div>
                      </div>
                      <div className="text-center space-y-1">
                        <h4 className="text-sm font-black text-white uppercase tracking-widest">Architecting Quiz</h4>
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-1 h-1 bg-primary rounded-full animate-bounce" />
                        </div>
                        <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-tighter pt-2">AI is mapping your progress nodes...</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Loading spinner - shown only for non-streaming operations (quiz generation) */}
              {isLoading && streamingIds.size === 0 && (
                <div className="flex items-center gap-3 justify-start">
                  <Avatar className="h-8 w-8 border">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Bot className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="p-3 rounded-lg bg-secondary/80 rounded-bl-none">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        </ScrollArea>
        <div className="px-4 pb-4">
          {/* Attachment Previews */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              <AnimatePresence>
                {attachments.map((file, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, x: -10 }}
                    className="group relative flex items-center gap-2 p-1.5 pr-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-lg"
                  >
                    <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-primary shadow-inner">
                      {file.type === 'image' ? (
                        <ImageIcon className="w-3.5 h-3.5" />
                      ) : file.type === 'pdf' ? (
                        <FileDigit className="w-3.5 h-3.5" />
                      ) : (
                        <FileText className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-zinc-300 max-w-[80px] truncate leading-none">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-md"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-end gap-2"
          >
            <div className="relative flex-grow group">
              {/* Premium Container with single border look */}
              <div className="relative rounded-2xl bg-zinc-900/60 backdrop-blur-3xl shadow-2xl overflow-hidden transition-all duration-300">
                {/* Subtle top highlight */}
                <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

                <div className="relative">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    multiple
                    className="hidden"
                    accept=".pdf,.txt,image/*"
                  />
                  <Input
                    autoFocus
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isListening ? "Listening..." : "Ask a question..."}
                    disabled={isLoading}
                    className={cn(
                      "bg-transparent border-white/10 focus:border-primary/50 pr-40 min-h-[48px] rounded-2xl transition-all placeholder:text-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0",
                      isListening && "border-primary"
                    )}
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                    {/* Source File Toggle inside Input Bar */}
                    {(sourceFileType === 'pdf' || sourceFileType === 'image') && mindMapData && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              onClick={() => setUsePdfContext(!usePdfContext)}
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "h-8 px-2.5 rounded-full transition-all text-xs font-bold gap-1.5 shadow-none mr-1",
                                usePdfContext
                                  ? "bg-primary/20 text-primary hover:bg-primary/30"
                                  : "text-muted-foreground hover:text-foreground hover:bg-white/10"
                              )}
                            >
                              {sourceFileType === 'pdf' ? (
                                <FileDigit className="w-4 h-4" />
                              ) : (
                                <ImageIcon className="w-4 h-4" />
                              )}
                              <span className="hidden sm:inline">
                                {usePdfContext ? 'Aware' : 'Standard'}
                              </span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            Toggle {sourceFileType === 'pdf' ? 'PDF' : 'Image'} Context
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-8 w-8 rounded-full transition-all text-muted-foreground hover:text-foreground hover:bg-white/10 shadow-none",
                              isProcessingFiles && "animate-pulse"
                            )}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isLoading || isProcessingFiles}
                          >
                            {isProcessingFiles ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Paperclip className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Attach File</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8 rounded-full transition-all shadow-none",
                        isListening ? "text-red-500 animate-pulse bg-red-500/10" : "text-muted-foreground hover:text-foreground hover:bg-white/10"
                      )}
                      onClick={handleVoiceInput}
                      disabled={isLoading}
                    >
                      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <Button
              type="submit"
              disabled={isLoading || (input.trim() === '' && attachments.length === 0)}
              className="h-11 w-11 rounded-2xl shadow-lg transition-all hover:scale-105 active:scale-95 bg-primary text-white flex-shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div >
      </>
    );
  };

  const handlePinChatSend = useCallback(async (messageToSend?: string) => {
    const content = (messageToSend || pinChatInput).trim();
    if (!content || isPinChatLoading || !activeChatPin) return;

    setPinChatInput('');
    const userMsg = { role: 'user' as const, content };
    const updatedMessages = [...pinChatMessages, userMsg];
    setPinChatMessages(updatedMessages);
    setIsPinChatLoading(true);

    // Build history from all messages so far (pinned Q&A is already in pinChatMessages)
    const history: { role: 'user' | 'assistant'; content: string }[] = updatedMessages.map(m => ({
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: m.content,
    }));

    const { response, error } = await chatAction(
      { question: content, topic: activeChatPin.question?.content?.substring(0, 100) || 'Pinned Message', history, persona: 'Teacher' },
      providerOptions
    );

    setIsPinChatLoading(false);
    const aiContent = error ? `Sorry, I encountered an error: ${error}` : response?.answer || 'No response received.';
    setPinChatMessages(prev => [...prev, { role: 'ai', content: aiContent }]);
  }, [pinChatInput, isPinChatLoading, activeChatPin, pinChatMessages, providerOptions]);

  useEffect(() => {
    if (view !== 'pin-chat') return;
    if (!pinChatInitializedRef.current) {
      pinChatInitializedRef.current = true;
      setTimeout(() => pinChatTopRef.current?.scrollIntoView({ behavior: 'auto' }), 30);
    } else {
      pinChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [pinChatMessages, isPinChatLoading, view]);

  const renderPinChatView = () => {
    if (!activeChatPin) return null;
    return (
      <>
        <ScrollArea className="flex-grow px-4">
          <div className="flex flex-col gap-4 py-4">
            <div ref={pinChatTopRef} />
            {/* Pinned origin label */}
            <div className="flex items-center gap-2 px-1">
              <Pin className="h-3 w-3 text-amber-400 fill-amber-400 shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Pinned Conversation</span>
              <div className="flex-1 h-[1px] bg-amber-500/20" />
            </div>

            {/* All messages (pinned Q&A + follow-ups) using identical markup to renderChatView */}
            <div className="flex flex-col gap-6">
              <AnimatePresence initial={false} mode="popLayout">
                {pinChatMessages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="flex flex-col gap-3"
                  >
                    <div className={cn('flex items-start gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                      {msg.role === 'ai' ? (
                        <Avatar className="h-8 w-8 border">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            <Bot className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="order-2">
                          <Avatar className="h-8 w-8 border shadow-sm">
                            <AvatarFallback className="bg-secondary text-secondary-foreground">
                              <User className="h-5 w-5 text-muted-foreground" />
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      )}
                      <div className={cn(
                        'rounded-3xl max-w-[85%] overflow-hidden transition-all duration-300 break-words overflow-wrap-anywhere',
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-none order-1'
                          : 'bg-secondary/40 backdrop-blur-sm border border-white/5 rounded-bl-none'
                      )}>
                        <div className="p-4">
                          {msg.role === 'ai' ? (
                            <div
                              className="text-sm prose prose-sm max-w-none leading-relaxed prose-invert break-words whitespace-pre-wrap"
                              style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}
                            >
                              <span dangerouslySetInnerHTML={{ __html: formatText(msg.content) }} />
                            </div>
                          ) : (
                            <p className="text-sm leading-relaxed">{msg.content}</p>
                          )}
                        </div>
                        {msg.role === 'ai' && (
                          <div className="flex items-center gap-1 px-3 pb-2 pt-0">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-primary"
                                    onClick={() => {
                                      navigator.clipboard.writeText(msg.content);
                                      toast({ title: 'Copied!', description: 'Response copied to clipboard.' });
                                    }}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Copy</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {isPinChatLoading && (
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8 border shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground"><Bot className="h-5 w-5" /></AvatarFallback>
                </Avatar>
                <div className="bg-secondary/40 border border-white/5 rounded-3xl rounded-bl-none px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={pinChatEndRef} />
          </div>
        </ScrollArea>
        <div className="px-4 pb-4 pt-2 border-t border-white/10">
          <form onSubmit={(e) => { e.preventDefault(); handlePinChatSend(); }} className="flex items-end gap-2">
            <div className="relative flex-grow rounded-2xl bg-zinc-900/60 backdrop-blur-3xl shadow-2xl overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
              <Input
                autoFocus
                value={pinChatInput}
                onChange={(e) => setPinChatInput(e.target.value)}
                placeholder="Ask a follow-up question..."
                disabled={isPinChatLoading}
                className="bg-transparent border-white/10 focus:border-primary/50 min-h-[48px] rounded-2xl focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            <Button
              type="submit"
              disabled={isPinChatLoading || !pinChatInput.trim()}
              className="h-11 w-11 rounded-2xl shadow-lg bg-primary text-white flex-shrink-0"
            >
              {isPinChatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </>
    );
  };

  const PinCard = ({ pin, onUnpinFn }: { pin: import('@/types/chat').PinnedMessage; onUnpinFn?: (id: string) => void }) => {
    const aiContent = pin.response?.content || pin.soloMessage?.content || '';
    const userContent = pin.question?.content || '';
    const isConfirming = unpinConfirmId === pin.id;
    const [copied, setCopied] = useState(false);

    const openPinChat = () => {
      setActiveChatPin(pin);
      setPinChatInput('');
      const initial: { role: 'user' | 'ai'; content: string }[] = [];
      if (userContent) initial.push({ role: 'user', content: userContent });
      if (aiContent) initial.push({ role: 'ai', content: aiContent });
      setPinChatMessages(initial);
      pinChatInitializedRef.current = false;
      setView('pin-chat');
    };

    const handleCopy = () => {
      const textToCopy = aiContent
        ? `Q: ${userContent}\n\nA: ${aiContent}`
        : userContent;
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Copied!', description: 'Copied to clipboard.' });
    };

    return (
      <motion.div
        layout
        className="relative rounded-2xl overflow-hidden border border-white/8 bg-white/[0.03] hover:border-amber-500/20 hover:bg-white/[0.05] transition-all duration-200 group"
      >
        {/* Amber top accent bar */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-amber-500/60 via-amber-400/40 to-transparent" />

        {/* Unpin confirmation overlay */}
        <AnimatePresence>
          {isConfirming && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 z-10 bg-zinc-950/92 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-3 px-5"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
                <PinOff className="h-4 w-4 text-amber-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-white">Remove this pin?</p>
                <p className="text-xs text-zinc-500 mt-0.5">This can't be undone.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost" size="sm"
                  onClick={() => setUnpinConfirmId(null)}
                  className="h-8 px-4 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/8 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  variant="ghost" size="sm"
                  onClick={() => { setUnpinConfirmId(null); onUnpinFn?.(pin.id); }}
                  className="h-8 px-4 text-xs font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded-xl"
                >
                  Unpin
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Question label row */}
        <div className="px-4 pt-3.5 pb-1 flex items-start gap-2">
          <div className="w-4 h-4 rounded-md bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <User className="h-2.5 w-2.5 text-blue-400" />
          </div>
          <p className="text-[11px] font-medium text-zinc-500 leading-snug line-clamp-2 flex-1">
            {userContent || 'Pinned message'}
          </p>
        </div>

        {/* Divider */}
        <div className="mx-4 h-px bg-white/5 my-2" />

        {/* AI response — hero content */}
        <div className="px-4 pb-3">
          <div className="flex items-start gap-2 mb-2.5">
            <div className="w-4 h-4 rounded-md bg-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="h-2.5 w-2.5 text-violet-400" />
            </div>
            <p className="text-sm text-zinc-200 leading-relaxed line-clamp-3 flex-1">
              {aiContent || userContent}
            </p>
          </div>

          {/* Action pill row — always visible */}
          <div className="flex items-center gap-1.5 pt-1">
            <button
              onClick={openPinChat}
              className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-white/5 hover:bg-primary/15 border border-white/8 hover:border-primary/30 text-zinc-500 hover:text-primary transition-all text-[10px] font-bold uppercase tracking-wide"
            >
              <MessageSquare className="h-3 w-3" />
              Chat
            </button>

            {aiContent && (
              <button
                onClick={() => {
                  setCreateMindmapUserMessage(userContent);
                  setCreateMindmapContent(aiContent);
                  setCreateMindmapOpen(true);
                }}
                className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-white/5 hover:bg-violet-500/15 border border-white/8 hover:border-violet-500/30 text-zinc-500 hover:text-violet-400 transition-all text-[10px] font-bold uppercase tracking-wide"
              >
                <Brain className="h-3 w-3" />
                Map
              </button>
            )}

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 text-zinc-500 hover:text-zinc-200 transition-all text-[10px] font-bold uppercase tracking-wide"
            >
              {copied
                ? <Check className="h-3 w-3 text-emerald-400" />
                : <Copy className="h-3 w-3" />
              }
              {copied ? 'Copied' : 'Copy'}
            </button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Unpin — right-aligned, subtle */}
            {onUnpinFn && (
              <button
                onClick={() => setUnpinConfirmId(pin.id)}
                className="flex items-center gap-1 h-7 px-2 rounded-lg text-zinc-700 hover:text-amber-400 hover:bg-amber-500/10 transition-all text-[10px] font-bold"
              >
                <PinOff className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const renderCanvasPinsView = () => (
    <ScrollArea className="flex-grow p-4">
      {canvasPinnedMessages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/8 border border-amber-500/15 flex items-center justify-center">
            <Pin className="h-6 w-6 text-amber-500/40" />
          </div>
          <p className="text-sm font-semibold text-zinc-400">No pins yet</p>
          <p className="text-xs text-zinc-600 text-center max-w-xs leading-relaxed">Pin any AI response from this map's chat — it'll appear here for quick reference.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 px-1 mb-1">
            {canvasPinnedMessages.length} pinned {canvasPinnedMessages.length === 1 ? 'message' : 'messages'}
          </p>
          {canvasPinnedMessages.map(pin => (
            <PinCard key={pin.id} pin={pin} onUnpinFn={onCanvasUnpin} />
          ))}
        </div>
      )}
    </ScrollArea>
  );

  const renderPinsView = () => {
    const handleUnpinFromAll = async (pinId: string) => {
      // Optimistically remove from local state
      setAllUserPins(prev => prev.filter(p => p.id !== pinId));

      // Find and update the Supabase record that owns this pin
      if (user) {
        try {
          const { data: mapsData } = await supabase
            .from('mindmaps')
            .select('id, pinned_messages')
            .eq('user_id', user.uid);
          
          for (const map of mapsData || []) {
            if (Array.isArray(map.pinned_messages) && map.pinned_messages.some((p: any) => p.id === pinId)) {
              const updated = map.pinned_messages.filter((p: any) => p.id !== pinId);
              await supabase
                .from('mindmaps')
                .update({ pinned_messages: updated })
                .eq('id', map.id);
              break;
            }
          }
        } catch (e) {
          console.error('Failed to unpin from all maps:', e);
          toast({ variant: 'destructive', title: 'Unpin failed', description: 'Could not remove the pin.' });
        }
      }

      onAllPinsUnpin?.(pinId);
    };

    return (
      <ScrollArea className="flex-grow p-4">
        {isLoadingPins ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : allUserPins.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center">
              <Pin className="h-6 w-6 text-zinc-600" />
            </div>
            <p className="text-sm font-semibold text-zinc-400">No Pinned Messages</p>
            <p className="text-xs text-zinc-600 text-center max-w-xs">Pin messages from any mind map chat to see them here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 px-1 mb-1">
              {allUserPins.length} pinned {allUserPins.length === 1 ? 'message' : 'messages'} across all maps
            </p>
            {allUserPins.map(pin => (
              <PinCard key={pin.id} pin={pin} onUnpinFn={handleUnpinFromAll} />
            ))}
          </div>
        )}
      </ScrollArea>
    );
  };

  const renderHistoryView = () => {
    const filteredSessions = sessions.filter((s: ChatSession) => s.title !== 'General Conversation');

    return (
      <ScrollArea className="flex-grow p-4">
        <div className="flex flex-col gap-3">
          {filteredSessions.length > 0 ? (
            filteredSessions.map(session => (
              <div
                key={session.id}
                onClick={() => selectSession(session.id)}
                className="relative group p-4 rounded-lg bg-white/5 border border-white/10 backdrop-blur-lg hover:border-purple-400/30 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-5 w-5 text-purple-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-grow overflow-hidden">
                    <p className="font-semibold text-white truncate">
                      {session.title || 'Untitled Session'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {session.createdAt ? formatDistanceToNow(toDate(session.createdAt), { addSuffix: true }) : 'Just now'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100"
                  onClick={(e) => handleDeleteSession(e, session.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))
          ) : (
            <div className="text-center text-muted-foreground p-8">
              <p>No chat history yet.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    );
  };


  return (
    <>
    <Sheet open={isOpen} onOpenChange={(open) => {
      if (!open) {
        setSavedView(view);
        setLastView(view);
      }
      onClose();
    }}>
      <SheetContent
        className="flex flex-col p-0 glassmorphism [&>button]:hidden transition-none"
        style={{ width: `${panelWidth}px`, maxWidth: 'none', minWidth: 'auto' }}
        aria-describedby={undefined}
      >
        {/* Resize Handle - Modern Subtle Design */}
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 w-4 cursor-ew-resize z-[250] group flex items-center justify-center",
            "transition-all duration-200",
            isResizing && "bg-primary/10"
          )}
          onMouseDown={handleResizeStart}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize chat panel"
        >
          {/* Subtle grip dots */}
          <div className={cn(
            "flex flex-col gap-1 transition-opacity duration-200",
            isResizing ? "opacity-100" : "opacity-0 group-hover:opacity-60"
          )}>
            <div className="w-0.5 h-0.5 rounded-full bg-primary/40" />
            <div className="w-0.5 h-0.5 rounded-full bg-primary/40" />
            <div className="w-0.5 h-0.5 rounded-full bg-primary/40" />
            <div className="w-0.5 h-0.5 rounded-full bg-primary/40" />
            <div className="w-0.5 h-0.5 rounded-full bg-primary/40" />
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 border-b">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            {(view === 'history' || view === 'pin-chat') && (
              <Button variant="ghost" size="icon" onClick={() => {
                if (view === 'pin-chat') setView('pins');
                else setView('chat');
              }} className="flex-shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            {(view === 'canvas-pins' || view === 'pins') && (
              <Button variant="ghost" size="icon" onClick={() => setView('chat')} className="flex-shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div className="min-w-0 flex-1 flex items-center gap-2">
              {/* Pin view tab switcher */}
              {(view === 'canvas-pins' || view === 'pins') ? (
                <>
                  <SheetTitle className="sr-only">Pinned Messages</SheetTitle>
                  <SheetDescription className="sr-only">Pinned messages panel</SheetDescription>
                  <div className="flex items-center bg-white/5 rounded-xl p-0.5 border border-white/8 gap-0.5">
                  <button
                    onClick={() => setView('canvas-pins')}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all',
                      view === 'canvas-pins'
                        ? 'bg-amber-500/20 text-amber-300 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-300'
                    )}
                  >
                    <Pin className="h-3 w-3" />
                    This Map
                    {canvasPinnedMessages.length > 0 && (
                      <span className={cn(
                        'text-[9px] font-black px-1.5 py-0.5 rounded-full',
                        view === 'canvas-pins' ? 'bg-amber-500/30 text-amber-300' : 'bg-white/10 text-zinc-500'
                      )}>
                        {canvasPinnedMessages.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => { setView('pins'); loadAllUserPins(); }}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all',
                      view === 'pins'
                        ? 'bg-amber-500/20 text-amber-300 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-300'
                    )}
                  >
                    <Pin className="h-3 w-3" />
                    All Pins
                    {allUserPins.length > 0 && (
                      <span className={cn(
                        'text-[9px] font-black px-1.5 py-0.5 rounded-full',
                        view === 'pins' ? 'bg-amber-500/30 text-amber-300' : 'bg-white/10 text-zinc-500'
                      )}>
                        {allUserPins.length}
                      </span>
                    )}
                  </button>
                </div>
                </>
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex flex-col min-w-0">
                        <SheetTitle className="text-sm sm:text-base font-bold truncate cursor-help flex items-center gap-2">
                          {view === 'history' ? 'Chat History' : view === 'pin-chat' ? (activeChatPin?.question?.content?.substring(0, 40) || 'Pinned Chat') : activeSession?.title ?? 'AI Chat'}
                          {isSyncing && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="flex items-center gap-1 text-[10px] font-medium text-primary animate-pulse"
                            >
                              <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                              <span>Syncing</span>
                            </motion.div>
                          )}
                        </SheetTitle>
                        <SheetDescription className="sr-only">
                          Assistant for {topic}
                        </SheetDescription>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="start" className="max-w-[300px]">
                      <p className="text-xs break-words">
                        {view === 'history' ? 'Chat History' : activeSession?.title ?? 'AI Chat'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Source File Icon & Toggle in Header */}
              {view === 'chat' && sourceFileContent && (
                <div className="flex items-center gap-1.5 ml-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onUsePdfContextChange?.(!usePdfContext)}
                        className={cn(
                          "h-8 w-8 rounded-lg transition-all",
                          usePdfContext
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "text-zinc-500 hover:text-zinc-400 bg-white/5 border border-white/10"
                        )}
                      >
                        {sourceFileType === 'image' ? (
                          <ImageIcon className={cn("h-4 w-4", usePdfContext && "animate-pulse")} />
                        ) : (
                          <FileText className={cn("h-4 w-4", usePdfContext && "animate-pulse")} />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="glassmorphism">
                      <p>{usePdfContext ? 'File Aware: ON' : 'File Aware: OFF'}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}
            </div>
          </div>
          <div className='flex items-center gap-1 flex-shrink-0'>
            {view === 'chat' && (
              <>
                {/* Persona Selector */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" className={personas.find(p => p.id === persona)?.color}>
                      {(() => {
                        const p = personas.find(p => p.id === persona);
                        const Icon = p?.icon || Sparkles;
                        return <Icon className="h-5 w-5" />;
                      })()}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[300px] p-2 glassmorphism border-white/10 z-[200]">
                    <div className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">AI Persona</div>
                    {personas.map((p) => (
                      <DropdownMenuItem
                        key={p.id}
                        onClick={() => setPersona(p.id)}
                        className={cn(
                          "flex flex-col items-start gap-1.5 p-3 cursor-pointer w-full rounded-xl transition-all mb-1 last:mb-0 border",
                          persona === p.id
                            ? "bg-primary/10 border-primary/50 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                            : "border-transparent hover:bg-white/5 focus:bg-white/5"
                        )}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <p.icon className={cn("h-4 w-4", p.color)} />
                          <span className="font-bold text-[13px]">{p.label}</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 whitespace-normal leading-relaxed text-left">
                          {p.description}
                        </p>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* PDF Export Button */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={exportChatToPDF}
                        disabled={!activeSession || messages.length === 0}
                      >
                        <Download className="h-5 w-5" />
                        <span className="sr-only">Export to PDF</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Export to PDF</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Clear Chat Button */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (activeSessionId) {
                            updateSession(activeSessionId, { messages: [] });
                            setRelatedQuestions([]);
                            toast({ title: 'Chat cleared', description: 'Messages have been cleared.' });
                          }
                        }}
                        disabled={!activeSession || messages.length === 0}
                      >
                        <Eraser className="h-5 w-5" />
                        <span className="sr-only">Clear Chat</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Clear Chat</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setView('canvas-pins');
                          loadAllUserPins();
                        }}
                        className={cn('relative', (view === 'pins' || view === 'canvas-pins') && 'text-amber-400')}
                      >
                        <Pin className="h-5 w-5" />
                        {canvasPinnedMessages.length > 0 && (
                          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white">
                            {canvasPinnedMessages.length}
                          </span>
                        )}
                        <span className="sr-only">Pinned Messages</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom"><p>Pinned Messages</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Button type="button" variant="ghost" size="icon" onClick={() => setView('history')}>
                  <History className="h-5 w-5" />
                  <span className="sr-only">Chat History</span>
                </Button>

                <Button type="button" variant="ghost" size="icon" onClick={() => startNewChat(topic)}>
                  <Plus className="h-5 w-5" />
                  <span className="sr-only">New Chat</span>
                </Button>
              </>
            )}
            <SheetClose asChild>
              <Button type="button" variant="ghost" size="icon">
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </Button>
            </SheetClose>
          </div>
        </div>

        {view === 'chat' ? renderChatView() : view === 'history' ? renderHistoryView() : view === 'pins' ? renderPinsView() : view === 'canvas-pins' ? renderCanvasPinsView() : renderPinChatView()}

        </SheetContent>
      </Sheet>

      <CreateMindmapDialog
        open={createMindmapOpen}
        onOpenChange={setCreateMindmapOpen}
        content={createMindmapContent}
        userMessage={createMindmapUserMessage}
        onMindmapCreated={(mapData) => {
          if (onMindMapGenerated) {
            onMindMapGenerated(mapData);
          }
        }}
      />
    </>
  );
}
