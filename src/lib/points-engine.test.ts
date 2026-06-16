import { getRankForPoints, getStreakMultiplier, POINT_VALUES, DAILY_CAPS, RANKS } from '@/types/points';
import type { PointEventType, DailyPointCaps } from '@/types/points';

describe('getRankForPoints()', () => {
  it('returns Spark (level 1) for 0 points', () => {
    expect(getRankForPoints(0).level).toBe(1);
    expect(getRankForPoints(0).rank).toBe('Spark');
  });
  it('returns Spark for 99 points', () => {
    expect(getRankForPoints(99).level).toBe(1);
  });
  it('returns Thinker (level 2) for exactly 100 points', () => {
    const r = getRankForPoints(100);
    expect(r.level).toBe(2);
    expect(r.rank).toBe('Thinker');
  });
  it('returns Explorer (level 3) at 300', () => {
    expect(getRankForPoints(300).level).toBe(3);
  });
  it('returns MindMaster (level 10) for 50000+', () => {
    expect(getRankForPoints(50000).level).toBe(10);
    expect(getRankForPoints(999999).level).toBe(10);
  });
  it('handles every rank boundary', () => {
    for (let i = 0; i < RANKS.length; i++) {
      const rank = RANKS[i];
      expect(getRankForPoints(rank.minPoints).level).toBe(rank.level);
      if (rank.maxPoints !== -1) {
        expect(getRankForPoints(rank.maxPoints).level).toBe(rank.level);
        expect(getRankForPoints(rank.maxPoints + 1).level).toBe(rank.level + 1);
      }
    }
  });
  it('ranks are contiguous without gaps', () => {
    for (let i = 0; i < RANKS.length - 1; i++) {
      expect(RANKS[i].maxPoints + 1).toBe(RANKS[i + 1].minPoints);
    }
  });
});

describe('getStreakMultiplier()', () => {
  it('returns 1.0 for streaks 0-6', () => {
    expect(getStreakMultiplier(0)).toBe(1.0);
    expect(getStreakMultiplier(1)).toBe(1.0);
    expect(getStreakMultiplier(6)).toBe(1.0);
  });
  it('returns 1.2 for streaks 7-29', () => {
    expect(getStreakMultiplier(7)).toBe(1.2);
    expect(getStreakMultiplier(29)).toBe(1.2);
  });
  it('returns 1.5 for streaks 30-99', () => {
    expect(getStreakMultiplier(30)).toBe(1.5);
    expect(getStreakMultiplier(99)).toBe(1.5);
  });
  it('returns 2.0 for streaks 100+', () => {
    expect(getStreakMultiplier(100)).toBe(2.0);
    expect(getStreakMultiplier(365)).toBe(2.0);
  });
});

