import { NextResponse } from 'next/server';
import { getSupabaseAdmin, isUserAdminServer } from '@/lib/supabase-server';
import { DEFAULT_MAP_ANALYTICS } from '@/types/admin';
import { mapUserRow } from '@/lib/map-mappers';

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

export async function GET(request: Request) {
  try {
    const authCheck = await verifyAdmin(request);
    if (!authCheck.authorized) {
      console.warn(`🚫 [DashboardAPI] Unauthorized access attempt from UID: ${authCheck.uid || 'unknown'}`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const supabase = getSupabaseAdmin();
    console.log(`📊 [DashboardAPI] Fetching unified analytics`);

    // 1. Fetch platform_stats (single source of truth — admin_stats is deprecated)
    const { data: platformRow } = await supabase
      .from('platform_stats')
      .select('*')
      .eq('id', 'global')
      .single();

    // 2. Build analytics from platform_stats (canonical source) with defaults
    let analytics = {
      platform: {
        total_users: platformRow?.total_users ?? 0,
        total_maps: platformRow?.total_maps ?? 0,
        total_maps_ever: platformRow?.total_maps_ever ?? 0,
        total_chats: platformRow?.total_chats ?? 0,
        total_nodes: platformRow?.total_nodes ?? 0,
        total_images: platformRow?.total_images ?? 0,
        new_users_24h: platformRow?.new_users_24h ?? 0,
        new_maps_24h: platformRow?.new_maps_24h ?? 0,
        active_users_24h: platformRow?.active_users_24h ?? 0,
        active_users_7d: platformRow?.active_users_7d ?? 0,
        new_users_7d: platformRow?.new_users_7d ?? 0,
        new_maps_7d: platformRow?.new_maps_7d ?? 0,
        health_score: platformRow?.health_score ?? 100,
        engagement_rate: platformRow?.engagement_rate ?? 0,
        avg_maps_per_user: platformRow?.avg_maps_per_user ?? 0,
        avg_nodes_per_map: platformRow?.avg_nodes_per_map ?? 0,
        daily_snapshot: platformRow?.daily_snapshot ?? [],
      },
    };

    const { data: usersResult } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    const { data: logsResult } = await supabase.from('admin_activity_log').select('*').order('timestamp', { ascending: false }).limit(50);
    const { data: feedbackResult } = await supabase.from('feedback').select('*').order('created_at', { ascending: false }).limit(20);
    
    // Safe fetch for telemetry
    const { data: aiCallsResult } = await supabase.from('ai_calls')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    const processedAiCalls = (aiCallsResult || []).map(call => ({
      ...call,
      mapTitle: call.prompt || 'Neural Stream'
    }));

    const platform = analytics?.platform || {};
    // map_analytics and ai_performance were previously in admin_stats (deprecated)
    // they now use empty defaults — the response builder handles fallbacks below
    const mapAnalyticsSource = {} as Record<string, any>;
    const ai = {} as Record<string, any>;
    const bundleUsers = (usersResult || []).map(mapUserRow);
    const bundleLogs = (logsResult || []).map(l => ({
      ...l,
      createdAt: l.timestamp,
      performedBy: l.performed_by,
      targetId: l.target_id,
      targetType: l.target_type,
      performedByEmail: l.performed_by_email
    }));
    const bundleFeedback = (feedbackResult || []).map(f => ({
      ...f,
      createdAt: f.created_at,
      userId: f.user_id,
    }));

    // Compute active and historical node counts directly (including sub-maps)
    let activeNodesCount = 0;
    let historicalNodesCount = 0;
    try {
      const { data: mmNodes } = await supabase
        .from('mindmaps')
        .select('node_count');
      activeNodesCount = (mmNodes || []).reduce((acc: number, m: any) => acc + (m.node_count || 0), 0);

      const { data: createEvents } = await supabase
        .from('user_events')
        .select('event_data')
        .eq('event_type', 'map_created');
      historicalNodesCount = (createEvents || []).reduce((acc: number, e: any) => {
        const count = e.event_data?.nodeCount ?? e.event_data?.node_count ?? 0;
        return acc + Number(count);
      }, 0);
    } catch (err) {
      console.error('[DashboardAPI] Node counts calculation failed:', err);
    }

    const response = {
      stats: {
        totalUsers: platform.total_users ?? 0,
        totalMindmaps: platform.total_maps ?? 0,
        totalChats: platform.total_chats ?? 0,
        totalNodes: (historicalNodesCount || platform.total_nodes) ?? 0,
        totalNodesActive: (activeNodesCount || platform.total_nodes) ?? 0,
        totalImages: platform.total_images ?? 0,
        activeUsers: platform.active_users_24h ?? 0,
        healthScore: platform.health_score ?? 100,
        timestamp: new Date().toISOString(),
        lastUpdated: Date.now()
      },
      // Field mappings for frontend
      activeUsers24h: platform.active_users_24h ?? 0,
      totalMindmapsEver: platform.total_maps_ever ?? platform.total_maps ?? 0,
      engagementRate: platform.engagement_rate ?? (platform.total_users > 0 ? (platform.active_users_24h / platform.total_users) * 100 : 0),
      avgMapsPerUser: platform.avg_maps_per_user ?? (platform.total_users > 0 ? (platform.total_maps_ever / platform.total_users) : 0),
      avgChatsPerUser: platform.total_users > 0 ? (platform.total_chats / platform.total_users) : 0,
      latestUsers: bundleUsers.slice(0, 10),
      topUsers: bundleUsers.sort((a: any, b: any) => (b.statistics?.totalMapsCreated || 0) - (a.statistics?.totalMapsCreated || 0)).slice(0, 10),
      mapAnalytics: { 
        ...DEFAULT_MAP_ANALYTICS, 
        totalAnalyzed: mapAnalyticsSource.totalAnalyzed ?? mapAnalyticsSource.total_analyzed ?? platform.total_maps ?? 0,
        avgNodesPerMap: (platform.total_maps > 0) 
          ? (platform.total_nodes / platform.total_maps) 
          : 0,
        modeCounts: mapAnalyticsSource.modeCounts ?? mapAnalyticsSource.mode_counts ?? {},
        sourceCounts: mapAnalyticsSource.sourceCounts ?? mapAnalyticsSource.source_counts ?? {},
        personaCounts: mapAnalyticsSource.personaCounts ?? mapAnalyticsSource.persona_counts ?? {},
        depthCounts: mapAnalyticsSource.depthCounts ?? mapAnalyticsSource.depth_counts ?? {},
        subMapStats: {
          total: mapAnalyticsSource.subMapStats?.total ?? mapAnalyticsSource.sub_map_stats?.total ?? 0,
          parents: mapAnalyticsSource.subMapStats?.parents ?? mapAnalyticsSource.sub_map_stats?.parents ?? 0,
          avgPerParent: mapAnalyticsSource.subMapStats?.avgPerParent ?? mapAnalyticsSource.sub_map_stats?.avg_per_parent ?? 0,
        },
        publicPrivate: mapAnalyticsSource.publicPrivate ?? mapAnalyticsSource.public_private ?? { public: 0, private: 0 }
      },
      heatmapDays: [], // admin_stats (heatmap source) is deprecated
      bundle: {
        users: bundleUsers,
        logs: bundleLogs || [],
        feedback: bundleFeedback || [],
        aiCalls: processedAiCalls,
        serverTime: new Date().toISOString(),
        isIncremental: false
      },
      meta: {
        cached: false,
        source: 'platform_stats'
      }
    };

    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'no-store' },
    });

  } catch (error: any) {
    console.error('❌ [DashboardAPI] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch admin data' }, { status: 500 });
  }
}
