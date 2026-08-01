-- ─── Scope ALL remaining RLS policies to service_role + auth.uid() checks ───
-- Completes the RLS hardening started in 20260731000001 / 20260801000001 /
-- 20260801000002 / 20260801000003. Tables hardened earlier: user_events,
-- user_profiles, platform_stats, users, ai_calls, analytics_events.
--
-- NOTE: This migration targets the EXISTING linked remote DB — the core app
-- tables (mindmaps, feedback, chat_sessions, ...) were created directly in
-- the remote project, not in this repo's migrations (the checked-in
-- initial_schema.sql is a comment stub and the remote schema dump is empty).
-- It is NOT greenfield/reset-safe: `supabase db reset` would fail at the
-- first `alter table` on a table that only exists remotely.
--
-- This migration hardens the tables that had NO RLS at all, or over-permissive
-- policies:
--   • mindmaps, public_mindmaps, feedback, chat_sessions, user_settings,
--     admin_activity_log, user_points, point_transactions, user_notifications,
--     community_posts, shared_mindmaps, feedback_counters → RLS enabled now.
--   • map_cache → was `authenticated using (true)` read+insert (ANY logged-in
--     user could read every cache entry). It is server-side only, so it is
--     restricted to service_role.
--   • user_daily_challenges → had SELECT/INSERT own-row but no UPDATE (the
--     client upsert on conflict was being blocked) and no service_role policy.
--
-- Policy pattern per table:
--   • authenticated / anon → own-row access gated by auth.uid()
--   • service_role          → full access (admin routes, cron, backfills)
--   • genuinely public rows (public_mindmaps, shared_mindmaps, feedback
--     community insights) keep SELECT for anon/authenticated.
-- All statements are idempotent (drop-if-exists + create).

-- ── 0. Admin helper: public.is_admin() ────────────────────────────────────
-- SECURITY DEFINER so policies can gate admin-only rows/actions without a
-- recursive RLS subquery on public.users. Reads auth.uid() from the request
-- JWT (same GUC the client roles use), so it cannot be spoofed.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select is_admin from public.users where id = auth.uid()),
    false
  );
$$;

-- Client roles may call it (policies run as the invoking role). New
-- public-schema functions default to PUBLIC EXECUTE, so revoke explicitly
-- (anon has no uid anyway and would always get false — this makes the intent
-- explicit rather than relying on defaults).
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ═════════════════════════════════════════════════════════════════════════
-- 1. mindmaps
-- Client: own-row CRUD (canvas, library, profile), moderation reads public
-- maps. Public maps are visible to any authenticated user (admin moderation
-- UI); anon viewing goes through public_mindmaps instead.
-- ═════════════════════════════════════════════════════════════════════════
alter table public.mindmaps enable row level security;

drop policy if exists "Users can read own or public mindmaps" on public.mindmaps;
create policy "Users can read own or public mindmaps"
  on public.mindmaps for select
  to authenticated
  using (user_id = auth.uid() or is_public = true);

drop policy if exists "Users can insert own mindmaps" on public.mindmaps;
create policy "Users can insert own mindmaps"
  on public.mindmaps for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update own mindmaps" on public.mindmaps;
create policy "Users can update own mindmaps"
  on public.mindmaps for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can delete own mindmaps" on public.mindmaps;
create policy "Users can delete own mindmaps"
  on public.mindmaps for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Service role can all mindmaps" on public.mindmaps;
create policy "Service role can all mindmaps"
  on public.mindmaps for all
  to service_role
  using (true)
  with check (true);

-- ═════════════════════════════════════════════════════════════════════════
-- 2. public_mindmaps  (community showcase / published maps)
-- Public maps are readable by everyone (community page, shared viewing).
-- Writes are restricted to the original author (original_author_id — this
-- table has NO user_id column; publishing writes original_author_id only).
-- ═════════════════════════════════════════════════════════════════════════
alter table public.public_mindmaps enable row level security;

drop policy if exists "Anyone can read public mindmaps" on public.public_mindmaps;
create policy "Anyone can read public mindmaps"
  on public.public_mindmaps for select
  to anon, authenticated
  using (is_public = true);

drop policy if exists "Authors can insert public mindmaps" on public.public_mindmaps;
create policy "Authors can insert public mindmaps"
  on public.public_mindmaps for insert
  to authenticated
  with check (original_author_id = auth.uid());

drop policy if exists "Authors can update public mindmaps" on public.public_mindmaps;
create policy "Authors can update public mindmaps"
  on public.public_mindmaps for update
  to authenticated
  using (original_author_id = auth.uid() or public.is_admin())
  with check (original_author_id = auth.uid() or public.is_admin());

