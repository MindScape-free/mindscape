import React from 'react';
import { Metadata } from 'next';
import { BookOpen, GraduationCap, Lightbulb, CheckCircle2, ArrowRight, Sparkles, Layout, MousePointer2, Network } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StructuredData } from '@/components/seo/structured-data';

export const metadata: Metadata = {
  title: 'Visual Learning Tool - Master Any Subject with AI Mind Maps',
  description: 'MindScape is the ultimate visual learning tool. Convert complex textbooks and lectures into structured knowledge maps that help you retain information 2x faster.',
  keywords: ['visual learning tool', 'educational mind map', 'AI study assistant', 'visual knowledge base'],
};

export default function VisualLearningTool() {
  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      <StructuredData 
        type="SoftwareApplication" 
        data={{ 
          name: 'MindScape Visual Learning Tool', 
          description: 'Educational platform for visual learners using AI mind maps.' 
        }} 
      />
      
      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-6 pt-32 pb-24 text-center overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />
        
        <Badge variant="outline" className="mb-6 border-emerald-500/30 bg-emerald-500/5 text-emerald-400 py-1 px-4 animate-fade-in">
          <GraduationCap className="w-4 h-4 mr-2" />
          Optimized for Education
        </Badge>
        
        <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1] mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
          The Ultimate <br />
          <span className="text-emerald-400">Visual Learning Tool.</span>
        </h1>
        
        <p className="text-zinc-400 text-xl max-w-3xl mx-auto leading-relaxed mb-12">
          Say goodbye to linear notes. MindScape helps visual learners master complex subjects by revealing the hidden connections between ideas.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/">
            <Button size="lg" className="rounded-full px-8 h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg gap-2 shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all">
              Try It Free
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <Link href="/about">
            <Button size="lg" variant="outline" className="rounded-full px-8 h-14 border-white/10 bg-white/5 hover:bg-white/10 font-bold text-lg">
              How It Works
            </Button>
          </Link>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="max-w-6xl mx-auto px-6 py-24 border-t border-white/5">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl font-black mb-6">Designed for the <br />modern student.</h2>
            <p className="text-zinc-400 text-lg mb-8 leading-relaxed">
              We know that 65% of people are visual learners. Yet, most educational tools are text-heavy. MindScape bridges that gap with AI that builds diagrams for you.
            </p>
            <div className="space-y-4">
              {[
                'Convert textbooks into hierarchical maps',
                'Generate quizzes from your visual structures',
                'Identify knowledge gaps with AI analysis',
                'Export maps for collaborative study sessions'
              ].map((benefit, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-zinc-200 font-medium">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
             <div className="aspect-square rounded-[3rem] bg-gradient-to-tr from-emerald-500/20 to-primary/20 border border-white/10 flex items-center justify-center relative overflow-hidden">
                <Layout className="w-32 h-32 text-emerald-400/20 absolute -top-10 -left-10" />
                <MousePointer2 className="w-24 h-24 text-primary/20 absolute -bottom-10 -right-10" />
                <BookOpen className="w-48 h-48 text-white/10" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#0D0D0D_100%)]" />
             </div>
          </div>
        </div>
      </section>

      {/* Methods Section */}
      <section className="max-w-7xl mx-auto px-6 py-24 bg-white/[0.01]">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">Methods</Badge>
          <h2 className="text-3xl md:text-5xl font-black">Learn Smarter, Not Harder.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-10 rounded-[2rem] border border-white/5 bg-black/40">
            <Lightbulb className="w-10 h-10 text-amber-400 mb-6" />
            <h3 className="text-xl font-bold mb-4">First Principles</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">Deconstruct complex topics into their fundamental truths using our AI's deep analysis mode.</p>
          </div>
          <div className="p-10 rounded-[2rem] border border-white/5 bg-black/40">
            <Sparkles className="w-10 h-10 text-primary mb-6" />
            <h3 className="text-xl font-bold mb-4">Active Recall</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">Turn your mind maps into interactive flashcards and quizzes with one click.</p>
          </div>
          <div className="p-10 rounded-[2rem] border border-white/5 bg-black/40">
            <Network className="w-10 h-10 text-emerald-400 mb-6" />
            <h3 className="text-xl font-bold mb-4">Associative Learning</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">Strengthen your memory by visualizing how new information connects to what you already know.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-6 py-24 text-center">
         <h2 className="text-4xl md:text-5xl font-black mb-8">Ready to transform your study habits?</h2>
         <Link href="/">
            <Button size="lg" className="rounded-full px-12 h-16 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xl transition-all">
              Launch MindScape
            </Button>
         </Link>
      </section>
    </div>
  );
}
