'use server';

/**
 * @fileOverview AI-powered chunk summarizer for the multi-stage PDF pipeline.
 * Summarizes individual text chunks into concise bullet points.
 */

import { generateContentWithPollinations } from '@/ai/pollinations-client';

const SUMMARIZE_SYSTEM_PROMPT = `You are a concise document summarizer. 
Given a section of a document, extract the 3-6 most important key ideas as bullet points.
Each bullet point should be a complete, self-contained statement.
Focus on facts, concepts, and conclusions — not formatting or meta-information.
Return ONLY the bullet points, no preamble, no headers, no numbering.
Use a dash (-) to start each bullet point.`;

/**
 * Summarizes a single text chunk into bullet-point key ideas.
 * Uses 'fast' model capability for speed.
 */
export async function summarizeChunk(
    chunk: string,
    options: { apiKey?: string; attempt?: number } = {}
): Promise<string> {
    const { apiKey, attempt = 0 } = options;

    const result = await generateContentWithPollinations(
        SUMMARIZE_SYSTEM_PROMPT,
        `Summarize this text section in bullet points:\n\n${chunk}`,
        undefined,
        {
            capability: 'fast',
            apiKey,
            attempt,
            _stripParameters: true, // Plain text, no JSON schema
        }
    );

    // The result might be a parsed object or a string
    if (typeof result === 'string') {
        return result.trim();
    }

    // If it returned an object (some models wrap text), extract the text content
    if (result?.content) return String(result.content).trim();
    if (result?.text) return String(result.text).trim();
    if (result?.choices?.[0]?.message?.content) {
        return String(result.choices[0].message.content).trim();
    }

    return String(result).trim();
}

/**
 * Summarizes multiple chunks in parallel with concurrency limiting.
 * Uses Promise.allSettled for fault tolerance — failed chunks are skipped.
 * 
 * @param chunks - Array of text chunk strings.
 * @param concurrency - Max simultaneous summarization calls (default: 3).
 * @param apiKey - Optional API key for Pollinations.
 * @returns Array of summary strings (only successful results).
 */
export async function summarizeChunksParallel(
    chunks: string[],
    concurrency: number = 3,
    apiKey?: string
): Promise<string[]> {
    const summaries: string[] = [];

    // Process in batches of `concurrency`
    for (let i = 0; i < chunks.length; i += concurrency) {
        const batch = chunks.slice(i, i + concurrency);

        console.log(
            `📄 PDF Pipeline: Summarizing chunks ${i + 1}-${Math.min(i + concurrency, chunks.length)} of ${chunks.length}...`
        );

        const results = await Promise.allSettled(
            batch.map((chunk, batchIdx) =>
                summarizeChunk(chunk, { apiKey, attempt: 0 })
                    .catch(async (err) => {
                        // Single retry for failed chunks with a different model attempt
                        console.warn(
                            `⚠️ Chunk ${i + batchIdx + 1} summarization failed, retrying:`,
                            err.message
                        );
                        return summarizeChunk(chunk, { apiKey, attempt: 1 });
                    })
            )
        );

        for (const result of results) {
            if (result.status === 'fulfilled' && result.value) {
                summaries.push(result.value);
            } else if (result.status === 'rejected') {
                console.warn('⚠️ Chunk summarization failed permanently, skipping:', result.reason?.message);
            }
        }

        // Small delay between batches to avoid rate limits
        if (i + concurrency < chunks.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    return summaries;
}

// ─── Concept Extraction (PMG — Progressive Map Generation) ───────────

import { extractConcepts, ExtractedConcept } from '@/knowledge-engine/concept-extractor';

/**
 * Extracts concepts from multiple chunks in parallel using a semaphore.
 * Much faster than sequential summarization because:
 * 1. All chunks start simultaneously (up to concurrency limit)
 * 2. No inter-batch delays
 * 3. Concept extraction prompts are simpler → faster AI responses
 *
 * @param chunks - Array of text chunk strings.
 * @param concurrency - Max simultaneous AI calls (default: 8).
 * @param apiKey - Optional API key for Pollinations.
 * @returns Flat array of extracted concepts from all chunks.
 */
export async function extractConceptsParallel(
    chunks: string[],
    concurrency: number = 8,
    apiKey?: string
): Promise<ExtractedConcept[]> {
    console.log(`🔬 PMG: Extracting concepts from ${chunks.length} chunks (concurrency: ${concurrency})...`);
    const startTime = Date.now();

    // Semaphore for concurrency control
    let active = 0;
    const queue: (() => void)[] = [];

    const acquire = (): Promise<void> => {
        if (active < concurrency) {
            active++;
            return Promise.resolve();
        }
        return new Promise<void>(resolve => queue.push(resolve));
    };

    const release = () => {
        active--;
        if (queue.length > 0) {
            active++;
            queue.shift()!();
        }
    };

    // Launch all extractions with semaphore gating
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

    // Flatten results
    const allConcepts: ExtractedConcept[] = [];
    let successCount = 0;

    for (const result of results) {
        if (result.status === 'fulfilled' && result.value.length > 0) {
            allConcepts.push(...result.value);
            successCount++;
        }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`🔬 PMG: Extracted ${allConcepts.length} concepts from ${successCount}/${chunks.length} chunks in ${elapsed}s`);

    return allConcepts;
}
