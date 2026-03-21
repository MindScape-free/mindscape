/**
 * @fileOverview Keyword Extraction Module for SKEE
 * Frequency-based keyword extraction — no external NLP dependencies.
 */

import { DocumentSection } from './section-splitter';

export interface SectionKeywords {
    sectionTitle: string;
    keywords: [string, number][]; // [term, frequency]
}

export interface ExtractionResult {
    perSection: SectionKeywords[];
    global: [string, number][]; // top keywords across the entire document
}

// Common English stopwords to filter out
const STOPWORDS = new Set([
    'the', 'and', 'that', 'this', 'with', 'from', 'have', 'been', 'will',
    'would', 'could', 'should', 'their', 'there', 'which', 'about', 'more',
    'also', 'than', 'them', 'they', 'were', 'what', 'when', 'where', 'into',
    'only', 'other', 'some', 'such', 'each', 'most', 'very', 'does', 'then',
    'these', 'those', 'being', 'both', 'between', 'after', 'before', 'during',
    'through', 'while', 'above', 'below', 'over', 'under', 'again', 'further',
    'once', 'here', 'just', 'because', 'same', 'well', 'still', 'much',
    'many', 'however', 'since', 'often', 'using', 'used', 'based', 'make',
    'made', 'like', 'including', 'within', 'without', 'first', 'second',
    'third', 'number', 'called', 'given', 'shown', 'following', 'provide',
    'provides', 'provided', 'several', 'different', 'various', 'important',
    'example', 'examples', 'figure', 'table', 'paper', 'study', 'page',
    'chapter', 'section', 'result', 'results', 'refer', 'references',
]);

/**
 * Tokenize text into lowercase word tokens, splitting on non-alpha characters.
 */
function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^a-z\s\-]/g, ' ') // Remove non-alpha except hyphen
        .split(/\s+/)
        .filter(t => t.length > 0);
}

/**
 * Count frequency of meaningful tokens in a block of text.
 * Filters stopwords and tokens shorter than 4 characters.
 */
function countFrequency(text: string): Map<string, number> {
    const tokens = tokenize(text);
    const freq = new Map<string, number>();

    for (const token of tokens) {
        if (token.length < 4) continue;
        if (STOPWORDS.has(token)) continue;
        freq.set(token, (freq.get(token) || 0) + 1);
    }

    return freq;
}

/**
 * Extract top keywords from a frequency map.
 */
function topKeywords(freq: Map<string, number>, count: number): [string, number][] {
    return Array.from(freq.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, count);
}

/**
 * Extract keywords per section and globally across the document.
 */
export function extractKeywords(
    sections: DocumentSection[],
    perSectionCount: number = 8,
    globalCount: number = 15
): ExtractionResult {
    const globalFreq = new Map<string, number>();
    const perSection: SectionKeywords[] = [];

    for (const section of sections) {
        const sectionFreq = countFrequency(section.content);

        // Merge into global
        for (const [term, count] of sectionFreq) {
            globalFreq.set(term, (globalFreq.get(term) || 0) + count);
        }

        perSection.push({
            sectionTitle: section.title,
            keywords: topKeywords(sectionFreq, perSectionCount),
        });
    }

    return {
        perSection,
        global: topKeywords(globalFreq, globalCount),
    };
}
