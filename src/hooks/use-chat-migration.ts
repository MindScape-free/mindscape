'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/lib/auth-context';

const MIGRATION_FLAG_KEY = 'mindscape-chat-migrated';

/**
 * useChatMigration hook - simplified for Supabase (no Firestore migration needed)
 */
export function useChatMigration() {
  const { user } = useUser();
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'migrating' | 'done' | 'error'>('idle');

  useEffect(() => {
    // Only Supabase - mark as done since we're not using localStorage migration
    if (user) {
      setMigrationStatus('done');
    }
  }, [user]);

  return { isMigrating, migrationStatus };
}