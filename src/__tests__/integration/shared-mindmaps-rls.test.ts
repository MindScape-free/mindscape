/**
 * Integration tests for the shared_mindmaps share-by-link upsert flows under
 * the RLS policies shipped in migration 20260801000004_scope_all_rls_policies.sql:
 *
 *   SELECT: anon + authenticated  using (is_shared = true)
 *   INSERT: authenticated          with check (original_author_id = auth.uid())
 *           anon                   with check (original_author_id is null)
 *   UPDATE: authenticated          using + with check (original_author_id = auth.uid())
 *           anon                   using + with check (original_author_id is null)
 *   DELETE: authenticated          using (original_author_id = auth.uid())
 *           anon                   (no delete policy)
 *
 * The mock Supabase client enforces these policies when created with an rls
 * config (role + authUid), mirroring the PostgREST role per request. This
 * exercises the exact payload shapes written by the client share flows:
 *   - CanvasClient handleShare: original_author_id: user?.id ?? null
 *   - library/page.tsx + mind-map.tsx share handlers: original_author_id: user.id
 */

import { createMockSupabaseClient, MockSupabaseClient, MOCK_RLS_ERROR } from '../helpers/supabase-mock';
import { mockUserId, mockUserIdAlt, mockMapId } from '../helpers/test-data';

