-- ─── Harden RLS on public.users ─────────────────────────────────────
-- The public.users table (custom mirror of auth.users used by the app:
-- preferences, statistics, is_admin, display_name, email) was created in
-- the remote schema WITHOUT any RLS policies (migration 20260614150709 is a
-- stub). Consequences:
--   • If RLS is disabled → anon can read every user's email/display_name/
--     is_admin AND write any row — including self-promotion (is_admin = true).
--   • If RLS is enabled with no policies → client flows (tracker.ts
--     initializeUserProfile, profile page updates, auth-context is_admin
--     reads) fail outright.
-- This migration enables RLS and scopes access so both cases converge on the
-- correct behavior:
--   • authenticated → own row only (select / insert / update)
--   • service_role  → everything (admin routes, cron, backfills)
--   • is_admin is NOT updatable by client roles → closes privilege escalation.
-- All statements are idempotent (drop-if-exists, revoke is a no-op when the
-- privilege is not held).

alter table public.users enable row level security;

-- ── Own-row reads (auth-context is_admin check, profile page, tracker) ──
drop policy if exists "Users can read own user row" on users;
create policy "Users can read own user row"
  on users for select
  to authenticated
  using (auth.uid() = id);

-- ── First-login upsert (tracker.ts initializeUserProfile) ──
drop policy if exists "Users can insert own user row" on users;
create policy "Users can insert own user row"
  on users for insert
  to authenticated
  with check (auth.uid() = id);

-- ── Profile edits (profile page, use-mind-map-persistence) ──
drop policy if exists "Users can update own user row" on users;
create policy "Users can update own user row"
  on users for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── service_role for admin routes / cron / backfills ──
drop policy if exists "Service role can all users" on users;
create policy "Service role can all users"
  on users for all
  to service_role
  using (true)
  with check (true);

-- ── Privilege-escalation guard ───────────────────────────────────────
-- The update policy above lets a user edit their own row; without this
-- revoke they could flip their own is_admin to true and take over admin
-- checks (require-auth.ts, auth-context.tsx, supabase-server.ts). Revoking
-- column-level UPDATE from client roles is a no-op if the grant was never
-- held, and is safe even if RLS was previously disabled (grants remain but
-- row access is now gated by the policies above).
revoke update (is_admin) on public.users from anon, authenticated;
