'use server';

import { GenerateComparisonMapInputSchema, CompareMindMapSchema } from './schema';
import { systemPrompt, userPromptTemplate } from './prompt';
import { generateContent, AIProvider } from '@/ai/client-dispatcher';
import { z } from 'zod';
import { SearchContext } from '@/ai/search/search-schema';

export type GenerateComparisonMapOutputV2 = z.infer<typeof CompareMindMapSchema>;

/**
 * Generates a comparison mind map using the refined schema and prompt.
 * Optionally uses search contexts for both topics to ground the comparison in current facts.
 */
export async function generateComparisonMapV2(
    input: {
        topic1: string;
        topic2: string;
        targetLang?: string;
        persona?: string;
        depth?: 'low' | 'medium' | 'deep';
        searchContextA?: SearchContext | null;
        searchContextB?: SearchContext | null;
        provider?: AIProvider;
        apiKey?: string;
        model?: string;
    }
): Promise<GenerateComparisonMapOutputV2> {
    const { topic1, topic2, depth = 'low', searchContextA, searchContextB, provider, apiKey, model } = input;

    const system = systemPrompt;
    const user = userPromptTemplate(topic1, topic2, depth, searchContextA, searchContextB);

    const maxAttempts = 2;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const result = await generateContent({
                provider: provider || 'pollinations',
                apiKey,
                systemPrompt: system,
                userPrompt: user,
                schema: CompareMindMapSchema,
                options: { model },
            });

            // Ensure topic is present for compatibility
            if (!result.topic) {
                result.topic = result.root?.title || `${topic1} vs ${topic2}`;
            }

            return result;
        } catch (e: any) {
            lastError = e;
            console.error(`❌ Comparison map V2 generation attempt ${attempt} failed:`, e.message);
            if (attempt === maxAttempts) throw e;

            await new Promise(res => setTimeout(res, 1000));
        }
    }

    throw lastError || new Error('Comparison map generation failed');
}
