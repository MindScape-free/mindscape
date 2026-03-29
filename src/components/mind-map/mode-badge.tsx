
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Binary, Layers, GitCompare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModeBadgeProps {
    mode?: string;
    sourceFileType?: string;
    sourceType?: string;
    sourceFileContent?: string;
    compareData?: any;
    className?: string;
}

export const ModeBadge = ({ 
    mode, 
    sourceFileType, 
    sourceType, 
    sourceFileContent, 
    compareData,
    className 
}: ModeBadgeProps) => {
    // Smart Mode Detection Logic
    const isMulti = mode === 'multi' || 
                   sourceFileType === 'multi' || 
                   sourceType === 'multi' || 
                   sourceFileContent?.includes('--- SOURCE:');
    
    const isCompare = mode === 'compare' || !!compareData;

    const getStatus = () => {
        if (isMulti) return {
            label: 'Multi-Source',
            icon: <Layers className="h-2.5 w-2.5" />,
            class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
        };
        if (isCompare) return {
            label: 'Comparison',
            icon: <GitCompare className="h-2.5 w-2.5" />,
            class: 'bg-violet-500/10 text-violet-400 border-violet-500/30'
        };
        return {
            label: 'Single Mode',
            icon: <Binary className="h-2.5 w-2.5" />,
            class: 'bg-blue-500/10 text-blue-400 border-blue-500/30'
        };
    };

    const status = getStatus();

    return (
        <Badge
            variant="outline"
            className={cn(
                "text-[10px] uppercase font-bold tracking-tighter px-2 h-5 gap-1 border backdrop-blur-xl shadow-lg ring-1 ring-black/20",
                status.class,
                className
            )}
        >
            {status.icon}
            {status.label}
        </Badge>
    );
};
