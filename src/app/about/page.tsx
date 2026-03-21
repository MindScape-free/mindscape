'use client';

import { motion } from 'framer-motion';
import { Users, Brain, Code, ArrowRight, Lightbulb, Zap, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AboutPage() {
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2,
            },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.6, ease: "easeOut" },
        },
    };

    return (
        <div className="min-h-[calc(100dvh-5rem)] pt-12 pb-24 px-6 max-w-6xl mx-auto overflow-hidden">
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-32"
            >
                {/* 1. Hero Section (Vision & Purpose) */}
                <motion.section variants={itemVariants} className="text-center space-y-6 relative">

                    {/* Subtle background glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-64 bg-primary/20 blur-[100px] rounded-full pointer-events-none -z-10" />

                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wide uppercase mb-4">
                        <Sparkles className="w-3.5 h-3.5" />
                        Our Vision
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
                        Mapping the <br className="md:hidden" />
                        <span className="text-primary">Future of Thought.</span>
                    </h1>

                    <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                        MindScape isn't just a tool; it's a cognitive canvas designed to bridge the gap between human intuition and artificial intelligence, transforming unstructured ideas into clear, explorable knowledge.
                    </p>
                </motion.section>

                {/* 2. "Who We Are" Section */}
                <motion.section variants={itemVariants} className="space-y-12">
                    <div className="text-center space-y-4">
                        <h2 className="text-3xl md:text-4xl font-bold">Who We Are</h2>
                        <p className="text-zinc-400 max-w-xl mx-auto">
                            We are a collective of developers, designers, and thinkers passionate about visual learning and structural organization.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            {
                                icon: Users,
                                title: "For Everyone",
                                description: "Built for students dissecting textbooks, professionals mapping out projects, and creators brainstorming their next big idea."
                            },
                            {
                                icon: Brain,
                                title: "Cognitive First",
                                description: "Our design philosophy centers on how the human brain naturally processes and retains interconnected information."
                            },
                            {
                                icon: Code,
                                title: "Tech Forward",
                                description: "Leveraging the latest in generative AI and interactive web technologies to deliver a seamless, magical experience."
                            }
                        ].map((item, i) => (
                            <div key={i} className="rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-8 hover:bg-white/[0.04] transition-colors border-t-white/10 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] rounded-full group-hover:bg-primary/20 transition-colors" />
                                <item.icon className="w-10 h-10 text-primary mb-6" />
                                <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
                                <p className="text-zinc-400 leading-relaxed">{item.description}</p>
                            </div>
                        ))}
                    </div>
                </motion.section>

                {/* 3. "Why We Are" Section */}
                <motion.section variants={itemVariants} className="space-y-12 relative">

                    <div className="text-center space-y-4 mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold">The Problem We Solve</h2>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12 items-center max-w-4xl mx-auto relative">

                        {/* Connecting Line (Desktop only) */}
                        <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent -translate-x-1/2" />

                        {/* Step 1: The Problem */}
                        <div className="text-right pr-0 md:pr-12 relative">
                            <div className="hidden md:flex absolute right-0 top-6 translate-x-[50%] w-8 h-8 rounded-full bg-[#0D0D0D] border-2 border-zinc-800 items-center justify-center z-10">
                                <div className="w-2 h-2 rounded-full bg-zinc-600" />
                            </div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800/50 border border-white/5 text-zinc-300 text-xs font-semibold mb-4">
                                <List className="w-3.5 h-3.5" />
                                The Problem
                            </div>
                            <h3 className="text-2xl font-semibold mb-4 text-white">Linear Notes are Rigid</h3>
                            <p className="text-zinc-400 leading-relaxed">
                                We recognized that traditional note-taking and brainstorming were strictly linear, rigid, and disconnected. Thoughts don't naturally flow from top to bottom; they branch out in multiple directions simultaneously.
                            </p>
                        </div>

                        <div className="hidden md:block" /> {/* Empty right cell */}

                        <div className="hidden md:block" /> {/* Empty left cell */}

                        {/* Step 2: The Solution */}
                        <div className="pl-0 md:pl-12 relative">
                            <div className="hidden md:flex absolute left-0 top-6 -translate-x-[50%] w-8 h-8 rounded-full bg-[#0D0D0D] border-2 border-primary/50 items-center justify-center z-10 shadow-[0_0_15px_rgba(139,92,246,0.3)]">
                                <div className="w-2 h-2 rounded-full bg-primary" />
                            </div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-4">
                                <Lightbulb className="w-3.5 h-3.5" />
                                The Solution
                            </div>
                            <h3 className="text-2xl font-semibold mb-4 text-white">Dynamic Exploration</h3>
                            <p className="text-zinc-400 leading-relaxed">
                                We built MindScape to allow ideas to branch naturally. By leveraging AI to automatically categorize, extract entities, and expand upon thoughts, we dramatically reduce the friction between having an idea and understanding its full scope.
                            </p>
                        </div>
                    </div>

                </motion.section>

                {/* 4. Call to Action */}
                <motion.section variants={itemVariants} className="text-center pt-12 pb-8">
                    <div className="flex flex-col items-center gap-6 p-8 md:p-12 rounded-[2.5rem] bg-gradient-to-b from-white/[0.03] to-transparent border border-white/5 relative overflow-hidden">

                        {/* Decorative background for CTA box */}
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />

                        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">Ready to map your mind?</h2>
                        <p className="text-zinc-400 max-w-md">Join thousands of users organizing their thoughts with the power of artificial intelligence.</p>

                        <Link href="/">
                            <Button size="lg" className="rounded-full px-8 bg-primary hover:bg-primary/90 text-white font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20 gap-2 h-12 mt-2">
                                Start Mapping
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </Link>
                    </div>
                </motion.section>

            </motion.div>
        </div>
    );
}

// Importing List here just for the "Problem" icon as it was missing from the lucide-react imports above
import { List } from 'lucide-react';
