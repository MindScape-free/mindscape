'use server';

import { 
  AnalyzeImageContentInput, 
  AnalyzeImageContentInputSchema,
  AnalyzeImageContentOutput,
  AnalyzeImageContentOutputSchema
} from '@/ai/schemas/analyze-image-content-schema';
import { generateContent, AIProvider } from '@/ai/client-dispatcher';

/**
 * Analyzes an image and extracts its content (OCR + visual description).
 */
export async function analyzeImageContent(
  input: AnalyzeImageContentInput & { apiKey?: string; provider?: AIProvider; strict?: boolean }
): Promise<AnalyzeImageContentOutput> {
  const { provider, apiKey, imageDataUri, strict } = input;

  const systemPrompt = `You are an expert image analyst and OCR engine.
  Your task is to extract all meaningful information from the provided image.
  
  1. Extract all visible text exactly as it appears.
  2. Describe all key visual elements, charts, diagrams, or photographs.
  3. Identify names, dates, numbers, and technical terms.
  4. If the image is a form or ID, extract the field-value pairs.
  5. Provide a cohesive textual summary of the image that can be used for secondary analysis.
  
  Focus on information density and accuracy. Do not mention base64 or noisy extraction artifacts.`;

  const userPrompt = "Analyze this image and provide a comprehensive textual extraction of all its content.";

  // Parse Data URI
  const matches = imageDataUri.match(/^data:(.+);base64,(.+)$/);
  let images: { inlineData: { mimeType: string, data: string } }[] | undefined;

  if (matches) {
    images = [{ inlineData: { mimeType: matches[1], data: matches[2] } }];
  } else {
    throw new Error('Invalid image data URI format');
  }

  const result = await generateContent({
    provider,
    apiKey,
    systemPrompt,
    userPrompt,
    images,
    schema: AnalyzeImageContentOutputSchema,
    strict
  });

  // Consolidate rich output into a single string for general use if not already populated
  if (!result.content) {
    const parts = [
      result.extracted_text && `### Extracted Text\n${result.extracted_text}`,
      result.visual_elements && `### Visual Description\n${result.visual_elements}`,
      result.identified_entities && `### Key Entities\n${result.identified_entities}`,
      result.summary && `### Summary\n${result.summary}`,
      result.insight && `### Insights\n${result.insight}`
    ].filter(Boolean);

    result.content = parts.join('\n\n') || 'Image analyzed but no specific content extracted.';
  }

  return result;
}
