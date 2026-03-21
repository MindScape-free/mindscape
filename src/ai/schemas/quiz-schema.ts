import { z } from 'zod';

export const QuizOptionSchema = z.object({
    id: z.enum(['A', 'B', 'C', 'D']),
    text: z.string(),
});

export const QuizQuestionSchema = z.object({
    id: z.string(),
    question: z.string(),
    options: z.array(QuizOptionSchema).length(4),
    correctOptionId: z.enum(['A', 'B', 'C', 'D']),
    conceptTag: z.string().describe('The core topic or skill this question tests (e.g., "Auto Layout", "Closures")'),
    explanation: z.string().describe('A brief explanation of why the correct answer is right'),
});

export const QuizSchema = z.object({
    topic: z.string(),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    questions: z.array(QuizQuestionSchema),
});

export type QuizOption = z.infer<typeof QuizOptionSchema>;
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
export type Quiz = z.infer<typeof QuizSchema>;

export interface QuizResult {
    score: number;
    totalQuestions: number;
    correctAnswers: string[]; // Array of question IDs
    wrongAnswers: string[];   // Array of question IDs
    weakAreas: Record<string, number>; // conceptTag -> count of mistakes
    strongAreas: string[];
}
