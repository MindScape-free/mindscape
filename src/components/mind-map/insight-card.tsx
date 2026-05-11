"use client";

import React from 'react';
import { Sparkles, Info, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface InsightCardProps {
    text: string;
    title: string;
    mode?: 'topic' | 'category' | 'node';
}

export const InsightCard = ({ text, title, mode = 'node' }: InsightCardProps) => {
    return (
        <Card className="relative overflow-hidden border border-white/5 bg-zinc-900/60 backdrop-blur-xl rounded-2xl p-5 shadow-2xl group transition-all duration-500 hover:bg-zinc-900/80">
            {/* Subtle glow effect */}
            <div className={cn(
                "absolute -top-24 -left-24 w-48 h-48 rounded-full blur-[80px] opacity-20 pointer-events-none transition-colors duration-1000",
                mode === 'topic' ? "bg-amber-500" : 
                mode === 'category' ? "bg-primary" : 
                "bg-emerald-500"
            )} />
            
            <div className="flex items-start gap-4 relative z-10">
                <div className={cn(
                    "p-2.5 rounded-xl border transition-transform duration-500 group-hover:scale-110",
                    mode === 'topic' ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : 
                    mode === 'category' ? "bg-primary/10 border-primary/20 text-primary" : 
                    "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                )}>
                    {mode === 'topic' ? <Sparkles className="w-4 h-4" /> : 
                     mode === 'category' ? <Lightbulb className="w-4 h-4" /> : 
                     <Info className="w-4 h-4" />}
                </div>
                
                <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
                            {mode === 'topic' ? 'Strategic Insight' : 
                             mode === 'category' ? 'Conceptual Bridge' : 
                             'Key Takeaway'}
                        </h5>
                        <div className="flex gap-1">
                            <div className="w-1 h-1 rounded-full bg-white/20" />
                            <div className="w-1 h-1 rounded-full bg-white/10" />
                        </div>
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed font-medium">
                        {text}
                    </p>
                </div>
            </div>
            
            {/* Bottom accent line */}
            <div className={cn(
                "absolute bottom-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent",
                mode === 'topic' ? "via-amber-500/30" : 
                mode === 'category' ? "via-primary/30" : 
                "via-emerald-500/30"
            )} />
        </Card>
    );
};
