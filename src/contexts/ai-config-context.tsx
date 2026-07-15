'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { AIProvider } from '@/ai/client-dispatcher';
import { useUser } from '@/lib/auth-context';
import { getSupabaseClient, saveUserProvider } from '@/lib/supabase-db';
import { checkPollenBalanceAction } from '@/app/actions';

interface AIConfig {
    provider: AIProvider;
    apiKey: string;
    pollinationsApiKey: string;
    openrouterApiKey: string;
    nvidiaApiKey: string;
    temperature: number;
    topP: number;
    textModel?: string;
    imageModel?: string;
    pollinationsModel?: string; // Legacy
    pollenBalance?: number | null;
    manualProvider?: AIProvider; // Set when user explicitly chooses a provider via the UI
}

interface AIConfigContextType {
    config: AIConfig;
    updateConfig: (updates: Partial<AIConfig>) => void;
    resetConfig: () => void;
    pollenBalance: number | null;
    isBalanceLoading: boolean;
    refreshBalance: (apiKeyOverride?: string, force?: boolean) => Promise<void>;
}

const DEFAULT_CONFIG: AIConfig = {
    provider: 'openrouter',
    apiKey: '',
    pollinationsApiKey: '',
    openrouterApiKey: '',
    nvidiaApiKey: '',
    temperature: 0.7,
    topP: 0.9,
};

const AIConfigContext = createContext<AIConfigContextType | undefined>(undefined);

export function AIConfigProvider({ children }: { children: React.ReactNode }) {
    const [storedConfig, setStoredConfig] = useLocalStorage<AIConfig>('mindscape-ai-config', DEFAULT_CONFIG);
    const [config, setConfig] = useState<AIConfig>(DEFAULT_CONFIG);
    const { user } = useUser();

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
        const hasExplicitProvider = 'provider' in updates;

        setConfig(current => {
            const newConfig = { ...current, ...updates };

            // When the user explicitly selects a provider from the UI,
            // record it as manualProvider so it persists across syncs
            if (hasExplicitProvider && updates.provider) {
                newConfig.manualProvider = updates.provider;
                
                // Save default provider to Supabase user_settings
                if (user) {
                    const supabase = getSupabaseClient();
                    saveUserProvider(supabase, user.id, updates.provider)
                        .catch(err => console.error('Failed to save provider choice to Supabase:', err));
                }
            }

            // Auto-switch: only when the user hasn't made an explicit choice
            if (!hasExplicitProvider) {
                // If a manual selection was made previously, respect it
                if (newConfig.manualProvider) {
                    newConfig.provider = newConfig.manualProvider;
                } else {
                    // No manual choice: auto-switch based on available keys
                    if (newConfig.nvidiaApiKey) {
                        newConfig.provider = 'nvidia';
                    } else if (newConfig.openrouterApiKey) {
                        newConfig.provider = 'openrouter';
                    } else if (newConfig.pollinationsApiKey) {
                        newConfig.provider = 'pollinations';
                    }
                }
            }

            setStoredConfig(newConfig);
            return newConfig;
        });
        
        // If updates contains pollenBalance, update the separate state too if needed
        // but it's better to keep them in sync
        if (updates.pollenBalance !== undefined) {
             setPollenBalance(updates.pollenBalance ?? null);
        }
    }, [setStoredConfig, user]);

    const resetConfig = useCallback(() => {
        setConfig(DEFAULT_CONFIG);
        setStoredConfig(DEFAULT_CONFIG);
    }, [setStoredConfig]);

    const lastRefreshRef = React.useRef<number>(0);
    const refreshBalance = useCallback(async (apiKeyOverride?: string, force = false) => {
        // Skip on server - this can only work client-side with auth
        if (typeof window === 'undefined') return;

        // Pollen balance is a Pollinations-specific concept — skip for other providers.
        // Checking NVIDIA/OpenRouter balance would always return null/misleading data.
        if (configRef.current.provider !== 'pollinations') {
            setPollenBalance(null);
            return;
        }
        
        const apiKey = apiKeyOverride ?? configRef.current.pollinationsApiKey;
        if (!user || !apiKey || (isRefreshingRef.current && !force)) {
            if (!apiKey) setPollenBalance(null);
            return;
        }

        // Throttle to once per 60s unless forced
        const now = Date.now();
        if (!force && now - lastRefreshRef.current < 60000) {
            console.log('⏳ Skipping balance refresh (throttled)');
            return;
        }

        lastRefreshRef.current = now;
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
            const id = setTimeout(() => setPollenBalance(null), 0);
            return () => clearTimeout(id);
        }
    }, [config.pollinationsApiKey, user, refreshBalance]);

    // Reset config when user logs out
    useEffect(() => {
        if (user === null) {
            const id = setTimeout(() => resetConfig(), 0);
            return () => clearTimeout(id);
        }
    }, [user, resetConfig]);

    // Sync state with local storage on mount and when storage changes
    useEffect(() => {
        // Only sync from localStorage if the change didn't come from Supabase
        if (!isSyncingFromSupabase.current && storedConfig) {
            const storedConfigStr = JSON.stringify(storedConfig);
            if (storedConfigStr !== lastStoredConfigRef.current) {
                lastStoredConfigRef.current = storedConfigStr;
                const id1 = setTimeout(() => setConfig(storedConfig), 0);
                if (storedConfig.pollenBalance !== undefined) {
                    const id2 = setTimeout(() => setPollenBalance(storedConfig.pollenBalance ?? null), 0);
                    return () => { clearTimeout(id1); clearTimeout(id2); };
                }
                return () => clearTimeout(id1);
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

            // If remoteConfig contains an explicit saved provider choice, respect it
            if (remoteConfig.provider) {
                merged.provider = remoteConfig.provider;
                merged.manualProvider = remoteConfig.provider;
            } else {
                // Respect manual provider selection when syncing from Supabase
                const manualProv = configRef.current.manualProvider;
                if (manualProv) {
                    merged.provider = manualProv;
                } else {
                    // No manual choice: auto-switch based on available keys
                    if (merged.nvidiaApiKey) {
                        merged.provider = 'nvidia';
                    } else if (merged.openrouterApiKey) {
                        merged.provider = 'openrouter';
                    } else if (merged.pollinationsApiKey) {
                        merged.provider = 'pollinations';
                    }
                }
            }

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
                .select('pollinations_api_key, openrouter_api_key, nvidia_api_key, image_model, text_model, provider')
                .eq('user_id', user.id)
                .single();

            if (!error && data) {
                const remoteUpdates: Partial<AIConfig> = {
                    pollinationsApiKey: data.pollinations_api_key || '',
                    openrouterApiKey: data.openrouter_api_key || '',
                    nvidiaApiKey: data.nvidia_api_key || '',
                    imageModel: data.image_model || '',
                    textModel: data.text_model || '',
                };
                if (data.provider) {
                    remoteUpdates.provider = data.provider as AIProvider;
                }
                applyRemoteConfig(remoteUpdates);
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
                    const remoteUpdates: Partial<AIConfig> = {
                        pollinationsApiKey: data.pollinations_api_key || '',
                        openrouterApiKey: data.openrouter_api_key || '',
                        nvidiaApiKey: data.nvidia_api_key || '',
                        imageModel: data.image_model || '',
                        textModel: data.text_model || '',
                    };
                    if (data.provider) {
                        remoteUpdates.provider = data.provider as AIProvider;
                    }
                    applyRemoteConfig(remoteUpdates);
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
