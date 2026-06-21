/**
 * Backfill Node Counts
 *
 * Fixes admin dashboard Active Nodes and Global Nodes showing 0.
 *
 * Root Cause:
 *   user_events (map_created) backfilled without node_count in event_data.
 *   Recompute pipeline only reads user_events.event_data->>\"node_count\",
 *   so user_profiles.total_nodes = 0 and platform_stats.total_nodes = 0.
 *
 * Fix:
 *   1. Query mindmaps, group by user_id, sum node_count
 *   2. Update user_profiles.total_nodes for each user
 *   3. Call recompute_platform_stats() to roll up into platform_stats
 */
 
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

async function main() {
  console.log('Step 1: Computing actual total_nodes from mindmaps...');

  const { data: mindmaps, error: mmError } = await supabase
    .from('mindmaps')
    .select('user_id, node_count');

  if (mmError) {
    console.error('Failed to query mindmaps:', mmError.message);
    process.exit(1);
  }

  if (!mindmaps || mindmaps.length === 0) {
    console.log('No mindmaps found.');
    process.exit(0);
  }

  console.log('Found', mindmaps.length, 'total mindmap records');

  const nodeCountsByUser = new Map<string, number>();
  let totalNodeCount = 0;

  for (const map of mindmaps) {
    const count = map.node_count || 0;
    totalNodeCount += count;
    const userId = map.user_id;
    if (!userId) continue;
    nodeCountsByUser.set(userId, (nodeCountsByUser.get(userId) || 0) + count);
  }

  console.log('Total nodes across all mindmaps:', totalNodeCount);
  console.log('Users with mindmaps:', nodeCountsByUser.size);

  console.log('\nStep 2: Updating user_profiles.total_nodes...');

  let updatedCount = 0;
  for (const [userId, nodeCount] of nodeCountsByUser) {
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('user_id, total_nodes')
      .eq('user_id', userId)
      .single();

    if (existingProfile) {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          total_nodes: nodeCount,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Failed to update user', userId.substring(0, 8) + '...:', updateError.message);
      } else {
        console.log('Updated user', userId.substring(0, 8) + '...:', existingProfile.total_nodes, '->', nodeCount);
        updatedCount++;
      }
    } else {
      const { data: userData } = await supabase
        .from('users')
        .select('id, email, display_name, photo_url, created_at')
        .eq('id', userId)
        .single();

      if (userData) {
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: userId,
            email: userData.email,
            display_name: userData.display_name,
            photo_url: userData.photo_url,
            created_at: userData.created_at,
            total_maps: 0,
            total_chats: 0,
            total_nodes: nodeCount,
            total_images: 0,
            total_expansions: 0,
            study_time_minutes: 0,
            current_streak: 0,
            longest_streak: 0,
            mode_breakdown: {},
            depth_breakdown: {},
            source_breakdown: {},
            persona_breakdown: {},
            daily_activity: {},
            updated_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error('Failed to create profile for user', userId.substring(0, 8) + '...:', insertError.message);
        } else {
          console.log('Created profile for user', userId.substring(0, 8) + '...:', 'total_nodes =', nodeCount);
          updatedCount++;
        }
      } else {
        console.error('User', userId.substring(0, 8) + '...', 'not found in users table, skipping');
      }
    }
  }

  console.log('\nUpdated/created', updatedCount, 'user profiles');
  console.log('\nStep 3: Triggering recompute_platform_stats()...');

  const { data: rpcResult, error: rpcError } = await supabase
    .rpc('recompute_platform_stats');

  if (rpcError) {
    console.error('recompute_platform_stats() failed:', rpcError.message);
    process.exit(1);
  }

  console.log('recompute_platform_stats() succeeded:', JSON.stringify(rpcResult));

  console.log('\nStep 4: Verifying fix...');

  const { data: stats, error: statsError } = await supabase
    .from('platform_stats')
    .select('total_nodes, total_maps, avg_nodes_per_map')
    .eq('id', 'global')
    .single();

  if (statsError) {
    console.error('Failed to verify platform_stats:', statsError.message);
  } else {
    console.log('total_nodes =', stats.total_nodes);
    console.log('total_maps =', stats.total_maps);
    console.log('avg_nodes_per_map =', stats.avg_nodes_per_map);
    console.log('\nDone! Active Nodes and Global Nodes should now display real data.');
  }
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
