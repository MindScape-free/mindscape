# Admin Dashboard — Data Flow

## Overview

The admin dashboard displays user data collected through a three-layer pipeline: raw events → per-user aggregates → global aggregates. Data flows from client-side actions through database triggers, cron-based recompute functions, and a unified API to the UI.

---

## 1. Data Collection

### 1A. `user_events` Table (Immutable Event Log)

Every user action calls `logUserEvent()` / `logUserEventAdmin()` in `src/lib/tracker.ts` which INSERTs a row into `user_events`.

**Tracked events:** `login`, `map_created`, `map_deleted`, `map_viewed`, `map_shared`, `map_exported`, `map_published`, `map_unpublished`, `map_cloned`, `submap_created`, `node_expanded`, `chat_sent`, `image_generated`, `study_time`, `page_viewed`, `search_performed`, `session_end`, `client_error`, `explanation_requested`, `quiz_generated`.

**Schema (`user_events`):**

| Column | Type | Description |
|---|---|---|
| `id` | `bigint PK` | Auto-increment |
| `user_id` | `uuid FK → users(id)` | Who did it |
| `event_type` | `text` | Action type |
| `event_data` | `jsonb` | Arbitrary metadata |
| `source` | `text` | Origin (`canvas`, `home`, `api`, `admin`, `system`) |
| `ip_address` | `text` | IP of request |
| `user_agent` | `text` | Browser UA |
| `session_id` | `text` | Session identifier |
| `created_at` | `timestamptz` | When it happened |

### 1B. DB Triggers (Automatic Fallback)

Three triggers on the `mindmaps` table ensure events are captured even if the application code fails:

| Trigger | When | Effect |
|---|---|---|
| `trg_auto_log_map_created` | AFTER INSERT | Writes `map_created` event with mode, depth, persona, node_count, source_type |
| `trg_auto_log_map_updated` | AFTER UPDATE | Syncs event_data when tracked columns change |
| `trg_auto_log_map_deleted` | BEFORE DELETE | Writes `map_deleted` event with original metadata |

**Migration files:** `20260621000008`, `20260621000009`, `20260621000010`.

### 1C. `users` Table (Real-Time Counters)

`updateUserStatistics()` in `tracker.ts` directly increments JSONB columns on the `users` table:

- `statistics` — `totalMapsCreated`, `totalNestedExpansions`, `totalImagesGenerated`, `totalStudyTimeMinutes`, `totalNodes`, `totalChats`, `lastActiveDate`, `currentStreak`, `longestStreak`
- `activity` — per-day counts of `mapsCreated`, `nestedExpansions`, `imagesGenerated`, `studyTimeMinutes`, `nodesCreated`, `chatsCount`
- `unlocked_achievements` — array of achievement IDs

### 1D. `analytics_events` (Separate Pipeline)

The in-memory `AnalyticsTracker` (client-side singleton in `tracker.ts`) batches page-views, performance metrics, and feature usage every 5s and POSTs to `/api/analytics/track`. This data is **NOT used by the admin dashboard** — it's a separate pipeline.

---

## 2. Data Storage & Aggregation

### 2A. `user_profiles` (Pre-computed Per-User)

**Schema:**

| Column | Type | Description |
|---|---|---|
| `user_id` | `uuid PK FK → users(id)` | |
| `email` | `text` | |
| `display_name` | `text` | |
| `photo_url` | `text` | |
| `created_at` | `timestamptz` | |
| `total_maps` | `int` | Non-sub-map maps created |
| `total_compare_maps` | `int` | Compare-mode maps |
| `total_multi_maps` | `int` | Multi-mode maps |
| `total_chats` | `int` | AI chats |
| `total_nodes` | `int` | Total nodes across all maps |
| `total_images` | `int` | Images generated |
| `total_expansions` | `int` | Node expansions |
| `study_time_minutes` | `int` | Total study time |
| `current_streak` | `int` | Consecutive active days |
| `longest_streak` | `int` | Best streak ever |
| `last_active_date` | `date` | Last day with activity |
| `mode_breakdown` | `jsonb` | `{single, compare, multi}` |
| `depth_breakdown` | `jsonb` | `{low, medium, deep, unspecified}` |
| `source_breakdown` | `jsonb` | `{text, pdf, website, youtube, image, multi}` |
| `persona_breakdown` | `jsonb` | `{Teacher, Concise, Creative, Sage}` |
| `daily_activity` | `jsonb` | `{"YYYY-MM-DD": {mapsCreated, ...}}` |
| `unlocked_achievements` | `text[]` | Achievement IDs |
| `updated_at` | `timestamptz` | |

