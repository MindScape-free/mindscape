/**
 * @fileOverview Relationship Detection Module for SKEE
 * Identifies relationships between concepts using co-occurrence and relational phrases.
 */

export interface ConceptRelationship {
    from: string;
    to: string;
    type: 'co-occurrence' | 'subset' | 'component' | 'example' | 'related';
}

// Relational phrase patterns. Each captures (conceptA, conceptB).
const RELATIONAL_PATTERNS: { pattern: RegExp; type: ConceptRelationship['type'] }[] = [
    { pattern: /(\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s+(?:is a|are)\s+(?:type|kind|form|subset|branch)\s+of\s+(\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/gi, type: 'subset' },
    { pattern: /(\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s+(?:consists of|comprises|contains|includes)\s+(\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/gi, type: 'component' },
    { pattern: /(\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s+such\s+as\s+(\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/gi, type: 'example' },
    { pattern: /(\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s+(?:is based on|relies on|depends on|builds upon)\s+(\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/gi, type: 'related' },
    { pattern: /(\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s+(?:and|vs\.?|versus)\s+(\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/gi, type: 'related' },
];

/**
 * Detect co-occurrence relationships between known keywords within sentences.
 * Two keywords appearing in the same sentence = co-occurrence edge.
 */
function detectCoOccurrences(text: string, keywords: string[]): ConceptRelationship[] {
    if (keywords.length < 2) return [];

    const relationships: ConceptRelationship[] = [];
    const seen = new Set<string>();

    // Split into sentences
    const sentences = text.split(/[.!?\n]+/).filter(s => s.trim().length > 10);

    // Normalize keywords for matching
    const lowerKeywords = keywords.map(k => k.toLowerCase());

    for (const sentence of sentences) {
        const lowerSentence = sentence.toLowerCase();

        // Find which keywords appear in this sentence
        const presentKeywords: string[] = [];
        for (let i = 0; i < lowerKeywords.length; i++) {
            if (lowerSentence.includes(lowerKeywords[i])) {
                presentKeywords.push(keywords[i]);
            }
        }

        // Create co-occurrence edges for pairs
        for (let i = 0; i < presentKeywords.length; i++) {
            for (let j = i + 1; j < presentKeywords.length; j++) {
                const key = `${presentKeywords[i]}|${presentKeywords[j]}`;
                const reverseKey = `${presentKeywords[j]}|${presentKeywords[i]}`;
                if (!seen.has(key) && !seen.has(reverseKey)) {
                    seen.add(key);
                    relationships.push({
                        from: presentKeywords[i],
                        to: presentKeywords[j],
                        type: 'co-occurrence',
                    });
                }
            }
        }
    }

    return relationships;
}

/**
 * Detect explicit relational phrases in the text.
 */
function detectRelationalPhrases(text: string): ConceptRelationship[] {
    const relationships: ConceptRelationship[] = [];
    const seen = new Set<string>();

    for (const { pattern, type } of RELATIONAL_PATTERNS) {
        const re = new RegExp(pattern.source, pattern.flags);
        let match: RegExpExecArray | null;
        while ((match = re.exec(text)) !== null) {
            const from = match[1]?.trim();
            const to = match[2]?.trim();
            if (!from || !to || from.length < 3 || to.length < 3) continue;
            if (from.toLowerCase() === to.toLowerCase()) continue;

            const key = `${from.toLowerCase()}|${to.toLowerCase()}`;
            if (!seen.has(key)) {
                seen.add(key);
                relationships.push({ from, to, type });
            }
        }
    }

    return relationships;
}

/**
 * Detect all relationships in the document: both co-occurrence and explicit patterns.
 * @param text The full document text
 * @param globalKeywords Top keywords from the document (used for co-occurrence)
 * @param maxRelationships Maximum relationships to return (to limit prompt size)
 */
export function detectRelationships(
    text: string,
    globalKeywords: string[],
    maxRelationships: number = 20
): ConceptRelationship[] {
    const coOccurrences = detectCoOccurrences(text, globalKeywords);
    const relational = detectRelationalPhrases(text);

    // Prefer explicit relationships, then add co-occurrences
    const all = [...relational, ...coOccurrences];

    // Deduplicate
    const seen = new Set<string>();
    const unique = all.filter(r => {
        const key = `${r.from.toLowerCase()}→${r.to.toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    return unique.slice(0, maxRelationships);
}
