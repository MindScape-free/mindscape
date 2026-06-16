/**
 * Integration tests for the mind map CRUD flow.
 *
 * These tests verify the database helper functions (supabase-db.ts)
 * by exercising them against a mock Supabase client with an in-memory store.
 *
 * ── Test Scenarios ────────────────────────────────────────────────────
 *   CREATE:  saveMindMap with no existingId → inserts new row
 *   READ:    getMindMap by id + userId
 *   UPDATE:  saveMindMap with existingId → updates existing row
 *   LIST:    getUserMindMaps returns all maps for a user
 *   FIELD UPDATE: updateMindMapField partial update
 *   PUBLISH: publishMap / unpublishMap / getPublicMap
 *   DELETE:  (indirect via supabase delete in CanvasClient)
 *   ERROR:   supabase errors are propagated correctly
 */

import { createMockSupabaseClient, MockSupabaseClient } from '../helpers/supabase-mock';
import {
  saveMindMap,
  getMindMap,
  getUserMindMaps,
  updateMindMapField,
  publishMap,
  unpublishMap,
  getPublicMap,
  getSupabaseClient,
} from '@/lib/supabase-db';
import {
  mockUserId,
  mockUserIdAlt,
  mockMapId,
  mockSubTopics,
  createMockMindMapData,
  createMockCompareMindMap,
  createMockDbRow,
  createMockPublicDbRow,
  expectValidMindMapRow,
} from '../helpers/test-data';
import type { MindMapData, MindMapWithId } from '@/types/mind-map';

// ── Mock Supabase Setup ────────────────────────────────────────────────────

let mockClient: MockSupabaseClient;

beforeEach(() => {
  // Fresh mock client with no pre-populated data
  mockClient = createMockSupabaseClient({ mindmaps: new Map() });
});

// ── Helpers ────────────────────────────────────────────────────────────────

function storeDefaultMap() {
  const row = createMockDbRow();
  mockClient._store.mindmaps.set(mockMapId, row);
  return row;
}

// ── CREATE ─────────────────────────────────────────────────────────────────

describe('CREATE — saveMindMap (new map)', () => {
  it('inserts a new mind map row and returns an id', async () => {
    const data = createMockMindMapData();
    const id = await saveMindMap(
      mockClient as any,
      mockUserId,
      null, // no existing id → insert
      { topic: data.topic, summary: data.summary, mode: data.mode, depth: data.depth, ai_persona: data.aiPersona },
      { subTopics: (data as any).subTopics, compareData: null, nodes: [], edges: [], explanations: {}, shortTitle: null }
    );

    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');

    // Verify it was stored
    const stored = mockClient._store.mindmaps.get(id)!;
    expect(stored).toBeTruthy();
    expect(stored.topic).toBe('Introduction to Machine Learning');
    expect(stored.user_id).toBe(mockUserId);
  });

  it('inserts a compare-mode mind map', async () => {
    const data = createMockCompareMindMap();
    const id = await saveMindMap(
      mockClient as any,
      mockUserId,
      null,
      { topic: data.topic, mode: data.mode, depth: data.depth, ai_persona: data.aiPersona },
      { subTopics: [], compareData: data.compareData, nodes: [], edges: [], explanations: {}, shortTitle: null }
    );

    expect(id).toBeTruthy();
    const stored = mockClient._store.mindmaps.get(id)!;
    expect(stored.mode).toBe('compare');
    expect(stored.topic).toBe('AI vs Machine Learning');
  });

  it('inserts a nested sub-map with is_sub_map flag', async () => {
    const parentId = 'parent-map-id';
    mockClient._store.mindmaps.set(parentId, createMockDbRow({ id: parentId }));

    const data = createMockMindMapData({ isSubMap: true, parentMapId: parentId });
    const id = await saveMindMap(
      mockClient as any,
      mockUserId,
      null,
      { topic: data.topic, mode: data.mode, is_sub_map: true, parent_map_id: parentId },
      { subTopics: (data as any).subTopics, compareData: null, nodes: [], edges: [], explanations: {}, shortTitle: null }
    );

    expect(id).toBeTruthy();
    const stored = mockClient._store.mindmaps.get(id)!;
    expect(stored.is_sub_map).toBe(true);
    expect(stored.parent_map_id).toBe(parentId);
  });

  it('throws when supabase insert fails', async () => {
    const errorClient = createMockSupabaseClient(
      { mindmaps: new Map() },
      [{ table: 'mindmaps', operation: 'insert', error: { message: 'Database connection failed', code: '500' }, afterCalls: 0 }]
    );

    // Note: saveMindMap throws the error object directly (not an Error instance),
    // so we use .rejects.toBeTruthy() instead of .rejects.toThrow()
    await expect(
      saveMindMap(
        errorClient as any,
        mockUserId,
        null,
        { topic: 'Fail Test' },
        { subTopics: [] }
      )
    ).rejects.toBeTruthy();
  });
});

