const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
(async () => {
    const { data } = await supabase.from('mindmaps').select('id, topic, parent_map_id, content').limit(3).order('created_at', { ascending: false });
    for (const d of data) {
      console.log("Map:", d.id, d.topic, "Parent:", d.parent_map_id);
      console.log("NestedExpansions:", d.content?.nestedExpansions);
    }
})();
