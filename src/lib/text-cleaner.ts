/**
 * @fileOverview PDF text cleaning utilities.
 * Removes noise, normalizes whitespace, and strips common PDF artifacts
 * to produce clean text suitable for AI-based chunking and summarization.
 */

/**
 * Cleans raw PDF-extracted text for downstream processing.
 * - Strips standalone page numbers (e.g., "Page 3", "3 of 10")
 * - Collapses excessive whitespace and newlines
 * - Removes common PDF artifacts (form-feed chars, null bytes)
 * - Normalizes unicode whitespace characters
 */
export function cleanPDFText(text: string): string {
    let cleaned = text;

    // 1. Remove null bytes and form-feed characters (PDF artifacts)
    cleaned = cleaned.replace(/[\x00\x0C]/g, '');

    // 2. Normalize unicode whitespace (non-breaking spaces, zero-width chars, etc.)
    cleaned = cleaned.replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, ' ');

    // 3. Strip standalone page number lines (e.g., "Page 3", "- 5 -", "3 of 10")
    cleaned = cleaned.replace(/^\s*(page\s+)?\d+(\s+of\s+\d+)?\s*$/gim, '');
    cleaned = cleaned.replace(/^\s*-\s*\d+\s*-\s*$/gm, '');

    // 4. Collapse horizontal whitespace (tabs, multiple spaces → single space)
    cleaned = cleaned.replace(/[ \t]+/g, ' ');

    // 5. Collapse 3+ consecutive newlines into double newlines (paragraph breaks)
    cleaned = cleaned.replace(/\n\s*\n\s*\n+/g, '\n\n');

    // 6. Trim each line individually to remove leading/trailing spaces
    cleaned = cleaned
        .split('\n')
        .map(line => line.trim())
        .join('\n');

    // 7. Final trim
    cleaned = cleaned.trim();

    return cleaned;
}
