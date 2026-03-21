/**
 * @fileOverview SKEE — Smart Knowledge Extraction Engine
 * Orchestrator that runs the full deterministic analysis pipeline.
 *
 * Pipeline:
 *   Text → Heading Detection → Section Splitting → Keyword Extraction
 *   → Relationship Detection → Knowledge Graph → Structured Prompt Context
 */

import { detectHeadings } from './heading-detector';
import { splitSections } from './section-splitter';
import { extractKeywords } from './keyword-extractor';
import { detectRelationships } from './relationship-detector';
import { buildGraph } from './graph-builder';
import { graphToPromptContext } from './graph-to-mindmap';

export interface SKEEAnalysisResult {
    /** Structured context string to inject into the AI prompt */
    structuredContext: string;
    /** Statistics about the analysis for logging/debugging */
    stats: {
        headingsFound: number;
        sectionsCreated: number;
        keywordsExtracted: number;
        relationshipsDetected: number;
        graphNodes: number;
        graphEdges: number;
    };
}

/**
 * Run the full SKEE analysis pipeline on a document text.
 * Returns structured context that can be injected into AI prompts
 * to guide richer, more accurate mindmap generation.
 *
 * This is a pure, synchronous, deterministic function — no AI calls,
 * no external dependencies, no side effects.
 *
 * @param text The raw document text (from PDF or text file).
 * @returns Analysis result with structured context and stats.
 */
export function analyzeDocument(text: string): SKEEAnalysisResult {
    // Guard: if text is too short, return empty context
    if (!text || text.trim().length < 100) {
        return {
            structuredContext: '',
            stats: {
                headingsFound: 0,
                sectionsCreated: 0,
                keywordsExtracted: 0,
                relationshipsDetected: 0,
                graphNodes: 0,
                graphEdges: 0,
            },
        };
    }

    // Step 1: Detect headings
    const headings = detectHeadings(text);

    // Step 2: Split into sections
    const sections = splitSections(text, headings);

    // Step 3: Extract keywords
    const keywords = extractKeywords(sections);

    // Step 4: Detect relationships
    const globalKeywordTerms = keywords.global.map(([term]) => term);
    const relationships = detectRelationships(text, globalKeywordTerms);

    // Step 5: Build knowledge graph
    const graph = buildGraph(sections, keywords.perSection, relationships);

    // Step 6: Quality gate — only inject context if analysis is meaningful
    // A meaningful analysis has detected headings OR multiple sections OR enough keywords.
    // Without this gate, a short unstructured document would flood the prompt
    // with co-occurrence noise and confuse the AI model.
    // For longer documents, lower thresholds since even imperfect analysis helps.
    const totalKeywords = keywords.perSection.reduce(
        (sum, sk) => sum + sk.keywords.length, 0
    );

    const isLongDoc = text.length > 5000;
    const isMeaningful = isLongDoc
        ? (headings.length >= 1 ||       // Even 1 heading in a long doc is useful
            sections.length >= 2 ||       // 2+ sections in a long doc
            totalKeywords >= 8)           // Reasonable keyword spread
        : (headings.length >= 2 ||       // Short docs need clearer structure
            sections.length >= 3 ||       // Multiple distinct sections
            totalKeywords >= 15);         // Rich keyword distribution

    const structuredContext = isMeaningful
        ? graphToPromptContext(graph)
        : '';

    if (!isMeaningful) {
        console.log(`🧠 SKEE: Analysis below quality threshold (headings=${headings.length}, sections=${sections.length}, keywords=${totalKeywords}, docLen=${text.length}). Skipping context injection.`);
    }

    return {
        structuredContext,
        stats: {
            headingsFound: headings.length,
            sectionsCreated: sections.length,
            keywordsExtracted: totalKeywords,
            relationshipsDetected: relationships.length,
            graphNodes: graph.nodes.length,
            graphEdges: graph.edges.length,
        },
    };
}

// Re-export individual modules for advanced usage
export { detectHeadings } from './heading-detector';
export { splitSections } from './section-splitter';
export { extractKeywords } from './keyword-extractor';
export { detectRelationships } from './relationship-detector';
export { buildGraph } from './graph-builder';
export { graphToPromptContext } from './graph-to-mindmap';
