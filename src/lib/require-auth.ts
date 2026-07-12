'use server';

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getEnv } from '@/lib/env';

/**
 * Verifies the authenticated user's session from cookies in a Server Action.
 * Returns the verified user ID — throws if no valid session exists.
 *
 * Usage:
 *   const userId = await requireAuth();
 */
export async function requireAuth(): Promise<string> {
  const { supabaseUrl, supabaseAnonKey } = getEnv();
  const cookieStore = await cookies();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Action where the response is not yet mutable.
          // Safe to ignore — the session refresh will be picked up on the next request.
        }
      },
    },
  });

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Authentication required. Please sign in.');
  }

  return user.id;
}

/**
 * Verifies the caller is an authenticated admin.
 * Returns the verified user ID — throws if not authenticated or not admin.
 */
export async function requireAdmin(): Promise<string> {
  const userId = await requireAuth();

  const adminIds = (process.env.NEXT_PUBLIC_ADMIN_USER_IDS || '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);

  if (adminIds.includes(userId)) {
    return userId;
  }

  // Fallback: check database
  try {
    const { getSupabaseAdmin } = await import('@/lib/supabase-server');
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (data?.is_admin === true) {
      return userId;
    }
  } catch (err) {
    console.error('[requireAdmin] Admin check failed:', err);
  }

  throw new Error('Admin privileges required.');
}
