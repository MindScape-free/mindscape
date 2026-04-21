'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { SupabaseClient, Session } from '@supabase/supabase-js';

export interface FirebaseUser {
  uid: string;
  id: string;
  email: string | null;
  displayName: string | null;
}

interface AuthContextType {
  supabase: SupabaseClient | null;
  user: FirebaseUser | null;
  session: Session | null;
  isUserLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, username?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  firestore: SupabaseClient | null;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  supabase: null,
  user: null,
  session: null,
  isUserLoading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  signInWithGoogle: async () => ({ error: null }),
  resetPassword: async () => ({ error: null }),
  firestore: null,
  isAdmin: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function useUser() {
  const { user, isUserLoading } = useContext(AuthContext);
  return { user, isUserLoading };
}

export function useFirestore() {
  const { firestore, isAdmin } = useContext(AuthContext);
  return { firestore, isAdmin };
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const initSupabase = () => {
      // Use singleton from supabase-db to prevent multiple instances
      const { getSupabaseClient } = require('@/lib/supabase-db');
      const client = getSupabaseClient();
      setSupabase(client);
      console.log('[Auth] Using singleton client');
      console.log('[Auth] Client created, checking session...');

      client.auth.getSession().then(({ data: { session } }) => {
        console.log('[Auth] getSession result:', session ? 'session exists for user: ' + session.user?.email : 'no session');
        if (session?.user) {
          const userData = session.user;
          setUser({
            uid: userData.id,
            id: userData.id,
            email: userData.email,
            displayName: userData.user_metadata?.username as string | null || userData.email?.split('@')[0] || null,
          });
          setSession(session);
          
          const adminIds = (process.env.NEXT_PUBLIC_ADMIN_USER_IDS || '765cd0a0-6201-41d2-ac8d-ff99b4941289').split(',').map(id => id.trim());
          setIsAdmin(adminIds.includes(userData.id));
        }
        setIsUserLoading(false);
      });

      const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
        console.log('[Auth] onAuthStateChange event:', event, 'session:', session ? 'exists' : 'none');
        if (session?.user) {
          const userData = session.user;
          setUser({
            uid: userData.id,
            id: userData.id,
            email: userData.email,
            displayName: userData.user_metadata?.username as string | null || userData.email?.split('@')[0] || null,
          });
          setSession(session);
          
          const adminIds = (process.env.NEXT_PUBLIC_ADMIN_USER_IDS || '765cd0a0-6201-41d2-ac8d-ff99b4941289').split(',').map(id => id.trim());
          setIsAdmin(adminIds.includes(userData.id));
        } else {
          setUser(null);
          setSession(null);
          setIsAdmin(false);
        }
        setIsUserLoading(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    };

    initSupabase();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabase) return { error: new Error('Supabase not initialized') };
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, username?: string) => {
    if (!supabase) return { error: new Error('Supabase not initialized') };
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username || email.split('@')[0],
        },
      },
    });
    
    return { error: error as Error | null };
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  const signInWithGoogle = async () => {
    if (!supabase) {
      console.error('[Auth] Supabase not initialized');
      return { error: new Error('Supabase not initialized') };
    }
    
    const redirectUrl = typeof window !== 'undefined' && window.location 
      ? `${window.location.origin}/auth/callback` 
      : 'http://localhost:3000/auth/callback';
    
    console.log('[Auth] signInWithGoogle redirectTo:', redirectUrl);
    console.log('[Auth] Starting OAuth flow...');
    
    // For redirect-based OAuth, we never get data.url back - it redirects immediately
    // The callback page handles the session exchange
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: false, // Explicitly allow browser redirect
      },
    });
    
    console.log('[Auth] OAuth error:', error);
    
    // If there's no error, the browser should have redirected
    // If error occurs, we'll return it
    if (error) {
      return { error: error as Error | null };
    }
    
    // No error but no redirect - this is unexpected but handle it gracefully
    // Don't reset loading - let the auth state change handler deal with it
    console.log('[Auth] OAuth initiated, should redirect...');
    return { error: null };
  };

  const resetPassword = async (email: string) => {
    if (!supabase) return { error: new Error('Supabase not initialized') };
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${typeof window !== 'undefined' && window.location ? window.location.origin : ''}/auth/reset-password`,
    });
    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider value={{ 
      supabase, 
      user, 
      session,
      isUserLoading, 
      signIn, 
      signUp, 
      signOut, 
      signInWithGoogle, 
      resetPassword,
      firestore: supabase,
      isAdmin 
    }}>
      {children}
    </AuthContext.Provider>
  );
}
