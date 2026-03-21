'use client';

import { useEffect, useState } from 'react';
import { useFirebase } from '@/firebase';
import { doc, setDoc, collection, serverTimestamp, writeBatch } from 'firebase/firestore';
import { ChatSession, ChatMessage } from '@/types/chat';
import { onAuthStateChanged } from 'firebase/auth';

const LOCAL_STORAGE_KEY = 'mindscape-chat-sessions';
const MIGRATION_FLAG_KEY = 'mindscape-chat-migrated';

/**
 * useChatMigration hook handles one-time migration from localStorage to Firestore.
 */
export function useChatMigration() {
  const { user, firestore, auth } = useFirebase();
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'migrating' | 'done' | 'error'>('idle');

  useEffect(() => {
    if (!firestore || !auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) return;

      const isMigrated = localStorage.getItem(MIGRATION_FLAG_KEY);
      if (isMigrated === 'true') {
        setMigrationStatus('done');
        return;
      }

      const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!localData) {
        localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
        setMigrationStatus('done');
        return;
      }

      try {
        setIsMigrating(true);
        setMigrationStatus('migrating');
        const legacySessions = JSON.parse(localData) as any[];

        if (legacySessions.length === 0) {
          localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
          setMigrationStatus('done');
          setIsMigrating(false);
          return;
        }

        // Use a batch to upload all sessions at once (Firestore batch limit is 500)
        const batch = writeBatch(firestore);
        
        legacySessions.forEach((legacy) => {
          const sessionRef = doc(firestore, 'users', firebaseUser.uid, 'chatSessions', legacy.id);
          
          const migratedSession: Omit<ChatSession, 'id'> = {
            mapId: null,
            mapTitle: 'Migrated Session',
            title: legacy.topic || 'Untitled Chat',
            messages: (legacy.messages || []).map((msg: any, idx: number) => ({
              id: `msg-${Date.now()}-${idx}`,
              role: msg.role === 'assistant' ? 'ai' : msg.role,
              content: msg.content,
              type: msg.type || 'text',
              timestamp: msg.timestamp || Date.now(),
              quiz: msg.quiz,
              quizResult: msg.quizResult,
              attachments: msg.attachments
            })),
            weakTags: [],
            quizHistory: [],
            createdAt: legacy.timestamp || Date.now(),
            updatedAt: legacy.timestamp || Date.now(),
          };
          
          batch.set(sessionRef, migratedSession);
        });

        await batch.commit();
        localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
        setMigrationStatus('done');
        console.log("Chat migration completed successfully.");
      } catch (error) {
        console.error("Migration failed:", error);
        setMigrationStatus('error');
      } finally {
        setIsMigrating(false);
      }
    });

    return () => unsubscribe();
  }, [firestore, auth]);

  return { isMigrating, migrationStatus };
}
