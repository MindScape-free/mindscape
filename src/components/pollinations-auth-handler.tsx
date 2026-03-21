'use client';

import { useEffect, useRef } from 'react';
import { useAIConfig } from '@/contexts/ai-config-context';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';

/**
 * PollinationsAuthHandler component
 * Listen for Pollinations BYOP redirect with api_key in the hash
 */
export function PollinationsAuthHandler() {
    const { updateConfig } = useAIConfig();
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();
    const isProcessing = useRef(false);

    useEffect(() => {
        const handleHash = async () => {
            // Check for hash immediately
            const hash = window.location.hash.slice(1);
            if (!hash || !hash.includes('api_key')) return;

            // Prevent multiple simultaneous processing
            if (isProcessing.current) return;

            const params = new URLSearchParams(hash);
            const apiKey = params.get('api_key');

            if (apiKey && user && firestore) {
                isProcessing.current = true;
                console.log('🌸 Pollinations API Key detected in hash');

                try {
                    // Update the config context (saves to localStorage)
                    // This is now memoized in the context
                    updateConfig({
                        pollinationsApiKey: apiKey,
                        provider: 'pollinations'
                    });

                    // Clear the hash from the URL IMMEDIATELY without refresh
                    // This prevents handleHash from re-triggering if the effect re-runs
                    window.history.replaceState(null, '', window.location.pathname + window.location.search);

                    // Also persist to Firestore profile
                    const userRef = doc(firestore, 'users', user.uid);
                    await setDoc(userRef, {
                        apiSettings: {
                            pollinationsApiKey: apiKey,
                            provider: 'pollinations'
                        }
                    }, { merge: true });

                    console.log('✅ Pollinations API key saved to Firestore');

                    // Show success toast
                    toast({
                        title: 'Pollinations Connected! 🌸',
                        description: 'Your personal API key has been integrated and saved.',
                    });
                } catch (error) {
                    console.error('Error saving Pollinations API key:', error);
                    toast({
                        variant: 'destructive',
                        title: 'Connection Error',
                        description: 'Failed to save your API key. Please try again.',
                    });
                } finally {
                    isProcessing.current = false;
                }
            }
        };

        // Check on mount
        handleHash();

        // Also listen for hash changes
        window.addEventListener('hashchange', handleHash);
        return () => window.removeEventListener('hashchange', handleHash);
    }, [updateConfig, toast, user, firestore]);

    return null;
}
