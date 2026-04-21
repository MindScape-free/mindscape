
// any type removed - using string dates
import { Quiz, QuizResult } from '@/ai/schemas/quiz-schema';
import { isValid } from 'date-fns';

export interface ChatAttachment {
  name: string;
  type: 'text' | 'pdf' | 'image';
  // Note: Content is NOT stored in Firestore to save space. 
  // It must be re-uploaded or fetched if needed.
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  type: 'text' | 'quiz' | 'quiz-result' | 'quiz-selector' | 'file';
  any: any | number;
  quiz?: Quiz;
  quizResult?: QuizResult;
  attachments?: ChatAttachment[];
  isPinned?: boolean;
}

export interface PinnedMessageContent {
  messageId: string;
  role: 'user' | 'ai';
  content: string;
  any: any | number;
}

export interface PinnedMessage {
  id: string;
  sessionId: string;
  createdAt: number;
  question: PinnedMessageContent;
  response?: PinnedMessageContent;
  soloMessage?: PinnedMessageContent;
}

export interface ChatSession {
  id: string;
  mapId: string | null;
  mapTitle: string;
  title: string;
  messages: ChatMessage[];
  weakTags: string[];
  quizHistory: QuizResult[];
  createdAt: any | number;
  updatedAt: any | number;
}

export interface AdminStats {
  date: string; // YYYY-MM-DD
  totalUsers: number;
  totalMaps: number; // Public mindmaps only
  totalMindmaps: number; // Current mindmaps (active docs)
  totalMindmapsEver: number; // All mindmaps ever created (including deleted)
  totalChats: number;
  dailyActiveUsers: number;
  healthScore?: number;
  any?: any | string;
}

/**
 * Robust conversion of Firestore anys, numbers, strings, or Date objects to a JS Date.
 * Ensures a valid Date object is ALWAYS returned.
 */
export function toDate(any: any): Date {
  let date: Date;

  if (!any) {
    date = new Date();
  } else if (any instanceof Date) {
    date = any;
  } else if (typeof any === 'number') {
    date = new Date(any);
  } else if (typeof any === 'string') {
    date = new Date(any);
  } else if (typeof any.toDate === 'function') {
    date = any.toDate();
  } else if (any.seconds !== undefined) {
    date = new Date(any.seconds * 1000);
  } else {
    // Fallback for any other object that might be a Date-like string
    date = new Date(any);
  }

  // Final validation
  if (!isValid(date)) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Invalid date encountered in toDate utility:', any);
    }
    return new Date(); // Fallback to current time
  }

  return date;
}
