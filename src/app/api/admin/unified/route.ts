import { NextResponse } from 'next/server';
import { getSupabaseAdmin, isUserAdminServer } from '@/lib/supabase-server';
import type { PlatformStats, UserProfile, UserEvent, UnifiedAdminResponse } from '@/types/admin';
import { DEFAULT_MAP_ANALYTICS } from '@/types/admin';

// ── Auth ──────────────────────────────────────────────────────

async function verifyAdmin(request: Request): Promise<{ authorized: boolean; uid?: string; error?: string }> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return { authorized: false, error: 'Missing or invalid Authorization header' };
    }

    const idToken = authHeader.substring(7);
    const supabase = getSupabaseAdmin();
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
    console.error('[UnifiedAPI] Auth verification failed:', error.message);
    return { authorized: false, error: error.message || 'Token verification failed' };
  }
}

async function verifySelfOrAdmin(request: Request): Promise<{ authorized: boolean; uid?: string; error?: string }> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return { authorized: false, error: 'Missing or invalid Authorization header' };
    }

    const idToken = authHeader.substring(7);
    const supabase = getSupabaseAdmin();
    const { data: { user }, error: authError } = await supabase.auth.getUser(idToken);

    if (authError || !user) {
      return { authorized: false, error: authError?.message || 'Token verification failed' };
    }

    return { authorized: true, uid: user.id };
  } catch (error: any) {
    console.error('[UnifiedAPI] Self-auth failed:', error.message);
    return { authorized: false, error: error.message || 'Token verification failed' };
  }
}

// ── Helpers ───────────────────────────────────────────────────

function safeInt(val: any, fallback: number = 0): number {
  const n = parseInt(val, 10);
  return isNaN(n) ? fallback : n;
}

function safeFloat(val: any, fallback: number = 0): number {
  const n = parseFloat(val);
  return isNaN(n) ? fallback : n;
}

function defaultPlatformStats(): PlatformStats {
  return {
    total_users: 0, total_maps: 0, total_maps_ever: 0,
    total_chats: 0, total_nodes: 0, total_images: 0, total_events: 0,
    new_users_24h: 0, new_maps_24h: 0,
    active_users_24h: 0, active_users_7d: 0,
    new_users_7d: 0, new_maps_7d: 0,
    health_score: 100, engagement_rate: 0,
    top_persona: 'N/A', top_source_type: 'N/A',
    avg_maps_per_user: 0, avg_nodes_per_map: 0,
    daily_snapshot: [],
    updated_at: new Date().toISOString(),
  };
}

