
'use server';

import { categorizeMindMap } from '@/ai/flows/categorize-mind-map';
import { AIProvider } from '@/ai/client-dispatcher';
import { MindMapWithId } from '@/types/mind-map';

import { suggestRelatedTopics } from '@/ai/flows/suggest-related-topics';

import { resolveApiKey } from '@/app/actions';

export async function categorizeMindMapAction(
    input: { topic: string; summary?: string },
    options: { provider?: AIProvider; apiKey?: string; userId?: string } = {}
) {
    try {
        const effectiveApiKey = await resolveApiKey(options);
        const result = await categorizeMindMap({
            topic: input.topic,
            summary: input.summary,
            ...options,
            apiKey: effectiveApiKey
        });
        return { categories: result.categories, error: null };
    } catch (error: any) {
        console.error('Categorization error:', error);
        return { categories: [], error: error.message || 'Failed to categorize mind map.' };
    }
}

export async function suggestRelatedTopicsAction(
    input: { topic: string; summary?: string },
    options: { provider?: AIProvider; apiKey?: string; userId?: string } = {}
) {
    try {
        const effectiveApiKey = await resolveApiKey(options);
        const result = await suggestRelatedTopics({
            topic: input.topic,
            summary: input.summary,
            ...options,
            apiKey: effectiveApiKey
        });

        // If AI fails or returns nothing, provide high-quality fallback topics based on input
        if (!result.topics || result.topics.length === 0) {
            return {
                topics: [
                    `Niche applications of ${input.topic} in modern industry`,
                    `The psychological impact of ${input.topic} on society`,
                    `Interdisciplinary connections: ${input.topic} and emerging tech`,
                    `Controversial debates surrounding ${input.topic} today`
                ].filter(Boolean),
                error: null
            };
        }

        return { topics: result.topics, error: null };
    } catch (error: any) {
        console.error('Suggestion error:', error);
        return {
            topics: [
                `Exploring ${input.topic} further`,
                `Deep dive research: ${input.topic}`,
                `Historical context of ${input.topic}`
            ],
            error: error.message || 'Failed to suggest related topics.'
        };
    }
}

// Note: Publication involves Firestore writes which are better handled on the client
// to use the user's auth token and security rules.
// These actions are helpers for AI-related tasks during publication.

/**
 * Server action to remove a mind map from the community.
 * Only the original author or admin users can remove maps.
 */
export async function removeFromCommunityAction(
    mapId: string,
    userId: string
): Promise<{ success: boolean; error: string | null }> {
    try {
        if (!userId) {
            return { success: false, error: 'User must be authenticated' };
        }

        if (!mapId) {
            return { success: false, error: 'Map ID is required' };
        }

        // Initialize Firebase Admin
        const { initializeFirebaseServer } = await import('@/firebase/server');
        const { firestore } = initializeFirebaseServer();

        if (!firestore) {
            throw new Error('Firestore not initialized');
        }

        // Get the public map document
        const publicMapRef = firestore.collection('publicMindmaps').doc(mapId);
        const publicMapSnap = await publicMapRef.get();

        if (!publicMapSnap.exists) {
            return { success: false, error: 'Map not found in community' };
        }

        const mapData = publicMapSnap.data();
        if (!mapData) {
            return { success: false, error: 'Map data is empty' };
        }

        // Authorization check
        const isAuthor = mapData.originalAuthorId === userId;
        const adminIds = process.env.ADMIN_USER_IDS?.split(',').map(id => id.trim()) || [];
        const isAdmin = adminIds.includes(userId);

        if (!isAuthor && !isAdmin) {
            return {
                success: false,
                error: 'Unauthorized: Only the original author or admin can remove this map'
            };
        }

        // Delete from publicMindmaps collection
        await publicMapRef.delete();

        // Update the original map in user's library to set isPublic = false
        // Only if the user is the author (not admin removing someone else's map)
        if (isAuthor && mapData.originalAuthorId) {
            try {
                const userMapRef = firestore
                    .collection('users')
                    .doc(mapData.originalAuthorId)
                    .collection('mindmaps')
                    .doc(mapId);

                const userMapSnap = await userMapRef.get();

                if (userMapSnap.exists) {
                    await userMapRef.update({
                        isPublic: false,
                        updatedAt: Date.now()
                    });
                }
            } catch (error) {
                console.warn('Could not update original map in user library:', error);
                // Don't fail the entire operation if this update fails
            }
        }

        return {
            success: true,
            error: null
        };
    } catch (error: any) {
        console.error('Error removing map from community:', error);
        return {
            success: false,
            error: error.message || 'Failed to remove map from community'
        };
    }
}

/**
 * Check if the current user is an admin
 */
export async function checkIsAdminAction(userId: string): Promise<{ isAdmin: boolean }> {
    if (!userId) {
        return { isAdmin: false };
    }

    const adminIds = process.env.ADMIN_USER_IDS?.split(',').map(id => id.trim()) || [];
    return { isAdmin: adminIds.includes(userId) };
}
