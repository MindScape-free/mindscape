'use server';

import { z } from 'zod';
import { TopicFAQsOutputSchema, TopicFAQsOutput } from '@/ai/schemas/faq-schema';
import { generateContent, AIProvider } from '@/ai/client-dispatcher';

const TopicFAQsInputSchema = z.object({
  topic: z.string(),
  summary: z.string().optional(),
});
export type TopicFAQsInput = z.infer<typeof TopicFAQsInputSchema>;

const SYSTEM_GUARANTEES = `SYSTEM GUARANTEES:
- Output MUST be valid JSON (no markdown, no extra text)
- If invalid → internally self-correct before final output
- Do NOT explain, only generate`;

export async function generateTopicFAQs(
  input: TopicFAQsInput & { apiKey?: string; provider?: AIProvider; strict?: boolean }
): Promise<TopicFAQsOutput> {
  const { topic, summary, provider, apiKey, strict } = input;

  const systemPrompt = `${SYSTEM_GUARANTEES}

You are an expert FAQ writer.

Topic: ${topic}
${summary ? `Context: ${summary.substring(0, 2000)}` : ''}

Generate 4-6 frequently asked questions about this specific topic.
Each FAQ should:
- Be a real question someone learning this topic would ask
- Cover different aspects, concepts, or subtopics — no overlap
- Have a clear, informative answer of 1-3 sentences
- Use plain, educational language accessible to a learner

Return ONLY: { "faqs": [{ "question": "Q?", "answer": "A." }] }`;

  const userPrompt = `Generate 4-6 FAQs about "${topic}".`;

  try {
    return await generateContent({ provider, apiKey, systemPrompt, userPrompt, schema: TopicFAQsOutputSchema, strict });
  } catch (e: any) {
    console.error('Failed to generate topic FAQs:', e.message);
    return { faqs: [] };
  }
}