// ── READ ───────────────────────────────────────────────────────────────────

describe('READ — getMindMap', () => {
  it('fetches a mind map by id and userId', async () => {
    storeDefaultMap();
    const result = await getMindMap(mockClient as any, mockUserId, mockMapId);
    expect(result).toBeTruthy();
    expect(result.id).toBe(mockMapId);
    expect(result.topic).toBe('Introduction to Machine Learning');
  });

  it('returns null for non-existent map', async () => {
    const result = await getMindMap(mockClient as any, mockUserId, 'non-existent-id');
    expect(result).toBeNull();
  });

  it('respects userId filtering (returns null for wrong user)', async () => {
    storeDefaultMap();
    const result = await getMindMap(mockClient as any, 'wrong-user-id', mockMapId);
    expect(result).toBeNull();
  });

  it('fetches a recently created map', async () => {
    const data = createMockMindMapData({ id: 'fresh-map' });
    mockClient._store.mindmaps.set('fresh-map', createMockDbRow({ id: 'fresh-map', topic: 'Fresh Topic' }));

    const result = await getMindMap(mockClient as any, mockUserId, 'fresh-map');
    expect(result).toBeTruthy();
    expect(result.topic).toBe('Fresh Topic');
  });
});

describe('READ — getUserMindMaps', () => {
  it('returns all maps for a given user', async () => {
    // Clear the pre-populated default map to get a clean slate
    mockClient._store.mindmaps.clear();
    
    mockClient._store.mindmaps.set('map-1', createMockDbRow({ id: 'map-1', topic: 'First', user_id: mockUserId }));
    mockClient._store.mindmaps.set('map-2', createMockDbRow({ id: 'map-2', topic: 'Second', user_id: mockUserId }));
    mockClient._store.mindmaps.set('map-3', createMockDbRow({ id: 'map-3', topic: 'Other', user_id: 'different-user' }));

    const results = await getUserMindMaps(mockClient as any, mockUserId);
    expect(results).toHaveLength(2);
    const topics = results.map((r: any) => r.topic).sort();
    expect(topics).toEqual(['First', 'Second']);
  });

  it('returns empty array for user with no maps', async () => {
    mockClient._store.mindmaps.clear();
    
    const results = await getUserMindMaps(mockClient as any, 'user-with-no-maps');
    expect(results).toEqual([]);
  });
});

// ── UPDATE ─────────────────────────────────────────────────────────────────

describe('UPDATE — saveMindMap (existing map)', () => {
  it('updates an existing mind map and returns the same id', async () => {
    storeDefaultMap();
    const data = createMockMindMapData({ topic: 'Updated Topic', nodeCount: 15 });

    const resultId = await saveMindMap(
      mockClient as any,
      mockUserId,
      mockMapId,
      { topic: 'Updated Topic', summary: data.summary, mode: data.mode, depth: 'deep', ai_persona: 'Sage', node_count: 15 },
      { subTopics: (data as any).subTopics, compareData: null, nodes: [], edges: [], explanations: {}, shortTitle: null }
    );

    expect(resultId).toBe(mockMapId);
    const stored = mockClient._store.mindmaps.get(mockMapId)!;
    expect(stored.topic).toBe('Updated Topic');
    expect(stored.depth).toBe('deep');
    expect(stored.ai_persona).toBe('Sage');
  });

  it('updates summary and content independently', async () => {
    storeDefaultMap();
    const newSummary = 'An updated summary.';
    const newContent = { subTopics: [{ name: 'New Node', categories: [] }], compareData: null, nodes: [], edges: [], explanations: {}, shortTitle: null };

    await saveMindMap(
      mockClient as any,
      mockUserId,
      mockMapId,
      { summary: newSummary },
      newContent
    );

    const stored = mockClient._store.mindmaps.get(mockMapId)!;
    expect(stored.summary).toBe(newSummary);
    expect(stored.content).toEqual(newContent);
  });
});

