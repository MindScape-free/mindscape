'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sparkles,
    Wand2,
    Monitor,
    Smartphone,
    Square as SquareIcon,
    Palette,
    Loader2,
    Image as ImageIcon,
    Camera,
    CloudRain,
    Sun,
    Zap,
    Wind,
    Moon,
    Flame,
    Lightbulb,
    Droplets
} from 'lucide-react';
import { ModelSelector } from '@/components/model-selector';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUser, useFirestore } from '@/firebase';
import { getUserImageSettings } from '@/lib/firestore-helpers';

interface ImageGenerationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (settings: ImageSettings) => void;
    nodeName: string;
    nodeDescription: string;
    initialPrompt: string;
    onEnhancePrompt: (prompt: string, style?: string, composition?: string, mood?: string, colorPalette?: string, lighting?: string) => Promise<string>;
    isEnhancing: boolean;
}

export interface ImageSettings {
    initialPrompt: string;
    enhancedPrompt: string;
    model: string;
    aspectRatio: '1:1' | '16:9' | '9:16';
    style: string;
    composition?: string;
    mood?: string;
    colorPalette?: string;
    lighting?: string;
    width: number;
    height: number;
}

const ASPECT_RATIOS = [
    { label: 'SQ', fullLabel: 'Square', value: '1:1', icon: SquareIcon, width: 1024, height: 1024 },
    { label: 'LS', fullLabel: 'Landscape', value: '16:9', icon: Monitor, width: 1024, height: 576 },
    { label: 'PT', fullLabel: 'Portrait', value: '9:16', icon: Smartphone, width: 576, height: 1024 },
] as const;

const STYLE_PRESETS = [
    { id: 'cinematic', label: 'Cinematic', description: 'High-end movie lighting and atmosphere' },
    { id: '3d-render', label: '3D Render', description: 'Hyper-realistic CGI with Octane/Unreal Engine' },
    { id: 'anime', label: 'Anime', description: 'Hand-painted Studio Ghibli aesthetic' },
    { id: 'minimalist', label: 'Minimalist', description: 'Clean, modern, and elegant design' },
    { id: 'cyberpunk', label: 'Cyberpunk', description: 'Neon lights, rainy streets, and high-tech' },
    { id: 'watercolor', label: 'Watercolor', description: 'Organic paper textures and soft washes' },
    { id: 'pencil', label: 'Pencil Sketch', description: 'Detailed graphite hand-drawn sketch' },
    { id: 'polaroid', label: 'Polaroid', description: 'Vintage film grain and nostalgic colors' },
    { id: 'pop-art', label: 'Pop Art', description: 'Bold halftone and vibrant comic style' },
    { id: 'oil-painting', label: 'Oil Painting', description: 'Classic canvas textures and brushstrokes' },
    { id: 'pixel-art', label: 'Pixel Art', description: 'Retro 16-bit gaming aesthetic' },
] as const;

const COMPOSITIONS = [
    { id: 'none', label: 'Default' },
    { id: 'close-up', label: 'Close-up' },
    { id: 'wide-shot', label: 'Wide Shot' },
    { id: 'bird-eye', label: 'Bird\'s Eye View' },
    { id: 'macro', label: 'Macro' },
    { id: 'low-angle', label: 'Low Angle' },
] as const;

const COLOR_PALETTES = [
    { id: 'none', label: 'Auto' },
    { id: 'warm', label: 'Warm Tones' },
    { id: 'cool', label: 'Cool Tones' },
    { id: 'monochrome', label: 'Monochrome' },
    { id: 'vibrant', label: 'Vibrant' },
    { id: 'pastel', label: 'Pastel' },
    { id: 'earth', label: 'Earth Tones' },
    { id: 'neon-palette', label: 'Neon Spectrum' },
] as const;

const LIGHTINGS = [
    { id: 'none', label: 'Auto' },
    { id: 'natural', label: 'Natural' },
    { id: 'studio', label: 'Studio' },
    { id: 'dramatic', label: 'Dramatic' },
    { id: 'backlit', label: 'Backlit' },
    { id: 'rim-light', label: 'Rim Light' },
    { id: 'volumetric', label: 'Volumetric' },
    { id: 'candlelight', label: 'Candlelight' },
] as const;

const MOODS = [
    { id: 'none', label: 'Default', icon: Zap },
    { id: 'golden-hour', label: 'Golden Hour', icon: Sun },
    { id: 'rainy', label: 'Rainy', icon: CloudRain },
    { id: 'foggy', label: 'Foggy', icon: Wind },
    { id: 'neon', label: 'Neon Glow', icon: Zap },
    { id: 'mystical', label: 'Mystical', icon: Flame },
    { id: 'nocturnal', label: 'Nocturnal', icon: Moon },
] as const;

