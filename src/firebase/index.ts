'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getFunctions } from 'firebase/functions'

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!getApps().length) {
    // Important! initializeApp() is called without any arguments because Firebase App Hosting
    // integrates with the initializeApp() function to provide the environment variables needed to
    // populate the FirebaseOptions in production. It is critical that we attempt to call initializeApp()
    // without arguments.
    let firebaseApp;
    try {
      // Attempt to initialize via Firebase App Hosting environment variables
      firebaseApp = initializeApp();
    } catch (e) {
      // BUILD SAFE GUARD: Skip initialization during server-side prerendering 
      // if configuration is missing to prevent build crashes.
      if (typeof window === 'undefined' && !firebaseConfig.apiKey) {
        if (process.env.NODE_ENV === "production") {
          console.warn('⚠️ Firebase initialization skipped during build/SSR (missing config).');
        }
        return {
          firebaseApp: null as any,
          auth: null as any,
          firestore: null as any,
          storage: null as any,
          functions: null as any
        };
      }

      // If configuration is present, proceed with standard initialization
      if (firebaseConfig.apiKey) {
        firebaseApp = initializeApp(firebaseConfig);
      } else {
        // Fallback for cases where we are somehow on client but missing keys
        console.error('❌ Firebase Error: No configuration provided (missing environment variables).');
        return {
          firebaseApp: null as any,
          auth: null as any,
          firestore: null as any,
          storage: null as any,
          functions: null as any
        };
      }
    }

    return getSdks(firebaseApp);
  }

  // If already initialized, return the SDKs with the already initialized App
  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
    storage: getStorage(firebaseApp),
    functions: getFunctions(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
