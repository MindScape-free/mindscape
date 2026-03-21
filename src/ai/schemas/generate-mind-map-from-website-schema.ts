/**
 * @fileOverview Zod schemas and TypeScript types for the website-to-mind-map generation flow.
 */

import { z } from 'zod';
import { AIGeneratedMindMapSchema, AIGeneratedMindMap } from '@/ai/mind-map-schema';

export const GenerateMindMapFromWebsiteInputSchema = z.object({
  url: z.string().url().describe('The URL of the website to generate a mind map from.'),
  content: z.object({
    title: z.string(),
    textContent: z.string(),
    textBlocks: z.array(z.object({
      type: z.string(),
      content: z.string(),
      level: z.number().optional()
    }))
  }).describe('The extracted content from the website.'),
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

export type GenerateMindMapFromWebsiteInput = z.infer<
  typeof GenerateMindMapFromWebsiteInputSchema
>;

export const GenerateMindMapFromWebsiteOutputSchema = AIGeneratedMindMapSchema;
export type GenerateMindMapFromWebsiteOutput = AIGeneratedMindMap;
