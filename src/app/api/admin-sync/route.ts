import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
// firebase-admin/auth removed
import { format, subHours, subDays } from 'date-fns';

const ADMIN_UID = '765cd0a0-6201-41d2-ac8d-ff99b4941289';

async function verifyAdmin(request: Request): Promise<{ authorized: boolean; uid?: string; error?: string }> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return { authorized: false, error: 'Missing or invalid Authorization header' };
    }

    const idToken = authHeader.substring(7);
    const { app } = { firestore: getSupabaseAdmin() };
    
    if (!app) {
      return { authorized: false, error: 'Firebase not initialized' };
    }

    const decodedToken = await getAuth(app).verifyIdToken(idToken);
    const uid = decodedToken.uid;
    
    if (uid !== ADMIN_UID) {
      return { authorized: false, uid, error: 'Unauthorized: Not an admin' };
    }

    return { authorized: true, uid };
  } catch (error: any) {
    console.error('RBAC verification failed:', error.message);
    return { authorized: false, error: error.message || 'Token verification failed' };
  }
}

let lastSyncTime = 0;
const MIN_SYNC_INTERVAL_MS = 60 * 1000; // 1 minute minimum between syncs

function safeDate(value: any, fallback: Date): Date {
  if (!value) return fallback;
  try {
    if (typeof value.toDate === 'function') {
      const d = value.toDate();
      return isNaN(d.getTime()) ? fallback : d;
    }
    if (value instanceof Date) return isNaN(value.getTime()) ? fallback : value;
    const d = new Date(value);
    return isNaN(d.getTime()) ? fallback : d;
  } catch {
    return fallback;
  }
}

function buildEmptyAnalytics() {
  return {
    totalAnalyzed: 0,
    modeCounts: { single: 0, compare: 0, multi: 0 },
    depthCounts: { low: 0, medium: 0, deep: 0, unspecified: 0 },
    sourceCounts: {} as Record<string, number>,
    personaCounts: {} as Record<string, number>,
    subMapStats: { total: 0, parents: 0, avgPerParent: 0 },
    publicPrivate: { public: 0, private: 0 },
    avgNodesPerMap: 0,
    featuredCount: 0,
    topPersona: 'N/A',
    userStats: [] as any[],
  };
}

function processMapsForAnalytics(docs: any[]) {
  const analytics = buildEmptyAnalytics();
  let totalNodes = 0;

  docs.forEach((doc: any) => {
    const data = doc.data();
    analytics.totalAnalyzed++;
    totalNodes += data.nodeCount || 0;

    // Mode
    const isMulti =
      data.mode === 'multi' ||
      data.mode === 'multi-source' ||
      data.sourceFileType === 'multi' ||
      (data.sourceFileContent && data.sourceFileContent.includes('--- SOURCE:'));
    if (isMulti) analytics.modeCounts.multi++;
    else if (data.mode === 'compare') analytics.modeCounts.compare++;
    else analytics.modeCounts.single++;

    // Depth
    const depth = (data.depth || 'unspecified') as keyof typeof analytics.depthCounts;
    if (depth in analytics.depthCounts) analytics.depthCounts[depth]++;
    else analytics.depthCounts.unspecified++;

    // Source — with website fallback for maps that only have sourceUrl
    const source = data.sourceFileType || data.sourceType || (data.sourceUrl ? 'website' : 'text');
    analytics.sourceCounts[source] = (analytics.sourceCounts[source] || 0) + 1;

    // Public/Private
    if (data.isPublic) analytics.publicPrivate.public++;
    else analytics.publicPrivate.private++;

    // Persona
    const raw = (data.aiPersona || data.persona || '').toLowerCase().trim();
    let persona = 'Teacher';
    if (raw === 'concise') persona = 'Concise';
    else if (raw === 'creative') persona = 'Creative';
    else if (raw.includes('sage')) persona = 'Sage';
    analytics.personaCounts[persona] = (analytics.personaCounts[persona] || 0) + 1;

    // Sub-maps
    if (data.isSubMap || data.parentId || data.parentMapId) analytics.subMapStats.total++;
    if ((data.nestedExpansions?.length > 0) || data.hasSubMaps) analytics.subMapStats.parents++;
    if (data.isFeatured) analytics.featuredCount++;
  });

  analytics.avgNodesPerMap =
    analytics.totalAnalyzed > 0
      ? Math.round((totalNodes / analytics.totalAnalyzed) * 10) / 10
      : 0;

  analytics.subMapStats.avgPerParent =
    analytics.subMapStats.parents > 0
      ? Math.round((analytics.subMapStats.total / analytics.subMapStats.parents) * 10) / 10
      : 0;

  let topPersona = 'N/A';
  let topCount = 0;
  Object.entries(analytics.personaCounts).forEach(([key, value]) => {
    if ((value as number) > topCount) {
      topCount = value as number;
      topPersona = key;
    }
  });
  analytics.topPersona = topPersona;

  return analytics;
}

