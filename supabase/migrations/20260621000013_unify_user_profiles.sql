-- ─── Unify user_profiles as single source of truth ─────────────────────
--
--  1. Add preferences + api_settings columns so user_profiles is a
--     complete superset of all user data.
--  2. Update recompute_user_profile() to sync preferences & api_settings.
--  3. Add increment_user_profile() for real-time incremental updates.
-- ────────────────────────────────────────────────────────────────────────

-- ── 1. Add missing columns ─────────────────────────────────────────────

alter table user_profiles
  add column if not exists preferences jsonb not null default '{}',
  add column if not exists api_settings  jsonb not null default '{}';

-- ── 2. Update recompute_user_profile() to sync extras ──────────────────

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
  v_settings_record record;
  v_event record;
  v_date_key text;
  v_daily_map jsonb;
  v_item jsonb;
  v_is_sub_map boolean;
begin
  -- Fetch base user info
  select email, display_name as display_name, photo_url, created_at, coalesce(preferences, '{}'::jsonb) as preferences
  into v_user_record
  from public.users
  where id = p_user_id;

  -- Fetch api_settings from user_settings table
  select coalesce(jsonb_build_object(
    'pollinationsApiKey', pollinations_api_key,
    'imageModel', image_model,
    'textModel', text_model
  ), '{}'::jsonb) as api_settings
  into v_settings_record
  from public.user_settings
  where user_id = p_user_id;

  if v_settings_record is null then
    v_settings_record.api_settings := '{}'::jsonb;
  end if;

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
        v_is_sub_map := (v_event.event_data ->> 'is_sub_map')::boolean;
        if v_is_sub_map is not true and v_event.event_data ->> 'parent_map_id' is null then
          v_total_maps := v_total_maps + 1;
          if (v_event.event_data ->> 'mode') = 'compare' then
            v_total_compare := v_total_compare + 1;
            v_mode_bk := jsonb_set(v_mode_bk, '{compare}', to_jsonb((v_mode_bk->>'compare')::int + 1));
          elsif (v_event.event_data ->> 'mode') = 'multi' then
            v_total_multi := v_total_multi + 1;
            v_mode_bk := jsonb_set(v_mode_bk, '{multi}', to_jsonb((v_mode_bk->>'multi')::int + 1));
          else
            v_mode_bk := jsonb_set(v_mode_bk, '{single}', to_jsonb((v_mode_bk->>'single')::int + 1));
          end if;
          v_total_nodes := v_total_nodes + coalesce((v_event.event_data ->> 'node_count')::int, 0);
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
          declare
            v_src text := coalesce(v_event.event_data ->> 'source_type', 'text');
          begin
            v_source_bk := jsonb_set(v_source_bk, array[v_src], to_jsonb(coalesce((v_source_bk->>v_src)::int, 0) + 1), true);
          end;
          declare
            v_per text := coalesce(v_event.event_data ->> 'persona', 'Teacher');
          begin
            v_persona_bk := jsonb_set(v_persona_bk, array[v_per], to_jsonb(coalesce((v_persona_bk->>v_per)::int, 0) + 1), true);
          end;
        end if;

      when 'map_deleted' then
        v_is_sub_map := (v_event.event_data ->> 'is_sub_map')::boolean;
        if v_is_sub_map is not true and v_event.event_data ->> 'parent_map_id' is null then
          v_total_maps := greatest(0, v_total_maps - 1);
          if (v_event.event_data ->> 'mode') = 'compare' then
            v_total_compare := greatest(0, v_total_compare - 1);
            v_mode_bk := jsonb_set(v_mode_bk, '{compare}', to_jsonb(greatest(0, (v_mode_bk->>'compare')::int - 1)));
          elsif (v_event.event_data ->> 'mode') = 'multi' then
            v_total_multi := greatest(0, v_total_multi - 1);
            v_mode_bk := jsonb_set(v_mode_bk, '{multi}', to_jsonb(greatest(0, (v_mode_bk->>'multi')::int - 1)));
          else
            v_mode_bk := jsonb_set(v_mode_bk, '{single}', to_jsonb(greatest(0, (v_mode_bk->>'single')::int - 1)));
          end if;
          v_total_nodes := greatest(0, v_total_nodes - coalesce((v_event.event_data ->> 'node_count')::int, 0));
          declare
            v_depth_del text := coalesce(v_event.event_data ->> 'depth', 'low');
          begin
            if v_depth_del = 'deep' or v_depth_del = 'detailed' then
              v_depth_bk := jsonb_set(v_depth_bk, '{deep}', to_jsonb(greatest(0, (v_depth_bk->>'deep')::int - 1)));
            elsif v_depth_del = 'medium' or v_depth_del = 'balanced' then
              v_depth_bk := jsonb_set(v_depth_bk, '{medium}', to_jsonb(greatest(0, (v_depth_bk->>'medium')::int - 1)));
            else
              v_depth_bk := jsonb_set(v_depth_bk, '{low}', to_jsonb(greatest(0, (v_depth_bk->>'low')::int - 1)));
            end if;
          end;
          declare
            v_src_del text := coalesce(v_event.event_data ->> 'source_type', 'text');
          begin
            v_source_bk := jsonb_set(v_source_bk, array[v_src_del], to_jsonb(greatest(0, coalesce((v_source_bk->>v_src_del)::int, 0) - 1)), true);
          end;
          declare
            v_per_del text := coalesce(v_event.event_data ->> 'persona', 'Teacher');
          begin
            v_persona_bk := jsonb_set(v_persona_bk, array[v_per_del], to_jsonb(greatest(0, coalesce((v_persona_bk->>v_per_del)::int, 0) - 1)), true);
          end;
        end if;

      when 'chat_sent' then
        v_total_chats := v_total_chats + 1;

      when 'image_generated' then
        v_total_images := v_total_images + 1;

      when 'node_expanded' then
        v_total_expansions := v_total_expansions + 1;

      when 'study_time' then
        v_study_minutes := v_study_minutes + coalesce((v_event.event_data ->> 'minutes')::int, 0);

      else
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

  -- Compute streak
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

  -- Upsert user_profiles (now includes preferences + api_settings)
  insert into user_profiles (
    user_id, email, display_name, photo_url, created_at,
    total_maps, total_compare_maps, total_multi_maps, total_chats,
    total_nodes, total_images, total_expansions, study_time_minutes,
    current_streak, longest_streak, last_active_date,
    mode_breakdown, depth_breakdown, source_breakdown, persona_breakdown,
    daily_activity, unlocked_achievements, preferences, api_settings, updated_at
  ) values (
    p_user_id,
    v_user_record.email, v_user_record.display_name, v_user_record.photo_url, v_user_record.created_at,
    v_total_maps, v_total_compare, v_total_multi, v_total_chats,
    v_total_nodes, v_total_images, v_total_expansions, v_study_minutes,
    v_current_streak, v_longest_streak, v_last_active,
    v_mode_bk, v_depth_bk, v_source_bk, v_persona_bk,
    v_daily,
    (select coalesce(unlocked_achievements, '{}'::text[]) from public.users where id = p_user_id),
    v_user_record.preferences,
    v_settings_record.api_settings,
    now()
  )
  on conflict (user_id) do update set
    email              = excluded.email,
    display_name       = excluded.display_name,
    photo_url          = excluded.photo_url,
    total_maps         = excluded.total_maps,
    total_compare_maps = excluded.total_compare_maps,
    total_multi_maps   = excluded.total_multi_maps,
    total_chats        = excluded.total_chats,
    total_nodes        = excluded.total_nodes,
    total_images       = excluded.total_images,
    total_expansions   = excluded.total_expansions,
    study_time_minutes = excluded.study_time_minutes,
    current_streak     = excluded.current_streak,
    longest_streak     = excluded.longest_streak,
    last_active_date   = excluded.last_active_date,
    mode_breakdown     = excluded.mode_breakdown,
    depth_breakdown    = excluded.depth_breakdown,
    source_breakdown   = excluded.source_breakdown,
    persona_breakdown  = excluded.persona_breakdown,
    daily_activity     = excluded.daily_activity,
    unlocked_achievements = excluded.unlocked_achievements,
    preferences        = excluded.preferences,
    api_settings       = excluded.api_settings,
    updated_at         = excluded.updated_at;

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

