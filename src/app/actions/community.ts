
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
            return { success: false, error: 'Firebase Admin not configured. Cannot perform server-side removal.' };
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
        const { isUserAdmin } = await import('@/lib/admin-helpers');
        const isAdmin = await isUserAdmin(userId);

        if (!isAuthor && !isAdmin) {
            return {
                success: false,
                error: 'Unauthorized: Only the original author or admin can remove this map'
            };
        }

        // Delete from publicMindmaps collection
        await publicMapRef.delete();

        // Log activity for removing from community
        try {
            const { initializeFirebaseServer } = await import('@/firebase/server');
            const { firestore: fs } = initializeFirebaseServer();
            if (fs) {
                await fs.collection('adminActivityLog').add({
                    type: 'MAP_REMOVED',
                    targetId: mapId,
                    targetType: 'mindmap',
                    details: `Map "${mapData.topic || 'Untitled'}" removed from community`,
                    performedBy: userId,
                    timestamp: new Date().toISOString(),
                    metadata: {
                        topic: mapData.topic,
                        authorId: mapData.originalAuthorId
                    }
                });
            }
        } catch (logError) {
            console.warn('Failed to log MAP_REMOVED activity:', logError);
        }

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
 * Server action to publish a mind map to the community.
 * Handles admin overrides to bypass client-side security rules.
 */
export async function publishMindMapAction(
    mapId: string,
    publicData: any,
    userId: string
): Promise<{ success: boolean; error: string | null }> {
    try {
        if (!userId) {
            return { success: false, error: 'User must be authenticated' };
        }

        if (!mapId || !publicData) {
            return { success: false, error: 'Map ID and data are required' };
        }

        const { initializeFirebaseServer } = await import('@/firebase/server');
        const { firestore } = initializeFirebaseServer();

        if (!firestore) {
            return { 
                success: false, 
                error: 'Firebase Admin not initialized. To publish locally, please add a service-account.json or set the FIREBASE_SERVICE_ACCOUNT_JSON env var.' 
            };
        }

        // Authorization check
        const targetAuthorId = publicData.originalAuthorId || publicData.userId || publicData.uid;
        const isAuthor = targetAuthorId === userId;
        const { isUserAdmin } = await import('@/lib/admin-helpers');
        const isAdmin = await isUserAdmin(userId);

        if (!isAuthor && !isAdmin) {
            return {
                success: false,
                error: 'Unauthorized: Only the original author or admin can publish this map'
            };
        }

        // 1. Update the original private map status
        if (targetAuthorId) {
            try {
                const userMapRef = firestore
                    .collection('users')
                    .doc(targetAuthorId)
                    .collection('mindmaps')
                    .doc(mapId);
                
                await userMapRef.update({
                    isPublic: true,
                    publicCategories: publicData.publicCategories || [],
                    updatedAt: Date.now()
                });
            } catch (err) {
                console.warn('⚠️ Could not update original map status (might be missing or restricted):', err);
                // Continue if we have admin rights, as the public entry is more important
                if (!isAdmin) throw err;
            }
        }

        // 2. Save to publicMindmaps
        const publicMapRef = firestore.collection('publicMindmaps').doc(mapId);
        
        // Ensure the public data is a plain object and has timestamps
        const finalPublicData = {
            ...publicData,
            isPublic: true,
            updatedAt: Date.now(),
            publishedAt: Date.now()
        };

        await publicMapRef.set(finalPublicData, { merge: true });

        // Log activity for publishing to community
        try {
            const { initializeFirebaseServer } = await import('@/firebase/server');
            const { firestore: fs } = initializeFirebaseServer();
            if (fs) {
                await fs.collection('adminActivityLog').add({
                    type: 'MAP_PUBLISHED',
                    targetId: mapId,
                    targetType: 'mindmap',
                    details: `Map "${publicData.topic || 'Untitled'}" published to community`,
                    performedBy: userId,
                    timestamp: new Date().toISOString(),
                    metadata: {
                        topic: publicData.topic,
                        authorId: targetAuthorId
                    }
                });
            }
        } catch (logError) {
            console.warn('Failed to log MAP_PUBLISHED activity:', logError);
        }

        return { success: true, error: null };
    } catch (error: any) {
        console.error('Error publishing map to community:', error);
        return {
            success: false,
            error: error.message || 'Failed to publish map to community'
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

    const { isUserAdmin } = await import('@/lib/admin-helpers');
    const isAdmin = await isUserAdmin(userId);
    return { isAdmin };
}

