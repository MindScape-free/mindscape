import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

/**
 * User settings for image generation
 */
export interface UserImageSettings {
    pollinationsApiKey?: string;
    preferredModel?: string;
    apiKeyCreatedAt?: number;
    apiKeyLastUsed?: number;
}

/**
 * Get user's Pollinations API key from Firestore
 */
export async function getUserApiKey(firestore: Firestore, userId: string): Promise<string | null> {
    try {
        const settingsRef = doc(firestore, 'users', userId, 'settings', 'imageGeneration');
        const settingsSnap = await getDoc(settingsRef);

        if (!settingsSnap.exists()) {
            return null;
        }

        const data = settingsSnap.data() as UserImageSettings;

        // Update last used timestamp
        if (data.pollinationsApiKey) {
            await updateDoc(settingsRef, {
                apiKeyLastUsed: Date.now()
            });
        }

        return data.pollinationsApiKey || null;
    } catch (error) {
        console.error('Error getting user API key:', error);
        return null;
    }
}

/**
 * Save user's Pollinations API key to Firestore
 */
export async function saveUserApiKey(
    firestore: Firestore,
    userId: string,
    apiKey: string,
    preferredModel?: string
): Promise<void> {
    try {
        const settingsRef = doc(firestore, 'users', userId, 'settings', 'imageGeneration');
        const userRef = doc(firestore, 'users', userId);

        const settings: UserImageSettings = {
            pollinationsApiKey: apiKey,
            preferredModel: preferredModel || 'flux',
            apiKeyCreatedAt: Date.now(),
            apiKeyLastUsed: Date.now()
        };

        // Save to new location
        await setDoc(settingsRef, settings, { merge: true });

        // Also sync to top-level doc for immediate profile state update
        await setDoc(userRef, {
            apiSettings: {
                pollinationsApiKey: apiKey,
                pollinationsModel: preferredModel || 'flux',
                provider: 'pollinations'
            }
        }, { merge: true });

    } catch (error) {
        console.error('Error saving user API key:', error);
        throw error;
    }
}

/**
 * Get user's image generation settings
 * Checks both new location (/settings/imageGeneration) and old location (/apiSettings)
 */
export async function getUserImageSettings(firestore: Firestore, userId: string): Promise<UserImageSettings | null> {
    try {
        // Try new location first
        const settingsRef = doc(firestore, 'users', userId, 'settings', 'imageGeneration');
        const settingsSnap = await getDoc(settingsRef);

        if (settingsSnap.exists()) {
            return settingsSnap.data() as UserImageSettings;
        }

        // Fallback to old location (profile page apiSettings)
        const userRef = doc(firestore, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const userData = userSnap.data();
            if (userData.apiSettings?.pollinationsApiKey || userData.apiSettings?.pollinationsModel) {
                console.log('✅ Found image settings in old location (apiSettings), using it');
                return {
                    pollinationsApiKey: userData.apiSettings.pollinationsApiKey || '',
                    preferredModel: (userData.apiSettings.pollinationsModel === 'flux-pro' ? 'klein-large' : userData.apiSettings.pollinationsModel) || 'flux',
                    apiKeyCreatedAt: Date.now(),
                    apiKeyLastUsed: Date.now()
                };
            }
        }

        return null;
    } catch (error) {
        console.error('Error getting user settings:', error);
        return null;
    }
}

/**
 * Delete user's API key
 */
export async function deleteUserApiKey(firestore: Firestore, userId: string): Promise<void> {
    try {
        const settingsRef = doc(firestore, 'users', userId, 'settings', 'imageGeneration');
        await updateDoc(settingsRef, {
            pollinationsApiKey: null,
            apiKeyLastUsed: null
        });
    } catch (error) {
        console.error('Error deleting user API key:', error);
        throw error;
    }
}
