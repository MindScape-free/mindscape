'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles,
    ArrowRight,
    X,
    Zap,
    Brain,
    GitBranch,
    LogIn,
    CheckCircle2,
    ArrowLeft,
    ShieldCheck,
    TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/lib/auth-context';
import { useAIConfig } from '@/contexts/ai-config-context';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

// Global event name for triggering the onboarding
export const TRIGGER_ONBOARDING_EVENT = 'mindscape:trigger-onboarding';

export function OnboardingWizard() {
    const { user, isUserLoading } = useUser();
    const { config } = useAIConfig();
    const router = useRouter();
    const pathname = usePathname();

    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState(1);
    const [isDismissed, setIsDismissed] = useState(false);

    const hasValidKey = !!(config.pollinationsApiKey || config.openrouterApiKey || config.nvidiaApiKey);

    // Exclude auth, profile, and admin pages from auto-showing onboarding
    const isExcludedPage = pathname === '/signup' || pathname === '/profile' || pathname?.startsWith('/admin');

    const checkAndShow = useCallback((isManual = false) => {
        if (isUserLoading || isExcludedPage) return;

        // Determine correct step based on state
        // If logged in but no key -> Step 3
        // If not logged in -> Step 1 (or 2)
        if (user && !hasValidKey) {
            setStep(3);
        } else if (!user) {
            setStep(1);
        }

        const dismissed = localStorage.getItem('mindscape-onboarding-dismissed');

        // If manual trigger, always show regardless of dismissal
        if (isManual) {
            setIsOpen(true);
            return;
        }

        if (dismissed === 'true' && user && hasValidKey) {
            setIsDismissed(true);
            return;
        }

        // Auto-show logic
        if (!user || !hasValidKey) {
            if (dismissed !== 'true') {
                setIsOpen(true);
            }
        }
    }, [user, isUserLoading, hasValidKey, isExcludedPage]);

    useEffect(() => {
        // Show on mount with microtask deferral to avoid cascading render
        const id = setTimeout(() => checkAndShow(), 0);

        const handleTrigger = () => {
            checkAndShow(true);
        };

        window.addEventListener(TRIGGER_ONBOARDING_EVENT, handleTrigger);
        return () => {
            clearTimeout(id);
            window.removeEventListener(TRIGGER_ONBOARDING_EVENT, handleTrigger);
        };
    }, [checkAndShow]);

    const handleDismiss = () => {
        setIsOpen(false);
        localStorage.setItem('mindscape-onboarding-dismissed', 'true');
        if (user && hasValidKey) {
            setIsDismissed(true);
        }
    };

    const handleNext = () => setStep(s => s + 1);
    const handleBack = () => setStep(s => s - 1);

    const handleLogin = () => {
        setIsOpen(false);
        // Dispatch event so Navbar opens its LoginDialog (no /login page exists)
        window.dispatchEvent(new CustomEvent('mindscape:trigger-login'));
    };

    const handleConnectPollinations = () => {
        localStorage.setItem('mindscape-onboarding-dismissed', 'true');
        const redirectUrl = encodeURIComponent(window.location.origin + '/profile');
        // Standardized BYOP URL with profile, balance, usage and our core rotating models
        const authUrl = `https://enter.pollinations.ai/authorize?redirect_url=${redirectUrl}&permissions=profile,balance,usage,keys,models&scope=profile,balance,usage,keys,models&budget=1000`;
        window.location.href = authUrl;
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) handleDismiss();
        }}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-zinc-950 border-white/5 rounded-[2.5rem] shadow-2xl ring-1 ring-white/10 [&>button]:hidden">
                <div className="relative">
                    {/* Custom Close Button */}
                    <button 
                        type="button"
                        onClick={handleDismiss}
                        className="absolute right-6 top-6 z-50 rounded-full p-2 text-zinc-500 hover:text-white hover:bg-white/5 transition-all outline-none"
                    >
                        <X className="h-4 w-4" />
                    </button>
                    {/* Animated Background Gradients */}
                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
                        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-primary/40 blur-[100px] rounded-full" />
                        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-purple-500/40 blur-[100px] rounded-full" />
                    </div>

                    {/* Progress Bar */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-white/5 z-20">
                        <motion.div
                            initial={{ width: '25%' }}
                            animate={{ width: `${(step / 4) * 100}%` }}
                            className="h-full bg-gradient-to-r from-primary via-purple-500 to-accent shadow-[0_0_10px_rgba(139,92,246,0.5)]"
                        />
                    </div>

                    <div className="relative z-10 p-8 md:p-10">
                        <AnimatePresence mode="wait">
                            {step === 1 && (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                    className="space-y-8"
                                >
                                    <div className="space-y-4 text-center">
                                        <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-primary/20 to-purple-500/10 flex items-center justify-center border border-white/10 mx-auto shadow-xl group">
                                            <Sparkles className="w-8 h-8 text-primary group-hover:scale-110 transition-transform duration-500" />
                                        </div>
                                        <div className="space-y-2">
                                            <DialogTitle className="text-3xl font-black text-white tracking-tight">Master Your Mind</DialogTitle>
                                            <DialogDescription className="text-zinc-400 text-sm leading-relaxed max-w-[300px] mx-auto">
                                                Welcome to the next generation of visual thinking. Let&apos;s optimize your setup.
                                            </DialogDescription>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3">
                                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 group hover:bg-white/[0.05] transition-colors">
                                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                                                <Brain className="w-5 h-5 text-purple-400" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-zinc-200">Deep Knowledge</span>
                                                <span className="text-[10px] text-zinc-500">AI-curated exploration of any topic</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 group hover:bg-white/[0.05] transition-colors">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                                <GitBranch className="w-5 h-5 text-primary" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-zinc-200">Infinite Layers</span>
                                                <span className="text-[10px] text-zinc-500">Structure complex ideas with ease</span>
                                            </div>
                                        </div>
                                    </div>

                                    <Button onClick={handleNext} className="w-full h-14 bg-primary hover:bg-primary/90 text-white rounded-2xl group font-black text-lg shadow-2xl shadow-primary/20 transition-all active:scale-[0.98]">
                                        Prepare for Takeoff <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </motion.div>
                            )}

                            {step === 2 && (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                    className="space-y-8"
                                >
                                    <div className="space-y-4 text-center">
                                        <div className="w-16 h-16 rounded-[1.5rem] bg-amber-500/10 flex items-center justify-center border border-amber-500/20 mx-auto shadow-xl">
                                            <LogIn className="w-8 h-8 text-amber-500" />
                                        </div>
                                        <div className="space-y-2">
                                            <DialogTitle className="text-3xl font-black text-white tracking-tight">Cloud Sync</DialogTitle>
                                            <DialogDescription className="text-zinc-400 text-sm leading-relaxed max-w-[300px] mx-auto">
                                                Secure your knowledge in the MindScape library for access anywhere.
                                            </DialogDescription>
                                        </div>
                                    </div>

                                    {user ? (
                                        <div className="flex flex-col items-center justify-center p-8 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 gap-4">
                                            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                                <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                                            </div>
                                            <div className="text-center">
                                                <span className="text-lg font-bold text-emerald-500 block">Identity Verified</span>
                                                <span className="text-xs text-zinc-500">Logged in as {user.email}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center p-8 rounded-3xl bg-amber-500/5 border border-amber-500/10 gap-4">
                                            <p className="text-zinc-400 text-sm text-center leading-relaxed">
                                                Join the community to save your maps and sync them across all your devices.
                                            </p>
                                        </div>
                                    )}

                                    <div className="flex gap-4">
                                        <Button onClick={handleBack} variant="ghost" className="flex-1 h-12 text-zinc-500 hover:text-white rounded-xl">
                                            <ArrowLeft className="mr-2 w-4 h-4" /> Back
                                        </Button>
                                        <Button
                                            onClick={user ? handleNext : handleLogin}
                                            className="flex-[2] h-12 bg-white text-black hover:bg-zinc-200 rounded-xl font-black transition-all active:scale-[0.98] uppercase text-[10px] tracking-widest"
                                        >
                                            {user ? 'Continue' : 'Sign In to MindScape'}
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {step === 3 && (
                                <motion.div
                                    key="step3"
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                    className="space-y-8"
                                >
                                    <div className="space-y-4 text-center">
                                        <div className="w-16 h-16 rounded-[1.5rem] bg-purple-500/10 flex items-center justify-center border border-purple-500/20 mx-auto shadow-xl">
                                            <Zap className="w-8 h-8 text-purple-500" />
                                        </div>
                                        <div className="space-y-2">
                                            <DialogTitle className="text-3xl font-black text-white tracking-tight">Unlimited High-Fidelity</DialogTitle>
                                            <DialogDescription className="text-zinc-400 text-sm leading-relaxed max-w-[340px] mx-auto">
                                                Connect <span className="text-purple-400 font-bold">Pollinations.ai</span>, <span className="text-blue-400 font-bold">OpenRouter</span>, or <span className="text-lime-400 font-bold">NVIDIA NIM</span> to unlock unlimited high-quality <span className="text-primary font-bold">Images & Maps</span> (Flux, Llama, Qwen, Nemotron) for <span className="text-emerald-400 font-bold">FREE</span>.
                                            </DialogDescription>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
                                            <div className="flex items-center gap-3 text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                                BRING YOUR OWN API KEY
                                            </div>
                                            <p className="text-[11px] text-zinc-500 leading-relaxed italic">
                                                &ldquo;Connect your personal API key to avoid rate limits and use the world&apos;s best open-source models at no platform cost.&rdquo;
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-3">
                                            {config.pollinationsApiKey ? (
                                                <div className="w-full h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl font-bold text-sm flex items-center justify-center">
                                                    <ShieldCheck className="mr-2 w-5 h-5" /> Pollinations Connected
                                                </div>
                                            ) : (
                                                <Button
                                                    onClick={handleConnectPollinations}
                                                    className="w-full h-14 bg-gradient-to-r from-violet-600 via-purple-600 to-accent hover:brightness-110 text-white rounded-2xl font-black text-sm transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] group active:scale-[0.98]"
                                                >
                                                    Connect Pollinations <Zap className="ml-2 w-4 h-4 text-amber-300 animate-pulse" />
                                                </Button>
                                            )}
                                            
                                            {config.openrouterApiKey ? (
                                                <div className="w-full h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl font-bold text-sm flex items-center justify-center">
                                                    <ShieldCheck className="mr-2 w-5 h-5" /> OpenRouter Connected
                                                </div>
                                            ) : (
                                                <Button
                                                    onClick={() => {
                                                        setIsOpen(false);
                                                        window.open('https://openrouter.ai/keys', '_blank');
                                                        router.push('/profile?tab=lab');
                                                    }}
                                                    variant="outline"
                                                    className="w-full h-14 border-white/10 hover:bg-white/5 text-zinc-300 rounded-2xl font-bold text-sm transition-all active:scale-[0.98]"
                                                >
                                                    Connect OpenRouter (Profile Settings)
                                                </Button>
                                            )}

                                            {config.nvidiaApiKey ? (
                                                <div className="w-full h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl font-bold text-sm flex items-center justify-center">
                                                    <ShieldCheck className="mr-2 w-5 h-5" /> NVIDIA NIM Connected
                                                </div>
                                            ) : (
                                                <Button
                                                    onClick={() => {
                                                        setIsOpen(false);
                                                        window.open('https://build.nvidia.com/settings/api-keys', '_blank');
                                                        router.push('/profile?tab=lab');
                                                    }}
                                                    variant="outline"
                                                    className="w-full h-14 border-white/10 hover:bg-white/5 text-zinc-300 rounded-2xl font-bold text-sm transition-all active:scale-[0.98]"
                                                >
                                                    Connect NVIDIA NIM (Profile Settings)
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <Button onClick={handleBack} variant="ghost" className="flex-1 h-12 text-zinc-500 hover:text-white rounded-xl">
                                            <ArrowLeft className="mr-2 w-4 h-4" /> Back
                                        </Button>
                                        <Button onClick={handleNext} className="flex-[2] h-12 bg-white text-black hover:bg-zinc-200 rounded-xl font-black transition-all active:scale-[0.98]">
                                            Continue
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {step === 4 && (
                                <motion.div
                                    key="step4"
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                    className="space-y-7"
                                >
                                    <div className="space-y-4 text-center">
                                        <div className="w-16 h-16 rounded-[1.5rem] bg-primary/10 flex items-center justify-center border border-primary/20 mx-auto shadow-xl">
                                            <TrendingUp className="w-8 h-8 text-primary" />
                                        </div>
                                        <div className="space-y-2">
                                            <DialogTitle className="text-3xl font-black text-white tracking-tight">Earn XP for Everything</DialogTitle>
                                            <DialogDescription className="text-zinc-400 text-sm leading-relaxed max-w-[300px] mx-auto">
                                                Every action you take earns XP. Level up through 10 ranks as you learn.
                                            </DialogDescription>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { label: 'Create mind map', xp: '+20 XP', color: 'text-violet-400 bg-violet-500/10' },
                                            { label: 'Complete quiz', xp: '+15 XP', color: 'text-emerald-400 bg-emerald-500/10' },
                                            { label: 'Daily login', xp: '+5 XP', color: 'text-blue-400 bg-blue-500/10' },
                                            { label: '7-day streak', xp: '+30 XP', color: 'text-amber-400 bg-amber-500/10' },
                                        ].map((item) => (
                                            <div key={item.label} className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', item.color.split(' ')[1])}>
                                                    <Zap className={cn('w-3.5 h-3.5', item.color.split(' ')[0])} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] text-zinc-400 truncate">{item.label}</p>
                                                    <p className={cn('text-xs font-black', item.color.split(' ')[0])}>{item.xp}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="p-3 rounded-xl bg-primary/8 border border-primary/15 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                                            <Zap className="w-4 h-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-white">You start as a Spark</p>
                                            <p className="text-[10px] text-zinc-500">Level 1 — 10 ranks to MindMaster</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <Button onClick={handleBack} variant="ghost" className="flex-1 h-12 text-zinc-500 hover:text-white rounded-xl">
                                            <ArrowLeft className="mr-2 w-4 h-4" /> Back
                                        </Button>
                                        <Button onClick={handleDismiss} className="flex-[2] h-12 bg-primary hover:bg-primary/90 text-white rounded-xl font-black transition-all active:scale-[0.98] gap-2">
                                            Start Earning <Zap className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
