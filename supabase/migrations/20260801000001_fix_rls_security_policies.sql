-- ─── Fix RLS Security Write Policies on user_events, user_profiles, platform_stats ───
-- Restrict service role policies to `to service_role` or enforce auth.uid() checks.

-- 1. user_events
-- NOTE: "Service role can insert user_events" is also created by the earlier
-- migration 20260731000001_harden_rls_policies.sql, so it MUST be dropped
-- here first (create policy errors on an existing name) to keep migrations
-- composable regardless of apply order.
drop policy if exists "Service role can insert" on user_events;
drop policy if exists "Service role can insert user_events" on user_events;
drop policy if exists "Users can insert own events" on user_events;

create policy "Users can insert own events"
  on user_events for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Service role can insert user_events"
  on user_events for insert
  to service_role
  with check (true);

-- 2. user_profiles
-- NOTE: the policies below may also exist from 20260731000001 — drop first
-- to keep migrations composable.
drop policy if exists "Service role can upsert" on user_profiles;
drop policy if exists "Service role can upsert user_profiles" on user_profiles;
drop policy if exists "Users can insert own profile" on user_profiles;
drop policy if exists "Users can update own profile" on user_profiles;

-- NOTE: "Users can insert own profile" is intentionally recreated here — the
-- client onboarding flow (tracker.ts initializeUserProfile) upserts into
-- user_profiles from the authenticated client, which needs an INSERT policy
-- (upsert with onConflict requires both INSERT and UPDATE policies in RLS).
create policy "Users can insert own profile"
  on user_profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own profile"
  on user_profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Service role can all user_profiles"
  on user_profiles for all
  to service_role
  using (true)
  with check (true);

-- 3. platform_stats
-- NOTE: the policy below may also exist from 20260731000001 — drop first.
drop policy if exists "Service role can upsert" on platform_stats;
drop policy if exists "Service role can upsert platform_stats" on platform_stats;

create policy "Service role can manage platform_stats"
  on platform_stats for all
  to service_role
  using (true)
  with check (true);
