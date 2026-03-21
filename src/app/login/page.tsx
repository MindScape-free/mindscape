'use client';

import { AuthForm } from '@/components/auth-form';
import { useState, useEffect } from 'react';
import { Brain } from 'lucide-react';

type LoginShowcase = {
  badge: string;
  title: React.ReactNode;
  description: string;
  examples?: string[];
};

const LOGIN_SHOWCASES: LoginShowcase[] = [
  {
    badge: 'AI-Powered Generation',
    title: <>Turn thoughts into <span className="text-purple-400">structure</span>.</>,
    description:
      'MindScape instantly transforms ideas into clear, multi-layered mind maps.',
    examples: [
      'Explain Artificial Intelligence',
      'Break down Climate Change',
    ],
  },
  {
    badge: 'Infinite Exploration',
    title: <>Explore ideas <span className="text-purple-400">without limits</span>.</>,
    description:
      'Expand any concept infinitely with nested sub-maps and deep exploration.',
    examples: [
      'Expand Neural Networks',
      'Dive into Renaissance Art',
    ],
  },
  {
    badge: 'Vision Mode',
    title: <>Turn documents into <span className="text-purple-400">knowledge</span>.</>,
    description:
      'Upload PDFs, notes, or images and convert them into structured mind maps.',
    examples: [
      'Upload lecture notes',
      'Analyze research paper',
    ],
  },
];

export default function LoginPage() {
  // Randomly select one showcase on mount
  const [showcase, setShowcase] = useState<LoginShowcase | null>(null);

  useEffect(() => {
    setShowcase(LOGIN_SHOWCASES[Math.floor(Math.random() * LOGIN_SHOWCASES.length)]);
  }, []);

  if (!showcase) return null; // Prevent hydration mismatch

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Main Content */}
      <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 lg:py-20">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">

          {/* LEFT SIDE – Feature Showcase */}
          <div className="space-y-6 max-w-xl mx-auto lg:mx-0 text-center lg:text-left">

            {/* MindScape Brand (Visible on Mobile/Desktop) */}
            <div className="flex items-center justify-center lg:justify-start gap-3 mb-8 lg:mb-12">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div className="absolute inset-0 rounded-xl bg-purple-500/20 blur-xl animate-pulse-glow" />
              </div>
              <span className="text-2xl font-bold text-foreground">MindScape</span>
            </div>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1 text-sm text-purple-300">
              {showcase.badge}
            </div>

            {/* Headline */}
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight text-foreground">
              {showcase.title}
            </h1>

            {/* Description */}
            <p className="text-lg text-muted-foreground leading-relaxed max-w-lg mx-auto lg:mx-0">
              {showcase.description}
            </p>

            {/* Example Prompts */}
            {showcase.examples && (
              <div className="flex flex-wrap justify-center lg:justify-start gap-3 pt-2">
                {showcase.examples.map((ex, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-white/10 bg-zinc-900/40 px-4 py-2 text-sm text-zinc-300"
                  >
                    “{ex}”
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT SIDE – Auth Card */}
          <div className="w-full max-w-md mx-auto">
            <AuthForm />
          </div>
        </div>
      </div>
    </div>
  );
}
