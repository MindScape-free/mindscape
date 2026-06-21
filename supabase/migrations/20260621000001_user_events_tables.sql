-- ─── User Events (Immutable Event Log) ─────────────────────────────
-- Every user action (minor to major) is recorded here as an append-only row.
-- This is the single source of truth for all user activity.
-- ────────────────────────────────────────────────────────────────────

create table if not exists user_events (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references public.users(id) on delete cascade,
  event_type    text not null,
  event_data    jsonb not null default '{}',
  source        text,          -- 'canvas', 'home', 'api', 'admin', 'system'
  ip_address    text,
  user_agent    text,
  session_id    text,
  created_at    timestamptz not null default now()
);

-- Indexes for common query patterns
create index if not exists idx_user_events_user_id      on user_events(user_id);
create index if not exists idx_user_events_type          on user_events(event_type);
create index if not exists idx_user_events_created_at    on user_events(created_at desc);
create index if not exists idx_user_events_user_created  on user_events(user_id, created_at desc);
create index if not exists idx_user_events_type_created  on user_events(event_type, created_at desc);

-- Enable RLS (service_role bypasses, so only admin code can write)
alter table user_events enable row level security;

-- Allow authenticated admins to read, only service_role can insert
create policy "Admins can read user_events"
  on user_events for select
  using (true);  -- Application-layer auth via token verification

create policy "Service role can insert"
  on user_events for insert
  with check (true);  -- Service role bypasses RLS


-- ─── User Profiles (Pre-computed Per-User Aggregates) ──────────────
-- Populated by recompute_user_profile(). Stores everything needed for
-- the admin user detail dialog and the user's own profile page.
-- ────────────────────────────────────────────────────────────────────

create table if not exists user_profiles (
  user_id       uuid primary key references public.users(id) on delete cascade,

  -- Profile metadata (mirrored for fast access, refreshed by recompute)
  email         text,
  display_name  text,
  photo_url     text,
  created_at    timestamptz,

  -- Pre-computed aggregate counters
  total_maps             int not null default 0,
  total_compare_maps     int not null default 0,
  total_multi_maps       int not null default 0,
  total_chats            int not null default 0,
  total_nodes            int not null default 0,
  total_images           int not null default 0,
  total_expansions       int not null default 0,
  study_time_minutes     int not null default 0,

  -- Streak tracking (recomputed from events)
  current_streak         int not null default 0,
  longest_streak         int not null default 0,
  last_active_date       date,

  -- Pre-computed breakdowns (JSONB aggregations from event_data)
  mode_breakdown         jsonb not null default '{}',    -- { single: N, compare: N, multi: N }
  depth_breakdown        jsonb not null default '{}',    -- { low: N, medium: N, deep: N }
  source_breakdown       jsonb not null default '{}',    -- { text: N, pdf: N, website: N, youtube: N, image: N }
  persona_breakdown      jsonb not null default '{}',    -- { Teacher: N, Concise: N, Creative: N, Sage: N }

  -- Daily activity map for heatmap
  daily_activity         jsonb not null default '{}',    -- { "2026-06-20": { maps: 3, chats: 5, images: 1, ... } }

  -- Achievement tracking
  unlocked_achievements  text[] default '{}',

  updated_at             timestamptz not null default now()
);

alter table user_profiles enable row level security;

create policy "Admins can read user_profiles"
  on user_profiles for select
  using (true);

create policy "Service role can upsert"
  on user_profiles for all
  using (true)
  with check (true);


-- ─── Platform Stats (Pre-computed Global Aggregates) ──────────────
-- Single-row table holding platform-wide rolled-up stats.
-- Refreshed by recompute_platform_stats().
-- ────────────────────────────────────────────────────────────────────

