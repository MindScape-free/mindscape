import { NextResponse } from 'next/server';
import { getSupabaseAdmin, isUserAdminServer } from '@/lib/supabase-server';
import { format, subHours, subDays } from 'date-fns';
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

let lastSyncTime = 0;
const MIN_SYNC_INTERVAL_MS = 60 * 1000; // 1 minute minimum between syncs

function buildEmptyAnalytics() {
  return {
    total_analyzed: 0,
    mode_counts: { single: 0, compare: 0, multi: 0 },
    depth_counts: { low: 0, medium: 0, deep: 0, unspecified: 0 },
    source_counts: {} as Record<string, number>,
    persona_counts: {} as Record<string, number>,
    sub_map_stats: { total: 0, parents: 0, avg_per_parent: 0 },
    public_private: { public: 0, private: 0 },
    avg_nodes_per_map: 0,
    featured_count: 0,
    top_persona: 'N/A',
    user_stats: [] as any[],
  };
}

function processMapsForAnalytics(maps: any[]) {
  const analytics = buildEmptyAnalytics();
  let totalNodes = 0;

  // Track parent IDs that actually have children in this set
  const parentIds = new Set<string>();
  maps.forEach(m => {
    if (m.parent_map_id) parentIds.add(m.parent_map_id);
  });
  analytics.sub_map_stats.parents = parentIds.size;

  maps.forEach((data: any) => {
    const isSubMap = data.is_sub_map === true || !!data.parent_map_id;

    if (!isSubMap) {
      analytics.total_analyzed++;
      totalNodes += data.node_count || 0;

      // Mode
      const isMulti =
        data.mode === 'multi' ||
        data.source_file_type === 'multi' ||
        (data.source_file_content && data.source_file_content.includes('--- SOURCE:'));
      if (isMulti) analytics.mode_counts.multi++;
      else if (data.mode === 'compare') analytics.mode_counts.compare++;
      else analytics.mode_counts.single++;

      // Depth
      const rawDepth = data.depth || 'unspecified';
      let depth: 'low' | 'medium' | 'deep' | 'unspecified' = 'unspecified';
      if (rawDepth === 'low' || rawDepth === 'quick') depth = 'low';
      else if (rawDepth === 'medium' || rawDepth === 'balanced') depth = 'medium';
      else if (rawDepth === 'deep' || rawDepth === 'detailed') depth = 'deep';
      analytics.depth_counts[depth]++;

      // Source
      const source = data.source_file_type || data.source_type || (data.source_url ? 'website' : 'text');
      analytics.source_counts[source] = (analytics.source_counts[source] || 0) + 1;

      // Public/Private
      if (data.is_public) analytics.public_private.public++;
      else analytics.public_private.private++;

      // Persona
      const raw = (data.ai_persona || '').toLowerCase().trim();
      let persona = 'Teacher';
      if (raw === 'concise') persona = 'Concise';
      else if (raw === 'creative') persona = 'Creative';
      else if (raw.includes('sage')) persona = 'Sage';
      analytics.persona_counts[persona] = (analytics.persona_counts[persona] || 0) + 1;
    } else {
      // Sub-map logic
      analytics.sub_map_stats.total++;
    }

    if (data.is_featured) analytics.featured_count++;
  });

  analytics.avg_nodes_per_map =
    analytics.total_analyzed > 0
      ? Math.round((totalNodes / analytics.total_analyzed) * 10) / 10
      : 0;

  analytics.sub_map_stats.avg_per_parent =
    analytics.sub_map_stats.parents > 0
      ? Math.round((analytics.sub_map_stats.total / analytics.sub_map_stats.parents) * 10) / 10
      : 0;

  let topPersona = 'N/A';
  let topCount = 0;
  Object.entries(analytics.persona_counts).forEach(([key, value]) => {
    if ((value as number) > topCount) {
      topCount = value as number;
      topPersona = key;
    }
  });
  analytics.top_persona = topPersona;

  return analytics;
}