export function ImageGenerationDialog({
    isOpen,
    onClose,
    onGenerate,
    nodeName,
    nodeDescription,
    initialPrompt,
    onEnhancePrompt,
    isEnhancing
}: ImageGenerationDialogProps) {
    const [prompt, setPrompt] = useState(initialPrompt);
    const [model, setModel] = useState('flux');
    const [aspectRatio, setAspectRatio] = useState<typeof ASPECT_RATIOS[number]>(ASPECT_RATIOS[0]);
    const [selectedStyle, setSelectedStyle] = useState<string>('cinematic');
    const [composition, setComposition] = useState<string>('none');
    const [mood, setMood] = useState<string>('none');
    const [colorPalette, setColorPalette] = useState<string>('none');
    const [lighting, setLighting] = useState<string>('none');

    const { user } = useUser();
    const firestore = useFirestore();

    // Sync prompt with initialPrompt when it changes
    React.useEffect(() => {
        if (isOpen) {
            setPrompt(initialPrompt);
            setSelectedStyle('cinematic');
            setAspectRatio(ASPECT_RATIOS[0]);
            setComposition('none');
            setMood('none');
            setColorPalette('none');
            setLighting('none');

            // Load user's preferred model
            if (user && firestore) {
                getUserImageSettings(firestore, user.uid).then(settings => {
                    if (settings?.preferredModel) {
                        let prefModel = settings.preferredModel;
                        if (prefModel === 'flux-pro' || prefModel === 'klein-large' || prefModel === 'klein') prefModel = 'flux';
                        setModel(prefModel);
                    }
                });
            } else {
                setModel('flux');
            }
        }
    }, [initialPrompt, isOpen, user, firestore]);

    const handleEnhance = async () => {
        const enhanced = await onEnhancePrompt(prompt, selectedStyle, composition, mood, colorPalette, lighting);
        if (enhanced) setPrompt(enhanced);
    };

    const handleGenerate = () => {
        onGenerate({
            initialPrompt,
            enhancedPrompt: prompt,
            model,
            aspectRatio: aspectRatio.value,
            style: selectedStyle,
            composition,
            mood,
            colorPalette,
            lighting,
            width: aspectRatio.width,
            height: aspectRatio.height
        });
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl bg-zinc-950 border-zinc-800 text-zinc-100 p-0 overflow-hidden rounded-[2.5rem] max-h-[92vh] flex flex-col">
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="bg-gradient-to-br from-violet-500/10 via-transparent to-emerald-500/10 p-6 sm:p-8">
                        {/* Header */}
                        <DialogHeader className="mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
                                    <Sparkles className="w-6 h-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <DialogTitle className="text-2xl sm:text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
                                        Visual Insight Lab
                                    </DialogTitle>
                                    <DialogDescription className="text-zinc-500 text-sm mt-0.5 truncate">
                                        Generating for <span className="text-violet-400 font-semibold italic">"{nodeName}"</span>
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        {/* 1. Prompt Area */}
                        <div className="space-y-3 mb-6">
                            <div className="flex items-center justify-between">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
                                    <ImageIcon className="w-3.5 h-3.5" />
                                    Prompt
                                </Label>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                        "h-8 px-3 text-[10px] font-bold uppercase tracking-widest transition-all gap-1.5 rounded-full border shadow-sm",
                                        selectedStyle
                                            ? "bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/20"
                                            : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700"
                                    )}
                                    onClick={handleEnhance}
                                    disabled={isEnhancing}
                                >
                                    {isEnhancing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                                    {selectedStyle ? `Enhance (${selectedStyle})` : 'Enhance with AI'}
                                </Button>
                            </div>
                            <div className="relative group">
                                <Textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="Describe your vision..."
                                    className="min-h-[100px] bg-zinc-900/40 border-zinc-800 focus:border-violet-500/50 focus:ring-violet-500/20 rounded-2xl resize-none text-zinc-200 placeholder:text-zinc-700 transition-all text-sm leading-relaxed p-5"
                                />
                                <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Badge variant="outline" className="text-[9px] bg-zinc-950/80 border-zinc-800 text-zinc-500 font-mono py-0.5 px-2 rounded-full">
                                        {prompt.length}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        {/* 2. Creative Controls — 2x2 grid + model row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                            {/* Style */}
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 flex items-center gap-1.5">
                                    <Palette className="w-3 h-3" />
                                    Style
                                </Label>
                                <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                                    <SelectTrigger className="h-9 bg-zinc-900/30 border-zinc-800 rounded-xl text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-950 border-zinc-800 z-[250]">
                                        {STYLE_PRESETS.map((s) => (
                                            <SelectItem key={s.id} value={s.id} className="focus:bg-zinc-900">
                                                <span className="font-bold text-xs">{s.label}</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Composition */}
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 flex items-center gap-1.5">
                                    <Camera className="w-3 h-3" />
                                    Composition
                                </Label>
                                <Select value={composition} onValueChange={setComposition}>
                                    <SelectTrigger className="h-9 bg-zinc-900/30 border-zinc-800 rounded-xl text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-950 border-zinc-800 z-[250]">
                                        {COMPOSITIONS.map((c) => (
                                            <SelectItem key={c.id} value={c.id} className="focus:bg-zinc-900 text-xs">
                                                {c.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Color Palette */}
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 flex items-center gap-1.5">
                                    <Droplets className="w-3 h-3" />
                                    Color
                                </Label>
                                <Select value={colorPalette} onValueChange={setColorPalette}>
                                    <SelectTrigger className="h-9 bg-zinc-900/30 border-zinc-800 rounded-xl text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-950 border-zinc-800 z-[250]">
                                        {COLOR_PALETTES.map((cp) => (
                                            <SelectItem key={cp.id} value={cp.id} className="focus:bg-zinc-900 text-xs">
                                                {cp.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Lighting */}
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 flex items-center gap-1.5">
                                    <Lightbulb className="w-3 h-3" />
                                    Lighting
                                </Label>
                                <Select value={lighting} onValueChange={setLighting}>
                                    <SelectTrigger className="h-9 bg-zinc-900/30 border-zinc-800 rounded-xl text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-950 border-zinc-800 z-[250]">
                                        {LIGHTINGS.map((l) => (
                                            <SelectItem key={l.id} value={l.id} className="focus:bg-zinc-900 text-xs">
                                                {l.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* AI Model — standalone compact row */}
                        <div className="flex items-center gap-3 mb-5">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 flex items-center gap-1.5 whitespace-nowrap">
                                <Sparkles className="w-3 h-3" />
                                AI Model
                            </Label>
                            <ModelSelector
                                value={model}
                                onChange={setModel}
                                className="h-9 bg-zinc-900/30 border-zinc-800 rounded-xl text-xs flex-1 max-w-xs"
                            />
                        </div>

                        {/* 3. Mood Chips — inline */}
                        <div className="space-y-2 mb-6">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Atmosphere & Mood</Label>
                            <div className="flex flex-wrap gap-1.5">
                                {MOODS.map((m) => (
                                    <button
                                        key={m.id}
                                        onClick={() => setMood(m.id)}
                                        className={cn(
                                            "px-3 py-2 rounded-xl text-[10px] font-bold border transition-all flex items-center gap-1.5",
                                            mood === m.id
                                                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                                                : "bg-zinc-900/40 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                                        )}
                                    >
                                        <m.icon className="w-3 h-3" />
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 4. Bottom Action Bar — Aspect Ratio + Launch */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-5 border-t border-zinc-800/50">
                            {/* Aspect Ratio — horizontal toggle group */}
                            <div className="flex items-center gap-1.5 bg-zinc-900/30 rounded-2xl p-1.5 border border-zinc-800/50">
                                {ASPECT_RATIOS.map((ratio) => (
                                    <button
                                        key={ratio.value}
                                        onClick={() => setAspectRatio(ratio)}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-bold transition-all",
                                            aspectRatio.value === ratio.value
                                                ? "bg-violet-500/15 text-violet-400 shadow-sm"
                                                : "text-zinc-500 hover:text-zinc-300"
                                        )}
                                    >
                                        <ratio.icon className="w-4 h-4" />
                                        <span className="hidden sm:inline">{ratio.fullLabel}</span>
                                        <span className="sm:hidden">{ratio.label}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="flex-1" />

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    onClick={onClose}
                                    className="h-11 px-5 rounded-xl bg-transparent border border-zinc-800 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 font-bold uppercase tracking-widest text-[10px] transition-all duration-300"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleGenerate}
                                    className="h-11 px-8 bg-violet-600 hover:bg-violet-500 text-white font-black uppercase tracking-widest rounded-xl shadow-[0_8px_30px_rgba(139,92,246,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98] text-xs"
                                >
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Launch Render
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
