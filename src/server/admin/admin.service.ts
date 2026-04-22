import { getSupabaseAdmin } from '@/lib/supabase-server';

export interface AdminStats {
  totalCreated: number;
  activeCount: number;
  deletedCount: number;
  publicCount: number;
  privateCount: number;
  totalNodes: number;
  lastUpdatedAt: number;
}

export interface MindmapListItem {
  id: string;
  userId: string;
  title: string;
  summary?: string;
  mode: string;
  depth: string;
  isPublic: boolean;
  isDeleted: boolean;
  nodeCount: number;
  views: number;
  createdAt: number;
  updatedAt: number;
  sourceType?: string;
  persona?: string;
}

function sanitizeTimestamp(value: any): number {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? 0 : date.getTime();
  }
  // Handle case where it might be a Supabase/Postgres timestamp object or number
  return 0;
}

export async function getAdminStats(): Promise<AdminStats> {
  const supabase = getSupabaseAdmin();
  
  if (!supabase) {
    throw new Error('Supabase not initialized');
  }

  try {
    // Implement efficient stats using Supabase queries
    const { count: total, error: totalErr } = await supabase
      .from('mindmaps')
      .select('*', { count: 'exact', head: true });

    const { count: deleted, error: deletedErr } = await supabase
      .from('mindmaps')
      .select('*', { count: 'exact', head: true })
      .or('is_deleted.eq.true,deleted.eq.true');

    const { count: publicCount, error: publicErr } = await supabase
      .from('mindmaps')
      .select('*', { count: 'exact', head: true })
      .eq('is_public', true)
      .not('is_deleted', 'eq', true)
      .not('deleted', 'eq', true);

    const { data: nodesData, error: nodesErr } = await supabase
      .from('mindmaps')
      .select('node_count')
      .not('is_deleted', 'eq', true)
      .not('deleted', 'eq', true);

    if (totalErr || deletedErr || publicErr || nodesErr) {
      throw totalErr || deletedErr || publicErr || nodesErr;
    }

    const totalNodes = (nodesData || []).reduce((acc, curr) => acc + (curr.node_count || 0), 0);
    const totalCreated = total || 0;
    const deletedCount = deleted || 0;
    const activeCount = totalCreated - deletedCount;
    const pubCount = publicCount || 0;
    const priCount = activeCount - pubCount;

    return {
      totalCreated,
      activeCount,
      deletedCount,
      publicCount: pubCount,
      privateCount: priCount,
      totalNodes,
      lastUpdatedAt: Date.now(),
    };
  } catch (error: any) {
    console.error('[AdminService] getAdminStats failed:', error.message);
    return {
      totalCreated: 0,
      activeCount: 0,
      deletedCount: 0,
      publicCount: 0,
      privateCount: 0,
      totalNodes: 0,
      lastUpdatedAt: Date.now(),
    };
  }
}

export async function getMindmapsList(options: {
  limit?: number;
  offset?: number;
  filterDeleted?: boolean;
} = {}): Promise<{
  data: MindmapListItem[];
  total: number;
  hasMore: boolean;
}> {
  const supabase = getSupabaseAdmin();
  
  if (!supabase) {
    throw new Error('Supabase not initialized');
  }

  const { limit = 20, offset = 0, filterDeleted = true } = options;

  let query = supabase
    .from('mindmaps')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filterDeleted) {
    query = query.not('is_deleted', 'eq', true).not('deleted', 'eq', true);
  }

  const { data: rows, count, error } = await query;

  if (error) {
    console.error('[AdminService] getMindmapsList failed:', error.message);
    return { data: [], total: 0, hasMore: false };
  }

  const data: MindmapListItem[] = (rows || []).map(mapData => ({
    id: mapData.id,
    userId: mapData.user_id || 'unknown',
    title: mapData.title || mapData.topic || mapData.short_title || 'Untitled',
    summary: mapData.summary || '',
    mode: mapData.mode || 'single',
    depth: mapData.depth || 'medium',
    isPublic: mapData.is_public === true,
    isDeleted: mapData.is_deleted === true || mapData.deleted === true,
    nodeCount: mapData.node_count || 0,
    views: mapData.public_views || mapData.views || 0,
    createdAt: sanitizeTimestamp(mapData.created_at),
    updatedAt: sanitizeTimestamp(mapData.updated_at),
    sourceType: mapData.source_type || mapData.source_file_type,
    persona: mapData.ai_persona || mapData.persona,
  }));

  const total = count || 0;
  const hasMore = offset + data.length < total;

  return { data, total, hasMore };
}

export async function getMindmapsByUser(userId: string, options: {
  limit?: number;
  includeDeleted?: boolean;
} = {}): Promise<MindmapListItem[]> {
  const supabase = getSupabaseAdmin();
  
  if (!supabase) {
    throw new Error('Supabase not initialized');
  }

  const { limit = 100, includeDeleted = false } = options;

  let query = supabase
    .from('mindmaps')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!includeDeleted) {
    query = query.not('is_deleted', 'eq', true).not('deleted', 'eq', true);
  }

  const { data: rows, error } = await query;

  if (error) {
    console.error('[AdminService] getMindmapsByUser failed:', error.message);
    return [];
  }

  return (rows || []).map(mapData => ({
    id: mapData.id,
    userId,
    title: mapData.title || mapData.topic || mapData.short_title || 'Untitled',
    summary: mapData.summary || '',
    mode: mapData.mode || 'single',
    depth: mapData.depth || 'medium',
    isPublic: mapData.is_public === true,
    isDeleted: mapData.is_deleted === true || mapData.deleted === true,
    nodeCount: mapData.node_count || 0,
    views: mapData.public_views || mapData.views || 0,
    createdAt: sanitizeTimestamp(mapData.created_at),
    updatedAt: sanitizeTimestamp(mapData.updated_at),
    sourceType: mapData.source_type || mapData.source_file_type,
    persona: mapData.ai_persona || mapData.persona,
  }));
}
