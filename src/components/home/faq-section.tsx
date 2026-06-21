'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: 'Is MindScape free to use?',
    answer: 'Yes! MindScape is free to use. You just need a free Pollinations.ai API key (BYOP - Bring Your Own Pollen) to generate mind maps and images. The API key gives you access to unlimited high-quality models like Flux and Qwen at no platform cost.',
  },
  {
    question: 'Do I need an account?',
    answer: "No account is needed to generate maps. However, creating an account (free) lets you save maps to your library, sync across devices, track your XP and rank, publish to the community, and access your full history.",
  },
  {
    question: 'What can I upload?',
    answer: 'MindScape accepts PDFs, images (JPG, PNG), text files, YouTube video links, and any website URL. You can also combine multiple sources into a single unified mind map using Multi-Source mode.',
  },
  {
    question: 'How is this different from ChatGPT?',
    answer: 'ChatGPT gives you text. MindScape gives you an interactive, visual knowledge graph you can explore, expand, quiz yourself on, and build upon. Plus, our deterministic SKEE engine ensures structural accuracy — no hallucinated headings.',
  },
  {
    question: 'Can I export my maps?',
    answer: 'Yes! You can export chat conversations as formatted PDFs, download AI-generated audio summaries as MP3 files, share unlisted links to your maps, or publish them to the Community Dashboard for others to explore.',
  },
  {
    question: 'How does the Quiz system work?',
    answer: "AI generates a quiz based on your map topic. After you answer, MindScape identifies weak areas (scores below 60%) and automatically generates new map nodes to reinforce those concepts. It's adaptive learning built into the mapping experience.",
  },
  {
    question: 'What languages does MindScape support?',
    answer: 'MindScape supports 50+ languages for both mind map generation and UI. You can enter topics in any language and generate maps in your preferred language. The entire map can also be translated after generation.',
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-12 md:py-16 relative">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center mb-8 md:mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <HelpCircle className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Common Questions
          </h2>
          <p className="text-zinc-500 text-sm mt-2">
            Everything you need to know to get started.
          </p>
        </div>

        <div className="space-y-2">
          {FAQS.map((faq, index) => (
            <div
              key={index}
              className={cn(
                "rounded-2xl border border-white/5 bg-zinc-900/30 transition-all duration-300",
                openIndex === index && "border-primary/20 bg-zinc-900/50"
              )}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-4 md:p-5 text-left gap-4"
              >
                <span className="text-sm md:text-base font-semibold text-white">
                  {faq.question}
                </span>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-zinc-500 shrink-0 transition-transform duration-300",
                    openIndex === index && "rotate-180 text-primary"
                  )}
                />
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 md:px-5 pb-4 md:pb-5">
                      <div className="w-full h-[1px] bg-white/5 mb-4" />
                      <p className="text-sm text-zinc-400 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