function mapPlatformRow(row: any): PlatformStats {
  if (!row) return defaultPlatformStats();
  return {
    total_users: safeInt(row.total_users),
    total_maps: safeInt(row.total_maps),
    total_maps_ever: safeInt(row.total_maps_ever),
    total_chats: safeInt(row.total_chats),
    total_nodes: safeInt(row.total_nodes),
    total_nodes_active: safeInt(row.total_nodes_active || row.total_nodes),
    total_images: safeInt(row.total_images),
    total_events: safeInt(row.total_events),
    new_users_24h: safeInt(row.new_users_24h),
    new_maps_24h: safeInt(row.new_maps_24h),
    active_users_24h: safeInt(row.active_users_24h),
    active_users_7d: safeInt(row.active_users_7d),
    new_users_7d: safeInt(row.new_users_7d),
    new_maps_7d: safeInt(row.new_maps_7d),
    health_score: safeInt(row.health_score, 100),
    engagement_rate: safeFloat(row.engagement_rate),
    top_persona: row.top_persona || 'N/A',
    top_source_type: row.top_source_type || 'N/A',
    avg_maps_per_user: safeFloat(row.avg_maps_per_user),
    avg_nodes_per_map: safeFloat(row.avg_nodes_per_map),
    daily_snapshot: Array.isArray(row.daily_snapshot) ? row.daily_snapshot : [],
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

function mapProfileRow(row: any): UserProfile | null {
  if (!row) return null;
  return {
    user_id: row.user_id,
    email: row.email || undefined,
    display_name: row.display_name || undefined,
    photo_url: row.photo_url || undefined,
    created_at: row.created_at || undefined,
    total_maps: safeInt(row.total_maps),
    total_compare_maps: safeInt(row.total_compare_maps),
    total_multi_maps: safeInt(row.total_multi_maps),
    total_chats: safeInt(row.total_chats),
    total_nodes: safeInt(row.total_nodes),
    total_images: safeInt(row.total_images),
    total_expansions: safeInt(row.total_expansions),
    study_time_minutes: safeInt(row.study_time_minutes),
    current_streak: safeInt(row.current_streak),
    longest_streak: safeInt(row.longest_streak),
    last_active_date: row.last_active_date || undefined,
    mode_breakdown: typeof row.mode_breakdown === 'object' ? row.mode_breakdown : {},
    depth_breakdown: typeof row.depth_breakdown === 'object' ? row.depth_breakdown : {},
    source_breakdown: typeof row.source_breakdown === 'object' ? row.source_breakdown : {},
    persona_breakdown: typeof row.persona_breakdown === 'object' ? row.persona_breakdown : {},
    daily_activity: typeof row.daily_activity === 'object' ? row.daily_activity : {},
    unlocked_achievements: row.unlocked_achievements || undefined,
    preferences: typeof row.preferences === 'object' ? row.preferences : {},
    api_settings: typeof row.api_settings === 'object' ? row.api_settings : {},
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

function mapEventRow(row: any): UserEvent {
  return {
    id: safeInt(row.id),
    user_id: row.user_id || '',
    event_type: row.event_type || 'unknown',
    event_data: typeof row.event_data === 'object' ? row.event_data : {},
    source: row.source || undefined,
    ip_address: row.ip_address || undefined,
    user_agent: row.user_agent || undefined,
    session_id: row.session_id || undefined,
    created_at: row.created_at || new Date().toISOString(),
  };
}

/** Map a UserProfile to the shape expected by the admin dashboard UI (camelCase, .statistics sub-object) */
function profileToLegacyUser(profile: UserProfile): any {
  return {
    id: profile.user_id,
    displayName: profile.display_name || profile.email?.split('@')[0] || 'Unknown',
    email: profile.email || '',
    photoURL: profile.photo_url || undefined,
    createdAt: profile.created_at || profile.updated_at,
    statistics: {
      totalMapsCreated: profile.total_maps,
      totalNodes: profile.total_nodes,
      totalImagesGenerated: profile.total_images,
      totalStudyTimeMinutes: profile.study_time_minutes,
      currentStreak: profile.current_streak,
      longestStreak: profile.longest_streak,
      lastActiveDate: profile.last_active_date,
    },
    activity: profile.daily_activity,
    unlockedAchievements: profile.unlocked_achievements,
    mode_breakdown: profile.mode_breakdown,
    depth_breakdown: profile.depth_breakdown,
    source_breakdown: profile.source_breakdown,
    persona_breakdown: profile.persona_breakdown,
  };
}

/** Map a UserEvent to the shape expected by the admin dashboard logs */
function eventToLegacyLog(event: UserEvent, userLookup?: Map<string, { email: string; displayName: string }>): any {
  const user = userLookup?.get(event.user_id);

  // Build human-readable details from event_data
  const data = event.event_data || {};
  const eventTypeStr = event.event_type;
  let details: string;
  switch (eventTypeStr) {
    case 'map_created':
      details = `Created map "${data.topic || data.title || 'Untitled'}"`;
      break;
    case 'map_deleted':
      details = `Deleted map "${data.topic || data.title || 'Untitled'}"`;
      break;
    case 'map_shared':
      details = `Shared map "${data.topic || data.title || 'Untitled'}"`;
      break;
    case 'map_exported':
      details = `Exported map "${data.topic || data.title || 'Untitled'}"`;
      break;
    case 'chat_sent':
      details = `Sent a chat message`;
      break;
    case 'image_generated':
      details = data.prompt
        ? `Generated image: "${data.prompt.substring(0, 60)}${data.prompt.length > 60 ? '...' : ''}"`
        : `Generated an image`;
      break;
    case 'node_expanded':
      details = data.label
        ? `Expanded node "${data.label}"`
        : `Expanded a node`;
      break;
    case 'login':
      details = `Logged in`;
      break;
    case 'logout':
      details = `Logged out`;
      break;
    case 'study_time':
      details = data.minutes
        ? `Studied for ${data.minutes} minute${data.minutes > 1 ? 's' : ''}`
        : `Recorded study time`;
      break;
    case 'quiz_generated':
      details = data.topic
        ? `Generated quiz on "${data.topic}"`
        : `Generated a quiz`;
      break;
    case 'explanation_requested':
      details = data.label
        ? `Requested explanation for "${data.label}"`
        : `Requested an explanation`;
      break;
    case 'feedback_submitted':
      details = `Submitted feedback`;
      break;
    default:
      details = (eventTypeStr as string).replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
  }

  return {
    id: `evt_${event.id}`,
    timestamp: event.created_at,
    type: event.event_type.toUpperCase(),
    targetId: event.user_id,
    targetType: 'user',
    details,
    performedBy: event.user_id,
    performedByEmail: user?.email || undefined,
    metadata: event.event_data,
    source: event.source,
    eventType: event.event_type,
  };
}

/** Compute platform-level map analytics from all user profiles */
function computeMapAnalytics(profiles: UserProfile[]): typeof DEFAULT_MAP_ANALYTICS {
  const result = {
    ...DEFAULT_MAP_ANALYTICS,
    totalAnalyzed: 0,
    modeCounts: { single: 0, compare: 0, multi: 0 },
    depthCounts: { low: 0, medium: 0, deep: 0, unspecified: 0 },
    sourceCounts: {} as Record<string, number>,
    personaCounts: {} as Record<string, number>,
    subMapStats: { total: 0, parents: 0, avgPerParent: 0 },
    publicPrivate: { public: 0, private: 0 },
    avgNodesPerMap: 0,
    topPersona: 'N/A',
  };

  let totalMaps = 0;
  let totalNodes = 0;

  for (const p of profiles) {
    totalMaps += p.total_maps;
    totalNodes += p.total_nodes;

    // Aggregate mode breakdown
    if (p.mode_breakdown) {
      result.modeCounts.single += safeInt(p.mode_breakdown.single || p.mode_breakdown.Single || 0);
      result.modeCounts.compare += safeInt(p.mode_breakdown.compare || p.mode_breakdown.Compare || 0);
      result.modeCounts.multi += safeInt(p.mode_breakdown.multi || p.mode_breakdown.Multi || 0);
    }

    // Aggregate depth breakdown
    if (p.depth_breakdown) {
      result.depthCounts.low += safeInt(p.depth_breakdown.low || p.depth_breakdown.Low || 0);
      result.depthCounts.medium += safeInt(p.depth_breakdown.medium || p.depth_breakdown.Medium || 0);
      result.depthCounts.deep += safeInt(p.depth_breakdown.deep || p.depth_breakdown.Deep || 0);
      result.depthCounts.unspecified += safeInt(p.depth_breakdown.unspecified || p.depth_breakdown.Unspecified || 0);
    }

    // Aggregate source breakdown
    if (p.source_breakdown) {
      for (const [key, val] of Object.entries(p.source_breakdown)) {
        result.sourceCounts[key] = (result.sourceCounts[key] || 0) + safeInt(val);
      }
    }

    // Aggregate persona breakdown
    if (p.persona_breakdown) {
      for (const [key, val] of Object.entries(p.persona_breakdown)) {
        result.personaCounts[key] = (result.personaCounts[key] || 0) + safeInt(val);
      }
    }
  }

  result.totalAnalyzed = totalMaps;    result.avgNodesPerMap = totalMaps > 0 ? Math.round((totalNodes / totalMaps) * 10) / 10 : 0;

  // Determine top persona
  let maxCount = 0;
  for (const [key, val] of Object.entries(result.personaCounts)) {
    if (val > maxCount) {
      maxCount = val;
      result.topPersona = key;
    }
  }

  return result;
}

// ── Route ─────────────────────────────────────────────────────

/**
 * GET /api/admin/unified
 *
 * Query params:
 *   scope   — "full" returns platform stats + user profiles list + events + map analytics + feedback + aiCalls
 *   userId  — optional UUID to scope response to a single user
 *   self    — if "true", allows users to fetch their own data without admin role
 *   limit   — max events to return (default 50, max 500)
 *
 * Returns:
 *   scope omitted + userId given:
 *     { platform: PlatformStats, user?: { profile, recent_events }, meta }
 *   scope=full:
 *     { platform, profiles, events, metrics: { mapAnalytics, topUsers, latestUsers }, bundles: { feedback, aiCalls }, meta }
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const targetUserId = url.searchParams.get('userId') || undefined;
    const isSelfRequest = url.searchParams.get('self') === 'true';
    const scope = url.searchParams.get('scope') || undefined;
    const isFullScope = scope === 'full';
    const limit = Math.min(safeInt(url.searchParams.get('limit'), 50), 500);

    // ── Auth ────────────────────────────────────────────────
    let authCheck: { authorized: boolean; uid?: string; error?: string };

    if (isSelfRequest && targetUserId) {
      authCheck = await verifySelfOrAdmin(request);
      if (!authCheck.authorized) {
        return NextResponse.json({ error: authCheck.error || 'Unauthorized' }, { status: 403 });
      }
      if (authCheck.uid !== targetUserId) {
        return NextResponse.json({ error: 'Forbidden: Cannot access another user\'s data' }, { status: 403 });
      }
    } else {
      authCheck = await verifyAdmin(request);
      if (!authCheck.authorized) {
        return NextResponse.json({ error: authCheck.error || 'Unauthorized' }, { status: 403 });
      }
    }

    const supabase = getSupabaseAdmin();
    console.log(`📊 [UnifiedAPI] scope=${scope} targetUserId=${targetUserId || 'none'}`);

    // ── 1. Fetch platform_stats ─────────────────────────────
    const { data: platformRow } = await supabase
      .from('platform_stats')
      .select('*')
      .eq('id', 'global')
      .single();

    const platform = mapPlatformRow(platformRow);

    // ── 2. User-specific data ──────────────────────────────
    let userData: { profile: UserProfile; recent_events: UserEvent[] } | undefined;

    if (targetUserId && !isFullScope) {
      const { data: profileRow } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', targetUserId)
        .single();

      const { data: eventRows } = await supabase
        .from('user_events')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(limit);

      userData = {
        profile: mapProfileRow(profileRow) || {
          user_id: targetUserId,
          total_maps: 0, total_compare_maps: 0, total_multi_maps: 0,
          total_chats: 0, total_nodes: 0, total_images: 0,
          total_expansions: 0, study_time_minutes: 0,
          current_streak: 0, longest_streak: 0,
          mode_breakdown: {}, depth_breakdown: {},
          source_breakdown: {}, persona_breakdown: {},
          daily_activity: {},
          preferences: {},
          api_settings: {},
          updated_at: new Date().toISOString(),
        },
        recent_events: (eventRows || []).map(mapEventRow),
      };
    }

    // ── 3. Full scope: admin dashboard data ─────────────────
    let profiles: UserProfile[] = [];
    let events: UserEvent[] = [];
    let feedback: any[] = [];
    let aiCalls: any[] = [];
    let mapAnalytics = { ...DEFAULT_MAP_ANALYTICS };

    if (isFullScope) {
      // Fetch all user_profiles
      const { data: profileRows } = await supabase
        .from('user_profiles')
        .select('*')
        .order('total_maps', { ascending: false });

      profiles = (profileRows || []).map(mapProfileRow).filter(Boolean) as UserProfile[];

      // Fetch recent user_events
      const { data: eventRows } = await supabase
        .from('user_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      events = (eventRows || []).map(mapEventRow);

      // Fetch recent feedback
      try {
        const { data: fb } = await supabase
          .from('feedback')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);
        feedback = (fb || []).map((f: any) => ({
          ...f,
          createdAt: f.created_at,
          userId: f.user_id,
        }));
      } catch (e) {
        console.warn('[UnifiedAPI] feedback fetch failed:', e);
      }

      // Fetch recent AI calls
      try {
        const { data: ai } = await supabase
          .from('ai_calls')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200);
        aiCalls = (ai || []).map((c: any) => ({
          id: c.id,
          // Map DB snake_case → TelemetryTab camelCase
          success: !c.was_error,
          latency_ms: c.duration_ms || 0,
          prompt_type: c.task_type || 'unspecified',
          mapTitle: c.prompt || 'Neural Stream',
          prompt: c.prompt,
          user_id: c.user_id,
          mind_map_id: c.mind_map_id,
          node_count: c.metadata?.node_count || 0,
          created_at: c.created_at,
          error_message: c.error_message,
          metadata: c.metadata || { model: c.model, provider: c.provider },
          was_error: c.was_error,
          duration_ms: c.duration_ms,
          task_type: c.task_type,
          provider: c.provider,
          model: c.model,
        }));
      } catch (e) {
        console.warn('[UnifiedAPI] ai_calls fetch failed:', e);
      }

      // Compute map analytics from profiles
      mapAnalytics = computeMapAnalytics(profiles);

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
        console.error('[UnifiedAPI] Node counts calculation failed:', err);
      }

      platform.total_nodes_active = activeNodesCount || platform.total_nodes;
      platform.total_nodes = historicalNodesCount || platform.total_nodes;

      // Compute public/private counts directly from mindmaps table
      // Note: mindmaps has no is_deleted/deleted columns — rows are physically DELETEd
      // Exclude sub-maps as they inherit visibility from their parent
      const { count: publicCount } = await supabase
        .from('mindmaps')
        .select('*', { count: 'exact', head: true })
        .eq('is_public', true)
        .or('is_sub_map.is.null,is_sub_map.eq.false');

      const { count: totalActive } = await supabase
        .from('mindmaps')
        .select('*', { count: 'exact', head: true })
        .or('is_sub_map.is.null,is_sub_map.eq.false');

      mapAnalytics.publicPrivate = {
        public: publicCount ?? 0,
        private: (totalActive ?? 0) - (publicCount ?? 0),
      };

      // Compute sub-map stats directly from mindmaps table
      const { count: subMapCount } = await supabase
        .from('mindmaps')
        .select('*', { count: 'exact', head: true })
        .eq('is_sub_map', true);

      const { data: parentRows } = await supabase
        .from('mindmaps')
        .select('parent_map_id')
        .eq('is_sub_map', true)
        .not('parent_map_id', 'is', null);

      const distinctParents = new Set((parentRows || []).map((r: any) => r.parent_map_id)).size;
      const totalSubs = subMapCount ?? 0;

      mapAnalytics.subMapStats = {
        total: totalSubs,
        parents: distinctParents,
        avgPerParent: distinctParents > 0 ? Math.round((totalSubs / distinctParents) * 10) / 10 : 0,
      };
    }

    // ── 4. Build response ───────────────────────────────────
    if (isFullScope) {
      const legacyUsers = profiles.map(profileToLegacyUser);
      const sortedByMaps = [...legacyUsers].sort((a, b) => (b.statistics?.totalMapsCreated || 0) - (a.statistics?.totalMapsCreated || 0));
      const sortedByCreated = [...legacyUsers].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      // Build user lookup for enriching event logs with emails/names
      const userLookup = new Map<string, { email: string; displayName: string }>();
      profiles.forEach(p => {
        if (p.email || p.display_name) {
          userLookup.set(p.user_id, {
            email: p.email || '',
            displayName: p.display_name || p.email?.split('@')[0] || 'Unknown',
          });
        }
      });

      const response = {
        platform,
        profiles: legacyUsers,
        events: events.map(e => eventToLegacyLog(e, userLookup)),
        metrics: {
          mapAnalytics,
          topUsers: sortedByMaps.slice(0, 10),
          latestUsers: sortedByCreated.slice(0, 10),
        },
        bundles: {
          feedback,
          aiCalls,
        },
        meta: {
          cached: false,
          source: 'unified',
          totalProfiles: profiles.length,
          totalEvents: events.length,
        },
      };

      return NextResponse.json(response, {
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    // Standard response (for individual user lookup)
    const response: UnifiedAdminResponse = {
      platform,
      ...(userData ? { user: userData } : {}),
      meta: {
        cached: false,
        source: 'unified',
      },
    };

    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'no-store' },
    });

  } catch (error: any) {
    console.error('❌ [UnifiedAPI] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch unified data' },
      { status: 500 }
    );
  }
}
