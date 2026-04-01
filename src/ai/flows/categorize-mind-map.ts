
'use server';

import { z } from 'zod';
import { generateContent, AIProvider } from '@/ai/client-dispatcher';

const CategorizeMindMapInputSchema = z.object({
    topic: z.string(),
    summary: z.string().optional(),
});
export type CategorizeMindMapInput = z.infer<typeof CategorizeMindMapInputSchema>;

const CategorizeMindMapOutputSchema = z.object({
    categories: z.array(z.string()),
});
export type CategorizeMindMapOutput = z.infer<typeof CategorizeMindMapOutputSchema>;

const SYSTEM_GUARANTEES = `SYSTEM GUARANTEES:
- Output MUST be valid JSON (no markdown, no extra text)
- If invalid → internally self-correct before final output
- Do NOT explain, only generate`;

export async function categorizeMindMap(
    input: CategorizeMindMapInput & { apiKey?: string; provider?: AIProvider }
): Promise<CategorizeMindMapOutput> {
    const { topic, summary, provider, apiKey } = input;

    const systemPrompt = `${SYSTEM_GUARANTEES}

You are an expert content categorizer.`;

    const userPrompt = `Categorize this mind map into 3–5 broad, relevant categories.

Topic: "${topic}"
${summary ? `Summary: "${summary}"` : ''}

RULES:
- Each category must be a distinct domain — no overlapping categories.
- Use broad, well-known domains: Technology, Science, Education, Health, Business, History, Arts, Philosophy, Self-Improvement, Marketing, Engineering, Nature, Law, Finance, Psychology.
- Do NOT use subcategories of each other (e.g., not both "Technology" and "Software Engineering").

Return ONLY: { "categories": ["Cat1", "Cat2", "Cat3"] }`;

    return await generateContent({
        provider,
        apiKey,
        capability: 'creative',
        systemPrompt,
        userPrompt,
        schema: CategorizeMindMapOutputSchema,
    });
}
