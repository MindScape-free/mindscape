
'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Icons } from '../icons';

const generationSteps = [
    'Initializing Nerve Center...',
    'Mapping Synaptic Architecture...',
    'Synthesizing Knowledge Nodes...',
    'Processing Cognitive Depth...',
    'Stabilizing Intelligence Matrix...',
];

const stepDurations = [2000, 3000, 4000, 5000, 2000];

export function NeuralLoader() {
    const [currentStep, setCurrentStep] = useState(0);
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setSeconds((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (currentStep < generationSteps.length - 1) {
            const timer = setTimeout(() => {
                setCurrentStep(currentStep + 1);
            }, stepDurations[currentStep]);

            return () => clearTimeout(timer);
        }
    }, [currentStep]);

    const formatTime = (secs: number) => {
        const minutes = Math.floor(secs / 60);
        const remainingSeconds = secs % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#09090b]">
            {/* Minimalist Background Neural Glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-[100px] animate-pulse" />
            </div>

            <div className="relative flex flex-col items-center gap-12 max-w-md w-full px-6">
                {/* Logo Section */}
                <div className="relative flex flex-col items-center">
                    <div className="relative w-32 h-32 rounded-[2.5rem] glassmorphism flex items-center justify-center p-6 mb-8 border border-white/10 shadow-2xl shadow-purple-900/20 animate-logo-pulse overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/10 to-transparent opacity-50" />
                        <Icons.logo className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_20px_rgba(168,85,247,0.4)]" />
                    </div>

                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-black text-white tracking-widest font-orbitron uppercase italic">
                            MindScape <span className="text-purple-500">Neural</span> Engine
                        </h2>
                        <div className="flex items-center justify-center gap-3 text-zinc-500 font-mono text-[10px] uppercase tracking-[0.3em]">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]" />
                            <span>System Active: {formatTime(seconds)}</span>
                        </div>
                    </div>
                </div>

                {/* Progress Tracking */}
                <div className="w-full space-y-6">
                    <div className="space-y-4">
                        <div className="flex justify-between items-end px-1">
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] font-orbitron">
                                Synthesis Progress
                            </span>
                            <span className="text-[10px] font-bold text-purple-400 font-mono">
                                {Math.round(((currentStep + 1) / generationSteps.length) * 100)}%
                            </span>
                        </div>

                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-[2px] border border-white/5">
                            <div
                                className="h-full bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 bg-[length:200%_auto] animate-gradient rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                                style={{ width: `${((currentStep + 1) / generationSteps.length) * 100}%` }}
                            />
                        </div>

                        <div className="flex flex-col items-center space-y-1">
                            <p className="text-sm font-bold text-zinc-300 animate-pulse font-orbitron tracking-tight text-center">
                                {generationSteps[currentStep]}
                            </p>
                            <p className="text-[9px] text-zinc-600 font-medium uppercase tracking-[0.1em]">Processing knowledge clusters...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
