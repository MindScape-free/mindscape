-- ─── Auto-insert map_deleted events when mindmaps are deleted ──────────
--
-- Problem:
--   When a mindmap is deleted, its map_created event remains in user_events.
--   There is no way to distinguish between maps that still exist and those
--   that have been removed, so recompute_user_profile() over-counts maps.
--
-- Fix:
--   A BEFORE DELETE trigger captures the mindmap's data and inserts a
--   map_deleted event into user_events. This provides an audit trail and
--   allows recompute_user_profile() to properly subtract deleted maps
--   from aggregates (once that logic is added).
--
-- Note:
--   recompute_user_profile() does NOT currently handle map_deleted events.
--   After this trigger is applied, update recompute_user_profile() to
--   subtract map_deleted counts from totals, or periodically delete the
--   corresponding map_created events during a full recompute.
--
-- ────────────────────────────────────────────────────────────────────

create or replace function public.auto_log_map_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_events (
    user_id,
    event_type,
    event_data,
    source,
    created_at
  ) values (
    old.user_id,
    'map_deleted',
    jsonb_build_object(
      'mindmap_id',    old.id,
      'mode',          coalesce(old.mode, 'single'),
      'depth',         coalesce(old.depth, 'low'),
      'source_type',   old.source_file_type,
      'persona',       old.ai_persona,
      'node_count',    coalesce(old.node_count, 0),
      'is_sub_map',    coalesce(old.is_sub_map, false),
      'parent_map_id', old.parent_map_id
    ),
    'system',
    now()
  );

  return old;
end;
$$;

drop trigger if exists trg_auto_log_map_deleted on public.mindmaps;

create trigger trg_auto_log_map_deleted
  before delete on public.mindmaps
  for each row
  execute function public.auto_log_map_deleted();
