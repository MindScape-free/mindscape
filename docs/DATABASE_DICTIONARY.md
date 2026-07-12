# MindScape Database Dictionary

| Field | Value |
|---|---|
| **Project** | MindScape |
| **Database** | PostgreSQL 17 (via Supabase) |
| **Schema** | `public` (primary), `auth` (managed by Supabase Auth) |
| **Last Updated** | 2026-07-12 |
| **Source** | Supabase migrations in `supabase/migrations/` (13 migration files) |

> **Note**: This document is generated from the SQL migration files. Some tables and columns defined in the migrations may not yet exist in the production database if migrations have not been fully applied. Cross-reference with `supabase/migrations/` for the authoritative sequence.

---

## Table of Contents

1. [Core Data Tables](#1-core-data-tables)
   - [users](#users)
   - [mindmaps](#mindmaps)
   - [chat_sessions](#chat_sessions)
   - [public_mindmaps](#public_mindmaps)
   - [shared_mindmaps](#shared_mindmaps)
   - [feedback](#feedback)
   - [user_settings](#user_settings)
   - [admin_activity_log](#admin_activity_log)
2. [Event & Telemetry Tables](#2-event--telemetry-tables)
   - [user_events](#user_events)
   - [ai_calls](#ai_calls)
   - [analytics_events](#analytics_events)
3. [Aggregate & Materialized Tables](#3-aggregate--materialized-tables)
   - [user_profiles](#user_profiles)
   - [platform_stats](#platform_stats)
4. [Gamification Tables](#4-gamification-tables)
   - [user_daily_challenges](#user_daily_challenges)
5. [Deprecated Tables](#5-deprecated-tables)
   - [admin_stats](#admin_stats)
6. [Database Functions](#6-database-functions)
7. [Triggers](#7-triggers)
8. [Cron Jobs](#8-cron-jobs)
9. [Extensions](#9-extensions)
10. [Row Level Security Policies](#10-row-level-security-policies)
11. [Entity Relationship Diagram](#11-entity-relationship-diagram)

---

## 1. Core Data Tables

### `users`

The `users` table is managed by Supabase Auth (`auth.users`). MindScape mirrors a subset of columns into `public.users` for application-level queries.

**Source**: Supabase Auth (auto-managed) + application writes via `supabase-db.ts`

| Column | Type | Default | Constraints | Description |
|---|---|---|---|---|
| `id` | `uuid` | `gen_random_uuid()` | `PRIMARY KEY` | User ID (matches `auth.users.id`) |
| `email` | `text` | — | — | User email (mirrored from auth) |
| `display_name` | `text` | — | — | Display name for profile |
| `photo_url` | `text` | — | — | Avatar URL |
| `created_at` | `timestamptz` | `now()` | — | Account creation timestamp |
| `is_admin` | `boolean` | `false` | — | Admin flag (checked via env var + DB) |
| `preferences` | `jsonb` | `'{}'` | — | User preferences (persona, UI settings) |
| `unlocked_achievements` | `text[]` | `'{}'` | — | Array of achievement IDs |

**Application Code References**:
- `src/lib/auth-context.tsx`: `supabase.from('users').select('is_admin').eq('id', userId).single()`
- `src/lib/auth-context.tsx`: `supabase.from('users').select('preferences').eq('id', userId).single()`
- `src/lib/supabase-db.ts`: `getUserProfile()`, `upsertUserProfile()`, `updateUserField()`
- `src/lib/supabase-server.ts`: `isUserAdminServer()`

**RLS**: Managed by Supabase Auth. Authenticated users can read/update their own row.

---

### `mindmaps`

The core table for mind map data. Stores both root maps and sub-maps (nested expansions). Content is stored as JSONB in the `content` column.

**Source**: `supabase/migrations/` (implicit) + `src/lib/supabase-db.ts`

| Column | Type | Default | Constraints | Description |
|---|---|---|---|---|
| `id` | `uuid` | `gen_random_uuid()` | `PRIMARY KEY` | Unique map identifier |
| `user_id` | `uuid` | — | `REFERENCES users(id)` | Owner of the map |
| `topic` | `text` | — | `NOT NULL` | Map topic/title |
| `summary` | `text` | — | − | AI-generated summary |
| `mode` | `text` | `'single'` | — | `'single'`, `'compare'`, or `'multi'` |
| `depth` | `text` | `'medium'` | — | Generation depth: `'low'`, `'medium'`, or `'deep'` |
| `ai_persona` | `text` | `'Teacher'` | — | AI persona used: `'Teacher'`, `'Concise'`, `'Creative'`, `'Sage'` |
| `node_count` | `integer` | `0` | — | Number of nodes in the map |
| `is_public` | `boolean` | `false` | — | Whether the map is published to community |
| `is_sub_map` | `boolean` | `false` | — | Whether this is a nested sub-map |
| `is_shared` | `boolean` | `false` | — | Whether sharing link was generated |
| `parent_map_id` | `uuid` | — | `REFERENCES mindmaps(id)` | Parent map (if sub-map) |
| `source_file_type` | `text` | — | — | Source type: `'pdf'`, `'text'`, `'website'`, `'youtube'`, `'image'` |
| `source_url` | `text` | — | — | Original source URL |
| `thumbnail_url` | `text` | — | — | Auto-generated thumbnail URL |
| `thumbnail_prompt` | `text` | — | — | AI prompt used for thumbnail |
| `pinned_messages` | `jsonb` | `'[]'` | — | Array of pinned chat messages *(inferred from application code)* |
| `search_sources` | `jsonb` | — | — | Web search sources used during generation *(inferred from application code)* |
| `search_timestamp` | `text` | — | — | Timestamp of web search *(inferred from application code)* |
| `forked_from` | `uuid` | — | `REFERENCES mindmaps(id) ON DELETE SET NULL` | Original map this was forked from |
| `fork_count` | `integer` | `0` | — | Number of times this map was forked |
| `content` | `jsonb` | — | — | Full map data (subTopics, compareData, nodes, edges, explanations, etc.) |
| `created_at` | `timestamptz` | `now()` | — | Creation timestamp |
| `updated_at` | `timestamptz` | `now()` | — | Last update timestamp |

**Indexes**: (expected — confirmed by application queries)
- `idx_mindmaps_user_id` on `user_id`
- `idx_mindmaps_created_at` on `created_at DESC`
- `idx_mindmaps_is_public` on `is_public`

**Triggers**:
- `trg_auto_log_map_created` — AFTER INSERT → inserts `map_created` event into `user_events`
- `trg_auto_log_map_updated` — AFTER UPDATE (conditional) → syncs `map_created` event data
- `trg_auto_log_map_deleted` — BEFORE DELETE → inserts `map_deleted` event into `user_events`

**Application Code References**:
- `src/lib/supabase-db.ts`: `saveMindMap()`, `getMindMap()`, `updateMindMapField()`, `getUserMindMaps()`
- `src/lib/supabase-server.ts`: `getMindMapAdmin()`
- `src/hooks/use-mind-map-persistence.ts`: Full CRUD and auto-save logic

---

### `chat_sessions`

Persistent chat session storage. Each session belongs to a user and optionally links to a mind map.

**Source**: Inferred from `src/lib/supabase-db.ts` (not explicitly created in migrations)

| Column | Type | Default | Constraints | Description |
|---|---|---|---|---|
| `id` | `text` | — | `PRIMARY KEY` | Session ID (e.g., `session-{timestamp}`) |
| `user_id` | `uuid` | — | `REFERENCES users(id)` | Session owner |
| `map_id` | `uuid` | — | `REFERENCES mindmaps(id)` | Associated mind map (optional) |
| `map_title` | `text` | — | — | Title of associated map |
| `title` | `text` | — | — | Session title (topic) |
| `messages` | `jsonb` | `'[]'` | — | Array of chat messages |
| `weak_tags` | `jsonb` | `'[]'` | — | Weak area tags from quiz analysis |
| `quiz_history` | `jsonb` | `'[]'` | — | History of quizzes taken in this session |
| `created_at` | `timestamptz` | `now()` | — | Creation timestamp |
| `updated_at` | `timestamptz` | `now()` | — | Last update timestamp |

**Application Code References**:
- `src/hooks/use-chat-persistence.ts`: Full CRUD with Realtime subscription

---

### `public_mindmaps`

Published/shared mind maps visible in the Community Dashboard. Separate from `mindmaps` to avoid exposing private data through public queries.

**Source**: Inferred from `src/lib/supabase-db.ts` (publish/unpublish operations)

| Column | Type | Default | Constraints | Description |
|---|---|---|---|---|
| `id` | `uuid` | — | `PRIMARY KEY` | Map ID (matches mindmaps.id) |
| `topic` | `text` | — | — | Map title |
| `summary` | `text` | — | — | Map summary |
| `content` | `jsonb` | — | — | Full map data (sanitized copy) |
| `is_public` | `boolean` | `true` | — | Always true |
| `public_categories` | `text[]` | — | — | AI-assigned categories for discovery |
| `original_map_id` | `uuid` | — | — | Reference to original mindmaps.id |
| `original_author_id` | `uuid` | — | — | Original author |
| `author_name` | `text` | — | — | Display name at time of publish |
| `author_avatar` | `text` | — | — | Avatar URL at time of publish |
| `views` | `integer` | `0` | — | Public view count |
| `published_at` | `timestamptz` | `now()` | — | Publish timestamp |
| `updated_at` | `timestamptz` | `now()` | — | Last update timestamp |

**Application Code References**:
- `src/lib/supabase-db.ts`: `publishMap()`, `unpublishMap()`, `getPublicMap()`
- `src/app/actions/community.ts`: Community publish/query server actions

---

### `shared_mindmaps`

Unlisted sharing mechanism. Maps shared via link but not published to community.

**Source**: Inferred from `src/components/mind-map.tsx` (share flow)

| Column | Type | Default | Constraints | Description |
|---|---|---|---|---|
| `id` | `text` | — | `PRIMARY KEY` | Share ID (e.g., `share_{mapId}`) |
| `topic` | `text` | — | — | Map title |
| `summary` | `text` | — | — | Map summary |
| `content` | `jsonb` | — | — | Map data for viewing |
| `is_shared` | `boolean` | `true` | — | Always true |
| `is_public` | `boolean` | `false` | — | Always false (unlisted) |
| `shared_at` | `timestamptz` | `now()` | — | Share timestamp |
| `original_author_id` | `uuid` | — | — | Original author |
| `author_name` | `text` | — | — | Display name at time of share |

---

### `feedback`

User-submitted feedback entries.

**Source**: Inferred from `src/app/feedback/page.tsx`

| Column | Type | Default | Constraints | Description |
|---|---|---|---|---|
| `id` | `uuid` | `gen_random_uuid()` | `PRIMARY KEY` | Feedback ID |
| `user_id` | `uuid` | — | `REFERENCES users(id)` | Submitter |
| `email` | `text` | — | — | Contact email |
| `message` | `text` | — | — | Feedback text |
| `type` | `text` | — | — | Category: `'bug'`, `'feature'`, `'general'` |
| `created_at` | `timestamptz` | `now()` | — | Submission timestamp |

---

### `user_settings`

Per-user AI configuration. Stores the Pollinations API key and model preferences.

**Source**: Inferred from `src/contexts/ai-config-context.tsx`, `src/lib/supabase-db.ts`

| Column | Type | Default | Constraints | Description |
|---|---|---|---|---|
| `user_id` | `uuid` | — | `PRIMARY KEY`, `REFERENCES users(id)` | User ID |
| `pollinations_api_key` | `text` | — | — | User's personal Pollinations API key (BYOP) |
| `image_model` | `text` | `'flux'` | — | Preferred image generation model |
| `text_model` | `text` | `'openai'` | — | Preferred text generation model |
| `api_key_created_at` | `bigint` | — | — | Timestamp when API key was set |
| `api_key_last_used` | `bigint` | — | — | Timestamp when API key was last used |

**Application Code References**:
- `src/contexts/ai-config-context.tsx`: Realtime subscription on `user_settings`
- `src/lib/supabase-db.ts`: `getUserImageSettings()`, `saveUserApiKey()`, `deleteUserApiKey()`
- `src/lib/supabase-server.ts`: `getUserImageSettingsAdmin()`

---

### `admin_activity_log`

Audit trail for administrative actions. Written to by server-side admin code.

**Source**: Inferred from `src/lib/supabase-db.ts`, `src/lib/supabase-server.ts`

| Column | Type | Default | Constraints | Description |
|---|---|---|---|---|
| `id` | `bigint` | generated always as identity | `PRIMARY KEY` | Auto-incrementing ID |
| `type` | `text` | — | — | Action type (e.g., `'MAP_CREATED'`, `'CHAT_CREATED'`, `'MAP_PUBLISHED'`) |
| `target_id` | `text` | — | — | ID of affected resource |
| `target_type` | `text` | — | — | Type of affected resource |
| `details` | `text` | — | — | Human-readable description |
| `performed_by` | `uuid` | — | — | Admin who performed the action |
| `performed_by_email` | `text` | — | — | Email of the performer |
| `metadata` | `jsonb` | `'{}'` | — | Additional structured data |
| `timestamp` | `timestamptz` | `now()` | — | When the action occurred |

---

## 2. Event & Telemetry Tables

### `user_events`

Immutable append-only event log. Every user action (map creation, chat, image generation, etc.) is recorded here. This is the **single source of truth** for all user activity used by the `recompute_user_profile()` and `recompute_platform_stats()` functions.

**Source**: `supabase/migrations/20260621000001_user_events_tables.sql`

| Column | Type | Default | Constraints | Description |
|---|---|---|---|---|
| `id` | `bigint` | generated always as identity | `PRIMARY KEY` | Auto-incrementing event ID |
| `user_id` | `uuid` | — | `NOT NULL`, `REFERENCES users(id) ON DELETE CASCADE` | User who performed the action |
| `event_type` | `text` | — | `NOT NULL` | Event type: `'map_created'`, `'map_deleted'`, `'chat_sent'`, `'image_generated'`, `'node_expanded'`, `'study_time'`, plus unknown types |
| `event_data` | `jsonb` | `'{}'` | `NOT NULL` | Structured event payload |
| `source` | `text` | — | — | Source of the event: `'canvas'`, `'home'`, `'api'`, `'admin'`, `'system'` |
| `ip_address` | `text` | — | — | Client IP address |
| `user_agent` | `text` | — | — | Client user agent string |
| `session_id` | `text` | — | — | Client session identifier |
| `created_at` | `timestamptz` | `now()` | — | Event timestamp |

**Indexes**:
- `idx_user_events_user_id` on `user_id`
- `idx_user_events_type` on `event_type`
- `idx_user_events_created_at` on `created_at DESC`
- `idx_user_events_user_created` on `(user_id, created_at DESC)`
- `idx_user_events_type_created` on `(event_type, created_at DESC)`

**RLS**:
- `"Admins can read user_events"`: `FOR SELECT USING (true)` — application-layer auth via token verification
- `"Service role can insert"`: `FOR INSERT WITH CHECK (true)` — service role bypasses RLS

**event_data Payload Schemas**:

| event_type | event_data Keys | Example |
|---|---|---|
| `map_created` | `mindmap_id`, `mode`, `depth`, `source_type`, `persona`, `node_count`, `is_sub_map`, `parent_map_id` | `{"mindmap_id": "abc", "mode": "single", "depth": "medium", "persona": "Teacher", "node_count": 42}` |
| `map_deleted` | Same as `map_created` | Same structure |
| `chat_sent` | — | `{}` |
| `image_generated` | — | `{}` |
| `node_expanded` | — | `{}` |
| `study_time` | `minutes` | `{"minutes": 5}` |

**Application Code References**:
- `src/hooks/use-mind-map-persistence.ts`: Fires events via `logAdminActivityAction`
- `src/contexts/xp-context.tsx`: Fires events via `awardXP` → `awardPointsAction`

---

### `ai_calls`

AI provider telemetry. Records every AI generation call for monitoring and debugging.

**Source**: `supabase/migrations/20260624000001_telemetry_tables.sql`

| Column | Type | Default | Constraints | Description |
|---|---|---|---|---|
| `id` | `text` | `gen_random_uuid()::text` | `PRIMARY KEY` | Unique call ID |
| `task_type` | `text` | `'unspecified'` | `NOT NULL` | Type of AI task (e.g., `'generate-mind-map'`, `'explain-node'`, `'chat'`) |
| `provider` | `text` | `'unknown'` | `NOT NULL` | AI provider used |
| `model` | `text` | `'unknown'` | `NOT NULL` | Model used (e.g., `'openai'`, `'deepseek'`, `'llama'`) |
| `duration_ms` | `integer` | — | — | Call duration in milliseconds |
| `was_error` | `boolean` | `false` | — | Whether the call resulted in an error |
| `error_message` | `text` | — | — | Error message (if applicable) |
| `prompt` | `text` | — | — | Prompt sent to the AI |
| `user_id` | `text` | — | — | User who triggered the call |
| `metadata` | `jsonb` | `'{}'` | — | Additional telemetry data |
| `repair_applied` | `boolean` | `false` | — | Whether JSON repair was applied to the response |
| `salvaged` | `boolean` | `false` | — | Whether partial data was salvaged from a failed parse |
| `created_at` | `timestamptz` | `now()` | — | Call timestamp |

**Indexes**:
- `idx_ai_calls_created` on `created_at DESC`
- `idx_ai_calls_was_error` on `was_error`
- `idx_ai_calls_task_type` on `task_type`
- `idx_ai_calls_user_id` on `user_id`

**RLS**: Service role only (`service_role_all` policy)

**Application Code References**:
- `src/ai/providers/orchestrator.ts`: `recordTelemetry()` writes to `ai_calls`

---

### `analytics_events`

Client-side analytics events. Queued by the `AnalyticsTracker` and flushed every 5 seconds.

**Source**: `supabase/migrations/20260624000001_telemetry_tables.sql`

| Column | Type | Default | Constraints | Description |
|---|---|---|---|---|
| `id` | `bigint` | generated always as identity | `PRIMARY KEY` | Auto-incrementing event ID |
| `event_name` | `text` | `''` | `NOT NULL` | Event name (e.g., `'page_view'`, `'feature_used'`) |
| `category` | `text` | `''` | `NOT NULL` | Event category |
| `properties` | `jsonb` | `'{}'` | — | Event-specific properties |
| `timestamp` | `bigint` | `0` | `NOT NULL` | Client-side event timestamp (epoch ms) |
| `session_id` | `text` | `''` | `NOT NULL` | Analytics session ID |
| `user_id` | `text` | — | — | User ID (if authenticated) |
| `duration` | `integer` | — | — | Event duration in ms |
| `metadata` | `jsonb` | `'{}'` | — | Additional metadata |
| `received_at` | `timestamptz` | `now()` | — | Server-side receipt timestamp |
| `date` | `text` | — | — | Event date (YYYY-MM-DD, pre-computed) |
| `month` | `text` | — | — | Event month (YYYY-MM, pre-computed) |

**Indexes**:
- `idx_analytics_events_date` on `date`
- `idx_analytics_events_month` on `month`
- `idx_analytics_events_category` on `category`
- `idx_analytics_events_received` on `received_at DESC`

**RLS**: Service role only (`service_role_all` policy)

---

## 3. Aggregate & Materialized Tables

### `user_profiles`

Pre-computed per-user aggregate statistics. Populated by `recompute_user_profile(uuid)`. Serves the admin dashboard, user profile page, and achievement system. Refreshed every 5 minutes by cron for active users, every 6 hours for all users.

**Source**: `supabase/migrations/20260621000001_user_events_tables.sql` (initially), evolved through migrations 07, 11, 13

| Column | Type | Default | Constraints | Description |
|---|---|---|---|---|
| `user_id` | `uuid` | — | `PRIMARY KEY`, `REFERENCES users(id) ON DELETE CASCADE` | User ID |
| `email` | `text` | — | — | User email (mirrored) |
| `display_name` | `text` | — | — | Display name (mirrored) |
| `photo_url` | `text` | — | — | Avatar URL (mirrored) |
| `created_at` | `timestamptz` | — | — | Account creation timestamp |
| `total_maps` | `int` | `0` | `NOT NULL` | Total root maps created (excludes sub-maps) |
| `total_compare_maps` | `int` | `0` | `NOT NULL` | Total compare-mode maps |
| `total_multi_maps` | `int` | `0` | `NOT NULL` | Total multi-source maps |
| `total_chats` | `int` | `0` | `NOT NULL` | Total chat messages sent |
| `total_nodes` | `int` | `0` | `NOT NULL` | Total nodes across all maps (excludes sub-maps) |
| `total_images` | `int` | `0` | `NOT NULL` | Total AI images generated |
| `total_expansions` | `int` | `0` | `NOT NULL` | Total nested expansions (sub-maps) |
| `study_time_minutes` | `int` | `0` | `NOT NULL` | Total study time in minutes |
| `current_streak` | `int` | `0` | `NOT NULL` | Consecutive days with activity |
| `longest_streak` | `int` | `0` | `NOT NULL` | Longest streak ever achieved |
| `last_active_date` | `date` | — | — | Most recent activity date |
| `mode_breakdown` | `jsonb` | `'{}'` | `NOT NULL` | Map counts by mode: `{single: N, compare: N, multi: N}` |
| `depth_breakdown` | `jsonb` | `'{}'` | `NOT NULL` | Map counts by depth: `{low: N, medium: N, deep: N}` |
| `source_breakdown` | `jsonb` | `'{}'` | `NOT NULL` | Map counts by source: `{text: N, pdf: N, website: N, youtube: N, image: N}` |
| `persona_breakdown` | `jsonb` | `'{}'` | `NOT NULL` | Map counts by persona: `{Teacher: N, Concise: N, Creative: N, Sage: N}` |
| `daily_activity` | `jsonb` | `'{}'` | `NOT NULL` | Activity heatmap: `{"2026-06-20": {maps: 3, chats: 5, images: 1, study_minutes: 10}}` |
| `unlocked_achievements` | `text[]` | `'{}'` | — | Array of achievement IDs |
| `preferences` | `jsonb` | `'{}'` | `NOT NULL` | User preferences (mirrored from `users.preferences`) |
| `api_settings` | `jsonb` | `'{}'` | `NOT NULL` | AI settings (mirrored from `user_settings`) |
| `updated_at` | `timestamptz` | `now()` | — | Last recompute timestamp |

**RLS**:
- `"Admins can read user_profiles"`: `FOR SELECT USING (true)`
- `"Service role can upsert"`: `FOR ALL USING (true) WITH CHECK (true)`

**Associated Functions**:
- `recompute_user_profile(uuid)` — Full recompute from event history
- `increment_user_profile(...)` — Real-time incremental update (added in migration 13)

---

### `platform_stats`

Single-row table holding platform-wide rolled-up statistics. Refreshed every 5 minutes by cron.

**Source**: `supabase/migrations/20260621000001_user_events_tables.sql`, evolved through migrations 03–06

| Column | Type | Default | Constraints | Description |
|---|---|---|---|---|
| `id` | `text` | `'global'` | `PRIMARY KEY` | Always `'global'` (single-row) |
| `total_users` | `int` | `0` | `NOT NULL` | Total registered users |
| `total_maps` | `int` | `0` | `NOT NULL` | Total root maps (excludes sub-maps) |
| `total_maps_ever` | `int` | `0` | `NOT NULL` | Same as `total_maps` (legacy) |
| `total_chats` | `int` | `0` | `NOT NULL` | Total chat messages sent |
| `total_nodes` | `int` | `0` | `NOT NULL` | Total nodes across all root maps |
| `total_images` | `int` | `0` | `NOT NULL` | Total AI images generated |
| `total_events` | `bigint` | `0` | `NOT NULL` | Total user events recorded |
| `new_users_24h` | `int` | `0` | `NOT NULL` | New users in the last 24 hours |
| `new_maps_24h` | `int` | `0` | `NOT NULL` | New maps created in the last 24 hours |
| `active_users_24h` | `int` | `0` | `NOT NULL` | Distinct active users in the last 24 hours |
| `active_users_7d` | `int` | `0` | `NOT NULL` | Distinct active users in the last 7 days |
| `new_users_7d` | `int` | `0` | `NOT NULL` | New users in the last 7 days |
| `new_maps_7d` | `int` | `0` | `NOT NULL` | New maps in the last 7 days |
| `health_score` | `int` | `100` | `NOT NULL` | Platform health score (0–100) |
| `engagement_rate` | `double precision` | `0` | `NOT NULL` | 24h active users as % of total users |
| `top_persona` | `text` | `'N/A'` | — | Most used AI persona |
| `top_source_type` | `text` | `'N/A'` | — | Most used source type |
| `avg_maps_per_user` | `double precision` | `0` | `NOT NULL` | Average maps per user |
| `avg_nodes_per_map` | `double precision` | `0` | `NOT NULL` | Average nodes per map |
| `daily_snapshot` | `jsonb` | `'[]'` | `NOT NULL` | 31-day rolling window of daily activity |
| `updated_at` | `timestamptz` | `now()` | — | Last recompute timestamp |

**Health Score Formula** (as of migration 06):
```
Component 1 (0–50 pts): engagement_rate / 20 * 50
  → 20% engagement rate = 50 points (full)
Component 2 (0–50 pts): (maps_per_user / 1.5) * 50
  → 1.5 maps per user = 50 points (full)
Total: 0–100
```

**RLS**:
- `"Admins can read platform_stats"`: `FOR SELECT USING (true)`
- `"Service role can upsert"`: `FOR ALL USING (true) WITH CHECK (true)`

**Associated Functions**:
- `recompute_platform_stats()` — Full recompute from `user_profiles` and `user_events`

---

## 4. Gamification Tables

### `user_daily_challenges`

Tracks daily challenge completion for the gamification system.

**Source**: `supabase/migrations/20260705000001_forking_and_challenges.sql`

| Column | Type | Default | Constraints | Description |
|---|---|---|---|---|
| `id` | `uuid` | `uuid_generate_v4()` | `PRIMARY KEY` | Challenge ID |
| `user_id` | `uuid` | — | `NOT NULL`, `REFERENCES auth.users(id) ON DELETE CASCADE` | User who completed the challenge |
| `date_string` | `varchar(10)` | — | `NOT NULL` | Challenge date (YYYY-MM-DD format) |
| `map_id` | `uuid` | — | `REFERENCES mindmaps(id) ON DELETE SET NULL` | Associated map (if applicable) |
| `completed_at` | `timestamptz` | `now()` | — | Completion timestamp |
| `xp_awarded` | `integer` | `500` | — | XP awarded for completion |

**Constraints**:
- `UNIQUE(user_id, date_string)` — one challenge per user per day

**RLS**:
- `"Users can view their own daily challenges"`: `FOR SELECT USING (auth.uid() = user_id)`
- `"Users can insert their own daily challenges"`: `FOR INSERT WITH CHECK (auth.uid() = user_id)`

---

## 5. Deprecated Tables

### `admin_stats`

**Status**: 🗑️ **Deprecated** — Dropped in `migrations/20260621000012_drop_admin_stats.sql`

Replaced by `platform_stats`. All reads and writes have been removed from application code. The single canonical source for platform metrics is now `platform_stats`.

**Reason for deprecation**: Duplicated data and inconsistent update paths. The new materialized approach (`user_profiles` → `recompute_platform_stats()`) has a single, auditable execution path.

---

## 6. Database Functions

### Recompute Functions

#### `recompute_user_profile(p_user_id uuid) → jsonb`

Full recompute of a single user's profile from their event history.

- **Language**: PL/pgSQL
- **Security**: `SECURITY DEFINER`
- **Search Path**: `public`
- **Algorithm**:
  1. Fetch user info from `users` table
  2. Fetch API settings from `user_settings` table
  3. Iterate ALL `user_events` for this user in chronological order
  4. For `map_created` events: increment counters (mode, depth, source, persona breakdowns); skip sub-maps
  5. For `map_deleted` events: decrement the same counters (with `greatest(0, ...)` guards)
  6. For `chat_sent`, `image_generated`, `node_expanded`: increment respective totals
  7. For `study_time`: accumulate minutes
  8. Build daily activity heatmap from event dates
  9. Compute streaks from consecutive active dates
  10. Upsert into `user_profiles`
  11. Return profile as JSON
- **Returns**: JSONB with profile summary

#### `increment_user_profile(...) → jsonb`

Real-time incremental update (added in migration 13). Called after each user action to update counters atomically without scanning the full event history.

- **Parameters**: `p_user_id`, `p_maps`, `p_compare_maps`, `p_multi_maps`, `p_chats`, `p_nodes`, `p_images`, `p_expansions`, `p_study_minutes`, `p_map_mode`, `p_map_depth`, `p_map_source`, `p_map_persona`, `p_is_map_deleted`
- **Returns**: JSONB with current counters

#### `recompute_platform_stats() → jsonb`

Full recompute of platform-wide statistics.

- **Language**: PL/pgSQL
- **Security**: `SECURITY DEFINER`
- **Algorithm**:
  1. Aggregate from `user_profiles` (total_users, total_maps, total_chats, total_nodes, total_images)
  2. If `total_nodes = 0`, fallback to direct `mindmaps` query (excluding sub-maps)
  3. Count time-windowed metrics from `user_events`
  4. Compute health score via admin-sync formula
  5. Build 31-day daily snapshot via `generate_series`
  6. Upsert into `platform_stats`
- **Returns**: JSONB with platform summary

#### `recompute_active_user_profiles() → text`

Scans `user_events` for users with activity in the last 10 minutes and calls `recompute_user_profile()` for each.

- **Called by**: Cron job every 5 minutes
- **Returns**: `"Recomputed X user profiles in Y ms"`

#### `recompute_all_user_profiles() → text`

Full recompute of ALL user profiles by iterating all distinct user IDs from `user_events`.

- **Called by**: Cron job every 6 hours
- **Returns**: `"Full recompute: X profiles in Y ms"`

### Utility Functions

#### `increment_fork_count(map_id uuid) → void`

Safely increments the `fork_count` column on a mind map.

- **Language**: PL/pgSQL
- **Security**: `SECURITY DEFINER`
- **Source**: `migrations/20260705000001_forking_and_challenges.sql`

#### `auto_log_map_created() → trigger`

Trigger function. Inserts a `map_created` event into `user_events` after a mind map is inserted.

#### `auto_log_map_updated() → trigger`

Trigger function. Syncs the `event_data` of the existing `map_created` event when tracked columns change.

#### `auto_log_map_deleted() → trigger`

Trigger function. Inserts a `map_deleted` event into `user_events` before a mind map is deleted.

---

## 7. Triggers

| Trigger Name | Table | Event | Timing | Function | Purpose |
|---|---|---|---|---|---|
| `trg_auto_log_map_created` | `mindmaps` | INSERT | AFTER | `auto_log_map_created()` | Auto-insert `map_created` event |
| `trg_auto_log_map_updated` | `mindmaps` | UPDATE | AFTER | `auto_log_map_updated()` | Sync event data when tracked columns change |
| `trg_auto_log_map_deleted` | `mindmaps` | DELETE | BEFORE | `auto_log_map_deleted()` | Auto-insert `map_deleted` event |

**Conditional trigger** (`trg_auto_log_map_updated`):
Only fires when ANY of these columns actually change:
- `node_count`, `mode`, `depth`, `ai_persona`, `source_file_type`, `is_sub_map`, `parent_map_id`

---

## 8. Cron Jobs

Managed by `pg_cron` extension.

| Job Name | Schedule | Function | Purpose |
|---|---|---|---|
| `recompute-active-user-profiles` | `*/5 * * * *` (every 5 min) | `recompute_active_user_profiles()` | Refresh profiles for recently active users |
| `recompute-platform-stats` | `*/5 * * * *` (every 5 min) | `recompute_platform_stats()` | Refresh global platform statistics |
| `recompute-all-user-profiles` | `15 */6 * * *` (every 6 hours at :15) | `recompute_all_user_profiles()` | Full consistency check of all profiles |

**Monitoring query**:
```sql
select * from cron.job;
select * from cron.job_run_details order by start_time desc limit 10;
```

---

## 9. Extensions

| Extension | Schema | Purpose |
|---|---|---|
| `pg_cron` | `pg_catalog` | Scheduled job execution for profile/stat recompute |

---

## 10. Row Level Security Policies

### `user_events`

| Policy Name | Operation | Using/Check | Description |
|---|---|---|---|
| `Admins can read user_events` | SELECT | `true` | Application-layer auth via token verification |
| `Service role can insert` | INSERT | `true` (WITH CHECK) | Service role bypasses RLS |

### `user_profiles`

| Policy Name | Operation | Using/Check | Description |
|---|---|---|---|
| `Admins can read user_profiles` | SELECT | `true` | Application-layer auth |
| `Service role can upsert` | ALL | `true` (USING + CHECK) | Service role bypasses RLS |

### `platform_stats`

| Policy Name | Operation | Using/Check | Description |
|---|---|---|---|
| `Admins can read platform_stats` | SELECT | `true` | Application-layer auth |
| `Service role can upsert` | ALL | `true` (USING + CHECK) | Service role bypasses RLS |

### `ai_calls`

| Policy Name | Operation | Using/Check | Description |
|---|---|---|---|
| `service_role_all` | ALL | `true` | Service role only |

### `analytics_events`

| Policy Name | Operation | Using/Check | Description |
|---|---|---|---|
| `service_role_all` | ALL | `true` | Service role only |

### `user_daily_challenges`

| Policy Name | Operation | Using/Check | Description |
|---|---|---|---|
| `Users can view their own daily challenges` | SELECT | `auth.uid() = user_id` | Users see only their own challenges |
| `Users can insert their own daily challenges` | INSERT | `auth.uid() = user_id` (WITH CHECK) | Users insert only for themselves |

---

## 11. Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           SUPABASE AUTH                                  │
│  auth.users ───────────────────────────────────────────────────────────┐│
│  • id (PK)             ◄────────────────────────────────────────────── ││
│  • email                                                                ││
│  • created_at                                                           ││
└─────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────────┐
│     users        │     │   user_settings  │     │   admin_activity_log │
│──────────────────│     │──────────────────│     │──────────────────────│
│ • id (PK)        │     │ • user_id (PK,FK)│     │ • id (PK)            │
│ • email          │◄───►│ • pollinations_  │     │ • type               │
│ • display_name   │     │   api_key        │     │ • target_id          │
│ • photo_url      │     │ • image_model    │     │ • performed_by       │
│ • created_at     │     │ • text_model     │     │ • timestamp          │
│ • is_admin       │     │ • api_key_*      │     └──────────────────────┘
│ • preferences    │     └──────────────────┘
│ • unlocked_      │
│   achievements   │          │
└──────┬───────────┘          │ REFERENCES
       │                      ▼
       │             ┌──────────────────┐
       │             │  user_profiles   │
       │             │──────────────────│
       │             │ • user_id (PK,FK)│
       │             │ • total_maps     │
       │             │ • total_chats    │
       │             │ • total_nodes    │
       │             │ • mode_breakdown │
       │             │ • daily_activity │
       │             │ • current_streak │
       │             │ • preferences    │
       │             │ • api_settings   │
       │             └──────────────────┘
       │
       │ REFERENCES
       ├───────────────────────────────────────────────────────────────┐
       │                                                               │
       ▼                                                               ▼
┌──────────────────────┐                              ┌──────────────────────┐
│     mindmaps         │                              │   chat_sessions      │
│──────────────────────│                              │──────────────────────│
│ • id (PK)            │                              │ • id (PK)            │
│ • user_id (FK)       │                              │ • user_id (FK)       │
│ • topic              │                              │ • map_id (FK)        │
│ • mode               │                              │ • title              │
│ • depth              │                              │ • messages (JSONB)   │
│ • ai_persona         │                              │ • weak_tags (JSONB)  │
│ • node_count         │                              └──────────────────────┘
│ • is_public          │
│ • is_sub_map         │          ┌──────────────────────┐
│ • parent_map_id (FK) │─────────►│  public_mindmaps     │
│ • content (JSONB)    │          │──────────────────────│
│ • forked_from (FK)   │          │ • id (PK)            │
│ • fork_count         │          │ • original_map_id    │
│ • created_at         │          │ • author_name        │
│ • updated_at         │          │ • public_categories  │
└──────────────────────┘          │ • views              │
         │                        └──────────────────────┘
         │ triggers
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                             user_events                                  │
│─────────────────────────────────────────────────────────────────────────│
│ • id (PK, identity)                                                      │
│ • user_id (FK, NOT NULL)              ◆ Immutable, append-only           │
│ • event_type (NOT NULL)               ◆ Single source of truth           │
│ • event_data (JSONB, NOT NULL)        ◆ Populated by triggers + app      │
│ • source, ip_address, user_agent      ◆ Consumed by recompute_*()        │
│ • created_at                                                             │
└─────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────────┐
│  platform_stats  │     │   ai_calls       │     │ analytics_events     │
│──────────────────│     │──────────────────│     │──────────────────────│
│ • id='global' PK │     │ • id (PK)        │     │ • id (PK, identity)  │
│ • total_users    │     │ • task_type      │     │ • event_name         │
│ • total_maps     │     │ • provider       │     │ • category           │
│ • health_score   │     │ • model          │     │ • properties (JSONB) │
│ • daily_snapshot │     │ • duration_ms    │     │ • session_id         │
│ • updated_at     │     │ • was_error      │     │ • date               │
└──────────────────┘     │ • metadata       │     └──────────────────────┘
                         └──────────────────┘
```

---

## Appendix A: Migration History

| Migration | Date | Description |
|---|---|---|
| `20260614150629` | 2026-06-14 | Remote schema placeholder (empty) |
| `20260614150709` | 2026-06-14 | Initial schema description (metadata only) |
| `20260621000001` | 2026-06-21 | `user_events`, `user_profiles`, `platform_stats` + `recompute_user_profile()` + `recompute_platform_stats()` |
| `20260621000002` | 2026-06-21 | pg_cron setup, 3 recurring jobs (5min / 5min / 6hr) |
| `20260621000003` | 2026-06-21 | Fix: node_count fallback in `recompute_platform_stats()` |
| `20260621000004` | 2026-06-21 | Fix: remove invalid `is_deleted` column reference |
| `20260621000005` | 2026-06-21 | Fix: filter sub-maps from `mindmaps` fallback |
| `20260621000006` | 2026-06-21 | Fix: align health score formula with admin-sync |
| `20260621000007` | 2026-06-21 | Fix: filter sub-maps from `recompute_user_profile()` |
| `20260621000008` | 2026-06-21 | Trigger: `trg_auto_log_map_created` on `mindmaps` INSERT |
| `20260621000009` | 2026-06-21 | Trigger: `trg_auto_log_map_updated` on `mindmaps` UPDATE |
| `20260621000010` | 2026-06-21 | Trigger: `trg_auto_log_map_deleted` on `mindmaps` DELETE |
| `20260621000011` | 2026-06-21 | Fix: handle `map_deleted` events in `recompute_user_profile()` |
| `20260621000012` | 2026-06-21 | Drop deprecated `admin_stats` table |
| `20260621000013` | 2026-06-21 | Unify `user_profiles`: add `preferences`, `api_settings`, `increment_user_profile()` |
| `20260624000001` | 2026-06-24 | Telemetry tables: `ai_calls`, `analytics_events` |
| `20260705000001` | 2026-07-05 | Forking columns on `mindmaps`, `user_daily_challenges` table |

---

## Appendix B: Application-to-Table Mapping

| Application File | Tables Accessed |
|---|---|
| `src/lib/supabase-db.ts` | `user_settings`, `users`, `mindmaps`, `chat_sessions`, `public_mindmaps`, `admin_activity_log` |
| `src/lib/supabase-server.ts` | `user_settings`, `mindmaps`, `users`, `admin_activity_log` |
| `src/lib/auth-context.tsx` | `users` (is_admin, preferences) |
| `src/contexts/ai-config-context.tsx` | `user_settings` (Realtime subscription) |
| `src/hooks/use-chat-persistence.ts` | `chat_sessions` (Realtime subscription) |
| `src/hooks/use-mind-map-persistence.ts` | `mindmaps` (Realtime subscription) |
| `src/components/mind-map.tsx` | `mindmaps`, `shared_mindmaps`, `public_mindmaps` |
| `src/app/actions.ts` | `ai_calls` (via orchestrate → telemetry) |
| `src/ai/providers/orchestrator.ts` | `ai_calls` (recordTelemetry) |
| `src/app/api/admin/unified/route.ts` | `user_profiles`, `platform_stats`, `user_events`, `ai_calls`, `analytics_events` |
| `src/lib/tracker.ts` | `analytics_events` (via API endpoint) |
| `src/app/actions/community.ts` | `public_mindmaps` |
