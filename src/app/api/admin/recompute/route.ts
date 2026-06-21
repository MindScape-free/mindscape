import { NextResponse } from 'next/server';
import { getSupabaseAdmin, isUserAdminServer } from '@/lib/supabase-server';

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
    console.error('[RecomputeAPI] Auth verification failed:', error.message);
    return { authorized: false, error: error.message || 'Token verification failed' };
  }
}

// ── Route ─────────────────────────────────────────────────────

/**
 * POST /api/admin/recompute
 *
 * Triggers on-demand recomputation of aggregated data.
 *
 * Body (JSON):
 *   scope: 'profiles' | 'platform' | 'all' (default: 'all')
 *     - 'profiles'   → calls recompute_all_user_profiles()
 *     - 'platform'   → calls recompute_platform_stats()
 *     - 'all'        → calls both (profiles first, then platform)
 *
 * Returns:
 *   {
 *     success: true,
 *     results: {
 *       profiles?: string,   // status message from the function
 *       platform?: string,    // status message from the function
 *     },
 *     timing: {              // elapsed wall-clock time per step
 *       profiles?: number,
 *       platform?: number,
 *       total: number,
 *     }
 *   }
 */
export async function POST(request: Request) {
  const startTotal = performance.now();

  try {
    // ── Auth ────────────────────────────────────────────────
    const authCheck = await verifyAdmin(request);
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error || 'Unauthorized' }, { status: 403 });
    }

    // ── Parse body ──────────────────────────────────────────
    let scope: 'profiles' | 'platform' | 'all' = 'all';
    try {
      const body = await request.json();
      if (body?.scope === 'profiles' || body?.scope === 'platform') {
        scope = body.scope;
      }
    } catch {
      // No body or invalid JSON — default to 'all'
    }

    const supabase = getSupabaseAdmin();
    const results: { profiles?: string; platform?: string } = {};
    const timing: { profiles?: number; platform?: number; total: number } = { total: 0 };

    console.log(`🔄 [RecomputeAPI] Triggering recompute scope=${scope}`);

    // ── 1. Recompute all user profiles ─────────────────────
    if (scope === 'profiles' || scope === 'all') {
      const startProfiles = performance.now();

      const { data: profilesResult, error: profilesError } = await supabase.rpc('recompute_all_user_profiles');

      if (profilesError) {
        console.error('[RecomputeAPI] recompute_all_user_profiles failed:', profilesError.message);
        results.profiles = `Error: ${profilesError.message}`;
      } else {
        results.profiles = profilesResult || 'Profiles recomputed (no status returned)';
      }

      timing.profiles = Math.round(performance.now() - startProfiles);
      console.log(`   ✅ Profiles: ${results.profiles} (${timing.profiles}ms)`);
    }

    // ── 2. Recompute platform stats ─────────────────────────
    if (scope === 'platform' || scope === 'all') {
      const startPlatform = performance.now();

      const { data: platformResult, error: platformError } = await supabase.rpc('recompute_platform_stats');

      if (platformError) {
        console.error('[RecomputeAPI] recompute_platform_stats failed:', platformError.message);
        results.platform = `Error: ${platformError.message}`;
      } else {
        results.platform = platformResult ? JSON.stringify(platformResult) : 'Platform stats recomputed (no data returned)';
      }

      timing.platform = Math.round(performance.now() - startPlatform);
      console.log(`   ✅ Platform: ${results.platform?.substring(0, 100)} (${timing.platform}ms)`);
    }

    timing.total = Math.round(performance.now() - startTotal);

    return NextResponse.json({
      success: true,
      results,
      timing,
      meta: {
        triggeredBy: authCheck.uid,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error: any) {
    console.error('❌ [RecomputeAPI] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Recomputation failed' },
      { status: 500 }
    );
  }
}
