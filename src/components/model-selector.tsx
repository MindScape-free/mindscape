'use client';

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Zap, Crown, Palette, Monitor, Cloud, Brain, BrainCircuit, List } from 'lucide-react';
import { cn } from '@/lib/utils';

export const FALLBACK_MODELS = [
    {
        value: 'flux',
        label: 'Flux Schnell',
        cost: 0.001,
        badge: 'Fast',
        icon: Zap,
        description: 'Flux Schnell - High Quality & Rapid Speed (Instant)',
        isNew: false,
        pollenApprox: '1K'
    }
] as const;

export type ModelItem = {
    value: string;
    label: string;
    cost: number;
    badge: string;
    icon: any;
    description: string;
    isNew: boolean;
    pollenApprox: string;
    type: 'text' | 'image';
};

/**
 * Mapping helper to transform API JSON to UI-friendly model items
 */
function mapModelsToUI(apiModels: any[], type: 'text' | 'image'): ModelItem[] {
    return apiModels.map(m => {
        const name = m.id || m.name || 'unknown';
        const cost = m.cost || 0.04;
        
        // Dynamic Labeling
        const label = name
            .split('-')
            .map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
            .join(' ')
            .replace('Gptimage', 'GPT Image')
            .replace('Zimage', 'Z-Image')
            .replace('Qwen', 'Qwen')
            .replace('Deepseek', 'DeepSeek')
            .replace('Gemini', 'Gemini')
            .replace('Mistral', 'Mistral');

        // Icon Assignment
        let Icon = Cloud;
        if (type === 'image') {
            if (name.includes('flux')) Icon = Zap;
            else if (name.includes('turbo') || name.includes('zimage')) Icon = Sparkles;
            else if (name.includes('gpt') || name.includes('brain')) Icon = Brain;
            else if (name.includes('qwen')) Icon = Cloud;
            else if (name.includes('klein')) Icon = Monitor;
        } else {
            if (name.includes('gpt') || name.includes('openai')) Icon = Brain;
            else if (name.includes('deepseek')) Icon = BrainCircuit;
            else if (name.includes('gemini')) Icon = Sparkles;
            else if (name.includes('mistral')) Icon = List;
            else if (name.includes('qwen')) Icon = Cloud;
        }

        return {
            value: name,
            label,
            cost,
            badge: type === 'text' ? (m.feature || 'Pro') : (cost < 0.005 ? 'Fast' : cost < 0.02 ? 'HD' : 'Pro'),
            icon: Icon,
            description: m.description || `${label} - Pollinations AI Model`,
            isNew: m.isNew ?? false,
            pollenApprox: type === 'text' ? 'Free' : (cost > 0 ? `${Math.round(1 / cost)}K`.replace('0K', '1K') : 'Free'),
            type
        };
    });
}

interface ModelSelectorProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
    showCost?: boolean;
    freeOnly?: boolean;
    type?: 'text' | 'image';
}

