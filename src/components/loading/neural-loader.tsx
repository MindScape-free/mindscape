
'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Icons } from '../icons';

const baseSteps = [
    'Initializing Nerve Center...',
    'Mapping Synaptic Architecture...',
    'Synthesizing Knowledge Nodes...',
    'Processing Cognitive Depth...',
    'Stabilizing Intelligence Matrix...',
];

const stepDurations = [2000, 3000, 4000, 5000, 2000];

const KNOWLEDGE_BASE = [
    { category: "APP TIP", text: "Press [Cmd/Ctrl + K] from anywhere to open the Universal Command Center." },
    { category: "APP TIP", text: "Customize your AI Personality in Profile > Preferences for different cognitive flows." },
    { category: "APP TIP", text: "Generate instant visual memory anchors by using the MindScape Vision Engine." },
    { category: "APP TIP", text: "Pin nodes in your mind map to keep them easily accessible as your knowledge base grows." },
    { category: "HISTORICAL SYNC", text: "In 1969, the first ARPANET message sent was 'LO'. The system crashed before sending 'LOGIN'." },
    { category: "HISTORICAL SYNC", text: "The Voyager 1 probe carries a 'Golden Record' with sounds and images to portray Earth's diversity to the cosmos." },
    { category: "HISTORICAL SYNC", text: "Ada Lovelace wrote the world's first machine algorithm in 1843, envisioning computers creating art and music." },
    { category: "LIFE HACK", text: "Use the Pomodoro Technique: Focus for 25 minutes, then rest for 5 to prevent neural fatigue." },
    { category: "LIFE HACK", text: "Learning a new skill right before deep sleep significantly improves memory retention." },
    { category: "LIFE HACK", text: "To overcome procrastination, commit to working on a task for just 2 minutes. The hardest part is starting." },
    { category: "PHILOSOPHICAL NODE", text: "\"Imagination is more important than knowledge. For knowledge is limited...\" - Albert Einstein" },
    { category: "PHILOSOPHICAL NODE", text: "\"The mind is not a vessel to be filled, but a fire to be kindled.\" - Plutarch" },
    { category: "PHILOSOPHICAL NODE", text: "\"We are what we repeatedly do. Excellence, then, is not an act, but a habit.\" - Will Durant" },
    { category: "SCIENCE FACT", text: "There are more possible iterations of a game of chess than there are atoms in the observable universe." },
    { category: "SCIENCE FACT", text: "A human brain operates on about 20 watts of power—enough to faintly light a lightbulb." },
    { category: "SCIENCE FACT", text: "Water can boil and freeze at the same time. This is known as the 'triple point' of water." },
    { category: "POSITIVE QUOTE", text: "\"Success is not final, failure is not fatal: it is the courage to continue that counts.\" - Winston Churchill" },
    { category: "POSITIVE QUOTE", text: "\"The only limit to our realization of tomorrow will be our doubts of today.\" - Franklin D. Roosevelt" }
];

export function NeuralLoader({ message, sourceType }: { message?: string, sourceType?: string }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [seconds, setSeconds] = useState(0);
    const [knowledgeIndex, setKnowledgeIndex] = useState(() => Math.floor(Math.random() * KNOWLEDGE_BASE.length));

    const generationSteps = [...baseSteps];
    if (sourceType === 'youtube') generationSteps.unshift('Transcribing Video Content...');
    if (sourceType === 'pdf') generationSteps.unshift('Parsing Document Structure...');
    if (sourceType === 'website') generationSteps.unshift('Scraping Web Content...');
    if (sourceType === 'multi') generationSteps.unshift('Merging Multiple Sources...');
    if (message) generationSteps.unshift(message);

    useEffect(() => {
        const interval = setInterval(() => {
            setSeconds((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // Start rotation
        const knowledgeInterval = setInterval(() => {
            setKnowledgeIndex(prev => (prev + 1) % KNOWLEDGE_BASE.length);
        }, 15000);
        return () => clearInterval(knowledgeInterval);
    }, []);

    useEffect(() => {
        if (currentStep < generationSteps.length - 1) {
            const timer = setTimeout(() => {
                setCurrentStep(currentStep + 1);
            }, stepDurations[currentStep]);

            return () => clearTimeout(timer);
        }
    }, [currentStep, generationSteps.length]);

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

                        <div className="flex flex-col items-center space-y-5 pt-2">
                            <p className="text-sm font-bold text-zinc-300 animate-pulse font-orbitron tracking-tight text-center">
                                {generationSteps[currentStep]}
                            </p>
                            
                            {/* Knowledge Base Carousel */}
                            <div className="w-full max-w-[320px] rounded-2xl bg-black/40 backdrop-blur-md border border-white/5 p-4 flex flex-col items-center justify-center gap-2 min-h-[90px] relative overflow-hidden transition-all duration-500 shadow-xl">
                                <div className="absolute inset-0 bg-gradient-to-t from-purple-500/5 to-transparent pointer-events-none" />
                                
                                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-purple-400/80 transition-opacity duration-300">
                                    {KNOWLEDGE_BASE[knowledgeIndex].category}
                                </span>
                                <p className="text-[10px] text-zinc-400 font-medium text-center leading-relaxed transition-opacity duration-300 px-2">
                                    {KNOWLEDGE_BASE[knowledgeIndex].text}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
