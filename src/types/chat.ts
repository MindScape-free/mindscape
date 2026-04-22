import { Quiz, QuizResult } from '@/ai/schemas/quiz-schema';
import { isValid } from 'date-fns';

export interface ChatAttachment {
  name: string;
  type: 'text' | 'pdf' | 'image';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  type: 'text' | 'quiz' | 'quiz-result' | 'quiz-selector' | 'file';
  timestamp: string | number | Date;
  quiz?: Quiz;
  quizResult?: QuizResult;
  attachments?: ChatAttachment[];
  isPinned?: boolean;
}

export interface PinnedMessageContent {
  messageId: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: string | number | Date;
}

export interface PinnedMessage {
  id: string;
  sessionId: string;
  createdAt: number;
  question?: PinnedMessageContent;
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
  createdAt: string | number | Date;
  updatedAt: string | number | Date;
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
}

/**
 * Robust conversion of dates/timestamps to a JS Date.
 * Ensures a valid Date object is ALWAYS returned.
 */
export function toDate(val: any): Date {
  let date: Date;

  if (!val) {
    date = new Date();
  } else if (val instanceof Date) {
    date = val;
  } else if (typeof val === 'number') {
    date = new Date(val);
  } else if (typeof val === 'string') {
    date = new Date(val);
  } else {
    date = new Date(val);
  }

  // Final validation
  if (!isValid(date)) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Invalid date encountered in toDate utility:', val);
    }
    return new Date(); // Fallback to current time
  }

  return date;
}
