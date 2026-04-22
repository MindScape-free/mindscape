import { NextResponse } from 'next/server';
import { getSupabaseAdmin, isUserAdminServer } from '@/lib/supabase-server';
import { getOrSetCache, invalidateCache } from '@/server/cache/admin.cache';
import { getAdminStats, getMindmapsList } from '@/server/admin/admin.service';

async function verifyAdmin(request: Request): Promise<{ authorized: boolean; uid?: string; error?: string }> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return { authorized: false, error: 'Missing or invalid Authorization header' };
    }

    const token = authHeader.substring(7);
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      return { authorized: false, error: 'Supabase not initialized' };
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return { authorized: false, error: error?.message || 'Invalid token' };
    }

    const isAdmin = await isUserAdminServer(user.id);
    if (!isAdmin) {
      return { authorized: false, uid: user.id, error: 'Unauthorized: Not an admin' };
    }

    return { authorized: true, uid: user.id };
  } catch (error: any) {
    console.error('Admin verification failed:', error.message);
    return { authorized: false, error: error.message || 'Token verification failed' };
  }
}

export async function GET(request: Request) {
  try {
    const authCheck = await verifyAdmin(request);
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error || 'Unauthorized' }, { status: 403 });
    }

    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get('refresh') === 'true';
    const action = url.searchParams.get('action') || 'stats';

    if (forceRefresh) {
      invalidateCache('admin:stats');
      invalidateCache('admin:mindmaps');
    }

    if (action === 'stats') {
      const { data, fromCache, age } = await getOrSetCache(
        'admin:stats',
        getAdminStats,
        60 * 1000
      );

      return NextResponse.json({
        success: true,
        data,
        meta: {
          cached: fromCache,
          cacheAge: age,
          source: 'aggregation',
        },
      });
    }

    if (action === 'mindmaps') {
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
      const offset = parseInt(url.searchParams.get('offset') || '0');

      const { data, total, hasMore } = await getMindmapsList({
        limit,
        offset,
      });

      return NextResponse.json({
        success: true,
        data,
        pagination: {
          offset,
          total,
          hasMore,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('[AdminStatsAPI] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
