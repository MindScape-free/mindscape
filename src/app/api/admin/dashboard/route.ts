import { NextResponse } from 'next/server';
import { initializeFirebaseServer } from '@/firebase/server';
import { DEFAULT_MAP_ANALYTICS } from '@/types/admin';
import { getAuth } from 'firebase-admin/auth';

const ADMIN_UID = 'ldTOigUhGqX5x8UAOj1ouTZIyfm1';

async function verifyAdmin(request: Request): Promise<{ authorized: boolean; uid?: string; error?: string }> {
  try {
    const authHeader = request.headers.get('Authorization');
    console.log('[DashboardAPI] Auth header present:', !!authHeader);
    if (!authHeader?.startsWith('Bearer ')) {
      return { authorized: false, error: 'Missing or invalid Authorization header' };
    }

    const idToken = authHeader.substring(7);
    console.log('[DashboardAPI] Token length:', idToken.length);
    
    const { app } = initializeFirebaseServer();
    
    if (!app) {
      return { authorized: false, error: 'Firebase not initialized' };
    }

    const decodedToken = await getAuth(app).verifyIdToken(idToken);
    const uid = decodedToken.uid;
    console.log('[DashboardAPI] Decoded UID:', uid, 'Admin UID:', ADMIN_UID);
    
    if (uid !== ADMIN_UID) {
      return { authorized: false, uid, error: 'Unauthorized: Not an admin' };
    }

    return { authorized: true, uid };
  } catch (error: any) {
    console.error('RBAC verification failed:', error.message);
    return { authorized: false, error: error.message || 'Token verification failed' };
  }
}

function safeMapAnalytics(data?: any): typeof DEFAULT_MAP_ANALYTICS {
  if (!data) return { ...DEFAULT_MAP_ANALYTICS };
  return {
    totalAnalyzed: data.totalAnalyzed ?? 0,
    modeCounts: {
      single: data.modeCounts?.single ?? 0,
      compare: data.modeCounts?.compare ?? 0,
      multi: data.modeCounts?.multi ?? 0,
    },
    depthCounts: {
      low: data.depthCounts?.low ?? 0,
      medium: data.depthCounts?.medium ?? 0,
      deep: data.depthCounts?.deep ?? 0,
      unspecified: data.depthCounts?.unspecified ?? 0,
    },
    sourceCounts: data.sourceCounts || {},
    personaCounts: data.personaCounts || {},
    subMapStats: {
      total: data.subMapStats?.total ?? 0,
      parents: data.subMapStats?.parents ?? 0,
      avgPerParent: data.subMapStats?.avgPerParent ?? 0,
    },
    publicPrivate: {
      public: data.publicPrivate?.public ?? 0,
      private: data.publicPrivate?.private ?? 0,
    },
    avgNodesPerMap: data.avgNodesPerMap ?? 0,
    featuredCount: data.featuredCount ?? 0,
    topPersona: data.topPersona ?? 'N/A',
    userStats: data.userStats || [],
  };
}

function sanitizeTimestamps(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeTimestamps);
  const result: any = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val && typeof val.toDate === 'function') {
      result[key] = val.toDate().toISOString();
    } else if (val && typeof val === 'object' && val._seconds !== undefined) {
      result[key] = new Date(val._seconds * 1000).toISOString();
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      result[key] = sanitizeTimestamps(val);
    } else {
      result[key] = val;
    }
  }
  return result;
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

    const { admin, app, firestore } = initializeFirebaseServer();
    if (!app || !firestore || !admin) {
      console.error('[DashboardAPI] Firebase initialization failed:', { app: !!app, firestore: !!firestore, admin: !!admin });
      return NextResponse.json({ error: 'Firebase not initialized.' }, { status: 500 });
    }

    console.log(`📊 [DashboardAPI] Fetching all-time stats${since ? ` (incremental since ${since})` : ''}`);

    // Fetch precomputed stats doc and bundle data concurrently
    const bundlePromises: Promise<any>[] = [];

    // Users: fetch ALL users without orderBy so users missing createdAt are included.
    // Firestore silently excludes documents from orderBy queries if the field doesn't exist.
    if (since) {
      bundlePromises.push(
        firestore.collection('users').where('createdAt', '>=', since).get()
      );
    } else {
      bundlePromises.push(firestore.collection('users').limit(500).get());
    }

    // Logs
    let logsQuery: any = firestore.collection('adminActivityLog');
    if (since) {
      logsQuery = logsQuery.where('timestamp', '>=', since).orderBy('timestamp', 'desc');
    } else {
      logsQuery = logsQuery.orderBy('timestamp', 'desc').limit(100);
    }
    bundlePromises.push(logsQuery.get());

    // Feedback
    bundlePromises.push(
      firestore.collection('feedback').orderBy('createdAt', 'desc').limit(200).get()
    );

    const [statsDoc, usersSnap, logsSnap, feedbackSnap] = await Promise.all([
      firestore.collection('adminStats').doc('all-time').get(),
      ...bundlePromises,
    ]);

    const raw = statsDoc.exists ? statsDoc.data() : {};
    // Sanitize all Firestore Timestamps in the raw doc
    const data = sanitizeTimestamps(raw);

    const response = {
      // Spread all flat fields from the doc (heatmapDays, latestUsers, topUsers, newUsersToday, etc.)
      ...data,
      // stats wrapper built last — never overwritten by ...data
      stats: {
        totalUsers: data?.totalUsers ?? 0,
        totalMindmaps: data?.totalMindmaps ?? 0,
        totalChats: data?.totalChats ?? 0,
        activeUsers: data?.activeUsers24h ?? data?.activeUsers ?? 0,
        healthScore: data?.healthScore ?? 0,
        lastUpdated: data?.lastUpdated ?? null,
        timestamp: data?.timestamp ?? null,
      },
      mapAnalytics: safeMapAnalytics(data?.mapAnalytics),
      bundle: {
        users: usersSnap.docs
          .map((d: any) => {
            const ud = d.data();
            return { id: d.id, ...sanitizeTimestamps(ud) };
          })
          .sort((a: any, b: any) => {
            const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return tb - ta;
          }),
        logs: logsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })),
        feedback: feedbackSnap.docs.map((d: any) => {
          const fd = d.data();
          return { id: d.id, ...sanitizeTimestamps(fd) };
        }),
        serverTime: new Date().toISOString(),
        isIncremental: !!since,
      },
      meta: {
        cached: false,
        cacheAge: null,
        source: 'unified',
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
