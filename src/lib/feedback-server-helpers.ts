import { initializeFirebaseServer } from '@/firebase/server';
import type { Feedback } from '@/types/feedback';

/**
 * Get all feedback using Firebase Admin SDK.
 */
export async function getAllFeedbackAdmin(
    limit: number = 50,
    orderByField: string = 'createdAt',
    orderDirection: 'desc' | 'asc' = 'desc'
): Promise<Feedback[]> {
    try {
        const { firestore } = initializeFirebaseServer();
        if (!firestore) return [];

        const snapshot = await firestore
            .collection('feedback')
            .orderBy(orderByField, orderDirection)
            .limit(limit)
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Feedback[];
    } catch (error) {
        console.error('Error in getAllFeedbackAdmin:', error);
        return [];
    }
}

/**
 * Get specific feedback by ID.
 */
export async function getFeedbackByIdAdmin(feedbackId: string): Promise<Feedback | null> {
    try {
        const { firestore } = initializeFirebaseServer();
        if (!firestore) return null;

        const doc = await firestore.collection('feedback').doc(feedbackId).get();
        if (doc.exists) {
            return { id: doc.id, ...doc.data() } as Feedback;
        }
        return null;
    } catch (error) {
        console.error('Error in getFeedbackByIdAdmin:', error);
        return null;
    }
}
