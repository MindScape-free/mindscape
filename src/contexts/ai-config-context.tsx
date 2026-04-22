'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { AIProvider } from '@/ai/client-dispatcher';
import { useUser } from '@/lib/auth-context';
import { getSupabaseClient } from '@/lib/supabase-db';
import { checkPollenBalanceAction } from '@/app/actions';

interface AIConfig {
    provider: AIProvider;
    apiKey: string;
    pollinationsApiKey: string;
    temperature: number;
    topP: number;
    textModel?: string;
    imageModel?: string;
    pollinationsModel?: string; // Legacy
    pollenBalance?: number | null;
}

interface AIConfigContextType {
    config: AIConfig;
    updateConfig: (updates: Partial<AIConfig>) => void;
    resetConfig: () => void;
    pollenBalance: number | null;
    isBalanceLoading: boolean;
    refreshBalance: () => Promise<void>;
}

const DEFAULT_CONFIG: AIConfig = {
    provider: 'pollinations',
    apiKey: '',
    pollinationsApiKey: '',
    temperature: 0.7,
    topP: 0.9,
};

const AIConfigContext = createContext<AIConfigContextType | undefined>(undefined);

export function AIConfigProvider({ children }: { children: React.ReactNode }) {
    const [storedConfig, setStoredConfig] = useLocalStorage<AIConfig>('mindscape-ai-config', DEFAULT_CONFIG);
    const [config, setConfig] = useState<AIConfig>(DEFAULT_CONFIG);
    const { user } = useUser();
    const firestore = null;

    const [hydrated, setHydrated] = useState(false);
    const [pollenBalance, setPollenBalance] = useState<number | null>(null);
    const [isBalanceLoading, setIsBalanceLoading] = useState(false);
    const isRefreshingRef = React.useRef(false);

    // SSE balance stream — provides real-time updates, replaces old 60s polling
    const handleSSEBalanceUpdate = useCallback((balance: number) => {
        setPollenBalance(balance);
        setConfig(current => {
            const updated = { ...current, pollenBalance: balance };
            setStoredConfig(updated);
            return updated;
        });
    }, [setStoredConfig]);

    // Track if we're currently syncing from Supabase to prevent loops
    const isSyncingFromSupabase = React.useRef(false);
    const lastStoredConfigRef = React.useRef<string>('');
    const configRef = React.useRef<AIConfig>(DEFAULT_CONFIG);
    const remoteFromSettingsRef = React.useRef<Partial<AIConfig>>({});

    // Keep configRef in sync with config state
    React.useEffect(() => {
        configRef.current = config;
    }, [config]);

    const updateConfig = useCallback((updates: Partial<AIConfig>) => {
        setConfig(current => {
            const newConfig = { ...current, ...updates };
            setStoredConfig(newConfig);
            return newConfig;
        });
        
        // If updates contains pollenBalance, update the separate state too if needed
        // but it's better to keep them in sync
        if (updates.pollenBalance !== undefined) {
             setPollenBalance(updates.pollenBalance ?? null);
        }
    }, [setStoredConfig]);

    const resetConfig = useCallback(() => {
        setConfig(DEFAULT_CONFIG);
        setStoredConfig(DEFAULT_CONFIG);
    }, [setStoredConfig]);

    const refreshBalance = useCallback(async (apiKeyOverride?: string) => {
        // Skip on server - this can only work client-side with auth
        if (typeof window === 'undefined') return;
        
        const apiKey = apiKeyOverride ?? configRef.current.pollinationsApiKey;
        if (!user || !apiKey || isRefreshingRef.current) {
            if (!apiKey) setPollenBalance(null);
            return;
        }

        isRefreshingRef.current = true;
        setIsBalanceLoading(true);
        try {
            const result = await checkPollenBalanceAction({ apiKey, userId: user.id });
            if (!result.error) {
                setPollenBalance(result.balance);
                updateConfig({ pollenBalance: result.balance });
            } else {
                // Don't treat as critical error - just log and keep app working
                console.warn('Balance check returned error (non-critical):', result.error);
                setPollenBalance(null);
            }
        } catch (error) {
            // Non-critical - don't break the app
            console.warn('Error refreshing pollen balance (non-critical):', error);
        } finally {
            isRefreshingRef.current = false;
            setIsBalanceLoading(false);
        }
    }, [user, updateConfig]);

    // Balance updates are now event-driven (triggered after AI actions)
    // No more background SSE/Polling stream needed

    // Refresh balance when API key changes in state (e.g. new key saved)
    useEffect(() => {
        if (config.pollinationsApiKey && user) {
            refreshBalance(config.pollinationsApiKey);
        } else if (!config.pollinationsApiKey) {
            setPollenBalance(null);
        }
    }, [config.pollinationsApiKey, user]); // eslint-disable-line react-hooks/exhaustive-deps

    // Reset config when user logs out
    useEffect(() => {
        if (user === null) {
            console.log('🚪 User logged out, resetting AI config');
            resetConfig();
        }
    }, [user, resetConfig]);

    // Sync state with local storage on mount and when storage changes
    useEffect(() => {
        // Only sync from localStorage if the change didn't come from Supabase
        if (!isSyncingFromSupabase.current && storedConfig) {
            const storedConfigStr = JSON.stringify(storedConfig);
            if (storedConfigStr !== lastStoredConfigRef.current) {
                lastStoredConfigRef.current = storedConfigStr;
                setConfig(storedConfig);
                if (storedConfig.pollenBalance !== undefined) {
                    setPollenBalance(storedConfig.pollenBalance ?? null);
                }
            }
        }
        // Reset the flag after processing
        isSyncingFromSupabase.current = false;
    }, [storedConfig]);

    // Sync with Supabase on user login - REAL-TIME LISTENER
    useEffect(() => {
        if (!user) return;

        const supabase = getSupabaseClient();
        console.log('🔄 Setting up AI config listener for user:', user.id);

        const applyRemoteConfig = (remoteConfig: Partial<AIConfig>) => {
            const merged = {
                ...configRef.current,
                ...remoteConfig,
            };
            const newConfigStr = JSON.stringify(merged);
            if (newConfigStr !== lastStoredConfigRef.current) {
                lastStoredConfigRef.current = newConfigStr;
                isSyncingFromSupabase.current = true;
                setConfig(merged);
                setStoredConfig(merged);
                console.log('✅ AI Config synced from Supabase');
            }
            // Always fetch balance after sync if key is present
            if (merged.pollinationsApiKey) {
                refreshBalance(merged.pollinationsApiKey);
            }
        };

        // 1. Initial fetch
        const fetchSettings = async () => {
            const { data, error } = await supabase
                .from('user_settings')
                .select('pollinations_api_key, image_model, text_model')
                .eq('user_id', user.id)
                .single();

            if (!error && data) {
                applyRemoteConfig({
                    pollinationsApiKey: data.pollinations_api_key || '',
                    imageModel: data.image_model || '',
                    textModel: data.text_model || '',
                });
            }
            setHydrated(true);
        };

        fetchSettings();

        // 2. Realtime subscription
        const channel = supabase
            .channel(`public:user_settings:user_id=eq.${user.id}`)
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'user_settings', 
                filter: `user_id=eq.${user.id}` 
            }, (payload) => {
                console.log('🔔 AI Config Realtime update:', payload);
                const data = payload.new as any;
                if (data) {
                    applyRemoteConfig({
                        pollinationsApiKey: data.pollinations_api_key || '',
                        imageModel: data.image_model || '',
                        textModel: data.text_model || '',
                    });
                }
            })
            .subscribe();

        return () => {
            console.log('🔄 Cleaning up AI config listener');
            supabase.removeChannel(channel);
        };
    }, [user, setStoredConfig, refreshBalance]);

    return (
        <AIConfigContext.Provider value={{ config, updateConfig, resetConfig, pollenBalance, isBalanceLoading, refreshBalance }}>
            {children}
        </AIConfigContext.Provider>
    );
}

export function useAIConfig() {
    const context = useContext(AIConfigContext);
    if (context === undefined) {
        throw new Error('useAIConfig must be used within an AIConfigProvider');
    }
    return context;
}
