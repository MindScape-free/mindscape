import { NextResponse } from 'next/server';
import { initializeFirebaseServer } from '@/firebase/server';

export const runtime = 'nodejs';

interface AnalyticsEvent {
  eventName: string;
  category: 'page' | 'ai' | 'map' | 'chat' | 'engagement' | 'performance' | 'error';
  properties?: Record<string, any>;
  timestamp: number;
  sessionId: string;
  userId?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

export async function POST(request: Request) {
  try {
    const { events } = await request.json();

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ success: true, message: 'No events to process' });
    }

    const { admin, firestore } = initializeFirebaseServer();

    if (!firestore || !admin) {
      console.warn('[AnalyticsAPI] Firebase not initialized, skipping analytics write');
      return NextResponse.json({ success: false, error: 'Firebase not initialized' }, { status: 500 });
    }

    const batch = firestore.batch();
    const analyticsRef = firestore.collection('analyticsEvents');

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const monthStr = dateStr.substring(0, 7);

    events.forEach((event: AnalyticsEvent) => {
      const eventRef = analyticsRef.doc();
      batch.set(eventRef, {
        ...event,
        receivedAt: admin.firestore.Timestamp.now(),
        date: dateStr,
        month: monthStr,
      });
    });

    await batch.commit();

    return NextResponse.json({ success: true, processed: events.length });
  } catch (error: any) {
    console.error('[AnalyticsAPI] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
