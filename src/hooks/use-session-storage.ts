'use client';

import { useState, useCallback } from 'react';
import { safeGetItem, safeRemoveItem } from '@/lib/storage';

export function useSessionStorage() {
  const [isLoading, setIsLoading] = useState(false);

  const getSessionData = useCallback(<T,>(sessionId: string): { type: string; content: T; persona: string } | null => {
    const sessionType = safeGetItem<string>(`session-type-${sessionId}`);
    const sessionContent = safeGetItem<T>(`session-content-${sessionId}`);
    const sessionPersona = safeGetItem<string>(`session-persona-${sessionId}`);

    if (!sessionType || !sessionContent) {
      return null;
    }

    return {
      type: sessionType,
      content: sessionContent,
      persona: sessionPersona || 'Teacher',
    };
  }, []);

  const clearSession = useCallback((sessionId: string): void => {
    safeRemoveItem(`session-type-${sessionId}`);
    safeRemoveItem(`session-content-${sessionId}`);
    safeRemoveItem(`session-persona-${sessionId}`);
  }, []);

  const setSessionData = useCallback(<T,>(sessionId: string, type: string, content: T, persona?: string): void => {
    safeRemoveItem(`session-type-${sessionId}`);
    safeRemoveItem(`session-content-${sessionId}`);
    safeRemoveItem(`session-persona-${sessionId}`);
    
    safeSetItem(`session-type-${sessionId}`, type);
    safeSetItem(`session-content-${sessionId}`, content);
    if (persona) {
      safeSetItem(`session-persona-${sessionId}`, persona);
    }
  }, []);

  return {
    isLoading,
    getSessionData,
    clearSession,
    setSessionData,
  };
}

function safeSetItem<T>(key: string, value: T): boolean {
  if (typeof window === 'undefined') return false;
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
