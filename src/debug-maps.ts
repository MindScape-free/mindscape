import { getSupabaseAdmin } from './lib/supabase-server';

async function debug() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('mindmaps').select('id, topic, is_sub_map, parent_map_id');
  if (error) {
    console.error('Error fetching mindmaps:', error);
    return;
  }
  console.log('Total mindmaps:', data.length);
  data.forEach(m => {
    console.log(`Map: ${m.topic}, is_sub_map: ${m.is_sub_map}, parent_map_id: ${m.parent_map_id}`);
  });
}

debug();
