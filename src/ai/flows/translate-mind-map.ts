
'use server';

/**
 * @fileOverview Translates a mind map to a target language.
 *
 * - translateMindMap - A function that handles the translation.
 * - TranslateMindMapInput - The input type for the translateMindMap function.
 * - TranslateMindMapOutput - The return type for the translateMindMap function.
 */

import { z } from 'zod';
import { MindMapSchema } from '@/ai/mind-map-schema';

const TranslateMindMapInputSchema = z.object({
  mindMapData: MindMapSchema.describe(
    'The mind map object to be translated.'
  ),
  targetLang: z.string().describe('The target language code (e.g., "es").'),
});
export type TranslateMindMapInput = z.infer<typeof TranslateMindMapInputSchema>;

const TranslateMindMapOutputSchema = MindMapSchema;

export type TranslateMindMapOutput = z.infer<
  typeof TranslateMindMapOutputSchema
>;

import { generateContent, AIProvider } from '@/ai/client-dispatcher';

// Simplified to always use client-dispatcher
export async function translateMindMap(
  input: TranslateMindMapInput & { apiKey?: string; provider?: AIProvider; strict?: boolean }
): Promise<TranslateMindMapOutput> {
  const { provider, apiKey, mindMapData, targetLang, strict } = input;
  const mindMapDataString = JSON.stringify(mindMapData, null, 2);
  const systemPrompt = `You are an expert translator. Translate the provided mind map JSON data into the target language: ${targetLang}.
  
    - Translate all user-facing strings: 'topic', 'name', and 'description'.
    - Do NOT translate the 'icon' fields. Keep them as they are.
    - Ensure the output is a valid JSON object with the same structure as the input.
  
    Original Mind Map Data:
    ${mindMapDataString}
  
    Translate this into ${targetLang} and return only the translated JSON object.`;

  const userPrompt = "Translate the JSON.";
  const result = await generateContent({
    provider,
    apiKey,
    systemPrompt,
    userPrompt,
    schema: TranslateMindMapOutputSchema,
    strict
  });

  return result;
}
