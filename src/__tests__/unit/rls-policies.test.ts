import fs from 'fs';
import path from 'path';

// ─────────────────────────────────────────────────────────────────────────
// Structural RLS regression guard.
//
// This test parses every SQL file under supabase/migrations/ and models the
// *effective* RLS policy state by applying DROP POLICY statements in file
// order (a later create with the same name+table replaces an earlier one).
//
// It exists to catch security regressions at CI time without needing a live
// Postgres instance:
//   1. Every table known to the app has RLS enabled.
//   2. Every table has at least one service_role policy (server/admin code
//      relies on service_role for privileged writes).
//   3. Client roles (authenticated/anon) never get bare `using (true)` or
//      `with check (true)` access — except for the intentional public read
//      surfaces (feedback community insights).
//   4. Server-only tables (map_cache, feedback_counters, ai_calls,
//      analytics_events) have NO client-role policies at all.
//   5. The admin helper public.is_admin() exists as SECURITY DEFINER.
//   6. user_daily_challenges keeps the UPDATE + service_role policies the
//      client upsert depends on.
// ─────────────────────────────────────────────────────────────────────────

const MIGRATIONS_DIR = path.join(process.cwd(), 'supabase', 'migrations');

interface RlsPolicy {
  name: string;
  table: string;
  command: 'ALL' | 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  roles: string[]; // lowercase; empty => 'public'
  usingExpr: string | null;
  withCheckExpr: string | null;
  file: string;
}

/** Tables created directly in the remote DB (not in this repo's migrations). */
const REMOTE_TABLES = [
  'users',
  'mindmaps',
  'public_mindmaps',
  'feedback',
  'chat_sessions',
  'user_settings',
  'admin_activity_log',
  'user_points',
  'point_transactions',
  'user_notifications',
  'community_posts',
  'shared_mindmaps',
  'feedback_counters',
];

/** Tables created inside this repo's migrations (also must be hardened). */
const MIGRATION_TABLES = [
  'user_events',
  'user_profiles',
  'platform_stats',
  'ai_calls',
  'analytics_events',
  'user_daily_challenges',
  'map_cache',
];

/** Tables with an intentional public SELECT surface (community read). */
const PUBLIC_READ_TABLES = new Set(['feedback']);

/** Server-only tables that must have zero client-role policies.
 *  (Tables with own-row client policies — user_events, user_points, etc. —
 *  are intentionally excluded; they are covered by the bare-true guard.) */
const SERVER_ONLY_TABLES = new Set([
  'map_cache',
  'feedback_counters',
  'ai_calls',
  'analytics_events',
  'platform_stats',
]);

function loadMigrationFiles(): { file: string; sql: string }[] {
  const dir = MIGRATIONS_DIR;
  if (!fs.existsSync(dir)) {
    throw new Error(`Migrations dir not found: ${dir} (run from project root)`);
  }
  return fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.sql'))
    .sort()
    .map(f => ({ file: f, sql: fs.readFileSync(path.join(dir, f), 'utf8') }));
}

/** Extract the text of each CREATE POLICY statement (scan to first `;`). */
function extractCreatePolicyStatements(sql: string): string[] {
  const out: string[] = [];
  const re = /create\s+policy\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql)) !== null) {
    const end = sql.indexOf(';', m.index);
    if (end === -1) {
      out.push(sql.slice(m.index));
      break;
    }
    out.push(sql.slice(m.index, end));
  }
  return out;
}

function extractDropPolicyStatements(sql: string): { name: string; table: string }[] {
  const out: { name: string; table: string }[] = [];
  const re = /drop\s+policy\s+(?:if\s+exists\s+)?(?:"([^"]+)"|([^\s]+))\s+on\s+(?:(?:public|auth)\.)?([a-z_]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql)) !== null) {
    out.push({ name: m[1] || m[2]!, table: m[3]!.toLowerCase() });
  }
  return out;
}