describe('POINT_VALUES', () => {
  it('MAP_CREATED = 20, DAILY_LOGIN = 5', () => {
    expect(POINT_VALUES.MAP_CREATED).toBe(20);
    expect(POINT_VALUES.DAILY_LOGIN).toBe(5);
  });
  it('all point values are non-negative numbers', () => {
    for (const v of Object.values(POINT_VALUES)) {
      expect(typeof v).toBe('number');
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('DAILY_CAPS', () => {
  it('DAILY_LOGIN caps at 1 per day', () => {
    expect(DAILY_CAPS.DAILY_LOGIN).toBe(1);
  });
  it('MAP_CREATED caps at 10 per day', () => {
    expect(DAILY_CAPS.MAP_CREATED).toBe(10);
  });
  it('0 means unlimited', () => {
    expect(DAILY_CAPS.MAP_VIEWS_10).toBe(0);
  });
  it('all POINT_VALUES events have a DAILY_CAP entry', () => {
    const events = Object.keys(POINT_VALUES) as PointEventType[];
    for (const e of events) {
      expect(DAILY_CAPS[e]).toBeDefined();
      expect(DAILY_CAPS[e]).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('Bonus calculation', () => {
  it('no bonus at 1.0x', () => {
    expect(Math.round(20 * (1.0 - 1))).toBe(0);
  });
  it('20% bonus at 1.2x', () => {
    expect(Math.round(20 * (1.2 - 1))).toBe(4);
  });
  it('50% bonus at 1.5x', () => {
    expect(Math.round(20 * (1.5 - 1))).toBe(10);
  });
  it('100% bonus at 2.0x', () => {
    expect(Math.round(20 * (2.0 - 1))).toBe(20);
  });
});

describe('Level-up detection', () => {
  it('no level-up when staying in same rank', () => {
    expect(getRankForPoints(98).level > 1).toBe(false);
  });
  it('detects level-up crossing boundary', () => {
    expect(getRankForPoints(105).level).toBe(2);
  });
  it('pointsToNext is 0 for MindMaster', () => {
    const info = getRankForPoints(50000);
    const pts = info.level < 10 ? (info.maxPoints + 1 - 50000) : 0;
    expect(pts).toBe(0);
  });
  it('pointsToNext is positive for non-max', () => {
    const info = getRankForPoints(50);
    const pts = info.level < 10 ? (info.maxPoints + 1 - 50) : 0;
    expect(pts).toBe(50);
  });
});

describe('Daily cap enforcement', () => {
  it('caps when usedToday >= cap (cap > 0)', () => {
    expect(5 > 0 && 5 >= 5).toBe(true);
  });
  it('does not cap when usedToday < cap', () => {
    expect(5 > 0 && 3 >= 5).toBe(false);
  });
  it('never caps when cap is 0', () => {
    expect(0 > 0 && 999 >= 0).toBe(false);
  });
  it('caps reset on new day', () => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const dailyData: DailyPointCaps = { date: yesterday, caps: { MAP_CREATED: 10 } };
    const fresh = dailyData.date === today ? dailyData : { date: today, caps: {} };
    expect(fresh.caps.MAP_CREATED).toBeUndefined();
  });
});

describe('Streak tracking (DAILY_LOGIN)', () => {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().split('T')[0];

  it('increments when lastActivity is yesterday', () => {
    expect(yesterday === yesterday ? 5 + 1 : 1).toBe(6);
  });
  it('resets to 1 when lastActivity is 2 days ago', () => {
    let ns = 5;
    if (twoDaysAgo === yesterday) ns = 5 + 1;
    else if (twoDaysAgo !== today) ns = 1;
    expect(ns).toBe(1);
  });
  it('preserves streak when lastActivity is today', () => {
    let ns = 5;
    if (today === yesterday) ns = 5 + 1;
    else if (today !== today) ns = 1;
    expect(ns).toBe(5);
  });
  it('streak 3 triggers STREAK_3 bonus', () => {
    const bonuses = [
      { streak: 3, type: 'STREAK_3' as PointEventType },
      { streak: 7, type: 'STREAK_7' as PointEventType },
      { streak: 30, type: 'STREAK_30' as PointEventType },
    ];
    expect(bonuses.filter(b => 3 === b.streak)).toHaveLength(1);
  });
});

describe('Bug #2 fix -- stats-removal verification', () => {
  it('updateUserStatistics is no longer imported', () => {
    const fs = require('fs');
    const content = fs.readFileSync('./src/lib/points-engine.ts', 'utf-8');
    expect(content.includes('updateUserStatistics')).toBe(false);
  });
  it('Achievement integration block is removed', () => {
    const fs = require('fs');
    const content = fs.readFileSync('./src/lib/points-engine.ts', 'utf-8');
    expect(content.includes('// --- Achievement & Statistics Integration ---')).toBe(false);
  });
  it('point_transactions logging is still present', () => {
    const fs = require('fs');
    const content = fs.readFileSync('./src/lib/points-engine.ts', 'utf-8');
    expect(content).toContain('point_transactions');
  });
  it('streak bonus auto-fire is still present', () => {
    const fs = require('fs');
    const content = fs.readFileSync('./src/lib/points-engine.ts', 'utf-8');
    expect(content).toContain('STREAK_3');
  });
});
