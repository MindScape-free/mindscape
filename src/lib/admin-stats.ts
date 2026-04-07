'use client';

import { 
  collection, 
  collectionGroup, 
  query, 
  getDocs, 
  getCountFromServer,
  doc, 
  setDoc,
  where,
  orderBy,
  limit,
  Firestore,
  Timestamp 
} from 'firebase/firestore';
import { format, subDays, subHours, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from 'date-fns';

interface HeatmapDay {
  date: string;
  newUsers: number;
  newMaps: number;
  newSubMaps: number;
  activeUsers: number;
  publicMaps: number;
  privateMaps: number;
}

interface UserContributionStats {
  userId: string;
  displayName: string;
  photoURL?: string;
  totalMaps: number;
  singleMaps: number;
  compareMaps: number;
  multiMaps: number;
  lowDepthMaps: number;
  mediumDepthMaps: number;
  deepDepthMaps: number;
  textSourceMaps: number;
  pdfSourceMaps: number;
  websiteSourceMaps: number;
  youtubeSourceMaps: number;
  imageSourceMaps: number;
  publicMaps: number;
}

interface MapAnalytics {
  totalAnalyzed: number;
  modeCounts: { single: number; compare: number; multi: number };
  depthCounts: { low: number; medium: number; deep: number; unspecified: number };
  sourceCounts: Record<string, number>;
  personaCounts: Record<string, number>;
  subMapStats: { total: number; parents: number; avgPerParent: number | string };
  publicPrivate: { public: number; private: number };
  avgNodesPerMap: number | string;
  featuredCount: number;
  topPersona: string;
  userStats: UserContributionStats[];
}

interface DashboardMetrics {
  newUsersToday: number;
  newUsersYesterday: number;
  newMapsToday: number;
  newMapsYesterday: number;
  activeUsers24h: number;
  activeUsers48h: number;
  engagementRate: number;
  usersThisWeek: number;
  usersLastWeek: number;
  mapsThisWeek: number;
  mapsLastWeek: number;
  avgMapsPerUser: number;
  avgChatsPerUser: number;
  totalMindmapsEver: number;
  healthScore: number;
  latestUsers: any[];
  latestMaps: any[];
  usersLast7Days: { date: string; count: number }[];
  mapsLast7Days: { date: string; count: number }[];
  topUsers: any[];
  topMaps: any[];
  heatmapDays: HeatmapDay[];
  liveActivities: { id: string; type: 'user' | 'map'; message: string; timestamp: Date }[];
  mapAnalytics: MapAnalytics | null;
  isLoading: boolean;
}

export async function fetchAllMindmaps(firestore: Firestore): Promise<Map<string, any[]>> {
  const mindmapsByUser = new Map<string, any[]>();
  
  try {
    const allMapsQuery = query(collectionGroup(firestore, 'mindmaps'), limit(5000));
    const snapshot = await getDocs(allMapsQuery);
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const userId = doc.ref.parent.parent?.id || 'unknown';
      
      if (!mindmapsByUser.has(userId)) {
        mindmapsByUser.set(userId, []);
      }
      mindmapsByUser.get(userId)!.push({ id: doc.id, ...data });
    });
  } catch (error) {
    console.error('Collection group query failed, falling back to batch:', error);
    
    const usersSnap = await getDocs(collection(firestore, 'users'));
    const userIds = usersSnap.docs.map(d => d.id);
    
    const chunks = chunkArray(userIds, 10);
    for (const chunk of chunks) {
      const promises = chunk.map(async (userId: string) => {
        try {
          const mapsSnap = await getDocs(collection(firestore, `users/${userId}/mindmaps`));
          const maps = mapsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          return { userId, maps };
        } catch {
          return { userId, maps: [] };
        }
      });
      
      const results = await Promise.all(promises);
      results.forEach(({ userId, maps }) => {
        mindmapsByUser.set(userId, maps);
      });
    }
  }
  
  return mindmapsByUser;
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export async function fetchDashboardMetricsOptimized(
  firestore: Firestore,
  month: Date = new Date()
): Promise<Omit<DashboardMetrics, 'isLoading'>> {
  const now = new Date();
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const isCurrentMonth = isSameMonth(month, now);

  const [
    usersSnap,
    publicMapsSnap,
    totalChatsSnap
  ] = await Promise.all([
    getDocs(collection(firestore, 'users')),
    getDocs(query(collection(firestore, 'publicMindmaps'), orderBy('timestamp', 'desc'), limit(100))),
    getCountFromServer(collectionGroup(firestore, 'chatSessions'))
  ]);

  const allUsers = usersSnap.docs;
  const totalUsers = allUsers.length;
  const allMaps = publicMapsSnap.docs;

  const mindmapsByUser = await fetchAllMindmaps(firestore);
  
  const heatmapDays: HeatmapDay[] = monthDays.map(day => ({
    date: format(day, 'yyyy-MM-dd'),
    newUsers: 0,
    newMaps: 0,
    newSubMaps: 0,
    activeUsers: 0,
    publicMaps: 0,
    privateMaps: 0,
  }));

  let totalMindmaps = 0;
  let totalMindmapsEver = 0;
  const userActivity: Map<string, { mapsCreated: number; lastActive: Date | null }> = new Map();

  for (const userDoc of allUsers) {
    const userData = userDoc.data();
    const createdAt = userData.createdAt;
    
    // Add to totalMindmapsEver - this is the aggregate of all maps ever created
    totalMindmapsEver += userData.statistics?.totalMapsCreated || 0;

    if (createdAt) {
      let userDate: Date | null = null;
      if (createdAt instanceof Timestamp) {
        userDate = createdAt.toDate();
      } else if (createdAt?.toDate) {
        userDate = createdAt.toDate();
      } else if (typeof createdAt === 'number') {
        userDate = new Date(createdAt);
      } else if (typeof createdAt === 'string') {
        userDate = new Date(createdAt);
      }
      
      if (userDate) {
        const userDateStr = format(userDate, 'yyyy-MM-dd');
        const dayIdx = heatmapDays.findIndex(d => d.date === userDateStr);
        if (dayIdx >= 0) heatmapDays[dayIdx].newUsers++;
      }
    }

    const lastActive = userData.statistics?.lastActiveDate;
    if (lastActive) {
      const activeDate = format(new Date(lastActive), 'yyyy-MM-dd');
      const dayIdx = heatmapDays.findIndex(d => d.date === activeDate);
      if (dayIdx >= 0) heatmapDays[dayIdx].activeUsers++;
      
      userActivity.set(userDoc.id, {
        mapsCreated: userData.statistics?.totalMapsCreated || 0,
        lastActive: new Date(lastActive)
      });
    } else {
      userActivity.set(userDoc.id, {
        mapsCreated: userData.statistics?.totalMapsCreated || 0,
        lastActive: null
      });
    }

    const userMaps = mindmapsByUser.get(userDoc.id) || [];
    totalMindmaps += userMaps.length;

    for (const mapDoc of userMaps) {
      const mapDate = mapDoc.timestamp 
        ? (mapDoc.timestamp instanceof Timestamp 
            ? format(mapDoc.timestamp.toDate(), 'yyyy-MM-dd')
            : format(new Date(mapDoc.timestamp), 'yyyy-MM-dd'))
        : null;
      
      if (mapDate) {
        const dayIdx = heatmapDays.findIndex(d => d.date === mapDate);
        if (dayIdx >= 0) {
          heatmapDays[dayIdx].newMaps++;
          if (mapDoc.isSubMap) heatmapDays[dayIdx].newSubMaps++;
          if (mapDoc.isPublic) {
            heatmapDays[dayIdx].publicMaps++;
          } else {
            heatmapDays[dayIdx].privateMaps++;
          }
        }
      }
    }
  }

  const todayStr = format(now, 'yyyy-MM-dd');
  const yesterdayStr = format(subDays(now, 1), 'yyyy-MM-dd');
  const last7Days = [...Array(7)].map((_, i) => subDays(now, 6 - i));

  const newUsersToday = heatmapDays.find(d => d.date === todayStr)?.newUsers || 0;
  const newUsersYesterday = heatmapDays.find(d => d.date === yesterdayStr)?.newUsers || 0;

  let usersThisWeek = 0;
  let mapsThisWeek = 0;
  for (const day of last7Days) {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayData = heatmapDays.find(d => d.date === dayStr);
    if (dayData) {
      usersThisWeek += dayData.newUsers;
      mapsThisWeek += dayData.newMaps;
    }
  }

  const activeUsers24h = allUsers.filter(u => {
    const activity = userActivity.get(u.id);
    return activity?.lastActive && activity.lastActive >= subHours(now, 24);
  }).length;

  const activeUsers48h = allUsers.filter(u => {
    const activity = userActivity.get(u.id);
    return activity?.lastActive && activity.lastActive >= subHours(now, 48);
  }).length;

  const latestUsers = allUsers
    .filter(u => u.data().createdAt)
    .sort((a, b) => {
      const aTime = a.data().createdAt?.toMillis?.() || 0;
      const bTime = b.data().createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    })
    .slice(0, 6)
    .map(doc => ({ id: doc.id, ...doc.data() }));

  const latestMaps = allMaps.slice(0, 6).map(doc => ({ id: doc.id, ...doc.data() }));

  const topUsers = [...allUsers]
    .map(doc => {
      const userData = doc.data() as any;
      return {
        id: doc.id,
        ...userData,
        _computed: {
          totalMaps: userActivity.get(doc.id)?.mapsCreated || 0
        }
      };
    })
    .sort((a: any, b: any) => {
      const aStat = a._computed?.totalMaps || a.statistics?.totalMapsCreated || 0;
      const bStat = b._computed?.totalMaps || b.statistics?.totalMapsCreated || 0;
      return bStat - aStat;
    })
    .slice(0, 20);

  const topMaps = [...allMaps]
    .sort((a, b) => (b.data().views || 0) - (a.data().views || 0))
    .slice(0, 5)
    .map(doc => ({ id: doc.id, ...doc.data() }));

  const liveActivities: { id: string; type: 'user' | 'map'; message: string; timestamp: Date }[] = [];
  
  latestUsers.slice(0, 3).forEach((u: any) => {
    if (u.createdAt) {
      const ts = u.createdAt instanceof Timestamp 
        ? u.createdAt.toDate()
        : (u.createdAt?.toDate?.() || new Date(u.createdAt));
      liveActivities.push({
        id: `user-${u.id}`,
        type: 'user',
        message: `${u.displayName || 'A user'} joined MindScape`,
        timestamp: ts
      });
    }
  });
  
  latestMaps.slice(0, 3).forEach((m: any) => {
    if (m.timestamp) {
      const ts = m.timestamp instanceof Timestamp 
        ? m.timestamp.toDate()
        : (m.timestamp?.toDate?.() || new Date(m.timestamp));
      liveActivities.push({
        id: `map-${m.id}`,
        type: 'map',
        message: `"${m.title || m.topic || 'Untitled'}" was published`,
        timestamp: ts
      });
    }
  });
  
  liveActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const totalMaps = allMaps.length;
  const avgMapsPerUser = totalUsers > 0 ? (totalMindmapsEver / totalUsers) : 0;
  const avgChatsPerUser = totalChatsSnap.data().count && totalUsers > 0 
    ? (totalChatsSnap.data().count / totalUsers) 
    : 0;
  const engagementRate = totalUsers > 0 
    ? ((activeUsers24h / totalUsers) * 100) 
    : 0;

  const engagementScore = Math.min(50, (engagementRate / 20) * 50);
  const activityScore = Math.min(50, (avgMapsPerUser / 1.5) * 50);
  const healthScore = Math.round(engagementScore + activityScore);

  const mapAnalytics = await computeMapAnalytics(mindmapsByUser, allUsers);

  return {
    newUsersToday,
    newUsersYesterday,
    newMapsToday: heatmapDays.find(d => d.date === todayStr)?.newMaps || 0,
    newMapsYesterday: heatmapDays.find(d => d.date === yesterdayStr)?.newMaps || 0,
    activeUsers24h,
    activeUsers48h,
    engagementRate: Math.round(engagementRate * 10) / 10,
    totalMindmapsEver,
    healthScore,
    usersThisWeek,
    usersLastWeek: 0,
    mapsThisWeek,
    mapsLastWeek: 0,
    avgMapsPerUser: Math.round(avgMapsPerUser * 10) / 10,
    avgChatsPerUser: Math.round(avgChatsPerUser * 10) / 10,
    latestUsers,
    latestMaps,
    usersLast7Days: last7Days.map(d => ({ 
      date: format(d, 'yyyy-MM-dd'), 
      count: heatmapDays.find(h => h.date === format(d, 'yyyy-MM-dd'))?.newUsers || 0 
    })),
    mapsLast7Days: last7Days.map(d => ({ 
      date: format(d, 'yyyy-MM-dd'), 
      count: heatmapDays.find(h => h.date === format(d, 'yyyy-MM-dd'))?.newMaps || 0 
    })),
    topUsers,
    topMaps,
    heatmapDays,
    liveActivities,
    mapAnalytics
  };
}

