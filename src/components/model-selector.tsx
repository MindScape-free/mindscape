import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Zap, Crown, Palette, Monitor, Cloud, Brain } from 'lucide-react';

export const POLLINATIONS_MODELS = [
    {
        value: 'flux',
        label: 'Flux Schnell',
        cost: 0.001,
        badge: 'Fast',
        icon: Zap,
        description: 'Flux Schnell - High Quality & Rapid Speed (Instant)',
        isNew: false,
        pollenApprox: '1K'
    },
    {
        value: 'flux-2-dev',
        label: 'FLUX.2 Dev',
        cost: 0.001,
        badge: 'Alpha',
        icon: Palette,
        description: 'FLUX.2 Dev (api.airforce) - High detail research model',
        isNew: true,
        pollenApprox: '1K'
    },
    {
        value: 'dirtberry',
        label: 'Dirtberry',
        cost: 0.001,
        badge: 'Alpha',
        icon: Palette,
        description: 'Dirtberry (api.airforce) - Stylized high-detail model',
        isNew: true,
        pollenApprox: '1K'
    },
    {
        value: 'dirtberry-pro',
        label: 'Dirtberry Pro',
        cost: 0.0015,
        badge: 'Alpha',
        icon: Palette,
        description: 'Dirtberry Pro (api.airforce) - Enhanced high-detail model',
        isNew: true,
        pollenApprox: '650'
    },
    {
        value: 'zimage',
        label: 'Z-Image Turbo',
        cost: 0.002,
        badge: 'Turbo',
        icon: Sparkles,
        description: 'Z-Image Turbo - Accelerated generation for dynamic workflows',
        isNew: false,
        pollenApprox: '500'
    },
    {
        value: 'imagen-4',
        label: 'Imagen 4',
        cost: 0.0025,
        badge: 'Alpha',
        icon: Crown,
        description: 'Google Imagen 4 (api.airforce) - State-of-the-art fidelity',
        isNew: true,
        pollenApprox: '400'
    },
    {
        value: 'grok-imagine',
        label: 'Grok Imagine',
        cost: 0.0025,
        badge: 'Alpha',
        icon: Brain,
        description: 'xAI Grok Imagine (api.airforce) - Creative and expressive',
        isNew: true,
        pollenApprox: '400'
    },
    {
        value: 'klein',
        label: 'FLUX.2 Klein 4B',
        cost: 0.01,
        badge: 'Alpha',
        icon: Monitor,
        description: 'FLUX.2 Klein 4B - Compact high-quality model',
        isNew: true,
        pollenApprox: '100'
    }
] as const;

export type ModelValue = typeof POLLINATIONS_MODELS[number]['value'];

interface ModelSelectorProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
    showCost?: boolean;
    freeOnly?: boolean;
}

export function ModelSelector({
    value,
    onChange,
    className,
    showCost = true,
    freeOnly = false
}: ModelSelectorProps) {
    const models = freeOnly ? POLLINATIONS_MODELS.filter(m => m.cost < 0.005) : POLLINATIONS_MODELS;
    const selectedModel = models.find(m => m.value === value) || models[0];

    return (
        <Select value={selectedModel.value} onValueChange={onChange}>
            <SelectTrigger className={className}>
                <SelectValue>
                    <div className="flex items-center gap-2">
                        {selectedModel && (
                            <>
                                <selectedModel.icon className="w-4 h-4" />
                                <span>{selectedModel.label}</span>
                            </>
                        )}
                    </div>
                </SelectValue>
            </SelectTrigger>
            <SelectContent className="min-w-[450px] z-[250]">
                {models.map(model => {
                    const Icon = model.icon;
                    return (
                        <SelectItem
                            key={model.value}
                            value={model.value}
                            className="focus:bg-zinc-800/80 focus:text-white transition-all duration-200 border-l-2 border-l-transparent focus:border-l-violet-500 rounded-none cursor-pointer"
                        >
                            <div className="grid grid-cols-[24px_180px_100px_80px] items-center gap-4 py-2 px-1 w-full">
                                <Icon className="w-4 h-4 text-zinc-400 shrink-0 group-hover:text-violet-400 transition-colors" />

                                <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-1.5 whitespace-nowrap overflow-visible">
                                        <span className="font-semibold text-zinc-200 text-[13px]">{model.label}</span>
                                        <div className="flex gap-1 shrink-0">
                                            {model.isNew && (
                                                <Badge className="text-[9px] h-3.5 px-1 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 leading-none font-bold uppercase tracking-widest">
                                                    NEW
                                                </Badge>
                                            )}
                                            {model.badge === 'Alpha' && (
                                                <Badge className="text-[9px] h-3.5 px-1 bg-amber-500/10 text-amber-500 border-amber-500/20 leading-none font-bold uppercase tracking-widest flex items-center gap-0.5">
                                                    ⚠️ ALPHA
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-zinc-500 truncate mt-0.5 opacity-80 leading-tight">
                                        {model.description}
                                    </span>
                                </div>

                                <div className="flex flex-col items-center justify-center gap-0.5">
                                    <span className="text-[10px] font-bold text-zinc-400">{model.pollenApprox}</span>
                                    <span className="text-[8px] text-zinc-600 font-black uppercase tracking-tighter">Images</span>
                                </div>

                                <div className="flex justify-end pr-1">
                                    <div className="nm-inset-glow px-2 py-0.5 rounded-lg bg-zinc-900/50 border border-white/5">
                                        <span className="text-[11px] font-mono text-violet-400 font-bold whitespace-nowrap">
                                            ${model.cost < 0.01 ? model.cost.toFixed(4) : model.cost.toFixed(2)}
                                        </span>
                                        <span className="text-[8px] text-zinc-600 ml-0.5 uppercase tracking-tighter">/img</span>
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
export function CompactModelSelector({ value, onChange, className, freeOnly = false }: ModelSelectorProps) {
    const models = freeOnly ? POLLINATIONS_MODELS.filter(m => m.cost < 0.005) : POLLINATIONS_MODELS;
    const selectedModel = models.find(m => m.value === value) || models[0];

    return (
        <Select value={selectedModel.value} onValueChange={onChange}>
            <SelectTrigger className={className}>
                <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[250]">
                {models.map(model => (
                    <SelectItem
                        key={model.value}
                        value={model.value}
                        className="focus:bg-zinc-800 focus:text-white"
                    >
                        <div className="grid grid-cols-[16px_1fr_60px] items-center w-full gap-2 py-1">
                            <model.icon className="w-3 h-3 text-zinc-400 group-hover:text-violet-400" />
                            <span className="text-xs truncate">{model.label}</span>
                            <div className="flex justify-end pr-1">
                                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-zinc-900 border-zinc-800 text-zinc-500 font-bold opacity-80">
                                    {model.cost < 0.01 ? model.cost.toFixed(4) : model.cost}
                                </Badge>
                            </div>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
