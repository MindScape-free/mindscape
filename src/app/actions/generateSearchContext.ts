'use server';

import { executeGoogleSearch } from '@/ai/search/google-search';
import { normalizeSearchResults, filterAuthoritativeSources } from '@/ai/search/search-normalizer';
import { SearchContext, SearchRequestSchema } from '@/ai/search/search-schema';
import { AIProvider } from '@/ai/client-dispatcher';

/**
 * Server action to generate search context for a given query
 * 
 * This action:
 * 1. Validates input parameters
 * 2. Executes decentralized search via Pollinations
 * 3. Normalizes and filters results
 * 4. Returns structured search context or null on failure
 * 
 * @param params - Search parameters
 * @returns Object with search context data or error message
 */
export async function generateSearchContext(params: {
    query: string;
    depth?: 'basic' | 'deep';
    maxResults?: number;
    apiKey?: string;
    provider?: AIProvider;
}): Promise<{ data: SearchContext | null; error: string | null }> {

    console.log(`🔍 [generateSearchContext] Starting search for: "${params.query}"`);

    try {
        // Validate input
        const validatedParams = SearchRequestSchema.parse({
            query: params.query,
            depth: params.depth || 'basic',
            maxResults: params.maxResults || 5,
        });

        // Execute search
        const rawResults = await executeGoogleSearch({
            ...validatedParams,
            apiKey: params.apiKey,
        });

        // Normalize results
        let searchContext = normalizeSearchResults(rawResults, validatedParams.query);

        // Filter and prioritize authoritative sources
        if (searchContext.sources.length > 0) {
            searchContext.sources = filterAuthoritativeSources(searchContext.sources);
        }

        console.log(`✅ [generateSearchContext] Search completed: ${searchContext.sources.length} sources`);

        return {
            data: searchContext,
            error: null,
        };

    } catch (error: any) {
        console.error('❌ [generateSearchContext] Search failed:', error);

        // Return graceful error - don't fail the entire generation
        return {
            data: null,
            error: error.message || 'Search failed',
        };
    }
}
