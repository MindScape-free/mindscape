'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

export interface UserProfile {
  uid: string;
  id: string;
  email: string | null;
  displayName: string | null;
  user_metadata: Record<string, unknown>;
}

interface AuthContextType {
  supabase: SupabaseClient | null;
  user: UserProfile | null;
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

interface AuthWrapperProps {
  children: ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const initSupabase = () => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        console.warn('Supabase configuration missing');
        setIsUserLoading(false);
        return;
      }

      const client = createClient(supabaseUrl, supabaseKey);
      setSupabase(client);

      client.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const userData = session.user;
          setUser({
            uid: userData.id,
            id: userData.id,
            email: userData.email,
            displayName: userData.user_metadata?.username as string | null || userData.email?.split('@')[0] || null,
            user_metadata: userData.user_metadata,
          });
          setSession(session);
          
          const adminIds = process.env.NEXT_PUBLIC_ADMIN_USER_IDS?.split(',') || [];
          setIsAdmin(adminIds.includes(userData.id));
        }
        setIsUserLoading(false);
      });

      const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          const userData = session.user;
          setUser({
            uid: userData.id,
            id: userData.id,
            email: userData.email,
            displayName: userData.user_metadata?.username as string | null || userData.email?.split('@')[0] || null,
            user_metadata: userData.user_metadata,
          });
          setSession(session);
          
          const adminIds = process.env.NEXT_PUBLIC_ADMIN_USER_IDS?.split(',') || [];
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
    if (!supabase) return { error: new Error('Supabase not initialized') };
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
      },
    });
    return { error: error as Error | null };
  };

  const resetPassword = async (email: string) => {
    if (!supabase) return { error: new Error('Supabase not initialized') };
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/reset-password`,
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