-- ── 3. Incremental update function for real-time use ───────────────────
--
--  Lightweight function called after each user action. Updates counters
--  atomically without scanning the full event history. The cron-based
--  full recompute corrects any drift.
-- ───────────────────────────────────────────────────────────────────────

create or replace function increment_user_profile(
  p_user_id          uuid,
  p_maps             int default 0,
  p_compare_maps     int default 0,
  p_multi_maps       int default 0,
  p_chats            int default 0,
  p_nodes            int default 0,
  p_images           int default 0,
  p_expansions       int default 0,
  p_study_minutes    int default 0,
  p_map_mode         text default null,
  p_map_depth        text default null,
  p_map_source       text default null,
  p_map_persona      text default null,
  p_is_map_deleted   boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today text := to_char(now(), 'YYYY-MM-DD');
  v_sign int := 1;
  v_mode_key text;
  v_mode_adj int;
  v_compare_adj int;
  v_multi_adj int;
  v_current_maps int;
  v_current_compare int;
  v_current_multi int;
  v_result jsonb;
begin
  if p_is_map_deleted then
    v_sign := -1;
  end if;

  -- Upsert a row first to ensure it exists
  insert into user_profiles (user_id, preferences, api_settings, updated_at)
  values (p_user_id, '{}'::jsonb, '{}'::jsonb, now())
  on conflict (user_id) do nothing;

  -- Atomic counter updates
  update user_profiles set
    total_maps         = greatest(0, total_maps         + (p_maps * v_sign)),
    total_compare_maps = greatest(0, total_compare_maps + (p_compare_maps * v_sign)),
    total_multi_maps   = greatest(0, total_multi_maps   + (p_multi_maps * v_sign)),
    total_chats        = greatest(0, total_chats        + p_chats),
    total_nodes        = greatest(0, total_nodes        + (p_nodes * v_sign)),
    total_images       = greatest(0, total_images       + p_images),
    total_expansions   = greatest(0, total_expansions   + p_expansions),
    study_time_minutes = greatest(0, study_time_minutes + p_study_minutes),
    last_active_date   = now()::date,
    current_streak     = case
      when last_active_date = now()::date then current_streak
      when last_active_date = now()::date - 1 then current_streak + 1
      else 1
    end,
    longest_streak     = greatest(longest_streak, case
      when last_active_date = now()::date then current_streak
      when last_active_date = now()::date - 1 then current_streak + 1
      else 1
    end),
    updated_at         = now()
  where user_id = p_user_id;

  -- Update mode breakdown
  if p_map_mode is not null then
    v_mode_key := case
      when p_map_mode = 'compare' then 'compare'
      when p_map_mode = 'multi' then 'multi'
      else 'single'
    end;

    update user_profiles
    set mode_breakdown = jsonb_set(
      mode_breakdown,
      array[v_mode_key],
      to_jsonb(greatest(0, coalesce((mode_breakdown->>v_mode_key)::int, 0) + v_sign)),
      true
    )
    where user_id = p_user_id;
  end if;

  -- Update depth breakdown
  if p_map_depth is not null then
    declare
      v_depth_key text;
    begin
      v_depth_key := case
        when p_map_depth in ('deep', 'detailed') then 'deep'
        when p_map_depth in ('medium', 'balanced') then 'medium'
        else 'low'
      end;

      update user_profiles
      set depth_breakdown = jsonb_set(
        depth_breakdown,
        array[v_depth_key],
        to_jsonb(greatest(0, coalesce((depth_breakdown->>v_depth_key)::int, 0) + v_sign)),
        true
      )
      where user_id = p_user_id;
    end;
  end if;

  -- Update source breakdown
  if p_map_source is not null then
    update user_profiles
    set source_breakdown = jsonb_set(
      source_breakdown,
      array[p_map_source],
      to_jsonb(greatest(0, coalesce((source_breakdown->>p_map_source)::int, 0) + v_sign)),
      true
    )
    where user_id = p_user_id;
  end if;

  -- Update persona breakdown
  if p_map_persona is not null then
    declare
      v_per_key text;
    begin
      v_per_key := case
        when lower(p_map_persona) = 'concise' then 'Concise'
        when lower(p_map_persona) = 'creative' then 'Creative'
        when lower(p_map_persona) = 'sage' or p_map_persona like '%Sage%' then 'Sage'
        else 'Teacher'
      end;

      update user_profiles
      set persona_breakdown = jsonb_set(
        persona_breakdown,
        array[v_per_key],
        to_jsonb(greatest(0, coalesce((persona_breakdown->>v_per_key)::int, 0) + v_sign)),
        true
      )
      where user_id = p_user_id;
    end;
  end if;

  -- Update daily activity heatmap
  if p_maps > 0 or p_chats > 0 or p_images > 0 or p_expansions > 0 or p_study_minutes > 0 then
    update user_profiles
    set daily_activity = jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              coalesce(daily_activity, '{}'::jsonb),
              array[v_today, 'maps'],
              to_jsonb(greatest(0, coalesce((daily_activity->v_today->>'maps')::int, 0) + (p_maps * v_sign))),
              true
            ),
            array[v_today, 'chats'],
            to_jsonb(greatest(0, coalesce((daily_activity->v_today->>'chats')::int, 0) + p_chats)),
            true
          ),
          array[v_today, 'images'],
          to_jsonb(greatest(0, coalesce((daily_activity->v_today->>'images')::int, 0) + p_images)),
          true
        ),
        array[v_today, 'expansions'],
        to_jsonb(greatest(0, coalesce((daily_activity->v_today->>'expansions')::int, 0) + p_expansions)),
        true
      ),
      array[v_today, 'study_minutes'],
      to_jsonb(greatest(0, coalesce((daily_activity->v_today->>'study_minutes')::int, 0) + p_study_minutes)),
      true
    )
    where user_id = p_user_id;
  end if;

  -- Sync preferences from users table (lightweight, only if changed)
  update user_profiles up
  set preferences = coalesce(u.preferences, '{}'::jsonb),
      api_settings = coalesce((
        select jsonb_build_object(
          'pollinationsApiKey', us.pollinations_api_key,
          'imageModel', us.image_model,
          'textModel', us.text_model
        ) from public.user_settings us where us.user_id = p_user_id
      ), '{}'::jsonb),
      email = u.email,
      display_name = u.display_name,
      photo_url = u.photo_url
  from public.users u
  where up.user_id = p_user_id
    and u.id = p_user_id;

  -- Return current counters for achievement check
  select jsonb_build_object(
    'total_maps', total_maps,
    'total_compare_maps', total_compare_maps,
    'total_multi_maps', total_multi_maps,
    'total_chats', total_chats,
    'total_nodes', total_nodes,
    'total_images', total_images,
    'total_expansions', total_expansions,
    'study_time_minutes', study_time_minutes,
    'current_streak', current_streak,
    'longest_streak', longest_streak
  ) into v_result
  from user_profiles
  where user_id = p_user_id;

  return v_result;
end;
$$;
