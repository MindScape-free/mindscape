
'use server';

import { z } from 'zod';
import { mindscapeMap } from '@/lib/mindscape-data';
import { generateContent, AIProvider } from '@/ai/client-dispatcher';

const ExplainMindMapNodeInputSchema = z.object({
  mainTopic: z.string(),
  subCategoryName: z.string(),
  subCategoryDescription: z.string(),
  explanationMode: z.enum(['Beginner', 'Intermediate', 'Expert']),
  apiKey: z.string().optional(),
  pdfContext: z.string().optional(),
  targetLanguage: z.string().optional(),
});
export type ExplainMindMapNodeInput = z.infer<typeof ExplainMindMapNodeInputSchema>;

const ExplainMindMapNodeOutputSchema = z.object({
  explanationPoints: z.array(z.string()),
});
export type ExplainMindMapNodeOutput = z.infer<typeof ExplainMindMapNodeOutputSchema>;

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

export async function explainMindMapNode(
  input: ExplainMindMapNodeInput & { apiKey?: string; provider?: AIProvider; strict?: boolean; pdfContext?: string }
): Promise<ExplainMindMapNodeOutput> {
  const { provider, apiKey, mainTopic, subCategoryName, subCategoryDescription, explanationMode, strict, pdfContext } = input;
  const isUserGuideMode = mainTopic.toLowerCase() === 'mindscape';

  const systemPrompt = isUserGuideMode
    ? `${SYSTEM_GUARANTEES}

You are the official MindScape Product Expert.

Feature: "${subCategoryName}"
Description: "${subCategoryDescription}"

## MindScape Feature Map (Source of Truth)
${JSON.stringify(mindscapeMap, null, 2)}

Generate 3–7 explanation points about this specific MindScape feature.

RULES:
- Each point must add NEW information — no repetition across points.
- Accurate: based strictly on the feature map above.
- Actionable: state where to find the feature and how to use it.
- Level: "${explanationMode}" (Beginner=how-to, Intermediate=workflows, Expert=technical details).
- Do NOT give generic definitions.

Return ONLY: { "explanationPoints": ["point1", "point2", ...] }`
    : `${SYSTEM_GUARANTEES}

You are an expert AI assistant explaining mind map concepts.

Topic: "${mainTopic}"
Concept: "${subCategoryName}"
Current description: "${subCategoryDescription}"
Level: "${explanationMode}"

LEVEL GUIDE:
- Beginner: simple terms, everyday analogies, no jargon.
- Intermediate: conceptual depth, professional tone, practical context.
- Expert: technical details, nuance, advanced terminology.

POINT RULES:
- Each point must add NEW information — no repetition across points.
- Each point covers a distinct aspect: definition, use case, history, key feature, or relationship to "${mainTopic}".
- Concrete and specific — avoid vague statements.
${pdfContext ? `\nSOURCE FILE CONTEXT (prioritize for accuracy):\n${pdfContext.substring(0, 6000)}` : ''}

Return ONLY: { "explanationPoints": ["point1", "point2", ...] }
Provide 3–7 points. No extra text, no markdown outside JSON.`;

  const userPrompt = `Generate "${explanationMode}" level explanation for "${subCategoryName}".`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await generateContent({ provider, apiKey, systemPrompt, userPrompt, schema: ExplainMindMapNodeOutputSchema, strict });
      if (result && Array.isArray(result.explanationPoints)) {
        result.explanationPoints = result.explanationPoints
          .map((p: string) => p.replace(/<\|[\s\S]*?\|>/g, '').replace(/\} \}/g, '').replace(/"\] }/g, '').trim())
          .filter((p: string) => p.length > 5);
      }
      return result;
    } catch (e: any) {
      console.error(`❌ Explanation attempt ${attempt} failed:`, e.message);
      if (attempt === 2) throw e;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error('Explanation generation failed');
}