function sharePayload(id: string, authorId: string | null, overrides: Record<string, any> = {}) {
  return {
    id,
    original_map_id: mockMapId,
    original_author_id: authorId,
    content: { topic: 'Introduction to Machine Learning', subTopics: [] },
    is_shared: true,
    shared_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeClient(role: 'anon' | 'authenticated', authUid: string | null, initial: Record<string, any>[] = []): MockSupabaseClient {
  const shared = new Map<string, Record<string, any>>();
  initial.forEach(r => shared.set(r.id, r));
  return createMockSupabaseClient({ shared_mindmaps: shared }, [], { role, authUid });
}

describe('shared_mindmaps upsert — authenticated share flow (real uid)', () => {
  it('allows an authenticated user to upsert a share owned by their own uid', async () => {
    const client = makeClient('authenticated', mockUserId);
    const shareId = `share_${mockMapId}`;

    const { error } = await client
      .from('shared_mindmaps')
      .upsert(sharePayload(shareId, mockUserId), { onConflict: 'id' });

    expect(error).toBeNull();
    const row = client._store.shared_mindmaps.get(shareId)!;
    expect(row).toBeTruthy();
    expect(row.original_author_id).toBe(mockUserId);
    expect(row.is_shared).toBe(true);
  });

  it('rejects an authenticated user writing a NULL author (WITH CHECK requires own uid)', async () => {
    const client = makeClient('authenticated', mockUserId);
    const shareId = `share_null_auth`;

    const { error } = await client
      .from('shared_mindmaps')
      .upsert(sharePayload(shareId, null), { onConflict: 'id' });

    expect(error).toMatchObject(MOCK_RLS_ERROR);
    expect(client._store.shared_mindmaps.has(shareId)).toBe(false);
  });

  it('rejects an authenticated user claiming another user uid', async () => {
    const client = makeClient('authenticated', mockUserId);
    const shareId = `share_forged`;

    const { error } = await client
      .from('shared_mindmaps')
      .upsert(sharePayload(shareId, mockUserIdAlt), { onConflict: 'id' });

    expect(error).toMatchObject(MOCK_RLS_ERROR);
    expect(client._store.shared_mindmaps.has(shareId)).toBe(false);
  });

  it('allows the author to re-share (upsert on conflict) their own row idempotently', async () => {
    const client = makeClient('authenticated', mockUserId);
    const shareId = `share_${mockMapId}`;
    await client.from('shared_mindmaps').upsert(sharePayload(shareId, mockUserId), { onConflict: 'id' });

    // Re-share with an updated payload — must update, not duplicate or reject.
    const { error } = await client
      .from('shared_mindmaps')
      .upsert(sharePayload(shareId, mockUserId, { updated_at: '2026-08-02T00:00:00.000Z' }), { onConflict: 'id' });

    expect(error).toBeNull();
    const row = client._store.shared_mindmaps.get(shareId)!;
    expect(row.original_author_id).toBe(mockUserId);
    expect(row.updated_at).toBe('2026-08-02T00:00:00.000Z');
  });

  it('cannot silently take over an anonymous-owned share (USING blocks UPDATE)', async () => {
    const shareId = `share_anon_owned`;
    const client = makeClient('authenticated', mockUserId, [sharePayload(shareId, null)]);

    const { error } = await client
      .from('shared_mindmaps')
      .upsert(sharePayload(shareId, mockUserId), { onConflict: 'id' });

    expect(error).toBeNull(); // USING filter → 0 rows affected, no error
    const row = client._store.shared_mindmaps.get(shareId)!;
    expect(row.original_author_id).toBeNull(); // unchanged
  });
});

describe('shared_mindmaps upsert — anonymous share flow (NULL author)', () => {
  it('allows an anonymous user to upsert a share with NULL original_author_id', async () => {
    const client = makeClient('anon', null);
    const shareId = `share_anon_1`;

    const { error } = await client
      .from('shared_mindmaps')
      .upsert(sharePayload(shareId, null), { onConflict: 'id' });

    expect(error).toBeNull();
    const row = client._store.shared_mindmaps.get(shareId)!;
    expect(row).toBeTruthy();
    expect(row.original_author_id).toBeNull();
    expect(row.is_shared).toBe(true);
  });

  it('rejects an anonymous user claiming a real uid (WITH CHECK requires NULL)', async () => {
    const client = makeClient('anon', null);
    const shareId = `share_anon_forged`;

    const { error } = await client
      .from('shared_mindmaps')
      .upsert(sharePayload(shareId, mockUserId), { onConflict: 'id' });

    expect(error).toMatchObject(MOCK_RLS_ERROR);
    expect(client._store.shared_mindmaps.has(shareId)).toBe(false);
  });

  it('allows an anonymous user to re-share their own NULL-author row idempotently', async () => {
    const client = makeClient('anon', null);
    const shareId = `share_anon_reshare`;
    await client.from('shared_mindmaps').upsert(sharePayload(shareId, null), { onConflict: 'id' });

    const { error } = await client
      .from('shared_mindmaps')
      .upsert(sharePayload(shareId, null, { updated_at: '2026-08-03T00:00:00.000Z' }), { onConflict: 'id' });

    expect(error).toBeNull();
    const row = client._store.shared_mindmaps.get(shareId)!;
    expect(row.original_author_id).toBeNull();
    expect(row.updated_at).toBe('2026-08-03T00:00:00.000Z');
  });

  it('cannot overwrite a real-user share (USING blocks UPDATE on uid-owned rows)', async () => {
    const shareId = `share_user_owned`;
    const client = makeClient('anon', null, [sharePayload(shareId, mockUserId)]);

    const { error } = await client
      .from('shared_mindmaps')
      .upsert(sharePayload(shareId, null), { onConflict: 'id' });

    expect(error).toBeNull(); // USING (original_author_id is null) fails → 0 rows
    const row = client._store.shared_mindmaps.get(shareId)!;
    expect(row.original_author_id).toBe(mockUserId); // unchanged
  });
});

describe('shared_mindmaps SELECT policy (is_shared = true)', () => {
  it('both anon and authenticated can read shared rows', async () => {
    const sharedId = `share_${mockMapId}`;
    const anonClient = makeClient('anon', null, [sharePayload(sharedId, mockUserId)]);
    const authClient = makeClient('authenticated', mockUserIdAlt, [sharePayload(sharedId, mockUserId)]);

    for (const client of [anonClient, authClient]) {
      const { data, error } = await client.from('shared_mindmaps').select('*');
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe(sharedId);
    }
  });

  it('unshared rows are invisible under the SELECT policy', async () => {
    const sharedId = `share_${mockMapId}`;
    const client = makeClient('authenticated', mockUserId, [
      sharePayload(sharedId, mockUserId, { is_shared: false }),
    ]);

    const { data } = await client.from('shared_mindmaps').select('*');
    expect(data).toHaveLength(0);
  });
});

describe('shared_mindmaps DELETE policy', () => {
  it('authenticated author can delete their own share', async () => {
    const sharedId = `share_${mockMapId}`;
    const client = makeClient('authenticated', mockUserId, [sharePayload(sharedId, mockUserId)]);

    const { error } = await client.from('shared_mindmaps').delete().eq('id', sharedId);
    expect(error).toBeNull();
    expect(client._store.shared_mindmaps.has(sharedId)).toBe(false);
  });

  it('authenticated user cannot delete another author share (USING blocks)', async () => {
    const sharedId = `share_other`;
    const client = makeClient('authenticated', mockUserId, [sharePayload(sharedId, mockUserIdAlt)]);

    const { error } = await client.from('shared_mindmaps').delete().eq('id', sharedId);
    expect(error).toBeNull();
    expect(client._store.shared_mindmaps.has(sharedId)).toBe(true);
  });

  it('anonymous user has no DELETE policy — delete is a silent no-op', async () => {
    const sharedId = `share_anon_del`;
    const client = makeClient('anon', null, [sharePayload(sharedId, null)]);

    const { error } = await client.from('shared_mindmaps').delete().eq('id', sharedId);
    expect(error).toBeNull();
    expect(client._store.shared_mindmaps.has(sharedId)).toBe(true);
  });
});

describe('shared_mindmaps — regression: RLS disabled behaves as before', () => {
  it('accepts any author when no rls config is supplied (existing behavior)', async () => {
    const sharedId = `share_no_rls`;
    const client = createMockSupabaseClient({ shared_mindmaps: new Map() });

    const { error } = await client
      .from('shared_mindmaps')
      .upsert(sharePayload(sharedId, mockUserId), { onConflict: 'id' });

    expect(error).toBeNull();
    expect(client._store.shared_mindmaps.get(sharedId)!.original_author_id).toBe(mockUserId);
  });
});
