
'use server';

import {
  GenerateMindMapFromTextInput,
  GenerateMindMapFromTextInputSchema,
  GenerateMindMapFromTextOutput,
  GenerateMindMapFromTextOutputSchema,
} from '@/ai/schemas/generate-mind-map-from-text-schema';
import { generateContent, AIProvider } from '@/ai/client-dispatcher';
import { analyzeDocument } from '@/knowledge-engine';

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
- "thought": 1–2 sentence structural reasoning only
- Optional fields (thought, insight, tags): omit if not adding value — never fabricate`;

function buildPersona(persona: string): string {
  const p = (persona || 'teacher').toLowerCase().trim();
  if (p === 'concise') return `PERSONA: Concise — remove all explanations, use keywords only.`;
  if (p === 'creative') return `PERSONA: Creative — allow metaphors and non-obvious angles.`;
  if (p === 'sage') return `PERSONA: Cognitive Sage — reveal patterns, cross-domain links, philosophical depth.`;
  return `PERSONA: Structured Expert — clear, specific, curriculum-style.`;
}

export async function generateMindMapFromText(
  input: GenerateMindMapFromTextInput & { apiKey?: string; provider?: AIProvider; strict?: boolean }
): Promise<GenerateMindMapFromTextOutput> {
  const { provider, apiKey, context, targetLang, text, persona, strict, depth = 'low' } = input;

  const sourceCount = context ? (context.split('--- SOURCE:').length - 1) : 0;
  const isMultiSource = sourceCount > 0;

  const densityMap: Record<string, string> = {
    low:    isMultiSource ? `subTopics: ≥${Math.max(4, Math.min(sourceCount, 12))} | categories: 2 | subCategories: 3` : `subTopics: 4 | categories: 2 | subCategories: 3`,
    medium: isMultiSource ? `subTopics: ≥${Math.max(4, Math.min(sourceCount, 12))} | categories: 3 | subCategories: 4` : `subTopics: 5 | categories: 3 | subCategories: 3–4`,
    deep:   isMultiSource ? `subTopics: ≥${Math.max(4, Math.min(sourceCount, 12))} | categories: 4 | subCategories: 5` : `subTopics: 6 | categories: 4 | subCategories: 5`,
  };
  const density = densityMap[depth] || densityMap.low;

  const sourceToAnalyze = (isMultiSource && context) ? context : text;
  const skeeResult = analyzeDocument(sourceToAnalyze);
  const hasStructure = skeeResult.structuredContext.length > 0;
  if (hasStructure) console.log(`🧠 SKEE (${isMultiSource ? 'multi' : 'text'}):`, skeeResult.stats);

  const skeeSection = hasStructure
    ? `CONTENT STRUCTURE (use as primary scaffold):
${skeeResult.structuredContext}
- Align subTopics with detected sections.
- Categories/subCategories reflect key concepts and relationships.`
    : '';

  let contextBlock = '';
  if (context) {
    if (context.includes('--- SOURCE:')) {
      contextBlock = `MULTI-SOURCE SYNTHESIS (${sourceCount} sources):
- Every source MUST be represented in the mind map.
- Use the text/topic below as the central lens.
- If sources cover different domains → create dedicated subTopics per source.
- Link overlapping facts via categories; keep unique data in subCategories.
- Descriptions MAX 10 words (multi-source conciseness rule).

SOURCES TO SYNTHESIZE:
"""
${context}
"""`;
    } else {
      contextBlock = `USER CONTEXT (prioritize): "${context}"`;
    }
  }

  const systemPrompt = `${SYSTEM_GUARANTEES}

You are an expert at analyzing text and creating structured mind maps.

${buildPersona(persona || 'teacher')}
LANGUAGE: ${targetLang ? targetLang : 'en'}
DENSITY: ${density}
${contextBlock}
${skeeSection}

STRUCTURAL RULES:
- Mirror document structure (chapters, sections, headers) in subTopics.
- Merge duplicate concepts across sections — no repeated ideas in different branches.
- For structured docs (IDs, Invoices, Resumes): extract ACTUAL values (e.g., "Invoice #: 12345").
- Each subCategory MUST contain a specific fact, definition, or takeaway.

SCHEMA (return ONLY this JSON):
{
  "mode": "${isMultiSource ? 'multi' : 'single'}",
  "topic": "Main Topic",
  "shortTitle": "2–4 word title",
  "icon": "lucide-kebab-case",
  "subTopics": [
    {
      "name": "Section or Concept Name",
      "icon": "lucide-kebab-case",
      "categories": [
        {
          "name": "Category Name",
          "icon": "lucide-kebab-case",
          "subCategories": [
            {
              "name": "Leaf Node Name",
              "description": "Exactly 1 sentence, ≤20 words, concrete.",
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
- Return ONLY raw JSON`;

  const userPrompt = `Text to analyze:\n---\n${text}\n---`;

  try {
    return await generateContent({ provider, apiKey, systemPrompt, userPrompt, schema: GenerateMindMapFromTextOutputSchema, strict });
  } catch (e: any) {
    console.error(`❌ Text-to-map failed:`, e.message);
    throw e;
  }
}
