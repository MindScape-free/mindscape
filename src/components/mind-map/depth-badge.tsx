
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DepthBadgeProps {
    depth?: 'low' | 'medium' | 'deep';
    className?: string;
}

export const DepthBadge = ({ depth, className }: DepthBadgeProps) => {
    if (!depth) return null;

    const config = {
        low: {
            label: 'Quick',
            class: 'bg-black/60 text-blue-400 border-blue-500/30',
            nodes: 'Small'
        },
        medium: {
            label: 'Balanced',
            class: 'bg-black/60 text-amber-400 border-amber-500/30',
            nodes: 'Balanced'
        },
        deep: {
            label: 'Detailed',
            class: 'bg-black/60 text-purple-400 border-purple-500/30',
            nodes: 'Detailed'
        }
    };

    const style = config[depth] || config.low;

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
            <Layers className="h-2.5 w-2.5" />
            {style.label}
        </Badge>
    );
};
