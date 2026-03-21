/**
 * @fileOverview Section Splitter Module for SKEE
 * Splits document text into sections using detected headings.
 */

import { DetectedHeading } from './heading-detector';

export interface DocumentSection {
    title: string;
    content: string;
    level: number;
    keywords?: string[]; // populated later by keyword-extractor
}

/**
 * Splits document text into sections based on detected headings.
 * If no headings are detected, falls back to paragraph-based splitting.
 */
export function splitSections(text: string, headings: DetectedHeading[]): DocumentSection[] {
    // Fallback: If no headings detected, split by double newlines into pseudo-sections
    if (headings.length === 0) {
        return splitByParagraphs(text);
    }

    const sections: DocumentSection[] = [];

    for (let i = 0; i < headings.length; i++) {
        const heading = headings[i];
        const nextHeading = headings[i + 1];

        // Find the start of content (after the heading title line)
        const titleInText = text.indexOf(heading.title, heading.position);
        const contentStart = titleInText !== -1
            ? titleInText + heading.title.length
            : heading.position;

        // End is either the start of the next heading or the end of text
        const contentEnd = nextHeading ? nextHeading.position : text.length;

        const content = text.slice(contentStart, contentEnd).trim();

        // Skip sections with negligible content
        if (content.length < 20) continue;

        sections.push({
            title: heading.title,
            content,
            level: heading.level,
        });
    }

    // If heading-based splitting produced too few sections, append paragraph fallback for uncovered text
    if (sections.length === 0) {
        return splitByParagraphs(text);
    }

    // Capture any text before the first heading as a preamble section
    if (headings[0].position > 50) {
        const preamble = text.slice(0, headings[0].position).trim();
        if (preamble.length > 30) {
            sections.unshift({
                title: 'Overview',
                content: preamble,
                level: 1,
            });
        }
    }

    return sections;
}

/**
 * Fallback splitter: divide text into sections by paragraph boundaries.
 * Groups paragraphs into chunks of ~3 paragraphs each.
 */
function splitByParagraphs(text: string): DocumentSection[] {
    const paragraphs = text
        .split(/\n\s*\n/)
        .map(p => p.trim())
        .filter(p => p.length > 30);

    if (paragraphs.length === 0) {
        return [{ title: 'Document Content', content: text.trim(), level: 1 }];
    }

    const sections: DocumentSection[] = [];
    const chunkSize = 3;

    for (let i = 0; i < paragraphs.length; i += chunkSize) {
        const chunk = paragraphs.slice(i, i + chunkSize);
        const content = chunk.join('\n\n');

        // Use the first few words of the first paragraph as a pseudo-title
        const firstLine = chunk[0].split(/[.!?\n]/)[0].trim();
        const title = firstLine.length > 60
            ? firstLine.substring(0, 57) + '...'
            : firstLine || `Section ${sections.length + 1}`;

        sections.push({
            title,
            content,
            level: 1,
        });
    }

    return sections;
}
