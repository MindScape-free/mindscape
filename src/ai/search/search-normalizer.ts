
import { SearchContext, SearchSource, SearchImage, SearchContextSchema } from './search-schema';

/**
 * Common brand mapping for professional titles
 */
const BRAND_MAP: Record<string, string> = {
    'github.com': 'GitHub',
    'stackoverflow.com': 'Stack Overflow',
    'developer.mozilla.org': 'MDN Web Docs',
    'youtube.com': 'YouTube',
    'youtu.be': 'YouTube',
    'medium.com': 'Medium',
    'wikipedia.org': 'Wikipedia',
    'reddit.com': 'Reddit',
    'dev.to': 'DEV Community',
    'hashnode.com': 'Hashnode',
    'coursera.org': 'Coursera',
    'udemy.com': 'Udemy',
    'w3schools.com': 'W3Schools',
    'geeksforgeeks.org': 'GeeksforGeeks',
    'freecodecamp.org': 'freeCodeCamp',
    'react.dev': 'React Docs',
    'nextjs.org': 'Next.js Docs',
    'typescriptlang.org': 'TypeScript Docs',
    'tailwindcss.com': 'Tailwind CSS',
    'figma.com': 'Figma',
    'vercel.com': 'Vercel',
    'firebase.google.com': 'Firebase Docs',
    'cloud.google.com': 'Google Cloud Docs',
    'aws.amazon.com': 'AWS Documentation',
    'microsoft.com': 'Microsoft Support',
    'apple.com': 'Apple Support',
    'apps.apple.com': 'App Store',
    'play.google.com': 'Google Play',
    'support.google.com': 'Google Support',
    'en.wikipedia.org': 'Wikipedia',
    'esafety.gov.au': 'eSafety Commissioner',
    'clashofclans.fandom.com': 'Clash of Clans Wiki',
    'supercell.com': 'Supercell',
    'fandom.com': 'Fandom Wiki',
    'npmJS.com': 'NPM',
};

/**
 * Normalizes a hostname into a professional title
 */
function getProfessionalTitle(url: string, originalTitle?: string): string {
    try {
        const urlObj = new URL(url);
        const host = urlObj.hostname.toLowerCase().replace('www.', '');

        // If we have a custom brand mapping, use it
        if (BRAND_MAP[host]) return BRAND_MAP[host];

        // If the original title is just a hostname or very short, try to clean it
        if (!originalTitle || originalTitle.toLowerCase() === host || originalTitle.length < 3) {
            return host.charAt(0).toUpperCase() + host.slice(1).replace(/\.[a-z]+$/, '');
        }

        return originalTitle;
    } catch {
        return originalTitle || 'Source';
    }
}


/**
 * Normalizes raw search results from the API into a structured SearchContext
 * 
 * @param rawResults - Raw API response from executeGoogleSearch
 * @param query - Original search query
 * @returns Normalized and validated SearchContext
 */
