import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cachedAdmin) return cachedAdmin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    if (typeof window === 'undefined') {
      console.warn('[Supabase Admin] Credentials missing during server-side execution/build.');
    }
    return createClient('https://placeholder.supabase.co', 'placeholder', { auth: { persistSession: false } });
  }

  cachedAdmin = createClient(url, key, { auth: { persistSession: false } });
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
  const adminIds = (process.env.NEXT_PUBLIC_ADMIN_USER_IDS || '').split(',').map(s => s.trim());
  return adminIds.includes(userId);
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

export async function incrementAdminStatAdmin(field: string, value: number = 1): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const dateStr = new Date().toISOString().split('T')[0];
    const monthStr = dateStr.substring(0, 7);

    // Upsert all-time stats
    await supabase.from('admin_stats').upsert(
      { period: 'all-time', [field]: value, last_updated: Date.now() },
      { onConflict: 'period', ignoreDuplicates: false }
    );
    // Upsert daily stats
    await supabase.from('admin_stats').upsert(
      { period: `daily_${dateStr}`, date: dateStr, [field]: value, last_updated: Date.now() },
      { onConflict: 'period', ignoreDuplicates: false }
    );
    // Upsert monthly stats
    await supabase.from('admin_stats').upsert(
      { period: `monthly_${monthStr}`, month: monthStr, [field]: value, last_updated: Date.now() },
      { onConflict: 'period', ignoreDuplicates: false }
    );
  } catch (error) {
    console.error('Error incrementing admin stat:', error);
  }
}
