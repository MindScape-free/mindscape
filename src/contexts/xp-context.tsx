'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useUser } from '@/lib/auth-context';
import { awardPointsAction } from '@/app/actions/award-points';
import { PointEventType } from '@/types/points';
import { AwardResult } from '@/lib/points-engine';
import { XPToastStack, XPToastItem } from '@/components/points/xp-toast';

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
  STREAK_3:              '3-Day Streak!',
  STREAK_7:              '7-Day Streak!',
  STREAK_30:             '30-Day Streak!',
  STUDY_TIME_CANVAS:     '10 Min Study Time',
  STUDY_TIME_CHAT:       '10 Min Chat Time',
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
  const toastIdRef = useRef(0);

  const awardXP = useCallback(async (
    eventType: PointEventType,
    metadata?: Record<string, any>
  ): Promise<AwardResult | null> => {
    if (!user) return null;

    const { data, error } = await awardPointsAction(user.uid, eventType, metadata);
    if (error || !data || !data.awarded) return data;

    // Push toast
    const id = `xp_toast_${++toastIdRef.current}`;
    setToasts(prev => [...prev, { id, result: data, label: EVENT_LABELS[eventType] }]);

    return data;
  }, [user]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <XPContext.Provider value={{ awardXP }}>
      {children}
      <XPToastStack items={toasts} onDismiss={dismissToast} />
    </XPContext.Provider>
  );
}

export function useXP() {
  const ctx = useContext(XPContext);
  if (!ctx) throw new Error('useXP must be used within XPProvider');
  return ctx;
}
