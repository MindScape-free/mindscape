import React from 'react';
import { Metadata } from 'next';
import { Brain, Zap, Target, Layers, ArrowRight, Sparkles, Network, GitBranch } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StructuredData } from '@/components/seo/structured-data';

export const metadata: Metadata = {
  title: 'AI Mind Map Generator - Create Knowledge Graphs Instantly',
  description: 'Use MindScape\'s AI Mind Map Generator to transform text, PDFs, and videos into interactive visual maps. Boost your productivity and learning speed.',
  keywords: ['AI mind map generator', 'automatic mind mapping', 'AI brainstorming', 'visual knowledge graph'],
};

export default function AIMindMapGenerator() {
  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      <StructuredData 
        type="SoftwareApplication" 
        data={{ 
          name: 'MindScape AI Mind Map Generator', 
          description: 'AI-powered tool to create mind maps from any source.' 
        }} 
      />
      
      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-6 pt-32 pb-24 text-center overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
        
        <Badge variant="outline" className="mb-6 border-primary/30 bg-primary/5 text-primary-foreground py-1 px-4 animate-fade-in">
          <Sparkles className="w-4 h-4 mr-2" />
          The Future of Brainstorming
        </Badge>
        
        <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1] mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
          The World's Most Advanced <br />
          <span className="text-primary">AI Mind Map Generator.</span>
        </h1>
        
        <p className="text-zinc-400 text-xl max-w-3xl mx-auto leading-relaxed mb-12">
          Stop struggling with blank pages. MindScape uses state-of-the-art AI to visualize your thoughts, documents, and videos in seconds.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/">
            <Button size="lg" className="rounded-full px-8 h-14 bg-primary hover:bg-primary/90 text-white font-bold text-lg gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-all">
              Start Generating Free
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <Link href="/community">
            <Button size="lg" variant="outline" className="rounded-full px-8 h-14 border-white/10 bg-white/5 hover:bg-white/10 font-bold text-lg">
              Explore Examples
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-6 py-24 border-t border-white/5">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Why use an AI Mind Map Generator?</h2>
          <p className="text-zinc-500">Traditional mind mapping is slow. MindScape is instantaneous.</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Target,
              title: 'Contextual Accuracy',
              desc: 'Our AI understands the nuances of your topic, creating logical hierarchies that make sense.',
            },
            {
              icon: Layers,
              title: 'Multi-Source Synthesis',
              desc: 'Combine PDFs, YouTube videos, and web links into a single, unified visual map.',
            },
            {
              icon: Network,
              title: 'Infinite Expansion',
              desc: 'Drill down into any node to generate sub-maps. There is no limit to the depth of your discovery.',
            },
            {
              icon: Brain,
              title: 'Semantic Search',
              desc: 'Find anything in your maps with intelligent search that understands meaning, not just keywords.',
            },
            {
              icon: Zap,
              title: 'Real-time Updates',
              desc: 'Changes happen in milliseconds. Brainstorm at the speed of thought.',
            },
            {
              icon: GitBranch,
              title: 'Logical Flow',
              desc: 'AI automatically organizes messy thoughts into structured, beautiful diagrams.',
            }
          ].map((feature, i) => (
            <div key={i} className="p-8 rounded-3xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-zinc-500 leading-relaxed text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Content Section for SEO */}
      <section className="max-w-4xl mx-auto px-6 py-24 prose prose-invert">
        <h2 className="text-3xl font-bold text-white mb-8">How to use MindScape as an AI Mind Map Generator</h2>
        <p className="text-zinc-400 text-lg leading-relaxed mb-6">
          MindScape is designed to be the simplest yet most powerful AI mind mapping tool on the market. Whether you're a student trying to summarize a 50-page research paper or a product manager mapping out a complex feature set, our AI handles the heavy lifting.
        </p>
        <div className="space-y-8">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-primary">1</div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Input your source</h3>
              <p className="text-zinc-500">Paste a topic, upload a PDF, or drop a YouTube link. Our AI will analyze the content immediately.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-primary">2</div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Configure the depth</h3>
              <p className="text-zinc-500">Choose between Quick, Balanced, or Deep exploration modes depending on how much detail you need.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-primary">3</div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Explore & Refine</h3>
              <p className="text-zinc-500">Interact with your map, ask follow-up questions to the AI, and export your work for presentations.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-6 py-24 mb-24">
        <div className="rounded-[3rem] bg-gradient-to-br from-primary/20 to-purple-500/10 border border-white/10 p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
          <h2 className="text-4xl font-bold mb-6 relative z-10">Ready to visualize your ideas?</h2>
          <p className="text-zinc-400 mb-10 max-w-xl mx-auto relative z-10">Join thousands of users who are already using AI to learn faster and work smarter.</p>
          <Link href="/">
            <Button size="lg" className="rounded-full px-12 h-16 bg-white text-black hover:bg-zinc-200 font-black text-xl transition-all relative z-10">
              Generate Now
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
