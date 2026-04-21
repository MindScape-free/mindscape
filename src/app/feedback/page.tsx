'use client';

import React from 'react';
import { FeedbackForm } from '@/components/feedback/FeedbackForm';
import { FeedbackFeed } from '@/components/feedback/FeedbackFeed';
import { useUser } from '@/lib/auth-context';
import { MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

export default function FeedbackPage() {
    const { user } = useUser();

    return (
        <div className="min-h-screen bg-[#0D0D0D] text-[#EAEAEA] font-sans selection:bg-primary/30 overflow-x-hidden">
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full animate-pulse opacity-40" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.01)_0%,transparent_70%)]" />
                <div className="absolute inset-0 opacity-[0.015]" style={{ 
                    backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
                    backgroundSize: '40px 40px' 
                }} />
            </div>

            <main className="relative z-10 pt-24 pb-40">
                <div className="container mx-auto px-4 sm:px-8">
                    <div className="flex flex-col items-center mb-24">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="flex flex-col items-center"
                        >
                            <Badge variant="outline" className="mb-4 border-purple-500/30 bg-purple-500/10 text-purple-400 gap-1.5 py-1 px-3">
                                <MessageSquare className="h-3 w-3" />
                                Feedback Center
                            </Badge>
                            <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Help Us Improve</h1>
                            <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-center leading-relaxed">
                                Share your ideas, suggest new features, or report problems. <br className="hidden md:block" />
                                We use your feedback to make MindScape better for everyone.
                            </p>
                        </motion.div>
                    </div>

                    <div className="max-w-6xl mx-auto space-y-40">
                        <section id="feedback-form" className="relative">
                            <div className="absolute inset-0 bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
                            <FeedbackForm
                                userId={user?.uid}
                                userName={user?.displayName || undefined}
                                userEmail={user?.email || undefined}
                            />
                        </section>

                        <section className="relative pt-20 border-t border-white/5">
                            <FeedbackFeed />
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}
