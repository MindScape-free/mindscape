-- MindScape Supabase Schema (Idempotent - safe to re-run)

-- ── Drop existing policies to avoid conflicts ──────────────────────────────
do $$ declare
  r record;
begin
  for r in (select policyname, tablename from pg_policies where schemaname = 'public') loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- ── Users ──────────────────────────────────────────────────────────────────
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  photo_url text,
  preferences jsonb default '{}'::jsonb,
  statistics jsonb default '{}'::jsonb,
  activity jsonb default '{}'::jsonb,
  unlocked_achievements text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.users enable row level security;
create policy "users_select" on public.users for select using (auth.uid() = id);
create policy "users_insert" on public.users for insert with check (auth.uid() = id);
create policy "users_update" on public.users for update using (auth.uid() = id);

-- ── User Settings ──────────────────────────────────────────────────────────
create table if not exists public.user_settings (
  user_id uuid primary key references public.users(id) on delete cascade,
  pollinations_api_key text,
  image_model text default 'flux',
  text_model text default 'openai',
  api_key_created_at bigint,
  api_key_last_used bigint,
  updated_at timestamptz default now()
);
alter table public.user_settings enable row level security;
create policy "user_settings_all" on public.user_settings for all using (auth.uid() = user_id);

-- ── Mind Maps ──────────────────────────────────────────────────────────────
create table if not exists public.mindmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  topic text,
  summary text,
  mode text default 'single',
  depth text default 'medium',
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
create policy "mindmaps_owner" on public.mindmaps for all using (auth.uid() = user_id);
create policy "mindmaps_public_read" on public.mindmaps for select using (is_public = true);
create index if not exists mindmaps_user_id_idx on public.mindmaps(user_id);
create index if not exists mindmaps_parent_map_id_idx on public.mindmaps(parent_map_id);

-- ── Chat Sessions ──────────────────────────────────────────────────────────
create table if not exists public.chat_sessions (
  id text primary key,
  user_id uuid references public.users(id) on delete cascade,
  map_id uuid,
  map_title text,
  title text,
  messages jsonb default '[]'::jsonb,
  weak_tags text[] default '{}',
  quiz_history jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.chat_sessions enable row level security;
create policy "chat_sessions_owner" on public.chat_sessions for all using (auth.uid() = user_id);
create index if not exists chat_sessions_user_id_idx on public.chat_sessions(user_id);

-- ── Public Mind Maps ───────────────────────────────────────────────────────
create table if not exists public.public_mindmaps (
  id uuid primary key,
  original_author_id uuid references public.users(id) on delete cascade,
  author_name text,
  topic text,
  summary text,
  public_categories text[] default '{}',
  is_public boolean default true,
  views int default 0,
  public_views int default 0,
  content jsonb default '{}'::jsonb,
  published_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.public_mindmaps enable row level security;
create policy "public_mindmaps_read" on public.public_mindmaps for select using (true);
create policy "public_mindmaps_owner" on public.public_mindmaps for all using (auth.uid() = original_author_id);

-- ── Shared Mind Maps ───────────────────────────────────────────────────────
create table if not exists public.shared_mindmaps (
  id text primary key,
  original_map_id uuid,
  original_author_id uuid references public.users(id) on delete cascade,
  content jsonb default '{}'::jsonb,
  is_shared boolean default true,
  shared_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.shared_mindmaps enable row level security;
create policy "shared_mindmaps_read" on public.shared_mindmaps for select using (true);
create policy "shared_mindmaps_owner" on public.shared_mindmaps for all using (auth.uid() = original_author_id);

-- ── Admin Activity Log ─────────────────────────────────────────────────────
create table if not exists public.admin_activity_log (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  target_id text,
  target_type text,
  details text,
  performed_by text,
  performed_by_email text,
  metadata jsonb,
  timestamp timestamptz default now()
);
alter table public.admin_activity_log enable row level security;
create policy "activity_log_all" on public.admin_activity_log for all using (true);

-- ── Admin Stats ────────────────────────────────────────────────────────────
create table if not exists public.admin_stats (
  period text primary key,
  total_mindmaps int default 0,
  total_mindmaps_ever int default 0,
  total_users int default 0,
  total_chats int default 0,
  active_users int default 0,
  new_maps_today int default 0,
  new_users_today int default 0,
  date text,
  month text,
  last_updated bigint
);
alter table public.admin_stats enable row level security;
create policy "admin_stats_all" on public.admin_stats for all using (true);

-- ── User Points ────────────────────────────────────────────────────────────
create table if not exists public.user_points (
  user_id uuid primary key references public.users(id) on delete cascade,
  ledger jsonb default '{}'::jsonb,
  daily_caps jsonb default '{}'::jsonb,
  history_days jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);
alter table public.user_points enable row level security;
create policy "user_points_owner" on public.user_points for all using (auth.uid() = user_id);

-- ── Point Transactions ─────────────────────────────────────────────────────
create table if not exists public.point_transactions (
  id text primary key,
  user_id uuid references public.users(id) on delete cascade,
  type text,
  base_points int,
  bonus_points int,
  total_points int,
  multiplier float,
  timestamp bigint,
  metadata jsonb
);
alter table public.point_transactions enable row level security;
create policy "point_transactions_read" on public.point_transactions for select using (auth.uid() = user_id);
create policy "point_transactions_insert" on public.point_transactions for insert with check (true);
create index if not exists point_transactions_user_id_idx on public.point_transactions(user_id);

-- ── Feedback ───────────────────────────────────────────────────────────────
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  type text,
  status text default 'OPEN',
  priority text,
  tracking_id text,
  message text,
  admin_notes text,
  upvotes int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.feedback enable row level security;
create policy "feedback_insert" on public.feedback for insert with check (true);
create policy "feedback_all" on public.feedback for all using (true);

create table if not exists public.feedback_counters (
  id text primary key,
  last_number int default 0,
  last_updated timestamptz default now()
);
alter table public.feedback_counters enable row level security;
create policy "feedback_counters_all" on public.feedback_counters for all using (true);

-- ── Auto-create user profile on signup ────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, display_name, photo_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Enable Realtime ────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.mindmaps;
alter publication supabase_realtime add table public.chat_sessions;
alter publication supabase_realtime add table public.user_points;
alter publication supabase_realtime add table public.admin_activity_log;
