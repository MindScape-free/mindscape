/**
 * Backfill fullData for nested expansions
 *
 * Root Cause:
 *   The `fullData` field (full sub-map MindMapData) was being stripped from
 *   nestedExpansions[] in two code paths:
 *   1. mapToMindMapData() in actions.ts excluded `fullData` from the mapping
 *   2. dataToNotify in mind-map.tsx stripped `fullData` before saving
 *
 *   This means existing maps in the database have nestedExpansions[] without
 *   `fullData`, so clicking the "Open Sub Map" green-dot button falls
 *   through to regeneration instead of opening the existing sub-map.
 *
 * Fix:
 *   For each mindmap that has nestedExpansions[] in its content, find
 *   expansions missing `fullData`, fetch the corresponding sub-map row
 *   from the mindmaps table, and populate `fullData` with the full record.
 *
 * This script is idempotent (safe to re-run).
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

interface NestedExpansion {
  id?: string;
  topic?: string;
  parentName?: string;
  icon?: string;
  createdAt?: string | number | Date;
  depth?: number;
  path?: string;
  status?: string;
  subCategories?: any[];
  fullData?: any;
}

interface MindMapRow {
  id: string;
  user_id: string;
  topic: string;
  content: any;
  created_at?: string;
  parent_map_id?: string | null;
  [key: string]: any;
}

async function main() {
  console.log('=== Backfill fullData for Nested Expansions ===\n');

  // Step 1: Fetch all mindmaps
  console.log('Step 1: Fetching all mindmaps...');
  const { data: allMaps, error: fetchError } = await supabase
    .from('mindmaps')
    .select('id, user_id, topic, content, created_at, parent_map_id')
    .order('created_at', { ascending: true });

  if (fetchError) {
    console.error('Failed to fetch mindmaps:', fetchError.message);
    process.exit(1);
  }

  if (!allMaps || allMaps.length === 0) {
    console.log('No mindmaps found. Nothing to do.');
    process.exit(0);
  }

  console.log('Found ' + allMaps.length + ' total mindmaps');

  // Build a lookup map for fast sub-map fetching
  const mapById = new Map<string, MindMapRow>();
  for (const m of allMaps) {
    mapById.set(m.id, m);
  }

  // Step 2: Identify maps with nestedExpansions missing fullData
  console.log('\nStep 2: Identifying maps with nested expansions missing fullData...');

  const mapsNeedingFix: Array<{
    parentMap: MindMapRow;
    expansionsToFix: Array<{ index: number; expansion: NestedExpansion; childId: string }>;
  }> = [];

  for (const map of allMaps) {
    const content = map.content || {};
    const expansions: NestedExpansion[] = content.nestedExpansions || [];

    if (expansions.length === 0) continue;

    const missingFullData: Array<{ index: number; expansion: NestedExpansion; childId: string }> = [];

    for (let i = 0; i < expansions.length; i++) {
      const exp = expansions[i];
      const childId = exp.id;

      // Skip if fullData already exists
      if (exp.fullData) continue;
      // Skip if no id (orphan expansion)
      if (!childId) continue;

      // Check if the child map actually exists in our lookup
      if (mapById.has(childId)) {
        missingFullData.push({ index: i, expansion: exp, childId });
      }
    }

    if (missingFullData.length > 0) {
      mapsNeedingFix.push({ parentMap: map, expansionsToFix: missingFullData });
    }
  }

  if (mapsNeedingFix.length === 0) {
    console.log('All nested expansions already have fullData populated. Nothing to backfill.');
    process.exit(0);
  }

  const totalMissing = mapsNeedingFix.reduce((sum, m) => sum + m.expansionsToFix.length, 0);
  console.log('Found ' + mapsNeedingFix.length + ' parent maps with ' + totalMissing + ' expansions missing fullData');

  // Step 3: Build the backfill data for each expansion
  console.log('\nStep 3: Building fullData from sub-map records...');

  const updateBatch: Array<{ mapId: string; content: any }> = [];

  for (const { parentMap, expansionsToFix } of mapsNeedingFix) {
    const content = { ...(parentMap.content || {}) };
    const expansions = [...(content.nestedExpansions || [])];
    let hasChanges = false;

    for (const { index, expansion, childId } of expansionsToFix) {
      const childRow = mapById.get(childId);
      if (!childRow) continue;

      // Build fullData the same way fetchMapHierarchy does in CanvasClient
      const fullData = {
        ...childRow,
        ...(childRow.content || {}),
        id: childRow.id,
      };

      expansions[index] = {
        ...expansion,
        fullData,
      };
      hasChanges = true;

      console.log('  [' + (parentMap.topic || '(untitled)') + '] -> filling fullData for "' + (expansion.topic || childId.substring(0, 8)) + '" (' + childId.substring(0, 8) + '...)');
    }

    if (hasChanges) {
      content.nestedExpansions = expansions;
      updateBatch.push({ mapId: parentMap.id, content });
    }
  }

  // Step 4: Apply updates
  console.log('\nStep 4: Updating ' + updateBatch.length + ' parent maps in the database...');

  let updated = 0;
  let errors = 0;

  for (const { mapId, content } of updateBatch) {
    const { error: updateError } = await supabase
      .from('mindmaps')
      .update({
        content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', mapId);

    if (updateError) {
      console.error('  Failed to update ' + mapId.substring(0, 8) + '...: ' + updateError.message);
      errors++;
    } else {
      updated++;
    }
  }

  // Step 5: Summary
  console.log('\n=== Backfill Complete ===');
  console.log('Total maps scanned:   ' + allMaps.length);
  console.log('Maps needing fix:     ' + mapsNeedingFix.length);
  console.log('Expansions backfilled: ' + totalMissing);
  console.log('Maps updated:         ' + updated);
  console.log('Errors:               ' + errors);

  if (updated > 0) {
    console.log('\nGreen-dot buttons will now open existing sub-maps instead of regenerating.');
    console.log('Refreshing the page may be needed to see the changes take effect.');
  }

  process.exit(errors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
