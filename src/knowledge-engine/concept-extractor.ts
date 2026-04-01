

import { generateContentWithPollinations } from '@/ai/pollinations-client';

export interface ExtractedConcept {
    title: string;
    description: string;
}

const CONCEPT_EXTRACTION_PROMPT = `You are a concept extraction engine.
Given a section of a document, extract the 4–8 most important concepts.

RULES:
- Concepts MUST be nouns or named entities (tools, techniques, processes, systems, people, organizations).
- No vague phrases like "important aspect", "key factor", "various elements".
- Descriptions: factual, concise, max 15 words, exactly 1 sentence.
- Extract concrete entities: features, terms, techniques, tools, processes, named systems.
- Do NOT include meta-information about the document itself.

Return ONLY a JSON array (no wrapper, no explanation):
[
  {"title": "Concept Name", "description": "One sentence, ≤15 words, factual."},
  ...
]`;

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
            { capability: 'fast', apiKey, attempt }
        );

        if (Array.isArray(result)) {
            return result.filter((c: any) => c && c.title).map((c: any) => ({
                title: String(c.title).trim(),
                description: String(c.description || '').trim(),
            }));
        }

        if (typeof result === 'string') {
            const match = result.match(/\[[\s\S]*\]/);
            if (match) {
                return JSON.parse(match[0]).filter((c: any) => c && c.title).map((c: any) => ({
                    title: String(c.title).trim(),
                    description: String(c.description || '').trim(),
                }));
            }
        }

        if (result && typeof result === 'object') {
            const arr = (result as any).concepts || (result as any).data || (result as any).results;
            if (Array.isArray(arr)) {
                return arr.filter((c: any) => c && c.title).map((c: any) => ({
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

export function deduplicateConcepts(concepts: ExtractedConcept[]): ExtractedConcept[] {
    const seen = new Map<string, ExtractedConcept>();
    for (const c of concepts) {
        const key = c.title.toLowerCase().trim();
        if (!seen.has(key)) seen.set(key, c);
    }
    return [...seen.values()];
}

export function conceptsToPromptContext(concepts: ExtractedConcept[]): string {
    if (!concepts.length) return '';
    const lines = concepts.map(c => `- ${c.title}${c.description ? `: ${c.description}` : ''}`);
    return `EXTRACTED CONCEPTS (${concepts.length}):\n${lines.join('\n')}`;
}
