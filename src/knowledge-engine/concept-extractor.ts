

/**
 * @fileOverview AI-powered concept extraction for the PMG pipeline.
 * Extracts structured {title, description} concept pairs from text chunks.
 * 3-4× faster than prose summarization because the prompt is simpler
 * and the output is smaller/structured.
 */

import { generateContentWithPollinations } from '@/ai/pollinations-client';

export interface ExtractedConcept {
    title: string;
    description: string;
}

const CONCEPT_EXTRACTION_PROMPT = `You are a concept extraction engine.
Given a section of a document, extract the 4-8 most important concepts.

Return ONLY a JSON array (no wrapper, no explanation):
[
  {"title": "Concept Name", "description": "One sentence explaining this concept."},
  ...
]

Rules:
- Each concept must be a specific, named idea (not vague summaries)
- Descriptions should be factual, concise (max 15 words)
- Extract concrete entities: features, terms, techniques, tools, processes
- Do NOT include meta-information about the document itself`;

/**
 * Extracts structured concepts from a single text chunk.
 * Returns an array of {title, description} pairs.
 */
export async function extractConcepts(
    chunk: string,
    options: { apiKey?: string; attempt?: number } = {}
): Promise<ExtractedConcept[]> {
    const { apiKey, attempt = 0 } = options;

    try {
        const result = await generateContentWithPollinations(
            CONCEPT_EXTRACTION_PROMPT,
            `Extract key concepts from this text:\n\n${chunk}`,
            undefined,
            {
                capability: 'fast',
                apiKey,
                attempt,
            }
        );

        // Parse the result — it should be a JSON array
        if (Array.isArray(result)) {
            return result
                .filter((c: any) => c && c.title)
                .map((c: any) => ({
                    title: String(c.title).trim(),
                    description: String(c.description || '').trim(),
                }));
        }

        // If it's a string, try to parse JSON from it
        if (typeof result === 'string') {
            const jsonMatch = result.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return parsed
                    .filter((c: any) => c && c.title)
                    .map((c: any) => ({
                        title: String(c.title).trim(),
                        description: String(c.description || '').trim(),
                    }));
            }
        }

        // If the result is an object with a concepts key
        if (result && typeof result === 'object') {
            const arr = (result as any).concepts || (result as any).data || (result as any).results;
            if (Array.isArray(arr)) {
                return arr
                    .filter((c: any) => c && c.title)
                    .map((c: any) => ({
                        title: String(c.title).trim(),
                        description: String(c.description || '').trim(),
                    }));
            }
        }

        console.warn('⚠️ Concept extraction returned unexpected format, skipping chunk.');
        return [];
    } catch (err: any) {
        console.warn(`⚠️ Concept extraction failed: ${err.message}`);
        return [];
    }
}

/**
 * Deduplicates concepts by title (case-insensitive).
 * Keeps the first occurrence of each unique concept.
 */
export function deduplicateConcepts(concepts: ExtractedConcept[]): ExtractedConcept[] {
    const seen = new Map<string, ExtractedConcept>();

    for (const c of concepts) {
        const key = c.title.toLowerCase().trim();
        if (!seen.has(key)) {
            seen.set(key, c);
        }
    }

    return [...seen.values()];
}

/**
 * Formats extracted concepts into a compact string for AI prompt injection.
 */
export function conceptsToPromptContext(concepts: ExtractedConcept[]): string {
    if (concepts.length === 0) return '';

    const lines = concepts.map(c =>
        `- ${c.title}${c.description ? `: ${c.description}` : ''}`
    );

    return `EXTRACTED DOCUMENT CONCEPTS (${concepts.length} concepts found):\n${lines.join('\n')}`;
}