function parsePolicy(stmt: string, file: string): RlsPolicy | null {
  const nameMatch = /^create\s+policy\s+(?:if\s+not\s+exists\s+)?(?:"([^"]+)"|([^\s]+))/i.exec(stmt);
  if (!nameMatch) return null;
  const name = nameMatch[1] || nameMatch[2]!;

  const tableMatch = /\bon\s+(?:(?:public|auth)\.)?([a-z_]+)\s+for\s+(all|select|insert|update|delete)\b/i.exec(stmt);
  if (!tableMatch) return null;

  // Roles: between `to` and the next `using`/`with check`/end. `as` (permissive)
  // is not used in this repo, so `to` is directly followed by role identifiers.
  let roles: string[] = [];
  const toMatch = /\bto\s+([a-z_,\s]+?)(?=\s+(?:using\s*\(|with\s+check\s*\)?\s*\(|;\s*$)|\s*$)/i.exec(stmt);
  if (toMatch) {
    roles = toMatch[1]
      .split(',')
      .map(r => r.trim().toLowerCase())
      .filter(Boolean);
  }

  // using(...) may be the final clause (no trailing `with check`), so the
  // lookahead must accept end-of-statement too.
  const usingMatch = /using\s*\(([\s\S]*?)\)\s*(?:with\s+check\s*\(|;|$)/i.exec(stmt);
  const withCheckMatch = /with\s+check\s*\(([\s\S]*?)\)\s*(?:;|$)/i.exec(stmt);

  return {
    name,
    table: tableMatch[1].toLowerCase(),
    command: tableMatch[2].toUpperCase() as RlsPolicy['command'],
    roles,
    usingExpr: usingMatch ? usingMatch[1].trim() : null,
    withCheckExpr: withCheckMatch ? withCheckMatch[1].trim() : null,
    file,
  };
}

interface MigrationModel {
  rlsEnabledTables: Set<string>;
  createdTables: Set<string>;
  effectivePolicies: Map<string, RlsPolicy>; // key: `${table}:${name}`
}

function buildModel(): MigrationModel {
  const files = loadMigrationFiles();
  const model: MigrationModel = {
    rlsEnabledTables: new Set(),
    createdTables: new Set(),
    effectivePolicies: new Map(),
  };

  for (const { file, sql } of files) {
    // RLS-enabled tables
    const rlsRe = /alter\s+table\s+(?:(?:public|auth)\.)?([a-z_]+)\s+enable\s+row\s+level\s+security/gi;
    let m: RegExpExecArray | null;
    while ((m = rlsRe.exec(sql)) !== null) model.rlsEnabledTables.add(m[1].toLowerCase());

    // Tables created in migrations
    const createRe = /\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?(?:(?:public|auth)\.)?([a-z_]+)/gi;
    while ((m = createRe.exec(sql)) !== null) model.createdTables.add(m[1].toLowerCase());

    // Drops remove from effective state (idempotent migrations drop-then-create)
    for (const drop of extractDropPolicyStatements(sql)) {
      model.effectivePolicies.delete(`${drop.table}:${drop.name}`);
    }

    // Creates set the effective state (later files win)
    for (const stmt of extractCreatePolicyStatements(sql)) {
      const p = parsePolicy(stmt, file);
      if (p) model.effectivePolicies.set(`${p.table}:${p.name}`, p);
    }
  }

  return model;
}

const ALL_KNOWN_TABLES = [...new Set([...REMOTE_TABLES, ...MIGRATION_TABLES])];

function tablePolicyKeys(model: MigrationModel, table: string): string[] {
  return [...model.effectivePolicies.keys()].filter(k => k.startsWith(`${table}:`));
}

function policiesFor(model: MigrationModel, table: string): RlsPolicy[] {
  return tablePolicyKeys(model, table).map(k => model.effectivePolicies.get(k)!);
}

describe('RLS hardening regression guard', () => {
  const model = buildModel();

  it('every app table has RLS enabled (from migrations or remote schema)', () => {
    for (const table of ALL_KNOWN_TABLES) {
      expect(model.rlsEnabledTables.has(table)).toBe(true);
    }
  });

  it('every app table has at least one service_role policy', () => {
    for (const table of ALL_KNOWN_TABLES) {
      const hasServiceRole = policiesFor(model, table).some(p =>
        p.roles.includes('service_role'),
      );
      expect(hasServiceRole).toBe(true);
    }
  });

  it('no bare `using (true)` / `with check (true)` for client roles on non-public tables', () => {
    for (const p of model.effectivePolicies.values()) {
      const targetsClientRole =
        p.roles.length === 0 || p.roles.some(r => r === 'authenticated' || r === 'anon');
      if (!targetsClientRole) continue;

      const bareUsing = p.usingExpr?.trim().toLowerCase() === 'true';
      const bareWithCheck = p.withCheckExpr?.trim().toLowerCase() === 'true';
      if (p.command === 'SELECT' && PUBLIC_READ_TABLES.has(p.table) && bareUsing) continue;

      // No client-role policy may ever be a bare-true write (INSERT/UPDATE/DELETE/ALL).
      expect(bareUsing || bareWithCheck).toBe(false);
    }
  });

  it('server-only tables expose zero client-role policies', () => {
    for (const table of SERVER_ONLY_TABLES) {
      const clientPolicies = policiesFor(model, table).filter(p =>
        p.roles.length === 0 || p.roles.some(r => r === 'authenticated' || r === 'anon'),
      );
      expect(clientPolicies).toEqual([]);
    }
  });

  it('admin_activity_log reads are admin-gated, not open to all authenticated users', () => {
    const readPolicies = policiesFor(model, 'admin_activity_log').filter(
      p => p.command === 'SELECT' || p.command === 'ALL',
    );
    const hasAdminGate = readPolicies.some(
      p =>
        p.roles.includes('service_role') ||
        (p.roles.some(r => r === 'authenticated') && p.usingExpr?.includes('is_admin')),
    );
    expect(hasAdminGate).toBe(true);
  });

  it('public.is_admin() helper exists as SECURITY DEFINER', () => {
    const allSql = loadMigrationFiles().map(f => f.sql).join('\n');
    expect(/create\s+or\s+replace\s+function\s+public\.is_admin\(\)/i.test(allSql)).toBe(true);
    expect(/\bsecurity\s+definer\b/i.test(allSql)).toBe(true);
  });

  it('increment_public_map_views RPC is SECURITY DEFINER with scoped EXECUTE', () => {
    const allSql = loadMigrationFiles().map(f => f.sql).join('\n');
    // RPC exists and is hardened
    const rpcMatch = /create\s+or\s+replace\s+function\s+public\.increment_public_map_views\s*\(\s*p_map_id\s+uuid\s*\)/i.exec(allSql);
    expect(rpcMatch).not.toBeNull();
    // Scope the SECURITY DEFINER check to the RPC's own statement block so it
    // cannot pass vacuously because OTHER functions in the corpus are hardened.
    const rpcBlock = allSql.slice(rpcMatch!.index, rpcMatch!.index + 800);
    expect(/\bsecurity\s+definer\b/i.test(rpcBlock)).toBe(true);
    // Execute is revoked from PUBLIC (defense in depth) and granted to the
    // roles that actually need it (anon viewers + authenticated viewers + service_role).
    const revokeLine = allSql.match(/revoke\s+execute\s+on\s+function\s+public\.increment_public_map_views\(uuid\)\s+from\s+public/i);
    expect(revokeLine).not.toBeNull();
    const grantLine = allSql.match(/grant\s+execute\s+on\s+function\s+public\.increment_public_map_views\(uuid\)\s+to\s+([a-z_,\s]+)/i);
    expect(grantLine).not.toBeNull();
    expect(grantLine![1]).toContain('anon');
    expect(grantLine![1]).toContain('authenticated');
    expect(grantLine![1]).toContain('service_role');
  });

  it('client moderation can manage public_mindmaps via is_admin() escape hatch', () => {
    const policies = policiesFor(model, 'public_mindmaps');
    const updatePolicy = policies.find(p => p.command === 'UPDATE');
    const deletePolicy = policies.find(p => p.command === 'DELETE');
    expect(updatePolicy?.usingExpr).toContain('is_admin');
    expect(deletePolicy?.usingExpr).toContain('is_admin');
  });

  it('user_daily_challenges keeps UPDATE and service_role policies for the client upsert', () => {
    const policies = policiesFor(model, 'user_daily_challenges');
    const hasUpdateOwn = policies.some(
      p =>
        p.command === 'UPDATE' &&
        p.roles.includes('authenticated') &&
        p.usingExpr?.includes('auth.uid()'),
    );
    const hasServiceRole = policies.some(p => p.roles.includes('service_role'));
    expect(hasUpdateOwn).toBe(true);
    expect(hasServiceRole).toBe(true);
  });
});
