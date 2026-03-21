'use client';

import { Globe, ExternalLink, Youtube, FileText, Video, BookOpen, GraduationCap, Figma, Image as ImageIcon } from 'lucide-react';
import type { SearchSource, SearchImage } from '@/types/mind-map';
import { motion } from 'framer-motion';

interface SearchReferencesPanelProps {
    sources?: SearchSource[];
    images?: SearchImage[];
    timestamp?: string;
}

/**
 * Gets a brand-specific icon and color for common research domains
 */
function getDomainMeta(url: string) {
    const hostname = new URL(url).hostname.toLowerCase();

    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
        return { icon: Youtube, color: 'text-red-500', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20' };
    }
    if (hostname.includes('figma.com')) {
        return { icon: Figma, color: 'text-purple-500', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/20' };
    }
    if (hostname.includes('coursera.org') || hostname.includes('udemy.com')) {
        return { icon: GraduationCap, color: 'text-blue-500', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20' };
    }
    if (hostname.includes('medium.com') || hostname.includes('substack.com')) {
        return { icon: BookOpen, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20' };
    }
    if (hostname.includes('docs.') || hostname.includes('github.com')) {
        return { icon: FileText, color: 'text-blue-400', bgColor: 'bg-blue-400/10', borderColor: 'border-blue-400/20' };
    }

    return { icon: Globe, color: 'text-primary', bgColor: 'bg-primary/10', borderColor: 'border-primary/20' };
}

/**
 * Displays search sources/references for mind maps generated with web search enabled.
 * Redesigned with a premium grid layout and domain-aware styling.
 */
export function SearchReferencesPanel({ sources, images, timestamp }: SearchReferencesPanelProps) {
    if ((!sources || sources.length === 0) && (!images || images.length === 0)) return null;

    return (
        <aside className="mt-6 relative py-6 px-4 sm:px-0">
            {/* Background Aesthetic Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

            <div className="flex items-center gap-2 mb-6">
                <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 backdrop-blur-md">
                    <Globe className="w-4 h-4 text-primary animate-pulse" />
                </div>
                <div>
                    <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-white/90">
                        Live Universe
                    </h3>
                    <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mt-0.5">
                        Real-time Source Citations
                    </p>
                </div>
                {timestamp && (
                    <div className="ml-auto px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-mono text-zinc-400">
                        SYNCED: {new Date(timestamp).toLocaleDateString()}
                    </div>
                )}
            </div>

            {/* Visual Universe Section */}
            {images && images.length > 0 && (
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-3 px-1">
                        <ImageIcon className="w-3 h-3 text-purple-400 opacity-60" />
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                            Visual Universe
                        </h4>
                        <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent ml-2" />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {images.map((image, idx) => (
                            <motion.a
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                key={idx}
                                href={image.sourceUrl || image.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group relative aspect-square rounded-xl overflow-hidden bg-zinc-900/50 border border-white/5 hover:border-purple-500/40 transition-all duration-300"
                            >
                                <img
                                    src={image.url}
                                    alt={image.title || 'Research visual'}
                                    className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"
                                    loading="lazy"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2">
                                    <p className="text-[8px] font-bold text-white truncate">
                                        {image.title || 'View Source'}
                                    </p>
                                </div>
                            </motion.a>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-1">
                {sources?.map((source, index) => {
                    const { icon: DomainIcon, color, bgColor, borderColor } = getDomainMeta(source.url);
                    const hostname = new URL(source.url).hostname.replace('www.', '');
                    const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;

                    return (
                        <motion.a
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.03 }}
                            key={`${source.url}-${index}`}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group block relative"
                        >
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/40 border border-white/5 backdrop-blur-md group-hover:bg-zinc-800/60 group-hover:border-primary/40 transition-all duration-300">
                                <div className="relative flex-shrink-0">
                                    <img
                                        src={faviconUrl}
                                        alt=""
                                        className="w-6 h-6 rounded-lg px-0.5 bg-white/5 border border-white/10"
                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                    />
                                    <div className={`absolute -bottom-1 -right-1 p-0.5 rounded-sm border ${bgColor} ${borderColor}`}>
                                        <DomainIcon className={`w-2 h-2 ${color}`} />
                                    </div>
                                </div>

                                <div className="min-w-0 flex-1">
                                    <h4 className="text-[12px] font-bold text-white group-hover:text-primary transition-colors truncate">
                                        {source.title}
                                    </h4>
                                    <p className="text-[10px] font-medium text-zinc-500 truncate uppercase tracking-tight">
                                        {hostname}
                                    </p>
                                </div>

                                <ExternalLink className="w-3 h-3 text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                            </div>
                        </motion.a>
                    );
                })}
            </div>
        </aside>
    );
}