async function computeMapAnalytics(
  mindmapsByUser: Map<string, any[]>,
  allUsers: any[]
): Promise<MapAnalytics> {
  const modeCounts = { single: 0, compare: 0, multi: 0 };
  const depthCounts = { low: 0, medium: 0, deep: 0, unspecified: 0 };
  const sourceCounts: Record<string, number> = {};
  const personaCounts: Record<string, number> = {
    Teacher: 0,
    Concise: 0,
    Creative: 0,
    Sage: 0,
  };
  const userStatsMap: Record<string, UserContributionStats> = {};
  let totalSubMaps = 0;
  const parentMapIds = new Set<string>();
  let publicCount = 0;
  let privateCount = 0;
  let totalNodes = 0;
  let featuredCount = 0;
  let mapCount = 0;

  for (const userDoc of allUsers) {
    const userId = userDoc.id;
    const userData = userDoc.data();
    
    userStatsMap[userId] = {
      userId,
      displayName: userData.displayName || userData.email || 'User',
      photoURL: userData.photoURL,
      totalMaps: 0,
      singleMaps: 0,
      compareMaps: 0,
      multiMaps: 0,
      lowDepthMaps: 0,
      mediumDepthMaps: 0,
      deepDepthMaps: 0,
      textSourceMaps: 0,
      pdfSourceMaps: 0,
      websiteSourceMaps: 0,
      youtubeSourceMaps: 0,
      imageSourceMaps: 0,
      publicMaps: 0
    };

    const userMaps = mindmapsByUser.get(userId) || [];

    for (const mapData of userMaps) {
      mapCount++;
      userStatsMap[userId].totalMaps++;

      // Multi-source detection
      const isMulti = mapData.mode === 'multi' || mapData.mode === 'multi-source' || 
                     mapData.sourceFileType === 'multi' || mapData.sourceType === 'multi' || 
                     (mapData.sourceFileContent && mapData.sourceFileContent.includes('--- SOURCE:'));

      const isCompare = mapData.mode === 'compare';

      if (isMulti) {
        modeCounts.multi++;
        userStatsMap[userId].multiMaps++;
      } else if (isCompare) {
        modeCounts.compare++;
        userStatsMap[userId].compareMaps++;
      } else {
        modeCounts.single++;
        userStatsMap[userId].singleMaps++;
      }

      // Depth classification
      let depth = mapData.depth;
      if (!depth || depth === 'auto' || depth === 'unspecified') {
          depth = (mapData.nodeCount || 0) > 75 ? 'deep' : (mapData.nodeCount || 0) > 35 ? 'medium' : 'low';
      }

      if (depth === 'low') {
        depthCounts.low++;
        userStatsMap[userId].lowDepthMaps++;
      } else if (depth === 'medium') {
        depthCounts.medium++;
        userStatsMap[userId].mediumDepthMaps++;
      } else if (depth === 'deep') {
        depthCounts.deep++;
        userStatsMap[userId].deepDepthMaps++;
      } else {
        depthCounts.unspecified++;
      }

      const sourceType = mapData.sourceFileType || mapData.sourceType || 'text';
      sourceCounts[sourceType] = (sourceCounts[sourceType] || 0) + 1;

      // Source-specific stats
      if (sourceType === 'text' || sourceType === 'document') {
        userStatsMap[userId].textSourceMaps++;
      } else if (sourceType === 'pdf') {
        userStatsMap[userId].pdfSourceMaps++;
      } else if (sourceType === 'website') {
        userStatsMap[userId].websiteSourceMaps++;
      } else if (sourceType === 'youtube') {
        userStatsMap[userId].youtubeSourceMaps++;
      } else if (sourceType === 'image') {
        userStatsMap[userId].imageSourceMaps++;
      }

      const personaRaw = mapData.aiPersona || mapData.persona;
      let persona = 'Teacher';
      const normalizedRaw = (personaRaw || '').toLowerCase().trim();
      if (normalizedRaw === 'teacher' || normalizedRaw === 'standard' || normalizedRaw === '' || !personaRaw) {
        persona = 'Teacher';
      } else if (normalizedRaw === 'concise') {
        persona = 'Concise';
      } else if (normalizedRaw === 'creative') {
        persona = 'Creative';
      } else if (normalizedRaw.includes('sage')) {
        persona = 'Sage';
      }
      personaCounts[persona] = (personaCounts[persona] || 0) + 1;

      // Deep Sub-map/Nested Logic
      const isChild = !!(mapData.isSubMap || mapData.parentMapId || mapData.parentId);
      const isParent = !!((mapData.nestedExpansions && mapData.nestedExpansions.length > 0) || mapData.hasSubMaps);

      if (isChild) {
        totalSubMaps++;
        const pId = mapData.parentMapId || mapData.parentId;
        if (pId) parentMapIds.add(pId);
      }
      
      if (isParent) {
        parentMapIds.add(mapData.id || 'unknown-parent');
      }

      if (mapData.isPublic) {
        publicCount++;
        userStatsMap[userId].publicMaps++;
      } else {
        privateCount++;
      }

      totalNodes += mapData.nodeCount || 0;
      if (mapData.isFeatured) featuredCount++;
    }
  }

  const topPersona = Object.entries(personaCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Teacher';
  const userStats = Object.values(userStatsMap).sort((a, b) => b.totalMaps - a.totalMaps);

  return {
    totalAnalyzed: mapCount,
    modeCounts,
    depthCounts,
    sourceCounts,
    personaCounts,
    subMapStats: {
      total: totalSubMaps,
      parents: parentMapIds.size,
      avgPerParent: parentMapIds.size > 0 ? (totalSubMaps / parentMapIds.size).toFixed(1) : '0'
    },
    publicPrivate: { public: publicCount, private: privateCount },
    avgNodesPerMap: mapCount > 0 ? (totalNodes / mapCount).toFixed(1) : '0',
    featuredCount,
    topPersona,
    userStats
  };
}

export async function fetchAllUsers(firestore: Firestore): Promise<any[]> {
  const snapshot = await getDocs(query(collection(firestore, 'users'), limit(100)));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
