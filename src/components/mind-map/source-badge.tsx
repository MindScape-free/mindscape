
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { FileText, Image as ImageIcon, Youtube } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SourceBadgeProps {
    type?: string;
    className?: string;
}

export const SourceBadge = ({ type, className }: SourceBadgeProps) => {
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
            label: 'Document',
            icon: <FileText className="h-2.5 w-2.5" />,
            class: 'bg-black/60 text-emerald-400 border-emerald-500/30'
        },
        document: {
            label: 'Document',
            icon: <FileText className="h-2.5 w-2.5" />,
            class: 'bg-black/60 text-emerald-400 border-emerald-500/30'
        }
    };

    const style = config[type.toLowerCase()] || {
        label: type,
        icon: <FileText className="h-2.5 w-2.5" />,
        class: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
    };

    return (
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
};
