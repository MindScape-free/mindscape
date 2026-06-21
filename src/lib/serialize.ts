/**
 * Converts an object to a plain JSON-safe clone, removing circular references
 * and non-serializable types (Dates become strings, Maps/Objects remain as-is after JSON roundtrip).
 *
 * For large objects, prefer selective field access over cloning the entire payload.
 */
export function toPlainObject<T>(obj: T): T {
    if (!obj) return obj;
    try {
        const seen = new WeakSet();
        const safe = JSON.stringify(obj, (key, value) => {
            if (typeof value === "object" && value !== null) {
                if (seen.has(value)) return;
                seen.add(value);
                // Convert Date to ISO string to preserve temporal info
                if (value instanceof Date) return value.toISOString();
            }
            return value;
        });
        return JSON.parse(safe);
    } catch (error) {
        console.error("Serialization failed:", error);
        throw error;
    }
}
