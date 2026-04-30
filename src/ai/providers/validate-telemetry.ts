/**
 * AI Calls Validation Script
 * 
 * Runs the validation queries against the ai_calls table to evaluate 
 * provider performance and shadow mode parity.
 * 
 * Usage: npx tsx src/ai/providers/validate-telemetry.ts
 */

import { createClient } from '@supabase/supabase-js';

async function validate() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  console.log('📊 Fetching AI Provider Metrics...');

  // 1. Compare providers
  const { data: compareData, error: compareError } = await supabase.rpc('execute_sql', {
    sql: `
      SELECT provider, is_shadow, COUNT(*) as calls,
      ROUND(AVG(latency_ms)) as avg_latency,
      ROUND(AVG(CASE WHEN repair_applied THEN 1 ELSE 0 END) * 100, 1) as repair_rate_pct,
      ROUND(AVG(CASE WHEN success THEN 1 ELSE 0 END) * 100, 1) as success_rate_pct
      FROM ai_calls
      GROUP BY provider, is_shadow;
    `
  });

  if (compareError || !compareData) {
    // If RPC fails (e.g. function doesn't exist), do manual aggregation
    console.log('⚠️ RPC execute_sql not available, doing manual aggregation...');
    const { data: rawData, error: rawError } = await supabase.from('ai_calls').select('*');
    if (rawError) {
      console.error('❌ Failed to fetch telemetry:', rawError.message);
      return;
    }

    const stats: Record<string, any> = {};
    rawData.forEach(r => {
      const key = `${r.provider}_${r.is_shadow}`;
      if (!stats[key]) stats[key] = { calls: 0, latency: 0, repair: 0, success: 0, provider: r.provider, is_shadow: r.is_shadow };
      stats[key].calls++;
      stats[key].latency += r.latency_ms;
      if (r.repair_applied) stats[key].repair++;
      if (r.success) stats[key].success++;
    });

    console.table(Object.values(stats).map(s => ({
      Provider: s.provider,
      Shadow: s.is_shadow,
      Calls: s.calls,
      'Avg Latency (ms)': Math.round(s.latency / s.calls),
      'Repair %': Math.round((s.repair / s.calls) * 1000) / 10,
      'Success %': Math.round((s.success / s.calls) * 1000) / 10
    })));
  } else {
    console.table(compareData);
  }

  // 2. Schema quality proxy
  const { data: schemaData } = await supabase
    .from('ai_calls')
    .select('salvaged')
    .eq('is_shadow', false);

  if (schemaData && schemaData.length > 0) {
    const salvaged = schemaData.filter(d => d.salvaged).length;
    console.log(`\n📈 Schema Pass Rate (Primary): ${Math.round(((schemaData.length - salvaged) / schemaData.length) * 100)}%`);
  }

  // 3. Task type distribution
  const { data: taskData } = await supabase
    .from('ai_calls')
    .select('task_type')
    .eq('is_shadow', false);
    
  if (taskData) {
    const counts: Record<string, number> = {};
    taskData.forEach(t => counts[t.task_type] = (counts[t.task_type] || 0) + 1);
    console.log('\n📂 Task Distribution:');
    console.table(counts);
  }
}

validate().catch(console.error);
