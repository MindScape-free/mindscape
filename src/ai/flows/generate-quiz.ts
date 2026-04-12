
import { z } from 'zod';
import { QuizSchema } from '../schemas/quiz-schema';
import { generateContent, AIProvider } from '../client-dispatcher';

export const GenerateQuizInputSchema = z.object({
    topic: z.string(),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    mindMapContext: z.string().optional(),
    pdfContext: z.string().optional(),
    apiKey: z.string().optional(),
    provider: z.string().optional() as z.Schema<AIProvider | undefined>,
});
export type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;

const SYSTEM_GUARANTEES = `SYSTEM GUARANTEES:
- Output MUST be valid JSON (no markdown, no extra text)
- If invalid → internally self-correct before final output
- Do NOT explain, only generate

PRIORITY ORDER:
1. JSON schema correctness
2. Factual accuracy
3. Completeness
4. Brevity
5. Style/persona

CONFLICT RESOLVER: If instructions conflict → schema > brevity > ignore style`;

// Extract category and subtopic names from mind map JSON context
function extractMindMapCategories(context: string): string[] {
    try {
        const data = JSON.parse(context);
        const names: string[] = [];
        
        // Handle single mode mind maps
        if (data.subTopics && Array.isArray(data.subTopics)) {
            for (const st of data.subTopics) {
                if (st.name) names.push(st.name);
                if (st.categories && Array.isArray(st.categories)) {
                    for (const cat of st.categories) {
                        if (cat.name) names.push(cat.name);
                    }
                }
            }
        }
        
        // Handle compare mode
        if (data.compareData?.dimensions) {
            for (const dim of data.compareData.dimensions) {
                if (dim.name) names.push(dim.name);
            }
        }
        
        return [...new Set(names)]; // Deduplicate
    } catch {
        return [];
    }
}

export async function generateQuizFlow(input: GenerateQuizInput): Promise<any> {
    const { topic, difficulty, mindMapContext, pdfContext } = input;
    const questionCount = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 8 : 12;
    const isCompareMode = mindMapContext && (mindMapContext.includes('"mode":"compare"') || mindMapContext.includes('compareData'));
    
    const categoryNames = mindMapContext ? extractMindMapCategories(mindMapContext) : [];
    const categoriesBlock = categoryNames.length > 0 
        ? `\nMIND MAP CATEGORIES (use these as conceptTags for proper matching):\n${categoryNames.slice(0, 20).map(n => `- "${n}"`).join('\n')}`
        : '';

    const systemPrompt = `${SYSTEM_GUARANTEES}

You are an educational quiz generator for MindScape.

${isCompareMode ? `COMPARE MODE: Questions MUST focus on sharp differences, trade-offs, and contrasting dimensions between the two topics in "${topic}". Challenge users to distinguish them by technical, philosophical, or operational traits.` : ''}

QUALITY RULES:
- Wrong options must be plausible (not obviously incorrect).
- No duplicate questions.
- No conceptTag repeated more than twice across all questions.
- Ensure even coverage across different aspects of the topic.
- Each question must test a distinct concept.${categoriesBlock}

CONCEPTTAG RULES:
- conceptTag MUST match ONE of the mind map category names exactly (or a close variant)
- If no category matches, use a concise subtopic name from the topic
- conceptTag should help users understand which section of the mind map this question relates to

SCHEMA (return ONLY this JSON):
{
  "topic": "${topic}",
  "difficulty": "${difficulty}",
  "questions": [
    {
      "id": "q1",
      "question": "Question text",
      "options": [
        {"id": "A", "text": "Plausible option"},
        {"id": "B", "text": "Plausible option"},
        {"id": "C", "text": "Plausible option"},
        {"id": "D", "text": "Plausible option"}
      ],
      "correctOptionId": "A",
      "conceptTag": "matching-category-name",
      "explanation": "Why this answer is correct."
    }
  ]
}

RULES:
- Generate EXACTLY ${questionCount} questions.
- Each question has exactly 4 options (A, B, C, D).
- Difficulty "${difficulty}" strictly enforced.
- Return ONLY the JSON object.
${pdfContext ? `\nSOURCE FILE CONTEXT (prioritize for questions):\n${pdfContext.substring(0, 7000)}` : ''}`;

    const userPrompt = `Generate a ${difficulty} quiz for: "${topic}".
${mindMapContext ? `Mind map context:\n${mindMapContext}` : ''}
${categoriesBlock}
${pdfContext ? `Use source file content for domain-specific questions.` : ''}
Return JSON with "topic", "difficulty", and "questions" at root level.`;

    const output = await generateContent({
        provider: (input as any).provider || 'pollinations',
        apiKey: (input as any).apiKey,
        systemPrompt,
        userPrompt,
        schema: QuizSchema,
    });

    if (!output) throw new Error('AI failed to generate a valid quiz.');

    if (output.quiz && Array.isArray(output.quiz) && !output.questions) {
        const firstQuestion = output.quiz[0];
        return {
            topic,
            difficulty: firstQuestion?.difficulty || difficulty,
            questions: output.quiz.map((q: any, i: number) => ({
                id: q.id || `q${i + 1}`,
                question: q.question,
                options: Array.isArray(q.options)
                    ? q.options.map((opt: string, j: number) => ({ id: ['A', 'B', 'C', 'D'][j], text: opt.replace(/^[A-D]\)\s*/, '') }))
                    : q.options,
                correctOptionId: q.correctOptionId || q.answer?.charAt(0) || 'A',
                conceptTag: q.conceptTag || topic,
                explanation: q.explanation || `The correct answer is ${q.answer || q.correctOptionId}`,
            })),
        };
    }

    return output;
}
