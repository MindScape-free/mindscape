import { z } from 'zod';

export const FAQItemSchema = z.object({
  question: z.string().describe('A clear, concise question about the topic'),
  answer: z.string().describe('An informative answer, 1-3 sentences'),
});

export const TopicFAQsOutputSchema = z.object({
  faqs: z.array(FAQItemSchema).min(3).max(8).describe('An array of 4-6 FAQ items about the topic'),
});

export type TopicFAQsOutput = z.infer<typeof TopicFAQsOutputSchema>;
export type FAQItemOutput = z.infer<typeof FAQItemSchema>;
