
'use server';

import {
  GenerateMindMapFromWebsiteInput,
  GenerateMindMapFromWebsiteOutput,
  GenerateMindMapFromWebsiteOutputSchema,
} from '@/ai/schemas/generate-mind-map-from-website-schema';
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

export async function generateMindMapFromWebsite(
  input: GenerateMindMapFromWebsiteInput & { apiKey?: string; provider?: AIProvider; strict?: boolean }
): Promise<GenerateMindMapFromWebsiteOutput> {
  const { provider, apiKey, context, targetLang, content, persona, strict, depth = 'low' } = input;

  const densityMap: Record<string, string> = {
    low:    `subTopics: 4 | categories: 2 | subCategories: 3`,
    medium: `subTopics: 5 | categories: 3 | subCategories: 3–4`,
    deep:   `subTopics: 6 | categories: 4 | subCategories: 5`,
  };
  const density = densityMap[depth] || densityMap.low;

  const structuralGuide = content.textBlocks
    .filter(block => block.type === 'heading')
    .map(block => `${'  '.repeat((block.level || 1) - 1)}- ${block.content}`)
    .join('\n');

  const structureSection = structuralGuide.length > 0
    ? `WEBSITE STRUCTURE (use as scaffold):\n${structuralGuide}\n---`
    : '';

  const systemPrompt = `${SYSTEM_GUARANTEES}

You are an expert at analyzing website content and creating structured mind maps.

${buildPersona(persona || 'teacher')}
LANGUAGE: ${targetLang ? targetLang : 'en'}
DENSITY: ${density}
${context ? `USER CONTEXT (prioritize): "${context}"` : ''}

${structureSection}

WEBSITE ANALYSIS RULES:
- Identify the main purpose and key message of the page.
- IGNORE: navigation menus, ads, cookie banners, UI labels, footer links.
- Only extract meaningful content sections (articles, features, arguments, data).
- Blog post → main points and takeaways.
- Product/service page → features, benefits, use cases.
- Academic/technical → preserve accurate terminology.

EXTRACTION RULES:
- Each subCategory MUST contain a specific fact, feature, or insight.
- Avoid repetitive or redundant nodes.

SCHEMA (return ONLY this JSON):
{
  "mode": "single",
  "topic": "Main Topic",
  "shortTitle": "2–4 word title",
  "icon": "lucide-kebab-case",
  "subTopics": [
    {
      "name": "Section Name",
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

  const userPrompt = `Website Content:\n---\nTitle: ${content.title}\nContent:\n${content.textContent.substring(0, 15000)}\n---`;

  try {
    return await generateContent({ provider, apiKey, systemPrompt, userPrompt, schema: GenerateMindMapFromWebsiteOutputSchema, strict });
  } catch (e: any) {
    console.error(`❌ Website-to-map failed:`, e.message);
    throw e;
  }
}
