'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
}

interface UseLoadingOptions {
  defaultMessage?: string;
}

interface UseLoadingReturn {
  isLoading: boolean;
  message?: string;
  progress?: number;
  withLoading: <T>(promise: Promise<T>, message?: string) => Promise<T>;
  startLoading: (message?: string) => void;
  setProgress: (progress: number, message?: string) => void;
  stopLoading: () => void;
}

/**
 * Hook for managing loading states with progress support.
 * Provides a consistent way to show loading states across the app.
 */
export function useLoading(options: UseLoadingOptions = {}): UseLoadingReturn {
  const [state, setState] = useState<LoadingState>({
    isLoading: false,
    message: options.defaultMessage,
    progress: undefined,
  });

  const loadingRef = useRef(false);

  const startLoading = useCallback((message?: string) => {
    loadingRef.current = true;
    setState({
      isLoading: true,
      message: message || options.defaultMessage,
      progress: undefined,
    });
  }, [options.defaultMessage]);

  const setProgress = useCallback((progress: number, message?: string) => {
    if (!loadingRef.current) return;
    setState(prev => ({
      ...prev,
      progress: Math.min(100, Math.max(0, progress)),
      message: message ?? prev.message,
    }));
  }, []);

  const stopLoading = useCallback(() => {
    loadingRef.current = false;
    setState({
      isLoading: false,
      message: undefined,
      progress: undefined,
    });
  }, []);

  const withLoading = useCallback(async <T,>(
    promise: Promise<T>,
    message?: string
  ): Promise<T> => {
    startLoading(message);
    try {
      const result = await promise;
      return result;
    } finally {
      stopLoading();
    }
  }, [startLoading, stopLoading]);

  return {
    isLoading: state.isLoading,
    message: state.message,
    progress: state.progress,
    withLoading,
    startLoading,
    setProgress,
    stopLoading,
  };
}

interface UseAsyncOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  manual?: boolean;
}

interface UseAsyncReturn<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  execute: (...args: any[]) => Promise<T | undefined>;
  reset: () => void;
}

/**
 * Hook for managing async operations with loading and error states.
 */
export function useAsync<T>(
  asyncFunction: (...args: any[]) => Promise<T>,
  options: UseAsyncOptions<T> = {}
): UseAsyncReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(async (...args: any[]): Promise<T | undefined> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await asyncFunction(...args);
      if (mountedRef.current) {
        setData(result);
        options.onSuccess?.(result);
      }
      return result;
    } catch (err) {
      if (mountedRef.current) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        options.onError?.(error);
      }
      return undefined;
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [asyncFunction, options]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!options.manual) {
      execute();
    }
  }, []);

  return { data, error, isLoading, execute, reset };
}

interface UseDebouncedLoadingOptions {
  delay?: number;
}

/**
 * Hook for debounced loading state (avoids flash for quick operations).
 */
export function useDebouncedLoading(options: UseDebouncedLoadingOptions = {}): UseLoadingReturn & {
  isDebouncedLoading: boolean;
} {
  const { delay = 300 } = options;
  const loading = useLoading();
  const [isDebouncedLoading, setIsDebouncedLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const startLoading = useCallback((message?: string) => {
    timeoutRef.current = setTimeout(() => {
      setIsDebouncedLoading(true);
    }, delay);
    loading.startLoading(message);
  }, [delay, loading]);

  const stopLoading = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsDebouncedLoading(false);
    loading.stopLoading();
  }, [loading]);

  return {
    ...loading,
    isDebouncedLoading,
    startLoading,
    stopLoading,
  };
}
