import { z } from 'zod';
import { generateContent } from '@/ai/client-dispatcher';

const MicroQuizOptionSchema = z.object({
    id: z.enum(['A', 'B', 'C', 'D']),
    text: z.string().min(1),
});

const MicroQuizSchema = z.object({
    question: z.string().min(1),
    options: z.array(MicroQuizOptionSchema).length(4),
    correctId: z.enum(['A', 'B', 'C', 'D']),
    explanation: z.string().min(1),
});

export type MicroQuizOutput = z.infer<typeof MicroQuizSchema>;

export async function regenerateMicroQuiz(
    nodeName: string,
    nodeDescription: string,
    mainTopic: string,
    apiKey?: string
): Promise<MicroQuizOutput> {
    const systemPrompt = `You are a quiz generator for a mind map learning platform.

Generate ONE multiple choice question about "${nodeName}" in the context of "${mainTopic}".

Rules:
- question: a clear, specific question, not trivially obvious
- options: exactly 4 options with ids A, B, C, D
- correctId: the id of the correct option
- explanation: 1-2 sentences explaining why the correct answer is right
- Make the question challenging but fair

Return ONLY this JSON:
{
  "question": "...",
  "options": [{"id": "A", "text": "..."}, ...],
  "correctId": "A",
  "explanation": "..."
}`;

    const userPrompt = `Generate a new quiz question about "${nodeName}".`;

    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const result = await generateContent({
                apiKey,
                systemPrompt,
                userPrompt,
                schema: MicroQuizSchema,
                options: { capability: 'fast' },
            });
            return result as MicroQuizOutput;
        } catch (e: any) {
            console.error(`Quiz regeneration attempt ${attempt} failed:`, e.message);
            if (attempt === 2) throw e;
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    throw new Error('Quiz regeneration failed');
}
