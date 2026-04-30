'use server';

/**
 * Runtime JSON validation and self-correction utility.
 * Used across all AI generation flows to ensure valid JSON output.
 *
 * MIGRATION: Now routes through the AI orchestrator instead of direct Pollinations calls.
 */

import { orchestrate } from '@/ai/providers/orchestrator';

/**
 * Attempts to parse JSON. If it fails, sends the broken string back to the AI
 * with a "fix formatting only" instruction and retries once.
 */
export async function parseOrRepairJSON(
    raw: string,
    apiKey?: string
): Promise<any> {
    // 1. Try direct parse
    try {
        return JSON.parse(raw);
    } catch {
        console.warn('⚠️ JSON parse failed, attempting AI self-correction...');
    }

    // 2. Try stripping markdown code fences
    const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    try {
        return JSON.parse(stripped);
    } catch {
        // continue to AI repair
    }

    // 3. AI self-correction via orchestrator (schema: null for plain text output)
    try {
        const result = await orchestrate(
            {
                systemPrompt: 'Fix JSON formatting only. Do not change any content or values. Return ONLY valid JSON with no extra text.',
                userPrompt: raw,
                capability: 'fast',
                apiKey,
                strict: false,
            },
            { taskType: 'json-repair' }
        );

        const repaired = result.content;
        if (typeof repaired === 'string') return JSON.parse(repaired);
        if (typeof repaired === 'object') return repaired;
    } catch (e) {
        console.error('❌ JSON self-correction failed:', e);
    }

    throw new Error('JSON repair failed after all attempts.');
}
