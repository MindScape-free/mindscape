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
    ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/firebase';
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

    // Block show on specific pages
    const isAuthPage = pathname === '/login' || pathname === '/signup';

    const checkAndShow = useCallback((isManual = false) => {
        if (isUserLoading || isAuthPage) return;

        // Determine correct step based on state
        // If logged in but no key -> Step 3
        // If not logged in -> Step 1 (or 2)
        if (user && !config.pollinationsApiKey) {
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

        if (dismissed === 'true' && user && config.pollinationsApiKey) {
            setIsDismissed(true);
            return;
        }

        // Auto-show logic
        if (!user || !config.pollinationsApiKey) {
            if (dismissed !== 'true') {
                setIsOpen(true);
            }
        }
    }, [user, isUserLoading, config.pollinationsApiKey, isAuthPage]);

    useEffect(() => {
        // Show immediately on mount or state change if conditions met
        checkAndShow();

        // Listen for manual triggers (e.g. from Hero section)
        const handleTrigger = () => {
            checkAndShow(true);
        };

        window.addEventListener(TRIGGER_ONBOARDING_EVENT, handleTrigger);
        return () => window.removeEventListener(TRIGGER_ONBOARDING_EVENT, handleTrigger);
    }, [checkAndShow]);

    const handleDismiss = () => {
        setIsOpen(false);
        localStorage.setItem('mindscape-onboarding-dismissed', 'true');
        if (user && config.pollinationsApiKey) {
            setIsDismissed(true);
        }
    };

    const handleNext = () => setStep(s => s + 1);
    const handleBack = () => setStep(s => s - 1);

    const handleLogin = () => {
        router.push('/login');
        setIsOpen(false); // Close modal so they can see the login page
    };

    const handleConnectPollinations = () => {
        const redirectUrl = encodeURIComponent(window.location.origin + '/');
        // Standardized BYOP URL with profile, balance, usage and our core rotating models
        const authUrl = `https://enter.pollinations.ai/authorize?redirect_url=${redirectUrl}&permissions=profile,balance,usage&models=flux,openai,mistral,qwen,nova&expiry=30`;
        window.location.href = authUrl;
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) handleDismiss();
        }}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-zinc-950 border-white/5 rounded-[2.5rem] shadow-2xl ring-1 ring-white/10">
                <div className="relative">
                    {/* Animated Background Gradients */}
                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
                        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-primary/40 blur-[100px] rounded-full" />
                        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-purple-500/40 blur-[100px] rounded-full" />
                    </div>

                    {/* Progress Bar */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-white/5 z-20">
                        <motion.div
                            initial={{ width: '33%' }}
                            animate={{ width: `${(step / 3) * 100}%` }}
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
                                                Welcome to the next generation of visual thinking. Let's optimize your setup.
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
                                            <DialogDescription className="text-zinc-400 text-sm leading-relaxed max-w-[320px] mx-auto">
                                                Connect <span className="text-purple-400 font-bold">Pollinations.ai</span> to unlock unlimited high-quality maps (Flux, Qwen) for <span className="text-emerald-400 font-bold">FREE</span>.
                                            </DialogDescription>
                                        </div>
                                    </div>

                                    {config.pollinationsApiKey ? (
                                        <div className="flex flex-col items-center justify-center p-8 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 gap-4">
                                            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                                <ShieldCheck className="w-7 h-7 text-emerald-500" />
                                            </div>
                                            <div className="text-center">
                                                <span className="text-lg font-bold text-emerald-500 block">System Armed</span>
                                                <span className="text-xs text-zinc-500">Unlimited high-fidelity mode active</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
                                                <div className="flex items-center gap-3 text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                                    BYOP: Bring Your Own Pollen
                                                </div>
                                                <p className="text-[11px] text-zinc-500 leading-relaxed italic">
                                                    "Connect your personal API key to avoid rate limits and use the world's best open-source models at no platform cost."
                                                </p>
                                            </div>
                                            <Button
                                                onClick={handleConnectPollinations}
                                                className="w-full h-16 bg-gradient-to-r from-violet-600 via-purple-600 to-accent hover:brightness-110 text-white rounded-2xl font-black text-lg transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] group active:scale-[0.98]"
                                            >
                                                Connect Personal Key <Zap className="ml-2 w-4 h-4 text-amber-300 animate-pulse" />
                                            </Button>
                                        </div>
                                    )}

                                    <div className="flex gap-4">
                                        <Button onClick={handleBack} variant="ghost" className="flex-1 h-12 text-zinc-500 hover:text-white rounded-xl">
                                            <ArrowLeft className="mr-2 w-4 h-4" /> Back
                                        </Button>
                                        <Button onClick={handleDismiss} className="flex-[2] h-12 bg-white text-black hover:bg-zinc-200 rounded-xl font-black transition-all active:scale-[0.98]">
                                            Go to Dashboard
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
