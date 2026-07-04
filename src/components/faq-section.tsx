'use client';

import { HelpCircle, Search } from 'lucide-react';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import type { FAQItem, FAQCategory } from '@/data/faq';

interface FAQSectionProps {
  title?: string;
  subtitle?: string;
  items?: FAQItem[];
  categories?: FAQCategory[];
  showSearch?: boolean;
  className?: string;
  id?: string;
  hideHeader?: boolean;
}

export function FAQSection({
  title = 'Frequently Asked Questions',
  subtitle,
  items,
  categories,
  showSearch = true,
  className,
  id,
  hideHeader = false,
}: FAQSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const allItems = useMemo(() => {
    if (items) return items;
    if (categories) return categories.flatMap((c) => c.items);
    return [];
  }, [items, categories]);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();
    return categories
      ?.map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) =>
            item.question.toLowerCase().includes(q) ||
            item.answer.toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [categories, searchQuery]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items?.filter(
      (item) =>
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  if (!allItems.length) return null;

  return (
    <section id={id} className={cn('py-16 md:py-24 relative', className)}>
      <div className="mx-auto max-w-3xl px-6">
        {!hideHeader && (
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-2 mb-3">
              <HelpCircle className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">
              {title}
            </h2>
            {subtitle && (
              <p className="text-zinc-500 text-sm max-w-xl mx-auto">{subtitle}</p>
            )}
          </div>
        )}

        {showSearch && allItems.length > 6 && (
          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search FAQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 bg-zinc-900/50 border-white/10 text-white placeholder:text-zinc-600 rounded-xl"
            />
          </div>
        )}

        {categories && filteredCategories ? (
          <div className="space-y-12">
            {filteredCategories.map((category) => (
              <div key={category.id}>
                <div className="flex items-center gap-3 mb-5">
                  {category.icon && <span className="text-xl">{category.icon}</span>}
                  <div>
                    <h3 className="text-lg font-bold text-white font-orbitron tracking-wider">
                      {category.title}
                    </h3>
                    {category.description && (
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {category.description}
                      </p>
                    )}
                  </div>
                </div>
                <Accordion type="single" collapsible className="space-y-2">
                  {category.items.map((faq, index) => (
                    <AccordionItem
                      key={`${category.id}-${index}`}
                      value={`${category.id}-${index}`}
                      className="rounded-xl border border-white/5 bg-zinc-900/30 px-5 data-[state=open]:border-primary/20 data-[state=open]:bg-zinc-900/50"
                    >
                      <AccordionTrigger className="text-sm md:text-base font-semibold text-white hover:text-primary transition-colors py-4">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-zinc-400 leading-relaxed pb-5">
                        <div className="w-full h-px bg-white/5 mb-4" />
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        ) : (
          <Accordion type="single" collapsible className="space-y-2">
            {(filteredItems || items || []).map((faq, index) => (
              <AccordionItem
                key={index}
                value={`faq-${index}`}
                className="rounded-xl border border-white/5 bg-zinc-900/30 px-5 data-[state=open]:border-primary/20 data-[state=open]:bg-zinc-900/50"
              >
                <AccordionTrigger className="text-sm md:text-base font-semibold text-white hover:text-primary transition-colors py-4">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-zinc-400 leading-relaxed pb-5">
                  <div className="w-full h-px bg-white/5 mb-4" />
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        {searchQuery && (
          <div className="text-center mt-8">
            {(categories ? filteredCategories?.every((c) => c.items.length === 0) : filteredItems?.length === 0) && (
              <p className="text-sm text-zinc-600">
                No FAQs match your search. Try different keywords.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