drop policy if exists "Authors can delete public mindmaps" on public.public_mindmaps;
create policy "Authors can delete public mindmaps"
  on public.public_mindmaps for delete
  to authenticated
  using (original_author_id = auth.uid() or public.is_admin());

drop policy if exists "Service role can all public mindmaps" on public.public_mindmaps;
create policy "Service role can all public mindmaps"
  on public.public_mindmaps for all
  to service_role
  using (true)
  with check (true);

-- NOTE: public_views is incremented by VIEWERS (not just the author) whenever
-- a public map is opened. Under own-row-writes that client-side `.update()`
-- would now be blocked for non-authors, so section 16 ships the
-- SECURITY DEFINER RPC increment_public_map_views(uuid) and the client call
-- sites must switch to it.

-- ═════════════════════════════════════════════════════════════════════════
-- 3. feedback
-- Community "Insights" section is intentionally public (SELECT). The remote
-- feedback table has NO user_id column — feedback is keyed by tracking_id and
-- written server-side (submitFeedbackAction via getSupabaseAdmin), so:
--   • no client INSERT policy (writes go through service_role)
--   • UPDATE is admin-only — FeedbackCards moderation runs from the client
--     and must keep working for admins (this also closes the prior hole where
--     any authenticated user could edit ANY feedback's status/priority/notes)
--   • service_role gets full access
-- ═════════════════════════════════════════════════════════════════════════
alter table public.feedback enable row level security;

drop policy if exists "Anyone can read feedback" on public.feedback;
create policy "Anyone can read feedback"
  on public.feedback for select
  to anon, authenticated
  using (true);

drop policy if exists "Users or admins can update feedback" on public.feedback;
create policy "Users or admins can update feedback"
  on public.feedback for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Service role can all feedback" on public.feedback;
create policy "Service role can all feedback"
  on public.feedback for all
  to service_role
  using (true)
  with check (true);

-- ═════════════════════════════════════════════════════════════════════════
-- 4. chat_sessions
-- ═════════════════════════════════════════════════════════════════════════
alter table public.chat_sessions enable row level security;

drop policy if exists "Users can read own chat sessions" on public.chat_sessions;
create policy "Users can read own chat sessions"
  on public.chat_sessions for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can insert own chat sessions" on public.chat_sessions;
create policy "Users can insert own chat sessions"
  on public.chat_sessions for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update own chat sessions" on public.chat_sessions;
create policy "Users can update own chat sessions"
  on public.chat_sessions for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can delete own chat sessions" on public.chat_sessions;
create policy "Users can delete own chat sessions"
  on public.chat_sessions for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Service role can all chat sessions" on public.chat_sessions;
create policy "Service role can all chat sessions"
  on public.chat_sessions for all
  to service_role
  using (true)
  with check (true);

-- ═════════════════════════════════════════════════════════════════════════
-- 5. user_settings  (API keys, model prefs — own-row only)
-- ═════════════════════════════════════════════════════════════════════════
alter table public.user_settings enable row level security;

drop policy if exists "Users can read own settings" on public.user_settings;
create policy "Users can read own settings"
  on public.user_settings for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can insert own settings" on public.user_settings;
create policy "Users can insert own settings"
  on public.user_settings for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update own settings" on public.user_settings;
create policy "Users can update own settings"
  on public.user_settings for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Service role can all user settings" on public.user_settings;
create policy "Service role can all user settings"
  on public.user_settings for all
  to service_role
  using (true)
  with check (true);

-- ═════════════════════════════════════════════════════════════════════════
-- 6. admin_activity_log
-- Reads happen from the ADMIN page via the authenticated client (realtime
-- subscription), so SELECT is gated on is_admin(). Writes are service_role.
-- ═════════════════════════════════════════════════════════════════════════
alter table public.admin_activity_log enable row level security;

drop policy if exists "Admins can read activity log" on public.admin_activity_log;
create policy "Admins can read activity log"
  on public.admin_activity_log for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Service role can all activity log" on public.admin_activity_log;
create policy "Service role can all activity log"
  on public.admin_activity_log for all
  to service_role
  using (true)
  with check (true);

-- ═════════════════════════════════════════════════════════════════════════
-- 7. user_points / 8. point_transactions
-- Writes happen server-side via getSupabaseAdmin (points-engine.ts), so
-- client roles only need own-row SELECT (points dashboard, history).
-- ═════════════════════════════════════════════════════════════════════════
alter table public.user_points enable row level security;

drop policy if exists "Users can read own points" on public.user_points;
create policy "Users can read own points"
  on public.user_points for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Service role can all user points" on public.user_points;
create policy "Service role can all user points"
  on public.user_points for all
  to service_role
  using (true)
  with check (true);

alter table public.point_transactions enable row level security;

drop policy if exists "Users can read own point transactions" on public.point_transactions;
create policy "Users can read own point transactions"
  on public.point_transactions for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Service role can all point transactions" on public.point_transactions;
create policy "Service role can all point transactions"
  on public.point_transactions for all
  to service_role
  using (true)
  with check (true);

-- ═════════════════════════════════════════════════════════════════════════
-- 9. user_notifications  (own-row reads; server pushes via service_role)
-- NOTE: this table does NOT exist in the linked remote DB (the app references
-- it only in adminDeleteUserAction cleanup). Guarded with to_regclass so the
-- migration applies cleanly now and hardens the table if/when it is created.
-- ═════════════════════════════════════════════════════════════════════════
do $$
begin
  if to_regclass('public.user_notifications') is not null then
    execute 'alter table public.user_notifications enable row level security';
    execute 'create policy "Users can read own notifications" on public.user_notifications for select to authenticated using (user_id = auth.uid())';
    execute 'create policy "Users can update own notifications" on public.user_notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())';
    execute 'create policy "Service role can all notifications" on public.user_notifications for all to service_role using (true) with check (true)';
  end if;
end $$;

-- ═════════════════════════════════════════════════════════════════════════
-- 10. community_posts  (own-row; admin moderation via service_role)
-- NOTE: this table does NOT exist in the linked remote DB (the app references
-- it only in adminDeleteUserAction cleanup). Guarded with to_regclass so the
-- migration applies cleanly now and hardens the table if/when it is created.
-- ═════════════════════════════════════════════════════════════════════════
do $$
begin
  if to_regclass('public.community_posts') is not null then
    execute 'alter table public.community_posts enable row level security';
    execute 'create policy "Users can read own community posts" on public.community_posts for select to authenticated using (user_id = auth.uid())';
    execute 'create policy "Users can insert own community posts" on public.community_posts for insert to authenticated with check (user_id = auth.uid())';
    execute 'create policy "Users can update own community posts" on public.community_posts for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())';
    execute 'create policy "Users can delete own community posts" on public.community_posts for delete to authenticated using (user_id = auth.uid())';
    execute 'create policy "Service role can all community posts" on public.community_posts for all to service_role using (true) with check (true)';
  end if;
end $$;

-- ═════════════════════════════════════════════════════════════════════════
-- 11. shared_mindmaps  (share-by-link: anon can read shared rows)
-- original_author_id is uuid + FK -> users.id in the remote DB, so an
-- anonymous share-by-link writes NULL (never a string marker; a literal
-- 'anonymous' would violate the uuid cast / FK).
-- ═════════════════════════════════════════════════════════════════════════
alter table public.shared_mindmaps enable row level security;

drop policy if exists "Anyone can read shared mindmaps" on public.shared_mindmaps;
create policy "Anyone can read shared mindmaps"
  on public.shared_mindmaps for select
  to anon, authenticated
  using (is_shared = true);

drop policy if exists "Users can insert shared mindmaps" on public.shared_mindmaps;
create policy "Users can insert shared mindmaps"
  on public.shared_mindmaps for insert
  to authenticated
  with check (original_author_id = auth.uid());

-- Anonymous share-by-link: the client writes original_author_id = NULL when no
-- user is signed in (CanvasClient handleShare). Scope anon writes to NULL so
-- anon callers can never claim a real user's uid.
drop policy if exists "Anonymous can insert shared maps" on public.shared_mindmaps;
create policy "Anonymous can insert shared maps"
  on public.shared_mindmaps for insert
  to anon
  with check (original_author_id is null);

drop policy if exists "Users can update shared mindmaps" on public.shared_mindmaps;
create policy "Users can update shared mindmaps"
  on public.shared_mindmaps for update
  to authenticated
  using (original_author_id = auth.uid())
  with check (original_author_id = auth.uid());

-- Anonymous re-share (upsert on conflict 'id' performs an UPDATE for existing
-- rows, so anon needs an UPDATE policy scoped to NULL-author rows).
drop policy if exists "Anonymous can update shared maps" on public.shared_mindmaps;
create policy "Anonymous can update shared maps"
  on public.shared_mindmaps for update
  to anon
  using (original_author_id is null)
  with check (original_author_id is null);

drop policy if exists "Users can delete shared mindmaps" on public.shared_mindmaps;
create policy "Users can delete shared mindmaps"
  on public.shared_mindmaps for delete
  to authenticated
  using (original_author_id = auth.uid());

drop policy if exists "Service role can all shared mindmaps" on public.shared_mindmaps;
create policy "Service role can all shared mindmaps"
  on public.shared_mindmaps for all
  to service_role
  using (true)
  with check (true);

-- ═════════════════════════════════════════════════════════════════════════
-- 12. map_cache  — FIX over-permissive policies
-- Server-side cache only (actions.ts uses getSupabaseAdmin). The old
-- `authenticated using (true)` SELECT+INSERT let ANY logged-in user read and
-- overwrite every cache entry. Restrict to service_role.
-- ═════════════════════════════════════════════════════════════════════════
drop policy if exists "Allow authenticated read access to map_cache" on public.map_cache;
drop policy if exists "Allow authenticated insert access to map_cache" on public.map_cache;

alter table public.map_cache enable row level security;

drop policy if exists "Service role can all map cache" on public.map_cache;
create policy "Service role can all map cache"
  on public.map_cache for all
  to service_role
  using (true)
  with check (true);

-- ═════════════════════════════════════════════════════════════════════════
-- 13. user_daily_challenges — add missing UPDATE + service_role
-- (existing SELECT/INSERT own-row policies from 20260705000001 stay; the
-- client upserts on (user_id, date_string) so an UPDATE policy is required.)
-- ═════════════════════════════════════════════════════════════════════════
alter table public.user_daily_challenges enable row level security;

drop policy if exists "Users can update their own daily challenges" on public.user_daily_challenges;
create policy "Users can update their own daily challenges"
  on public.user_daily_challenges for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Service role can all daily challenges" on public.user_daily_challenges;
create policy "Service role can all daily challenges"
  on public.user_daily_challenges for all
  to service_role
  using (true)
  with check (true);

-- ═════════════════════════════════════════════════════════════════════════
-- 14. feedback_counters  (server-only tracking id counter)
-- ═════════════════════════════════════════════════════════════════════════
alter table public.feedback_counters enable row level security;

drop policy if exists "Service role can all feedback counters" on public.feedback_counters;
create policy "Service role can all feedback counters"
  on public.feedback_counters for all
  to service_role
  using (true)
  with check (true);

-- ═════════════════════════════════════════════════════════════════════════
-- 15. View-counter RPC — increment_public_map_views(uuid)
-- public_views is bumped by VIEWERS (anon or authenticated) whenever a public
-- map is opened (CanvasClient fetchMindMapData). Under own-row UPDATE policies
-- a non-author can no longer UPDATE another user's row directly. This
-- SECURITY DEFINER RPC exposes ONLY the counter increment and ONLY on rows
-- that are actually public — no other column is writable through it.
-- ═════════════════════════════════════════════════════════════════════════
create or replace function public.increment_public_map_views(p_map_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.public_mindmaps
  set public_views = coalesce(public_views, 0) + 1
  where id = p_map_id
    and is_public = true;
end;
$$;

-- PostgREST default grants EXECUTE to PUBLIC; lock it down to the roles that
-- actually need it (anon viewers, authenticated viewers, and service_role).
revoke execute on function public.increment_public_map_views(uuid) from public;
grant execute on function public.increment_public_map_views(uuid) to anon, authenticated, service_role;

-- ═════════════════════════════════════════════════════════════════════════
-- 16. Verification — fail loudly if any hardened table regresses
-- Each table below must have RLS enabled AND a service_role policy.
-- ═════════════════════════════════════════════════════════════════════════
do $$
declare
  v_missing text;
begin
  select string_agg(t, ', ' order by t) into v_missing
  from unnest(array[
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
    'map_cache',
    'user_daily_challenges',
    'feedback_counters'
  ]) as t
  -- Only verify tables that actually exist (user_notifications/community_posts
  -- are absent from the remote DB and are handled by guarded DO blocks above).
  where to_regclass('public.' || t) is not null
    and not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    left join pg_policies p
      on p.schemaname = n.nspname
     and p.tablename = c.relname
     and 'service_role' = any(p.roles)
    where n.nspname = 'public'
      and c.relname = t
      and c.relrowsecurity
      and p.policyname is not null
  );

  if v_missing is not null then
    raise exception 'RLS hardening regression — tables missing RLS+service_role policy: %', v_missing;
  end if;
end $$;
