'use client';

import { useEffect, useRef } from 'react';
import { useAIConfig } from '@/contexts/ai-config-context';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/lib/auth-context';
import { getSupabaseClient, saveUserApiKey } from '@/lib/supabase-db';

/**
 * PollinationsAuthHandler component
 * Listen for Pollinations BYOP redirect with api_key in the hash
 */
export function PollinationsAuthHandler() {
    const { updateConfig, config } = useAIConfig();
    const { toast } = useToast();
    const { user } = useUser();
    const supabase = getSupabaseClient();
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

            if (apiKey && user) {
                isProcessing.current = true;
                console.log('🌸 Pollinations API Key detected in hash');

                try {
                    updateConfig({
                        pollinationsApiKey: apiKey,
                        provider: 'pollinations'
                    });

                    window.history.replaceState(null, '', window.location.pathname + window.location.search);

                    await saveUserApiKey(supabase, user.id, apiKey, config.pollinationsModel || 'flux');

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
    }, [updateConfig, toast, user, supabase]);

    return null;
}