export function normalizeSearchResults(rawResults: any, query: string): SearchContext {
    console.log('🔄 Normalizing search results...');

    try {
        // Extract content from various possible response structures
        let content = '';
        let toolCalls: any[] = [];

        // Check for tool_calls in the response
        if (rawResults.choices?.[0]?.message?.tool_calls) {
            toolCalls = rawResults.choices[0].message.tool_calls;
        }

        // Extract text content
        if (rawResults.choices?.[0]?.message?.content) {
            content = rawResults.choices[0].message.content;
        }

        // Initialize sources array
        const sources: SearchSource[] = [];
        const images: SearchImage[] = [];
        let summary = '';

        // Extract citations if present (common in Perplexity/Search models)
        const citations = rawResults.citations || rawResults.choices?.[0]?.message?.citations || [];
        if (Array.isArray(citations) && citations.length > 0) {
            console.log(`🔗 Found ${citations.length} direct citation(s)`);
            citations.forEach((citation, idx) => {
                if (typeof citation === 'string' && citation.startsWith('http')) {
                    sources.push({
                        title: getProfessionalTitle(citation),
                        url: citation,
                    });
                }
            });
        }

        // Process tool calls (google_search results)
        if (toolCalls.length > 0) {
            console.log(`📊 Found ${toolCalls.length} tool call(s)`);

            for (const toolCall of toolCalls) {
                if (toolCall.function?.name === 'google_search') {
                    try {
                        // Parse the function arguments which contain search results
                        const args = typeof toolCall.function.arguments === 'string'
                            ? JSON.parse(toolCall.function.arguments)
                            : toolCall.function.arguments;

                        console.log('🔍 Search tool arguments:', JSON.stringify(args).substring(0, 500));

                        // Extract results from various possible structures
                        const results = args.results || args.items || args.organic_results || [];

                        if (Array.isArray(results)) {
                            for (const result of results.slice(0, 5)) { // Limit to top 5 results
                                if (result.url || result.link) {
                                    const url = result.url || result.link;
                                    sources.push({
                                        title: getProfessionalTitle(url, result.title || result.name),
                                        url: url,
                                        published: result.date || result.published || undefined,
                                    });
                                }
                            }
                        }
                    } catch (e) {
                        console.warn('⚠️ Failed to parse tool call arguments:', e);
                    }
                }
            }
        }

        // Use content as summary, or generate a default one
        if (content && content.trim()) {
            summary = content.trim();
        } else if (sources.length > 0) {
            summary = `Found ${sources.length} relevant sources about ${query}.`;
        } else {
            summary = `Search completed for: ${query}`;
        }

        // If no sources found yet, try to extract from content text
        if (sources.length === 0 && content) {
            console.log('🔗 Attempting to extract sources from text content...');
            // Improved regex for cleaner URL extraction
            const urlRegex = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
            const urls = Array.from(new Set(content.match(urlRegex) || [])); // Unique URLs

            for (const [idx, url] of urls.slice(0, 8).entries()) { // Scan more URLs
                try {
                    const urlObj = new URL(url);
                    // Filter out non-informative or common base domains that aren't real sources
                    const ignoredDomains = ['google.com', 'bing.com', 'pollinations.ai', 'localhost', '127.0.0.1'];
                    if (ignoredDomains.some(d => urlObj.hostname.includes(d))) continue;

                    sources.push({
                        title: getProfessionalTitle(url),
                        url: url,
                    });
                } catch (e) {
                    // Invalid URL, skip
                }
            }
        }

        // --- IMAGE EXTRACTION ---
        // 1. Scan content for direct image URLs
        const imageRegex = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)\.(?:jpg|jpeg|png|gif|webp|svg)/gi;
        const foundImages = Array.from(new Set(content.match(imageRegex) || []));

        for (const imageUrl of foundImages.slice(0, 6)) {
            images.push({
                url: imageUrl,
                title: `${query} visualization`,
                sourceUrl: sources[0]?.url // Link back to first source as fallback
            });
        }

        // 2. Scan tool calls for thumbnails/images
        if (toolCalls.length > 0) {
            for (const toolCall of toolCalls) {
                if (toolCall.function?.name === 'google_search') {
                    try {
                        const args = typeof toolCall.function.arguments === 'string'
                            ? JSON.parse(toolCall.function.arguments)
                            : toolCall.function.arguments;
                        const results = args.results || args.items || args.organic_results || [];

                        if (Array.isArray(results)) {
                            for (const result of results) {
                                if (result.thumbnail || result.image) {
                                    const imgUrl = result.thumbnail || result.image;
                                    if (!images.some(img => img.url === imgUrl)) {
                                        images.push({
                                            url: imgUrl,
                                            title: result.title || result.name,
                                            sourceUrl: result.url || result.link
                                        });
                                    }
                                }
                            }
                        }
                    } catch (e) { /* ignore */ }
                }
            }
        }

        // Create the search context
        const searchContext: SearchContext = {
            summary: summary.substring(0, 1000), // Limit summary length
            sources: sources,
            images: images.length > 0 ? images.slice(0, 8) : undefined,
            timestamp: new Date().toISOString(),
            query: query,
        };

        // Validate against schema
        const validated = SearchContextSchema.parse(searchContext);

        console.log(`✅ Normalized search results: ${validated.sources.length} sources`);
        return validated;

    } catch (error: any) {
        console.error('❌ Search normalization failed:', error);

        // Return minimal valid context on error
        return {
            summary: `Search results for: ${query}`,
            sources: [],
            timestamp: new Date().toISOString(),
            query: query,
        };
    }
}

/**
 * Filters sources to prioritize authoritative domains
 * 
 * @param sources - Array of search sources
 * @returns Filtered and sorted sources
 */
export function filterAuthoritativeSources(sources: SearchSource[]): SearchSource[] {
    // Authoritative domain patterns
    const authoritativePatterns = [
        /\.edu$/,
        /\.gov$/,
        /\.org$/,
        /wikipedia\.org/,
        /github\.com/,
        /stackoverflow\.com/,
        /medium\.com/,
        /arxiv\.org/,
        /nature\.com/,
        /sciencedirect\.com/,
    ];

    // Score each source
    const scored = sources.map(source => {
        let score = 0;

        try {
            const hostname = new URL(source.url).hostname.toLowerCase();

            // Check against authoritative patterns
            for (const pattern of authoritativePatterns) {
                if (pattern.test(hostname)) {
                    score += 10;
                    break;
                }
            }
        } catch (e) {
            // Invalid URL, give it a low score but don't fail
            console.warn(`⚠️ Invalid URL in source: ${source.url}`);
            score = -10;
        }

        // Prefer HTTPS
        if (source.url.startsWith('https://')) {
            score += 2;
        }

        // Prefer sources with publication dates
        if (source.published) {
            score += 3;
        }

        // Prefer sources with snippets
        // if (source.snippet) {
        //     score += 1;
        // }

        return { source, score };
    });

    // Sort by score (highest first) and return sources
    return scored
        .sort((a, b) => b.score - a.score)
        .map(item => item.source);
}
