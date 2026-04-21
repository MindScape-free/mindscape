import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
// firebase-admin/auth removed
import { getOrSetCache, invalidateCache } from '@/server/cache/admin.cache';
import { getAdminStats, getMindmapsList } from '@/server/admin/admin.service';

const ADMIN_UID = '765cd0a0-6201-41d2-ac8d-ff99b4941289';

async function verifyAdmin(request: Request): Promise<{ authorized: boolean; uid?: string; error?: string }> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return { authorized: false, error: 'Missing or invalid Authorization header' };
    }

    const idToken = authHeader.substring(7);
    const { admin, app } = { firestore: getSupabaseAdmin() };
    
    if (!app || !admin) {
      return { authorized: false, error: 'Firebase not initialized' };
    }

    const decodedToken = await getAuth(app).verifyIdToken(idToken);
    const uid = decodedToken.uid;
    
    if (uid !== ADMIN_UID) {
      return { authorized: false, uid, error: 'Unauthorized: Not an admin' };
    }

    return { authorized: true, uid };
  } catch (error: any) {
    console.error('Admin verification failed:', error.message);
    return { authorized: false, error: error.message || 'Token verification failed' };
  }
}

export async function GET(request: Request) {
  try {
    const authCheck = await verifyAdmin(request);
    if (!authCheck.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
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
      const startAfterDoc = url.searchParams.get('startAfterDoc') || undefined;
      const startAfterTime = url.searchParams.get('startAfterTime')
        ? parseInt(url.searchParams.get('startAfterTime')!)
        : undefined;

      const { data, lastDoc, hasMore } = await getMindmapsList({
        limit,
        startAfterDoc,
        startAfterTime,
      });

      return NextResponse.json({
        success: true,
        data,
        pagination: {
          lastDoc: lastDoc?.id || null,
          lastTime: lastDoc ? (lastDoc.data?.createdAt?.toMillis?.() || lastDoc._createTime?.seconds * 1000) : null,
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
