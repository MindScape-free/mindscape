const fs = require('fs');
const filePath = 'src/app/canvas/CanvasClient.tsx';
let content = fs.readFileSync(filePath, 'utf8');
let changes = 0;
const lines = content.split('\n');

// Helper to find exact line content after making changes
function applyReplace(oldStr, newStr, desc) {
  if (content.includes(oldStr)) {
    content = content.replace(oldStr, newStr);
    changes++;
    console.log(`  ✓ Fix ${changes}: ${desc}`);
    return true;
  }
  console.log(`  ✗ NOT FOUND: ${desc}`);
  console.log(`    Expected: ${JSON.stringify(oldStr.substring(0, 60))}...`);
  return false;
}

console.log('=== FIXING as any CASTS IN CanvasClient.tsx ===\n');

// ==================== CATEGORY 1: Properties already on MindMapData type ====================

// Line 269: mindMap.id already exists on MindMapData
applyReplace(
  '!!(mindMap && (mindMap as any).id)',
  '!!mindMap?.id',
  'Line 269: (mindMap as any).id → mindMap?.id'
);

// Line 783: isPublic already on BaseMindMapData
applyReplace(
  'if (mindMap?.id && (mindMap as any).isPublic)',
  'if (mindMap?.id && mindMap.isPublic)',
  'Line 783: (mindMap as any).isPublic → mindMap.isPublic'
);

// Line 785: views already on BaseMindMapData
applyReplace(
  '.update({ views: ((mindMap as any).views || 0) + 1 })',
  '.update({ views: (mindMap.views || 0) + 1 })',
  'Line 785: (mindMap as any).views → mindMap.views'
);

// Line 791: isPublic in dependency array
applyReplace(
  '}, [mindMap?.id, (mindMap as any)?.isPublic]);',
  '}, [mindMap?.id, mindMap?.isPublic]);',
  'Line 791: (mindMap as any)?.isPublic → mindMap?.isPublic'
);

// Line 828: id already on MindMapData
applyReplace(
  'const currentMapId = (currentMapData as any).id;',
  'const currentMapId = currentMapData.id!;',
  'Line 828: (currentMapData as any).id → currentMapData.id!'
);

// Line 886: createdAt already on MindMapData, created_at is snake_case DB field
applyReplace(
  'rootMapData = { id: currentMapId, topic: currentMapData.topic, icon: currentMapData.icon, createdAt: (currentMapData as any).created_at || (currentMapData as any).createdAt };',
  'rootMapData = { id: currentMapId, topic: currentMapData.topic, icon: currentMapData.icon, createdAt: (currentMapData as any).created_at || currentMapData.createdAt };',
  'Line 886: (currentMapData as any).createdAt → currentMapData.createdAt'
);

// Line 927: mindMap.id check
applyReplace(
  'if (mindMap && (mindMap as any).id) {',
  'if (mindMap?.id) {',
  'Line 927: mindMap && (mindMap as any).id → mindMap?.id'
);

// Line 995: currentMap.id
applyReplace(
  'handleSaveMap(mergedMap, (currentMap as any).id, true);',
  'handleSaveMap(mergedMap, currentMap?.id, true);',
  'Line 995: (currentMap as any).id → currentMap?.id'
);

// Line 1424: summary already on BaseMindMapData
applyReplace(
  'summary: (mindMap as any).summary',
  'summary: mindMap.summary',
  'Line 1424: (mindMap as any).summary → mindMap.summary'
);

// ==================== CATEGORY 2: Function parameter type annotations ====================

// Lines 344-346: trackGenerationComplete params - add import for AIGenerationMeta type
// We can't add imports in a simple replace, so use proper inline type assertions
applyReplace(
  'sourceType: sourceType as any,\n          mode: mode as any,\n          depth: params.depth as any,',
  'sourceType: (sourceType || "text") as AIGenerationMeta["sourceType"],\n          mode: (mode || "single") as AIGenerationMeta["mode"],\n          depth: (params.depth || "low") as AIGenerationMeta["depth"],',
  'Lines 344-346: trackCompletion params proper types'
);

// Lines 357-359: trackGenerationFailed params
applyReplace(
  'sourceType: sourceType as any,\n          mode: mode as any,\n          depth: params.depth as any,',
  'sourceType: (sourceType || "text") as AIGenerationMeta["sourceType"],\n          mode: (mode || "single") as AIGenerationMeta["mode"],\n          depth: (params.depth || "low") as AIGenerationMeta["depth"],',
  'Lines 357-359: trackFailure params proper types'
);

