/**
 * @fileOverview Knowledge Graph Builder for SKEE
 * Assembles a knowledge graph from sections, keywords, and relationships.
 */

import { DocumentSection } from './section-splitter';
import { SectionKeywords } from './keyword-extractor';
import { ConceptRelationship } from './relationship-detector';

export interface GraphNode {
    id: string;
    label: string;
    type: 'section' | 'keyword' | 'concept';
    level: number; // hierarchy depth (1 = section, 2 = keyword, 3 = sub-concept)
    parentId?: string;
    frequency?: number; // for keyword nodes
}

export interface GraphEdge {
    from: string;
    to: string;
    type: string;
}

export interface KnowledgeGraph {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

/**
 * Slugify a label into a stable node ID.
 */
function toNodeId(label: string, prefix: string = ''): string {
    const slug = label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 40);
    return prefix ? `${prefix}_${slug}` : slug;
}

/**
 * Build a knowledge graph from analyzed document components.
 */
export function buildGraph(
    sections: DocumentSection[],
    sectionKeywords: SectionKeywords[],
    relationships: ConceptRelationship[]
): KnowledgeGraph {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const nodeIds = new Set<string>();

    const addNode = (node: GraphNode) => {
        if (!nodeIds.has(node.id)) {
            nodeIds.add(node.id);
            nodes.push(node);
        }
    };

    // 1. Create section nodes (level 1)
    for (const section of sections) {
        const sectionId = toNodeId(section.title, 'sec');
        addNode({
            id: sectionId,
            label: section.title,
            type: 'section',
            level: section.level,
        });

        // 2. Find keywords for this section and create keyword nodes (level 2)
        const sectionKw = sectionKeywords.find(sk => sk.sectionTitle === section.title);
        if (sectionKw) {
            for (const [keyword, freq] of sectionKw.keywords) {
                const kwId = toNodeId(keyword, 'kw');
                addNode({
                    id: kwId,
                    label: keyword,
                    type: 'keyword',
                    level: 2,
                    parentId: sectionId,
                    frequency: freq,
                });

                // Edge: section → keyword
                edges.push({
                    from: sectionId,
                    to: kwId,
                    type: 'contains',
                });
            }
        }
    }

    // 3. Add relationship edges (and create concept nodes if they don't exist)
    for (const rel of relationships) {
        const fromId = findOrCreateConceptNode(rel.from, nodes, nodeIds);
        const toId = findOrCreateConceptNode(rel.to, nodes, nodeIds);

        if (fromId && toId && fromId !== toId) {
            edges.push({
                from: fromId,
                to: toId,
                type: rel.type,
            });
        }
    }

    return { nodes, edges };
}

/**
 * Find an existing node matching the label, or create a new concept node.
 */
function findOrCreateConceptNode(
    label: string,
    nodes: GraphNode[],
    nodeIds: Set<string>
): string {
    const lowerLabel = label.toLowerCase();

    // Try to find existing node by label match
    const existing = nodes.find(n => n.label.toLowerCase() === lowerLabel);
    if (existing) return existing.id;

    // Try partial match for keyword nodes
    const partial = nodes.find(n =>
        n.type === 'keyword' && (
            n.label.toLowerCase().includes(lowerLabel) ||
            lowerLabel.includes(n.label.toLowerCase())
        )
    );
    if (partial) return partial.id;

    // Create new concept node
    const id = toNodeId(label, 'concept');
    if (!nodeIds.has(id)) {
        nodeIds.add(id);
        nodes.push({
            id,
            label,
            type: 'concept',
            level: 3,
        });
    }
    return id;
}
