import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { rateLimit, createRateLimitResponse, getClientIdentifier } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const ALLOWED_CATEGORIES = new Set(['page', 'ai', 'map', 'chat', 'engagement', 'performance', 'error']);
const MAX_EVENTS_PER_REQUEST = 50;
const MAX_EVENT_NAME_LENGTH = 120;
const MAX_SESSION_ID_LENGTH = 200;
const MAX_USER_ID_LENGTH = 100;
const MAX_PROPERTY_LENGTH = 500; // per-string cap inside properties/metadata
const MAX_BODY_BYTES = 256 * 1024; // 256 KB cap

/** Recursively truncates/sanitizes arbitrary client-controlled JSON. */
function truncateDeep(value: unknown, depth = 0, budget: { remaining: number }): unknown {
  if (budget.remaining <= 0) return null;
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    budget.remaining -= value.length;
    return value.length > MAX_PROPERTY_LENGTH ? value.slice(0, MAX_PROPERTY_LENGTH) : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (depth >= 4) return null;
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (const item of value) {
      if (out.length >= 20) break;
      out.push(truncateDeep(item, depth + 1, budget));
    }
    return out;
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (Object.keys(out).length >= 20) break;
      out[k] = truncateDeep(v, depth + 1, budget);
    }
    return out;
  }
  return null;
}

export async function POST(request: Request) {
  try {
    // P0: Rate-limit anonymous + authenticated clients alike to prevent
    // unbounded flooding of the analytics_events table.
    const clientId = getClientIdentifier(request);
    const rateLimitResult = rateLimit(clientId, 'analytics');
    const rateLimitResponse = createRateLimitResponse(rateLimitResult);
    if (rateLimitResponse) return rateLimitResponse;

    // Payload size cap before parsing.
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ success: false, error: 'Payload too large' }, { status: 413 });
    }
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ success: false, error: 'Payload too large' }, { status: 413 });
    }

    const body = JSON.parse(raw);
    const { events } = body;

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ success: true, message: 'No events to process' });
    }

    // Cap the number of events per request.
    const cappedEvents = events.slice(0, MAX_EVENTS_PER_REQUEST);

    const supabase = getSupabaseAdmin();

    if (!supabase) {
      console.warn('[AnalyticsAPI] Supabase not initialized, skipping analytics write');
      return NextResponse.json({ success: false, error: 'Supabase not initialized' }, { status: 500 });
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const monthStr = dateStr.substring(0, 7);

    // Validate + sanitize each event before insert.
    const eventsToInsert: any[] = [];
    for (const event of cappedEvents) {
      if (!event || typeof event !== 'object') continue;

      const eventName = typeof event.eventName === 'string' ? event.eventName.slice(0, MAX_EVENT_NAME_LENGTH) : '';
      if (!eventName) continue;

      const category = typeof event.category === 'string' && ALLOWED_CATEGORIES.has(event.category)
        ? event.category
        : 'engagement';
      const sessionId = typeof event.sessionId === 'string'
        ? event.sessionId.slice(0, MAX_SESSION_ID_LENGTH)
        : 'unknown';
      const timestamp = typeof event.timestamp === 'number' && Number.isFinite(event.timestamp)
        ? event.timestamp
        : Date.now();
      const userId = typeof event.userId === 'string' && event.userId.length <= MAX_USER_ID_LENGTH
        ? event.userId
        : null;
      const duration = typeof event.duration === 'number' && Number.isFinite(event.duration) && event.duration >= 0
        ? event.duration
        : null;

      const budget = { remaining: 2000 };
      const properties = truncateDeep(event.properties ?? {}, 0, budget) as Record<string, any> | null;
      const metadata = truncateDeep(event.metadata ?? {}, 0, budget) as Record<string, any> | null;

      eventsToInsert.push({
        event_name: eventName,
        category,
        properties: properties ?? {},
        timestamp,
        session_id: sessionId,
        user_id: userId,
        duration,
        metadata: metadata ?? {},
        received_at: now.toISOString(),
        date: dateStr,
        month: monthStr,
      });
    }

    if (eventsToInsert.length === 0) {
      return NextResponse.json({ success: true, message: 'No valid events to process' });
    }

    const { error } = await supabase.from('analytics_events').insert(eventsToInsert);

    if (error) {
      console.error('[AnalyticsAPI] Database error:', error);
      throw error;
    }

    return NextResponse.json({ success: true, processed: eventsToInsert.length });
  } catch (error: any) {
    console.error('[AnalyticsAPI] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
