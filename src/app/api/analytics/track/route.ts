import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

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

    const supabase = getSupabaseAdmin();

    if (!supabase) {
      console.warn('[AnalyticsAPI] Supabase not initialized, skipping analytics write');
      return NextResponse.json({ success: false, error: 'Supabase not initialized' }, { status: 500 });
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const monthStr = dateStr.substring(0, 7);

    // Prepare events for insertion into Supabase
    const eventsToInsert = events.map((event: AnalyticsEvent) => ({
      event_name: event.eventName,
      category: event.category,
      properties: event.properties || {},
      timestamp: event.timestamp,
      session_id: event.sessionId,
      user_id: event.userId || null,
      duration: event.duration || null,
      metadata: event.metadata || {},
      received_at: now.toISOString(),
      date: dateStr,
      month: monthStr,
    }));

    const { error } = await supabase.from('analytics_events').insert(eventsToInsert);

    if (error) {
      console.error('[AnalyticsAPI] Database error:', error);
      throw error;
    }

    return NextResponse.json({ success: true, processed: events.length });
  } catch (error: any) {
    console.error('[AnalyticsAPI] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

