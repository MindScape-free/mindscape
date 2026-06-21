import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getEnv } from './env';

let cachedAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cachedAdmin) return cachedAdmin;
  const { supabaseUrl, supabaseServiceRoleKey, supabaseAnonKey } = getEnv();
  const key = supabaseServiceRoleKey || supabaseAnonKey;

  cachedAdmin = createClient(supabaseUrl, key, { auth: { persistSession: false } });
  return cachedAdmin;
}


export interface UserImageSettings {
  pollinationsApiKey?: string;
  preferredModel?: string;
  apiKeyCreatedAt?: number;
  apiKeyLastUsed?: number;
}

export async function getUserImageSettingsAdmin(userId: string): Promise<UserImageSettings | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('user_settings')
      .select('pollinations_api_key, image_model, api_key_created_at, api_key_last_used')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;
    return {
      pollinationsApiKey: data.pollinations_api_key,
      preferredModel: data.image_model,
      apiKeyCreatedAt: data.api_key_created_at,
      apiKeyLastUsed: data.api_key_last_used,
    };
  } catch (error) {
    console.error('Error in getUserImageSettingsAdmin:', error);
    return null;
  }
}

export async function getMindMapAdmin(mapId: string): Promise<any | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('mindmaps').select('*').eq('id', mapId).single();
    if (error || !data) return null;
    return data;
  } catch (error) {
    console.error('Error in getMindMapAdmin:', error);
    return null;
  }
}

export async function isUserAdminServer(userId: string): Promise<boolean> {
  if (!userId) return false;
  
  // 1. Check Env Variable (Master override)
  const adminIds = (process.env.NEXT_PUBLIC_ADMIN_USER_IDS || '03504efc-d50a-4e84-ba24-1d82ef41fd82').split(',').map(s => s.trim());
  if (adminIds.includes(userId)) return true;

  // 2. Check Database column
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', userId)
      .single();
    
    return data?.is_admin === true;
  } catch (e) {
    console.error('Admin check failed:', e);
    return false;
  }
}

export async function logActivityAdmin(entry: Record<string, any>): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from('admin_activity_log').insert({
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

/**
 * @deprecated admin_stats is deprecated. Metrics are now computed from
 * user_profiles/events via recompute_platform_stats().
 */
