'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { SupabaseClient, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { createClient } from '@/lib/client';

export interface User {
  id: string;
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  user_metadata?: Record<string, any>;
}

interface AuthContextType {
  supabase: SupabaseClient | null;
  user: User | null;
  session: Session | null;
  isUserLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, username?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
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
  isAdmin: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function useUser() {
  const { user, isUserLoading } = useContext(AuthContext);
  return { user, isUserLoading };
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [supabase] = useState<SupabaseClient>(() => createClient());
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkAdminStatus = async (userId: string) => {
      const adminIds = (process.env.NEXT_PUBLIC_ADMIN_USER_IDS || '').split(',').map(id => id.trim()).filter(Boolean);
      if (adminIds.includes(userId)) return true;
      try {
        const { data } = await supabase.from('users').select('is_admin').eq('id', userId).single();
        return data?.is_admin === true;
      } catch (err) {
        console.error('Admin status check failed:', err);
        return false;
      }
    };

    supabase.auth.getSession().then(async ({ data: { session } }: { data: { session: Session | null } }) => {
      if (cancelled) return;
      if (session?.user) {
        const userData = session.user;
        setUser({
          id: userData.id,
          uid: userData.id,
          email: userData.email || null,
          displayName: userData.user_metadata?.username as string | null || userData.email?.split('@')[0] || null,
          photoURL: userData.user_metadata?.avatar_url as string | null || null,
        });
        setSession(session);

        const isSystemAdmin = await checkAdminStatus(userData.id);
        if (!cancelled) setIsAdmin(isSystemAdmin);
      }
      if (!cancelled) setIsUserLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      if (cancelled) return;
      if (session?.user) {
        const userData = session.user;
        setUser({
          id: userData.id,
          uid: userData.id,
          email: userData.email || null,
          displayName: userData.user_metadata?.username as string | null || userData.email?.split('@')[0] || null,
          photoURL: userData.user_metadata?.avatar_url as string | null || null,
        });
        setSession(session);

        const isSystemAdmin = await checkAdminStatus(userData.id);
        if (!cancelled) setIsAdmin(isSystemAdmin);
      } else {
        setUser(null);
        setSession(null);
        setIsAdmin(false);
      }
      if (!cancelled) setIsUserLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signIn = async (email: string, password: string) => {
    if (!supabase) return { error: new Error('Supabase not initialized') };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, username?: string) => {
    if (!supabase) return { error: new Error('Supabase not initialized') };
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: username || email.split('@')[0] } },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
  };

  const signInWithGoogle = async () => {
    if (!supabase) return { error: new Error('Supabase not initialized') };
    const origin = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
    const redirectUrl = `${origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo: redirectUrl, 
        skipBrowserRedirect: false,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });
    return { error: error as Error | null };
  };

  const resetPassword = async (email: string) => {
    if (!supabase) return { error: new Error('Supabase not initialized') };
    const origin = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/reset-password`,
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
      isAdmin 
    }}>
      {children}
    </AuthContext.Provider>
  );
}
