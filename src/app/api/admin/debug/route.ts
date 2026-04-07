import { NextResponse } from 'next/server';
import { initializeFirebaseServer } from '@/firebase/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const { admin, app, firestore } = initializeFirebaseServer();
    
    if (!app || !firestore || !admin) {
      return NextResponse.json({ 
        success: false, 
        error: 'Firebase not initialized',
        details: { app: !!app, firestore: !!firestore, admin: !!admin }
      }, { status: 500 });
    }

    // Test fetching users
    const usersSnap = await firestore.collection('users').limit(10).get();
    const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    // Test fetching stats
    const statsDoc = await firestore.collection('adminStats').doc('all-time').get();
    const stats = statsDoc.exists ? statsDoc.data() : null;
    
    // Test fetching logs
    const logsSnap = await firestore.collection('adminActivityLog').limit(5).get();
    const logs = logsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    return NextResponse.json({
      success: true,
      firebase: {
        projectId: process.env.FIREBASE_PROJECT_ID || 'mindscape-free',
        hasCredentials: true,
      },
      data: {
        usersCount: usersSnap.size,
        statsExists: statsDoc.exists,
        logsCount: logsSnap.size,
      },
      sampleUsers: users.slice(0, 3),
      sampleLogs: logs.slice(0, 3),
    });
  } catch (error: any) {
    console.error('[DebugAPI] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
