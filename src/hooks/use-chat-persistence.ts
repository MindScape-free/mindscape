'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@/lib/auth-context';
import { ChatSession } from '@/types/chat';
import { getSupabaseClient, saveChatSession, getChatSessions, deleteChatSession } from '@/lib/supabase-db';

export function useChatPersistence() {
  const { user, isUserLoading } = useUser();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) { setSessions([]); setIsLoading(false); return; }

    const supabase = getSupabaseClient();
    setIsLoading(true);

    getChatSessions(supabase, user.id).then(data => {
      setSessions(data.map(row => ({
        id: row.id,
        mapId: row.map_id,
        mapTitle: row.map_title,
        title: row.title,
        messages: row.messages || [],
        weakTags: row.weak_tags || [],
        quizHistory: row.quiz_history || [],
        createdAt: new Date(row.created_at).getTime(),
        updatedAt: new Date(row.updated_at).getTime(),
      })));
      setIsLoading(false);
    }).catch(() => setIsLoading(false));

    // Realtime subscription
    const channel = supabase
      .channel(`chat-sessions-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_sessions', filter: `user_id=eq.${user.id}` }, () => {
        getChatSessions(supabase, user.id).then(data => {
          setSessions(data.map(row => ({
            id: row.id, mapId: row.map_id, mapTitle: row.map_title, title: row.title,
            messages: row.messages || [], weakTags: row.weak_tags || [], quizHistory: row.quiz_history || [],
            createdAt: new Date(row.created_at).getTime(), updatedAt: new Date(row.updated_at).getTime(),
          })));
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, isUserLoading]);

  const saveSession = useCallback((session: ChatSession) => {
    if (!user) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setIsSyncing(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const supabase = getSupabaseClient();
        await saveChatSession(supabase, user.id, session);
      } catch (error) {
        console.error('Error saving chat session:', error);
      } finally {
        setIsSyncing(false);
      }
    }, 1000);
  }, [user]);

  const createSession = useCallback(async (topic: string, mapId: string | null = null, mapTitle = 'General') => {
    if (!user) return null;
    const newId = `session-${Date.now()}`;
    const newSession: ChatSession = { id: newId, mapId, mapTitle, title: topic, messages: [], weakTags: [], quizHistory: [], createdAt: Date.now(), updatedAt: Date.now() };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newId);
    try {
      const supabase = getSupabaseClient();
      await saveChatSession(supabase, user.id, newSession);
      try {
        const { logAdminActivityAction } = await import('@/app/actions');
        await logAdminActivityAction({ type: 'CHAT_CREATED', targetId: newId, targetType: 'chat', details: `Chat session started: ${topic}`, performedBy: user.id, performedByEmail: user.email || 'anonymous', metadata: { mapId, mapTitle } });
      } catch { /* non-critical */ }
    } catch (error) { console.error('Error creating session:', error); }
    return newId;
  }, [user]);

  const updateSession = useCallback((sessionId: string, updates: Partial<ChatSession>) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== sessionId) return s;
      const updated = { ...s, ...updates, updatedAt: Date.now() };
      saveSession(updated);
      return updated;
    }));
  }, [saveSession]);

  const deleteSession = useCallback(async (sessionId: string) => {
    if (!user) return;
    try {
      const supabase = getSupabaseClient();
      await deleteChatSession(supabase, user.id, sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (error) { console.error('Error deleting chat session:', error); }
  }, [user]);

  return { sessions, activeSessionId, setActiveSessionId, saveSession, updateSession, createSession, deleteSession, isLoading, isSyncing };
}
