import { NextResponse } from 'next/server';
import { initializeFirebaseServer } from '@/firebase/server';

interface SyncResult {
  success: boolean;
  timestamp: string;
  counts: {
    totalUsers: number;
    totalMaps: number;
    publicMaps: number;
    totalMindmaps: number;
    totalChats: number;
    activeUsers24h: number;
  };
  message?: string;
}

export async function POST(request: Request) {
  try {
    const { app, firestore } = initializeFirebaseServer();
    
    if (!app || !firestore) {
      return NextResponse.json({ 
        success: false, 
        error: 'Firebase not initialized' 
      }, { status: 500 });
    }

    const now = new Date();
    const timestamp = now.toISOString();
    const dateStr = timestamp.split('T')[0];

    const counts = {
      totalUsers: 0,
      totalMaps: 0,
      publicMaps: 0,
      totalMindmaps: 0,
      totalChats: 0,
      activeUsers24h: 0,
    };

    try {
      const usersSnap = await firestore.collection('users').count().get();
      counts.totalUsers = usersSnap.data().count;
    } catch (e) {
      console.error('Error counting users:', e);
    }

    try {
      const publicMapsSnap = await firestore.collection('publicMindmaps').count().get();
      counts.publicMaps = publicMapsSnap.data().count;
    } catch (e) {
      console.error('Error counting public maps:', e);
    }

    try {
      const usersSnap = await firestore.collection('users').get();
      let totalMindmaps = 0;
      let activeUsers24h = 0;
      
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      for (const userDoc of usersSnap.docs) {
        try {
          const userMapsSnap = await firestore.collection(`users/${userDoc.id}/mindmaps`).count().get();
          totalMindmaps += userMapsSnap.data().count;
        } catch {}
        
        const userData = userDoc.data();
        if (userData.statistics?.lastActiveDate) {
          const lastActive = new Date(userData.statistics.lastActiveDate);
          if (lastActive > yesterday) {
            activeUsers24h++;
          }
        }
      }
      
      counts.totalMindmaps = totalMindmaps;
      counts.activeUsers24h = activeUsers24h;
    } catch (e) {
      console.error('Error counting mindmaps:', e);
    }

    try {
      const chatsSnap = await firestore.collectionGroup('chatSessions').count().get();
      counts.totalChats = chatsSnap.data().count;
    } catch (e) {
      console.error('Error counting chats:', e);
    }

    counts.totalMaps = counts.publicMaps;

    const statsData = {
      date: dateStr,
      timestamp: timestamp,
      totalUsers: counts.totalUsers,
      totalMaps: counts.totalMaps,
      totalMindmaps: counts.totalMindmaps,
      totalChats: counts.totalChats,
      dailyActiveUsers: counts.activeUsers24h,
      syncedAt: timestamp,
    };

    await firestore.collection('adminStats').doc(timestamp).set(statsData);

    const cleanupDocs = await firestore.collection('adminStats')
      .orderBy('timestamp', 'desc')
      .offset(10)
      .limit(100)
      .get();
    
    const batch = firestore.batch();
    cleanupDocs.docs.forEach((d: any) => batch.delete(d.ref));
    await batch.commit();

    await firestore.collection('adminActivityLog').add({
      timestamp: timestamp,
      type: 'BACKEND_SYNC',
      targetType: 'system',
      details: `Backend sync completed: ${counts.totalUsers} users, ${counts.totalMindmaps} mindmaps, ${counts.publicMaps} public maps, ${counts.totalChats} chats, ${counts.activeUsers24h} active (24h)`,
      performedBy: 'system'
    });

    const result: SyncResult = {
      success: true,
      timestamp,
      counts,
      message: 'Sync completed successfully'
    };

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Admin sync error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return POST(new Request('http://localhost'));
}
