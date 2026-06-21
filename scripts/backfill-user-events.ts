/**
 * Backfill User Events from Existing User Statistics
 *
 * Reads all users from the `users` table, then creates `user_events`
 * rows for each user's historical activity (stored in the `activity` JSONB
 * and `statistics` JSONB columns).
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/backfill-user-events.ts
 *
 * The script is idempotent: it checks whether events already exist for a
 * given user before creating new ones. You can re-run safely.
 *
 * What gets created:
 *   - One `login` event per user (at their created_at date)
 *   - One `map_created` event per map in their daily activity
 *   - One `image_generated` event per image in their daily activity
 *   - One `study_time` event per day with study time
 *   - One `node_expanded` event per day with node additions
 *   - One `chat_sent` event per chat in their daily activity
 *   - Fallback events from aggregate statistics (if no daily activity)
 */

import { createClient } from '@supabase/supabase-js';
import * as readline from 'node:readline/promises';

// ── Config ────────────────────────────────────────────────────

const BATCH_SIZE = 50;
const EVENT_CHUNK_SIZE = 500;

// ── Helpers ───────────────────────────────────────────────────

function safeInt(val: any, fallback: number = 0): number {
  const n = parseInt(val, 10);
  return isNaN(n) ? fallback : n;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Event Type ────────────────────────────────────────────────

type UserEventType =
  | 'login'
  | 'map_created'
  | 'image_generated'
  | 'study_time'
  | 'node_expanded'
  | 'chat_sent'
  | 'map_deleted'
  | 'map_viewed'
  | 'map_shared'
  | 'map_exported'
  | 'page_viewed'
  | 'search_performed'
  | 'session_end'
  | 'explanation_requested'
  | 'quiz_generated';

interface UserEventInsert {
  user_id: string;
  event_type: UserEventType;
  event_data: Record<string, any>;
  source: string;
  created_at: string;
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    console.error('');
    console.error('Usage:');
    console.error('  NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/backfill-user-events.ts');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  console.log('🧠 MindScape User Events Backfill');
  console.log('═══════════════════════════════════════');
  console.log('');

  // ── Step 1: Verify the user_events table exists ─────────
  console.log('🔍 Verifying user_events table exists...');
  const { error: tableCheck } = await supabase
    .from('user_events')
    .select('id', { count: 'exact', head: true })
    .limit(1);

  if (tableCheck && tableCheck.message?.includes('does not exist')) {
    console.error('❌ The `user_events` table does not exist.');
    console.error('   Run the migration first: supabase db push');
    process.exit(1);
  }
  console.log('✅ user_events table exists.');
  console.log('');

  // ── Step 2: Count total users ───────────────────────────
  console.log('👥 Counting users...');
  const { count: totalUsers, error: countError } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true });

  if (countError || !totalUsers) {
    console.error('❌ Failed to count users:', countError?.message);
    process.exit(1);
  }

  console.log(`   Found ${totalUsers} users.`);
  console.log('');

  // ── Step 3: Confirm ─────────────────────────────────────
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await rl.question(`⚠️  This will create historical user_events for all ${totalUsers} users. Continue? (y/N) `);
  rl.close();

  if (answer.toLowerCase() !== 'y') {
    console.log('Aborted.');
    process.exit(0);
  }

  console.log('');

  // ── Step 4: Process users in batches ────────────────────
  let totalEventsCreated = 0;
  let usersWithEvents = 0;
  let usersSkipped = 0;
  let processedUsers = 0;

  for (let offset = 0; offset < totalUsers; offset += BATCH_SIZE) {
    const batchNum = Math.floor(offset / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(totalUsers / BATCH_SIZE);
    console.log(`📦 Processing batch ${batchNum}/${totalBatches}...`);

    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id, created_at, statistics, activity')
      .order('created_at', { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);

    if (fetchError || !users) {
      console.error(`   ❌ Failed to fetch batch: ${fetchError?.message}`);
      await delay(1000);
      continue;
    }

    for (const user of users) {
      processedUsers++;
      const userId = user.id;
      const stats = user.statistics || {};
      const activity = user.activity || {};
      const createdAt = user.created_at;

      // Check if this user already has events (idempotency)
      const { count: existingCount } = await supabase
        .from('user_events')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .limit(1);

      if (existingCount && existingCount > 0) {
        usersSkipped++;
        continue;
      }

      const events: UserEventInsert[] = [];

      // Helper: add an event at a specific date
      const addEvent = (
        eventType: UserEventType,
        dateStr: string,
        eventData: Record<string, any> = {},
        source: string = 'backfill'
      ) => {
        const timestamp = `${dateStr}T12:00:00.000Z`;
        events.push({
          user_id: userId,
          event_type: eventType,
          event_data: eventData,
          source,
          created_at: timestamp,
        });
      };

      // Parse activity dates
      const activityDates = Object.keys(activity).sort();

      if (activityDates.length > 0) {
        // Process daily activity
        for (const dateStr of activityDates) {
          const day = activity[dateStr];
          if (!day) continue;

          const maps = safeInt(day.mapsCreated);
          const images = safeInt(day.imagesGenerated);
          const studyMins = safeInt(day.studyTimeMinutes);
          const nodes = safeInt(day.nodesCreated);
          const chats = safeInt(day.chatsCount);
          const nested = safeInt(day.nestedExpansions);

          for (let i = 0; i < maps; i++) {
            addEvent('map_created', dateStr, { source: 'backfill' }, 'canvas');
          }

          for (let i = 0; i < images; i++) {
            addEvent('image_generated', dateStr, { source: 'backfill' }, 'canvas');
          }

          if (studyMins > 0) {
            addEvent('study_time', dateStr, { minutes: studyMins }, 'canvas');
          }

          if (nodes > 0) {
            addEvent('node_expanded', dateStr, { nodesAdded: nodes }, 'canvas');
          }

          if (nested > 0) {
            addEvent('node_expanded', dateStr, { nodesAdded: nested, fromNested: true }, 'map');
          }

          for (let i = 0; i < chats; i++) {
            addEvent('chat_sent', dateStr, {}, 'chat');
          }
        }
      } else {
        // No daily activity — infer from aggregate stats
        // Emit INDIVIDUAL events so recompute_user_profile() counts correctly
        const totalMaps = safeInt(stats.totalMapsCreated);
        const totalImages = safeInt(stats.totalImagesGenerated);
        const totalStudyMins = safeInt(stats.totalStudyTimeMinutes);
        const totalNodes = safeInt(stats.totalNodes);
        const totalChats = safeInt(stats.totalChats);
        const lastActive = stats.lastActiveDate;

        const fallbackDate = lastActive || (createdAt ? createdAt.substring(0, 10) : new Date().toISOString().substring(0, 10));

        // Emit individual events for accurate counting by PL/pgSQL
        for (let i = 0; i < totalMaps; i++) {
          addEvent('map_created', fallbackDate, { source: 'aggregate' }, 'canvas');
        }
        for (let i = 0; i < totalImages; i++) {
          addEvent('image_generated', fallbackDate, { source: 'aggregate' }, 'canvas');
        }
        if (totalStudyMins > 0) {
          addEvent('study_time', fallbackDate, { minutes: totalStudyMins, source: 'aggregate' }, 'canvas');
        }
        if (totalNodes > 0) {
          addEvent('node_expanded', fallbackDate, { nodesAdded: totalNodes, source: 'aggregate' }, 'canvas');
        }
        for (let i = 0; i < totalChats; i++) {
          addEvent('chat_sent', fallbackDate, { source: 'aggregate' }, 'chat');
        }
      }

      // Always create a login event at the user's creation time
      if (createdAt) {
        const loginDate = createdAt.substring(0, 10);
        addEvent('login', loginDate, { backfill: true }, 'auth');
      }

      // Insert events in chunks
      if (events.length > 0) {
        for (let i = 0; i < events.length; i += EVENT_CHUNK_SIZE) {
          const chunk = events.slice(i, i + EVENT_CHUNK_SIZE);
          const { error: insertError } = await supabase
            .from('user_events')
            .insert(chunk);

          if (insertError) {
            console.error(`   ❌ Failed to insert events for user ${userId}: ${insertError.message}`);
            // Fall back to single inserts
            for (const event of chunk) {
              const { error: singleError } = await supabase
                .from('user_events')
                .insert(event);
              if (singleError) {
                console.error(`   ❌ Failed to insert single event: ${singleError.message}`);
              } else {
                totalEventsCreated++;
              }
            }
          } else {
            totalEventsCreated += chunk.length;
          }
        }
        usersWithEvents++;
      } else {
        // No activity data at all — just create a login event
        if (createdAt) {
          const loginDate = createdAt.substring(0, 10);
          const { error: loginError } = await supabase.from('user_events').insert({
            user_id: userId,
            event_type: 'login',
            event_data: { backfill: true },
            source: 'auth',
            created_at: `${loginDate}T12:00:00.000Z`,
          });

          if (!loginError) {
            totalEventsCreated++;
            usersWithEvents++;
          }
        }
      }
    }

    // Progress
    console.log(`   Progress: ${processedUsers}/${totalUsers} users, ${totalEventsCreated} events created, ${usersSkipped} skipped`);

    await delay(500);
  }

  // ── Step 5: Summary ──────────────────────────────────────
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('✅ Backfill Complete!');
  console.log('');
  console.log(`   Users processed:  ${processedUsers}`);
  console.log(`   Users with events: ${usersWithEvents}`);
  console.log(`   Users skipped:    ${usersSkipped}`);
  console.log(`   Events created:   ${totalEventsCreated}`);
  console.log('');

  // ── Step 6: Verify totals ────────────────────────────────
  console.log('🔍 Verifying...');
  const { count: eventCount } = await supabase
    .from('user_events')
    .select('id', { count: 'exact', head: true });

  console.log(`   Total events in user_events table: ${eventCount || 0}`);

  const { data: distinctUsers } = await supabase
    .from('user_events')
    .select('user_id');

  const uniqueUsers = distinctUsers ? new Set(distinctUsers.map((e: any) => e.user_id)).size : 0;
  console.log(`   Unique users with events: ${uniqueUsers}`);

  console.log('');
  console.log('🎉 Done! Run `recompute_platform_stats()` via SQL to refresh the materialized tables.');
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
