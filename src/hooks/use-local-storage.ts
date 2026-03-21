
'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Safely retrieves a value from window.localStorage.
 * Returns null if localStorage is not available or if parsing fails.
 * @template T - The expected type of the stored value.
 * @param {string} key - The key of the item to retrieve from localStorage.
 * @returns {T | null} The parsed value or null.
 */
function getValueFromLocalStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const item = window.localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : null;
  } catch (error) {
    console.error(`Error reading from localStorage for key "${key}":`, error);
    return null;
  }
}

/**
 * A custom React hook that syncs state with `window.localStorage`.
 * It's designed to be Next.js friendly, handling server-side rendering by
 * initially loading the value on the client-side.
 * @template T - The type of the value to be stored.
 * @param {string} key - The localStorage key.
 * @param {T} initialValue - The initial value to use if none is found in localStorage.
 * @returns {[T, (value: T | ((val: T) => T)) => void]} A stateful value and a function to update it.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // This effect runs only on the client, after initial hydration.
  useEffect(() => {
    const valueFromStorage = getValueFromLocalStorage<T>(key);
    if (valueFromStorage !== null) {
      setStoredValue(valueFromStorage);
    }
    // We only want this to run once on mount to get the initial value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  /**
   * Sets the new value in both the component's state and localStorage.
   * Memoized with useCallback to prevent infinite re-renders when used in dependency arrays.
   * @param {T | ((val: T) => T)} value - The new value or a function that returns the new value.
   */
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      // Save state
      setStoredValue(valueToStore);
      // Save to local storage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error writing to localStorage for key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}