export async function POST(request: Request) {
  const authCheck = await verifyAdmin(request);
  if (!authCheck.authorized) {
    console.warn(`🚫 [AdminSync] Unauthorized access attempt from UID: ${authCheck.uid || 'unknown'}`);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  console.log('🚀 [AdminSync] Starting full synchronization...');

  const nowMs = Date.now();
  if (lastSyncTime > 0 && nowMs - lastSyncTime < MIN_SYNC_INTERVAL_MS) {
    const waitTime = Math.ceil((MIN_SYNC_INTERVAL_MS - (nowMs - lastSyncTime)) / 1000);
    return NextResponse.json(
      { success: false, error: `Rate limited. Wait ${waitTime}s.`, nextAvailableIn: waitTime },
      { status: 429 }
    );
  }

  const now = new Date();
  const timestamp = now.toISOString();

  const heatmapRange = [...Array(31)].map((_, i) => format(subDays(now, 30 - i), 'yyyy-MM-dd'));
  const heatmapMap = new Map(
    heatmapRange.map(date => [
      date,
      { date, newUsers: 0, newMaps: 0, newSubMaps: 0, activeUsers: 0, publicMaps: 0, privateMaps: 0, totalActions: 0 },
    ])
  );

  try {
    const { app, firestore } = { firestore: getSupabaseAdmin() };
    if (!app || !firestore) {
      return NextResponse.json({ success: false, error: 'Firebase not initialized.' }, { status: 500 });
    }

    console.log('📊 [AdminSync] Fetching all collections...');

    const [usersSnap, publicMapsSnap, publicMapsRecentSnap, activitySnap] =
      await Promise.all([
        firestore.collection('users').get(),
        firestore.collection('publicMindmaps').get(),
        firestore.collection('publicMindmaps').orderBy('timestamp', 'desc').limit(10).get().catch(() =>
          firestore.collection('publicMindmaps').limit(10).get()
        ),
        firestore
          .collection('adminActivityLog')
          .where('timestamp', '>=', subDays(now, 31).toISOString())
          .get()
          .catch(() => ({ docs: [] })),
      ]);

    // collectionGroup('mindmaps') requires a Firestore index exemption.
    // We fetch it separately so a missing index doesn't kill the whole sync.
    let allMapsSnap: any = { docs: [], size: 0 };
    try {
      allMapsSnap = await firestore.collectionGroup('mindmaps').get();
    } catch (e: any) {
      console.error('❌ [AdminSync] collectionGroup(mindmaps) failed — falling back to per-user fetch:', e.message);
      // Fallback: fetch maps per user (no index required)
      const allMapDocs: any[] = [];
      await Promise.all(
        usersSnap.docs.map(async (userDoc: any) => {
          try {
            const mapsSnap = await firestore
              .collection('users')
              .doc(userDoc.id)
              .collection('mindmaps')
              .get();
            mapsSnap.docs.forEach((d: any) => allMapDocs.push(d));
          } catch {
            // skip users with permission issues
          }
        })
      );
      allMapsSnap = { docs: allMapDocs, size: allMapDocs.length };
    }

    const totalUsers = usersSnap.size;
    const totalPublicMaps = publicMapsSnap.size;

    // Count chats from user statistics to avoid collectionGroup index requirement
    let totalChats = 0;

    // --- Process Users ---
    let activeUsers24h = 0;
    let newUsers24h = 0;
    let newUsersPrevious24h = 0;
    let totalMindmapsEver = 0;

    const processedUsers = usersSnap.docs.map((doc: any) => {
      const data = doc.data();
      const createdAt: Date = safeDate(data.createdAt, new Date(0));
      const lastActiveStr: string | undefined = data.statistics?.lastActiveDate;
      const lastActive: Date | null = lastActiveStr ? safeDate(lastActiveStr, new Date(0)) : null;

      // Heatmap: new users (skip epoch fallback dates)
      if (createdAt.getTime() > 0) {
        const dateKey = format(createdAt, 'yyyy-MM-dd');
        if (heatmapMap.has(dateKey)) heatmapMap.get(dateKey)!.newUsers++;
      }

      if (createdAt.getTime() > 0 && createdAt >= subHours(now, 24)) newUsers24h++;
      else if (createdAt.getTime() > 0 && createdAt >= subHours(now, 48)) newUsersPrevious24h++;

      if (lastActive && lastActive.getTime() > 0) {
        if (lastActive >= subHours(now, 24)) activeUsers24h++;
        const activeKey = format(lastActive, 'yyyy-MM-dd');
        if (heatmapMap.has(activeKey)) heatmapMap.get(activeKey)!.activeUsers++;
      }

      // Accumulate historical total and chats from user stats
      totalMindmapsEver += data.statistics?.totalMapsCreated || 0;
      totalChats += data.statistics?.totalChats || 0;

      return {
        id: doc.id,
        ...data,
        createdAt: createdAt.toISOString(),
        lastActive: lastActive ? lastActive.toISOString() : null,
      };
    });

    // --- Process Activity Logs for heatmap ---
    activitySnap.docs.forEach((doc: any) => {
      const dateKey = (doc.data().timestamp || '').split('T')[0];
      if (heatmapMap.has(dateKey)) heatmapMap.get(dateKey)!.totalActions++;
    });

    // Count live maps — exclude sub-maps for the "Current Library" count
    let totalMindmaps = 0;
    let totalSubMaps = 0;
    let newMaps24h = 0;
    let newMapsPrevious24h = 0;
    let totalNodesInLibrary = 0;

    allMapsSnap.docs.forEach((doc: any) => {
      const data = doc.data();
      const isSubMap = data.isSubMap === true || !!data.parentMapId;
      if (!isSubMap) totalMindmaps++;
      else totalSubMaps++;

      const mapDate: Date = safeDate(
        data.timestamp || data.createdAt,
        new Date(0)
      );

      totalNodesInLibrary += data.nodeCount || 0;

      if (mapDate.getTime() > 0) {
        const dateKey = format(mapDate, 'yyyy-MM-dd');
        if (heatmapMap.has(dateKey)) {
          const day = heatmapMap.get(dateKey)!;
          day.newMaps++;
          if (data.isSubMap) day.newSubMaps++;
          if (data.isPublic) day.publicMaps++;
          else day.privateMaps++;
        }
      }

      if (mapDate.getTime() > 0 && mapDate >= subHours(now, 24)) newMaps24h++;
      else if (mapDate.getTime() > 0 && mapDate >= subHours(now, 48)) newMapsPrevious24h++;
    });

    // Filter out sub-maps for analytics - only analyze root maps
    const rootMapsOnly = allMapsSnap.docs.filter((doc: any) => {
      const data = doc.data();
      return data.isSubMap !== true && !data.parentMapId;
    });
    const mapAnalytics = processMapsForAnalytics(rootMapsOnly);

    console.log(`📊 [AdminSync] Map breakdown: total docs=${allMapsSnap.docs.length} (root=${rootMapsOnly.length}, sub=${allMapsSnap.docs.length - rootMapsOnly.length}), users=${totalUsers}`);
    const subMapSamples = allMapsSnap.docs
      .filter((d: any) => d.data().isSubMap === true || !!d.data().parentMapId)
      .slice(0, 5)
      .map((d: any) => ({ id: d.id, isSubMap: d.data().isSubMap, parentMapId: d.data().parentMapId, path: d.ref.path }));
    console.log('📊 [AdminSync] Sub-map samples:', JSON.stringify(subMapSamples));
    const rootSamples = allMapsSnap.docs
      .filter((d: any) => d.data().isSubMap !== true && !d.data().parentMapId)
      .slice(0, 5)
      .map((d: any) => ({ id: d.id, topic: d.data().topic, path: d.ref.path }));
    console.log('📊 [AdminSync] Root map samples:', JSON.stringify(rootSamples));

    const engagementRate = totalUsers > 0 ? (activeUsers24h / totalUsers) * 100 : 0;
    const healthScore = Math.round(
      Math.min(50, (engagementRate / 20) * 50) +
        Math.min(50, ((totalMindmapsEver / (totalUsers || 1)) / 1.5) * 50)
    );

    // Only store the fields the UI needs — strip raw Firestore objects to prevent set() failures
    const serializeUser = (u: any) => ({
      id: u.id,
      displayName: u.displayName || null,
      email: u.email || null,
      photoURL: u.photoURL || null,
      createdAt: u.createdAt,   // already ISO string from processedUsers
      lastActive: u.lastActive, // already ISO string or null
      statistics: u.statistics ? {
        totalMapsCreated: u.statistics.totalMapsCreated || 0,
        totalNodes: u.statistics.totalNodes || 0,
        totalImagesGenerated: u.statistics.totalImagesGenerated || 0,
        totalChats: u.statistics.totalChats || 0,
        currentStreak: u.statistics.currentStreak || 0,
        lastActiveDate: u.statistics.lastActiveDate || null,
        totalStudyTimeMinutes: u.statistics.totalStudyTimeMinutes || 0,
      } : null,
    });

    const latestUsers = [...processedUsers]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .map(serializeUser);

    const topUsers = [...processedUsers]
      .sort((a, b) => (b.statistics?.totalMapsCreated || 0) - (a.statistics?.totalMapsCreated || 0))
      .slice(0, 20)
      .map(serializeUser);

    const latestMaps = publicMapsRecentSnap.docs.map((doc: any) => {
      const d = doc.data();
      return {
        id: doc.id,
        topic: d.topic || d.title || d.shortTitle || null,
        shortTitle: d.shortTitle || null,
        isPublic: d.isPublic || false,
        nodeCount: d.nodeCount || 0,
        publicViews: d.publicViews || 0,
        timestamp: d.timestamp?.toDate ? d.timestamp.toDate().toISOString() : d.timestamp || null,
      };
    });

    const docPayload = {
      // Flat fields read directly by dashboard API
      totalUsers,
      totalMindmaps,       // current live count from DB
      totalMindmapsEver,   // historical sum from user statistics
      totalChats,
      totalPublicMaps,
      activeUsers24h,
      activeUsers: activeUsers24h,
      healthScore,
      engagementRate,
      newUsersToday: newUsers24h,
      newUsersYesterday: newUsersPrevious24h,
      newMapsToday: newMaps24h,
      newMapsYesterday: newMapsPrevious24h,
      avgMapsPerUser: totalUsers > 0 ? Math.round((totalMindmapsEver / totalUsers) * 10) / 10 : 0,
      avgChatsPerUser: totalUsers > 0 ? Math.round((totalChats / totalUsers) * 10) / 10 : 0,
      avgNodesPerMap: totalMindmaps > 0 ? Math.round((totalNodesInLibrary / totalMindmaps) * 10) / 10 : 0,
      heatmapDays: Array.from(heatmapMap.values()),
      mapAnalytics,
      latestUsers,
      latestMaps,
      topUsers,
      timestamp,
      lastUpdated: nowMs,
    };

    await firestore.collection('adminStats').doc('all-time').set(docPayload, { merge: false });

    lastSyncTime = nowMs;
    console.log('✅ [AdminSync] Sync completed');
    return NextResponse.json({ success: true, timestamp });

  } catch (error: any) {
    console.error('❌ [AdminSync] Error:', error);
    console.error('❌ [AdminSync] Stack:', error?.stack);
    console.error('❌ [AdminSync] Code:', error?.code);
    return NextResponse.json({ success: false, error: error.message || 'Unknown error', code: error?.code }, { status: 500 });
  }
}
