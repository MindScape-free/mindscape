
'use server';

import { z } from 'zod';
import { AIGeneratedMindMapSchema, AIGeneratedMindMap } from '@/ai/mind-map-schema';
import { generateContent, AIProvider } from '@/ai/client-dispatcher';

const GenerateMindMapFromImageInputSchema = z.object({
  imageDataUri: z.string(),
  targetLang: z.string().optional(),
  persona: z.string().optional(),
  depth: z.enum(['low', 'medium', 'deep', 'auto']).default('auto'),
  apiKey: z.string().optional(),
  sessionId: z.string().optional(),
  context: z.string().optional(),
});
type GenerateMindMapFromImageInput = z.infer<typeof GenerateMindMapFromImageInputSchema>;
export type GenerateMindMapFromImageOutput = AIGeneratedMindMap;

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

CONFLICT RESOLVER: If instructions conflict → schema > brevity > ignore style

GLOBAL RULES:
- Descriptions: exactly 1 sentence, ≤20 words
- Avoid vague words (important, various, many)
- Prefer concrete, specific terms
- Optional fields (thought, insight, tags): omit if not adding value — never fabricate`;

function buildPersona(persona: string): string {
  const p = (persona || 'teacher').toLowerCase().trim();
  if (p === 'concise') return `PERSONA: Concise — remove all explanations, use keywords only.`;
  if (p === 'creative') return `PERSONA: Creative — allow metaphors and non-obvious angles.`;
  if (p === 'sage') return `PERSONA: Cognitive Sage — reveal patterns, cross-domain links, philosophical depth.`;
  return `PERSONA: Structured Expert — clear, specific, curriculum-style.`;
}

export async function generateMindMapFromImage(
  input: GenerateMindMapFromImageInput & { apiKey?: string; provider?: AIProvider; strict?: boolean }
): Promise<GenerateMindMapFromImageOutput> {
  const { provider, apiKey, strict, depth = 'low' } = input;

  const densityMap: Record<string, string> = {
    low:    `subTopics: ≥4 | categories: ≥2 | subCategories: ≥3`,
    medium: `subTopics: ≥6 | categories: ≥4 | subCategories: ≥6`,
    deep:   `subTopics: ≥8 | categories: ≥6 | subCategories: ≥9`,
    auto:   `subTopics: ≥4 | categories: ≥2 | subCategories: ≥3`,
  };
  const density = densityMap[depth] || densityMap.low;

  const systemPrompt = `${SYSTEM_GUARANTEES}

You are an expert image analyst and mind map generator.

${buildPersona(input.persona || 'teacher')}
LANGUAGE: ${input.targetLang ? input.targetLang : 'en'}
DENSITY: ${density}

ENTITY EXTRACTION RULES (CRITICAL):
- If image is an ID, invoice, receipt, form, or MARKSHEET → PRIMARY GOAL is exact data extraction.
- TABLES: Transform each row into a Category. Each column value should be a SubCategory with its value as the description.
- BILINGUAL CONTENT: Extract both Hindi and English text if present.
- Combine field + value always: "Name: Megha" not just "Name".
- Never output a field label without its value if visible.
- PERSPECTIVE/TILT: Mentally flatten tilted documents; read row-by-row even if the image is slanted.
- DO NOT use placeholders like "[REDACTED]", "[PRIVACY]", "XXXX" — always use actual text.
- If OCR confidence is low for a specific cell → skip that cell, but keep the row structure if possible.

SCHEMA (return ONLY this JSON):
{
  "mode": "single",
  "topic": "Main topic from image content",
  "shortTitle": "2–4 word title (no 'Mind Map')",
  "icon": "lucide-kebab-case",
  "subTopics": [
    {
      "name": "Specific Section (e.g., 'Student Details' or 'Marks Table')",
      "icon": "lucide-kebab-case",
      "categories": [
        {
          "name": "Category Name (e.g., 'Subject: Hindi')",
          "icon": "lucide-kebab-case",
          "subCategories": [
            {
              "name": "Detail Name (e.g., 'Theory Marks')",
              "description": "Exactly 1 sentence, ≤20 words, concrete value from image (e.g., '53').",
              "icon": "lucide-kebab-case",
              "tags": ["tag1"]
            }
          ]
        }
      ]
    }
  ]
}

RULES:
- NEVER truncate — close all { and [ before stopping
- If the image is a table, ENSURE all rows are captured as Categories.
- Return ONLY raw JSON`;

  const userPrompt = input.context
    ? `Analyze this image and generate the mind map JSON. Additional instructions/focus from the user: "${input.context}"`
    : `Analyze this image and generate the mind map JSON.`;

  const matches = input.imageDataUri.match(/^data:(.+);base64,(.+)$/);
  let images: { inlineData: { mimeType: string; data: string } }[] | undefined;
  if (matches) images = [{ inlineData: { mimeType: matches[1], data: matches[2] } }];

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await generateContent({ provider, apiKey, systemPrompt, userPrompt, images, schema: AIGeneratedMindMapSchema, strict });
    } catch (e: any) {
      console.error(`❌ Image-to-map attempt ${attempt} failed:`, e.message);
      if (attempt === 2) throw e;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error('Image-to-map generation failed');
}
