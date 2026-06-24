'use client';

import { motion } from 'framer-motion';
import { HelpCircle, Search } from 'lucide-react';
import { FAQSection } from '@/components/faq-section';
import { GENERAL_FAQS } from '@/data/faq';

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <section className="relative max-w-4xl mx-auto px-6 pt-24 pb-8 text-center overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[500px] h-[250px] bg-primary/10 blur-[100px] rounded-full" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="relative z-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-black tracking-[0.15em] uppercase mb-8">
            <HelpCircle className="w-3 h-3" />
            Help Center
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-[1.1] mb-5">
            Frequently Asked<br />
            <span className="text-primary">Questions</span>
          </h1>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto leading-relaxed">
            Everything you need to know about MindScape. Can&apos;t find what you&apos;re looking for?{' '}
            <a href="/feedback" className="text-primary hover:underline">Send us feedback</a>.
          </p>
        </motion.div>
      </section>

      <div className="max-w-4xl mx-auto px-6 pb-24 space-y-4">
        <div className="flex flex-wrap gap-2 justify-center mb-12">
          {GENERAL_FAQS.map((cat) => (
            <a
              key={cat.id}
              href={`#cat-${cat.id}`}
              className="px-4 py-2 rounded-full text-xs font-bold bg-zinc-900/50 border border-white/10 text-zinc-400 hover:text-primary hover:border-primary/30 transition-all"
            >
              {cat.title}
            </a>
          ))}
        </div>

        {GENERAL_FAQS.map((category, idx) => (
          <motion.div
            key={category.id}
            id={`cat-${category.id}`}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.05 }}
          >
            <FAQSection
              title={category.title}
              items={category.items}
              showSearch={false}
              className="!py-8 !pb-4"
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
