import { NextResponse } from 'next/server';
import { getSupabaseAdmin, isUserAdminServer } from '@/lib/supabase-server';
import { DEFAULT_MAP_ANALYTICS } from '@/types/admin';

async function verifyAdmin(request: Request): Promise<{ authorized: boolean; uid?: string; error?: string }> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return { authorized: false, error: 'Missing or invalid Authorization header' };
    }

    const idToken = authHeader.substring(7);
    const supabase = getSupabaseAdmin();
    
    // Verify the user via their access token
    const { data: { user }, error: authError } = await supabase.auth.getUser(idToken);
    
    if (authError || !user) {
      return { authorized: false, error: authError?.message || 'Token verification failed' };
    }

    const isAdmin = await isUserAdminServer(user.id);
    if (!isAdmin) {
      return { authorized: false, uid: user.id, error: 'Unauthorized: Not an admin' };
    }

    return { authorized: true, uid: user.id };
  } catch (error: any) {
    console.error('RBAC verification failed:', error.message);
    return { authorized: false, error: error.message || 'Token verification failed' };
  }
}

function safeMapAnalytics(data?: any): typeof DEFAULT_MAP_ANALYTICS {
  if (!data) return { ...DEFAULT_MAP_ANALYTICS };
  return {
    totalAnalyzed: data.total_analyzed ?? data.totalAnalyzed ?? 0,
    modeCounts: {
      single: data.mode_counts?.single ?? data.modeCounts?.single ?? 0,
      compare: data.mode_counts?.compare ?? data.modeCounts?.compare ?? 0,
      multi: data.mode_counts?.multi ?? data.modeCounts?.multi ?? 0,
    },
    depthCounts: {
      low: data.depth_counts?.low ?? data.depthCounts?.low ?? 0,
      medium: data.depth_counts?.medium ?? data.depthCounts?.medium ?? 0,
      deep: data.depth_counts?.deep ?? data.depthCounts?.deep ?? 0,
      unspecified: data.depth_counts?.unspecified ?? data.depthCounts?.unspecified ?? 0,
    },
    sourceCounts: data.source_counts || data.sourceCounts || {},
    personaCounts: data.persona_counts || data.personaCounts || {},
    subMapStats: {
      total: data.sub_map_stats?.total ?? data.subMapStats?.total ?? 0,
      parents: data.sub_map_stats?.parents ?? data.subMapStats?.parents ?? 0,
      avgPerParent: data.sub_map_stats?.avg_per_parent ?? data.subMapStats?.avgPerParent ?? 0,
    },
    publicPrivate: {
      public: data.public_private?.public ?? data.publicPrivate?.public ?? 0,
      private: data.public_private?.private ?? data.publicPrivate?.private ?? 0,
    },
    avgNodesPerMap: data.avg_nodes_per_map ?? data.avgNodesPerMap ?? 0,
    featuredCount: data.featured_count ?? data.featuredCount ?? 0,
    topPersona: data.top_persona ?? data.topPersona ?? 'N/A',
    userStats: data.user_stats || data.userStats || [],
  };
}

export async function GET(request: Request) {
  try {
    const authCheck = await verifyAdmin(request);
    if (!authCheck.authorized) {
      console.warn(`🚫 [DashboardAPI] Unauthorized access attempt from UID: ${authCheck.uid || 'unknown'}`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const url = new URL(request.url);
    const since = url.searchParams.get('since') || undefined;

    const supabase = getSupabaseAdmin();
    console.log(`📊 [DashboardAPI] Fetching stats from Supabase ${since ? ` (since ${since})` : ''}`);

    const [statsResult, usersResult, logsResult, feedbackResult] = await Promise.all([
      supabase.from('admin_stats').select('*').eq('period', 'all-time').single(),
      since 
        ? supabase.from('users').select('*').gte('created_at', since).order('created_at', { ascending: false })
        : supabase.from('users').select('*').order('created_at', { ascending: false }).limit(500),
      since
        ? supabase.from('admin_activity_log').select('*').gte('timestamp', since).order('timestamp', { ascending: false })
        : supabase.from('admin_activity_log').select('*').order('timestamp', { ascending: false }).limit(100),
      supabase.from('feedback').select('*').order('created_at', { ascending: false }).limit(200)
    ]);

    const data = statsResult.data || {};
    
    // Map snake_case to camelCase for the bundle
    const bundleUsers = (usersResult.data || []).map(u => ({
      ...u,
      createdAt: u.created_at,
      displayName: u.display_name,
      photoURL: u.photo_url,
      lastActive: u.last_active,
      statistics: u.statistics
    }));

    const bundleLogs = (logsResult.data || []).map(l => ({
      ...l,
      performedBy: l.performed_by,
      targetId: l.target_id,
      targetType: l.target_type,
      performedByEmail: l.performed_by_email
    }));

    const bundleFeedback = (feedbackResult.data || []).map(f => ({
      ...f,
      createdAt: f.created_at,
      updatedAt: f.updated_at,
      userId: f.user_id,
      userName: f.user_name,
      userEmail: f.user_email,
      trackingId: f.tracking_id,
      affectedArea: f.affected_area,
      adminNotes: f.admin_notes,
      adminActivityLogs: f.admin_activity_logs
    }));

    // Map heatmap_days to heatmapDays
    const heatmapDays = (data.heatmap_days || []).map((day: any) => ({
      date: day.date,
      newUsers: day.newUsers || day.new_users || 0,
      newMaps: day.newMaps || day.new_maps || 0,
      newSubMaps: day.newSubMaps || day.new_sub_maps || 0,
      activeUsers: day.activeUsers || day.active_users || 0,
      publicMaps: day.publicMaps || day.public_maps || 0,
      privateMaps: day.privateMaps || day.private_maps || 0,
      totalActions: day.totalActions || day.total_actions || 0,
    }));

    const response = {
      ...data,
      stats: {
        totalUsers: data?.total_users ?? 0,
        totalMaps: data?.total_public_maps ?? data?.total_maps ?? 0,
        totalMindmaps: data?.total_mindmaps ?? 0,
        totalMindmapsEver: data?.total_mindmaps_ever ?? 0,
        totalChats: data?.total_chats ?? 0,
        activeUsers: data?.active_users_24h ?? data?.active_users ?? 0,
        healthScore: data?.health_score ?? 0,
        lastUpdated: data?.last_updated ?? null,
        timestamp: data?.timestamp ?? null,
      },
      // Frontend expects camelCase keys in safeMapAnalytics
      mapAnalytics: safeMapAnalytics(data?.map_analytics || data),
      heatmapDays: heatmapDays, // For the heatmap component
      bundle: {
        users: bundleUsers,
        logs: bundleLogs,
        feedback: bundleFeedback,
        serverTime: new Date().toISOString(),
        isIncremental: !!since,
      },
      meta: {
        cached: false,
        cacheAge: null,
        source: 'supabase',
      },
    };

    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'no-store' },
    });

  } catch (error: any) {
    console.error('❌ [DashboardAPI] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch admin data' }, { status: 500 });
  }
}
