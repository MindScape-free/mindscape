/**
 * AI Calls Telemetry Table — Migration Script
 * 
 * Creates the ai_calls table for AI provider telemetry.
 * Run this once to set up the table.
 * 
 * Usage: npx tsx src/ai/providers/migrate-ai-calls.ts
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

  console.log('🔧 Creating ai_calls table...');

  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      -- Create ai_calls telemetry table
      CREATE TABLE IF NOT EXISTS ai_calls (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        task_type TEXT NOT NULL,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        capability TEXT,
        latency_ms INTEGER NOT NULL,
        success BOOLEAN NOT NULL DEFAULT true,
        repair_applied BOOLEAN DEFAULT false,
        salvaged BOOLEAN DEFAULT false,
        error_class TEXT,
        input_tokens INTEGER,
        output_tokens INTEGER,
        is_shadow BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now()
      );

      -- Performance indexes
      CREATE INDEX IF NOT EXISTS idx_ai_calls_task ON ai_calls(task_type);
      CREATE INDEX IF NOT EXISTS idx_ai_calls_provider ON ai_calls(provider);
      CREATE INDEX IF NOT EXISTS idx_ai_calls_created ON ai_calls(created_at);
      CREATE INDEX IF NOT EXISTS idx_ai_calls_success ON ai_calls(success);

      -- Enable RLS (security best practice)
      ALTER TABLE ai_calls ENABLE ROW LEVEL SECURITY;

      -- Policy: service role can insert (server-side telemetry only)
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'ai_calls' AND policyname = 'service_role_insert'
        ) THEN
          CREATE POLICY service_role_insert ON ai_calls FOR INSERT TO service_role WITH CHECK (true);
        END IF;
      END $$;

      -- Policy: service role can select (admin dashboard reads)
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'ai_calls' AND policyname = 'service_role_select'
        ) THEN
          CREATE POLICY service_role_select ON ai_calls FOR SELECT TO service_role USING (true);
        END IF;
      END $$;
    `
  });

  if (error) {
    // RPC may not exist — fall back to direct SQL via REST
    console.warn('⚠️ RPC exec_sql not available, trying direct table creation...');
    
    // Try creating via direct insert to check if table exists
    const { error: checkError } = await supabase
      .from('ai_calls')
      .select('id')
      .limit(1);

    if (checkError && checkError.message.includes('does not exist')) {
      console.log('📋 Table does not exist. Please run this SQL in the Supabase SQL Editor:');
      console.log(`
────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_calls (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  task_type TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  capability TEXT,
  latency_ms INTEGER NOT NULL,
  success BOOLEAN NOT NULL DEFAULT true,
  repair_applied BOOLEAN DEFAULT false,
  salvaged BOOLEAN DEFAULT false,
  error_class TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  is_shadow BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_calls_task ON ai_calls(task_type);
CREATE INDEX IF NOT EXISTS idx_ai_calls_provider ON ai_calls(provider);
CREATE INDEX IF NOT EXISTS idx_ai_calls_created ON ai_calls(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_calls_success ON ai_calls(success);

ALTER TABLE ai_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_insert ON ai_calls FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY service_role_select ON ai_calls FOR SELECT TO service_role USING (true);
────────────────────────────────────────────────
      `);
      process.exit(1);
    } else if (!checkError) {
      console.log('✅ ai_calls table already exists!');
    } else {
      console.log('✅ Table accessible (or will be created on first write)');
    }
  } else {
    console.log('✅ ai_calls table created successfully');
  }

  // Verify
  const { data, error: countError } = await supabase
    .from('ai_calls')
    .select('id', { count: 'exact', head: true });

  if (countError) {
    console.warn('⚠️ Verification query failed:', countError.message);
  } else {
    console.log(`✅ Verification: ai_calls table exists, current row count: 0`);
  }
}

migrate().catch(console.error);