// ==================== CATEGORY 3: DB row spreading ====================

// Line 414: sharedMindmaps row spread
applyReplace(
  'if (row) result.data = { ...row, ...(row.content || {}), id: row.id } as any;',
  'if (row) result.data = { ...row, ...(row.content || {}), id: row.id } as unknown as MindMapData;',
  'Line 414: as any → as unknown as MindMapData (shared_mindmaps)'
);

// Line 419: public_mindmaps row spread
applyReplace(
  'if (row) {\n                result.data = { ...row, ...(row.content || {}), id: row.id } as any;\n                await supabase',
  'if (row) {\n                result.data = { ...row, ...(row.content || {}), id: row.id } as unknown as MindMapData;\n                await supabase',
  'Line 419: as any → as unknown as MindMapData (public_mindmaps)'
);

// Line 426: mindmaps row spread
applyReplace(
  'if (row) result.data = { ...row, ...(row.content || {}), id: row.id } as any;\n              }\n            }\n            // Fallback',
  'if (row) result.data = { ...row, ...(row.content || {}), id: row.id } as unknown as MindMapData;\n              }\n            }\n            // Fallback',
  'Line 426: as any → as unknown as MindMapData (mindmaps - user)'
);

// Line 432: public_mindmaps fallback
applyReplace(
  'if (row) result.data = { ...row, ...(row.content || {}), id: row.id } as any;\n            }\n\n            if (!result.data && !result.error)',
  'if (row) result.data = { ...row, ...(row.content || {}), id: row.id } as unknown as MindMapData;\n            }\n\n            if (!result.data && !result.error)',
  'Line 432: as any → as unknown as MindMapData (public_mindmaps fallback)'
);

// ==================== CATEGORY 4: Redundant casts ====================

// Line 581: sessionContent is already any from safeGetItem
applyReplace(
  'const compContent = sessionContent as any;',
  'const compContent = sessionContent as { file1?: string; file2?: string; file1Type?: string; file2Type?: string; topic1?: string; topic2?: string };',
  'Line 581: sessionContent as any → typed interface'
);

// Line 641: depth cast
applyReplace(
  'result.data = await mapToMindMapData(parsed.data, params.depth as any || \'low\') as MindMapWithId;',
  "result.data = await mapToMindMapData(parsed.data, (params.depth || 'low') as 'low' | 'medium' | 'deep') as MindMapWithId;",
  'Line 641: params.depth as any → proper union type'
);

// Line 859: m.content is already any from supabase
applyReplace(
  'const content = m.content as any;',
  'const content = m.content as Record<string, unknown>;',
  'Line 859: m.content as any → typed'
);

// Line 896: content access already any
applyReplace(
  'const isUpwardChild = m.parent_map_id === parentId || (m.content as any)?.parentMapId === parentId;',
  'const isUpwardChild = m.parent_map_id === parentId || (m.content as Record<string, unknown>)?.parentMapId === parentId;',
  'Line 896: m.content as any → typed'
);

// Line 897: content access already any
applyReplace(
  'const isDownwardChild = (mapById.get(parentId)?.content as any)?.nestedExpansions?.some((e: any) => e.id === m.id);',
  'const isDownwardChild = (mapById.get(parentId)?.content as Record<string, unknown>)?.nestedExpansions?.some((e: any) => e.id === m.id);',
  'Line 897: mapById.get().content as any → typed'
);

// ==================== CATEGORY 5: Dynamic key access ====================

// Line 978: resolved[key] and currentMap[key]
applyReplace(
  'if (resolved !== currentMap && JSON.stringify((resolved as any)[key]) !== JSON.stringify((currentMap as any)[key])) {',
  'if (resolved !== currentMap && JSON.stringify((resolved as Record<string, unknown>)[key]) !== JSON.stringify((currentMap as Record<string, unknown>)[key])) {',
  'Line 978: (resolved/currentMap as any)[key] → Record<string, unknown>'
);

// ==================== CATEGORY 6: dataToSave object ====================

// Lines 734-738: dataToSave with sessionContent and params
applyReplace(
  'sourceFile2Content: (sessionContent as any)?.file2,\n              sourceFile2Type: (sessionContent as any)?.file2Type,\n    
