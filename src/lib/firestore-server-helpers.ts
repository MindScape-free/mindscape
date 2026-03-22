import { initializeFirebaseServer } from '@/firebase/server';

export interface UserImageSettings {
    pollinationsApiKey?: string;
    preferredModel?: string;
    apiKeyCreatedAt?: number;
    apiKeyLastUsed?: number;
}

/**
 * Get user's image generation settings using Firebase Admin SDK.
 * Bypasses permission checks.
 */
export async function getUserImageSettingsAdmin(userId: string): Promise<UserImageSettings | null> {
    try {
        // Safety check for local development without credentials
        if (process.env.NODE_ENV !== 'production' && 
            !process.env.FIREBASE_SERVICE_ACCOUNT_JSON && 
            !require('fs').existsSync(require('path').join(process.cwd(), 'service-account.json'))) {
            // console.warn('⚠️ getUserImageSettingsAdmin: Skipping Firestore Admin lookup - no credentials found locally');
            return null;
        }

        const { firestore } = initializeFirebaseServer();
        if (!firestore) return null;

        // Try new location first: /users/{userId}/settings/imageGeneration
        const settingsDoc = await firestore
            .collection('users')
            .doc(userId)
            .collection('settings')
            .doc('imageGeneration')
            .get();

        if (settingsDoc.exists) {
            return settingsDoc.data() as UserImageSettings;
        }

        // Fallback to old location: /users/{userId} (apiSettings field)
        const userDoc = await firestore.collection('users').doc(userId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData?.apiSettings?.pollinationsApiKey || userData?.apiSettings?.pollinationsModel) {
                return {
                    pollinationsApiKey: userData?.apiSettings?.pollinationsApiKey || '',
                    preferredModel: (userData?.apiSettings?.pollinationsModel === 'flux-pro' ? 'klein-large' : userData?.apiSettings?.pollinationsModel) || 'flux',
                    apiKeyCreatedAt: Date.now(),
                    apiKeyLastUsed: Date.now()
                };
            }
        }

        return null;
    } catch (error) {
        console.error('Error in getUserImageSettingsAdmin:', error);
        return null;
    }
}

/**
 * Get a mind map document by ID using Firebase Admin SDK.
 * Bypasses permission checks.
 */
export async function getMindMapAdmin(mapId: string): Promise<any | null> {
    try {
        // Safety check for local development without credentials
        const saPath = require('path').join(process.cwd(), 'service-account.json');
        if (process.env.NODE_ENV !== 'production' && 
            !process.env.FIREBASE_SERVICE_ACCOUNT_JSON && 
            !require('fs').existsSync(saPath)) {
            // console.warn('⚠️ getMindMapAdmin: Skipping Firestore Admin lookup - no credentials found locally');
            return null;
        }

        const { firestore } = initializeFirebaseServer();
        if (!firestore) return null;
        const mapDoc = await firestore.collection('mindMaps').doc(mapId).get();

        if (mapDoc.exists) {
            return mapDoc.data();
        }
        return null;
    } catch (error) {
        console.error('Error in getMindMapAdmin:', error);
        return null;
    }
}

