/**
 * Integration tests for community server actions.
 *
 * These tests verify the community.ts server actions against a mock Supabase store:
 *   - publishMindMapAction() — publishes a mind map to the community
 *   - removeFromCommunityAction() — removes a mind map from the community
 *   - categorizeMindMapAction() — AI categorization (graceful degradation)
 */

import { createMockSupabaseClient } from '../helpers/supabase-mock';
import { mockUserId, mockMapId, createMockDbRow, mockUserIdAlt } from '../helpers/test-data';

// ── Build shared mock store ────────────────────────────────────────────────

// We need the mock client to pre-seed users, then expose the store for assertion
const mockClient = createMockSupabaseClient({
  users: new Map([
    [mockUserId, { id: mockUserId, is_admin: true }],
    [mockUserIdAlt, { id: mockUserIdAlt, is_admin: false }],
  ]),
});
const store = mockClient._store;

// ── Mock Supabase Admin ────────────────────────────────────────────────────

jest.mock('@/lib/supabase-server', () => ({
  getSupabaseAdmin: () => mockClient,
  isUserAdminServer: jest.fn(async (userId: string) => {
    const row = store.users.get(userId);
    return row?.is_admin === true || userId === mockUserId; // mockUserId is admin
  }),
  logActivityAdmin: jest.fn(async (entry: Record<string, any>) => {
    store.admin_activity_log.push(entry);
  }),
  getMindMapAdmin: jest.fn(),
  getUserImageSettingsAdmin: jest.fn(),
  incrementAdminStatAdmin: jest.fn(),
}));

// Note: AI flow module mocks (categorize-mind-map, suggest-related-topics, lib/serialize)
// were previously needed to prevent cheerio ESM loading. They have been removed
// because the jest.config.ts moduleNameMapper for cheerio handles this now.
// The only exports imported from community.ts (publishMindMapAction,
// removeFromCommunityAction) do not use those AI modules directly.

jest.spyOn(console, 'warn').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

// ── Import after mocks ─────────────────────────────────────────────────────

// Note: Only import publish and remove actions here — categorizeMindMapAction
// triggers AI module loading that pulls in cheerio (ESM-only), which requires
// separate jest config for transform. The categorization test is covered
// in the categorize-mind-map unit tests instead.
import { publishMindMapAction, removeFromCommunityAction } from '@/app/actions/community';

// ── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  store.mindmaps.clear();
  store.public_mindmaps.clear();
  store.admin_activity_log = [];
});

function seedMindMap(overrides: Record<string, any> = {}) {
  const row = createMockDbRow(overrides);
  store.mindmaps.set(mockMapId, row);
  return row;
}

// ── PUBLISH ────────────────────────────────────────────────────────────────

