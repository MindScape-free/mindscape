-- MindScape Supabase Schema V2 (Engineered for Precision & Admin Excellence)
-- This schema implements real-time statistics tracking via triggers and views.

-- ── 1. Security & Identity ──────────────────────────────────────────────────
-- Ensure columns exist before functions reference them
alter table public.users add column if not exists is_admin boolean default false;
alter table public.users add column if not exists last_active timestamptz default now();
alter table public.users add column if not exists statistics jsonb default '{"total_maps_created": 0, "total_nested_expansions": 0, "total_nodes": 0, "total_chats": 0, "total_images_generated": 0, "total_study_time_minutes": 0}'::jsonb;
alter table public.users add column if not exists activity jsonb default '{}'::jsonb;
alter table public.users add column if not exists unlocked_achievements text[] default '{}';

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  photo_url text,
  is_admin boolean default false, -- Role-based access control
  preferences jsonb default '{"preferred_language": "en", "default_ai_persona": "Teacher", "default_depth": "medium"}'::jsonb,
  statistics jsonb default '{"total_maps_created": 0, "total_nested_expansions": 0, "total_nodes": 0, "total_chats": 0, "total_images_generated": 0, "total_study_time_minutes": 0}'::jsonb,
  activity jsonb default '{}'::jsonb,
  unlocked_achievements text[] default '{}',
  last_active timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for Users
alter table public.users enable row level security;
create policy "users_self_manage" on public.users for all using (auth.uid() = id);
create policy "users_admin_read" on public.users for select using (exists (select 1 from public.users where id = auth.uid() and is_admin = true));

-- ── 2. User Settings & API Keys ──────────────────────────────────────────────
create table if not exists public.user_settings (
  user_id uuid primary key references public.users(id) on delete cascade,
  pollinations_api_key text,
  image_model text default 'flux',
  text_model text default 'openai',
  updated_at timestamptz default now()
);

alter table public.user_settings enable row level security;
create policy "user_settings_self" on public.user_settings for all using (auth.uid() = user_id);

-- ── 3. Knowledge Base (MindMaps) ─────────────────────────────────────────────
create table if not exists public.mindmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  topic text not null,
  summary text,
  mode text default 'single', -- 'single', 'compare', 'multi'
  depth text default 'medium', -- 'low', 'medium', 'deep'
  ai_persona text default 'Teacher',
  source_file_type text,
  source_url text,
  thumbnail_url text,
  thumbnail_prompt text,
  node_count int default 0,
  is_public boolean default false,
  is_sub_map boolean default false,
  parent_map_id uuid references public.mindmaps(id) on delete set null,
  content jsonb default '{}'::jsonb,
  pinned_messages jsonb default '[]'::jsonb,
  search_sources jsonb,
  search_timestamp text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.mindmaps enable row level security;
create policy "mindmaps_owner_all" on public.mindmaps for all using (auth.uid() = user_id);
create policy "mindmaps_public_view" on public.mindmaps for select using (is_public = true);
create policy "mindmaps_admin_manage" on public.mindmaps for all using (exists (select 1 from public.users where id = auth.uid() and is_admin = true));

create index if not exists idx_mindmaps_user_topic on public.mindmaps(user_id, topic);
create index if not exists idx_mindmaps_parent on public.mindmaps(parent_map_id);

