
'use server';

import { z } from 'zod';
import { generateContent, AIProvider } from '@/ai/client-dispatcher';

const CategorizeMindMapInputSchema = z.object({
    topic: z.string().describe('The main topic of the mind map.'),
    summary: z.string().optional().describe('The summary of the mind map.'),
});

export type CategorizeMindMapInput = z.infer<typeof CategorizeMindMapInputSchema>;

const CategorizeMindMapOutputSchema = z.object({
    categories: z.array(z.string()).describe('A list of 3-5 broad categories for the mind map.'),
});

export type CategorizeMindMapOutput = z.infer<typeof CategorizeMindMapOutputSchema>;

export async function categorizeMindMap(
    input: CategorizeMindMapInput & { apiKey?: string; provider?: AIProvider }
): Promise<CategorizeMindMapOutput> {
    const { topic, summary, provider, apiKey } = input;

    const prompt = `You are an expert content categorizer. Given a mind map topic and optional summary, categorize it into 3-5 broad, relevant categories.
  
  Topic: "${topic}"
  ${summary ? `Summary: "${summary}"` : ''}

  Examples of broad categories: "Technology", "Science", "Education", "Health", "Business", "History", "Arts", "Philosophy", "Self-Improvement", "Marketing", "Engineering", "Nature".

  The output MUST be a valid JSON object with a single field "categories" containing an array of strings.
  
  IMPORTANT: Return ONLY the JSON object. No extra text.`;

    const result = await generateContent({
        provider: provider,
        apiKey: apiKey,
        capability: 'creative',
        systemPrompt: "System: Mind map categorizer. Output MUST be strictly valid JSON.",
        userPrompt: prompt,
        schema: CategorizeMindMapOutputSchema,
    });

    return result;
}
