'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PartyPopper, ArrowRight, ExternalLink } from 'lucide-react';
import { CHANGELOG_DATA, CURRENT_VERSION, STORAGE_KEY } from '@/lib/changelog-data';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function ChangelogDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const [hasChecked, setHasChecked] = useState(false);

    useEffect(() => {
        // Check local storage on mount
        const lastSeenVersion = localStorage.getItem(STORAGE_KEY);

        if (lastSeenVersion !== CURRENT_VERSION) {
            // Small delay for better UX (don't pop up immediately on load)
            const timer = setTimeout(() => {
                setIsOpen(true);
            }, 1500);
            return () => clearTimeout(timer);
        }

        setHasChecked(true);
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
    };

    // Allow manual trigger via custom event or global state if needed later
    // For now, it just auto-shows on new version.

    if (!CHANGELOG_DATA.length) return null;
    const latest = CHANGELOG_DATA[0];

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-[#0a0a0b] border-zinc-800 text-white gap-0 shadow-2xl">

                {/* Header with Gradient Background */}
                <div className="relative p-6 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-blue-900/20 to-transparent pointer-events-none" />
                    <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-1/3 -translate-y-1/3">
                        <PartyPopper className="w-32 h-32 text-purple-500" />
                    </div>

                    <DialogHeader className="relative z-10 space-y-2 text-left">
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="bg-purple-500/10 text-purple-300 border-purple-500/30 backdrop-blur-md px-2 py-0.5 text-[10px] uppercase tracking-widest font-bold">
                                New Update
                            </Badge>
                            <span className="text-xs text-zinc-500 font-mono tracking-tight">v{latest.version}</span>
                        </div>
                        <DialogTitle className="text-2xl font-black tracking-tight text-white">
                            {latest.title}
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400 text-sm">
                            We've just pushed some updates to improve your experience. Here's what's new.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {/* Content Scroll Area */}
                <ScrollArea className="max-h-[60vh] px-6 pb-2">
                    <div className="space-y-4 py-2">
                        {latest.highlights.map((item, idx) => (
                            <Link key={idx} href={`/changelog/${latest.slug}`} onClick={handleClose}>
                                <div className="flex gap-4 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-purple-500/30 hover:bg-purple-500/5 transition-colors group cursor-pointer">
                                    <div className={cn("flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center", item.color)}>
                                        <item.icon className="w-5 h-5" />
                                    </div>
                                    <div className="space-y-1 flex-1">
                                        <h4 className="text-sm font-bold text-zinc-100 group-hover:text-purple-300 transition-colors flex items-center gap-1.5">
                                            {item.title}
                                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-purple-400" />
                                        </h4>
                                        <p className="text-xs text-zinc-400 leading-relaxed">
                                            {item.description}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </ScrollArea>

                {/* Footer */}
                <DialogFooter className="p-6 pt-2 flex-col gap-2">
                    <Button
                        onClick={handleClose}
                        className="w-full bg-white text-black hover:bg-zinc-200 font-bold rounded-xl"
                    >
                        Start Exploring
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                    <Link
                        href={`/changelog/${latest.slug}`}
                        onClick={handleClose}
                        className="w-full text-center text-xs text-zinc-500 hover:text-purple-400 transition-colors py-2 font-bold uppercase tracking-widest"
                    >
                        Read Full Article →
                    </Link>
                </DialogFooter>

            </DialogContent>
        </Dialog>
    );
}
