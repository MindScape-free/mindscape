-- ─── Filter sub-maps from total_nodes and total_maps in recompute_user_profile() ───
--
-- Problem:
--   recompute_user_profile() counts ALL map_created events including sub-maps
--   in total_maps and total_nodes. admin-sync explicitly excludes sub-maps
--   (is_sub_map = true or parent_map_id is not null) from its map and node counts.
--   This causes platform_stats.total_nodes (which sums user_profiles) to differ
--   from admin-sync's total_nodes_active.
--
-- Fix:
--   In the map_created event handler, check event_data for is_sub_map and
--   parent_map_id. If the event is a sub-map, skip counting it in total_maps,
--   total_nodes, and the mode/depth/source/persona breakdowns.
--
--   Daily activity tracking still records sub-map events as activity (they
--   represent user engagement even if the map is nested).
--
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
  v_is_sub_map boolean;
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
        -- Check if this is a sub-map (should not count as a map or contribute nodes)
        v_is_sub_map := (v_event.event_data ->> 'is_sub_map')::boolean;
        if v_is_sub_map is not true and v_event.event_data ->> 'parent_map_id' is null then
          -- Only root maps count toward totals (matching admin-sync)
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
        -- Unknown event type, still count towards daily activity
        null;
    end case;

    -- Build daily activity map (all events count as activity, including sub-maps)
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