describe('UPDATE — updateMindMapField', () => {
  it('updates specific fields on a mind map', async () => {
    storeDefaultMap();
    await updateMindMapField(mockClient as any, mockMapId, { is_public: true, thumbnail_url: 'https://example.com/thumb.png' });

    const stored = mockClient._store.mindmaps.get(mockMapId)!;
    expect(stored.is_public).toBe(true);
    expect(stored.thumbnail_url).toBe('https://example.com/thumb.png');
  });

  it('updates updated_at timestamp', async () => {
    storeDefaultMap();
    await updateMindMapField(mockClient as any, mockMapId, { node_count: 99 });
    const stored = mockClient._store.mindmaps.get(mockMapId)!;
    expect(stored.updated_at).toBeTruthy();
  });
});

// ── PUBLISH / UNPUBLISH ────────────────────────────────────────────────────

describe('PUBLISH — publishMap / unpublishMap / getPublicMap', () => {
  it('publishes a map to public_mindmaps table', async () => {
    storeDefaultMap();
    const publicData = {
      topic: 'Introduction to Machine Learning',
      summary: 'Public version',
      author_name: 'Test User',
      original_author_id: mockUserId,
      is_public: true,
    };

    await publishMap(mockClient as any, mockMapId, publicData);

    const publicEntry = mockClient._store.public_mindmaps.get(mockMapId)!;
    expect(publicEntry).toBeTruthy();
    expect(publicEntry.topic).toBe('Introduction to Machine Learning');
    expect(publicEntry.is_public).toBe(true);
  });

  it('unpublishes a map by removing it from public_mindmaps', async () => {
    mockClient._store.public_mindmaps.set(mockMapId, createMockPublicDbRow());
    await unpublishMap(mockClient as any, mockMapId);

    const publicEntry = mockClient._store.public_mindmaps.get(mockMapId)!;
    expect(publicEntry).toBeUndefined();
  });

  it('retrieves a published map', async () => {
    mockClient._store.public_mindmaps.set('pub-1', createMockPublicDbRow({ id: 'pub-1', topic: 'Public Map' }));
    const result = await getPublicMap(mockClient as any, 'pub-1');
    expect(result).toBeTruthy();
    expect(result.topic).toBe('Public Map');
    expect(result.is_public).toBe(true);
  });

  it('returns null for non-existent public map', async () => {
    const result = await getPublicMap(mockClient as any, 'non-existent-pub');
    expect(result).toBeNull();
  });

  it('publish then unpublish then publish again is idempotent', async () => {
    storeDefaultMap();
    const pd = { topic: 'Idempotent Test', is_public: true };

    await publishMap(mockClient as any, mockMapId, pd);
    expect(mockClient._store.public_mindmaps.has(mockMapId)).toBe(true);

    await unpublishMap(mockClient as any, mockMapId);
    expect(mockClient._store.public_mindmaps.has(mockMapId)).toBe(false);

    await publishMap(mockClient as any, mockMapId, pd);
    expect(mockClient._store.public_mindmaps.has(mockMapId)).toBe(true);
  });
});

// ── END-TO-END CRUD FLOWS ──────────────────────────────────────────────────

