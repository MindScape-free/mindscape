
'use server';

import { cleanPDFText } from '@/lib/text-cleaner';
import { chunkText } from '@/lib/text-chunker';
import { extractConceptsParallel } from '@/ai/flows/summarize-chunk';
import { deduplicateConcepts, conceptsToPromptContext, ExtractedConcept } from '@/knowledge-engine/concept-extractor';
import { setPdfContext } from '@/lib/pdf-context-store';
import {
    GenerateMindMapFromTextInput,
    GenerateMindMapFromTextOutput,
    GenerateMindMapFromTextOutputSchema,
} from '@/ai/schemas/generate-mind-map-from-text-schema';
import { generateContent, AIProvider } from '@/ai/client-dispatcher';
import { analyzeDocument } from '@/knowledge-engine';

const DIRECT_GENERATION_THRESHOLD = 8000;
const MAX_GENERATION_RETRIES = 2;

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

export async function generateMindMapFromPdf(
    input: GenerateMindMapFromTextInput & { apiKey?: string; provider?: AIProvider; strict?: boolean }
): Promise<GenerateMindMapFromTextOutput> {
    const { provider, apiKey, context, targetLang, text, persona, strict, depth = 'low' } = input;

    console.log(`📄 PDF Pipeline: Starting. Raw text length: ${text.length} chars`);

    const cleaned = cleanPDFText(text);
    console.log(`📄 PDF Pipeline: Cleaned text length: ${cleaned.length} chars`);

    let contentForGeneration: string;
    let extractedConceptsContext = '';
    let rawConceptsArray: ExtractedConcept[] = [];

    if (cleaned.length <= DIRECT_GENERATION_THRESHOLD) {
        const rawConcepts = await extractConceptsParallel([cleaned], 1, apiKey);
        const concepts = deduplicateConcepts(rawConcepts);
        rawConceptsArray = concepts;
        extractedConceptsContext = conceptsToPromptContext(concepts);
        contentForGeneration = cleaned;
    } else {
        const chunks = chunkText(cleaned, 2000, 200);
        const chunkTexts = chunks.map(c => c.text);
        console.log(`📄 PMG Pipeline: ${chunks.length} chunks. Starting parallel concept extraction...`);
        const rawConcepts = await extractConceptsParallel(chunkTexts, 8, apiKey);
        const concepts = deduplicateConcepts(rawConcepts);
        rawConceptsArray = concepts;
        console.log(`📄 PMG Pipeline: ${rawConcepts.length} raw → ${concepts.length} unique concepts.`);
        if (concepts.length === 0) {
            contentForGeneration = cleaned.substring(0, 12000);
        } else {
            extractedConceptsContext = conceptsToPromptContext(concepts);
            contentForGeneration = cleaned.substring(0, 4000);
        }
    }

    const skeeResult = analyzeDocument(cleaned);
    const hasStructure = skeeResult.structuredContext.length > 0;
    if (hasStructure) console.log(`🧠 SKEE Analysis:`, skeeResult.stats);

    const skeeSections = hasStructure ? skeeResult.stats.sectionsCreated : 0;
    const densityMap: Record<string, string> = {
        low:    `subTopics: ≥${Math.max(4, skeeSections)} | categories: 2–3 | subCategories: 2–3`,
        medium: `subTopics: ≥${Math.max(5, skeeSections)} | categories: 3 | subCategories: 3–4`,
        deep:   `subTopics: ≥${Math.max(6, skeeSections)} | categories: 4 | subCategories: 4–5`,
    };
    const density = densityMap[depth] || densityMap.low;

    const isMultiSource = (rawConceptsArray.length > 0 && cleaned.length > DIRECT_GENERATION_THRESHOLD) || (context?.includes('--- SOURCE:'));

    const skeeSection = hasStructure
        ? `DOCUMENT STRUCTURE (use as primary scaffold — do NOT ignore):
${skeeResult.structuredContext}
- Map subTopics to detected sections above.
- Categories/subCategories reflect key concepts and relationships.

LITERAL EXTRACTION RULES:
- If structured document detected → prioritize literal extraction over abstraction.
- Combine field + value always: "Name: Megha" not just "Name".
- Never output a field label without its value if visible.
- DO NOT use placeholders like "[REDACTED]", "[PRIVACY]", "XXXX" — always use actual text.`
        : `LITERAL EXTRACTION RULES:
- Extract actual values (names, IDs, dates, numbers) — no generic placeholders.
- DO NOT use "[REDACTED]", "[PRIVACY]", "XXXX" — always use actual text found.`;

    const systemPrompt = `${SYSTEM_GUARANTEES}

You are a Document Intelligence Expert converting document content into structured mind maps.

${buildPersona(persona || 'teacher')}
LANGUAGE: ${targetLang ? targetLang : 'en'}
DENSITY: ${density}
${context ? `USER CONTEXT: "${context}"` : ''}

DOCUMENT TYPE RULES:
- Academic paper → Abstract, Methodology, Key Findings, Future Work
- Technical manual → Specifications, Installation, Troubleshooting, FAQ
- Business report → Executive Summary, Market Analysis, Risks, Recommendations
- Personal doc (Resume/Invoice) → extract literal field-value pairs

${skeeSection}

SCHEMA (return ONLY this JSON):
{
  "mode": "${isMultiSource ? 'multi' : 'single'}",
  "topic": "Main Topic Title",
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
              "name": "Detail Name",
              "description": "Exactly 1 sentence, ≤20 words, concrete value.",
              "icon": "lucide-kebab-case"
            }
          ]
        }
      ]
    }
  ]
}

RULES:
- Field names EXACTLY: topic, shortTitle, icon, subTopics, categories, subCategories, name, description
- NEVER truncate — close all { and [ before stopping`;

    const conceptSection = extractedConceptsContext ? `\n\n${extractedConceptsContext}` : '';
    const userPrompt = `DOCUMENT CONTENT:\n---\n${contentForGeneration}\n---${conceptSection}`;

    let lastError: any = null;
    for (let attempt = 0; attempt < MAX_GENERATION_RETRIES; attempt++) {
        try {
            console.log(`📄 PMG Pipeline: Generation attempt ${attempt + 1}/${MAX_GENERATION_RETRIES}...`);
            const result = await generateContent({
                provider, apiKey, systemPrompt, userPrompt,
                schema: GenerateMindMapFromTextOutputSchema,
                strict,
                options: { capability: 'fast' },
            });

            let finalResult = result;
            if (result && !result.topic && !result.subTopics) {
                for (const key of ['mindMap', 'mindmap', 'data', 'result', 'output']) {
                    if (result[key]?.topic || result[key]?.subTopics) {
                        finalResult = result[key];
                        break;
                    }
                }
            }

            if (finalResult && (finalResult.subTopics?.length > 0 || finalResult.topic)) {
                console.log(`✅ PMG: Generated on attempt ${attempt + 1}. topic="${finalResult.topic}", subTopics=${finalResult.subTopics?.length ?? 0}`);
                const contextKey = input.sessionId || finalResult.topic || 'default';
                setPdfContext(contextKey, { summary: contentForGeneration, concepts: rawConceptsArray, timestamp: Date.now() });
                return { ...finalResult, pdfContext: { summary: contentForGeneration, concepts: rawConceptsArray, timestamp: Date.now() } };
            }

            lastError = new Error('Generation returned empty structure');
        } catch (err: any) {
            console.warn(`⚠️ PMG attempt ${attempt + 1} failed:`, err.message);
            lastError = err;
        }
        if (attempt < MAX_GENERATION_RETRIES - 1) await new Promise(r => setTimeout(r, 1500));
    }

    throw lastError || new Error('PDF mind map generation failed after all retries.');
}