create table if not exists platform_stats (
  id                text primary key default 'global',

  -- Totals
  total_users         int not null default 0,
  total_maps          int not null default 0,
  total_maps_ever     int not null default 0,
  total_chats         int not null default 0,
  total_nodes         int not null default 0,
  total_images        int not null default 0,
  total_events        bigint not null default 0,

  -- Time-windowed metrics
  new_users_24h       int not null default 0,
  new_maps_24h        int not null default 0,
  active_users_24h    int not null default 0,
  active_users_7d     int not null default 0,
  new_users_7d        int not null default 0,
  new_maps_7d         int not null default 0,

  -- Derived health scores
  health_score        int not null default 100,
  engagement_rate     double precision not null default 0,

  -- Pre-computed breakdowns (across all users)
  top_persona         text default 'N/A',
  top_source_type     text default 'N/A',
  avg_maps_per_user   double precision not null default 0,
  avg_nodes_per_map   double precision not null default 0,

  -- Daily snapshot for heatmap (31-day rolling window)
  daily_snapshot      jsonb not null default '[]',

  updated_at          timestamptz not null default now()
);

alter table platform_stats enable row level security;

create policy "Admins can read platform_stats"
  on platform_stats for select
  using (true);

create policy "Service role can upsert"
  on platform_stats for all
  using (true)
  with check (true);


-- ─── Helper: recompute_user_profile(user_id) ──────────────────────
-- Scans user_events for a single user and rebuilds their user_profiles row.
-- Can be called by a trigger after insert, or manually.
-- Returns the updated user_profiles row as JSON.
-- ────────────────────────────────────────────────────────────────────

