
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { FileText, Image as ImageIcon, Youtube, Layers, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface SourceBadgeProps {
    type?: string;
    className?: string;
    sourceFileContent?: string;
}


export const SourceBadge = ({ type, className, sourceFileContent }: SourceBadgeProps) => {
    if (!type) return null;

    const config: Record<string, { label: string; icon: React.ReactNode; class: string }> = {
        youtube: {
            label: 'YouTube',
            icon: <Youtube className="h-2.5 w-2.5" />,
            class: 'bg-black/60 text-red-400 border-red-500/30'
        },
        pdf: {
            label: 'PDF',
            icon: <FileText className="h-2.5 w-2.5" />,
            class: 'bg-black/60 text-amber-400 border-amber-500/30'
        },
        image: {
            label: 'Image',
            icon: <ImageIcon className="h-2.5 w-2.5" />,
            class: 'bg-black/60 text-blue-400 border-blue-500/30'
        },
        text: {
            label: 'TEXT',
            icon: <FileText className="h-2.5 w-2.5" />,
            class: 'bg-black/60 text-emerald-400 border-emerald-500/30'
        },
        document: {
            label: 'TEXT',
            icon: <FileText className="h-2.5 w-2.5" />,
            class: 'bg-black/60 text-emerald-400 border-emerald-500/30'
        },
        website: {
            label: 'Website',
            icon: <Globe className="h-2.5 w-2.5" />,
            class: 'bg-black/60 text-cyan-400 border-cyan-500/30'
        },
        multi: {
            label: 'Multi',
            icon: <Layers className="h-2.5 w-2.5" />,
            class: 'bg-black/60 text-purple-400 border-purple-500/30'
        }
    };

    const style = config[type.toLowerCase()] || {
        label: type,
        icon: <FileText className="h-2.5 w-2.5" />,
        class: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
    };

    const getMultiSourceCounts = (content: string) => {
        const counts = { IMAGES: 0, PDF: 0, WEBSITE: 0, YOUTUBE: 0, TEXT: 0 };
        const matches = content.match(/--- SOURCE: .*? \((.*?)\) ---/g);
        if (matches) {
            matches.forEach(m => {
                const innerMatch = m.match(/\((.*?)\)/);
                if (innerMatch) {
                    const sourceType = innerMatch[1].toUpperCase();
                    if (sourceType === 'IMAGE') counts.IMAGES++;
                    else if (sourceType === 'PDF') counts.PDF++;
                    else if (sourceType === 'WEBSITE' || sourceType === 'URL') counts.WEBSITE++;
                    else if (sourceType === 'YOUTUBE') counts.YOUTUBE++;
                    else counts.TEXT++;
                }
            });
        }
        return counts;
    };

    const badge = (
        <Badge
            variant="outline"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
            className={cn(
                "text-[10px] uppercase font-bold tracking-tighter px-2 py-0 h-5 gap-1 border border-white/20 backdrop-blur-xl shadow-lg ring-1 ring-black/20",
                style.class,
                className
            )}
        >
            {style.icon}
            {style.label}
        </Badge>
    );

    if (type.toLowerCase() === 'multi' && sourceFileContent) {
        const counts = getMultiSourceCounts(sourceFileContent);
        return (
            <TooltipProvider>
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        {badge}
                    </TooltipTrigger>
                    <TooltipContent className="bg-zinc-950/90 border-white/10 backdrop-blur-xl p-3 shadow-2xl">
                        <div className="space-y-1.5 font-bold uppercase tracking-widest text-[9px]">
                            {counts.IMAGES > 0 && <div className="text-blue-400 flex justify-between gap-4"><span>IMAGES</span><span>{counts.IMAGES}</span></div>}
                            {counts.PDF > 0 && <div className="text-amber-400 flex justify-between gap-4"><span>PDF</span><span>{counts.PDF}</span></div>}
                            {counts.WEBSITE > 0 && <div className="text-cyan-400 flex justify-between gap-4"><span>WEBSITE</span><span>{counts.WEBSITE}</span></div>}
                            {counts.YOUTUBE > 0 && <div className="text-red-400 flex justify-between gap-4"><span>YOUTUBE</span><span>{counts.YOUTUBE}</span></div>}
                            {counts.TEXT > 0 && <div className="text-emerald-400 flex justify-between gap-4"><span>TEXT</span><span>{counts.TEXT}</span></div>}
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return badge;
};
