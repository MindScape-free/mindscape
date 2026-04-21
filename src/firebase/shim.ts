'use client';

// Shim to prevent build crashes while migrating from Firebase to Supabase
// These hooks return null/empty values - migrate incrementally

import { useState, useEffect } from 'react';

export function useUser() {
  const [user, setUser] = useState<any>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  
  useEffect(() => {
    // Will be connected to Supabase auth context
    setIsUserLoading(false);
  }, []);
  
  return { user, isUserLoading };
}

export function useFirestore() {
  return { 
    firestore: null, 
    isAdmin: false 
  };
}

export function useFirebase() {
  return {
    auth: null,
    firestore: null,
    storage: null,
    functions: null,
    isAdmin: false,
  };
}

export function useCollection(query: any) {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    setIsLoading(false);
  }, []);
  
  return { data, isLoading };
}

export function useDoc(ref: any) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    setIsLoading(false);
  }, []);
  
  return { data, isLoading };
}

export function useMemoFirebase(fn: () => any) {
  return fn();
}

export const errorEmitter = {
  emit: () => {},
  on: () => {},
  off: () => {},
};

export class FirestorePermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FirestorePermissionError';
  }
}

export { FirebaseProvider } from './provider';
export { initializeFirebase } from './index';