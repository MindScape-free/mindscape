
import { Timestamp } from 'firebase/firestore';
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
  timestamp: Timestamp | number;
  quiz?: Quiz;
  quizResult?: QuizResult;
  attachments?: ChatAttachment[];
  isPinned?: boolean;
}

export interface ChatSession {
  id: string;
  mapId: string | null;
  mapTitle: string;
  title: string;
  messages: ChatMessage[];
  weakTags: string[];
  quizHistory: QuizResult[];
  createdAt: Timestamp | number;
  updatedAt: Timestamp | number;
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
  timestamp?: Timestamp | string;
}

/**
 * Robust conversion of Firestore Timestamps, numbers, strings, or Date objects to a JS Date.
 * Ensures a valid Date object is ALWAYS returned.
 */
export function toDate(timestamp: any): Date {
  let date: Date;

  if (!timestamp) {
    date = new Date();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp === 'number') {
    date = new Date(timestamp);
  } else if (typeof timestamp === 'string') {
    date = new Date(timestamp);
  } else if (typeof timestamp.toDate === 'function') {
    date = timestamp.toDate();
  } else if (timestamp.seconds !== undefined) {
    date = new Date(timestamp.seconds * 1000);
  } else {
    // Fallback for any other object that might be a Date-like string
    date = new Date(timestamp);
  }

  // Final validation
  if (!isValid(date)) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Invalid date encountered in toDate utility:', timestamp);
    }
    return new Date(); // Fallback to current time
  }

  return date;
}
