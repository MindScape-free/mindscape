
'use server';

import {
  AnalyzeImageContentInput,
  AnalyzeImageContentInputSchema,
  AnalyzeImageContentOutput,
  AnalyzeImageContentOutputSchema,
} from '@/ai/schemas/analyze-image-content-schema';
import { generateContent, AIProvider } from '@/ai/client-dispatcher';

const SYSTEM_GUARANTEES = `SYSTEM GUARANTEES:
- Output MUST be valid JSON (no markdown, no extra text)
- If invalid → internally self-correct before final output
- Do NOT explain, only generate

PRIORITY ORDER:
1. JSON schema correctness
2. Factual accuracy
3. Completeness
4. Brevity
5. Style/persona

CONFLICT RESOLVER: If instructions conflict → schema > brevity > ignore style`;

export async function analyzeImageContent(
  input: AnalyzeImageContentInput & { apiKey?: string; provider?: AIProvider; strict?: boolean }
): Promise<AnalyzeImageContentOutput> {
  const { provider, apiKey, imageDataUri, strict } = input;

  const systemPrompt = `${SYSTEM_GUARANTEES}

You are an expert image analyst and OCR engine.

TASK: Extract all meaningful information from the provided image in three separate sections:

1. RAW TEXT EXTRACTION
   - Extract all visible text exactly as it appears.
   - Preserve formatting, labels, and values.
   - Do NOT paraphrase or interpret — copy verbatim.

2. VISUAL DESCRIPTION
   - Describe all key visual elements: charts, diagrams, photographs, layouts.
   - Identify structure: tables, forms, graphs, diagrams.
   - Note spatial relationships between elements.

3. SUMMARY
   - Provide a cohesive textual summary combining text and visual elements.
   - Identify names, dates, numbers, and technical terms.
   - If form or ID → extract field-value pairs explicitly.

RULES:
- Focus on information density and accuracy.
- Do NOT mention base64 or extraction artifacts.
- Do NOT guess uncertain text — skip if OCR confidence is low.`;

  const userPrompt = `Analyze this image and provide comprehensive textual extraction of all content.`;

  const matches = imageDataUri.match(/^data:(.+);base64,(.+)$/);
  if (!matches) throw new Error('Invalid image data URI format');
  const images = [{ inlineData: { mimeType: matches[1], data: matches[2] } }];

  const result = await generateContent({ provider, apiKey, systemPrompt, userPrompt, images, schema: AnalyzeImageContentOutputSchema, strict });

  if (!result.content) {
    const parts = [
      result.extracted_text && `### Extracted Text\n${result.extracted_text}`,
      result.visual_elements && `### Visual Description\n${result.visual_elements}`,
      result.identified_entities && `### Key Entities\n${result.identified_entities}`,
      result.summary && `### Summary\n${result.summary}`,
      result.insight && `### Insights\n${result.insight}`,
    ].filter(Boolean);
    result.content = parts.join('\n\n') || 'Image analyzed but no specific content extracted.';
  }

  return result;
}
