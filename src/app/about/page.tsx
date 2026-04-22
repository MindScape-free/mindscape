'use client';

import { motion } from 'framer-motion';
import {
    Brain, Zap, Globe, Youtube, FileText, Image as ImageIcon,
    MessageSquare, BookOpen, ArrowRight, Sparkles, Network,
    GraduationCap, Layers, GitCompareArrows, Mic
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const fade = (delay = 0) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay, ease: 'easeOut' },
});

const SOURCES = [
    { icon: FileText, label: 'PDFs', color: 'text-blue-400 bg-blue-500/10' },
    { icon: Globe, label: 'Websites', color: 'text-emerald-400 bg-emerald-500/10' },
    { icon: Youtube, label: 'YouTube', color: 'text-red-400 bg-red-500/10' },
    { icon: ImageIcon, label: 'Images', color: 'text-amber-400 bg-amber-500/10' },
    { icon: FileText, label: 'Text', color: 'text-violet-400 bg-violet-500/10' },
];

const FEATURES = [
    {
        icon: Network,
        color: 'text-violet-400 bg-violet-500/10',
        title: 'Infinite Nesting',
        description: 'Drill into any node to generate a full sub-map. Navigate back with breadcrumbs. There is no depth limit.',
    },
    {
        icon: GitCompareArrows,
        color: 'text-sky-400 bg-sky-500/10',
        title: 'Topic Comparison',
        description: 'Place two concepts side by side. MindScape surfaces shared ground, key differences, and synthesis insights.',
    },
    {
        icon: MessageSquare,
        color: 'text-pink-400 bg-pink-500/10',
        title: 'MindSpark Chat',
        description: 'An AI assistant that reads your current map. Ask follow-up questions, request examples, or go deeper on any node.',
    },
    {
        icon: GraduationCap,
        color: 'text-emerald-400 bg-emerald-500/10',
        title: 'Adaptive Quizzes',
        description: 'Auto-generated quizzes from your map. Weak areas get more questions. Strong areas get reinforced.',
    },
    {
        icon: Layers,
        color: 'text-amber-400 bg-amber-500/10',
        title: 'Multi-Source Mode',
        description: 'Combine a PDF, a URL, and a YouTube video into one unified map. All sources merged, one knowledge graph.',
    },
    {
        icon: Mic,
        color: 'text-rose-400 bg-rose-500/10',
        title: 'Audio Summaries',
        description: 'Turn any map into a spoken summary. Listen while commuting, exercising, or reviewing before an exam.',
    },
];

