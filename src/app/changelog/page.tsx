'use client';

import { motion } from 'framer-motion';
import { CHANGELOG_DATA } from '@/lib/changelog-data';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Sparkles, ArrowUpRight, Rocket } from 'lucide-react';

const impactConfig = {
    major: { label: 'Major', dot: 'bg-purple-400', ring: 'ring-purple-500/30', text: 'text-purple-400' },
    minor: { label: 'Minor', dot: 'bg-blue-400', ring: 'ring-blue-500/30', text: 'text-blue-400' },
    patch: { label: 'Patch', dot: 'bg-zinc-500', ring: 'ring-zinc-500/30', text: 'text-zinc-400' },
};

export default function ChangelogPage() {
    return (
        <div className="min-h-screen bg-[#0A0A0A]">
            {/* Header */}
            <div className="max-w-4xl mx-auto px-6 pt-20 pb-16">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="flex items-center gap-2 mb-6">
                        <Rocket className="h-4 w-4 text-purple-400" />
                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Product Updates</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-3">
                        What&apos;s new in Mind<span className="text-purple-400">Scape</span>
                    </h1>
                    <p className="text-zinc-500 text-base max-w-xl">
                        Every improvement, feature, and fix — in one place.
                    </p>
                </motion.div>
            </div>

            {/* Timeline */}
            <div className="max-w-4xl mx-auto px-6 pb-24">
                <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-[7px] top-2 bottom-0 w-px bg-white/5" />

                    <div className="space-y-0">
                        {CHANGELOG_DATA.map((entry, idx) => {
                            const impact = impactConfig[entry.impact];
                            return (
                                <motion.div
                                    key={entry.slug}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.4, delay: idx * 0.07 }}
                                    className="relative pl-10 pb-14"
                                >
                                    {/* Dot */}
                                    <div className={cn(
                                        "absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full ring-4 ring-[#0A0A0A]",
                                        impact.dot,
                                        idx === 0 && "shadow-[0_0_12px_rgba(168,85,247,0.6)]"
                                    )} />

                                    {/* Date + version */}
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="text-xs text-zinc-600 font-mono">{entry.date}</span>
                                        <span className={cn("text-[10px] font-black uppercase tracking-widest", impact.text)}>
                                            {impact.label}
                                        </span>
                                        <span className="text-[10px] font-mono text-zinc-700">v{entry.version}</span>
                                        {idx === 0 && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/25 text-[10px] font-black text-purple-400 uppercase tracking-widest">
                                                <Sparkles className="h-2.5 w-2.5" /> Latest
                                            </span>
                                        )}
                                    </div>

                                    {/* Card */}
                                    <Link href={`/changelog/${entry.slug}`} className="group block">
                                        <div className="rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300 overflow-hidden">
                                            {/* Cover image */}
                                            <div className="relative h-44 overflow-hidden">
                                                <img
                                                    src={entry.coverImage}
                                                    alt={entry.title}
                                                    className="w-full h-full object-cover opacity-50 group-hover:opacity-70 group-hover:scale-[1.02] transition-all duration-500"
                                                    loading="lazy"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/40 to-transparent" />
                                            </div>

                                            {/* Body */}
                                            <div className="px-6 py-5">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <h2 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors leading-snug mb-2">
                                                            {entry.title}
                                                        </h2>
                                                        <p className="text-sm text-zinc-500 leading-relaxed line-clamp-2">
                                                            {entry.summary}
                                                        </p>
                                                    </div>
                                                    <ArrowUpRight className="h-4 w-4 text-zinc-700 group-hover:text-purple-400 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                                                </div>

                                                {/* Tags */}
                                                <div className="flex flex-wrap gap-1.5 mt-4">
                                                    {entry.tags.map(tag => (
                                                        <span
                                                            key={tag}
                                                            className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] text-zinc-500 uppercase tracking-widest font-bold"
                                                        >
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
