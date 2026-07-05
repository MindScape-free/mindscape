'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useUser } from '@/lib/auth-context';
import { awardPointsAction } from '@/app/actions/award-points';
import { PointEventType } from '@/types/points';
import { AwardResult } from '@/lib/points-engine';
import { XPToastStack, XPToastItem } from '@/components/points/xp-toast';
import { getSupabaseClient } from '@/lib/supabase-db';
import { trackLogin } from '@/lib/tracker';
import { LevelUpOverlay } from '@/components/points/LevelUpOverlay';

const EVENT_LABELS: Record<PointEventType, string> = {
  MAP_CREATED:           'Mind Map Created',
  SUB_MAP_CREATED:       'Sub-Map Created',
  MAP_COMPARE:           'Comparison Map Created',
  MAP_MULTI_SOURCE:      'Multi-Source Map Created',
  EXPLANATION_OPENED:    'Explanation Opened',
  EXPLANATION_COMPLETED: 'Explanation Completed',
  CONFIDENCE_RATED:      'Confidence Rated',
  CHAT_MESSAGE:          'Chat Message Sent',
  CHAT_PINNED:           'Message Pinned',
  QUIZ_COMPLETED:        'Quiz Completed',
  QUIZ_BONUS_80:         'High Score Bonus',
  QUIZ_PERFECT:          'Perfect Score!',
  IMAGE_GENERATED:       'AI Image Generated',
  AUDIO_GENERATED:       'Audio Summary Created',
  MAP_TRANSLATED:        'Map Translated',
  MAP_PUBLISHED:         'Map Published',
  MAP_VIEWS_10:          '10 Map Views',
  MAP_CLONED:            'Map Cloned',
  DAILY_LOGIN:           'Daily Login',
  DAILY_CHALLENGE:       'Daily Challenge',
  STREAK_3:              '3-Day Streak!',
  STREAK_7:              '7-Day Streak!',
  STREAK_30:             '30-Day Streak!',
  STUDY_TIME_CANVAS:     '10 Min Study Time',
  STUDY_TIME_CHAT:       '10 Min Chat Time',
  ALCHEMY_FUSION:        'Knowledge Fused',
  ACHIEVEMENT_BRONZE:    'Achievement Unlocked',
  ACHIEVEMENT_SILVER:    'Achievement Unlocked',
  ACHIEVEMENT_GOLD:      'Achievement Unlocked',
  ACHIEVEMENT_PLATINUM:  'Achievement Unlocked',
};

interface XPContextType {
  awardXP: (eventType: PointEventType, metadata?: Record<string, any>) => Promise<AwardResult | null>;
}

const XPContext = createContext<XPContextType | undefined>(undefined);

export function XPProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [toasts, setToasts] = useState<XPToastItem[]>([]);
  const [levelUpData, setLevelUpData] = useState<{ level: number; rank: string } | null>(null);
  const toastIdRef = useRef(0);

  const processedUserRef = useRef<string | null>(null);
  const processingRef = useRef(false); // Guard against React StrictMode double-fire

  const awardXP = useCallback(async (
    eventType: PointEventType,
    metadata?: Record<string, any>
  ): Promise<AwardResult | null> => {
    if (!user) return null;

    const { data, error } = await awardPointsAction(user.id, eventType, metadata);
    if (error || !data || !data.awarded) return data;

    // Push toast
    const id = `xp_toast_${++toastIdRef.current}`;
    setToasts(prev => [...prev, { id, result: data, label: EVENT_LABELS[eventType] }]);

    // Handle Level Up
    if (data.leveledUp) {
      setLevelUpData({ level: data.level, rank: data.rank });
    }

    return data;
  }, [user]);

  // Handle daily login and activity tracking
  // Uses processingRef to guard against React StrictMode double-invocation
  React.useEffect(() => {
    // Guard: prevent double-fire in StrictMode (React 18+ calls effects twice)
    if (processingRef.current) return;
    processingRef.current = true;

    if (user && processedUserRef.current !== user.id) {
      processedUserRef.current = user.id;
      // Award daily login points
      awardXP('DAILY_LOGIN').catch((err) => console.error("[XP] Failed:", err));
      
      // Track activity in users table (streaks, etc.)
      const supabase = getSupabaseClient();
      trackLogin(supabase, user.id, {
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL
      }).catch(err => console.error('[XPContext] trackLogin failed:', err));
    }

    return () => { processingRef.current = false; };
    // `supabase` is created fresh inside the callback via getSupabaseClient(),
    // so it is not a stale-closure dependency. `awardXP` is already listed.
    // `user?.id` covers the `user` object for identity changes.
  }, [user?.id, awardXP]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <XPContext.Provider value={{ awardXP }}>
      {children}
      <XPToastStack items={toasts} onDismiss={dismissToast} />
      {levelUpData && (
        <LevelUpOverlay
          level={levelUpData.level}
          rank={levelUpData.rank}
          onClose={() => setLevelUpData(null)}
        />
      )}
    </XPContext.Provider>
  );
}

export function useXP() {
  const ctx = useContext(XPContext);
  if (!ctx) throw new Error('useXP must be used within XPProvider');
  return ctx;
}
