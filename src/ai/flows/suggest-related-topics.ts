
import { z } from 'zod';

export const RelatedTopicsSchema = z.object({
    topics: z.array(z.string()).describe('An array of 3-4 related topic suggestions.'),
});

import { generateContent, AIProvider } from '@/ai/client-dispatcher';

export async function suggestRelatedTopics(
    input: { topic: string; summary?: string; provider?: AIProvider; apiKey?: string }
): Promise<{ topics: string[] }> {
    const { topic, summary, provider = 'pollinations', apiKey } = input;

    const systemPrompt = `You are an expert polymath and brainstorming strategist. 
Your goal is to suggest 3-4 highly specific, unique, and non-obvious topics that Branch out from the current topic in interesting directions.
DO NOT use generic prefixes like "Advanced", "Future", "Evolution", "Concepts", or "Basics".
Instead, look for niche sub-disciplines, controversial debates, practical specialized applications, or interdisciplinary connections.
You must respond with a JSON object containing a "topics" array.`;

    const userPrompt = `The current mind map is about: "${topic}".
${summary ? `Context: ${summary}` : ''}

Brainstorm 4 unique directions for new mind maps that would fascinate someone already interested in "${topic}". 
Make each suggestion a self-contained, intriguing topic (5-10 words each).`;

    try {
        const result = await generateContent({
            provider: 'pollinations',
            capability: 'creative',
            apiKey,
            systemPrompt,
            userPrompt,
            schema: RelatedTopicsSchema,
        });

        // Robust extraction: Check multiple possible keys if validation was loose
        let topics: string[] = [];
        if (result.topics && Array.isArray(result.topics)) {
            topics = result.topics;
        } else if (result.related_topics && Array.isArray(result.related_topics)) {
            topics = result.related_topics;
        } else if (result.suggestions && Array.isArray(result.suggestions)) {
            topics = result.suggestions;
        } else if (typeof result === 'object') {
            // Last resort: find any array
            const firstArray = Object.values(result).find(val => Array.isArray(val));
            if (firstArray) topics = firstArray as string[];
        }

        // Clean up common AI prefixes if they slipped through
        const genericFilter = (t: string) => {
            const lower = t.toLowerCase();
            return !lower.startsWith('advanced ') &&
                !lower.startsWith('future of ') &&
                !lower.startsWith('introduction to ');
        };

        const finalTopics = topics.filter(t => typeof t === 'string' && t.length > 5);

        if (finalTopics.length === 0) throw new Error("AI returned no usable topics");

        return { topics: finalTopics.slice(0, 4) };
    } catch (error) {
        console.error("Error suggesting topics:", error);
        return { topics: [] };
    }
}
