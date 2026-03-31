'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  collection, 
  query, 
  doc, 
  setDoc, 
  deleteDoc,
  serverTimestamp, 
  onSnapshot,
  orderBy
} from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { ChatSession } from '@/types/chat';
import { onAuthStateChanged } from 'firebase/auth';

/**
 * useChatPersistence hook handles syncing chat sessions with Firestore.
 * It provides a debounced save mechanism and real-time updates for the active session.
 */
export function useChatPersistence() {
  const { user, firestore, auth } = useFirebase();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch all sessions for the user on mount
  useEffect(() => {
    if (!firestore || !auth) return;

    // Use onAuthStateChanged to ensure the Firestore SDK has processed 
    // the auth state before we attempt a query.
    let unsubscribeSnap: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      // Clean up previous snapshot listener whenever auth state changes
      if (unsubscribeSnap) {
        unsubscribeSnap();
        unsubscribeSnap = null;
      }

      if (!firebaseUser) {
        setSessions([]);
        setIsLoading(false);
        return;
      }

      const sessionsRef = collection(firestore, 'users', firebaseUser.uid, 'chatSessions');
      const q = query(sessionsRef, orderBy('updatedAt', 'desc'));

      unsubscribeSnap = onSnapshot(q, (snapshot) => {
        const fetchedSessions: ChatSession[] = [];
        snapshot.forEach((doc) => {
          fetchedSessions.push({ id: doc.id, ...doc.data() } as ChatSession);
        });
        setSessions(fetchedSessions);
        setIsLoading(false);
      }, (error) => {
        console.error("Error fetching chat sessions:", error);
        setIsLoading(false);
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnap) unsubscribeSnap();
    };
  }, [firestore, auth]);

  /**
   * Saves a chat session to Firestore with a debounce.
   */
  const saveSession = useCallback((session: ChatSession) => {
    if (!user || !firestore) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setIsSyncing(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const sessionRef = doc(firestore, 'users', user.uid, 'chatSessions', session.id);
        const { id, ...dataToSave } = session;
        await setDoc(sessionRef, {
          ...dataToSave,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (error) {
        console.error("Error saving chat session:", error);
      } finally {
        setIsSyncing(false);
      }
    }, 1000);
  }, [user, firestore]);

  /**
   * Creates a new chat session.
   */
  const createSession = useCallback(async (topic: string, mapId: string | null = null, mapTitle: string = 'General') => {
    if (!user || !firestore) return null;

    const newId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      mapId,
      mapTitle,
      title: topic,
      messages: [],
      weakTags: [],
      quizHistory: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Optimistic update
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newId);

    // Save to Firestore
    try {
      const sessionRef = doc(firestore, 'users', user.uid, 'chatSessions', newId);
      const { id, ...dataToSave } = newSession;
      await setDoc(sessionRef, {
        ...dataToSave,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error creating session:", error);
    }

    return newId;
  }, [user, firestore]);

  /**
   * Updates an existing session's data (optimistically) and schedules a save.
   */
  const updateSession = useCallback((sessionId: string, updates: Partial<ChatSession>) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        const updated = { ...s, ...updates, updatedAt: Date.now() };
        saveSession(updated);
        return updated;
      }
      return s;
    }));
  }, [saveSession]);

  /**
   * Deletes a chat session from Firestore and local state.
   */
  const deleteSession = useCallback(async (sessionId: string) => {
    if (!user || !firestore) return;

    try {
      const sessionRef = doc(firestore, 'users', user.uid, 'chatSessions', sessionId);
      await deleteDoc(sessionRef);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (error) {
      console.error("Error deleting chat session:", error);
    }
  }, [user, firestore]);

  return {
    sessions,
    activeSessionId,
    setActiveSessionId,
    saveSession,
    updateSession,
    createSession,
    deleteSession,
    isLoading,
    isSyncing
  };
}