const PRINCIPLES = [
    {
        number: '01',
        title: 'Honest AI',
        body: 'We use free, open models via Pollinations.ai. No hidden costs, no locked features behind paywalls. The AI works for you, not the other way around.',
    },
    {
        number: '02',
        title: 'Your data, your maps',
        body: 'Maps are stored in your Supabase account. You can export, share, or delete everything at any time. We do not train on your content.',
    },
    {
        number: '03',
        title: 'Speed over ceremony',
        body: 'No onboarding flows, no tutorial gates. Paste a topic, hit generate, get a map. Every feature is one click away from the canvas.',
    },
];

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white">
            {/* Hero */}
            <section className="relative max-w-4xl mx-auto px-6 pt-24 pb-20 text-center overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-[600px] h-[300px] bg-primary/15 blur-[120px] rounded-full" />
                </div>

                <motion.div {...fade(0)} className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold tracking-[0.15em] uppercase mb-8">
                        <Sparkles className="w-3 h-3" />
                        About MindScape
                    </div>

                    <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-[1.1] mb-6">
                        Turn anything you read<br />
                        <span className="text-primary">into a map you understand.</span>
                    </h1>

                    <p className="text-zinc-400 text-lg max-w-2xl mx-auto leading-relaxed">
                        MindScape is an AI-powered knowledge mapping tool built for people who learn by seeing connections — not by reading walls of text.
                    </p>
                </motion.div>
            </section>

            {/* The honest origin */}
            <section className="max-w-3xl mx-auto px-6 pb-24">
                <motion.div {...fade(0.1)} className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 md:p-10 space-y-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-600">The Origin</p>
                    <p className="text-zinc-300 text-base leading-[1.9]">
                        MindScape started as a personal frustration. Studying for exams, reading research papers, watching long YouTube lectures — the information was there, but retaining the structure of it was hard. Linear notes captured words, not relationships.
                    </p>
                    <p className="text-zinc-400 text-base leading-[1.9]">
                        The idea was simple: what if you could drop any source — a PDF, a URL, a video — and get back a visual map of how the ideas connect? Not a summary. A <em>structure</em>. Something you could explore, drill into, and quiz yourself on.
                    </p>
                    <p className="text-zinc-400 text-base leading-[1.9]">
                        That is what MindScape is. A single-person project, built in public, using free AI models, with no VC funding and no growth hacks. Just a tool that tries to be genuinely useful.
                    </p>
                </motion.div>
            </section>

            {/* Sources */}
            <section className="max-w-4xl mx-auto px-6 pb-24">
                <motion.div {...fade(0.15)}>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-3">What you can feed it</p>
                    <h2 className="text-3xl font-black mb-10">Any source. One map.</h2>
                    <div className="flex flex-wrap gap-3">
                        {SOURCES.map((s, i) => (
                            <div key={i} className={cn('flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-white/8 bg-white/[0.03]', s.color.split(' ')[0])}>
                                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', s.color.split(' ')[1])}>
                                    <s.icon className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-sm font-semibold text-zinc-200">{s.label}</span>
                            </div>
                        ))}
                        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-white/8 bg-white/[0.03] text-zinc-500 text-sm font-semibold">
                            + combine multiple at once
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* Features grid */}
            <section className="max-w-4xl mx-auto px-6 pb-24">
                <motion.div {...fade(0.2)}>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-3">What it does</p>
                    <h2 className="text-3xl font-black mb-10">Built for deep learning.</h2>
                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {FEATURES.map((f, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.25 + i * 0.06, duration: 0.4 }}
                                className="rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-all p-5 space-y-3"
                            >
                                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', f.color.split(' ')[1])}>
                                    <f.icon className={cn('w-4 h-4', f.color.split(' ')[0])} />
                                </div>
                                <p className="text-sm font-bold text-white">{f.title}</p>
                                <p className="text-xs text-zinc-500 leading-relaxed">{f.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </section>

            {/* Principles */}
            <section className="max-w-4xl mx-auto px-6 pb-24">
                <motion.div {...fade(0.3)}>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-3">How we build</p>
                    <h2 className="text-3xl font-black mb-10">Principles, not promises.</h2>
                    <div className="space-y-px">
                        {PRINCIPLES.map((p, i) => (
                            <div key={i} className="flex gap-6 p-6 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.03] transition-colors">
                                <span className="font-mono text-[11px] text-zinc-700 pt-0.5 shrink-0">{p.number}</span>
                                <div className="space-y-1.5">
                                    <p className="text-sm font-bold text-white">{p.title}</p>
                                    <p className="text-sm text-zinc-500 leading-relaxed">{p.body}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </section>

            {/* Tech stack callout */}
            <section className="max-w-4xl mx-auto px-6 pb-24">
                <motion.div {...fade(0.35)} className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 md:p-10">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-4">Under the hood</p>
                    <div className="grid sm:grid-cols-2 gap-x-12 gap-y-3 text-sm">
                        {[
                            ['Framework', 'Next.js 16 App Router'],
                            ['Language', 'TypeScript (strict)'],
                            ['Styling', 'Tailwind CSS + Framer Motion'],
                            ['Database', 'Supabase Postgres'],
                            ['Auth', 'Supabase Auth'],
                            ['AI Provider', 'Pollinations.ai (free models)'],
                            ['AI Models', 'Gemini, GPT-4o, Claude, DeepSeek'],
                            ['Deployment', 'Vercel'],
                        ].map(([label, value]) => (
                            <div key={label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                <span className="text-zinc-600 font-medium">{label}</span>
                                <span className="text-zinc-300 font-semibold">{value}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </section>

            {/* CTA */}
            <section className="max-w-4xl mx-auto px-6 pb-24">
                <motion.div {...fade(0.4)} className="relative rounded-2xl border border-white/5 overflow-hidden p-10 md:p-14 text-center">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />
                    <div className="relative z-10 space-y-5">
                        <h2 className="text-3xl md:text-4xl font-black tracking-tight">
                            Start with any topic.
                        </h2>
                        <p className="text-zinc-400 max-w-md mx-auto text-base leading-relaxed">
                            No account required to try. Paste a topic, generate a map, see if it clicks.
                        </p>
                        <Link href="/">
                            <Button size="lg" className="rounded-2xl px-8 h-12 bg-primary hover:bg-primary/90 text-white font-bold gap-2 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all mt-2">
                                Generate a Map
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </Link>
                    </div>
                </motion.div>
            </section>
        </div>
    );
}
