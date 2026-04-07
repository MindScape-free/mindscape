'use server';

import { FeedbackSchema, FeedbackInput } from '@/ai/schemas/feedback-schema';
import { initializeFirebaseServer } from '@/firebase/server';
import { v4 as uuidv4 } from 'uuid';
import { revalidatePath } from 'next/cache';
import { AdminActivityLogEntry } from '@/lib/admin-utils';
import { getTrackingIdPrefix, formatDateForTrackingId, formatSeriesNumber, FeedbackType } from '@/types/feedback';

/**
 * Generate a unique tracking ID for feedback.
 * Format: {Prefix}-{ddmmyyyy}-{00001}
 * B = Bug, S = Suggestion, I = Improvement, F = Feature
 */
async function generateTrackingId(
  firestore: any, 
  type: FeedbackType
): Promise<string> {
  const now = new Date();
  const prefix = getTrackingIdPrefix(type);
  const dateStr = formatDateForTrackingId(now);
  const counterId = `${prefix}-${dateStr}`;
  
  // Get or create counter document
  const counterRef = firestore.collection('feedbackCounters').doc(counterId);
  const counterDoc = await counterRef.get();
  
  let seriesNumber = 1;
  if (counterDoc.exists) {
    seriesNumber = (counterDoc.data().lastNumber || 0) + 1;
  }
  
  // Update counter
  await counterRef.set({
    lastNumber: seriesNumber,
    lastUpdated: now,
  }, { merge: true });
  
  return `${prefix}-${dateStr}-${formatSeriesNumber(seriesNumber)}`;
}

/**
 * Submit user feedback to Firestore.
 */
export async function submitFeedbackAction(input: FeedbackInput) {
    try {
        const validated = FeedbackSchema.parse(input);
        const { firestore } = initializeFirebaseServer();
        if (!firestore) throw new Error('Firestore initialization failed');

        const feedbackId = uuidv4();
        const now = new Date();
        
        // Generate tracking ID
        const trackingId = await generateTrackingId(firestore, validated.type as FeedbackType);

        const feedbackData = {
            ...validated,
            id: feedbackId,
            trackingId,
            status: 'OPEN',
            createdAt: now,
            updatedAt: now,
            upvotes: 0,
        };

        await firestore.collection('feedback').doc(feedbackId).set(feedbackData);

        return { success: true, id: feedbackId, trackingId };
    } catch (error: any) {
        console.error('Error submitting feedback:', error);
        return { success: false, error: error.message || 'Failed to submit feedback' };
    }
}

/**
 * Get all feedback for Admin.
 */
export async function getFeedbackAction(filters?: { type?: string, status?: string, priority?: string }) {
    try {
        const { firestore } = initializeFirebaseServer();
        if (!firestore) throw new Error('Firestore initialization failed');

        let query: any = firestore.collection('feedback').orderBy('createdAt', 'desc');

        if (filters?.type && filters.type !== 'all') {
            query = query.where('type', '==', filters.type);
        }
        if (filters?.status && filters.status !== 'all') {
            query = query.where('status', '==', filters.status);
        }
        if (filters?.priority && filters.priority !== 'all') {
            query = query.where('priority', '==', filters.priority);
        }

        const snapshot = await query.get();
        console.log(`[getFeedbackAction] Found ${snapshot.size} feedback documents`);
        
        const feedback = snapshot.docs.map((doc: any) => {
            const data = doc.data();
            let createdAt = data.createdAt;
            let updatedAt = data.updatedAt;
            
            if (createdAt && createdAt.toDate) {
                createdAt = createdAt.toDate().toISOString();
            } else if (createdAt instanceof Date) {
                createdAt = createdAt.toISOString();
            } else if (typeof createdAt === 'string') {
                // already a string, keep it
            } else {
                createdAt = new Date().toISOString();
            }
            
            if (updatedAt && updatedAt.toDate) {
                updatedAt = updatedAt.toDate().toISOString();
            } else if (updatedAt instanceof Date) {
                updatedAt = updatedAt.toISOString();
            } else if (typeof updatedAt === 'string') {
                // already a string, keep it
            } else {
                updatedAt = createdAt;
            }
            
            return {
                id: doc.id,
                ...data,
                createdAt,
                updatedAt,
            };
        });

        return { success: true, data: feedback };
    } catch (error: any) {
        console.error('Error getting feedback:', error);
        return { success: false, error: error.message || 'Failed to get feedback' };
    }
}

/**
 * Update feedback status or admin notes.
 */
export async function updateFeedbackAction(
    feedbackId: string, 
    updates: { status?: string, adminNotes?: string },
    adminUserId: string
) {
    try {
        const { firestore } = initializeFirebaseServer();
        if (!firestore) throw new Error('Firestore initialization failed');

        const ref = firestore.collection('feedback').doc(feedbackId);
        const now = new Date();

        await ref.update({
            ...updates,
            updatedAt: now
        });

        // Log this action in admin activity logs if possible
        // (Assuming useAdminActivityLog's logic can be used or mimicked here)
        
        revalidatePath('/admin');
        return { success: true };
    } catch (error: any) {
        console.error('Error updating feedback:', error);
        return { success: false, error: error.message || 'Failed to update feedback' };
    }
}
