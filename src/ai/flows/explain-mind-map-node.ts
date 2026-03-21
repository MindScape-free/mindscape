
'use server';

/**
 * @fileOverview Provides detailed explanations for mind map nodes.
 *
 * - explainMindMapNode - A function that generates a detailed explanation for a mind map node.
 * - ExplainMindMapNodeInput - The input type for the explainMindMapNode function.
 * - ExplainMindMapNodeOutput - The return type for the explainMindMapNode function.
 */

import { z } from 'zod';
import { mindscapeMap } from '@/lib/mindscape-data';

const ExplainMindMapNodeInputSchema = z.object({
  mainTopic: z.string().describe('The main topic of the mind map.'),
  subCategoryName: z.string().describe('The name of the sub-category.'),
  subCategoryDescription: z
    .string()
    .describe('The brief description of the sub-category.'),
  explanationMode: z
    .enum(['Beginner', 'Intermediate', 'Expert'])
    .describe('The desired level of detail for the explanation.'),
  apiKey: z.string().optional().describe('Optional custom API key to use for this request.'),
  pdfContext: z.string().optional().describe('Extracted text from a source PDF or file for contextual awareness.'),
});
export type ExplainMindMapNodeInput = z.infer<
  typeof ExplainMindMapNodeInputSchema
>;

const ExplainMindMapNodeOutputSchema = z.object({
  explanationPoints: z
    .array(z.string())
    .describe(
      'A list of small, focused bullet points explaining the sub-category.'
    ),
});
export type ExplainMindMapNodeOutput = z.infer<
  typeof ExplainMindMapNodeOutputSchema
>;

import { generateContent, AIProvider } from '@/ai/client-dispatcher';

// Simplified to always use client-dispatcher
export async function explainMindMapNode(
  input: ExplainMindMapNodeInput & { apiKey?: string; provider?: AIProvider; strict?: boolean; pdfContext?: string }
): Promise<ExplainMindMapNodeOutput> {
  const { provider, apiKey, mainTopic, subCategoryName, subCategoryDescription, explanationMode, strict, pdfContext: inputPdfContext } = input;

  const pdfContext = inputPdfContext || input.pdfContext;

  const isUserGuideMode = mainTopic.toLowerCase() === 'mindscape';
  let systemPrompt = '';

  if (isUserGuideMode) {
    systemPrompt = `You are the official **MindScape Product Expert**.
    
    The user is asking for an explanation of a feature within the MindScape application itself.
    Feature Name: "${subCategoryName}"
    Description: "${subCategoryDescription}"
    
    ## 📘 Official MindScape Feature Map (Source of Truth)
    ${JSON.stringify(mindscapeMap, null, 2)}
    
    Your task is to generate 3-7 distinct, high-quality explanation points about this SPECIFIC MindScape feature.
    
    The explanation must be:
    1. **Accurate**: Based strictly on the feature map data above.
    2. **Actionable**: Explain where to find the feature (e.g., Toolbar, Home Page) and how to use it.
    3. **Level-Appropriate**: "${explanationMode}" level.
       - Beginner: Simple "How-to" and basic benefits.
       - Intermediate: Specific workflows and feature details.
       - Expert: Technical details, stack info (if technical), and advanced capabilities.
       
    The output MUST be a valid JSON object with the following structure:
    {
      "explanationPoints": [
        "First point about where to find this feature...",
        "Second point explaining exactly what it does...",
        "Third point giving a usage tip..."
      ]
    }
    
    IMPORTANT: Do not give generic definitions (e.g., "Mind mapping is..."). Explain "MindScape's Mind Map Engine". Return ONLY the raw JSON object.`;
  } else {
    systemPrompt = `You are an expert AI assistant providing detailed, multi-faceted explanations for mind map concepts.
    
    The main topic of the mind map is: "${mainTopic}".
    The specific concept to explain is: "${subCategoryName}".
    Current brief description: "${subCategoryDescription}".
    
    The user has requested a "${explanationMode}" level explanation.
    - Beginner: Simple terms, daily analogies, no jargon.
    - Intermediate: Conceptual depth, professional tone, practical context.
    - Expert: Technical details, nuance, advanced terminology.
    
    Each point should:
    1. Focus on a specific aspect (e.g., definition, use case, historical context, key feature, or relationship to "${mainTopic}").
    2. Be informative and provide knowledge beyond the current brief description.
    3. Be formatted as a single, clear sentence or short paragraph.
    
    ${pdfContext ? `## 📄 Source File Context
    The user has provided a source file (PDF/Image text) related to this mind map. 
    CRITICAL: You MUST prioritize using the information from this source document for your explanation to ensure it is contextually accurate to the user's specific research material.
    
    Source Content:
    ${pdfContext.substring(0, 6000)}
    ` : ''}
    
    The output MUST be a valid JSON object with the following structure:
    {
      "explanationPoints": [
        "First detailed point about the concept...",
        "Second detailed point focusing on a different aspect...",
        "Third point providing context or an example..."
      ]
    }
    
    IMPORTANT: Provide 3-7 points depending on the depth of the concept. Return ONLY the raw JSON object. No extra text, no markdown, no apologies, and no internal constraint markers.`;
  }

  const userPrompt = `Generate a "${explanationMode}" level explanation JSON for "${subCategoryName}".`;

  const maxAttempts = 2;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await generateContent({
        provider,
        apiKey,
        systemPrompt,
        userPrompt,
        schema: ExplainMindMapNodeOutputSchema,
        strict
      });

      // Post-process: Clean up any AI artifacts (leakage) in the explanation points
      if (result && Array.isArray(result.explanationPoints)) {
        result.explanationPoints = result.explanationPoints.map((point: string) => {
          return point
            .replace(/<\|[\s\S]*?\|>/g, '') // Remove <|constrain|> and similar markers
            .replace(/\} \}/g, '')          // Remove leaked JSON closing brackets
            .replace(/Sorry, but there's no problem\.?/gi, '') // Remove common AI filler
            .replace(/"] }/g, '')           // Remove another common leakage pattern
            .trim();
        }).filter((p: string) => p.length > 5); // Filter out any empty/garbage points
      }

      return result;
    } catch (e: any) {
      lastError = e;
      console.error(`❌ Explanation attempt ${attempt} failed:`, e.message);
      if (attempt === maxAttempts) throw e;
      await new Promise(res => setTimeout(res, 1000));
    }
  }

  throw lastError || new Error('Explanation generation failed');
}
