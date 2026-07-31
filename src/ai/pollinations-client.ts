/**
 * AI Client using Pollinations.ai
 *
 * NOTE: The legacy `generateContentWithPollinations` function was removed —
 * all generation now flows through the multi-provider orchestrator
 * (`@/ai/providers/orchestrator.ts` → `PollinationsAdapter`), which has its
 * own model registry, retry, and JSON-repair logic.
 *
 * This module retains only the shared model-capability type and the
 * Pollinations pollen-balance check used by server actions.
 */

'use server';

// ----------------------------------------------------------------------
// Types & Constants
// ----------------------------------------------------------------------

export type ModelCapability = 'reasoning' | 'coding' | 'fast' | 'creative';

/**
 * Checks the current pollen balance for a given API key.
 */
export async function checkPollinationsBalance(apiKey: string): Promise<number> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch('https://gen.pollinations.ai/account/balance', {
            headers: { 'Authorization': `Bearer ${apiKey}` },
            cache: 'no-store',
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (response.ok) {
            const data = await response.json();
            return typeof data.balance === 'number' ? data.balance : 0;
        }
        return 0;
    } catch (e) {
        console.error('⚠️ Failed to check Pollinations balance:', e);
        return 0;
    }
}