export async function POST(request: Request) {
  const authCheck = await verifyAdmin(request);
  if (!authCheck.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const nowMs = Date.now();
  if (lastSyncTime > 0 && nowMs - lastSyncTime < MIN_SYNC_INTERVAL_MS) {
    const waitTime = Math.ceil((MIN_SYNC_INTERVAL_MS - (nowMs - lastSyncTime)) / 1000);
    return NextResponse.json({ error: `Rate limited. Wait ${waitTime}s.` }, { status: 429 });
  }

  const now = new Date();
  const timestamp = now.toISOString();
  const supabase = getSupabaseAdmin();

  const heatmapRange = [...Array(31)].map((_, i) => format(subDays(now, 30 - i), 'yyyy-MM-dd'));
  const heatmapMap = new Map(
    heatmapRange.map(date => [
      date,
      { date, newUsers: 0, newMaps: 0, newSubMaps: 0, activeUsers: 0, publicMaps: 0, privateMaps: 0, totalActions: 0 },
    ])
  );

  try {
    console.log('📊 [AdminSync] Fetching all collections from Supabase...');

    const [usersRes, mapsRes, logsRes, metricsRes, aiCallsRes] = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('mindmaps').select('*'),
      supabase.from('admin_activity_log').select('*').gte('timestamp', subDays(now, 31).toISOString()),
      supabase.from('platform_metrics_view').select('*').single(),
      supabase.from('ai_calls').select('*').order('created_at', { ascending: false }).limit(200)
    ]);

    if (usersRes.error) throw usersRes.error;
    if (mapsRes.error) throw mapsRes.error;
    if (logsRes.error) throw logsRes.error;

    const users = usersRes.data;
    const allMaps = mapsRes.data;
    const logs = logsRes.data;
    const metrics = metricsRes.data?.data || {};
    const aiCalls = aiCallsRes.data || [];
    const platformMetrics = metrics.platform || {};

    let totalUsers = users.length;
    let activeUsers24h = 0;
    let newUsers24h = 0;
    let newUsersPrevious24h = 0;
    let totalMindmapsEver = platformMetrics.total_maps_ever || 0;
    let totalChats = platformMetrics.total_chats || 0;
    let totalImages = metrics.total_images || 0;
    let totalPublicMaps = allMaps.filter(m => m.is_public).length;

    // --- Process Users ---
    users.forEach(data => {
      const createdAt = new Date(data.created_at || 0);
      const lastActiveAtStr = data.last_active || data.statistics?.lastActiveDate;
      const lastActiveAt = lastActiveAtStr ? new Date(lastActiveAtStr) : null;

      if (createdAt.getTime() > 0) {
        const dateKey = format(createdAt, 'yyyy-MM-dd');
        if (heatmapMap.has(dateKey)) heatmapMap.get(dateKey)!.newUsers++;
        
        if (createdAt >= subHours(now, 24)) newUsers24h++;
        else if (createdAt >= subHours(now, 48)) newUsersPrevious24h++;
      }

      if (lastActiveAt && lastActiveAt >= subHours(now, 24)) {
        activeUsers24h++;
        const activeKey = format(lastActiveAt, 'yyyy-MM-dd');
        if (heatmapMap.has(activeKey)) heatmapMap.get(activeKey)!.activeUsers++;
      }

      totalImages += data.statistics?.totalImagesGenerated || 0;
    });

    // --- Process Logs ---
    logs.forEach(log => {
      const dateKey = (log.timestamp || '').split('T')[0];
      if (heatmapMap.has(dateKey)) heatmapMap.get(dateKey)!.totalActions++;
    });

    // --- Process Maps ---
    let totalMindmaps = 0;
    let totalSubMaps = 0;
    let newMaps24h = 0;
    let newMapsPrevious24h = 0;
    let totalNodes = platformMetrics.global_nodes || 0;
    let totalNodesActive = 0;

    allMaps.forEach(data => {
      const isSubMap = data.is_sub_map === true || !!data.parent_map_id;
      const nodes = data.node_count || 0;
      
      if (!isSubMap) {
        totalMindmaps++;
        totalNodesActive += nodes;
      } else {
        totalSubMaps++;
      }

      const mapDate = new Date(data.created_at || 0);
      if (mapDate.getTime() > 0) {
        const dateKey = format(mapDate, 'yyyy-MM-dd');
        if (heatmapMap.has(dateKey)) {
          const day = heatmapMap.get(dateKey)!;
          day.newMaps++;
          if (isSubMap) day.newSubMaps++;
          if (data.is_public) day.publicMaps++;
          else day.privateMaps++;
        }

        if (mapDate >= subHours(now, 24)) {
          if (!isSubMap) newMaps24h++;
        } else if (mapDate >= subHours(now, 48)) {
          if (!isSubMap) newMapsPrevious24h++;
        }
      }
    });

    const mapAnalytics = processMapsForAnalytics(allMaps);

    const engagementRate = totalUsers > 0 ? (activeUsers24h / totalUsers) * 100 : 0;
    const healthScore = Math.round(
      Math.min(50, (engagementRate / 20) * 50) +
      Math.min(50, ((totalMindmapsEver / (totalUsers || 1)) / 1.5) * 50)
    );

    const serializeUser = (u: any) => mapUserRow(u);

    const latestUsers = [...users]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map(serializeUser);

    const topUsers = [...users]
      .sort((a, b) => (b.statistics?.totalMapsCreated || 0) - (a.statistics?.totalMapsCreated || 0))
      .slice(0, 20)
      .map(serializeUser);

    const latestMaps = allMaps
      .filter(m => m.is_public)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map(m => ({
        id: m.id,
        topic: m.topic || m.title || null,
        is_public: m.is_public,
        node_count: m.node_count || 0,
        public_views: m.public_views || 0,
        created_at: m.created_at,
      }));

    const docPayload = {
      period: 'all-time',
      total_users: totalUsers,
      total_mindmaps: totalMindmaps,
      total_mindmaps_ever: totalMindmapsEver,
      total_chats: totalChats,
      total_public_maps: totalPublicMaps,
      total_nodes: totalNodes,
      total_nodes_active: totalNodesActive,
      total_images: totalImages,
      active_users: activeUsers24h,
      health_score: healthScore,
      engagement_rate: engagementRate,
      new_users_today: newUsers24h,
      new_users_yesterday: newUsersPrevious24h,
      new_maps_today: newMaps24h,
      new_maps_yesterday: newMapsPrevious24h,
      avg_maps_per_user: totalUsers > 0 ? Math.round((totalMindmapsEver / totalUsers) * 10) / 10 : 0,
      avg_chats_per_user: totalUsers > 0 ? Math.round((totalChats / totalUsers) * 10) / 10 : 0,
      avg_nodes_per_map: totalMindmaps > 0 ? Math.round((totalNodes / totalMindmaps) * 10) / 10 : 0,
      heatmap_days: Array.from(heatmapMap.values()),
      map_analytics: mapAnalytics,
      latest_users: latestUsers,
      latest_maps: latestMaps,
      top_users: topUsers,
      timestamp,
      last_updated: nowMs,
      ai_calls: aiCalls,
    };

    const { error: upsertError } = await supabase.from('admin_stats').upsert({
      id: 'global',
      data: docPayload,
      last_updated: timestamp
    });
    if (upsertError) throw upsertError;

    lastSyncTime = nowMs;
    console.log('✅ [AdminSync] Sync completed');
    return NextResponse.json({ success: true, timestamp });

  } catch (error: any) {
    console.error('❌ [AdminSync] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Unknown error' }, { status: 500 });
  }
}