describe('End-to-end CRUD flows', () => {
  it('CREATE → READ → UPDATE → READ full cycle for single map', async () => {
    // 1. CREATE
    const data = createMockMindMapData({ id: undefined } as any); // no id yet
    const createId = await saveMindMap(
      mockClient as any, mockUserId, null,
      { topic: 'E2E Test', mode: 'single', depth: 'low' },
      { subTopics: mockSubTopics, compareData: null, nodes: [], edges: [], explanations: {}, shortTitle: null }
    );
    expect(createId).toBeTruthy();

    // 2. READ after CREATE
    let fetched = await getMindMap(mockClient as any, mockUserId, createId);
    expect(fetched).toBeTruthy();
    expect(fetched.topic).toBe('E2E Test');

    // 3. UPDATE
    await saveMindMap(
      mockClient as any, mockUserId, createId,
      { topic: 'E2E Updated', depth: 'deep' },
      { subTopics: mockSubTopics, compareData: null, nodes: [], edges: [], explanations: {}, shortTitle: null }
    );

    // 4. READ after UPDATE
    fetched = await getMindMap(mockClient as any, mockUserId, createId);
    expect(fetched.topic).toBe('E2E Updated');
    expect(fetched.depth).toBe('deep');
  });

  it('CREATE → PUBLISH → READ PUBLIC → UNPUBLISH → READ PUBLIC (null) whole cycle', async () => {
    // 1. CREATE
    const data = createMockMindMapData({ id: undefined } as any);
    const mapId = await saveMindMap(
      mockClient as any, mockUserId, null,
      { topic: 'Public E2E', mode: 'single', is_public: false },
      { subTopics: mockSubTopics, compareData: null, nodes: [], edges: [], explanations: {}, shortTitle: null }
    );
    expect(mapId).toBeTruthy();

    // 2. PUBLISH
    await publishMap(mockClient as any, mapId, {
      topic: 'Public E2E',
      summary: 'Published via E2E',
      author_name: 'Tester',
      original_author_id: mockUserId,
      is_public: true,
    });
    expect(mockClient._store.public_mindmaps.has(mapId)).toBe(true);

    // 3. READ PUBLIC
    const pubResult = await getPublicMap(mockClient as any, mapId);
    expect(pubResult).toBeTruthy();
    expect(pubResult.topic).toBe('Public E2E');

    // 4. UNPUBLISH
    await unpublishMap(mockClient as any, mapId);
    expect(mockClient._store.public_mindmaps.has(mapId)).toBe(false);

    // 5. READ PUBLIC → null
    const deleted = await getPublicMap(mockClient as any, mapId);
    expect(deleted).toBeNull();
  });

  it('handles multiple maps per user with list operation', async () => {
    // Clear the pre-populated default map first
    mockClient._store.mindmaps.clear();
    
    // Create maps for two different users
    await saveMindMap(mockClient as any, mockUserId, null,
      { topic: 'User A Map 1', mode: 'single' }, { subTopics: [] });
    await saveMindMap(mockClient as any, mockUserId, null,
      { topic: 'User A Map 2', mode: 'single' }, { subTopics: [] });
    await saveMindMap(mockClient as any, mockUserIdAlt, null,
      { topic: 'User B Map 1', mode: 'single' }, { subTopics: [] });

    const userAMaps = await getUserMindMaps(mockClient as any, mockUserId);
    expect(userAMaps).toHaveLength(2);

    const userBMaps = await getUserMindMaps(mockClient as any, mockUserIdAlt);
    expect(userBMaps).toHaveLength(1);
    expect(userBMaps[0].topic).toBe('User B Map 1');
  });
});

// ── ERROR HANDLING ─────────────────────────────────────────────────────────

describe('Error handling', () => {
  it('saveMindMap throws when supabase is not initialized', async () => {
    await expect(
      saveMindMap(null as any, mockUserId, null, { topic: 'No DB' }, { subTopics: [] })
    ).rejects.toThrow();
  });

  it('saveMindMap does not throw when called without content subTopics', async () => {
    // Should handle gracefully — save with empty subTopics
    const id = await saveMindMap(
      mockClient as any, mockUserId, null,
      { topic: 'Empty Map' },
      { subTopics: [], compareData: null, nodes: [], edges: [], explanations: {}, shortTitle: null }
    );
    expect(id).toBeTruthy();
  });
});
