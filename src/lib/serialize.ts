/**
 * Safely converts an object with non-serializable data (like Firestore Timestamps)
 * into a plain JavaScript object that can be passed to Next.js Server Actions.
 */
export function toPlainObject<T>(obj: T): T {
    if (!obj) return obj;
    try {
        const seen = new WeakSet();
        // A custom replacer that detects cycles AND handles common non-serializable types if needed
        const safeStringified = JSON.stringify(obj, (key, value) => {
            if (typeof value === "object" && value !== null) {
                if (seen.has(value)) {
                    // console.warn('Circular reference detected and removed during serialization:', key);
                    return;
                }
                seen.add(value);
            }
            return value;
        });
        return JSON.parse(safeStringified);
    } catch (error) {
        console.error("Serialization failed:", error);
        // Fallback: simpler deep clone if possible, or just return as is (risk of server action failure)
        return JSON.parse(JSON.stringify(obj));
    }
}
