import { z } from 'zod';

/**
 * Schema for individual search source/result
 */
export const SearchSourceSchema = z.object({
    title: z.string().describe('Title of the search result'),
    url: z.string().url().describe('URL of the source'),
    published: z.string().optional().describe('Publication date if available'),
    image: z.string().url().optional().describe('Optional preview image for the source'),
});

export type SearchSource = z.infer<typeof SearchSourceSchema>;

/**
 * Schema for image references
 */
export const SearchImageSchema = z.object({
    url: z.string().url().describe('Direct link to the image'),
    title: z.string().optional().describe('Title or description of the image'),
    sourceUrl: z.string().url().optional().describe('URL of the page containing the image'),
});

export type SearchImage = z.infer<typeof SearchImageSchema>;

/**
 * Schema for normalized search context
 */
export const SearchContextSchema = z.object({
    summary: z.string().describe('Concise summary of search findings'),
    sources: z.array(SearchSourceSchema).describe('List of search sources'),
    images: z.array(SearchImageSchema).optional().describe('Relevant images found during research'),
    timestamp: z.string().describe('ISO timestamp of when search was executed'),
    query: z.string().describe('Original search query'),
});

export type SearchContext = z.infer<typeof SearchContextSchema>;

/**
 * Schema for search request parameters
 */
export const SearchRequestSchema = z.object({
    query: z.string().min(1).describe('Search query string'),
    depth: z.enum(['basic', 'deep']).default('basic').describe('Search depth level'),
    maxResults: z.number().min(1).max(10).default(5).describe('Maximum number of results to return'),
    model: z.string().optional().describe('Optional model override for search'),
});

export type SearchRequest = z.infer<typeof SearchRequestSchema>;
