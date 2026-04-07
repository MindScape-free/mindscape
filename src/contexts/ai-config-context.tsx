'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { AIProvider } from '@/ai/client-dispatcher';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
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
    const firestore = useFirestore();

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

    // Track if we're currently syncing from Firestore to prevent loops
    const isSyncingFromFirestore = React.useRef(false);
    const lastStoredConfigRef = React.useRef<string>('');
    const configRef = React.useRef<AIConfig>(DEFAULT_CONFIG);
    const remoteFromUserDocRef = React.useRef<Partial<AIConfig>>({});
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
            const result = await checkPollenBalanceAction({ apiKey, userId: user.uid });
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
        // Only sync from localStorage if the change didn't come from Firestore
        if (!isSyncingFromFirestore.current && storedConfig) {
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
        isSyncingFromFirestore.current = false;
    }, [storedConfig]);

    // Sync with Firestore on user login - REAL-TIME LISTENER
    useEffect(() => {
        if (!user || !firestore) return;

        console.log('🔄 Setting up AI config listener for user:', user.uid);

        const applyRemoteConfig = () => {
            const merged = {
                ...configRef.current,
                ...remoteFromUserDocRef.current,
                ...remoteFromSettingsRef.current,
            };
            const newConfigStr = JSON.stringify(merged);
            if (newConfigStr !== lastStoredConfigRef.current) {
                lastStoredConfigRef.current = newConfigStr;
                isSyncingFromFirestore.current = true;
                setConfig(merged);
                setStoredConfig(merged);
                console.log('✅ AI Config synced from Firestore');
            }
            // Always fetch balance after Firestore sync if key is present,
            // regardless of whether config changed (handles page refresh case)
            if (merged.pollinationsApiKey) {
                refreshBalance(merged.pollinationsApiKey);
            }
        };

        // Listen to legacy /users/{uid} apiSettings (for backwards compatibility)
        const userRef = doc(firestore, 'users', user.uid);
        const unsubscribeUserDoc = onSnapshot(userRef, (snap) => {
            const data = snap.data();
            const settings = data?.apiSettings;
            const remoteConfig: Partial<AIConfig> = {};

            if (settings) {
                if (settings.provider) remoteConfig.provider = settings.provider;
                if (settings.apiKey) remoteConfig.apiKey = settings.apiKey;
                if (settings.pollinationsApiKey) remoteConfig.pollinationsApiKey = settings.pollinationsApiKey;
                
                // Intelligent Migration for legacy settings
                if (settings.pollinationsModel) {
                    remoteConfig.pollinationsModel = settings.pollinationsModel;
                    const isImageModel = ['flux', 'qwen-vl', 'turbo', 'vision'].some(m => settings.pollinationsModel.toLowerCase().includes(m));
                    if (isImageModel) {
                        remoteConfig.imageModel = settings.pollinationsModel;
                    } else {
                        remoteConfig.textModel = settings.pollinationsModel;
                    }
                }
                if (settings.textModel) remoteConfig.textModel = settings.textModel;
                if (settings.imageModel) remoteConfig.imageModel = settings.imageModel;
            } else {
                // If snap exists but no apiSettings, clear any stale keys
                remoteConfig.apiKey = '';
                remoteConfig.pollinationsApiKey = '';
            }

            remoteFromUserDocRef.current = remoteConfig;
            applyRemoteConfig();
            setHydrated(true);
        }, (error) => {
            console.error("Failed to sync AI config from Firestore (user doc)", error);
            setHydrated(true);
        });


        // Listen to new /users/{uid}/settings/imageGeneration (preferred storage place)
        const settingsRef = doc(firestore, 'users', user.uid, 'settings', 'imageGeneration');
        const unsubscribeSettings = onSnapshot(settingsRef, (snap) => {
            const data = snap.data();
            const remoteConfig: Partial<AIConfig> = {};

            if (data) {
                if (data.pollinationsApiKey) remoteConfig.pollinationsApiKey = data.pollinationsApiKey;
                if (data.preferredModel) remoteConfig.imageModel = data.preferredModel;
                if (data.imageModel) remoteConfig.imageModel = data.imageModel;
                if (data.textModel) remoteConfig.textModel = data.textModel;
            }

            remoteFromSettingsRef.current = remoteConfig;
            applyRemoteConfig();
            setHydrated(true);
        }, (error) => {
            console.error("Failed to sync AI config from Firestore (settings doc)", error);
            setHydrated(true);
        });

    // Balance updates are now event-driven (triggered after AI actions)
    // No more background SSE/Polling stream needed

    return () => {
        console.log('🔄 Cleaning up AI config listener');
        unsubscribeUserDoc();
        unsubscribeSettings();
    };
    }, [user, firestore, setStoredConfig, refreshBalance]);

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
