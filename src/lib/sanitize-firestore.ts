/**
 * Utility to sanitize Firestore data by converting Timestamps to plain Date objects
 * This prevents "Objects with toJSON methods are not supported" errors in Next.js
 */

export function sanitizeFirestoreData<T>(data: T): T {
    if (!data) return data;

    // Handle arrays
    if (Array.isArray(data)) {
        return data.map(item => sanitizeFirestoreData(item)) as any;
    }

    // Handle objects
    if (typeof data === 'object') {
        const sanitized: any = {};

        for (const key in data) {
            const value = (data as any)[key];

            // Check if it's a Firestore Timestamp (has toDate method)
            if (value && typeof value === 'object' && typeof value.toDate === 'function') {
                sanitized[key] = value.toDate();
            }
            // Recursively sanitize nested objects
            else if (value && typeof value === 'object') {
                sanitized[key] = sanitizeFirestoreData(value);
            }
            // Primitive values
            else {
                sanitized[key] = value;
            }
        }

        return sanitized as T;
    }

    // Return primitives as-is
    return data;
}
