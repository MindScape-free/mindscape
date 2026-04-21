'use client';

// Migration stub - Firebase removed, using Supabase instead
// This file provides shims to prevent build crashes during migration

import { useState, useEffect, useContext, createContext, ReactNode } from 'react';

export { firebaseConfig } from './config';

// Stub implementations to prevent build errors

export function initializeFirebase() {
  return {
    firebaseApp: null,
    auth: null,
    firestore: null,
    storage: null,
    functions: null
  };
}

export function getSdks(firebaseApp: any) {
  return {
    firebaseApp,
    auth: null,
    firestore: null,
    storage: null,
    functions: null
  };
}

// Auth Context Shim - now uses Supabase via @/lib/auth-context
const FirebaseAuthContext = createContext<any>(null);

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  
  useEffect(() => {
    setReady(true);
  }, []);
  
  return (
    <FirebaseAuthContext.Provider value={{ ready }}>
      {children}
    </FirebaseAuthContext.Provider>
  );
}

// These are re-exported from provider.tsx
export * from './provider';

// useCollection shim
export function useCollection(query: any) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    setLoading(false);
  }, []);
  
  return { data, loading };
}

// useDoc shim  
export function useDoc(ref: any) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    setLoading(false);
  }, []);
  
  return { data, loading };
}

// useFirestore shim - returns null
export function useFirestore() {
  return { firestore: null, isAdmin: false };
}

// useFirebase shim
export function useFirebase() {
  return { 
    auth: null, 
    firestore: null, 
    storage: null, 
    functions: null,
    isAdmin: false 
  };
}

// useStorage shim
export function useStorage() {
  return null;
}

// useMemoFirebase shim
export function useMemoFirebase(fn: () => any) {
  return fn();
}

// Error emitter shim
export const errorEmitter = {
  emit: () => {},
  on: () => {},
  off: () => () => {}
};

// Error class shim
export class FirestorePermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FirestorePermissionError';
  }
}

// Non-blocking updates shim
export function useNonBlockingUpdates() {
  return { update: async () => {} };
}

// Non-blocking login shim  
export function useNonBlockingLogin() {
  return { login: async () => {} };
}