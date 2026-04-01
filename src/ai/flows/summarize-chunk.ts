'use server';

import { generateContentWithPollinations } from '@/ai/pollinations-client';

const SUMMARIZE_SYSTEM_PROMPT = `You are a concise document summarizer.
Given a section of a document, extract the 3–6 most important key ideas as bullet points.

RULES:
- Each bullet must be standalone — no dependency on other bullets to be understood.
- Each bullet is a complete, self-contained factual statement.
- Focus on facts, concepts, and conclusions — not formatting or meta-information.
- Avoid vague phrases (important, various, many) — use specific terms.
- Return ONLY the bullet points, no preamble, no headers, no numbering.
- Use a dash (-) to start each bullet point.`;

export async function summarizeChunk(
    chunk: string,
    options: { apiKey?: string; attempt?: number } = {}
): Promise<string> {
    const { apiKey, attempt = 0 } = options;

    const result = await generateContentWithPollinations(
        SUMMARIZE_SYSTEM_PROMPT,
        `Summarize this text section in bullet points:\n\n${chunk}`,
        undefined,
        { capability: 'fast', apiKey, attempt, _stripParameters: true }
    );

    if (typeof result === 'string') return result.trim();
    if (result?.content) return String(result.content).trim();
    if (result?.text) return String(result.text).trim();
    if (result?.choices?.[0]?.message?.content) return String(result.choices[0].message.content).trim();
    return String(result).trim();
}

export async function summarizeChunksParallel(
    chunks: string[],
    concurrency: number = 3,
    apiKey?: string
): Promise<string[]> {
    const summaries: string[] = [];

    for (let i = 0; i < chunks.length; i += concurrency) {
        const batch = chunks.slice(i, i + concurrency);
        console.log(`📄 PDF Pipeline: Summarizing chunks ${i + 1}–${Math.min(i + concurrency, chunks.length)} of ${chunks.length}...`);

        const results = await Promise.allSettled(
            batch.map((chunk, batchIdx) =>
                summarizeChunk(chunk, { apiKey, attempt: 0 }).catch(async (err) => {
                    console.warn(`⚠️ Chunk ${i + batchIdx + 1} failed, retrying:`, err.message);
                    return summarizeChunk(chunk, { apiKey, attempt: 1 });
                })
            )
        );

        for (const result of results) {
            if (result.status === 'fulfilled' && result.value) summaries.push(result.value);
            else if (result.status === 'rejected') console.warn('⚠️ Chunk failed permanently:', result.reason?.message);
        }

        if (i + concurrency < chunks.length) await new Promise(r => setTimeout(r, 500));
    }

    return summaries;
}

import { extractConcepts, ExtractedConcept } from '@/knowledge-engine/concept-extractor';

export async function extractConceptsParallel(
    chunks: string[],
    concurrency: number = 8,
    apiKey?: string
): Promise<ExtractedConcept[]> {
    console.log(`🔬 PMG: Extracting concepts from ${chunks.length} chunks (concurrency: ${concurrency})...`);
    const startTime = Date.now();

    let active = 0;
    const queue: (() => void)[] = [];
    const acquire = (): Promise<void> => {
        if (active < concurrency) { active++; return Promise.resolve(); }
        return new Promise<void>(resolve => queue.push(resolve));
    };
    const release = () => {
        active--;
        if (queue.length > 0) { active++; queue.shift()!(); }
    };

    const results = await Promise.allSettled(
        chunks.map(async (chunk, idx) => {
            await acquire();
            try {
                return await extractConcepts(chunk, { apiKey, attempt: 0 });
            } catch (err: any) {
                console.warn(`⚠️ Chunk ${idx + 1} concept extraction failed: ${err.message}`);
                return [] as ExtractedConcept[];
            } finally {
                release();
            }
        })
    );

    const allConcepts: ExtractedConcept[] = [];
    let successCount = 0;
    for (const result of results) {
        if (result.status === 'fulfilled' && result.value.length > 0) { allConcepts.push(...result.value); successCount++; }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`🔬 PMG: ${allConcepts.length} concepts from ${successCount}/${chunks.length} chunks in ${elapsed}s`);
    return allConcepts;
}
