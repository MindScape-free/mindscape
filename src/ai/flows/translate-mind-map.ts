
'use server';

import { z } from 'zod';
import { MindMapSchema } from '@/ai/mind-map-schema';
import { generateContent, AIProvider } from '@/ai/client-dispatcher';

const TranslateMindMapInputSchema = z.object({
  mindMapData: MindMapSchema,
  targetLang: z.string(),
});
export type TranslateMindMapInput = z.infer<typeof TranslateMindMapInputSchema>;
export type TranslateMindMapOutput = z.infer<typeof MindMapSchema>;

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

export async function translateMindMap(
  input: TranslateMindMapInput & { apiKey?: string; provider?: AIProvider; strict?: boolean }
): Promise<TranslateMindMapOutput> {
  const { provider, apiKey, mindMapData, targetLang, strict } = input;

  const systemPrompt = `${SYSTEM_GUARANTEES}

You are an expert translator for structured JSON mind map data.

TARGET LANGUAGE: ${targetLang}

TRANSLATION RULES:
- Translate ONLY: "topic", "name", "description", "shortTitle", "thought", "insight" fields.
- DO NOT translate: "icon", "mode", "id", "tags", "timestamp", or any key names.
- Preserve structure STRICTLY — do NOT reorder, add, or remove any nodes.
- Maintain the exact same JSON hierarchy and array order.

INPUT:
${JSON.stringify(mindMapData, null, 2)}

Return ONLY the translated JSON object with identical structure.`;

  const userPrompt = `Translate the JSON to ${targetLang}.`;

  return await generateContent({ provider, apiKey, systemPrompt, userPrompt, schema: MindMapSchema, strict });
}