export function ModelSelector({
    value,
    onChange,
    className,
    showCost = true,
    freeOnly = false,
    type = 'image'
}: ModelSelectorProps) {
    const [availableModels, setAvailableModels] = useState<ModelItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadModels = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/models?type=${type}`);
                if (!res.ok) throw new Error('API Error');
                const data = await res.json();
                if (data.models) {
                    setAvailableModels(mapModelsToUI(data.models, type));
                }
            } catch (err) {
                console.error("Failed to fetch models, using fallbacks:", err);
            } finally {
                setIsLoading(false);
            }
        };
        loadModels();
    }, [type]);

    const models = freeOnly ? availableModels.filter(m => m.cost < 0.005) : availableModels;
    
    // If loading or no models, show placeholder
    if (isLoading && models.length === 0) {
        return (
            <div className={cn("h-11 bg-black/20 animate-pulse rounded-xl border border-white/5", className)} />
        );
    }

    const selectedModel = models.find(m => m.value === value) || models[0];
    if (!selectedModel) return null;

    return (
        <Select value={selectedModel.value} onValueChange={onChange}>
            <SelectTrigger className={className}>
                <SelectValue>
                    <div className="flex items-center gap-2">
                        <selectedModel.icon className="w-4 h-4 text-violet-400" />
                        <span>{selectedModel.label}</span>
                    </div>
                </SelectValue>
            </SelectTrigger>
            <SelectContent className="min-w-[450px] z-[250] bg-zinc-950 border-white/10">
                {models.map(model => {
                    const Icon = model.icon;
                    return (
                        <SelectItem
                            key={model.value}
                            value={model.value}
                            className="focus:bg-zinc-900 focus:text-white transition-all duration-200 border-l-2 border-l-transparent focus:border-l-violet-500 rounded-none cursor-pointer"
                        >
                            <div className="grid grid-cols-[24px_180px_100px_80px] items-center gap-4 py-2 px-1 w-full">
                                <Icon className="w-4 h-4 text-zinc-400 shrink-0 group-hover:text-violet-400 transition-colors" />

                                <div className="flex flex-col min-w-0 text-left">
                                    <div className="flex items-center gap-1.5 whitespace-nowrap overflow-visible">
                                        <span className="font-semibold text-zinc-200 text-[13px]">{model.label}</span>
                                        <div className="flex gap-1 shrink-0">
                                            {model.isNew && (
                                                <Badge className="text-[9px] h-3.5 px-1 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 leading-none font-bold uppercase tracking-widest">
                                                    NEW
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-zinc-500 truncate mt-0.5 opacity-80 leading-tight">
                                        {model.description}
                                    </span>
                                </div>

                                <div className="flex flex-col items-center justify-center gap-0.5">
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
                                        {type === 'text' ? model.badge : model.pollenApprox}
                                    </span>
                                    <span className="text-[8px] text-zinc-600 font-black uppercase tracking-tighter">
                                        {type === 'text' ? 'Engine' : 'Images'}
                                    </span>
                                </div>

                                <div className="flex justify-end pr-1">
                                    <div className="nm-inset-glow px-2 py-0.5 rounded-lg bg-zinc-900/50 border border-white/5">
                                        <span className="text-[11px] font-mono text-violet-400 font-bold whitespace-nowrap">
                                            {model.type === 'text' ? 'FREE' : `$${model.cost < 0.01 ? model.cost.toFixed(4) : model.cost.toFixed(2)}`}
                                        </span>
                                        {model.type === 'image' && <span className="text-[8px] text-zinc-600 ml-0.5 uppercase tracking-tighter">/img</span>}
                                    </div>
                                </div>
                            </div>
                        </SelectItem>
                    );
                })}
            </SelectContent>
        </Select>
    );
}

/**
 * Compact model selector for inline use
 */
export function CompactModelSelector({ value, onChange, className, freeOnly = false, type = 'image' }: ModelSelectorProps) {
    const [availableModels, setAvailableModels] = useState<ModelItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadModels = async () => {
            try {
                const res = await fetch(`/api/models?type=${type}`);
                if (!res.ok) throw new Error('API Error');
                const data = await res.json();
                if (data.models) {
                    setAvailableModels(mapModelsToUI(data.models, type));
                }
            } catch (err) {
                console.error("Failed to fetch models:", err);
            } finally {
                setIsLoading(false);
            }
        };
        loadModels();
    }, [type]);

    const models = freeOnly ? availableModels.filter(m => m.cost < 0.005) : availableModels;
    if (isLoading && models.length === 0) return <div className={cn("h-9 w-24 bg-white/5 animate-pulse rounded-lg", className)} />;
    
    const selectedModel = models.find(m => m.value === value) || models[0];
    if (!selectedModel) return null;

    return (
        <Select value={selectedModel.value} onValueChange={onChange}>
            <SelectTrigger className={cn("h-9 bg-zinc-900/50 border-white/10", className)}>
                <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[250] bg-zinc-950 border-white/10">
                {models.map(model => (
                    <SelectItem
                        key={model.value}
                        value={model.value}
                        className="focus:bg-zinc-800 focus:text-white"
                    >
                        <div className="grid grid-cols-[16px_1fr_60px] items-center w-full gap-2 py-1">
                            <model.icon className="w-3 h-3 text-zinc-400 group-hover:text-violet-400" />
                            <span className="text-xs truncate">{model.label}</span>
                            <div className="flex justify-end pr-1 text-[9px] font-mono text-zinc-500 uppercase">
                                {type === 'text' ? 'Free' : model.cost.toFixed(4)}
                            </div>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
