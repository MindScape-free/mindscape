import { z } from 'zod';

export const RelatedQuestionsOutputSchema = z.object({
    questions: z.array(z.string()).describe('An array of 3-4 related questions based on the context.'),
});

export type RelatedQuestionsOutput = z.infer<typeof RelatedQuestionsOutputSchema>;
