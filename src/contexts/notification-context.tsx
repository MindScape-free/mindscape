'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

export type NotificationType = 'info' | 'success' | 'error' | 'loading';

export interface Notification {
    id: string;
    message: string;
    type: NotificationType;
    timestamp: Date;
    read: boolean;
    link?: string;
    details?: string;
}

interface NotificationContextType {
    notifications: Notification[];
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => string;
    updateNotification: (id: string, updates: Partial<Notification>) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearNotifications: () => void;
    unreadCount: number;
}

const STORAGE_KEY = 'mindscape-notifications';
const MAX_NOTIFICATIONS = 50;

/**
 * Persist notifications to localStorage
 */
function saveToStorage(notifications: Notification[]) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch (e) {
        // localStorage may be full or unavailable (SSR, private browsing)
        console.warn('Failed to persist notifications:', e);
    }
}

/**
 * Load notifications from localStorage, reviving Date objects
 */
function loadFromStorage(): Notification[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.map((n: any) => ({
            ...n,
            timestamp: new Date(n.timestamp),
        }));
    } catch (e) {
        console.warn('Failed to load notifications:', e);
        return [];
    }
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [hydrated, setHydrated] = useState(false);

    // Hydrate from localStorage on mount (client-side only)
    useEffect(() => {
        const stored = loadFromStorage();
        if (stored.length > 0) {
            setNotifications(stored);
        }
        setHydrated(true);
    }, []);

    // Sync to localStorage whenever notifications change (after hydration)
    useEffect(() => {
        if (hydrated) {
            saveToStorage(notifications);
        }
    }, [notifications, hydrated]);

    const addNotification = useCallback((payload: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
        const id = Math.random().toString(36).substring(2, 9);
        const newNotification: Notification = {
            ...payload,
            id,
            timestamp: new Date(),
            read: false,
        };
        setNotifications((prev) => [newNotification, ...prev].slice(0, MAX_NOTIFICATIONS));
        return id;
    }, []);

    const updateNotification = useCallback((id: string, updates: Partial<Notification>) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, ...updates } : n))
        );
    }, []);

    const markAsRead = useCallback((id: string) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
    }, []);

    const markAllAsRead = useCallback(() => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }, []);

    const clearNotifications = useCallback(() => {
        setNotifications([]);
    }, []);

    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                addNotification,
                updateNotification,
                markAsRead,
                markAllAsRead,
                clearNotifications,
                unreadCount,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
}
