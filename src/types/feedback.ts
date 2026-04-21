import { z } from 'zod';
import { FeedbackSchema } from '@/ai/schemas/feedback-schema';

export type FeedbackType = "BUG" | "SUGGESTION" | "IMPROVEMENT" | "FEATURE";
export type FeedbackPriority = "LOW" | "MEDIUM" | "HIGH";
export type FeedbackStatus = "OPEN" | "IN_REVIEW" | "RESOLVED" | "REJECTED";

export interface Feedback extends Omit<z.infer<typeof FeedbackSchema>, 'createdAt' | 'updatedAt'> {
  id: string;
  trackingId?: string;
  createdAt: any; // Firestore any
  updatedAt: any; // Firestore any
}

export function getTrackingIdPrefix(type: FeedbackType): string {
  switch (type) {
    case 'BUG': return 'B';
    case 'SUGGESTION': return 'S';
    case 'IMPROVEMENT': return 'I';
    case 'FEATURE': return 'F';
    default: return 'S';
  }
}

export function formatDateForTrackingId(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}${month}${year}`;
}

export function formatSeriesNumber(num: number): string {
  return String(num).padStart(5, '0');
}
