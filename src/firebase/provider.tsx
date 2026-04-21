'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
// firebase/app removed
// firebase/auth removed
// firebase/firestore removed
// firebase/storage removed

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

interface FirebaseUser {
  uid: string;
  email: string | null;
  photoURL: string | null;
  displayName: string | null;
}

export interface FirestoreServices {
  firebaseApp: FirebaseApp | null;
  auth: Auth | null;
  firestore: Firestore | null;
  storage: FirebaseStorage | null;
}

export interface FirestoreServicesAndUser extends FirestoreServices {
  user: FirebaseUser | null;
  isUserLoading: boolean;
  userError: Error | null;
  isAdmin: boolean;
}

interface FirebaseProviderProps {
  firebaseApp?: FirebaseApp | null;
  auth?: Auth | null;
  firestore?: Firestore | null;
  storage?: FirebaseStorage | null;
  functions?: any;
  children: ReactNode;
}

export const FirebaseContext = createContext<FirestoreServicesAndUser>({
  firebaseApp: null,
  auth: null,
  firestore: null,
  storage: null,
  user: null,
  isUserLoading: true,
  userError: null,
  isAdmin: false,
});

export function FirebaseProvider({ 
  firebaseApp: propsApp,
  auth: propsAuth,
  firestore: propsFirestore,
  storage: propsStorage,
  functions: propsFunctions,
  children 
}: FirebaseProviderProps) {
  const [services, setServices] = useState<FirestoreServicesAndUser>({
    firebaseApp: propsApp ?? null,
    auth: propsAuth ?? null,
    firestore: propsFirestore ?? null,
    storage: propsStorage ?? null,
    user: null,
    isUserLoading: true,
    userError: null,
    isAdmin: false,
  });

  useEffect(() => {
    // If props provided, use them directly
    if (propsApp && propsAuth) {
      const unsubscribe = onAuthStateChanged(propsAuth, (user) => {
        setServices({
          firebaseApp: propsApp,
          auth: propsAuth,
          firestore: propsFirestore ?? null,
          storage: propsStorage ?? null,
          user: user ? {
            uid: user.uid,
            email: user.email,
            photoURL: user.photoURL,
            displayName: user.displayName,
          } : null,
          isUserLoading: false,
          userError: null,
          isAdmin: false,
        });
      }, (error) => {
        setServices(prev => ({ ...prev, isUserLoading: false, userError: error as Error }));
      });
      return unsubscribe;
    }

    // Otherwise initialize internally
    if (!firebaseConfig.apiKey) {
      console.warn('Firebase config missing - using stub mode');
      setServices(prev => ({ ...prev, isUserLoading: false }));
      return;
    }

    try {
      const app = initializeApp(firebaseConfig);
      const authObj = getAuth(app);
      const firestoreObj = getFirestore(app);
      const storageObj = getStorage(app);

      const unsubscribe = onAuthStateChanged(authObj, (user) => {
        setServices({
          firebaseApp: app,
          auth: authObj,
          firestore: firestoreObj,
          storage: storageObj,
          user: user ? {
            uid: user.uid,
            email: user.email,
            photoURL: user.photoURL,
            displayName: user.displayName,
          } : null,
          isUserLoading: false,
          userError: null,
          isAdmin: false,
        });
      }, (error) => {
        setServices(prev => ({ ...prev, isUserLoading: false, userError: error as Error }));
      });

      return unsubscribe;
    } catch (error) {
      console.warn('Firebase init failed:', error);
      setServices(prev => ({ ...prev, isUserLoading: false }));
    }
  }, [propsApp, propsAuth, propsFirestore, propsStorage]);

  return (
    <FirebaseContext.Provider value={services}>
      {children}
    </FirebaseContext.Provider>
  );
}

export const useFirebase = (): FirestoreServicesAndUser => {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  return context;
};

export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  if (!firebaseApp) throw new Error('Firebase not initialized');
  return firebaseApp;
};

export const useUser = () => {
  const { user, isUserLoading, userError } = useFirebase();
  return { user, isUserLoading, userError };
};

export const useAuth = () => {
  const { auth, user } = useFirebase();
  return { auth, user };
};

export const useFirestore = () => {
  const supabase = getSupabaseClient();
  return firestore;
};

export const useStorage = () => {
  const { storage } = useFirebase();
  return storage;
};

export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
export const useMemoFirebase = () => ({});

export class FirestorePermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FirestorePermissionError';
  }
}

export const errorEmitter = {
  emit: () => {},
  on: () => {},
  off: () => {},
};

export const ADMIN_UID = process.env.NEXT_PUBLIC_ADMIN_USER_IDS?.split(',')[0] || '';
