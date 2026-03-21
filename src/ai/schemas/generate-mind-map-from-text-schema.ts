
/**
 * @fileOverview Zod schemas and TypeScript types for the text-to-mind-map generation flow.
 */

import { z } from 'zod';
import { AIGeneratedMindMapSchema, AIGeneratedMindMap } from '@/ai/mind-map-schema';

export const GenerateMindMapFromTextInputSchema = z.object({
  text: z
    .string()
    .describe('A block of text, such as from a document or notes.'),
  context: z
    .string()
    .optional()
    .describe('Optional additional context or instructions from the user.'),
  targetLang: z
    .string()
    .optional()
    .describe('The target language for the mind map content (e.g., "es").'),
  persona: z
    .string()
    .optional()
    .describe('The AI persona / style to use (e.g., "Teacher", "Concise", "Creative").'),
  depth: z
    .enum(['low', 'medium', 'deep'])
    .default('low')
    .describe('The level of detail/depth for the mind map structure.'),
  apiKey: z.string().optional().describe('Optional custom API key to use for this request.'),
  sessionId: z.string().optional().describe('The session ID for the current mind map.'),
});
export type GenerateMindMapFromTextInput = z.infer<
  typeof GenerateMindMapFromTextInputSchema
>;

export const GenerateMindMapFromTextOutputSchema = AIGeneratedMindMapSchema;
export type GenerateMindMapFromTextOutput = AIGeneratedMindMap;
