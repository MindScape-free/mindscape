'use server';

import { resolveApiKey, AIActionOptions } from '@/app/actions';
import { enrichNodeExplanation, NodeEnrichmentOutput } from '@/ai/flows/enrich-node-explanation';
import { apiCache } from '@/lib/cache';

export async function enrichNodeAction(
  input: { nodeName: string; nodeDescription: string; mainTopic: string },
  options: AIActionOptions = {}
): Promise<{ data: NodeEnrichmentOutput | null; error: string | null }> {
  try {
    const cacheKey = `enrich_${input.nodeName}_${input.mainTopic}`;
    const cached = apiCache.get<NodeEnrichmentOutput>(cacheKey);
    if (cached) {
      console.log(`⚡ Returning cached enrichment for: ${input.nodeName}`);
      return { data: cached, error: null };
    }

    const effectiveApiKey = await resolveApiKey(options);
    const result = await enrichNodeExplanation({
      ...input,
      apiKey: effectiveApiKey,
      provider: options.provider,
    });

    // Cache for 2 hours
    apiCache.set(cacheKey, result, 2 * 60 * 60 * 1000);

    return { data: result, error: null };
  } catch (error) {
    console.error('Error in enrichNodeAction:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to enrich node.',
    };
  }
}
