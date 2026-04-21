'use server';

import { categorizeMindMap } from '@/ai/flows/categorize-mind-map';
import { AIProvider } from '@/ai/client-dispatcher';
import { suggestRelatedTopics } from '@/ai/flows/suggest-related-topics';
import { resolveApiKey } from '@/app/actions';
import { awardPoints } from '@/lib/points-engine';
import { getSupabaseAdmin, isUserAdminServer, logActivityAdmin } from '@/lib/supabase-server';

export async function categorizeMindMapAction(
  input: { topic: string; summary?: string },
  options: { provider?: AIProvider; apiKey?: string; userId?: string } = {}
) {
  try {
    const effectiveApiKey = await resolveApiKey(options);
    const result = await categorizeMindMap({ topic: input.topic, summary: input.summary, ...options, apiKey: effectiveApiKey });
    return { categories: result.categories, error: null };
  } catch (error: any) {
    return { categories: [], error: error.message || 'Failed to categorize mind map.' };
  }
}

export async function suggestRelatedTopicsAction(
  input: { topic: string; summary?: string },
  options: { provider?: AIProvider; apiKey?: string; userId?: string } = {}
) {
  try {
    const effectiveApiKey = await resolveApiKey(options);
    const result = await suggestRelatedTopics({ topic: input.topic, summary: input.summary, ...options, apiKey: effectiveApiKey });
    if (!result.topics || result.topics.length === 0) {
      return { topics: [`Niche applications of ${input.topic}`, `The psychological impact of ${input.topic}`, `Interdisciplinary connections: ${input.topic}`, `Controversial debates surrounding ${input.topic}`], error: null };
    }
    return { topics: result.topics, error: null };
  } catch (error: any) {
    return { topics: [`Exploring ${input.topic} further`, `Deep dive: ${input.topic}`, `Historical context of ${input.topic}`], error: error.message };
  }
}

export async function removeFromCommunityAction(mapId: string, userId: string): Promise<{ success: boolean; error: string | null }> {
  try {
    if (!userId || !mapId) return { success: false, error: 'Map ID and user ID are required' };

    const supabase = getSupabaseAdmin();
    const { data: mapData, error } = await supabase.from('public_mindmaps').select('*').eq('id', mapId).single();
    if (error || !mapData) return { success: false, error: 'Map not found in community' };

    const isAuthor = mapData.original_author_id === userId;
    const isAdmin = await isUserAdminServer(userId);
    if (!isAuthor && !isAdmin) return { success: false, error: 'Unauthorized' };

    await supabase.from('public_mindmaps').delete().eq('id', mapId);

    if (isAuthor) {
      await supabase.from('mindmaps').update({ is_public: false, updated_at: new Date().toISOString() }).eq('id', mapId).eq('user_id', userId);
    }

    await logActivityAdmin({ type: 'MAP_REMOVED', targetId: mapId, targetType: 'mindmap', details: `Map "${mapData.topic || 'Untitled'}" removed from community`, performedBy: userId });

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error removing map from community:', error);
    return { success: false, error: error.message || 'Failed to remove map' };
  }
}

export async function publishMindMapAction(mapId: string, publicData: any, userId: string): Promise<{ success: boolean; error: string | null }> {
  try {
    if (!userId || !mapId || !publicData) return { success: false, error: 'Map ID, data, and user ID are required' };

    const supabase = getSupabaseAdmin();
    const targetAuthorId = publicData.originalAuthorId || userId;
    const isAuthor = targetAuthorId === userId;
    const isAdmin = await isUserAdminServer(userId);
    if (!isAuthor && !isAdmin) return { success: false, error: 'Unauthorized' };

    // Update original map
    await supabase.from('mindmaps').update({ is_public: true, updated_at: new Date().toISOString() }).eq('id', mapId).eq('user_id', targetAuthorId);

    // Save to public_mindmaps
    await supabase.from('public_mindmaps').upsert({
      id: mapId,
      original_author_id: targetAuthorId,
      author_name: publicData.authorName || 'Anonymous',
      topic: publicData.topic,
      summary: publicData.summary,
      public_categories: publicData.publicCategories || [],
      is_public: true,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    awardPoints(userId, 'MAP_PUBLISHED', { mapId, topic: publicData.topic }).catch(() => {});
    await logActivityAdmin({ type: 'MAP_PUBLISHED', targetId: mapId, targetType: 'mindmap', details: `Map "${publicData.topic || 'Untitled'}" published`, performedBy: userId });

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error publishing map:', error);
    return { success: false, error: error.message || 'Failed to publish map' };
  }
}

export async function checkIsAdminAction(userId: string): Promise<{ isAdmin: boolean }> {
  if (!userId) return { isAdmin: false };
  return { isAdmin: await isUserAdminServer(userId) };
}
