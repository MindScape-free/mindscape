import { NextResponse } from 'next/server';
import { getSupabaseAdmin, isUserAdminServer } from '@/lib/supabase-server';

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

  const timestamp = new Date().toISOString();
  const supabase = getSupabaseAdmin();

  try {
    console.log('📊 [AdminSync] Recomputing platform_stats...');

    // ── admin_stats is deprecated; only platform_stats is the source of truth ──
    // Trigger recompute to refresh platform_stats from user_profiles/events.
    const { error: recomputeError } = await supabase.rpc('recompute_platform_stats');
    if (recomputeError) {
      throw recomputeError;
    }

    lastSyncTime = nowMs;
    console.log('✅ [AdminSync] Sync completed');
    return NextResponse.json({ success: true, timestamp });

  } catch (error: any) {
    console.error('❌ [AdminSync] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Unknown error' }, { status: 500 });
  }
}
