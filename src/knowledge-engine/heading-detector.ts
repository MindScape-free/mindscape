/**
 * @fileOverview Heading Detection Module for SKEE
 * Detects document headings and hierarchy from raw text using multiple heuristic patterns.
 */

export interface DetectedHeading {
    level: number;
    title: string;
    position: number; // character offset in the original text
}

// Pattern 1: Numbered headings like "1.", "1.1", "2.3.1"
const NUMBERED_HEADING_PATTERN = /(?:^|\n)\s*(\d+(?:\.\d+)*)[.)\s]+([A-Z][^\n]{2,80})/g;

// Pattern 2: Markdown-style headings: #, ##, ###
const MARKDOWN_HEADING_PATTERN = /(?:^|\n)(#{1,6})\s+([^\n]{2,100})/g;

// Pattern 3: ALL-CAPS lines (common in PDFs), 3–80 chars, standalone
const ALLCAPS_HEADING_PATTERN = /(?:^|\n)\s*([A-Z][A-Z\s&:,\-]{2,79})\s*(?=\n)/g;

// Pattern 4: "Chapter X", "Section X", "Part X" prefixes
const LABELED_HEADING_PATTERN = /(?:^|\n)\s*(?:chapter|section|part|appendix)\s+[\dIVXivx]+[.:)]*\s*([^\n]{2,80})/gi;

/**
 * Detect headings from document text using multiple heuristic patterns.
 * Returns headings ordered by their position in the text.
 */
export function detectHeadings(text: string): DetectedHeading[] {
    const headings: DetectedHeading[] = [];
    const seenPositions = new Set<number>();

    // Helper to add heading if not duplicate at the same position
    const addHeading = (level: number, title: string, position: number) => {
        const cleanTitle = title.trim().replace(/[:.!?\-]+$/, '').trim();
        if (cleanTitle.length < 3 || cleanTitle.length > 100) return;

        // Deduplicate by proximity (within 5 chars)
        for (const p of seenPositions) {
            if (Math.abs(p - position) < 5) return;
        }
        seenPositions.add(position);
        headings.push({ level, title: cleanTitle, position });
    };

    // --- Pattern 1: Numbered headings ---
    let match: RegExpExecArray | null;
    const numberedRe = new RegExp(NUMBERED_HEADING_PATTERN.source, 'g');
    while ((match = numberedRe.exec(text)) !== null) {
        const numbering = match[1];
        const level = numbering.split('.').length;
        const title = match[2].trim();
        addHeading(level, title, match.index);
    }

    // --- Pattern 2: Markdown headings ---
    const markdownRe = new RegExp(MARKDOWN_HEADING_PATTERN.source, 'g');
    while ((match = markdownRe.exec(text)) !== null) {
        const level = match[1].length; // number of # chars
        const title = match[2].trim();
        addHeading(level, title, match.index);
    }

    // --- Pattern 3: ALL-CAPS lines (only if few enough to be headings) ---
    const allcapsRe = new RegExp(ALLCAPS_HEADING_PATTERN.source, 'g');
    const capsMatches: { title: string; position: number }[] = [];
    while ((match = allcapsRe.exec(text)) !== null) {
        const candidate = match[1].trim();
        // Skip if it looks like an acronym list or has too many spaces (table-like data)
        if (candidate.split(/\s+/).length > 8) continue;
        if (/^\d/.test(candidate)) continue;
        capsMatches.push({ title: candidate, position: match.index });
    }
    // Only use caps headings if there aren't too many (otherwise it's likely body text)
    if (capsMatches.length > 0 && capsMatches.length < 30) {
        capsMatches.forEach(h => addHeading(1, h.title, h.position));
    }

    // --- Pattern 4: Labeled headings (Chapter X, Section X) ---
    // Enhanced to capture both prefix and title for common PDF formats
    const labeledRe = new RegExp(LABELED_HEADING_PATTERN.source, 'gi');
    while ((match = labeledRe.exec(text)) !== null) {
        // Use the full match for context, title is the captured group
        const title = match[1]?.trim() || match[0].trim();
        addHeading(1, title, match.index);
    }

    // --- Pattern 5: "Section N:" / "Section N –" with colon or dash separator ---
    // Catches formats like "Section 1: Entering Text and Numbers"
    const sectionColonRe = /(?:^|\n)\s*(?:section|chapter|part|module|unit)\s+(\d+)\s*[:–\-]\s*([^\n]{2,80})/gi;
    while ((match = sectionColonRe.exec(text)) !== null) {
        const sectionNum = parseInt(match[1]);
        const title = match[2].trim();
        addHeading(1, `Section ${sectionNum}: ${title}`, match.index);
    }

    // --- Pattern 6: Title-case lines between blank lines (visual heading heuristic) ---
    // Common in PDFs where headings are visually separated but have no markers
    const titleCaseRe = /\n\s*\n\s*([A-Z][a-zA-Z\s,&\-]{4,60})\s*\n\s*\n/g;
    while ((match = titleCaseRe.exec(text)) !== null) {
        const candidate = match[1].trim();
        // Skip if it looks like a sentence (has too many lowercase words)
        const words = candidate.split(/\s+/);
        const capitalizedWords = words.filter(w => /^[A-Z]/.test(w));
        if (capitalizedWords.length >= words.length * 0.5 && words.length <= 8) {
            addHeading(1, candidate, match.index);
        }
    }

    // Sort by position
    headings.sort((a, b) => a.position - b.position);

    // Normalize levels: ensure they start at 1 and are contiguous
    if (headings.length > 0) {
        const minLevel = Math.min(...headings.map(h => h.level));
        if (minLevel > 1) {
            const offset = minLevel - 1;
            headings.forEach(h => { h.level -= offset; });
        }
    }

    return headings;
}
