
'use server';

/**
 * @fileOverview Generates a mind map from an image.
 *
 * - generateMindMapFromImage - A function that generates the mind map from an image.
 * - GenerateMindMapFromImageInput - The input type for the function.
 * - GenerateMindMapFromImageOutput - The return type for the function.
 */

import { z } from 'zod';
import { AIGeneratedMindMapSchema, AIGeneratedMindMap } from '@/ai/mind-map-schema';

const GenerateMindMapFromImageInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "An image of a diagram, chart, or concept, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
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
type GenerateMindMapFromImageInput = z.infer<
  typeof GenerateMindMapFromImageInputSchema
>;

const GenerateMindMapFromImageOutputSchema = AIGeneratedMindMapSchema;

export type GenerateMindMapFromImageOutput = AIGeneratedMindMap;

import { generateContent, AIProvider } from '@/ai/client-dispatcher';

export async function generateMindMapFromImage(
  input: GenerateMindMapFromImageInput & { apiKey?: string; provider?: AIProvider; strict?: boolean }
): Promise<GenerateMindMapFromImageOutput> {
  const { provider, apiKey, strict, depth = 'low' } = input;

  // Map depth to structural density
  let densityInstruction = '';
  if (depth === 'medium') {
    densityInstruction = 'STRUCTURE DENSITY: Generate AT LEAST 6 subTopics. Each subTopic MUST have AT LEAST 4 categories. Each category MUST have AT LEAST 6 subCategories.';
  } else if (depth === 'deep') {
    densityInstruction = 'STRUCTURE DENSITY: Generate AT LEAST 8 subTopics. Each subTopic MUST have AT LEAST 6 categories. Each category MUST have AT LEAST 9 subCategories. Extract as much detail as possible from the image.';
  } else {
    densityInstruction = 'STRUCTURE DENSITY: Generate AT LEAST 4 subTopics. Each subTopic MUST have AT LEAST 2 categories. Each category MUST have AT LEAST 3 subCategories.';
  }

  const targetLangInstruction = input.targetLang
    ? `The entire mind map, including all topics, categories, and descriptions, MUST be in the following language: ${input.targetLang}.`
    : `The entire mind map MUST be in English.`;

  let personaInstruction = '';
  if (input.persona === 'Teacher') {
    personaInstruction = `
    ADOPT PERSONA: "Expert Teacher"
    - Use educational analogies to explain concepts found in the image.
    - Focus on tutorial-style descriptions.
    - Structure the map like a syllabus.
    - Descriptions should be encouraging and clear.`;
  } else if (input.persona === 'Concise') {
    personaInstruction = `
    ADOPT PERSONA: "Efficiency Expert"
    - Keep all analyzed content extremely brief.
    - Use high-impact keywords for topics and categories.
    - Descriptions should be very short pointers (max 15 words).`;
  } else if (input.persona === 'Creative') {
    personaInstruction = `
    ADOPT PERSONA: "Creative Visionary"
    - Find imaginative interpretations of the visual data.
    - Use vivid, descriptive language.
    - Imagine future or alternate versions of the concepts in the image.
    - Make the result feel inspired and non-obvious.`;
  } else {
    personaInstruction = `
    ADOPT PERSONA: "Standard Academic Assistant"
    - Provide a balanced and well-structured analysis of the image.
    - Use clear, professional, yet accessible language.
    - Ensure comprehensive coverage of all visible details.
    - Keep descriptions highly focused and exactly one sentence.`;
  }

  const systemPrompt = `You are an expert in analyzing images and PDF documents and creating structured, comprehensive mind maps from them.
  
  ${personaInstruction}
  
  Analyze the provided image or document and generate a detailed, multi-layered mind map based on its content.
  
  **CRITICAL ENTITY EXTRACTION RULE**: 
  If the image appears to be an identity document (Aadhar card, ID, passport), an invoice, a receipt, or a form, your PRIMARY GOAL is exact data extraction.
  1. DO NOT create generic, conceptual categories like "Cardholder Details" -> "Name" -> "Indicates the name of the person".
  2. YOU MUST USE THE ACTUAL DATA. Combine fields and values: "Megha's Identity" -> "Name: Megha" -> "DOB: 01/01/1990".
  3. Never output a field name (like "Address" or "ID Number") without its corresponding value if it's visible. 
  4. Fill the structure with the **actual, literal data, numbers, dates, and entity names** extracted by OCR from the visual content.
  
  ${densityInstruction}
  
  ${targetLangInstruction}
  
  The mind map must have the following structure:
  {
    "mode": "single",
    "topic": "The main topic identified from the content",
    "shortTitle": "A condensed, smart, and catchy version (max 2-4 words). DO NOT include 'Mind Map'.",
    "icon": "relevant-lucide-icon",
    "subTopics": [
      {
        "name": "Main sub-topic name",
        "icon": "relevant-lucide-icon",
        "categories": [
          {
            "name": "Category name",
            "icon": "relevant-lucide-icon",
            "subCategories": [
              {
                "name": "Detailed sub-category name",
                "description": "Exactly one sentence derived from image data.",
                "icon": "relevant-lucide-icon",
                "tags": ["key1", "key2"]
              }
            ]
          }
        ]
      }
    ]
  }
  
  The output must be a valid JSON object that adheres to the schema.`;

  const userPrompt = "Analyze this image/document and generate the mind map JSON.";

  // Parse Data URI
  const matches = input.imageDataUri.match(/^data:(.+);base64,(.+)$/);
  let images: { inlineData: { mimeType: string, data: string } }[] | undefined;

  if (matches) {
    images = [{ inlineData: { mimeType: matches[1], data: matches[2] } }];
  }

  const maxAttempts = 2;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await generateContent({
        provider,
        apiKey,
        systemPrompt,
        userPrompt,
        images,
        schema: GenerateMindMapFromImageOutputSchema,
        strict
      });

      return result;
    } catch (e: any) {
      lastError = e;
      console.error(`❌ Image-to-map generation attempt ${attempt} failed:`, e.message);
      if (attempt === maxAttempts) throw e;
      await new Promise(res => setTimeout(res, 1000));
    }
  }

  throw lastError || new Error('Image-to-map generation failed');
}
