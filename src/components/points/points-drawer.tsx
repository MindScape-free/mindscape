'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Zap, Flame, TrendingUp, Shield, X, 
  Brain, GitBranch, GitCompare, Layers,
  BookOpen, CheckCircle, Star, MessageCircle, Pin,
  HelpCircle, Award, Trophy, Image, Volume2, Globe,
  Share2, Eye, Copy, LogIn, PenTool, Clock,
  Medal, Crown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePoints } from '@/hooks/use-points';
import { usePointsHistory } from '@/hooks/use-points-history';
import { RankBadge } from '@/components/points/rank-badge';
import {
  getRankForPoints,
  RANKS,
  POINT_VALUES,
  DAILY_CAPS,
  PointEventType,
  EVENT_LABELS,
} from '@/types/points';
import { PointTransaction } from '@/types/points';

interface PointsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'progress' | 'earn' | 'history' | 'ranks';

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date();
  d.setMonth(d.getMonth() - i);
  return d;
});

const EARN_TABLE: { category: string; rows: { label: string; type: PointEventType; note?: string }[] }[] = [
  {
    category: 'Mind Maps',
    rows: [
      { label: 'Create any mind map', type: 'MAP_CREATED', note: 'Single, PDF, image, website, YouTube' },
      { label: 'Create sub-map', type: 'SUB_MAP_CREATED' },
      { label: 'Comparison map', type: 'MAP_COMPARE' },
      { label: 'Multi-source map', type: 'MAP_MULTI_SOURCE' },
      { label: 'Translate a map', type: 'MAP_TRANSLATED' },
      { label: 'Publish to community', type: 'MAP_PUBLISHED' },
    ],
  },
  {
    category: 'Learning',
    rows: [
      { label: 'Open explanation', type: 'EXPLANATION_OPENED' },
      { label: 'Complete explanation', type: 'EXPLANATION_COMPLETED' },
      { label: 'Rate confidence', type: 'CONFIDENCE_RATED' },
    ],
  },
  {
    category: 'Quiz',
    rows: [
      { label: 'Complete a quiz', type: 'QUIZ_COMPLETED' },
      { label: 'Score 80%+ bonus', type: 'QUIZ_BONUS_80' },
      { label: 'Perfect score bonus', type: 'QUIZ_PERFECT' },
    ],
  },
  {
    category: 'Chat',
    rows: [
      { label: 'Send chat message', type: 'CHAT_MESSAGE' },
      { label: 'Pin a message', type: 'CHAT_PINNED' },
    ],
  },
  {
    category: 'Content',
    rows: [
      { label: 'Generate AI image', type: 'IMAGE_GENERATED' },
      { label: 'Audio summary', type: 'AUDIO_GENERATED' },
    ],
  },
  {
    category: 'Streak & Login',
    rows: [
      { label: 'Daily login', type: 'DAILY_LOGIN' },
      { label: '3-day streak bonus', type: 'STREAK_3' },
      { label: '7-day streak bonus', type: 'STREAK_7' },
      { label: '30-day streak bonus', type: 'STREAK_30' },
    ],
  },
  {
    category: 'Study Time',
    rows: [
      { label: 'Every 10 min on canvas', type: 'STUDY_TIME_CANVAS' },
      { label: 'Every 10 min in chat', type: 'STUDY_TIME_CHAT' },
    ],
  },
];

const CATEGORY_EVENTS: { label: string; events: PointEventType[] }[] = [
  { label: 'Maps', events: ['MAP_CREATED', 'SUB_MAP_CREATED', 'MAP_COMPARE', 'MAP_MULTI_SOURCE'] },
  { label: 'Learning', events: ['EXPLANATION_OPENED', 'EXPLANATION_COMPLETED', 'CONFIDENCE_RATED'] },
  { label: 'Quiz', events: ['QUIZ_COMPLETED', 'QUIZ_BONUS_80', 'QUIZ_PERFECT'] },
  { label: 'Chat', events: ['CHAT_MESSAGE', 'CHAT_PINNED'] },
  { label: 'Content', events: ['IMAGE_GENERATED', 'AUDIO_GENERATED', 'MAP_TRANSLATED'] },
  { label: 'Streak', events: ['DAILY_LOGIN', 'STREAK_3', 'STREAK_7', 'STREAK_30'] },
];

