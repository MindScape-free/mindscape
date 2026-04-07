export function normalizeTimestamp(value: any): Date {
  if (!value) return new Date(0);
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value._seconds === 'number') return new Date(value._seconds * 1000);
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? new Date(0) : parsed;
  }
  if (typeof value === 'number') return new Date(value);
  return new Date(0);
}

export function toISOTimestamp(value: any): string | null {
  const normalized = normalizeTimestamp(value);
  if (normalized.getTime() === 0) return null;
  return normalized.toISOString();
}

export function parseTimestamp(value: any): number {
  return normalizeTimestamp(value).getTime();
}

export function sortByTimestamp<T>(
  items: T[],
  getTimestamp: (item: T) => any,
  direction: 'asc' | 'desc' = 'desc'
): T[] {
  return [...items].sort((a, b) => {
    const ta = parseTimestamp(getTimestamp(a));
    const tb = parseTimestamp(getTimestamp(b));
    return direction === 'desc' ? tb - ta : ta - tb;
  });
}
