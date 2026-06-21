-- ─── pg_cron: Scheduled Recompute for Materialized Stats ─────────
-- This migration enables pg_cron (if not already enabled) and schedules
-- two recurring jobs:
--
--   1. recompute_active_user_profiles() — every 5 minutes
--      Scans user_events for users with activity in the last 5 minutes
--      and calls recompute_user_profile() for each, keeping user_profiles
--      fresh within one cron cycle.
--
--   2. recompute_platform_stats() — every 5 minutes
--      Rebuilds the single-row platform_stats table (global aggregates,
--      daily snapshot, health score) from user_profiles and user_events.
--
--   3. recompute_all_user_profiles() — every 6 hours (off-peak)
--      Full recompute of ALL user profiles for consistency, catching any
--      rows that incremental scanning missed.
--
-- Requirements:
--   • pg_cron extension (Supabase Pro plan or self-hosted)
--   • The existing recompute_user_profile(uuid) and recompute_platform_stats()
--     functions from the 20260621000001 migration.
-- ────────────────────────────────────────────────────────────────────

-- ── 1. Enable pg_cron ──────────────────────────────────────────

create extension if not exists pg_cron with schema pg_catalog;

-- Ensure the cron jobs run in the public schema
grant usage on schema public to postgres;


-- ── 2. Wrapper: recompute_active_user_profiles() ────────────────
-- Scans user_events for users who have events newer than the last
-- cron run (using a generous 10-minute lookback window) and calls
-- recompute_user_profile() for each.
--
-- This avoids recomputing profiles for idle users every 5 minutes.
-- ────────────────────────────────────────────────────────────────

create or replace function public.recompute_active_user_profiles()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
  v_user_id uuid;
  v_start timestamptz := clock_timestamp();
begin
  -- Iterate over users with events in the last 10 minutes
  for v_user_id in
    select distinct user_id
    from user_events
    where created_at >= now() - interval '10 minutes'
  loop
    perform recompute_user_profile(v_user_id);
    v_count := v_count + 1;
  end loop;

  return format(
    'Recomputed %s user profiles in %s ms',
    v_count,
    round(extract(epoch from (clock_timestamp() - v_start)) * 1000)::text
  );
end;
$$;


-- ── 3. Wrapper: recompute_all_user_profiles() ───────────────────
-- Full recompute of ALL user profiles. Intended for off-peak hours.
-- ────────────────────────────────────────────────────────────────

create or replace function public.recompute_all_user_profiles()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
  v_user_id uuid;
  v_start timestamptz := clock_timestamp();
begin
  for v_user_id in
    select distinct user_id from user_events order by user_id
  loop
    perform recompute_user_profile(v_user_id);
    v_count := v_count + 1;
  end loop;

  return format(
    'Full recompute: %s profiles in %s ms',
    v_count,
    round(extract(epoch from (clock_timestamp() - v_start)) * 1000)::text
  );
end;
$$;


-- ── 4. Schedule cron jobs ───────────────────────────────────────

-- ⏰ Every 5 minutes: recompute profiles for recently active users
select cron.schedule(
  'recompute-active-user-profiles',  -- job name
  '*/5 * * * *',                     -- every 5 minutes
  $$select public.recompute_active_user_profiles();$$
);

-- ⏰ Every 5 minutes: refresh platform stats
select cron.schedule(
  'recompute-platform-stats',        -- job name
  '*/5 * * * *',                     -- every 5 minutes
  $$select public.recompute_platform_stats();$$
);

-- ⏰ Every 6 hours at :15 past: full recompute of ALL user profiles
select cron.schedule(
  'recompute-all-user-profiles',     -- job name
  '15 */6 * * *',                    -- at minute 15 past every 6 hours
  $$select public.recompute_all_user_profiles();$$
);


-- ── 5. Helper: view current cron jobs ──────────────────────────
-- You can query pg_cron jobs anytime:
--   select * from cron.job;
--   select * from cron.job_run_details order by start_time desc limit 10;
