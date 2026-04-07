import { initializeFirebaseServer } from '@/firebase/server';

export interface ActivityLogEntry {
  type: string;
  userId?: string;
  userEmail?: string;
  performedBy?: string;
  targetType?: string;
  targetId?: string;
  details?: string;
  metadata?: Record<string, any>;
  timestamp?: string;
}

export async function logAdminActivity(entry: ActivityLogEntry): Promise<{ success: boolean; error?: string }> {
  const { admin, firestore } = initializeFirebaseServer();

  if (!firestore || !admin) {
    console.error('[ActivityService] Firebase Admin not available');
    return { success: false, error: 'Firebase Admin not initialized' };
  }

  try {
    const timestamp = entry.timestamp || new Date().toISOString();
    const dateObj = new Date(timestamp);
    const dateStr = dateObj.toISOString().split('T')[0];
    const monthStr = dateStr.substring(0, 7);

    await firestore.collection('adminActivityLog').add({
      ...entry,
      timestamp,
      createdAt: admin.firestore.Timestamp.now(),
    });

    const type = entry.type;
    const increments: Record<string, any> = {};

    if (type === 'MAP_CREATED') {
      increments.totalMindmapsEver = admin.firestore.FieldValue.increment(1);
      increments.newMapsToday = admin.firestore.FieldValue.increment(1);
      const isSubMap = entry.metadata?.isSubMap === true || !!entry.metadata?.parentMapId;
      if (!isSubMap) {
        increments.totalMindmaps = admin.firestore.FieldValue.increment(1);
      }
    } else if (type === 'USER_CREATED') {
      increments.totalUsers = admin.firestore.FieldValue.increment(1);
      increments.newUsersToday = admin.firestore.FieldValue.increment(1);
    } else if (type === 'LOGIN') {
      increments.activeUsers = admin.firestore.FieldValue.increment(1);
    } else if (type === 'MAP_DELETED') {
      increments.totalMindmaps = admin.firestore.FieldValue.increment(-1);
    } else if (type === 'CHAT_CREATED') {
      increments.totalChats = admin.firestore.FieldValue.increment(1);
    }

    if (Object.keys(increments).length > 0) {
      const statsBatch = firestore.batch();
      
      const allTimeRef = firestore.collection('adminStats').doc('all-time');
      statsBatch.set(allTimeRef, { 
        ...increments, 
        lastUpdated: Date.now(),
        timestamp: new Date().toISOString() 
      }, { merge: true });

      const dailyRef = firestore.collection('adminStats').doc(`daily_${dateStr}`);
      statsBatch.set(dailyRef, { 
        ...increments,
        date: dateStr,
        lastUpdated: Date.now(),
        timestamp: new Date().toISOString()
      }, { merge: true });

      const monthlyRef = firestore.collection('adminStats').doc(`monthly_${monthStr}`);
      statsBatch.set(monthlyRef, { 
        ...increments,
        month: monthStr,
        lastUpdated: Date.now(),
        timestamp: new Date().toISOString()
      }, { merge: true });

      await statsBatch.commit();
    }

    return { success: true };
  } catch (error: any) {
    console.error('[ActivityService] Error:', error);
    return { success: false, error: error.message };
  }
}

export async function getActivityLogs(options: {
  limit?: number;
  startAfter?: string;
  type?: string;
  userId?: string;
} = {}): Promise<{ logs: any[]; lastDoc: any; hasMore: boolean }> {
  const { admin, firestore } = initializeFirebaseServer();

  if (!firestore || !admin) {
    return { logs: [], lastDoc: null, hasMore: false };
  }

  const { limit = 50, startAfter, type, userId } = options;

  let query: any = firestore
    .collection('adminActivityLog')
    .orderBy('timestamp', 'desc')
    .limit(limit);

  if (type) {
    query = query.where('type', '==', type);
  }

  if (userId) {
    query = query.where('userId', '==', userId);
  }

  if (startAfter) {
    const docSnap = await firestore.collection('adminActivityLog').doc(startAfter).get();
    if (docSnap.exists) {
      query = query.startAfter(docSnap);
    }
  }

  const snapshot = await query.get();
  const logs = snapshot.docs.map((doc: any) => ({
    id: doc.id,
    ...doc.data(),
    timestamp: doc.data().timestamp || doc.data().createdAt?.toDate?.()?.toISOString(),
  }));

  const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
  const hasMore = snapshot.docs.length === limit;

  return { logs, lastDoc: lastDoc?.id || null, hasMore };
}
