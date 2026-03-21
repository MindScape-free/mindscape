'use client';

import { useParams, notFound } from 'next/navigation';
import { motion } from 'framer-motion';
import { CHANGELOG_DATA } from '@/lib/changelog-data';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

const impactConfig = {
    major: { label: 'Major', text: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
    minor: { label: 'Minor', text: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    patch: { label: 'Patch', text: 'text-zinc-400', bg: 'bg-zinc-500/10 border-zinc-500/20' },
};

export default function ChangelogArticlePage() {
    const params = useParams();
    const slug = params.slug as string;

    const entryIndex = CHANGELOG_DATA.findIndex(e => e.slug === slug);
    if (entryIndex === -1) notFound();

    const entry = CHANGELOG_DATA[entryIndex];
    const impact = impactConfig[entry.impact];
    const prevEntry = entryIndex < CHANGELOG_DATA.length - 1 ? CHANGELOG_DATA[entryIndex + 1] : null;
    const nextEntry = entryIndex > 0 ? CHANGELOG_DATA[entryIndex - 1] : null;

    return (
        <div className="min-h-screen bg-[#0A0A0A]">
            {/* Cover */}
            <div className="relative h-[280px] md:h-[360px] overflow-hidden">
                <img
                    src={entry.coverImage}
                    alt={entry.title}
                    className="w-full h-full object-cover opacity-40"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/50 to-transparent" />
                <div className="absolute top-6 left-6">
                    <Link
                        href="/changelog"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white transition-colors uppercase tracking-widest"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Changelog
                    </Link>
                </div>
            </div>

            {/* Article */}
            <div className="max-w-2xl mx-auto px-6 -mt-16 relative z-10 pb-24">
                <motion.article
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-2.5 mb-6">
                        <span className={cn("inline-flex items-center px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest", impact.text, impact.bg)}>
                            {impact.label}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-600 bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg">
                            v{entry.version}
                        </span>
                        <span className="text-xs text-zinc-600">{entry.date}</span>
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight mb-4">
                        {entry.title}
                    </h1>

                    {/* Summary */}
                    <p className="text-base text-zinc-400 leading-relaxed mb-8 border-l-2 border-purple-500/40 pl-4">
                        {entry.summary}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-10">
                        {entry.tags.map(tag => (
                            <span
                                key={tag}
                                className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-[10px] text-zinc-500 uppercase tracking-widest font-bold"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>

                    {/* Highlights */}
                    <div className="mb-12">
                        <div className="flex items-center gap-2 mb-5">
                            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400">Key Highlights</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {entry.highlights.map((item, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: 0.1 + idx * 0.08 }}
                                    className="flex gap-3.5 p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors"
                                >
                                    <div className={cn("shrink-0 w-9 h-9 rounded-lg flex items-center justify-center", item.color)}>
                                        <item.icon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-zinc-200 mb-1">{item.title}</p>
                                        <p className="text-xs text-zinc-500 leading-relaxed">{item.description}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-white/5 mb-10" />

                    {/* Body content */}
                    <div className="space-y-5">
                        {entry.content.map((paragraph, idx) => {
                            if (paragraph.startsWith('## ')) {
                                return (
                                    <h2 key={idx} className="text-xl font-black text-white pt-4 tracking-tight">
                                        {paragraph.replace('## ', '')}
                                    </h2>
                                );
                            }
                            return (
                                <p key={idx} className="text-[15px] text-zinc-400 leading-[1.85]">
                                    {paragraph}
                                </p>
                            );
                        })}
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-white/5 my-12" />

                    {/* Prev / Next */}
                    <div className="grid grid-cols-2 gap-4">
                        {prevEntry ? (
                            <Link href={`/changelog/${prevEntry.slug}`} className="group">
                                <div className="p-4 rounded-xl border border-white/5 hover:border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all">
                                    <div className="flex items-center gap-1 text-zinc-600 text-[10px] uppercase tracking-widest font-bold mb-2">
                                        <ChevronLeft className="h-3 w-3" /> Older
                                    </div>
                                    <p className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors truncate">{prevEntry.title}</p>
                                    <span className="text-[10px] text-zinc-600 font-mono">v{prevEntry.version}</span>
                                </div>
                            </Link>
                        ) : <div />}

                        {nextEntry ? (
                            <Link href={`/changelog/${nextEntry.slug}`} className="group">
                                <div className="p-4 rounded-xl border border-white/5 hover:border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all text-right">
                                    <div className="flex items-center justify-end gap-1 text-zinc-600 text-[10px] uppercase tracking-widest font-bold mb-2">
                                        Newer <ChevronRight className="h-3 w-3" />
                                    </div>
                                    <p className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors truncate">{nextEntry.title}</p>
                                    <span className="text-[10px] text-zinc-600 font-mono">v{nextEntry.version}</span>
                                </div>
                            </Link>
                        ) : <div />}
                    </div>
                </motion.article>
            </div>
        </div>
    );
}
