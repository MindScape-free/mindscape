
'use server';

import { z } from 'zod';
import { RelatedQuestionsOutputSchema, RelatedQuestionsOutput } from '@/ai/schemas/related-questions-schema';
import { generateContent, AIProvider } from '@/ai/client-dispatcher';
import { mindscapeMap } from '@/lib/mindscape-data';

const RelatedQuestionsInputSchema = z.object({
    topic: z.string(),
    mindMapData: z.any().optional(),
    history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })).optional(),
    pdfContext: z.string().optional(),
});
export type RelatedQuestionsInput = z.infer<typeof RelatedQuestionsInputSchema>;

const SYSTEM_GUARANTEES = `SYSTEM GUARANTEES:
- Output MUST be valid JSON (no markdown, no extra text)
- If invalid → internally self-correct before final output
- Do NOT explain, only generate`;

export async function generateRelatedQuestions(
    input: RelatedQuestionsInput & { apiKey?: string; provider?: AIProvider; strict?: boolean; pdfContext?: string }
): Promise<RelatedQuestionsOutput> {
    const { topic, mindMapData, history, provider, apiKey, strict, pdfContext } = input;

    const historyText = history?.map(h => `${h.role}: ${h.content}`).join('\n') || '';
    const mapContext = mindMapData ? `Map structure: ${JSON.stringify(mindMapData).substring(0, 2000)}` : '';
    const isUserGuideMode = topic.toLowerCase() === 'mindscape';

    const systemPrompt = isUserGuideMode
        ? `${SYSTEM_GUARANTEES}

You are the official MindScape User Guide Assistant.

## Feature Map (Source of Truth)
${JSON.stringify(mindscapeMap).substring(0, 5000)}

${historyText ? `Recent conversation:\n${historyText}` : ''}

Suggest 3–4 follow-up questions to help the user discover MindScape features.
Each question must target a DIFFERENT feature or workflow — no overlap.
Questions about: specific features, workflows, technical details.
From user's perspective: "How do I...?"

Return ONLY: { "questions": ["Q1?", "Q2?", "Q3?"] }`
        : `${SYSTEM_GUARANTEES}

You are MindSpark ✨, an AI assistant in MindScape.

Topic: ${topic}
${mapContext}
${historyText ? `Recent conversation:\n${historyText}` : ''}
${pdfContext ? `\nSource document context:\n${pdfContext.substring(0, 5000)}` : ''}

Generate 3–4 follow-up questions.

RULES:
- Each question must target a DIFFERENT node or unexplored gap in the mind map.
- No two questions about the same concept or branch.
- Concise: max 12 words per question.
- Natural continuation of the conversation.

Return ONLY: { "questions": ["Q1?", "Q2?", "Q3?"] }`;

    const userPrompt = `Generate the related questions.`;

    try {
        return await generateContent({ provider, apiKey, systemPrompt, userPrompt, schema: RelatedQuestionsOutputSchema, strict });
    } catch (e: any) {
        console.error(`❌ Related questions failed:`, e.message);
        return { questions: [] };
    }
}