-- ── 4. Chat & Interactions ──────────────────────────────────────────────────
create table if not exists public.chat_sessions (
  id text primary key,
  user_id uuid references public.users(id) on delete cascade,
  map_id uuid references public.mindmaps(id) on delete set null,
  title text,
  messages jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.chat_sessions enable row level security;
create policy "chat_sessions_owner" on public.chat_sessions for all using (auth.uid() = user_id);

-- ── 5. Admin Suite (Logs & Stats) ───────────────────────────────────────────
create table if not exists public.admin_activity_log (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  target_id text,
  target_type text,
  details text,
  performed_by uuid references public.users(id) on delete set null,
  performed_by_email text,
  metadata jsonb,
  timestamp timestamptz default now()
);

alter table public.admin_activity_log enable row level security;
create policy "admin_log_read" on public.admin_activity_log for select using (exists (select 1 from public.users where id = auth.uid() and is_admin = true));

create table if not exists public.admin_stats (
  id text primary key default 'global',
  total_users int default 0,
  total_maps int default 0,
  total_nodes int default 0,
  total_nodes_active int default 0,
  total_images int default 0,
  data jsonb default '{}'::jsonb,
  last_updated timestamptz default now()
);

-- ── 6. AI Intelligence (Latency & Tokens) ───────────────────────────────────
create table if not exists public.ai_calls (
  id text primary key default gen_random_uuid(),
  task_type text not null,
  provider text not null,
  model text not null,
  capability text,
  latency_ms integer not null,
  success boolean not null default true,
  repair_applied boolean default false,
  salvaged boolean default false,
  error_class text,
  input_tokens integer,
  output_tokens integer,
  is_shadow boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_ai_calls_task on ai_calls(task_type);
create index if not exists idx_ai_calls_provider on ai_calls(provider);
create index if not exists idx_ai_calls_created on ai_calls(created_at);

-- ── 7. Triggers for Real-time Statistics ────────────────────────────────────

-- Function to update user stats automatically on map creation
create or replace function public.on_mindmap_created()
returns trigger language plpgsql security definer as $$
begin
  if (new.is_sub_map = false) then
    update public.users 
    set statistics = jsonb_set(
      statistics, 
      '{total_maps_created}', 
      ((coalesce((statistics->>'total_maps_created')::int, 0) + 1)::text)::jsonb
    )
    where id = new.user_id;
  else
    update public.users 
    set statistics = jsonb_set(
      statistics, 
      '{total_nested_expansions}', 
      ((coalesce((statistics->>'total_nested_expansions')::int, 0) + 1)::text)::jsonb
    )
    where id = new.user_id;
  end if;
  
  -- Update global node count
  update public.users 
  set statistics = jsonb_set(
    statistics, 
    '{total_nodes}', 
    ((coalesce((statistics->>'total_nodes')::int, 0) + new.node_count)::text)::jsonb
  )
  where id = new.user_id;
  
  return new;
end;
$$;

create trigger tr_mindmap_created
  after insert on public.mindmaps
  for each row execute procedure public.on_mindmap_created();

-- Function to update user stats automatically on chat creation
create or replace function public.on_chat_created()
returns trigger language plpgsql security definer as $$
begin
  update public.users 
  set statistics = jsonb_set(
    statistics, 
    '{total_chats}', 
    ((coalesce((statistics->>'total_chats')::int, 0) + 1)::text)::jsonb
  )
  where id = new.user_id;
  return new;
end;
$$;

create trigger tr_chat_created
  after insert on public.chat_sessions
  for each row execute procedure public.on_chat_created();

-- Legacy support for manual incrementing
create or replace function public.increment_stat(stat_field text, increment_by int default 1)
returns void language plpgsql security definer as $$
begin
  update public.admin_stats 
  set data = jsonb_set(
    data, 
    array[stat_field], 
    ((coalesce((data->>stat_field)::int, 0) + increment_by)::text)::jsonb
  )
  where id = 'global';
end;
$$;

-- ── 7. Views for Admin Dashboard ───────────────────────────────────────────

create or replace view public.platform_metrics_view as
select
  (select count(*) from public.users) as total_users,
  (select count(*) from public.mindmaps where is_sub_map = false) as active_root_maps,
  (select coalesce(sum((statistics->>'total_maps_created')::int), 0) from public.users) as total_maps_ever,
  (select coalesce(sum((statistics->>'total_nodes')::int), 0) from public.users) as global_nodes,
  (select count(*) from public.chat_sessions) as total_chats,
  (select count(*) from public.users where last_active > now() - interval '24 hours') as active_users_24h,
  (select count(*) from public.ai_calls where success = true) as total_successful_ai_calls,
  (select coalesce(avg(latency_ms), 0) from public.ai_calls where created_at > now() - interval '24 hours') as avg_ai_latency_24h,
  -- Entity Analytics
  (select jsonb_object_agg(coalesce(source_file_type, 'text'), count) from (select source_file_type, count(*) from public.mindmaps group by source_file_type) s) as source_counts,
  (select jsonb_object_agg(coalesce(ai_persona, 'Teacher'), count) from (select ai_persona, count(*) from public.mindmaps group by ai_persona) s) as persona_counts,
  (select jsonb_object_agg(coalesce(depth, 'medium'), count) from (select depth, count(*) from public.mindmaps group by depth) s) as depth_counts,
  (select count(*) from public.mindmaps where is_public = true) as public_count,
  (select count(*) from public.mindmaps where is_public = false) as private_count,
  (select count(*) from public.mindmaps where is_sub_map = true) as sub_map_count;

create or replace view public.ai_intelligence_view as
select 
  task_type,
  provider,
  model,
  count(*) as call_count,
  round(avg(latency_ms)) as avg_latency,
  round(sum(input_tokens)) as total_input_tokens,
  round(sum(output_tokens)) as total_output_tokens,
  round((count(*) filter (where success = true)::numeric / count(*)) * 100, 2) as success_rate
from public.ai_calls
group by task_type, provider, model;

-- ── 8. Automation for New Users ─────────────────────────────────────────────
create or replace function public.handle_new_user_v2()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, display_name, photo_url, is_admin)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user_v2();