const EVENT_ICONS: Record<string, React.ElementType> = {
  brain: Brain,
  'git-branch': GitBranch,
  'git-compare': GitCompare,
  layers: Layers,
  'book-open': BookOpen,
  'check-circle': CheckCircle,
  star: Star,
  'message-circle': MessageCircle,
  pin: Pin,
  'help-circle': HelpCircle,
  award: Award,
  trophy: Trophy,
  image: Image,
  'volume-2': Volume2,
  globe: Globe,
  'share-2': Share2,
  eye: Eye,
  copy: Copy,
  'log-in': LogIn,
  'pen-tool': PenTool,
  clock: Clock,
  medal: Medal,
  crown: Crown,
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Maps: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  Learning: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  Quiz: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  Chat: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
  Content: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
  Community: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  Streak: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  Study: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20' },
  Achievement: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
};

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function TransactionItem({ tx }: { tx: PointTransaction }) {
  const info = EVENT_LABELS[tx.type];
  const Icon = EVENT_ICONS[info.icon] ?? Zap;
  const colors = CATEGORY_COLORS[info.category] ?? CATEGORY_COLORS.Content;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors group">
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', colors.bg)}>
        <Icon className={cn('h-3.5 w-3.5', colors.text)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-zinc-200 truncate">{info.label}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={cn('text-[9px] font-medium px-1.5 py-0.5 rounded border', colors.bg, colors.text, colors.border)}>
            {info.category}
          </span>
          <span className="text-[10px] text-zinc-600">{formatTime(tx.timestamp)}</span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs font-bold text-white">+{tx.totalPoints}</p>
        {tx.multiplier > 1 && (
          <p className="text-[9px] text-amber-400">×{tx.multiplier}</p>
        )}
      </div>
    </div>
  );
}

