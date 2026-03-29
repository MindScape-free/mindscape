import pako from 'pako';

const STORAGE_KEY_PREFIX = 'ms_compressed_';
const SOFT_LIMIT_MB = 4;
const HARD_LIMIT_MB = 5;
const SOFT_LIMIT = SOFT_LIMIT_MB * 1024 * 1024;
const HARD_LIMIT = HARD_LIMIT_MB * 1024 * 1024;

interface StorageItem<T> {
  data: T;
  compressed: boolean;
  size: number;
  timestamp: number;
}

interface CompressionResult {
  success: boolean;
  warning?: string;
  originalSize?: number;
  compressedSize?: number;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';
}

function calculateSize(value: string): number {
  return new Blob([value]).size;
}

function compress(data: string): string {
  const compressed = pako.deflate(data);
  return btoa(String.fromCharCode(...compressed));
}

function decompress(compressed: string): string {
  const binary = atob(compressed);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return pako.inflate(bytes, { to: 'string' });
}

export function safeSetItem<T>(key: string, value: T, compressThreshold = SOFT_LIMIT): CompressionResult {
  if (!isBrowser()) {
    return { success: false };
  }

  const serialized = JSON.stringify(value);
  const originalSize = calculateSize(serialized);
  
  if (originalSize > HARD_LIMIT) {
    console.warn(`⚠️ Data too large (${(originalSize / 1024 / 1024).toFixed(2)}MB) for sessionStorage`);
    return { 
      success: false, 
      warning: `Data exceeds ${HARD_LIMIT_MB}MB limit. Consider reducing content size.`,
      originalSize 
    };
  }

  let dataToStore: string;
  let compressed = false;

  if (originalSize > compressThreshold) {
    try {
      dataToStore = compress(serialized);
      compressed = true;
    } catch (err) {
      console.error('Compression failed:', err);
      dataToStore = serialized;
      compressed = false;
    }
  } else {
    dataToStore = serialized;
  }

  const storageItem: StorageItem<T> = {
    data: compressed ? JSON.parse(serialized) : value,
    compressed,
    size: originalSize,
    timestamp: Date.now(),
  };

  const finalData = compressed 
    ? STORAGE_KEY_PREFIX + dataToStore 
    : dataToStore;

  try {
    sessionStorage.setItem(key, finalData);
    
    if (originalSize > SOFT_LIMIT) {
      console.warn(`⚠️ Large data stored (${(originalSize / 1024 / 1024).toFixed(2)}MB)`);
    }

    return { 
      success: true, 
      warning: originalSize > SOFT_LIMIT ? 'Large data stored' : undefined,
      originalSize,
      compressedSize: compressed ? calculateSize(dataToStore) : originalSize
    };
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      console.error('❌ sessionStorage quota exceeded');
      return { 
        success: false, 
        warning: 'Storage quota exceeded. Please clear some data.',
        originalSize 
      };
    }
    throw e;
  }
}

export function safeGetItem<T>(key: string): T | null {
  if (!isBrowser()) {
    return null;
  }

  const raw = sessionStorage.getItem(key);
  if (!raw) return null;

  if (raw.startsWith(STORAGE_KEY_PREFIX)) {
    const compressed = raw.slice(STORAGE_KEY_PREFIX.length);
    try {
      const decompressed = decompress(compressed);
      return JSON.parse(decompressed) as T;
    } catch (err) {
      console.error('Decompression failed:', err);
      return null;
    }
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as unknown as T;
  }
}

export function safeRemoveItem(key: string): void {
  if (!isBrowser()) return;
  sessionStorage.removeItem(key);
}

export function getStorageUsage(): { used: number; total: number; percentage: number } | null {
  if (!isBrowser()) return null;

  let used = 0;
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key) {
      const value = sessionStorage.getItem(key);
      if (value) {
        used += calculateSize(key) + calculateSize(value);
      }
    }
  }

  return {
    used,
    total: HARD_LIMIT,
    percentage: (used / HARD_LIMIT) * 100,
  };
}

export function clearStorageWithPrefix(prefix: string): number {
  if (!isBrowser()) return 0;

  let cleared = 0;
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && key.includes(prefix)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach(key => {
    sessionStorage.removeItem(key);
    cleared++;
  });

  return cleared;
}

export function getCompressedSize(key: string): { original: number; compressed: number } | null {
  if (!isBrowser()) return null;

  const raw = sessionStorage.getItem(key);
  if (!raw) return null;

  const isCompressed = raw.startsWith(STORAGE_KEY_PREFIX);
  return {
    original: isCompressed ? calculateSize(decompress(raw.slice(STORAGE_KEY_PREFIX.length))) : calculateSize(raw),
    compressed: calculateSize(raw),
  };
}

export const STORAGE_LIMITS = {
  SOFT_LIMIT_MB,
  HARD_LIMIT_MB,
  SOFT_LIMIT_BYTES: SOFT_LIMIT,
  HARD_LIMIT_BYTES: HARD_LIMIT,
} as const;
