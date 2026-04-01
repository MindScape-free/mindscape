
import { z } from 'zod';
import { generateContent, AIProvider } from '@/ai/client-dispatcher';

export const RelatedTopicsSchema = z.object({
    topics: z.array(z.string()),
});

const SYSTEM_GUARANTEES = `SYSTEM GUARANTEES:
- Output MUST be valid JSON (no markdown, no extra text)
- If invalid → internally self-correct before final output
- Do NOT explain, only generate`;

export async function suggestRelatedTopics(
    input: { topic: string; summary?: string; provider?: AIProvider; apiKey?: string }
): Promise<{ topics: string[] }> {
    const { topic, summary, provider = 'pollinations', apiKey } = input;

    const systemPrompt = `${SYSTEM_GUARANTEES}

You are an expert polymath and brainstorming strategist.
Suggest 3–4 highly specific, unique, and non-obvious topics branching from the current topic.

REJECT these patterns (do not generate):
- "Advanced [X]"
- "Future of [X]"
- "Introduction to [X]"
- "Evolution of [X]"
- "Basics of [X]"
- "Overview of [X]"

PREFER:
- Niche sub-disciplines
- Controversial debates within the field
- Practical specialized applications
- Interdisciplinary connections to unrelated fields

Respond with a JSON object: { "topics": ["topic1", "topic2", "topic3", "topic4"] }`;

    const userPrompt = `Current mind map: "${topic}".
${summary ? `Context: ${summary}` : ''}

Brainstorm 4 unique directions that would fascinate someone already knowledgeable about "${topic}".
Each suggestion: self-contained, intriguing, 5–10 words.`;

    try {
        const result = await generateContent({ provider: 'pollinations', capability: 'creative', apiKey, systemPrompt, userPrompt, schema: RelatedTopicsSchema });

        let topics: string[] = result.topics || result.related_topics || result.suggestions || [];
        if (!topics.length && typeof result === 'object') {
            const firstArr = Object.values(result).find(v => Array.isArray(v));
            if (firstArr) topics = firstArr as string[];
        }

        const filtered = topics.filter(t => typeof t === 'string' && t.length > 5);
        if (!filtered.length) throw new Error('No usable topics returned');
        return { topics: filtered.slice(0, 4) };
    } catch (e) {
        console.error('Error suggesting topics:', e);
        return { topics: [] };
    }
}