**Rebuilt by:** `recompute_user_profile(p_user_id uuid)` — scans ALL `user_events` for the user, sums counters, builds breakdown maps, computes streaks from `daily_activity`. Sub-maps are excluded. Deleted maps are subtracted (via `map_deleted` events).

### 2B. `platform_stats` (Single Global Row)

**Schema:**

| Column | Type |
|---|---|
| `id` | `text PK DEFAULT 'global'` |
| `total_users` | `int` |
| `total_maps` | `int` (active, excludes deleted) |
| `total_maps_ever` | `int` (includes deleted) |
| `total_chats` | `int` |
| `total_nodes` | `int` |
| `total_images` | `int` |
| `total_events` | `bigint` |
| `new_users_24h` | `int` |
| `new_maps_24h` | `int` |
| `active_users_24h` | `int` |
| `active_users_7d` | `int` |
| `new_users_7d` | `int` |
| `new_maps_7d` | `int` |
| `health_score` | `int` (0-100) |
| `engagement_rate` | `double precision` |
| `top_persona` | `text` |
| `top_source_type` | `text` |
| `avg_maps_per_user` | `double precision` |
| `avg_nodes_per_map` | `double precision` |
| `daily_snapshot` | `jsonb` (31-day array) |
| `updated_at` | `timestamptz` |

**Rebuilt by:** `recompute_platform_stats()` — scans `user_profiles` for totals, `user_events` for time-windowed counts, computes health score as `min(50, engagementRate/20*50) + min(50, (mapsPerUser/1.5)*50)`.

### 2C. Other Tables Read by Admin

- `mindmaps` — Direct queries for per-user map lists and public/private counts
- `admin_activity_log` — Admin audit trail
- `feedback` — User feedback submissions
- `ai_calls` — AI generation records
- `users` — Identity info (email, display_name, photo_url, created_at)

---

## 3. Cron Jobs (pg_cron)

| Job | Schedule | What it does |
|---|---|---|
| `recompute-active-user-profiles` | Every 5 min | Finds users with events in last 10 min, calls `recompute_user_profile()` per user |
| `recompute-platform-stats` | Every 5 min | Calls `recompute_platform_stats()` |
| `recompute-all-user-profiles` | Every 6 hrs (:15 past) | Calls `recompute_all_user_profiles()` for full recompute of ALL users |

**Migration:** `20260621000002_recompute_cron.sql`

---

## 4. Data Flow Diagram

```
USER ACTION (client)
    │
    ├──► logUserEvent() → user_events table
    │       ▲ also written by DB triggers on mindmaps table
    │
    ├──► updateUserStatistics() → users.statistics / users.activity (JSONB)
    │
    └──► Application code → mindmaps table
            └── triggers fire → user_events (auto-capture)

    ── Cron (every 5 min) ────────────────────
    recompute_user_profile(user_id)
        └──► scans user_events → upserts user_profiles

    recompute_platform_stats()
        └──► scans user_profiles + user_events → upserts platform_stats

    ── Admin Dashboard ──────────────────────
    GET /api/admin/unified?scope=full
        ├── platform_stats → PlatformStats
        ├── user_profiles → UserProfile[] → mapped to legacy users
        ├── user_events → admin log entries
        ├── feedback + ai_calls
        ├── computeMapAnalytics(profiles) → breakdowns
        └── mindmaps → public/private counts

    UI Components:
        DashboardTab  ← metrics.mapAnalytics + platform + stats
        UsersTab      ← profiles list
        UserDetailDialog ← selectedUser + /api/admin/unified?userId=X + mindmaps
        LogsTab       ← events mapped to logs
        AITelemetryTab ← ai_calls
```

---

## 5. API Layer

### Primary: `GET /api/admin/unified?scope=full`

**File:** `src/app/api/admin/unified/route.ts`

Returns everything in one response:

