/**
 * @fileOverview Graph → Prompt Context Converter for SKEE
 * Converts a knowledge graph into structured text that guides AI generation.
 */

import { KnowledgeGraph, GraphNode, GraphEdge } from './graph-builder';

/**
 * Convert a knowledge graph into a structured prompt context string.
 * This is NOT a final mindmap — it's structured guidance injected into the AI prompt
 * so the AI produces deeper, more accurate, document-faithful mindmaps.
 */
export function graphToPromptContext(graph: KnowledgeGraph): string {
    const lines: string[] = [];

    // --- Section structure ---
    const sectionNodes = graph.nodes.filter(n => n.type === 'section');
    const keywordNodes = graph.nodes.filter(n => n.type === 'keyword');

    if (sectionNodes.length > 0) {
        lines.push('DOCUMENT STRUCTURE DETECTED:');

        for (const section of sectionNodes) {
            const indent = '  '.repeat(Math.max(0, section.level - 1));
            const sectionKeywords = keywordNodes
                .filter(kw => kw.parentId === section.id)
                .map(kw => kw.label)
                .slice(0, 6);

            const kwStr = sectionKeywords.length > 0
                ? ` (Key concepts: ${sectionKeywords.join(', ')})`
                : '';

            lines.push(`${indent}- ${section.label}${kwStr}`);
        }

        lines.push('');
    }

    // --- Key relationships ---
    const meaningfulEdges = graph.edges.filter(e => e.type !== 'contains');
    if (meaningfulEdges.length > 0) {
        lines.push('CONCEPT RELATIONSHIPS FOUND:');

        for (const edge of meaningfulEdges.slice(0, 15)) {
            const fromNode = graph.nodes.find(n => n.id === edge.from);
            const toNode = graph.nodes.find(n => n.id === edge.to);
            if (fromNode && toNode) {
                const relLabel = formatRelationType(edge.type);
                lines.push(`  - ${fromNode.label} ${relLabel} ${toNode.label}`);
            }
        }

        lines.push('');
    }

    // --- Suggested hierarchy ---
    if (sectionNodes.length > 0) {
        lines.push('SUGGESTED MIND MAP HIERARCHY (use as structural guide):');
        lines.push(buildHierarchyTree(graph));
        lines.push('');
    }

    // --- Global keywords ---
    const topKeywords = keywordNodes
        .sort((a, b) => (b.frequency || 0) - (a.frequency || 0))
        .slice(0, 10)
        .map(n => n.label);

    if (topKeywords.length > 0) {
        lines.push(`MOST IMPORTANT CONCEPTS: ${topKeywords.join(', ')}`);
        lines.push('');
    }

    return lines.join('\n');
}

/**
 * Build a tree hierarchy string from the graph for the prompt.
 */
function buildHierarchyTree(graph: KnowledgeGraph): string {
    const sectionNodes = graph.nodes.filter(n => n.type === 'section');
    const lines: string[] = [];

    for (const section of sectionNodes) {
        const indent = '  '.repeat(section.level);
        lines.push(`${indent}├─ ${section.label}`);

        // Show top keywords under each section
        const children = graph.nodes
            .filter(n => n.parentId === section.id && n.type === 'keyword')
            .slice(0, 4);

        for (let i = 0; i < children.length; i++) {
            const childIndent = '  '.repeat(section.level + 1);
            const connector = i === children.length - 1 ? '└─' : '├─';
            lines.push(`${childIndent}${connector} ${children[i].label}`);

            // Show related concepts from edges
            const relatedEdges = graph.edges.filter(
                e => (e.from === children[i].id || e.to === children[i].id) && e.type !== 'contains'
            );
            for (const edge of relatedEdges.slice(0, 2)) {
                const relatedNode = graph.nodes.find(
                    n => n.id === (edge.from === children[i].id ? edge.to : edge.from)
                );
                if (relatedNode) {
                    const deepIndent = '  '.repeat(section.level + 2);
                    lines.push(`${deepIndent}└─ ${relatedNode.label}`);
                }
            }
        }
    }

    return lines.join('\n');
}

function formatRelationType(type: string): string {
    switch (type) {
        case 'subset': return '→ is a type of';
        case 'component': return '→ contains';
        case 'example': return '→ example:';
        case 'co-occurrence': return '↔ related to';
        case 'related': return '→ related to';
        default: return '→';
    }
}
