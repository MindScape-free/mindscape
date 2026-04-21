import { getSupabaseAdmin } from '@/lib/supabase-server';

export interface AdminStats {
  totalCreated: number;
  activeCount: number;
  deletedCount: number;
  publicCount: number;
  privateCount: number;
  totalNodes: number;
  lastUpdatedAt: number;
}

export interface MindmapListItem {
  id: string;
  userId: string;
  title: string;
  summary?: string;
  mode: string;
  depth: string;
  isPublic: boolean;
  isDeleted: boolean;
  nodeCount: number;
  views: number;
  createdAt: number;
  updatedAt: number;
  sourceType?: string;
  persona?: string;
}

function sanitizeTimestamp(value: any): number {
  if (!value) return 0;
  if (typeof value.toDate === 'function') {
    return value.toDate().getTime();
  }
  if (typeof value === 'number') return value;
  if (typeof value === 'string' || typeof value === 'object') {
    const date = new Date(value as any);
    return isNaN(date.getTime()) ? 0 : date.getTime();
  }
  return 0;
}

export async function getAdminStats(): Promise<AdminStats> {
  const { supabase } = { supabase: getSupabaseAdmin() };
  
  if (!supabase) {
    throw new Error('Firebase not initialized');
  }

  let total = 0;
  let active = 0;
  let deleted = 0;
  let publicCount = 0;
  let privateCount = 0;
  let totalNodes = 0;

  try {
    const snapshot = await supabase.collectionGroup('mindmaps').get();
    
    snapshot.forEach((doc: any) => {
      const data = doc.data();
      total++;

      if (data.isDeleted === true || data.deleted === true) {
        deleted++;
      } else {
        active++;
        
        if (data.isPublic === true) {
          publicCount++;
        } else {
          privateCount++;
        }
        
        totalNodes += data.nodeCount || data.nodeCountInt || 0;
      }
    });
  } catch (error: any) {
    console.warn('[AdminService] collectionGroup query failed, falling back:', error.message);
    const fallbackResult = await getAdminStatsFallback();
    return fallbackResult;
  }

  return {
    totalCreated: total,
    activeCount: active,
    deletedCount: deleted,
    publicCount,
    privateCount,
    totalNodes,
    lastUpdatedAt: Date.now(),
  };
}

async function getAdminStatsFallback(): Promise<AdminStats> {
  const { supabase } = { supabase: getSupabaseAdmin() };
  
  if (!supabase) {
    throw new Error('Firebase not initialized');
  }

  let total = 0;
  let active = 0;
  let deleted = 0;
  let publicCount = 0;
  let privateCount = 0;
  let totalNodes = 0;

  const usersSnap = await supabase.collection('users').get();
  
  await Promise.all(
    usersSnap.docs.map(async (userDoc: any) => {
      try {
        const mapsSnap = await supabase
          .collection('users')
          .doc(userDoc.id)
          .collection('mindmaps')
          .get();
        
        mapsSnap.forEach((mapDoc: any) => {
          const data = mapDoc.data();
          total++;

          if (data.isDeleted === true || data.deleted === true) {
            deleted++;
          } else {
            active++;
            
            if (data.isPublic === true) {
              publicCount++;
            } else {
              privateCount++;
            }
            
            totalNodes += data.nodeCount || data.nodeCountInt || 0;
          }
        });
      } catch {
        // Skip users with permission issues
      }
    })
  );

  return {
    totalCreated: total,
    activeCount: active,
    deletedCount: deleted,
    publicCount,
    privateCount,
    totalNodes,
    lastUpdatedAt: Date.now(),
  };
}

export async function getMindmapsList(options: {
  limit?: number;
  startAfterDoc?: string;
  startAfterTime?: number;
  filterDeleted?: boolean;
} = {}): Promise<{
  data: MindmapListItem[];
  lastDoc: any;
  hasMore: boolean;
}> {
  const { supabase } = { supabase: getSupabaseAdmin() };
  
  if (!supabase) {
    throw new Error('Firebase not initialized');
  }

  const { limit = 20, startAfterDoc, startAfterTime, filterDeleted = true } = options;

  let query: any = supabase
    .collectionGroup('mindmaps')
    .orderBy('createdAt', 'desc')
    .limit(limit);

  if (startAfterDoc && startAfterTime) {
    query = query.startAfter(startAfterTime, startAfterDoc);
  }

  let snapshot;
  try {
    snapshot = await query.get();
  } catch (error: any) {
    console.warn('[AdminService] Pagination query failed:', error.message);
    return { data: [], lastDoc: null, hasMore: false };
  }

  const data: MindmapListItem[] = [];
  
  snapshot.forEach((doc: any) => {
    const mapData = doc.data();
    
    if (filterDeleted && (mapData.isDeleted === true || mapData.deleted === true)) {
      return;
    }

    const pathParts = doc.ref.path.split('/');
    const userId = pathParts.length > 1 ? pathParts[1] : 'unknown';

    data.push({
      id: doc.id,
      userId,
      title: mapData.title || mapData.topic || mapData.shortTitle || 'Untitled',
      summary: mapData.summary || '',
      mode: mapData.mode || 'single',
      depth: mapData.depth || 'medium',
      isPublic: mapData.isPublic === true,
      isDeleted: mapData.isDeleted === true || mapData.deleted === true,
      nodeCount: mapData.nodeCount || mapData.nodeCountInt || 0,
      views: mapData.views || mapData.publicViews || 0,
      createdAt: sanitizeTimestamp(mapData.createdAt),
      updatedAt: sanitizeTimestamp(mapData.updatedAt || mapData.timestamp),
      sourceType: mapData.sourceType || mapData.sourceFileType,
      persona: mapData.aiPersona || mapData.persona,
    });
  });

  const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
  const hasMore = snapshot.docs.length === limit;

  return { data, lastDoc, hasMore };
}

export async function getMindmapsByUser(userId: string, options: {
  limit?: number;
  includeDeleted?: boolean;
} = {}): Promise<MindmapListItem[]> {
  const { supabase } = { supabase: getSupabaseAdmin() };
  
  if (!supabase) {
    throw new Error('Firebase not initialized');
  }

  const { limit = 100, includeDeleted = false } = options;

  let query: any = supabase
    .collection('users')
    .doc(userId)
    .collection('mindmaps')
    .orderBy('createdAt', 'desc')
    .limit(limit);

  const snapshot = await query.get();
  const data: MindmapListItem[] = [];

  snapshot.forEach((doc: any) => {
    const mapData = doc.data();
    
    if (!includeDeleted && (mapData.isDeleted === true || mapData.deleted === true)) {
      return;
    }

    data.push({
      id: doc.id,
      userId,
      title: mapData.title || mapData.topic || mapData.shortTitle || 'Untitled',
      summary: mapData.summary || '',
      mode: mapData.mode || 'single',
      depth: mapData.depth || 'medium',
      isPublic: mapData.isPublic === true,
      isDeleted: mapData.isDeleted === true || mapData.deleted === true,
      nodeCount: mapData.nodeCount || mapData.nodeCountInt || 0,
      views: mapData.views || mapData.publicViews || 0,
      createdAt: sanitizeTimestamp(mapData.createdAt),
      updatedAt: sanitizeTimestamp(mapData.updatedAt || mapData.timestamp),
      sourceType: mapData.sourceType || mapData.sourceFileType,
      persona: mapData.aiPersona || mapData.persona,
    });
  });

  return data;
}
