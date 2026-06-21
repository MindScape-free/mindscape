-- ─── Auto-insert map_created events when mindmaps are created ───────────
--
-- Problem:
--   When a new mindmap is created via application code, the corresponding
--   map_created event in user_events must be inserted manually. If the
--   application code forgets (or a new code path is added), the event is
--   missed and recompute_user_profile() won't count the map/node data.
--
-- Fix:
--   A trigger on the mindmaps table fires AFTER INSERT and automatically
--   inserts a well-formed map_created event into user_events. This keeps
--   user_events in sync regardless of which code path creates the map.
--
--   The trigger is idempotent-safe — it uses NEW.id as a unique reference
--   and does not conflict with existing events (the application can still
--   insert its own map_created events if desired).
--
-- ────────────────────────────────────────────────────────────────────

-- Create the trigger function
create or replace function public.auto_log_map_created()
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
    new.user_id,
    'map_created',
    jsonb_build_object(
      'mindmap_id',  new.id,
      'mode',        coalesce(new.mode, 'single'),
      'depth',       coalesce(new.depth, 'low'),
      'source_type', new.source_file_type,
      'persona',     new.ai_persona,
      'node_count',  coalesce(new.node_count, 0),
      'is_sub_map',  coalesce(new.is_sub_map, false),
      'parent_map_id', new.parent_map_id
    ),
    'system',
    coalesce(new.created_at, now())
  );

  return new;
end;
$$;

-- Drop the trigger first if it exists (idempotent)
drop trigger if exists trg_auto_log_map_created on public.mindmaps;

-- Attach the trigger
create trigger trg_auto_log_map_created
  after insert on public.mindmaps
  for each row
  execute function public.auto_log_map_created();
