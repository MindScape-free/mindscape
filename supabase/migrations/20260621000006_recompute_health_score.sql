-- ─── Align health score formula with admin-sync ────────────────
--
-- Problem:
--   recompute_platform_stats() uses a different health score formula than
--   admin-sync. The current recompute formula:
--     engagement*0.4 + min(mapsPerUser,20)*2.0 + newUsersBonus + newMapsBonus
--
--   admin-sync formula:
--     min(50, engagementRate/20*50) + min(50, (mapsPerUser/1.5)*50)
--
-- Fix:
--   Replace the health score computation with admin-sync's formula.
--   This ensures both pipelines produce identical health scores.
--
--   admin-sync formula breakdown:
--     Component 1 (0-50 pts): engagement_rate / 20 * 50
--       → scales engagement rate (0-100%) so 20% engagement = 50 points (full)
--     Component 2 (0-50 pts): (maps_per_user / 1.5) * 50
--       → scales maps per user so 1.5 maps/user = 50 points (full)
--     No bonus points for new users/maps.
--
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
  v_maps_per_user    double precision;
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

  -- ── Fallback: if user_profiles has 0 nodes, query mindmaps directly ──
  -- Excludes sub-maps to match admin-sync's behavior.
  if v_total_nodes = 0 then
    select coalesce(sum(node_count), 0)
    into v_total_nodes
    from mindmaps
    where (is_sub_map is not true or is_sub_map is null)
      and parent_map_id is null;
  end if;

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

  -- Engagement rate
  v_engagement_rate := case when v_total_users > 0
    then round((v_active_24h::double precision / v_total_users * 100)::numeric, 1)
    else 0 end;

  -- Maps per user (admin-sync uses totalMindmapsEver / totalUsers)
  v_maps_per_user := case when v_total_users > 0
    then round((v_total_maps::double precision / v_total_users)::numeric, 1)
    else 0 end;

  -- ── Health score: match admin-sync formula exactly ──
  --   Component 1 (0-50): engagement_rate / 20 * 50
  --     → 20% engagement rate = 50 points (full)
  --   Component 2 (0-50): (maps_per_user / 1.5) * 50
  --     → 1.5 maps per user = 50 points (full)
  --   Total range: 0-100
  v_health_score := greatest(0, least(100, round(
    least(50.0, (v_engagement_rate / 20.0) * 50.0) +
    least(50.0, (v_maps_per_user / 1.5) * 50.0)
  )::numeric))::int;

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

  -- Upsert platform_stats
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
      v_maps_per_user,
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
