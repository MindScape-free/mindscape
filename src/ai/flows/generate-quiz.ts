import { z } from 'zod';
import { QuizSchema } from '../schemas/quiz-schema';
import { generateContent, AIProvider } from '../client-dispatcher';

export const GenerateQuizInputSchema = z.object({
    topic: z.string(),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    mindMapContext: z.string().optional().describe('Text representation of the mind map nodes and structure'),
    pdfContext: z.string().optional().describe('Extracted text from a source PDF or file for contextual awareness'),
    apiKey: z.string().optional(),
    provider: z.string().optional() as z.Schema<AIProvider | undefined>
});

export type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;

// Plain async function
export async function generateQuizFlow(input: GenerateQuizInput): Promise<any> {
    const { topic, difficulty, mindMapContext, pdfContext } = input;


    // Determine question count based on difficulty
    const questionCount = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 8 : 12;

    const isCompareMode = mindMapContext && (mindMapContext.includes('"mode":"compare"') || mindMapContext.includes('compareData'));

    const systemPrompt = `You are an educational assessment generator for MindScape, an adaptive learning platform.
    Your goal is to generate a high-quality, multiple-choice quiz that helps users master a topic.
    
    ${isCompareMode ? `CRITICAL: The user is in "Comparison Mode" between two topics. 
    Your questions MUST focus on the SHARP differences, trade-offs, and contrasting dimensions between the two topics. 
    Challenge the user to distinguish ${topic.replace(' vs ', ' from ')} based on technical, philosophical, or operational traits.` : ''}

    CRITICAL: You MUST return a JSON object with this EXACT structure:
    {
      "topic": "string (the quiz topic)",
      "difficulty": "easy" | "medium" | "hard",
      "questions": [
        {
          "id": "unique-id",
          "question": "question text",
          "options": [
            {"id": "A", "text": "option text"},
            {"id": "B", "text": "option text"},
            {"id": "C", "text": "option text"},
            {"id": "D", "text": "option text"}
          ],
          "correctOptionId": "A" | "B" | "C" | "D",
          "conceptTag": "specific sub-topic",
          "explanation": "why the answer is correct"
        }
      ]
    }
    
    Rules:
    - Generate EXACTLY ${questionCount} questions (${difficulty} difficulty = ${questionCount} questions).
    - Each question MUST have exactly 4 options (A, B, C, D).
    - Provide a "conceptTag" for each question that identifies the specific sub-topic or skill.
    - If mindMapContext is provided, ground the questions in that specific hierarchy.
    - If pdfContext is provided, prioritize information from the source file for more accurate questions.
    - Ensure difficulty level "${difficulty}" is strictly followed.
    - Return ONLY the JSON object, no wrapper, no extra fields.
    
    ${pdfContext ? `## 📄 Source File Context
    Analyze the following source content to generate relevant questions:
    ${pdfContext.substring(0, 7000)}
    ` : ''}`;

    const userPrompt = `Generate a ${difficulty} quiz for the topic: "${topic}".
    ${mindMapContext ? `Use the following mind map structure for context:\n${mindMapContext}` : ''}
    ${pdfContext ? `Use the provided source file content for specific domain knowledge.` : ''}
    
    Remember: Return the JSON with "topic", "difficulty", and "questions" at the root level.`;

    const output = await generateContent({
        provider: (input as any).provider || 'pollinations',
        apiKey: (input as any).apiKey,
        systemPrompt,
        userPrompt,
        schema: QuizSchema,
    });

    if (!output) {
        throw new Error('AI failed to generate a valid quiz.');
    }

    // Transform if the AI returned {quiz: [...]} instead of {topic, difficulty, questions: [...]}
    if (output.quiz && Array.isArray(output.quiz) && !output.questions) {
        console.log('🔄 Transforming quiz response from {quiz: [...]} to correct format');

        const firstQuestion = output.quiz[0];
        const extractedDifficulty = firstQuestion?.difficulty || difficulty;

        return {
            topic,
            difficulty: extractedDifficulty,
            questions: output.quiz.map((q: any, index: number) => ({
                id: q.id || `q${index + 1}`,
                question: q.question,
                options: Array.isArray(q.options)
                    ? q.options.map((opt: string, i: number) => ({
                        id: ['A', 'B', 'C', 'D'][i],
                        text: opt.replace(/^[A-D]\)\s*/, '')
                    }))
                    : q.options,
                correctOptionId: q.correctOptionId || q.answer?.charAt(0) || 'A',
                conceptTag: q.conceptTag || topic,
                explanation: q.explanation || `The correct answer is ${q.answer || q.correctOptionId}`
            }))
        };
    }

    return output;
}
