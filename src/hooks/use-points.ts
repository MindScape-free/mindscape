'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/lib/auth-context';
import { getSupabaseClient } from '@/lib/supabase-db';
import { PointLedger, DailyPointCaps } from '@/types/points';

const DEFAULT_LEDGER: PointLedger = {
  totalPoints: 0, level: 1, rank: 'Spark', rankColor: 'text-zinc-400',
  currentStreak: 0, multiplier: 1.0, pointsToNextLevel: 100,
  currentLevelPoints: 0, currentLevelTarget: 100, lastActivityDate: '', updatedAt: Date.now(),
};

export interface UsePointsReturn {
  ledger: PointLedger | null;
  dailyCaps: DailyPointCaps | null;
  history: Record<string, number>;
  isLoading: boolean;
  xpPercent: number;
}

export function usePoints(): UsePointsReturn {
  const { user, isUserLoading } = useUser();
  const [ledger, setLedger] = useState<PointLedger | null>(null);
  const [dailyCaps, setDailyCaps] = useState<DailyPointCaps | null>(null);
  const [history, setHistory] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) { setIsLoading(false); return; }

    const supabase = getSupabaseClient();

    const fetchPoints = async () => {
      const { data } = await supabase.from('user_points').select('*').eq('user_id', user.id).maybeSingle();
      if (data) {
        setLedger(data.ledger || DEFAULT_LEDGER);
        setDailyCaps(data.daily_caps || null);
        setHistory(data.history_days || {});
      } else {
        setLedger(DEFAULT_LEDGER);
      }
      setIsLoading(false);
    };

    fetchPoints();

    const channel = supabase
      .channel(`points-${user.id}-${Math.random().toString(36).substring(7)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_points', filter: `user_id=eq.${user.id}` }, (payload) => {
        const data = payload.new as any;
        if (data) {
          setLedger(data.ledger || DEFAULT_LEDGER);
          setDailyCaps(data.daily_caps || null);
          setHistory(data.history_days || {});
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, isUserLoading]);

  const xpPercent = ledger
    ? ledger.currentLevelTarget > 0
      ? Math.min(100, Math.round((ledger.currentLevelPoints / ledger.currentLevelTarget) * 100))
      : 100
    : 0;

  return { ledger, dailyCaps, history, isLoading, xpPercent };
}
