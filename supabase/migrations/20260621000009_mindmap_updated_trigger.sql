-- ─── Sync event_data in user_events when mindmaps are updated ──────────
--
-- Problem:
--   When a mindmap's node_count, mode, depth, persona, or source_type
--   is updated, the corresponding map_created event in user_events still
--   holds stale data. The next recompute_user_profile() would use the
--   outdated values for aggregates.
--
-- Fix:
--   A trigger on the mindmaps table fires AFTER UPDATE and syncs the
--   relevant fields in the existing map_created event's event_data.
--   The trigger only fires when tracked columns actually change, avoiding
--   unnecessary writes on every update.
--
-- ────────────────────────────────────────────────────────────────────

create or replace function public.auto_log_map_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_events
  set event_data = jsonb_build_object(
    'mindmap_id',    new.id,
    'mode',          coalesce(new.mode, 'single'),
    'depth',         coalesce(new.depth, 'low'),
    'source_type',   new.source_file_type,
    'persona',       new.ai_persona,
    'node_count',    coalesce(new.node_count, 0),
    'is_sub_map',    coalesce(new.is_sub_map, false),
    'parent_map_id', new.parent_map_id
  )
  where event_type = 'map_created'
    and source = 'system'
    and event_data->>'mindmap_id' = new.id::text;

  return new;
end;
$$;

drop trigger if exists trg_auto_log_map_updated on public.mindmaps;

-- Only fire when tracked columns actually change (avoids unnecessary writes)
create trigger trg_auto_log_map_updated
  after update on public.mindmaps
  for each row
  when (
    old.node_count is distinct from new.node_count
    or old.mode is distinct from new.mode
    or old.depth is distinct from new.depth
    or old.ai_persona is distinct from new.ai_persona
    or old.source_file_type is distinct from new.source_file_type
    or old.is_sub_map is distinct from new.is_sub_map
    or old.parent_map_id is distinct from new.parent_map_id
  )
  execute function public.auto_log_map_updated();
