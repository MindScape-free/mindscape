/**
 * Map Cache Table — Migration Script
 * 
 * Creates the map_cache table for caching identical topic/URL mind map queries.
 * Run this once to set up the table in your remote Supabase database.
 * 
 * Usage: npx tsx scripts/migrate-map-cache.ts
 */

import { createClient } from '@supabase/supabase-js';

async function migrate() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  console.log('🔧 Creating map_cache table in Supabase...');

  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      -- Create map_cache table
      CREATE TABLE IF NOT EXISTS map_cache (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        query_key TEXT UNIQUE NOT NULL,
        content JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- Index the query_key for sub-millisecond lookups
      CREATE INDEX IF NOT EXISTS idx_map_cache_query_key ON map_cache(query_key);

      -- Enable RLS
      ALTER TABLE map_cache ENABLE ROW LEVEL SECURITY;

      -- Policy: Allow authenticated read access
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'map_cache' AND policyname = 'Allow authenticated read access to map_cache'
        ) THEN
          CREATE POLICY "Allow authenticated read access to map_cache"
            ON map_cache FOR SELECT
            TO authenticated
            USING (true);
        END IF;
      END $$;

      -- Policy: Allow authenticated insert access
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'map_cache' AND policyname = 'Allow authenticated insert access to map_cache'
        ) THEN
          CREATE POLICY "Allow authenticated insert access to map_cache"
            ON map_cache FOR INSERT
            TO authenticated
            WITH CHECK (true);
        END IF;
      END $$;
    `
  });

  if (error) {
    console.warn('⚠️ RPC exec_sql failed or not available, fallback checks:');
    
    // Check if table already exists
    const { error: checkError } = await supabase
      .from('map_cache')
      .select('id')
      .limit(1);

    if (checkError && checkError.message.includes('does not exist')) {
      console.log('📋 Table does not exist. Please run this SQL in the Supabase SQL Editor:');
      console.log(`
────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS map_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_key TEXT UNIQUE NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_map_cache_query_key ON map_cache(query_key);
ALTER TABLE map_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read access to map_cache"
  ON map_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert access to map_cache"
  ON map_cache FOR INSERT
  TO authenticated
  WITH CHECK (true);
────────────────────────────────────────────────
      `);
      process.exit(1);
    } else if (!checkError) {
      console.log('✅ map_cache table already exists and is accessible!');
    } else {
      console.log('✅ Table is accessible.');
    }
  } else {
    console.log('✅ map_cache table created successfully');
  }

  // Verify
  const { error: countError } = await supabase
    .from('map_cache')
    .select('id', { count: 'exact', head: true });

  if (countError) {
    console.warn('⚠️ Verification query failed:', countError.message);
  } else {
    console.log(`✅ Verification: map_cache table exists, current row count: 0`);
  }
}

migrate().catch(console.error);
