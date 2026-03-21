/**
 * PDF.js is browser-only. Avoid importing it during server-side rendering.
 * We dynamically load it at runtime in the browser.
 */

const isBrowser = typeof window !== 'undefined';

async function getPdfJsLib() {
    if (!isBrowser) {
        throw new Error('parsePdfContent can only be used in a browser environment.');
    }

    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');

    // Configure PDF.js worker for browser runtime
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    return pdfjsLib;
}

export interface PDFParseProgress {
    current: number;
    total: number;
}

export interface PDFParseResult {
    content: string;
    pageCount: number;
}

/**
 * Extracts text from a PDF file with heuristic-based cleaning.
 * @param arrayBuffer The PDF file data.
 * @param onProgress Callback for extraction progress.
 * @param maxChars Maximum characters to extract (default 15000).
 */
export async function parsePdfContent(
    arrayBuffer: ArrayBuffer,
    onProgress?: (progress: PDFParseProgress) => void,
    maxChars: number = 100000
): Promise<PDFParseResult> {
    const pdfjsLib = await getPdfJsLib();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;
    const pageTexts: string[] = [];
    const seenLines = new Map<string, number>();

    for (let i = 1; i <= totalPages; i++) {
        onProgress?.({ current: i, total: totalPages });
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();

        // Extract text items, filter and trim
        const lines = textContent.items
            .map((item: any) => item.str.trim())
            .filter((str: string) => str.length > 0);

        // Heuristic for headers/footers: if a line appears in the exact same position/content across pages
        const filteredLines = lines.filter((line, index) => {
            // Strip standalone page numbers (e.g., "1", "2", "Page 1")
            if (/^(page\s+)?\d+(\s+of\s+\d+)?$/i.test(line)) return false;

            // Count occurrences of lines across pages to detect headers/footers
            // Check top 3 and bottom 3 lines
            if (index < 3 || index > lines.length - 3) {
                const count = (seenLines.get(line) || 0) + 1;
                seenLines.set(line, count);
                // If it appears on every page or most pages at top/bottom, it's likely a header/footer
                if (count > 2 && totalPages > 3) return false;
            }

            return true;
        });

        pageTexts.push(filteredLines.join(' '));

        // Stop early if we exceed the limit with a proportional buffer (20% overshoot)
        if (pageTexts.join('\n\n').length > maxChars + Math.max(1000, maxChars * 0.2)) break;
    }

    // Join pages with double newlines
    let fullText = pageTexts.join('\n\n');

    // Final cleanup of the whole document
    let cleanedText = fullText
        .replace(/[ \t]+/g, ' ')           // Collapse horizontal spaces
        .replace(/\n\s*\n/g, '\n\n')       // Collapse multiple newlines
        .trim();

    // Apply strict character limit
    if (cleanedText.length > maxChars) {
        console.warn(`⚠️ PDF text truncated from ${cleanedText.length} to ${maxChars} characters.`);
        cleanedText = cleanedText.substring(0, maxChars) + "... [Text truncated for processing]";
    }

    return {
        content: cleanedText,
        pageCount: totalPages
    };
}
