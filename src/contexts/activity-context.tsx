'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { MindMapStatus } from '@/hooks/use-mind-map-stack';

export interface AIHealthStatus {
    name: string;
    status: string;
}

interface ActivityContextType {
    status: MindMapStatus;
    setStatus: (status: MindMapStatus) => void;
    aiHealth: AIHealthStatus[];
    setAiHealth: (health: AIHealthStatus[]) => void;
    activeTaskName: string | null;
    setActiveTaskName: (name: string | null) => void;
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

export function ActivityProvider({ children }: { children: ReactNode }) {
    const [status, setStatus] = useState<MindMapStatus>('idle');
    const [aiHealth, setAiHealth] = useState<AIHealthStatus[]>([]);
    const [activeTaskName, setActiveTaskName] = useState<string | null>(null);

    return (
        <ActivityContext.Provider
            value={{
                status,
                setStatus,
                aiHealth,
                setAiHealth,
                activeTaskName,
                setActiveTaskName
            }}
        >
            {children}
        </ActivityContext.Provider>
    );
}

export function useActivity() {
    const context = useContext(ActivityContext);
    if (context === undefined) {
        throw new Error('useActivity must be used within an ActivityProvider');
    }
    return context;
}
