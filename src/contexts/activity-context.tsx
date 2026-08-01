'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { MindMapStatus } from '@/hooks/use-mind-map-stack';

interface ActivityContextType {
    status: MindMapStatus;
    setStatus: (status: MindMapStatus) => void;
    activeTaskName: string | null;
    setActiveTaskName: (name: string | null) => void;
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

export function ActivityProvider({ children }: { children: ReactNode }) {
    const [status, setStatus] = useState<MindMapStatus>('idle');
    const [activeTaskName, setActiveTaskName] = useState<string | null>(null);

    return (
        <ActivityContext.Provider
            value={{
                status,
                setStatus,
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
