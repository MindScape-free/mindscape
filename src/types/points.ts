export type PointEventType =
  | 'MAP_CREATED'
  | 'SUB_MAP_CREATED'
  | 'MAP_COMPARE'
  | 'MAP_MULTI_SOURCE'
  | 'EXPLANATION_OPENED'
  | 'EXPLANATION_COMPLETED'
  | 'CONFIDENCE_RATED'
  | 'CHAT_MESSAGE'
  | 'CHAT_PINNED'
  | 'QUIZ_COMPLETED'
  | 'QUIZ_BONUS_80'
  | 'QUIZ_PERFECT'
  | 'IMAGE_GENERATED'
  | 'AUDIO_GENERATED'
  | 'MAP_TRANSLATED'
  | 'MAP_PUBLISHED'
  | 'MAP_VIEWS_10'
  | 'MAP_CLONED'
  | 'DAILY_LOGIN'
  | 'STREAK_3'
  | 'STREAK_7'
  | 'STREAK_30'
  | 'STUDY_TIME_CANVAS'
  | 'STUDY_TIME_CHAT'
  | 'ACHIEVEMENT_BRONZE'
  | 'ACHIEVEMENT_SILVER'
  | 'ACHIEVEMENT_GOLD'
  | 'ACHIEVEMENT_PLATINUM';

