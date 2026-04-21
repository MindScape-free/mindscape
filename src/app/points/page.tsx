'use client';

import { motion } from 'framer-motion';
import { Zap, Flame, Shield, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RANKS, POINT_VALUES, DAILY_CAPS, PointEventType } from '@/types/points';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: 'easeOut' },
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
      { label: 'Open explanation dialog', type: 'EXPLANATION_OPENED' },
      { label: 'Complete explanation', type: 'EXPLANATION_COMPLETED', note: 'View all sections' },
      { label: 'Rate your confidence', type: 'CONFIDENCE_RATED' },
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
      { label: 'Send a chat message', type: 'CHAT_MESSAGE' },
      { label: 'Pin a message', type: 'CHAT_PINNED' },
    ],
  },
  {
    category: 'Content',
    rows: [
      { label: 'Generate AI image', type: 'IMAGE_GENERATED' },
      { label: 'Generate audio summary', type: 'AUDIO_GENERATED' },
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
  {
    category: 'Achievements',
    rows: [
      { label: 'Unlock bronze achievement', type: 'ACHIEVEMENT_BRONZE' },
      { label: 'Unlock silver achievement', type: 'ACHIEVEMENT_SILVER' },
      { label: 'Unlock gold achievement', type: 'ACHIEVEMENT_GOLD' },
      { label: 'Unlock platinum achievement', type: 'ACHIEVEMENT_PLATINUM' },
    ],
  },
];

const MULTIPLIERS = [
  { condition: '7+ day streak', multiplier: '1.2×', color: 'text-amber-400' },
  { condition: '30+ day streak', multiplier: '1.5×', color: 'text-orange-400' },
  { condition: '100+ day streak', multiplier: '2.0×', color: 'text-rose-400' },
];

const FAQS = [
  { q: 'Do I lose points?', a: 'No. Points only go up. Breaking a streak removes the multiplier bonus but never deducts earned XP.' },
  { q: 'What do points unlock?', a: 'Right now, ranks and badges. Future updates will add profile customization, early feature access, and community perks.' },
  { q: 'Why are there daily caps?', a: 'Caps keep the system fair. Without them, someone could spam 500 maps in a day and skip 10 levels. Caps mean consistent daily use beats one-day farming.' },
  { q: 'Can I see my full history?', a: 'Yes — your profile page shows a 90-day XP chart and daily breakdown by category.' },
  { q: 'When do streak bonuses apply?', a: 'The multiplier applies to every point you earn while the streak is active, not just login points.' },
];

export default function PointsPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Hero */}
      <section className="relative max-w-4xl mx-auto px-6 pt-24 pb-16 text-center overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[500px] h-[250px] bg-primary/10 blur-[100px] rounded-full" />
        </div>
        <motion.div {...fade(0)} className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-black tracking-[0.15em] uppercase mb-8">
            <Zap className="w-3 h-3" />
            XP System
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-[1.1] mb-5">
            Every action<br />
            <span className="text-primary">earns XP.</span>
          </h1>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto leading-relaxed">
            MindScape rewards real learning. Create maps, study nodes, complete quizzes, maintain streaks — every action moves you up the ranks.
          </p>
        </motion.div>
      </section>

      {/* Earn table */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <motion.div {...fade(0.1)}>
          <p className="font-orbitron text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-3">How to earn</p>
          <h2 className="text-3xl font-black mb-8">Point Events</h2>
          <div className="space-y-6">
            {EARN_TABLE.map(({ category, rows }) => (
              <div key={category} className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
                <div className="px-5 py-3 border-b border-white/5 bg-white/[0.02]">
                  <p className="font-orbitron text-[10px] uppercase tracking-widest text-zinc-500">{category}</p>
                </div>
                <div className="divide-y divide-white/5">
                  {rows.map(({ label, type, note }) => (
                    <div key={type} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-sm text-zinc-300">{label}</p>
                        {note && <p className="text-[11px] text-zinc-600 mt-0.5">{note}</p>}
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        <span className="text-sm font-black text-white">+{POINT_VALUES[type]} XP</span>
                        {DAILY_CAPS[type] > 0 && (
                          <span className="text-[10px] text-zinc-600 bg-white/5 px-2 py-0.5 rounded-md">
                            max {DAILY_CAPS[type]}/day
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Multipliers */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <motion.div {...fade(0.15)}>
          <p className="font-orbitron text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-3">Streak bonuses</p>
          <h2 className="text-3xl font-black mb-8">Multipliers</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {MULTIPLIERS.map((m) => (
              <div key={m.condition} className="rounded-xl border border-white/5 bg-white/[0.02] p-5 flex items-center gap-4">
                <Flame className={cn('h-6 w-6 shrink-0', m.color)} />
                <div>
                  <p className={cn('text-2xl font-black', m.color)}>{m.multiplier}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{m.condition}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-zinc-600 mt-4 leading-relaxed">
            Multipliers apply to every XP event while active — not just login points. A 30-day streak turns a +20 XP map into +30 XP automatically.
          </p>
        </motion.div>
      </section>

      {/* Ranks table */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <motion.div {...fade(0.2)}>
          <p className="font-orbitron text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-3">Progression</p>
          <h2 className="text-3xl font-black mb-8">Ranks & Levels</h2>
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
            <div className="grid grid-cols-3 px-5 py-3 border-b border-white/5 bg-white/[0.02]">
              <p className="font-orbitron text-[10px] uppercase tracking-widest text-zinc-600">Level</p>
              <p className="font-orbitron text-[10px] uppercase tracking-widest text-zinc-600">Rank</p>
              <p className="font-orbitron text-[10px] uppercase tracking-widest text-zinc-600 text-right">XP Required</p>
            </div>
            <div className="divide-y divide-white/5">
              {RANKS.map((r) => (
                <div key={r.level} className="grid grid-cols-3 items-center px-5 py-3">
                  <span className="text-sm text-zinc-500 font-mono">{r.level}</span>
                  <span className={cn('text-sm font-black font-orbitron', r.color)}>{r.rank}</span>
                  <span className="text-sm text-zinc-400 text-right">
                    {r.minPoints.toLocaleString()}{r.maxPoints === -1 ? '+' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Anti-abuse transparency */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <motion.div {...fade(0.25)} className="rounded-2xl border border-white/5 bg-white/[0.02] p-7 flex gap-5">
          <Shield className="h-6 w-6 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-white mb-2">Fair by design</p>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Every event type has a daily cap. This prevents farming — you can't earn unlimited XP by spamming maps or chat messages. The cap resets at midnight UTC. Consistent daily use always beats one-day grinding.
            </p>
          </div>
        </motion.div>
      </section>

      {/* FAQ */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <motion.div {...fade(0.3)}>
          <p className="font-orbitron text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-3">Questions</p>
          <h2 className="text-3xl font-black mb-8">FAQ</h2>
          <div className="space-y-px">
            {FAQS.map((faq, i) => (
              <div key={i} className="p-5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.03] transition-colors space-y-2">
                <p className="text-sm font-bold text-white">{faq.q}</p>
                <p className="text-sm text-zinc-500 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <motion.div {...fade(0.35)} className="relative rounded-2xl border border-white/5 overflow-hidden p-10 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/8 via-transparent to-transparent pointer-events-none" />
          <div className="relative z-10 space-y-4">
            <h2 className="text-2xl font-black">Start earning XP now</h2>
            <p className="text-zinc-500 text-sm">Generate your first map and watch the XP roll in.</p>
            <Link href="/">
              <Button className="rounded-2xl px-7 h-11 bg-primary hover:bg-primary/90 text-white font-bold gap-2 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                Generate a Map <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
