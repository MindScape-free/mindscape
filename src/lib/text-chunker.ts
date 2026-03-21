/**
 * @fileOverview Smart text chunking with sentence-boundary awareness.
 * Splits text into overlapping chunks suitable for parallel AI summarization.
 */

export interface TextChunk {
    text: string;
    index: number;
}

/**
 * Splits text into chunks with overlap, preferring paragraph/sentence boundaries.
 * 
 * @param text - The full cleaned text to chunk.
 * @param chunkSize - Target character count per chunk (default: 2000).
 * @param overlap - Characters of overlap between consecutive chunks (default: 200).
 * @returns Array of TextChunk objects with text content and index.
 */
export function chunkText(
    text: string,
    chunkSize: number = 2000,
    overlap: number = 200
): TextChunk[] {
    if (!text || text.length === 0) return [];

    // If text fits in a single chunk, return it directly
    if (text.length <= chunkSize) {
        return [{ text, index: 0 }];
    }

    const chunks: TextChunk[] = [];
    let start = 0;
    let chunkIndex = 0;

    while (start < text.length) {
        let end = Math.min(start + chunkSize, text.length);

        // If we're not at the very end, try to find a natural break point
        if (end < text.length) {
            end = findNaturalBreak(text, start, end);
        }

        const chunkText = text.slice(start, end).trim();
        if (chunkText.length > 0) {
            chunks.push({ text: chunkText, index: chunkIndex++ });
        }

        // Move start forward, accounting for overlap
        const advance = end - start - overlap;
        start += Math.max(advance, chunkSize / 4); // Ensure we always move forward at least 25%

        // Safety: if we're very close to the end, just grab the remainder
        if (text.length - start < overlap * 2) {
            const remainder = text.slice(start).trim();
            if (remainder.length > 50) { // Only add if meaningful
                chunks.push({ text: remainder, index: chunkIndex++ });
            }
            break;
        }
    }

    return chunks;
}

/**
 * Finds the best natural break point (paragraph, sentence, or word boundary)
 * looking backwards from `end` within the chunk.
 */
function findNaturalBreak(text: string, start: number, end: number): number {
    // Search window: look back up to 300 chars from the end for a break
    const searchStart = Math.max(start + Math.floor((end - start) * 0.6), end - 300);
    const searchWindow = text.slice(searchStart, end);

    // Priority 1: Paragraph break (double newline)
    const paragraphBreak = searchWindow.lastIndexOf('\n\n');
    if (paragraphBreak !== -1) {
        return searchStart + paragraphBreak + 2; // After the double newline
    }

    // Priority 2: Single newline
    const newlineBreak = searchWindow.lastIndexOf('\n');
    if (newlineBreak !== -1) {
        return searchStart + newlineBreak + 1;
    }

    // Priority 3: Sentence boundary (period/question/exclamation followed by space)
    const sentenceMatch = searchWindow.match(/[\s\S]*[.!?]\s/);
    if (sentenceMatch) {
        return searchStart + sentenceMatch[0].length;
    }

    // Priority 4: Word boundary (last space)
    const lastSpace = searchWindow.lastIndexOf(' ');
    if (lastSpace !== -1) {
        return searchStart + lastSpace + 1;
    }

    // Fallback: use the original end position
    return end;
}
