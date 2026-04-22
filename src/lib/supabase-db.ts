import { createClient, SupabaseClient } from '@supabase/supabase-js';

let clientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (clientInstance) return clientInstance;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    if (typeof window === 'undefined') {
      console.warn('[Supabase] Environment variables missing during server-side execution/build.');
    }
    // Return a dummy client or handle as needed. 
    // To prevent crashes during build, we can return a proxy or just throw a more descriptive error that's caught.
    // However, most of our code expects a real client.
    // For build time, we can return a dummy.
    return createClient('https://placeholder.supabase.co', 'placeholder', { auth: { persistSession: false } });
  }

  console.log('[Supabase] Creating client singleton');
  clientInstance = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  });
  return clientInstance;
}

// Export for use in auth context
export function getSupabaseClientWithOptions(options?: { persistSession?: boolean }) {
  if (clientInstance) return clientInstance;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return createClient('https://placeholder.supabase.co', 'placeholder', { auth: { persistSession: false } });
  }

  clientInstance = createClient(url, key, {
    auth: {
      persistSession: options?.persistSession ?? true,
      autoRefreshToken: true,
    }
  });
  return clientInstance;
}

export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

// ── User Settings ──────────────────────────────────────────────────────────

export interface UserImageSettings {
  pollinationsApiKey?: string;
  preferredModel?: string;
  imageModel?: string;
  textModel?: string;
  apiKeyCreatedAt?: number;
  apiKeyLastUsed?: number;
}

export async function getUserImageSettings(supabase: SupabaseClient, userId: string): Promise<UserImageSettings | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('pollinations_api_key, image_model, text_model, api_key_created_at, api_key_last_used')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return {
    pollinationsApiKey: data.pollinations_api_key,
    imageModel: data.image_model,
    textModel: data.text_model,
    apiKeyCreatedAt: data.api_key_created_at,
    apiKeyLastUsed: data.api_key_last_used,
  };
}

export async function saveUserApiKey(
  supabase: SupabaseClient,
  userId: string,
  apiKey: string,
  imageModel?: string,
  textModel?: string
): Promise<void> {
  await supabase.from('user_settings').upsert({
    user_id: userId,
    pollinations_api_key: apiKey,
    image_model: imageModel || 'flux',
    text_model: textModel || 'openai',
    api_key_created_at: Date.now(),
    api_key_last_used: Date.now(),
  }, { onConflict: 'user_id' });
}

export async function deleteUserApiKey(supabase: SupabaseClient, userId: string): Promise<void> {
  await supabase.from('user_settings').update({
    pollinations_api_key: null,
    api_key_last_used: null,
  }).eq('user_id', userId);
}

// ── User Profile ───────────────────────────────────────────────────────────

export async function getUserProfile(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase.from('users').select('*').eq('id', userId).single();
  return data;
}

export async function upsertUserProfile(supabase: SupabaseClient, userId: string, profile: Record<string, any>) {
  await supabase.from('users').upsert({ id: userId, ...profile }, { onConflict: 'id' });
}

export async function updateUserField(supabase: SupabaseClient, userId: string, updates: Record<string, any>) {
  await supabase.from('users').update(updates).eq('id', userId);
}

// ── Mind Maps ──────────────────────────────────────────────────────────────

export async function saveMindMap(supabase: SupabaseClient, userId: string, mapId: string | null, metadata: any, content: any) {
  if (mapId) {
    await supabase.from('mindmaps').update({ ...metadata, content, updated_at: new Date().toISOString() }).eq('id', mapId).eq('user_id', userId);
    return mapId;
  }
  const { data, error } = await supabase.from('mindmaps').insert({
    user_id: userId,
    ...metadata,
    content,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).select('id').single();
  if (error) throw error;
  return data.id as string;
}

export async function getMindMap(supabase: SupabaseClient, userId: string, mapId: string) {
  const { data } = await supabase.from('mindmaps').select('*').eq('id', mapId).eq('user_id', userId).single();
  return data;
}

export async function updateMindMapField(supabase: SupabaseClient, mapId: string, updates: Record<string, any>) {
  await supabase.from('mindmaps').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', mapId);
}

export async function getUserMindMaps(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase.from('mindmaps').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  return data || [];
}

// ── Chat Sessions ──────────────────────────────────────────────────────────

export async function saveChatSession(supabase: SupabaseClient, userId: string, session: any) {
  await supabase.from('chat_sessions').upsert({
    id: session.id,
    user_id: userId,
    map_id: session.mapId,
    map_title: session.mapTitle,
    title: session.title,
    messages: session.messages,
    weak_tags: session.weakTags,
    quiz_history: session.quizHistory,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
}

export async function getChatSessions(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase.from('chat_sessions').select('*').eq('user_id', userId).order('updated_at', { ascending: false });
  return data || [];
}

export async function deleteChatSession(supabase: SupabaseClient, userId: string, sessionId: string) {
  await supabase.from('chat_sessions').delete().eq('id', sessionId).eq('user_id', userId);
}

// ── Public Maps ────────────────────────────────────────────────────────────

export async function publishMap(supabase: SupabaseClient, mapId: string, publicData: any) {
  await supabase.from('public_mindmaps').upsert({
    id: mapId,
    ...publicData,
    is_public: true,
    published_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
}

export async function unpublishMap(supabase: SupabaseClient, mapId: string) {
  await supabase.from('public_mindmaps').delete().eq('id', mapId);
}

export async function getPublicMap(supabase: SupabaseClient, mapId: string) {
  const { data } = await supabase.from('public_mindmaps').select('*').eq('id', mapId).single();
  return data;
}

// ── Admin Activity Log ─────────────────────────────────────────────────────

export async function logActivity(supabase: SupabaseClient, entry: Record<string, any>) {
  await supabase.from('admin_activity_log').insert({
    ...entry,
    timestamp: entry.timestamp || new Date().toISOString(),
  });
}

export async function incrementAdminStat(supabase: SupabaseClient, field: string, value: number = 1) {
  await supabase.rpc('increment_stat', { stat_field: field, increment_by: value });
}
