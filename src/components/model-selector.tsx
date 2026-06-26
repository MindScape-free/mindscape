'use client';

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Zap, Crown, Palette, Monitor, Cloud, Brain, BrainCircuit, List } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatPollenCount(cost: number): string {
    if (cost <= 0) return 'Free';
    const imagesPerPollen = 1 / cost;
    if (imagesPerPollen >= 1000000) return `${(imagesPerPollen / 1000000).toFixed(0)}M`;
    if (imagesPerPollen >= 1000) return `${(imagesPerPollen / 1000).toFixed(0)}K`;
    return Math.round(imagesPerPollen).toString();
}

export type ModelItem = {
    value: string;
    label: string;
    cost: number;
    icon: any;
    description: string;
    isNew: boolean;
    pollenApprox: string;
    type: 'text' | 'image';
    isFree: boolean;
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
            icon: Icon,
            description: m.description || `${label} - Pollinations AI Model`,
            isNew: m.isNew ?? false,
            pollenApprox: type === 'text' 
              ? (m.isFree ? 'Free' : 'Paid') 
              : (cost > 0 ? formatPollenCount(cost) : 'Free'),
            type,
            isFree: m.isFree !== false
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

    // freeOnly: use the isFree flag from the API
    const models = freeOnly 
      ? availableModels.filter(m => m.isFree) 
      : availableModels;
    
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
                            <div className={cn("grid items-center gap-4 py-2 px-1 w-full", type === 'image' ? 'grid-cols-[24px_180px_100px_80px]' : 'grid-cols-[24px_1fr_80px]')}>
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

                                {type === 'image' && (
                                    <div className="flex flex-col items-center justify-center gap-0.5">
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
                                            {model.pollenApprox}
                                        </span>
                                        <span className="text-[8px] text-zinc-600 font-black uppercase tracking-tighter">imgs/🌸</span>
                                    </div>
                                )}
                                {type === 'text' && <div />}

                                <div className="flex justify-end pr-1">
                                    <div className={`nm-inset-glow px-2 py-0.5 rounded-lg border ${model.isFree ? 'bg-emerald-900/20 border-emerald-500/20' : 'bg-amber-900/20 border-amber-500/20'}`}>
                                        <span className={`text-[11px] font-mono font-bold whitespace-nowrap ${model.isFree ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            {model.type === 'text' 
                                              ? (model.isFree ? 'FREE' : 'PAID') 
                                              : `$${model.cost < 0.01 ? model.cost.toFixed(4) : model.cost.toFixed(2)}`}
                                        </span>
                                        {model.type === 'image' && <span className="text-[8px] text-zinc-600 ml-0.5 uppercase tracking-tighter">/img</span>}
                                        {model.type === 'text' && !model.isFree && <span className="text-[8px] text-zinc-500 ml-0.5 uppercase tracking-tighter">🌸</span>}
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

    // freeOnly: use the isFree flag from the API
    const models = freeOnly 
      ? availableModels.filter(m => m.isFree) 
      : availableModels;
    if (isLoading && models.length === 0) return <div className={cn("h-9 w-24 bg-white/5 animate-pulse rounded-lg", className)} />;
    
    const selectedModel = models.find(m => m.value === value) || models[0];
    if (!selectedModel) return null;

    return (
        <Select value={selectedModel.value} onValueChange={onChange}>
            <SelectTrigger className={cn("w-full h-9 bg-black/40 border-white/5 rounded-lg px-3 text-xs font-bold transition-colors", className)}>
                <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[250] bg-zinc-900 border-zinc-800 rounded-xl">
                {models.map(model => (
                    <SelectItem
                        key={model.value}
                        value={model.value}
                        className="py-2.5 text-xs font-bold focus:bg-white/5 focus:text-white rounded-lg cursor-pointer transition-colors"
                    >
                        <div className="flex items-center justify-between w-full min-w-[180px] gap-3 pr-2">
                            <div className="flex items-center gap-2">
                                <model.icon className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white" />
                                <span className="truncate">{model.label}</span>
                            </div>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono uppercase tracking-wider ${model.isFree ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                {model.isFree ? 'Free' : 'Paid'}
                            </span>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
