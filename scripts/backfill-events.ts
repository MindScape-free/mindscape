import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function main() {
  console.log('Step 1: Loading all mindmaps...');
  const { data: mindmaps, error: mmError } = await supabase
    .from('mindmaps')
    .select('id, user_id, node_count, mode, depth, ai_persona, source_file_type, source_url, is_sub_map, parent_map_id, created_at')
    .order('created_at', { ascending: true });
  if (mmError || !mindmaps) { console.error('Failed:', mmError?.message); process.exit(1); }
  const subMaps = mindmaps.filter(m => m.is_sub_map || m.parent_map_id);
  console.log('Found ' + mindmaps.length + ' mindmaps (' + subMaps.length + ' sub-maps)');

  console.log('\nStep 2: Checking existing map_created events...');
  const { data: existingEvents } = await supabase
    .from('user_events')
    .select('id, source, event_data')
    .eq('event_type', 'map_created');
  console.log('Found ' + (existingEvents?.length || 0) + ' existing map_created events');
  const backfillEvents = (existingEvents || []).filter(e => e.source === 'backfill');
  console.log(backfillEvents.length + ' are backfill (will be replaced)');

  if (backfillEvents.length > 0) {
    console.log('\nStep 3: Deleting backfilled map_created events...');
    const ids = backfillEvents.map(e => e.id);
    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50);
      const { error: delError } = await supabase.from('user_events').delete().in('id', batch);
      if (delError) console.error('Batch error:', delError.message);
    }
    console.log('Deleted ' + ids.length + ' events');
  }

  console.log('\nStep 4: Inserting ' + mindmaps.length + ' proper map_created events...');
  let inserted = 0;
  for (let i = 0; i < mindmaps.length; i += 20) {
    const batch = mindmaps.slice(i, i + 20);
    const records = batch.map(m => ({
      user_id: m.user_id,
      event_type: 'map_created',
      event_data: {
        node_count: m.node_count || 0,
        mode: m.mode || 'single',
        depth: m.depth || 'medium',
        source_type: m.source_file_type || 'text',
        source_url: m.source_url || null,
        persona: m.ai_persona || 'Teacher',
        is_sub_map: m.is_sub_map || !!m.parent_map_id,
        parent_map_id: m.parent_map_id || null,
        mindmap_id: m.id,
        source: 'backfill_fix',
      },
      source: 'backfill_fix',
      created_at: m.created_at,
    }));
    const { error: insError } = await supabase.from('user_events').insert(records);
    if (insError) console.error('Insert error:', insError.message);
    else inserted += batch.length;
  }
  console.log('Inserted ' + inserted + ' events');

  console.log('\nStep 5: Triggering recompute_all_user_profiles()...');
  const { data: pr, error: pe } = await supabase.rpc('recompute_all_user_profiles');
  if (pe) { console.error('Failed:', pe.message); process.exit(1); }
  console.log('Result: ' + pr);

  console.log('\nStep 6: Triggering recompute_platform_stats()...');
  const { data: sr, error: se } = await supabase.rpc('recompute_platform_stats');
  if (se) { console.error('Failed:', se.message); process.exit(1); }
  console.log('Result: ' + JSON.stringify(sr));

  console.log('\nStep 7: Verifying...');
  const { data: profiles } = await supabase.from('user_profiles').select('user_id, total_nodes, total_maps');
  console.log('Profiles: ' + (profiles?.length || 0));
  for (const p of profiles || []) {
    console.log('  ' + p.user_id.substring(0,8) + '... maps=' + p.total_maps + ' nodes=' + p.total_nodes);
  }
  const { data: ps } = await supabase.from('platform_stats').select('total_nodes,total_maps,avg_nodes_per_map,total_users,total_chats,health_score').eq('id','global').single();
  console.log('\nplatform_stats: ' + JSON.stringify(ps));
  if (ps && ps.total_nodes > 0) console.log('\nSUCCESS!');
  else console.log('\nWARNING: total_nodes still 0');
}

main().catch(console.error);