export interface PointEvent {
  id: string;
  type: PointEventType;
  basePoints: number;
  bonusPoints: number;
  totalPoints: number;
  multiplier: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface PointLedger {
  totalPoints: number;
  level: number;
  rank: string;
  rankColor: string;
  currentStreak: number;
  multiplier: number;
  pointsToNextLevel: number;
  currentLevelPoints: number;   // points earned within current level
  currentLevelTarget: number;   // total points needed for this level
  lastActivityDate: string;     // YYYY-MM-DD
  updatedAt: number;
}

export interface DailyPointCaps {
  date: string; // YYYY-MM-DD
  caps: Partial<Record<PointEventType, number>>;
}

export interface PointHistoryEntry {
  date: string; // YYYY-MM-DD
  points: number;
}

export interface PointTransaction {
  id: string;
  type: PointEventType;
  basePoints: number;
  bonusPoints: number;
  totalPoints: number;
  multiplier: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export const EVENT_LABELS: Record<PointEventType, { label: string; icon: string; category: string }> = {
  MAP_CREATED:           { label: 'Mind Map Created',        icon: 'brain',       category: 'Maps' },
  SUB_MAP_CREATED:       { label: 'Sub-Map Created',          icon: 'git-branch',  category: 'Maps' },
  MAP_COMPARE:           { label: 'Comparison Map',           icon: 'git-compare', category: 'Maps' },
  MAP_MULTI_SOURCE:      { label: 'Multi-Source Map',        icon: 'layers',      category: 'Maps' },
  EXPLANATION_OPENED:    { label: 'Explanation Opened',       icon: 'book-open',   category: 'Learning' },
  EXPLANATION_COMPLETED: { label: 'Explanation Completed',   icon: 'check-circle', category: 'Learning' },
  CONFIDENCE_RATED:      { label: 'Confidence Rated',         icon: 'star',        category: 'Learning' },
  CHAT_MESSAGE:         { label: 'Chat Message',             icon: 'message-circle', category: 'Chat' },
  CHAT_PINNED:           { label: 'Message Pinned',           icon: 'pin',         category: 'Chat' },
  QUIZ_COMPLETED:        { label: 'Quiz Completed',          icon: 'help-circle', category: 'Quiz' },
  QUIZ_BONUS_80:         { label: 'Quiz Score 80%+',          icon: 'award',       category: 'Quiz' },
  QUIZ_PERFECT:         { label: 'Perfect Quiz Score',       icon: 'trophy',      category: 'Quiz' },
  IMAGE_GENERATED:       { label: 'Image Generated',          icon: 'image',       category: 'Content' },
  AUDIO_GENERATED:       { label: 'Audio Summary',            icon: 'volume-2',    category: 'Content' },
  MAP_TRANSLATED:        { label: 'Map Translated',           icon: 'globe',       category: 'Content' },
  MAP_PUBLISHED:         { label: 'Map Published',             icon: 'share-2',     category: 'Community' },
  MAP_VIEWS_10:           { label: 'Map Got 10 Views',         icon: 'eye',         category: 'Community' },
  MAP_CLONED:            { label: 'Map Cloned',                icon: 'copy',        category: 'Community' },
  DAILY_LOGIN:           { label: 'Daily Login',               icon: 'log-in',      category: 'Streak' },
  STREAK_3:              { label: '3-Day Streak',              icon: 'flame',       category: 'Streak' },
  STREAK_7:              { label: '7-Day Streak',              icon: 'flame',       category: 'Streak' },
  STREAK_30:             { label: '30-Day Streak',             icon: 'flame',       category: 'Streak' },
  STUDY_TIME_CANVAS:     { label: 'Canvas Study Time',         icon: 'pen-tool',    category: 'Study' },
  STUDY_TIME_CHAT:       { label: 'Chat Study Time',            icon: 'clock',       category: 'Study' },
  ACHIEVEMENT_BRONZE:    { label: 'Bronze Achievement',         icon: 'medal',       category: 'Achievement' },
  ACHIEVEMENT_SILVER:    { label: 'Silver Achievement',         icon: 'medal',       category: 'Achievement' },
  ACHIEVEMENT_GOLD:      { label: 'Gold Achievement',           icon: 'award',       category: 'Achievement' },
  ACHIEVEMENT_PLATINUM:  { label: 'Platinum Achievement',       icon: 'crown',       category: 'Achievement' },
};

export interface RankInfo {
  level: number;
  rank: string;
  color: string;         // tailwind text color
  bgColor: string;       // tailwind bg color
  borderColor: string;   // tailwind border color
  glowColor: string;     // tailwind shadow
  minPoints: number;
  maxPoints: number;     // -1 = no cap (max level)
}

export const RANKS: RankInfo[] = [
  { level: 1,  rank: 'Spark',      color: 'text-zinc-400',   bgColor: 'bg-zinc-500/10',   borderColor: 'border-zinc-500/30',   glowColor: 'shadow-zinc-500/20',   minPoints: 0,      maxPoints: 99 },
  { level: 2,  rank: 'Thinker',    color: 'text-blue-400',   bgColor: 'bg-blue-500/10',   borderColor: 'border-blue-500/30',   glowColor: 'shadow-blue-500/20',   minPoints: 100,    maxPoints: 299 },
  { level: 3,  rank: 'Explorer',   color: 'text-emerald-400',bgColor: 'bg-emerald-500/10',borderColor: 'border-emerald-500/30',glowColor: 'shadow-emerald-500/20',minPoints: 300,    maxPoints: 699 },
  { level: 4,  rank: 'Mapper',     color: 'text-violet-400', bgColor: 'bg-violet-500/10', borderColor: 'border-violet-500/30', glowColor: 'shadow-violet-500/20', minPoints: 700,    maxPoints: 1499 },
  { level: 5,  rank: 'Architect',  color: 'text-amber-400',  bgColor: 'bg-amber-500/10',  borderColor: 'border-amber-500/30',  glowColor: 'shadow-amber-500/20',  minPoints: 1500,   maxPoints: 2999 },
  { level: 6,  rank: 'Scholar',    color: 'text-sky-400',    bgColor: 'bg-sky-500/10',    borderColor: 'border-sky-500/30',    glowColor: 'shadow-sky-500/20',    minPoints: 3000,   maxPoints: 5999 },
  { level: 7,  rank: 'Sage',       color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30', glowColor: 'shadow-purple-500/20', minPoints: 6000,   maxPoints: 11999 },
  { level: 8,  rank: 'Luminary',   color: 'text-rose-400',   bgColor: 'bg-rose-500/10',   borderColor: 'border-rose-500/30',   glowColor: 'shadow-rose-500/20',   minPoints: 12000,  maxPoints: 24999 },
  { level: 9,  rank: 'Oracle',     color: 'text-orange-400', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30', glowColor: 'shadow-orange-500/20', minPoints: 25000,  maxPoints: 49999 },
  { level: 10, rank: 'MindMaster', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/30', glowColor: 'shadow-yellow-500/20', minPoints: 50000,  maxPoints: -1 },
];

export const POINT_VALUES: Record<PointEventType, number> = {
  MAP_CREATED:           20,
  SUB_MAP_CREATED:       15,
  MAP_COMPARE:           20,
  MAP_MULTI_SOURCE:      20,
  EXPLANATION_OPENED:     3,
  EXPLANATION_COMPLETED:  8,
  CONFIDENCE_RATED:       2,
  CHAT_MESSAGE:           2,
  CHAT_PINNED:            5,
  QUIZ_COMPLETED:        15,
  QUIZ_BONUS_80:         10,
  QUIZ_PERFECT:          20,
  IMAGE_GENERATED:        5,
  AUDIO_GENERATED:        8,
  MAP_TRANSLATED:        10,
  MAP_PUBLISHED:         20,
  MAP_VIEWS_10:           5,
  MAP_CLONED:            15,
  DAILY_LOGIN:            5,
  STREAK_3:              15,
  STREAK_7:              30,
  STREAK_30:            100,
  STUDY_TIME_CANVAS:      3,
  STUDY_TIME_CHAT:        2,
  ACHIEVEMENT_BRONZE:    25,
  ACHIEVEMENT_SILVER:    75,
  ACHIEVEMENT_GOLD:     200,
  ACHIEVEMENT_PLATINUM: 500,
};

// Max times each event can earn points per day (0 = unlimited)
export const DAILY_CAPS: Record<PointEventType, number> = {
  MAP_CREATED:           10,
  SUB_MAP_CREATED:        8,
  MAP_COMPARE:            5,
  MAP_MULTI_SOURCE:       5,
  EXPLANATION_OPENED:    30,
  EXPLANATION_COMPLETED: 20,
  CONFIDENCE_RATED:      50,
  CHAT_MESSAGE:          40,
  CHAT_PINNED:           20,
  QUIZ_COMPLETED:         5,
  QUIZ_BONUS_80:          5,
  QUIZ_PERFECT:           3,
  IMAGE_GENERATED:       20,
  AUDIO_GENERATED:       10,
  MAP_TRANSLATED:         5,
  MAP_PUBLISHED:          3,
  MAP_VIEWS_10:           0,
  MAP_CLONED:             0,
  DAILY_LOGIN:            1,
  STREAK_3:               1,
  STREAK_7:               1,
  STREAK_30:              1,
  STUDY_TIME_CANVAS:     30,
  STUDY_TIME_CHAT:       20,
  ACHIEVEMENT_BRONZE:     0,
  ACHIEVEMENT_SILVER:     0,
  ACHIEVEMENT_GOLD:       0,
  ACHIEVEMENT_PLATINUM:   0,
};

export function getRankForPoints(totalPoints: number): RankInfo {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (totalPoints >= RANKS[i].minPoints) return RANKS[i];
  }
  return RANKS[0];
}

export function getStreakMultiplier(streak: number): number {
  if (streak >= 100) return 2.0;
  if (streak >= 30)  return 1.5;
  if (streak >= 7)   return 1.2;
  return 1.0;
}
