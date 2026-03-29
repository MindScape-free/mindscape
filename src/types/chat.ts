
import { Timestamp } from 'firebase/firestore';
import { Quiz, QuizResult } from '@/ai/schemas/quiz-schema';

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
  totalMindmaps: number; // All mindmaps from all users
  totalChats: number;
  dailyActiveUsers: number;
  timestamp?: Timestamp | string;
}

/**
 * Robust conversion of Firestore Timestamps, numbers, strings, or Date objects to a JS Date.
 */
export function toDate(timestamp: any): Date {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp === 'number') return new Date(timestamp);
  if (typeof timestamp === 'string') return new Date(timestamp);
  if (typeof timestamp.toDate === 'function') return timestamp.toDate();
  if (timestamp.seconds !== undefined) return new Date(timestamp.seconds * 1000);
  
  // Fallback for any other object that might be a Date-like string
  return new Date(timestamp);
}