```json
{
  "platform": { /* PlatformStats from platform_stats table */ },
  "profiles": [ /* UserProfile[] → camelCase legacy format */ ],
  "events": [ /* UserEvent[] → log entry format */ ],
  "metrics": {
    "mapAnalytics": { /* modeCounts, depthCounts, sourceCounts, personaCounts, publicPrivate, subMapStats */ },
    "topUsers": [ /* top 10 by maps */ ],
    "latestUsers": [ /* latest 10 by creation */ ]
  },
  "bundles": {
    "feedback": [ /* recent feedback */ ],
    "aiCalls": [ /* recent AI calls */ ]
  },
  "meta": { "cached": false, "source": "unified", "totalProfiles": N, "totalEvents": N }
}
```

### Per-User: `GET /api/admin/unified?userId=<uuid>`

Returns single user profile + recent events. Used by `UserDetailDialog` to get `total_chats`.

### Manual Recompute: `POST /api/admin/recompute`

On-demand trigger for `recompute_all_user_profiles()` and/or `recompute_platform_stats()`.

### Admin Sync: `POST /api/admin-sync`

Rate-limited trigger for `recompute_platform_stats()` (once per 60s).

---

## 6. Client-Side Data Fetching

### `useAdminDashboard()` Hook

**File:** `src/hooks/use-admin-dashboard.ts`

- Uses SWR with key `['/api/admin/unified?scope=full', user.id]`
- Fetches via `fetcherWithAuth()` (Bearer token)
- Deduping interval: 60 seconds
- Returns: `data`, `isLoading`, `isValidating`, `bundle`, `error`, `refreshBundle()`
- `onSuccess` populates `persistentBundle` with users, logs, feedback, aiCalls

### Admin Page Orchestrator

**File:** `src/app/admin/page.tsx`

- Calls `useAdminDashboard()` for all data
- Has real-time subscriptions for `admin_activity_log` and `users` inserts
- Merges live logs with bundle logs
- Processes `dashboardData` into `AdminStats`, `DashboardMetrics`, heatmap days
- Passes data to tab components

---

## 7. UI Components

| Component | File | Data Source | Displays |
|---|---|---|---|
| `DashboardTab` | `src/components/admin/DashboardTab.tsx` | `metrics.mapAnalytics`, `platform`, `stats` | Health score ring, stat cards, 31-day heatmap, all breakdowns (mode/depth/source/persona/public-private), top contributors |
| `UsersTab` | `src/components/admin/UsersTab.tsx` | `profiles` (legacy format) | Searchable/sortable user directory with avatar, name, email, maps count, last active |
| `UserDetailDialog` | `src/components/admin/UserDetailDialog.tsx` | Selected user + `/api/admin/unified?userId=X` + direct `mindmaps` query | Stats grid (10 cards), neural heatmap, achievements, map library table, per-user map analytics |
| `LogsTab` | `src/components/admin/LogsTab.tsx` | `events` mapped to logs | Activity log with category filters |
| `AITelemetryTab` | `src/components/admin/AITelemetryTab.tsx` | `bundles.aiCalls` | AI call history, success/failure rates |

---

## 8. Key Files Reference

| Purpose | File |
|---|---|
| Client tracking & event logging | `src/lib/tracker.ts` |
| Server-side admin client | `src/lib/supabase-server.ts` |
| Admin unified API | `src/app/api/admin/unified/route.ts` |
| Admin stats service | `src/server/admin/admin.service.ts` |
| SWR hook for dashboard | `src/hooks/use-admin-dashboard.ts` |
| Admin page orchestrator | `src/app/admin/page.tsx` |
| Dashboard tab | `src/components/admin/DashboardTab.tsx` |
| Users tab | `src/components/admin/UsersTab.tsx` |
| User detail dialog | `src/components/admin/UserDetailDialog.tsx` |
| Activity log tab | `src/components/admin/LogsTab.tsx` |
| AI telemetry tab | `src/components/admin/AITelemetryTab.tsx` |
| Type definitions | `src/types/admin.ts` |
| Migration: core tables + functions | `supabase/migrations/20260621000001_user_events_tables.sql` |
| Migration: cron jobs | `supabase/migrations/20260621000002_recompute_cron.sql` |
| Migration: mindmap triggers | `supabase/migrations/20260621000008-10_*_trigger.sql` |
| Migration: drop admin_stats | `supabase/migrations/20260621000012_drop_admin_stats.sql` |
