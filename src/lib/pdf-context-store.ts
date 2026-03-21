import { ExtractedConcept } from "@/knowledge-engine/concept-extractor";

export interface PdfContext {
    summary: string;
    concepts: ExtractedConcept[];
    timestamp: number;
}

// Using a global map to persist across hot reloads if possible in some environments,
// though Next.js server actions are usually stateless.
const pdfContextStore = new Map<string, PdfContext>();

/**
 * Saves PDF context for a session.
 */
export function setPdfContext(sessionId: string, context: PdfContext) {
    console.log(`🧠 PDF Store: Saving context for session ${sessionId}`);
    pdfContextStore.set(sessionId, {
        ...context,
        timestamp: Date.now()
    });
}

/**
 * Retrieves PDF context for a session.
 */
export function getPdfContext(sessionId: string): PdfContext | undefined {
    return pdfContextStore.get(sessionId);
}

/**
 * Clears old context (optional cleanup).
 */
export function clearOldContext(maxAgeMs: number = 1000 * 60 * 60) { // 1 hour default
    const now = Date.now();
    for (const [id, ctx] of pdfContextStore.entries()) {
        if (now - ctx.timestamp > maxAgeMs) {
            pdfContextStore.delete(id);
        }
    }
}
