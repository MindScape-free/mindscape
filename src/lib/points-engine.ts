import {
  PointEventType, PointEvent, PointLedger, DailyPointCaps,
  POINT_VALUES, DAILY_CAPS, getRankForPoints, getStreakMultiplier,
} from '@/types/points';

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

function generateId(): string {
  return `pe_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

export interface AwardResult {
  awarded: boolean;
  points: number;
  totalPoints: number;
  level: number;
  rank: string;
  leveledUp: boolean;
  previousLevel: number;
  cappedOut: boolean;
}

const DEFAULT_LEDGER: PointLedger = {
  totalPoints: 0, level: 1, rank: 'Spark', rankColor: 'text-zinc-400',
  currentStreak: 0, multiplier: 1.0, pointsToNextLevel: 100,
  currentLevelPoints: 0, currentLevelTarget: 100, lastActivityDate: '', updatedAt: Date.now(),
};

export async function awardPoints(
  userId: string,
  eventType: PointEventType,
  metadata?: Record<string, any>
): Promise<AwardResult> {
  const { getSupabaseAdmin } = await import('@/lib/supabase-server');
  const supabase = getSupabaseAdmin();
  const today = todayString();

  const { data: existing } = await supabase.from('user_points').select('*').eq('user_id', userId).maybeSingle();

  const ledger: PointLedger = existing?.ledger || DEFAULT_LEDGER;
  const dailyData: DailyPointCaps = (existing?.daily_caps && existing.daily_caps.date === today)
    ? existing.daily_caps
    : { date: today, caps: {} };

  // Check daily cap
  const cap = DAILY_CAPS[eventType];
  const usedToday = dailyData.caps[eventType] ?? 0;
  if (cap > 0 && usedToday >= cap) {
    return { awarded: false, points: 0, totalPoints: ledger.totalPoints, level: ledger.level, rank: ledger.rank, leveledUp: false, previousLevel: ledger.level, cappedOut: true };
  }

  const basePoints = POINT_VALUES[eventType];
  const multiplier = getStreakMultiplier(ledger.currentStreak);
  const bonusPoints = Math.round(basePoints * (multiplier - 1));
  const totalEarned = basePoints + bonusPoints;

  // Update streak for DAILY_LOGIN
  let newStreak = ledger.currentStreak;
  if (eventType === 'DAILY_LOGIN') {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    if (ledger.lastActivityDate === yesterdayStr) newStreak = ledger.currentStreak + 1;
    else if (ledger.lastActivityDate !== today) newStreak = 1;
  }

  const previousLevel = ledger.level;
  const newTotal = ledger.totalPoints + totalEarned;
  const newRankInfo = getRankForPoints(newTotal);
  const leveledUp = newRankInfo.level > previousLevel;
  const pointsToNext = newRankInfo.level < 10 ? (newRankInfo.maxPoints + 1 - newTotal) : 0;
  const currentLevelPoints = newTotal - newRankInfo.minPoints;
  const currentLevelTarget = newRankInfo.maxPoints === -1 ? 0 : newRankInfo.maxPoints - newRankInfo.minPoints + 1;

  const updatedLedger: PointLedger = {
    totalPoints: newTotal, level: newRankInfo.level, rank: newRankInfo.rank,
    rankColor: newRankInfo.color, currentStreak: newStreak,
    multiplier: getStreakMultiplier(newStreak), pointsToNextLevel: pointsToNext,
    currentLevelPoints, currentLevelTarget, lastActivityDate: today, updatedAt: Date.now(),
  };

  const updatedDailyCaps: DailyPointCaps = {
    date: today,
    caps: { ...dailyData.caps, [eventType]: usedToday + 1 },
  };

  const historyDays = { ...(existing?.history_days || {}), [today]: ((existing?.history_days?.[today] || 0) + totalEarned) };

  await supabase.from('user_points').upsert({
    user_id: userId,
    ledger: updatedLedger,
    daily_caps: updatedDailyCaps,
    history_days: historyDays,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });

  // Log transaction
  const event: PointEvent = { id: generateId(), type: eventType, basePoints, bonusPoints, totalPoints: totalEarned, multiplier, timestamp: Date.now(), metadata };
  await supabase.from('point_transactions').insert({ user_id: userId, ...event });

  // Auto-fire streak bonuses
  if (eventType === 'DAILY_LOGIN' && newStreak > ledger.currentStreak) {
    const streakBonuses: Array<{ streak: number; type: PointEventType }> = [
      { streak: 3, type: 'STREAK_3' }, { streak: 7, type: 'STREAK_7' }, { streak: 30, type: 'STREAK_30' },
    ];
    for (const { streak, type } of streakBonuses) {
      if (newStreak === streak) { awardPoints(userId, type).catch(() => {}); break; }
    }
  }

  return { awarded: true, points: totalEarned, totalPoints: newTotal, level: newRankInfo.level, rank: newRankInfo.rank, leveledUp, previousLevel, cappedOut: false };
}
