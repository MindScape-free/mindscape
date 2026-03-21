/**
 * @fileOverview Zod schemas and TypeScript types for the chat summarization flow.
 */

import { z } from 'zod';

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

export const SummarizeChatInputSchema = z.object({
  history: z
    .array(MessageSchema)
    .describe('The conversation history to be summarized.'),
  apiKey: z.string().optional().describe('Optional custom API key to use for this request.'),
});
export type SummarizeChatInput = z.infer<typeof SummarizeChatInputSchema>;

export const SummarizeChatOutputSchema = z.object({
  topic: z
    .string()
    .describe(
      'A short, descriptive topic title for the conversation (3-5 words).'
    ),
});
export type SummarizeChatOutput = z.infer<typeof SummarizeChatOutputSchema>;
