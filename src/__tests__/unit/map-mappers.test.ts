import { mapMindMapRow, mapMindMapRows, mapUserRow, mapUserRows } from '@/lib/map-mappers';
import { createMockDbRow, expectValidMindMap } from '../helpers/test-data';

// ── mapMindMapRow ──────────────────────────────────────────────────────────

describe('mapMindMapRow()', () => {
  it('returns null for null input', () => {
    expect(mapMindMapRow(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(mapMindMapRow(undefined)).toBeNull();
  });

  it('maps snake_case id and topic to the output', () => {
    const row = createMockDbRow({ id: 'abc-123', topic: 'Test Topic', user_id: 'user-1' });
    const result = mapMindMapRow(row)!;
    expect(result.id).toBe('abc-123');
    expect(result.topic).toBe('Test Topic');
    expect(result.userId).toBe('user-1');
  });

  it('converts snake_case fields to camelCase', () => {
    const row = createMockDbRow({
      short_title: 'ML Overview',
      thumbnail_url: 'https://example.com/thumb.png',
      is_public: true,
      node_count: 25,
      ai_persona: 'Creative',
      source_file_type: 'pdf',
      parent_map_id: 'parent-123',
      is_sub_map: true,
    });
    const result = mapMindMapRow(row)!;
    expect(result.shortTitle).toBe('ML Overview');
    expect(result.thumbnailUrl).toBe('https://example.com/thumb.png');
    expect(result.isPublic).toBe(true);
    expect(result.nodeCount).toBe(25);
    expect(result.aiPersona).toBe('Creative');
    expect(result.sourceFileType).toBe('pdf');
    expect(result.parentMapId).toBe('parent-123');
    expect(result.isSubMap).toBe(true);
  });

  it('maps snake_case to camelCase for known fields', () => {
    const row = createMockDbRow({ topic: 'Preserved Test' });
    const result = mapMindMapRow(row) as Record<string, unknown>;
    expect(result.topic).toBe('Preserved Test');
    expect(result.userId).toBe(row.user_id); // camelCase mapping
  });

  it('provides fallback values for missing optional fields', () => {
    const minimalRow = { id: 'min-1', user_id: 'user-1', topic: 'Minimal' };
    const result = mapMindMapRow(minimalRow) as Record<string, unknown>;
    expect(result).toBeTruthy();
    expect(result.shortTitle).toBe('Minimal');
    expect(result.isPublic).toBe(undefined); // mapper passes through undefined is_public
    expect(result.nodeCount).toBe(0);
    expect(result.pinnedMessages).toEqual([]);
    expect(result.depth).toBe('medium');
    expect(result.mode).toBe('single');
    expect(result.pinnedMessages).toEqual([]);
  });

  it('handles content JSON field correctly', () => {
    const content = { subTopics: [{ name: 'Topic 1', categories: [] }] };
    const row = createMockDbRow({ content });
    const result = mapMindMapRow(row) as Record<string, unknown>;
    expect(result).toBeTruthy();
    const mappedContent = result.content as Record<string, unknown>;
    expect(mappedContent).toEqual(content);
    expect((mappedContent.subTopics as Array<unknown>)).toHaveLength(1);
  });

  it('maps uid as legacy alias for userId', () => {
    const row = createMockDbRow({ user_id: 'legacy-user' });
    const result = mapMindMapRow(row) as Record<string, unknown>;
    expect(result).toBeTruthy();
    expect(result.uid).toBe('legacy-user');
    expect(result.userId).toBe('legacy-user');
  });

  it('handles a full realistic database row', () => {
    const row = createMockDbRow({
      id: 'full-test-id',
      user_id: 'user-full',
      topic: 'Full Integration Test',
      summary: 'Testing all fields',
      mode: 'compare',
      depth: 'deep',
      ai_persona: 'Sage',
      node_count: 50,
      is_public: true,
      is_sub_map: false,
      source_file_type: 'youtube',
      source_url: 'https://youtube.com/watch?v=test',
      thumbnail_url: 'https://example.com/thumb.png',
      pinned_messages: [{ id: 'pin-1', content: 'Test pin' }],
      search_sources: [{ title: 'Source 1', url: 'https://example.com' }],
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-06-01T00:00:00.000Z',
    });
    const result = mapMindMapRow(row) as Record<string, unknown>;
    expect(result).toBeTruthy();
    expect(result.id).toBe('full-test-id');
    expect(result.topic).toBe('Full Integration Test');
    expect(result.mode).toBe('compare');
    expect(result.depth).toBe('deep');
    expect(result.aiPersona).toBe('Sage');
    expect(result.nodeCount).toBe(50);
    expect(result.isPublic).toBe(true);
    expect(result.sourceFileType).toBe('youtube');
    expect(result.sourceUrl).toBe('https://youtube.com/watch?v=test');
    expect((result.pinnedMessages as any[])).toHaveLength(1);
    expect((result.searchSources as any[])).toHaveLength(1);
    expect(result.createdAt).toBe('2025-01-01T00:00:00.000Z');
    expect(result.updatedAt).toBe('2025-06-01T00:00:00.000Z');
  });
});

// ── mapMindMapRows ─────────────────────────────────────────────────────────

describe('mapMindMapRows()', () => {
  it('returns empty array for null input', () => {
    expect(mapMindMapRows(null as any)).toEqual([]);
  });

  it('returns empty array for undefined input', () => {
    expect(mapMindMapRows(undefined as any)).toEqual([]);
  });

  it('maps multiple rows through mapMindMapRow', () => {
    const rows = [
      createMockDbRow({ id: 'row-1', topic: 'First Map' }),
      createMockDbRow({ id: 'row-2', topic: 'Second Map' }),
      createMockDbRow({ id: 'row-3', topic: 'Third Map' }),
    ];
    const results = mapMindMapRows(rows) as Record<string, unknown>[];
    expect(results).toHaveLength(3);
    expect(results[0].topic).toBe('First Map');
    expect(results[1].id).toBe('row-2');
    expect(results[2].topic).toBe('Third Map');
  });

  it('preserves order of input rows', () => {
    const rows = [
      createMockDbRow({ id: 'r1', created_at: '2025-01-01' }),
      createMockDbRow({ id: 'r2', created_at: '2025-06-01' }),
      createMockDbRow({ id: 'r3', created_at: '2025-03-01' }),
    ];
    const results = mapMindMapRows(rows) as Record<string, unknown>[];
    expect(results[0].id).toBe('r1');
    expect(results[1].id).toBe('r2');
    expect(results[2].id).toBe('r3');
  });

  it('produces valid MindMapData for each row', () => {
    const rows = [
      createMockDbRow({ id: 'v1', topic: 'Valid 1' }),
      createMockDbRow({ id: 'v2', topic: 'Valid 2' }),
    ];
    const results = mapMindMapRows(rows) as Record<string, unknown>[];
    results.forEach(r => expectValidMindMap(r));
  });
});

// ── mapUserRow ─────────────────────────────────────────────────────────────

describe('mapUserRow()', () => {
  it('returns null for null input', () => {
    expect(mapUserRow(null)).toBeNull();
  });

  it('maps a basic user row', () => {
    const row = {
      id: 'user-1',
      email: 'test@example.com',
      display_name: 'Test User',
      is_admin: false,
    };
    const result = mapUserRow(row) as Record<string, unknown>;
    expect(result.id).toBe('user-1');
    expect(result.email).toBe('test@example.com');
    expect(result.displayName).toBe('Test User');
    expect(result.isAdmin).toBe(false);
  });

  it('provides fallback displayName from email local part', () => {
    const row = { id: 'user-2', email: 'john@example.com' };
    const result = mapUserRow(row) as Record<string, unknown>;
    expect(result.displayName).toBe('john');
  });

  it('defaults isAdmin to false', () => {
    const row = { id: 'user-3' };
    const result = mapUserRow(row) as Record<string, unknown>;
    expect(result.isAdmin).toBe(false);
  });

  it('maps statistics with defaults', () => {
    const row = { id: 'user-4', statistics: { total_maps_created: 5, total_nodes: 100 } };
    const result = mapUserRow(row) as Record<string, unknown>;
    const stats = result.statistics as Record<string, number>;
    expect(stats.totalMapsCreated).toBe(5);
    expect(stats.totalNodes).toBe(100);
    expect(stats.totalStudyTimeMinutes).toBe(0); // default
  });

  it('maps preferences with defaults', () => {
    const row = { id: 'user-5' };
    const result = mapUserRow(row) as Record<string, unknown>;
    const prefs = result.preferences as Record<string, unknown>;
    expect(prefs.preferredLanguage).toBe('en');
    expect(prefs.defaultAIPersona).toBe('concise');
    expect(prefs.deepExpansionMode).toBe(false);
  });

  it('handles apiSettings', () => {
    const row = {
      id: 'user-6',
      api_settings: {
        text_model: 'gpt-4',
        image_model: 'dall-e',
        provider: 'pollinations',
      },
    };
    const result = mapUserRow(row) as Record<string, unknown>;
    const api = result.apiSettings as Record<string, string>;
    expect(api.textModel).toBe('gpt-4');
    expect(api.imageModel).toBe('dall-e');
    expect(api.provider).toBe('pollinations');
  });
});

// ── mapUserRows ────────────────────────────────────────────────────────────

describe('mapUserRows()', () => {
  it('returns empty array for null', () => {
    expect(mapUserRows(null as any)).toEqual([]);
  });

  it('maps multiple user rows', () => {
    const rows = [
      { id: 'u1', email: 'a@test.com' },
      { id: 'u2', email: 'b@test.com' },
    ];
    const results = mapUserRows(rows) as Record<string, unknown>[];
    expect(results).toHaveLength(2);
    expect(results[0].email).toBe('a@test.com');
    expect(results[1].email).toBe('b@test.com');
  });
});
