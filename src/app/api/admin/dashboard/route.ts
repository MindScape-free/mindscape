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

    const { authorized, uid, error } = await verifyAdmin(request);
    const supabase = getSupabaseAdmin();
    console.log(`📊 [DashboardAPI] Fetching unified analytics`);

    // 1. Fetch the "Single Sheet" Analytics via RPC
    const { data: analyticsResult, error: analyticsError } = await supabase.rpc('refresh_platform_analytics');
    
    // 2. Fetch the persisted stats (Heatmap, etc.) from admin_stats
    const { data: statsData } = await supabase.from('admin_stats').select('data').eq('id', 'global').single();
    
    // 3. Merge: Persistent data (heatmap) + Fresh data (RPC totals)
    let analytics = {
      ...(statsData?.data || {}),
      ...(analyticsResult || {})
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
    const mapAnalyticsSource = analytics?.map_analytics || analytics?.mapAnalytics || {};
    const ai = analytics?.ai_performance || {};
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

    const response = {
      stats: {
        totalUsers: platform.total_users ?? 0,
        totalMindmaps: platform.active_root_maps ?? 0,
        totalChats: platform.total_chats ?? 0,
        totalNodes: platform.global_nodes ?? platform.active_nodes ?? 0,
        totalNodesActive: platform.active_nodes ?? 0,
        totalImages: platform.total_images ?? 0,
        activeUsers: platform.active_users ?? platform.active_users_24h ?? 0,
        healthScore: analytics.health_score ?? 100,
        timestamp: new Date().toISOString(),
        lastUpdated: Date.now()
      },
      // Field mappings for frontend
      activeUsers24h: platform.active_users ?? platform.active_users_24h ?? 0,
      totalMindmapsEver: platform.total_mindmaps_ever ?? platform.total_maps_ever ?? 0,
      engagementRate: analytics.engagement_rate ?? (platform.total_users > 0 ? (platform.active_users_24h / platform.total_users) * 100 : 0),
      avgMapsPerUser: analytics.avg_maps_per_user ?? (platform.total_users > 0 ? (platform.total_maps_ever / platform.total_users) : 0),
      avgChatsPerUser: analytics.avg_chats_per_user ?? (platform.total_users > 0 ? (platform.total_chats / platform.total_users) : 0),
      latestUsers: bundleUsers.slice(0, 10),
      topUsers: bundleUsers.sort((a, b) => (b.statistics?.totalMapsCreated || 0) - (a.statistics?.totalMapsCreated || 0)).slice(0, 10),
      mapAnalytics: { 
        ...DEFAULT_MAP_ANALYTICS, 
        totalAnalyzed: mapAnalyticsSource.totalAnalyzed ?? mapAnalyticsSource.total_analyzed ?? platform.active_root_maps ?? 0,
        avgNodesPerMap: (platform.active_root_maps > 0) 
          ? (platform.global_nodes / platform.active_root_maps) 
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
      heatmapDays: analytics?.heatmap_days || [], 
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
        source: 'rpc_single_sheet'
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
