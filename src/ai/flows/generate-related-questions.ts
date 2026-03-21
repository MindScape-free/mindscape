'use server';

import { z } from 'zod';
import { RelatedQuestionsOutputSchema, RelatedQuestionsOutput } from '@/ai/schemas/related-questions-schema';
import { generateContent, AIProvider } from '@/ai/client-dispatcher';
import { mindscapeMap } from '@/lib/mindscape-data';

const RelatedQuestionsInputSchema = z.object({
    topic: z.string().describe('The primary topic of the mind map.'),
    mindMapData: z.any().optional().describe('The current mind map structure for context.'),
    history: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
    })).optional().describe('Recent chat history.'),
    pdfContext: z.string().optional().describe('Extracted text from a source PDF or file for contextual awareness.'),
});

export type RelatedQuestionsInput = z.infer<typeof RelatedQuestionsInputSchema>;

export async function generateRelatedQuestions(
    input: RelatedQuestionsInput & { apiKey?: string; provider?: AIProvider; strict?: boolean; pdfContext?: string }
): Promise<RelatedQuestionsOutput> {
    const { topic, mindMapData, history, provider, apiKey, strict, pdfContext: inputPdfContext } = input;

    const pdfContext = inputPdfContext || input.pdfContext;

    const historyText = history?.map(h => `- **${h.role}**: ${h.content}`).join('\n') || '';

    // Extract some nodes from mindMapData to keep context concise but relevant
    const mindMapContext = mindMapData ?
        `Mind Map Structure: ${JSON.stringify(mindMapData).substring(0, 2000)}...` :
        'No additional mind map structure provided.';

    const isUserGuideMode = topic.toLowerCase() === 'mindscape';
    let systemPrompt = '';

    if (isUserGuideMode) {
        systemPrompt = `You are the official **MindScape User Guide Assistant**.
        The user is exploring the "MindScape" application features via the self-reference map.
        
        ## 📘 Official Feature Map (Source of Truth)
        ${JSON.stringify(mindscapeMap).substring(0, 5000)}
        
        ${historyText ? `**Recent conversation**:\n${historyText}` : ''}
        
        ## 🎯 Your Task
        Suggest 3-4 natural follow-up questions that help the user discover MindScape's capabilities.
        Questions should be about:
        - Specific features (e.g., "how to use practice mode", "how to share a map")
        - Workflows (e.g., "how to publish a map", "how to compare topics")
        - Technical details (e.g., "what AI models are used")
        
        The output MUST be a valid JSON object:
        {
          "questions": ["Question 1?", "Question 2?", "Question 3?"]
        }
        
        IMPORTANT: Return ONLY the raw JSON object. Questions should be from the user's perspective (e.g. "How do I...?").`;
    } else {
        systemPrompt = `You are **MindSpark** ✨, an intelligent assistant focused on deepening user understanding within the **MindScape** application.
Your goal is to suggest 3-4 natural, engaging, and relevant follow-up questions that a user might want to ask next based on their current mind map and conversation.

🧠 **Main Topic**: ${topic}

${mindMapContext}

${historyText ? `**Recent conversation**:\n${historyText}` : ''}

---

## 🎯 Your Task
Generate 3-4 questions that:
1. Are directly related to the current topic and specific mind map nodes.
2. Encourage deeper exploration of the subject matter.
3. Feel like a natural continuation of the conversation.
4. Are concise (max 12 words per question).
5. Address parts of the mind map not yet discussed, or follow up on the last assistant response.

${pdfContext ? `## 📄 Source File Context
Use information from the following source document to suggest deeper follow-up questions:
${pdfContext.substring(0, 5000)}
` : ''}

The output MUST be a valid JSON object:
{
  "questions": ["Question 1?", "Question 2?", "Question 3?"]
}

IMPORTANT: Return ONLY the raw JSON object.`;
    }

    const userPrompt = "Generate the related questions.";

    try {
        const result = await generateContent({
            provider,
            apiKey,
            systemPrompt,
            userPrompt,
            schema: RelatedQuestionsOutputSchema,
            strict
        });

        return result;
    } catch (e: any) {
        console.error(`❌ Related questions generation failed:`, e.message);
        // Return empty array on failure instead of crashing the UI
        return { questions: [] };
    }
}
