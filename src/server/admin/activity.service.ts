import { getSupabaseAdmin } from '@/lib/supabase-server';

export interface ActivityLogEntry {
  type: string;
  userId?: string;
  userEmail?: string;
  performedBy?: string;
  targetType?: string;
  targetId?: string;
  details?: string;
  metadata?: Record<string, any>;
  timestamp?: string;
}

export async function logAdminActivity(entry: ActivityLogEntry): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    console.error('[ActivityService] Supabase Admin not available');
    return { success: false, error: 'Supabase Admin not initialized' };
  }

  try {
    const timestamp = entry.timestamp || new Date().toISOString();

    // 1. Log the activity with snake_case mapping
    const { error: logError } = await supabase.from('admin_activity_log').insert({
      type: entry.type,
      user_id: entry.userId,
      user_email: entry.userEmail,
      performed_by: entry.performedBy,
      target_type: entry.targetType,
      target_id: entry.targetId,
      details: entry.details,
      metadata: entry.metadata || {},
      timestamp,
    });

    if (logError) throw logError;

    // admin_stats updates are deprecated — metrics are now computed from
    // user_profiles/events via recompute_platform_stats().

    return { success: true };
  } catch (error: any) {
    console.error('[ActivityService] Error logicAdminActivity:', error);
    return { success: false, error: error.message };
  }
}

export async function getActivityLogs(options: {
  limit?: number;
  offset?: number;
  type?: string;
  userId?: string;
} = {}): Promise<{ logs: any[]; total: number; hasMore: boolean }> {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return { logs: [], total: 0, hasMore: false };
  }

  const { limit = 50, offset = 0, type, userId } = options;

  let query = supabase
    .from('admin_activity_log')
    .select('*', { count: 'exact' })
    .order('timestamp', { ascending: false })
    .range(offset, offset + limit - 1);

  if (type && type !== 'all') {
    query = query.eq('type', type);
  }

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error('[ActivityService] Error fetching logs:', error.message);
    return { logs: [], total: 0, hasMore: false };
  }

  const logs = (data || []).map(row => ({
    ...row,
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_email,
    performedBy: row.performed_by,
    targetType: row.target_type,
    targetId: row.target_id,
  }));

  const total = count || 0;
  const hasMore = offset + logs.length < total;

  return { logs, total, hasMore };
}
