'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { AIProvider } from '@/ai/client-dispatcher';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

interface AIConfig {
    provider: AIProvider;
    apiKey: string;
    pollinationsApiKey: string;
    temperature: number;
    topP: number;
    pollinationsModel?: string;
}

interface AIConfigContextType {
    config: AIConfig;
    updateConfig: (updates: Partial<AIConfig>) => void;
    resetConfig: () => void;
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
    }, [setStoredConfig]);

    const resetConfig = useCallback(() => {
        setConfig(DEFAULT_CONFIG);
        setStoredConfig(DEFAULT_CONFIG);
    }, [setStoredConfig]);

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
                if (settings.pollinationsModel) remoteConfig.pollinationsModel = settings.pollinationsModel;
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
                if (data.preferredModel) remoteConfig.pollinationsModel = data.preferredModel;
            }

            remoteFromSettingsRef.current = remoteConfig;
            applyRemoteConfig();
            setHydrated(true);
        }, (error) => {
            console.error("Failed to sync AI config from Firestore (settings doc)", error);
            setHydrated(true);
        });

        return () => {
            console.log('🔄 Cleaning up AI config listener');
            unsubscribeUserDoc();
            unsubscribeSettings();
        };
    }, [user, firestore, setStoredConfig]);

    return (
        <AIConfigContext.Provider value={{ config, updateConfig, resetConfig }}>
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
