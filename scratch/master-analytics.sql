-- Master SQL for Admin Dashboard V2
-- This script creates the "Single Sheet" analytics system

-- 1. Helper to break recursion for Admin checks
create or replace function public.check_if_admin(user_id uuid) 
returns boolean as $$
  select is_admin from public.users where id = user_id;
$$ language sql security definer;

-- 2. Master "Single Sheet" Calculation Function
create or replace function public.refresh_platform_analytics()
returns jsonb language plpgsql security definer as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'platform', jsonb_build_object(
      'total_users', (select count(*) from public.users),
      'active_users_24h', (select count(*) from public.users where last_active > now() - interval '24 hours'),
      'total_maps_ever', (select coalesce(sum((statistics->>'total_maps_created')::int), 0) from public.users),
      'active_root_maps', (select count(*) from public.mindmaps where is_sub_map = false),
      'global_nodes', (select coalesce(sum((statistics->>'total_nodes')::int), 0) from public.users),
      'active_nodes', (select coalesce(sum(node_count), 0) from public.mindmaps),
      'total_chats', (select count(*) from public.chat_sessions)
    ),
    'entities', jsonb_build_object(
      'sources', (select jsonb_object_agg(lower(coalesce(source_file_type, 'text')), val) from (select source_file_type, count(*) as val from public.mindmaps group by source_file_type) s),
      'personas', (select jsonb_object_agg(lower(coalesce(ai_persona, 'Teacher')), val) from (select ai_persona, count(*) as val from public.mindmaps group by ai_persona) s),
      'depths', (select jsonb_object_agg(lower(coalesce(depth, 'medium')), val) from (select depth, count(*) as val from public.mindmaps group by depth) s),
      'privacy', jsonb_build_object(
        'public', (select count(*) from public.mindmaps where is_public = true),
        'private', (select count(*) from public.mindmaps where is_public = false)
      ),
      'sub_maps', (select count(*) from public.mindmaps where is_sub_map = true)
    ),
    'ai_performance', jsonb_build_object(
      'successful_calls', (select count(*) from public.ai_calls where success = true),
      'avg_latency_24h', (select coalesce(avg(latency_ms), 0) from public.ai_calls where created_at > now() - interval '24 hours')
    )
  ) into result;

  insert into public.admin_stats (id, data, last_updated)
  values ('global', result, now())
  on conflict (id) do update set data = excluded.data, last_updated = now();

  return result;
end;
$$;

-- 3. Clean up and Re-create Policies
drop policy if exists "users_admin_read" on public.users;
drop policy if exists "users_admin_all" on public.users;
drop policy if exists "users_admin_update" on public.users;
drop policy if exists "users_self_manage" on public.users;

create policy "users_self_manage" 
on public.users for all 
using (auth.uid() = id);

create policy "users_admin_read" 
on public.users for select 
using (public.check_if_admin(auth.uid()));

create policy "users_admin_update" 
on public.users for update
using (public.check_if_admin(auth.uid()));

-- 4. Permissions & Reload
grant execute on function public.refresh_platform_analytics() to anon, authenticated, service_role;
grant execute on function public.check_if_admin(uuid) to anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

-- 5. Initial Run
select public.refresh_platform_analytics();