create or replace function recompute_user_profile(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile jsonb;
  v_mode_bk jsonb;
  v_depth_bk jsonb;
  v_source_bk jsonb;
  v_persona_bk jsonb;
  v_daily jsonb;
  v_total_maps int := 0;
  v_total_compare int := 0;
  v_total_multi int := 0;
  v_total_chats int := 0;
  v_total_nodes int := 0;
  v_total_images int := 0;
  v_total_expansions int := 0;
  v_study_minutes int := 0;
  v_last_active date;
  v_current_streak int := 0;
  v_longest_streak int := 0;
  v_user_record record;
  v_event record;
  v_date_key text;
  v_daily_map jsonb;
  v_item jsonb;
begin
  -- Fetch base user info
  select email, display_name as display_name, photo_url, created_at
  into v_user_record
  from public.users
  where id = p_user_id;

  -- Initialize breakdown maps
  v_mode_bk := '{"single": 0, "compare": 0, "multi": 0}'::jsonb;
  v_depth_bk := '{"low": 0, "medium": 0, "deep": 0}'::jsonb;
  v_source_bk := '{}'::jsonb;
  v_persona_bk := '{}'::jsonb;
  v_daily := '{}'::jsonb;

  -- Iterate over all events for this user
  for v_event in
    select event_type, event_data, created_at::date as event_date
    from user_events
    where user_id = p_user_id
    order by created_at asc
  loop
    v_date_key := v_event.event_date::text;
    v_last_active := v_event.event_date;

    -- Tally by event_type
    case v_event.event_type
      when 'map_created' then
        v_total_maps := v_total_maps + 1;
        -- Mode
        if (v_event.event_data ->> 'mode') = 'compare' then
          v_total_compare := v_total_compare + 1;
          v_mode_bk := jsonb_set(v_mode_bk, '{compare}', to_jsonb((v_mode_bk->>'compare')::int + 1));
        elsif (v_event.event_data ->> 'mode') = 'multi' then
          v_total_multi := v_total_multi + 1;
          v_mode_bk := jsonb_set(v_mode_bk, '{multi}', to_jsonb((v_mode_bk->>'multi')::int + 1));
        else
          v_mode_bk := jsonb_set(v_mode_bk, '{single}', to_jsonb((v_mode_bk->>'single')::int + 1));
        end if;
        -- Nodes
        v_total_nodes := v_total_nodes + coalesce((v_event.event_data ->> 'node_count')::int, 0);
        -- Depth breakdown
        declare
          v_depth text := coalesce(v_event.event_data ->> 'depth', 'low');
        begin
          if v_depth = 'deep' or v_depth = 'detailed' then
            v_depth_bk := jsonb_set(v_depth_bk, '{deep}', to_jsonb((v_depth_bk->>'deep')::int + 1));
          elsif v_depth = 'medium' or v_depth = 'balanced' then
            v_depth_bk := jsonb_set(v_depth_bk, '{medium}', to_jsonb((v_depth_bk->>'medium')::int + 1));
          else
            v_depth_bk := jsonb_set(v_depth_bk, '{low}', to_jsonb((v_depth_bk->>'low')::int + 1));
          end if;
        end;
        -- Source breakdown
        declare
          v_src text := coalesce(v_event.event_data ->> 'source_type', 'text');
        begin
          v_source_bk := jsonb_set(v_source_bk, array[v_src], to_jsonb(coalesce((v_source_bk->>v_src)::int, 0) + 1), true);
        end;
        -- Persona breakdown
        declare
          v_per text := coalesce(v_event.event_data ->> 'persona', 'Teacher');
        begin
          v_persona_bk := jsonb_set(v_persona_bk, array[v_per], to_jsonb(coalesce((v_persona_bk->>v_per)::int, 0) + 1), true);
        end;

      when 'chat_sent' then
        v_total_chats := v_total_chats + 1;

      when 'image_generated' then
        v_total_images := v_total_images + 1;

      when 'node_expanded' then
        v_total_expansions := v_total_expansions + 1;

      when 'study_time' then
        v_study_minutes := v_study_minutes + coalesce((v_event.event_data ->> 'minutes')::int, 0);

      else
        -- Unknown event type, still count towards daily activity
        null;
    end case;

    -- Build daily activity map
    v_item := v_daily -> v_date_key;
    if v_item is null then
      v_item := jsonb_build_object(
        'maps', 0, 'chats', 0, 'images', 0, 'expansions', 0, 'study_minutes', 0
      );
    end if;

    case v_event.event_type
      when 'map_created' then
        v_item := jsonb_set(v_item, '{maps}', to_jsonb((v_item->>'maps')::int + 1));
      when 'chat_sent' then
        v_item := jsonb_set(v_item, '{chats}', to_jsonb((v_item->>'chats')::int + 1));
      when 'image_generated' then
        v_item := jsonb_set(v_item, '{images}', to_jsonb((v_item->>'images')::int + 1));
      when 'node_expanded' then
        v_item := jsonb_set(v_item, '{expansions}', to_jsonb((v_item->>'expansions')::int + 1));
      when 'study_time' then
        v_item := jsonb_set(v_item, '{study_minutes}', to_jsonb((v_item->>'study_minutes')::int + coalesce((v_event.event_data ->> 'minutes')::int, 0)));
      else null;
    end case;

    v_daily := jsonb_set(v_daily, array[v_date_key], v_item, true);
  end loop;

  -- Compute streak (from daily_activity — consecutive days with any activity)
  declare
    v_dates date[];
    v_prev_date date;
    v_streak int := 0;
    v_max_streak int := 0;
  begin
    select array_agg(d::date order by d::date desc)
    into v_dates
    from jsonb_object_keys(v_daily) as d;

    for i in 1 .. array_length(v_dates, 1) loop
      if i = 1 then
        v_streak := 1;
        v_max_streak := 1;
      elsif v_dates[i] = v_dates[i-1] - 1 then
        v_streak := v_streak + 1;
        v_max_streak := greatest(v_max_streak, v_streak);
      elsif v_dates[i] < v_dates[i-1] - 1 then
        v_streak := 1;
      end if;
    end loop;
    v_current_streak := v_streak;
    v_longest_streak := v_max_streak;
  end;

  -- Upsert user_profiles
  insert into user_profiles (
    user_id, email, display_name, photo_url, created_at,
    total_maps, total_compare_maps, total_multi_maps, total_chats,
    total_nodes, total_images, total_expansions, study_time_minutes,
    current_streak, longest_streak, last_active_date,
    mode_breakdown, depth_breakdown, source_breakdown, persona_breakdown,
    daily_activity, updated_at
  ) values (
    p_user_id,
    v_user_record.email, v_user_record.display_name, v_user_record.photo_url, v_user_record.created_at,
    v_total_maps, v_total_compare, v_total_multi, v_total_chats,
    v_total_nodes, v_total_images, v_total_expansions, v_study_minutes,
    v_current_streak, v_longest_streak, v_last_active,
    v_mode_bk, v_depth_bk, v_source_bk, v_persona_bk,
    v_daily, now()
  )
  on conflict (user_id) do update set
    email             = excluded.email,
    display_name      = excluded.display_name,
    photo_url         = excluded.photo_url,
    total_maps        = excluded.total_maps,
    total_compare_maps = excluded.total_compare_maps,
    total_multi_maps  = excluded.total_multi_maps,
    total_chats       = excluded.total_chats,
    total_nodes       = excluded.total_nodes,
    total_images      = excluded.total_images,
    total_expansions  = excluded.total_expansions,
    study_time_minutes = excluded.study_time_minutes,
    current_streak    = excluded.current_streak,
    longest_streak    = excluded.longest_streak,
    last_active_date  = excluded.last_active_date,
    mode_breakdown    = excluded.mode_breakdown,
    depth_breakdown   = excluded.depth_breakdown,
    source_breakdown  = excluded.source_breakdown,
    persona_breakdown = excluded.persona_breakdown,
    daily_activity    = excluded.daily_activity,
    updated_at        = excluded.updated_at;

  -- Build return JSON
  select jsonb_build_object(
    'user_id', user_id,
    'email', email,
    'display_name', display_name,
    'total_maps', total_maps,
    'total_chats', total_chats,
    'total_nodes', total_nodes,
    'total_images', total_images,
    'study_time_minutes', study_time_minutes,
    'current_streak', current_streak,
    'longest_streak', longest_streak,
    'mode_breakdown', mode_breakdown,
    'depth_breakdown', depth_breakdown,
    'source_breakdown', source_breakdown,
    'persona_breakdown', persona_breakdown
  ) into v_profile
  from user_profiles
  where user_id = p_user_id;

  return v_profile;
end;
$$;


-- ─── Helper: recompute_platform_stats() ───────────────────────────
-- Scans all user_profiles and user_events to rebuild platform_stats.
-- Typically called by a scheduled cron job or after bulk imports.
-- ────────────────────────────────────────────────────────────────────

create or replace function recompute_platform_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_now timestamptz := now();
  v_24h_ago timestamptz := v_now - interval '24 hours';
  v_7d_ago timestamptz := v_now - interval '7 days';
  v_total_users      int;
  v_total_maps       int;
  v_total_chats      int;
  v_total_nodes      int;
  v_total_images     int;
  v_total_events     bigint;
  v_avg_nodes        numeric := 0;
  v_health_score     int;
  v_engagement_rate  double precision;
  v_active_24h       int;
  v_active_7d        int;
  v_new_users_24h    int;
  v_new_users_7d     int;
  v_new_maps_24h     int;
  v_new_maps_7d      int;
  v_daily_snapshot   jsonb;
begin
  -- Count from user_profiles (pre-computed, fast)
  select
    count(*),
    coalesce(sum(total_maps), 0),
    coalesce(sum(total_chats), 0),
    coalesce(sum(total_nodes), 0),
    coalesce(sum(total_images), 0)
  into v_total_users, v_total_maps, v_total_chats, v_total_nodes, v_total_images
  from user_profiles;

  -- Total events count (separate from chat count)
  select count(*)::bigint into v_total_events from user_events;

  -- Time-windowed from user_events (direct queries are fast with indexes)
  select count(distinct user_id) into v_active_24h
  from user_events where created_at >= v_24h_ago;

  select count(distinct user_id) into v_active_7d
  from user_events where created_at >= v_7d_ago;

  -- New users in time windows (from the users table, not events)
  select count(*) into v_new_users_24h
  from public.users where created_at >= v_24h_ago;

  select count(*) into v_new_users_7d
  from public.users where created_at >= v_7d_ago;

  -- New maps in time windows
  select count(*) into v_new_maps_24h
  from user_events
  where event_type = 'map_created' and created_at >= v_24h_ago;

  select count(*) into v_new_maps_7d
  from user_events
  where event_type = 'map_created' and created_at >= v_7d_ago;

  -- Health score: composite of engagement rate and activity breadth
  v_engagement_rate := case when v_total_users > 0
    then round((v_active_24h::double precision / v_total_users * 100)::numeric, 1)
    else 0 end;

  v_health_score := greatest(0, least(100,
    round(
      (v_engagement_rate * 0.4) +                          -- 40% weight on engagement
      (least(v_total_maps::double precision / greatest(v_total_users, 1), 20) * 2.0) +  -- 40% on maps per user
      (case when v_new_users_24h > 0 then 10 else 0 end) + -- 10% for new users
      (case when v_new_maps_24h > 0 then 10 else 0 end)    -- 10% for new maps
    )::numeric
  ));

  -- Build 31-day daily snapshot for heatmap
  select jsonb_agg(
    jsonb_build_object(
      'date', d::text,
      'new_events', coalesce((
        select count(*)::int from user_events
        where created_at::date = d::date
      ), 0),
      'new_maps', coalesce((
        select count(*)::int from user_events
        where event_type = 'map_created' and created_at::date = d::date
      ), 0),
      'active_users', coalesce((
        select count(distinct user_id)::int from user_events
        where created_at::date = d::date
      ), 0)
    )
    order by d
  ) into v_daily_snapshot
  from generate_series(
    (v_now - interval '30 days')::date,
    v_now::date,
    '1 day'::interval
  ) as d;

  -- Compute per-map average
  if v_total_maps > 0 then
    v_avg_nodes := round((v_total_nodes::numeric / v_total_maps), 1);
  end if;

  -- Upsert platform_stats with all computed values
  insert into platform_stats (
      id, total_users, total_maps, total_maps_ever, total_chats,
      total_nodes, total_images, total_events,
      new_users_24h, new_maps_24h, active_users_24h, active_users_7d,
      new_users_7d, new_maps_7d,
      health_score, engagement_rate,
      avg_maps_per_user, avg_nodes_per_map,
      daily_snapshot, updated_at
    ) values (
      'global',
      v_total_users, v_total_maps, v_total_maps, v_total_chats,
      v_total_nodes, v_total_images, v_total_events,
      v_new_users_24h, v_new_maps_24h, v_active_24h, v_active_7d,
      v_new_users_7d, v_new_maps_7d,
      v_health_score, v_engagement_rate,
      case when v_total_users > 0 then round((v_total_maps::numeric / v_total_users), 1) else 0 end,
      v_avg_nodes,
      v_daily_snapshot, v_now
    )
    on conflict (id) do update set
      total_users       = excluded.total_users,
      total_maps        = excluded.total_maps,
      total_maps_ever   = excluded.total_maps_ever,
      total_chats       = excluded.total_chats,
      total_nodes       = excluded.total_nodes,
      total_images      = excluded.total_images,
      total_events      = excluded.total_events,
      new_users_24h     = excluded.new_users_24h,
      new_maps_24h      = excluded.new_maps_24h,
      active_users_24h  = excluded.active_users_24h,
      active_users_7d   = excluded.active_users_7d,
      new_users_7d      = excluded.new_users_7d,
      new_maps_7d       = excluded.new_maps_7d,
      health_score      = excluded.health_score,
      engagement_rate   = excluded.engagement_rate,
      avg_maps_per_user = excluded.avg_maps_per_user,
      avg_nodes_per_map = excluded.avg_nodes_per_map,
      daily_snapshot    = excluded.daily_snapshot,
      updated_at        = excluded.updated_at;

  -- Return summary
  select jsonb_build_object(
    'total_users', total_users,
    'total_maps', total_maps,
    'total_chats', total_chats,
    'total_events', total_events,
    'total_nodes', total_nodes,
    'total_images', total_images,
    'active_users_24h', active_users_24h,
    'active_users_7d', active_users_7d,
    'health_score', health_score,
    'engagement_rate', engagement_rate
  ) into v_result
  from platform_stats
  where id = 'global';

  return v_result;
end;
$$;