export function PointsDialog({ isOpen, onClose }: PointsDialogProps) {
  const { ledger, dailyCaps, history, isLoading, xpPercent } = usePoints();
  const { history: txHistory, isLoading: txLoading, hasMore, loadMore } = usePointsHistory();
  const [tab, setTab] = useState<Tab>('progress');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const rankInfo = ledger ? getRankForPoints(ledger.totalPoints) : RANKS[0];
  const nextRank = RANKS[rankInfo.level] ?? null;

  const today = new Date().toISOString().split('T')[0];
  const todayPoints = history[today] ?? 0;

  const sparkData = useMemo(() => {
    const days: { date: string; points: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      days.push({ date: key, points: history[key] ?? 0 });
    }
    return days;
  }, [history]);

  const maxSpark = Math.max(...sparkData.map(d => d.points), 1);

  const filteredHistory = useMemo(() => {
    if (selectedMonth === 'all') return txHistory;
    const [year, month] = selectedMonth.split('-').map(Number);
    return txHistory
      .map(group => {
        const groupDate = new Date(group.date);
        if (groupDate.getFullYear() === year && groupDate.getMonth() === month - 1) {
          return group;
        }
        return null;
      })
      .filter((g): g is NonNullable<typeof g> => g !== null);
  }, [txHistory, selectedMonth]);

  const totalFilteredPoints = useMemo(() => {
    return filteredHistory.reduce((sum, group) => sum + group.totalPoints, 0);
  }, [filteredHistory]);

  const TABS: { id: Tab; label: string }[] = [
    { id: 'progress', label: 'My Progress' },
    { id: 'history', label: 'History' },
    { id: 'earn', label: 'How to Earn' },
    { id: 'ranks', label: 'Ranks' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg glassmorphism border-white/10 rounded-[2rem] p-0 overflow-hidden shadow-2xl max-h-[85vh]">
        <DialogTitle className="sr-only">XP & Rank</DialogTitle>
        <DialogDescription className="sr-only">Your points progress and earn guide</DialogDescription>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 border border-primary/20 rounded-md">
                <Zap className="h-3 w-3 text-primary" />
              </div>
              <span className="font-orbitron text-[10px] uppercase tracking-[0.2em] text-zinc-500">XP & Rank</span>
            </div>
          </div>

          {/* Rank + XP bar */}
          {ledger && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <RankBadge rankInfo={rankInfo} totalPoints={ledger.totalPoints} size="lg" />
                <div className="text-right">
                  <p className="text-xs text-zinc-500">Level {ledger.level}</p>
                  {ledger.currentStreak > 0 && (
                    <div className="flex items-center gap-1 justify-end mt-0.5">
                      <Flame className="h-3 w-3 text-orange-400" />
                      <span className="text-[10px] text-orange-400 font-bold">{ledger.currentStreak} day streak</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] text-zinc-600">
                  <span>{ledger.currentLevelPoints.toLocaleString()} XP</span>
                  <span>{nextRank ? `${ledger.pointsToNextLevel.toLocaleString()} to ${nextRank.rank}` : 'Max Level'}</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${xpPercent}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={cn('h-full rounded-full', rankInfo.bgColor.replace('/10', '/60'))}
                  />
                </div>
              </div>

              {ledger.multiplier > 1 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/8 border border-amber-500/15">
                  <Flame className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-[11px] text-amber-300 font-semibold">
                    {ledger.multiplier}× streak multiplier active
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mt-4 bg-white/5 rounded-xl p-1">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all',
                  tab === t.id
                    ? 'bg-white/10 text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <ScrollArea className="max-h-[calc(85vh-220px)] px-6 py-4">
          <AnimatePresence mode="wait">
            {/* ── Progress Tab ── */}
            {tab === 'progress' && (
              <motion.div
                key="progress"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-5"
              >
                {/* Today */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-black text-white">{todayPoints} XP</p>
                    <p className="text-[10px] text-zinc-600">earned today</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-sm font-black text-white">{ledger?.totalPoints.toLocaleString() ?? 0}</p>
                    <p className="text-[10px] text-zinc-600">total XP</p>
                  </div>
                </div>

                {/* 14-day sparkline */}
                <div>
                  <p className="font-orbitron text-[9px] uppercase tracking-widest text-zinc-600 mb-2">Last 14 Days</p>
                  <div className="flex items-end gap-1 h-12">
                    {sparkData.map((d, i) => {
                      const isToday = d.date === today;
                      const heightPct = d.points > 0 ? Math.max(8, (d.points / maxSpark) * 100) : 4;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center">
                          <div
                            className={cn(
                              'w-full rounded-sm transition-all',
                              isToday ? 'bg-primary' : d.points > 0 ? 'bg-white/20' : 'bg-white/5'
                            )}
                            style={{ height: `${heightPct}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Daily cap meters */}
                <div>
                  <p className="font-orbitron text-[9px] uppercase tracking-widest text-zinc-600 mb-3">Daily Caps</p>
                  <div className="space-y-2.5">
                    {CATEGORY_EVENTS.map(({ label, events }) => {
                      const totalCap = events.reduce((sum, e) => sum + (DAILY_CAPS[e] > 0 ? DAILY_CAPS[e] * POINT_VALUES[e] : 0), 0);
                      const usedPoints = events.reduce((sum, e) => {
                        const used = dailyCaps?.caps[e] ?? 0;
                        return sum + used * POINT_VALUES[e];
                      }, 0);
                      const pct = totalCap > 0 ? Math.min(100, Math.round((usedPoints / totalCap) * 100)) : 0;
                      return (
                        <div key={label} className="space-y-1">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-zinc-500">{label}</span>
                            <span className="text-zinc-600">{usedPoints}/{totalCap} XP</span>
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full transition-all', pct >= 100 ? 'bg-zinc-600' : 'bg-primary/60')}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Multipliers info */}
                <div className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <Shield className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Daily caps reset at midnight UTC. Streak multipliers (up to 2×) apply to every XP event while active.
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── History Tab ── */}
            {tab === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                {txLoading && txHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                      <Loader2 className="h-5 w-5 text-zinc-600 animate-spin" />
                    </div>
                    <p className="text-xs text-zinc-600">Loading your activity...</p>
                  </div>
                ) : txHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                      <Zap className="h-5 w-5 text-zinc-600" />
                    </div>
                    <p className="text-xs text-zinc-500">No activity yet</p>
                    <p className="text-[10px] text-zinc-600">Start creating mind maps to earn XP!</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-300 focus:outline-none focus:border-primary/50"
                      >
                        <option value="all">All Time</option>
                        {MONTH_OPTIONS.map((d) => {
                          const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                          const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                          return <option key={val} value={val}>{label}</option>;
                        })}
                      </select>
                      {selectedMonth !== 'all' && filteredHistory.length > 0 && (
                        <div className="px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-xs font-bold text-primary shrink-0">
                          +{totalFilteredPoints.toLocaleString()} XP
                        </div>
                      )}
                    </div>
                    {filteredHistory.map((group) => (
                      <div key={group.date} className="space-y-1">
                        <div className="flex items-center justify-between px-1">
                          <p className="font-orbitron text-[9px] uppercase tracking-widest text-zinc-600">{group.label}</p>
                          <p className="text-[10px] font-bold text-zinc-400">+{group.totalPoints} XP</p>
                        </div>
                        <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden divide-y divide-white/[0.03]">
                          {group.transactions.map((tx) => (
                            <TransactionItem key={tx.id} tx={tx} />
                          ))}
                        </div>
                      </div>
                    ))}

                    {filteredHistory.length === 0 && selectedMonth !== 'all' && (
                      <div className="flex flex-col items-center justify-center py-8 gap-2">
                        <p className="text-xs text-zinc-500">No activity in this period</p>
                      </div>
                    )}

                    {selectedMonth === 'all' && hasMore && (
                      <button
                        onClick={loadMore}
                        className="w-full py-2.5 rounded-xl border border-white/5 bg-white/[0.02] text-[11px] text-zinc-500 hover:text-zinc-300 hover:border-white/10 transition-all flex items-center justify-center gap-2"
                      >
                        <Loader2 className="h-3 w-3" />
                        Load more
                      </button>
                    )}

                    {selectedMonth === 'all' && !hasMore && txHistory.length > 0 && (
                      <p className="text-center text-[10px] text-zinc-700 py-2">You've reached the beginning of your journey</p>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {/* ── Earn Tab ── */}
            {tab === 'earn' && (
              <motion.div
                key="earn"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                {EARN_TABLE.map(({ category, rows }) => (
                  <div key={category} className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
                    <div className="px-4 py-2 border-b border-white/5">
                      <p className="font-orbitron text-[9px] uppercase tracking-widest text-zinc-600">{category}</p>
                    </div>
                    <div className="divide-y divide-white/5">
                      {rows.map(({ label, type, note }) => (
                        <div key={type} className="flex items-center justify-between px-4 py-2.5">
                          <div>
                            <p className="text-sm text-zinc-300">{label}</p>
                            {note && <p className="text-[10px] text-zinc-600 mt-0.5">{note}</p>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-3">
                            <span className="text-sm font-black text-white">+{POINT_VALUES[type]}</span>
                            {DAILY_CAPS[type] > 0 && (
                              <span className="text-[9px] text-zinc-600 bg-white/5 px-1.5 py-0.5 rounded">
                                /{DAILY_CAPS[type]}d
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {/* ── Ranks Tab ── */}
            {tab === 'ranks' && (
              <motion.div
                key="ranks"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-2"
              >
                {RANKS.map((r) => {
                  const isCurrent = ledger ? r.level === getRankForPoints(ledger.totalPoints).level : false;
                  return (
                    <div
                      key={r.level}
                      className={cn(
                        'flex items-center gap-4 px-4 py-3 rounded-xl border transition-all',
                        isCurrent
                          ? cn('border-white/15 bg-white/[0.05]', r.bgColor)
                          : 'border-white/5 bg-white/[0.02]'
                      )}
                    >
                      <span className="font-mono text-[11px] text-zinc-600 w-4">{r.level}</span>
                      <span className={cn('font-orbitron text-[11px] font-black', r.color)}>{r.rank}</span>
                      <div className="flex-1 flex items-center justify-center">
                        {isCurrent && (
                          <motion.span
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: [1, 1.15, 1], opacity: 1 }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            className={cn('text-[9px] font-black px-2 py-0.5 rounded-full border relative overflow-hidden', r.bgColor, r.color, r.borderColor)}
                          >
                            <motion.span
                              className="absolute inset-0 rounded-full opacity-40"
                              style={{ background: 'currentColor' }}
                              animate={{ scale: [1, 1.6], opacity: [0.3, 0] }}
                              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
                            />
                            <span className="relative z-10">YOU</span>
                          </motion.span>
                        )}
                      </div>
                      <span className="text-[11px] text-zinc-500 font-mono">
                        {r.minPoints.toLocaleString()}{r.maxPoints === -1 ? '+' : ''} XP
                      </span>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
