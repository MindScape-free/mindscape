-- ─── Fix RLS Policies on user_events and user_profiles ─────────────
-- Previous policies used `using (true)` for SELECT, which allowed any
-- authenticated user to read ALL users' data. This migration restricts
-- access so users can only read their own data, while service_role
-- (used by admin code) bypasses RLS entirely.
-- ────────────────────────────────────────────────────────────────────

-- ══════════════════════════════════════════════════════════════
-- user_events: restrict SELECT to own rows
-- ══════════════════════════════════════════════════════════════

drop policy if exists "Admins can read user_events" on user_events;

-- Users can read their own events
create policy "Users can read own events"
  on user_events for select
  using (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════
-- user_profiles: restrict SELECT to own row
-- ══════════════════════════════════════════════════════════════

drop policy if exists "Admins can read user_profiles" on user_profiles;

-- Users can read their own profile
create policy "Users can read own profile"
  on user_profiles for select
  using (auth.uid() = user_id);