describe('publishMindMapAction', () => {
  it('publishes a mind map successfully', async () => {
    seedMindMap();

    const result = await publishMindMapAction(mockMapId, {
      topic: 'Introduction to Machine Learning',
      summary: 'A comprehensive overview.',
      authorName: 'Test User',
      originalAuthorId: mockUserId,
      publicCategories: ['technology', 'ai'],
    }, mockUserId);

    expect(result.success).toBe(true);
    expect(result.error).toBeNull();

    const pubEntry = store.public_mindmaps.get(mockMapId)!;
    expect(pubEntry).toBeTruthy();
    expect(pubEntry.topic).toBe('Introduction to Machine Learning');
    expect(pubEntry.is_public).toBe(true);
  });

  it('returns error when mapId is missing', async () => {
    const result = await publishMindMapAction('', {}, mockUserId);
    expect(result.success).toBe(false);
    expect(result.error).toContain('required');
  });

  it('returns error when publicData is missing', async () => {
    const result = await publishMindMapAction(mockMapId, null as any, mockUserId);
    expect(result.success).toBe(false);
    expect(result.error).toContain('required');
  });

  it('returns error when userId is empty', async () => {
    const result = await publishMindMapAction(mockMapId, { topic: 'Test' }, '');
    expect(result.success).toBe(false);
    expect(result.error).toContain('required');
  });

  it('allows an admin to publish another user\'s map', async () => {
    seedMindMap({ user_id: mockUserIdAlt });

    const result = await publishMindMapAction(mockMapId, {
      topic: 'Admin Published',
      authorName: 'Admin',
      originalAuthorId: mockUserIdAlt,
      publicCategories: [],
    }, mockUserId); // Admin user publishes

    expect(result.success).toBe(true);
    const pubEntry = store.public_mindmaps.get(mockMapId)!;
    expect(pubEntry).toBeTruthy();
    expect(pubEntry.topic).toBe('Admin Published');
  });

  it('logs admin activity on publish', async () => {
    seedMindMap();

    await publishMindMapAction(mockMapId, {
      topic: 'Activity Test', authorName: 'Tester',
      originalAuthorId: mockUserId, publicCategories: [],
    }, mockUserId);

    expect(store.admin_activity_log.length).toBeGreaterThanOrEqual(1);
    const logEntry = store.admin_activity_log[0] as any;
    expect(logEntry.type).toBe('MAP_PUBLISHED');
    expect(logEntry.targetId).toBe(mockMapId);
  });

  it('is idempotent — publishing the same map twice succeeds', async () => {
    seedMindMap();
    const publicData = { topic: 'Idempotent', authorName: 'Tester', originalAuthorId: mockUserId, publicCategories: [] };

    const first = await publishMindMapAction(mockMapId, publicData, mockUserId);
    expect(first.success).toBe(true);

    const second = await publishMindMapAction(mockMapId, publicData, mockUserId);
    expect(second.success).toBe(true);
    expect(store.public_mindmaps.has(mockMapId)).toBe(true);
  });
});

// ── REMOVE FROM COMMUNITY ──────────────────────────────────────────────────

describe('removeFromCommunityAction', () => {
  it('removes a published map from the community', async () => {
    seedMindMap({ is_public: true });
    store.public_mindmaps.set(mockMapId, {
      id: mockMapId, topic: 'To Remove', is_public: true, original_author_id: mockUserId,
    });

    const result = await removeFromCommunityAction(mockMapId, mockUserId);
    expect(result.success).toBe(true);
    expect(store.public_mindmaps.has(mockMapId)).toBe(false);
  });

  it('returns error when map not in community', async () => {
    const result = await removeFromCommunityAction('non-existent', mockUserId);
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('allows the original author to remove their own map', async () => {
    seedMindMap({ user_id: mockUserIdAlt, is_public: true });
    store.public_mindmaps.set(mockMapId, {
      id: mockMapId, topic: 'Own Map', original_author_id: mockUserIdAlt,
    });

    const result = await removeFromCommunityAction(mockMapId, mockUserIdAlt);
    expect(result.success).toBe(true);
  });

  it('allows admin to remove any map', async () => {
    seedMindMap({ user_id: mockUserIdAlt, is_public: true });
    store.public_mindmaps.set(mockMapId, {
      id: mockMapId, topic: 'Admin Remove', original_author_id: mockUserIdAlt,
    });

    const result = await removeFromCommunityAction(mockMapId, mockUserId); // Admin
    expect(result.success).toBe(true);
  });

  it('logs admin activity on removal', async () => {
    seedMindMap({ is_public: true });
    store.public_mindmaps.set(mockMapId, {
      id: mockMapId, topic: 'Log Test', original_author_id: mockUserId,
    });

    await removeFromCommunityAction(mockMapId, mockUserId);
    expect(store.admin_activity_log.length).toBeGreaterThanOrEqual(1);
    const lastEntry = store.admin_activity_log[store.admin_activity_log.length - 1] as any;
    expect(lastEntry.type).toBe('MAP_REMOVED');
  });
});

// categorizeMindMapAction test is in a separate test file to avoid
// pulling in AI module ESM dependencies (cheerio, etc.)

afterAll(() => {
  jest.restoreAllMocks();
});
