# ADR-002: State Management Architecture — React Contexts, Browser Storage, and the Ref-Refresh Pattern

| Field | Value |
|---|---|
| **Status** | ✅ Accepted (Implemented) |
| **Date** | 2026-06-01 |
| **Author** | Principal Architecture Review Board |
| **Last Reviewed** | 2026-07-12 |
| **Supersedes** | N/A |
| **Superseded By** | N/A |

---

## Context

MindScape manages a wide variety of application state across its client-side architecture:

| State Category | Examples | Lifespan | Consumers |
|---|---|---|---|
| **Auth** | User identity, session tokens, admin flag | Session (persists via Supabase cookies) | All components, hooks, data operations |
| **AI Config** | Provider selection, API keys, model preferences, pollen balance | Persistent across sessions | Chat panel, generation flows, canvas, settings |
| **Mind Map Data** | Node tree, explanations, images, expansions, enrichments | Tab session + server persistence | MindMap component, CanvasClient, chat |
| **Chat Sessions** | Message history, quiz history, weak tags | Persistent across sessions | ChatPanel, session list |
| **Notifications** | Toast-style notifications with read/unread | Persistent across sessions | Navbar badge, notification center |
| **XP & Gamification** | Points, streaks, achievements, level-up state | In-memory + server (not cached client-side) | Toast stack, level-up overlay, navbar |
| **Activity** | Generation status, AI health, task names | Current page session | MindMap, toolbar, generation indicators |
| **Navigation** | URL params (topic, mapId, depth, persona, lang) | URL-based, survives refresh | Canvas routing, page reloads |
| **Preferences** | Explanation mode, collapsed sections, view mode | Persistent across sessions | MindMap accordion state, dialogs |

Each category has different requirements for persistence, cross-component sharing, reactivity, and synchronization latency — necessitating a layered approach rather than a single global store.

---

## Decision Drivers

| Driver | Weight | Description |
|---|---|---|
| **Simplicity** | 🔴 Critical | Avoid third-party dependencies with steep learning curves. The team must be productive immediately. |
| **Server State Ownership** | 🔴 Critical | Auth and data persistence belong to Supabase. Client state is a cache — not the source of truth. |
| **SSR Compatibility** | 🟠 High | Next.js App Router streams React Server Components. State libraries that depend on synchronous browser APIs (e.g., `new Date()` on init) cause hydration mismatches. |
| **Bundle Size** | 🟠 High | MindScape's `/canvas` page already bundles 500+ KB of mind map rendering, markdown parsing, and AI flow code. Adding 10–60 KB for a state library has measurable cost. |
| **Fine-Grained Reactivity** | 🟡 Medium | Avoid unnecessary re-renders of deep component trees when only a leaf changed (e.g., one notification added). |
| **Cross-Tab Sync** | 🟢 Low | Notifications and AI config benefit from sync, but it's not a hard requirement. |
| **Persistence Flexibility** | 🟢 Low | Some state needs localStorage (survive tab close), some needs sessionStorage (survive navigation only), some needs nothing. |

---

## Considered Alternatives

### 1. React Contexts (Chosen)

| Aspect | Assessment |
|---|---|
| **Simplicity** | ✅ Zero dependencies. Each context is <200 LOC. Directly understandable by any React developer. |
| **Server State Ownership** | ✅ Contexts are pure caches of server data. Auth state is hydrated from Supabase on mount. AI config is synced from `user_settings` table via Realtime subscriptions. XP is awarded on every action — not cached. |
| **SSR Compatibility** | ✅ All contexts use `'use client'` and `useState` + `useEffect` for hydration. No SSR mismatches because initial state is `null`/`undefined` and real data loads asynchronously. |
| **Bundle Size** | ✅ 5 contexts total ~15 KB gzipped vs. 15–60 KB for Redux/Zustand/Valtio. |
| **Fine-Grained Reactivity** | ⚠️ Context re-renders all consumers on any state change. Mitigated via: (a) splitting into separate contexts, (b) `React.memo` on leaf components, (c) `useMemo`/`useCallback` on context values, (d) passing stable refs (see Ref-Refresh Pattern below). |
| **Cross-Tab Sync** | ❌ Not built-in. Partially achieved via Supabase Realtime subscriptions (AI config, chat sessions). |
| **Persistence Flexibility** | ⚠️ Each context manages its own persistence strategy. Requires discipline to avoid inconsistency. |

**Bundle savings compared to alternatives:**
- Redux Toolkit: ~12 KB gzipped (~33 KB minified)
- Zustand: ~3 KB gzipped (~5 KB minified) ← closest competitor
- Jotai: ~4 KB gzipped (~7 KB minified)
- Valtio: ~2 KB gzipped (~4 KB minified)

### 2. Zustand

| Aspect | Assessment |
|---|---|
| **Simplicity** | ✅ ~5 KB, simple API, no boilerplate. |
| **Server State Ownership** | ✅ Works well with async updates. |
| **SSR Compatibility** | ✅ `create()` with `persist` middleware handles SSR. |
| **Bundle Size** | ✅ ~3 KB gzipped. |
| **Fine-Grained Reactivity** | ✅ Built-in selector-based subscriptions prevent unnecessary renders. Superior to Context. |
| **Reasons Not Chosen** | 1. **Overlap with React Query**: If the app eventually adopts TanStack Query for server state, a generic store introduces a third paradigm. 2. **Team familiarity**: The existing team was already productive with Contexts + hooks. 3. **Ref-Refresh pattern already solves the stale-closure problem** that Zustand would fix with direct store access. 4. **Minimal re-render benefit**: The largest components (`MindMap`, `ChatPanel`) are already memoized at the top level, and their internal state is primarily local `useState`. |

### 3. Redux Toolkit

| Aspect | Assessment |
|---|---|
| **Simple Setup** | ❌ ~12 KB, `configureStore`, slices, thunks/RTK Query. |
| **Bundle Size** | ❌ ~33 KB minified. Heavy for a cache layer. |
| **When Appropriate** | Apps with 50+ actions, normalized entity stores, undo/redo, or team-wide patterns. MindScape has none of these. |

### 4. Jotai / Valtio

| Aspect | Assessment |
|---|---|
| **Atom granularity** | ✅ Excellent for fine-grained subscriptions. |
| **Bundle Size** | ✅ ~2–4 KB gzipped. |
| **SSR** | ⚠️ Requires careful setup for SSR hydration. |
| **Reasons Not Chosen** | 1. Would require rewriting all contexts. 2. Slightly more complex mental model. 3. Marginal benefit over current architecture given the memoization already in place. |

---

## Decision Outcome

**React Contexts + Custom Hooks** are used for all global application state. Local component state uses `useState` and `useMemo`/`useCallback`. Browser storage is split between `localStorage` (persistent user configuration) and `sessionStorage` (ephemeral session data with optional compression). A **Ref-Refresh Pattern** is adopted to prevent stale closures in streaming and effect-heavy code paths.

---

## Layer 1: React Contexts

### Context Hierarchy

```
AuthProvider                             ← src/lib/auth-context.tsx
  └─ Provides: supabase client, user, session, auth methods, isAdmin
  └─ Syncs with: Supabase Auth (getSession + onAuthStateChange)
  └─ Persists to: Supabase cookies (httpOnly, not accessible via JS)
  │
  └── AIConfigProvider                  ← src/contexts/ai-config-context.tsx
       └─ Provides: config (provider, apiKey, models, balance), updateConfig, resetConfig, refreshBalance
       └─ Syncs with: Supabase user_settings via Realtime subscription
       └─ Persists to: localStorage ("mindscape-ai-config" key)
       │
       ├── NotificationProvider          ← src/contexts/notification-context.tsx
       │    └─ Provides: notifications, addNotification, markAsRead, unreadCount
       │    └─ Persists to: localStorage ("mindscape-notifications" key)
       │    └─ Max: 50 notifications
       │    │
       │    └── ActivityProvider         ← src/contexts/activity-context.tsx
       │         └─ Provides: status (idle|generating|syncing|error), aiHealth, activeTaskName
       │         └─ Lifespan: In-memory only (page session)
       │         │
       │         └── XPProvider          ← src/contexts/xp-context.tsx
       │              └─ Provides: awardXP function
       │              └─ Renders: XPToastStack, LevelUpOverlay
       │              └─ Lifespan: In-memory only (awarded on every action)
```

### Context Design Rules

1. **One concern per context.** Each context manages a single domain. Auth does not know about AI config. Notifications do not know about XP.
2. **No context exports raw setters.** Every context exposes only controlled mutation functions (`updateConfig`, `addNotification`, `awardXP`). Raw `setState` is never exposed.
3. **Default values are safe.** Every context provider has a default that doesn't crash if accessed outside the provider (AuthContext defaults to `null` supabase, `isUserLoading: true`).
4. **Hydration is explicit.** Contexts that load from localStorage (`AIConfig`, `Notification`) have a `hydrated` state that prevents premature writes.
5. **Guard references with React.StrictMode.** The `XPProvider` uses a `processingRef` to guard against double-invocation in development StrictMode.

### Auth Context (`src/lib/auth-context.tsx`)

```
State: user (User | null), session (Session | null), isUserLoading (boolean), isAdmin (boolean)
Init:  On mount → supabase.auth.getSession() + supabase.auth.onAuthStateChange()
Cache: Supabase cookies (server-managed, httpOnly, secure)
Notes: isAdmin is checked via:
         1. NEXT_PUBLIC_ADMIN_USER_IDS env var (fast path)
         2. DB fallback: SELECT is_admin FROM users WHERE id = ?
       Admin status is fetched eagerly on mount and after every auth state change.
```

### AI Config Context (`src/contexts/ai-config-context.tsx`)

```
State: config (AIConfig), pollenBalance (number | null), isBalanceLoading (boolean)
Init:  1. Load from localStorage ("mindscape-ai-config") → setConfig
       2. If user is logged in, fetch from Supabase user_settings (overrides localStorage)
       3. Subscribe to Realtime channel for user_settings
       4. If API key present, call checkPollenBalanceAction() (throttled to 60s)
Sync:  - Updates → localStorage write + in-memory state
       - Remote changes → Supabase Realtime → merge with current → localStorage + in-memory
       - Logout → resetConfig (clears localStorage and state)
Refs:  configRef (synchronized via useEffect for non-stale reads in callbacks)
       isSyncingFromSupabase Ref (prevents echo loop between localStorage ↔ Supabase)
       lastStoredConfigRef (stringified, used to detect changes without deep equality)
Throttle: Balance checks are throttled to once per 60 seconds unless forced
```

### Notification Context (`src/contexts/notification-context.tsx`)

```
State: notifications (Notification[]), hydrated (boolean)
Init:  Deferred (setTimeout 0ms) → load from localStorage → setNotifications → setHydrated
Sync:  After hydration, every notification change triggers localStorage write
Cap:   50 notifications (newest first, old ones trimmed)
Edge:  localStorage may be full or unavailable (private browsing) → silently fail
Date:  Timestamps are serialized as strings, revived via new Date(n.timestamp) on load
```

### Activity Context (`src/contexts/activity-context.tsx`)

```
State: status (MindMapStatus), aiHealth (AIHealthStatus[]), activeTaskName (string | null)
Notes: Pure in-memory state. No persistence needed — it reflects transient generation state.
       Used by MindMap, CanvasClient, and ChatPanel to coordinate loading indicators.
```

### XP Context (`src/contexts/xp-context.tsx`)

```
State: toasts (XPToastItem[]), levelUpData ({ level, rank } | null)
Notes: - awardXP() calls awardPointsAction() server action → receives AwardResult
       - On success → pushes toast + checks for level-up
       - On DAILY_LOGIN event → also calls trackLogin() for streak tracking
       - Uses processingRef to prevent double-fire in React StrictMode
       - Uses processedUserRef to award DAILY_LOGIN exactly once per user session
       - Renders XPToastStack and LevelUpOverlay as portal-like children
```

---

## Layer 2: localStorage vs sessionStorage Split

### localStorage (Persistent — survives tab close, browser restart)

| Key | Type | Consumer | Purpose |
|---|---|---|---|
| `mindscape-ai-config` | `AIConfig` | `AIConfigProvider` | Provider, API keys, model preferences, pollen balance |
| `mindscape-notifications` | `Notification[]` | `NotificationProvider` | Persistent notification history |
| `mindscape_changelog_version` | `string` | `ChangelogDialog` | Last-seen changelog version |
| `mindscape-onboarding-dismissed` | `"true"` | `OnboardingWizard` | Whether user dismissed onboarding |
| `explanationMode` | `"Beginner" | "Intermediate" | "Expert"` | `MindMap` | Preferred explanation depth |

All localStorage operations are wrapped in try/catch — the storage may be full, unavailable in private browsing, or throw during SSR.

### sessionStorage (Ephemeral — survives page navigation, not tab close)

| Key Pattern | Type | Consumer | Purpose |
|---|---|---|---|
| `session-type-{sessionId}` | `string` | `useSessionStorage` | Session type (compare, single, etc.) |
| `session-content-{sessionId}` | `object` | `useSessionStorage` | Session content/data |
| `session-persona-{sessionId}` | `string` | `useSessionStorage` | Session persona override |
| `analytics_session_id` | `string` | `tracker.ts` | Anonymous session fingerprint |
| `analytics_user_id` | `string` | `tracker.ts` | User ID for telemetry |
| `ai-start-{id}` | `number` | `tracker.ts` | AI generation start timestamp (latency) |
| `ms_compressed_*` | `string` | `lib/storage.ts` | Compressed large data (e.g., mind map content) |
| `studio-data-{studioId}` | `string` | `CanvasClient` | Canvas session data |

### Compression Layer (`src/lib/storage.ts`)

Large sessionStorage items (>15 MB threshold) are compressed using `pako` (gzip/deflate):

- **Write**: Serialize → check size against HARD_LIMIT (20 MB) → if >15 MB, gzip + base64 encode → prefix with `ms_compressed_` → `sessionStorage.setItem()`
- **Read**: Check `ms_compressed_` prefix → base64 decode → gunzip → JSON.parse
- **Size tracking**: `getStorageUsage()` reports total usage vs. HARD_LIMIT
- **Bulk cleanup**: `clearStorageWithPrefix(prefix)` removes all items matching a key prefix
- **Hybrid: localStorage-for-small, sessionStorage-for-big**: small items (AI config, preferences) use localStorage directly via `useLocalStorage` hook. Large items (mind map JSON blobs, session content) use sessionStorage via `lib/storage.ts`. This separation prevents localStorage quota exhaustion from large session data.

### `useLocalStorage` Hook (`src/hooks/use-local-storage.ts`)

A generic hook for reading/writing typed values to localStorage:

```typescript
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void]
```

- SSR-safe: returns `initialValue` on server, reads from localStorage on client
- Write: `setValue()` updates both React state and localStorage atomically
- Memoized: `setValue` is wrapped in `useCallback` to prevent infinite loops in dependency arrays
- Error handling: reads/writes are wrapped in try/catch with console warnings

### `useSessionStorage` Hook (`src/hooks/use-session-storage.ts`)

A simpler hook for session storage with typed get/set/clear operations:

```typescript
function useSessionStorage(): {
  isLoading: boolean;
  getSessionData: <T>(sessionId: string) => { type: string; content: T; persona: string } | null;
  clearSession: (sessionId: string) => void;
  setSessionData: <T>(sessionId: string, type: string, content: T, persona?: string) => void;
}
```

---

## Layer 3: The Ref-Refresh Pattern

### Problem

React's functional component model captures variables in closures. When a callback (e.g., `useCallback`, `useEffect`, `setTimeout`) references a state variable, it "closes over" the value at the time the callback was created. If the state changes later, the callback still holds the old value.

This is especially problematic in streaming chat, where:
1. A `setTimeout` or streaming callback references `sessions`, `activeSessionId`, or `mindMapData`
2. By the time the timeout fires (even 100ms later), these values have changed
3. The callback operates on stale data — causing duplicate messages, incorrect IDs, or lost updates

### Pattern

The pattern is:

1. Declare a `useRef<T>` initialized with the current state value
2. Sync it in a `useEffect` after every render: `useEffect(() => { ref.current = value; }, [value]);`
3. Read `ref.current` inside callbacks instead of the closure-captured `value`

### Code Example

```typescript
// Instead of:
const latestSessionsRef = useRef(sessions);      // ❌ Only initial value
// ...
useEffect(() => {
  // This closure captures `sessions` at creation time
  setTimeout(() => {
    process(sessions); // Stale!
  }, 100);
}, []);

// Do this:
const latestSessionsRef = useRef(sessions);
useEffect(() => { latestSessionsRef.current = sessions; }, [sessions]);

// Now inside any callback:
setTimeout(() => {
  process(latestSessionsRef.current); // Always the latest value
}, 100);
```

### Usage Across the Codebase

| File | Refs | Purpose |
|---|---|---|
| `chat-panel.tsx` | `latestSessionsRef`, `latestActiveSessionIdRef`, `latestTopicRef`, `latestMindMapDataRef`, `latestUsePdfContextRef`, `latestProviderOptionsRef`, `latestStreamTextRef` | Ensure streaming callbacks and setTimeout handlers always read the latest chat state |
| `ai-config-context.tsx` | `configRef`, `lastStoredConfigRef`, `isRefreshingRef`, `lastRefreshRef` | Prevent stale config reads in `refreshBalance`; detect storage changes without deep equality |
| `mind-map.tsx` | `enrichmentInFlightRef`, `lastSyncedImagesRef`, `lastSyncedExpansionsRef`, `hasAutoSummarizedRef`, `subTopicsRef`, `handleLanguageChangeRef` | Prevent duplicate enrichment requests; detect meaningful data changes; allow quiz-deepen to read latest subTopics |
| `CanvasClient.tsx` | `handleUpdateRef`, `mindMapsRef`, `lastFetchedParamsRef`, `sourceContextRefs`, `mindMapRef` | Wire imperative refs between canvas and mind map; prevent duplicate fetches |
| `xp-context.tsx` | `toastIdRef`, `processedUserRef`, `processingRef` | Deduplicate toasts, guard against StrictMode double-fire |
| `use-mind-map-persistence.ts` | `isSavingRef`, `saveQueueRef`, `generatingThumbnailsRef`, `lastActivityRef` | Debounce saves, queue pending saves, throttle thumbnail generation |
| `use-chat-persistence.ts` | `userRef`, `debounceTimerRef` | Ensure `saveSession` always reads the current user; debounce by 1s |
| `mind-map-tree-view.tsx` | `zoomTimerRef`, `zoomRef`, `offsetRef`, `nodesRef`, `wheelDebounceRef` | Smooth zoom/pan without stale transforms |

### Variations

1. **Forward ref**: Functions are stored in a ref and exposed to children via prop (type `React.MutableRefObject<...>`) — used in `MindMapProps.onQuizDeepenRef` and `zoomToNodeRef`
2. **Guard ref**: A boolean ref (`processingRef`, `isSavingRef`) that prevents concurrent async operations — used in XP context and mind map persistence
3. **Stringified comparison**: `lastStoredConfigRef` stores `JSON.stringify(config)` to detect changes without deep equality checks — used in AI config context to prevent re-sync loops
4. **In-flight tracking**: `enrichmentInFlightRef` (a `Set<string>`) prevents duplicate API calls for the same enrichment target

### Trade-off

| Pro | Con |
|---|---|
| ✅ Solves stale closures without adding state management libraries | ❌ Verbose — requires 2–3 extra lines per variable |
| ✅ No re-renders from ref writes (unlike state) | ❌ Easy to forget the `useEffect` sync, creating bugs |
| ✅ Works with any async pattern (timeout, stream, interval) | ❌ TypeScript doesn't warn when you capture state directly in a closure |
| ✅ Can hold mutable state (sets, maps, counters) without `useState` | ❌ Mental model cost — new team members may misuse refs vs. state |

---

## Layer 4: URL-Based State

URL search parameters are used as the **source of truth for navigation state** on the `/canvas` page:

| Parameter | Purpose | Managed By |
|---|---|---|
| `topic` | Topic to generate map for | `useMindMapRouter` |
| `topic1`, `topic2` | Compare mode topics | `useMindMapRouter` |
| `mapId` | Load existing map from DB | `useMindMapRouter` |
| `depth` | low / medium / deep | `useMindMapRouter` |
| `persona` | Teacher / Concise / Creative / Sage | `useMindMapRouter` |
| `lang` | Language code (default: en) | `useMindMapRouter` |
| `_r` | Regeneration trigger (timestamp) | `useMindMapRouter` |
| `mode` | Generation mode | `useMindMapRouter` |
| `selfReference` | Prevent self-referencing loops | `useMindMapRouter` |

The `useMindMapRouter` hook reads these via `useSearchParams()` and provides:
- `params` — memoized, normalized parameters (sanitizes legacy depth values like `quick` → `low`)
- `navigateToMap(id)` — sets `mapId` param without re-triggering generation
- `regenerate()` — sets `_r={Date.now()}` to force regeneration
- `clearRegenFlag()` — removes `_r` after regeneration completes

URL params survive page refresh, which is essential for deep-linking to specific maps.

---

## Layer 5: Supabase Realtime for Cross-Tab Sync

Two contexts use Supabase Realtime to synchronize state across browser tabs, and `useMindMapPersistence` subscribes to per-map channels for live updates:

### AI Config Realtime

```typescript
const channel = supabase
  .channel(`public:user_settings:user_id=eq.${user.id}`)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'user_settings', filter: `user_id=eq.${user.id}` }, (payload) => {
    // merge payload.new into local config
  })
  .subscribe();
```

### Chat Sessions Realtime

```typescript
const channel = supabase
  .channel(`chat-sessions-${user.id}`)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_sessions', filter: `user_id=eq.${user.id}` }, () => {
    // re-fetch all sessions
  })
  .subscribe();
```

When a config is updated in one tab (e.g., the user changes their API key in settings), the change propagates to all other open tabs within seconds. This avoids the need for a localStorage `storage` event listener (which doesn't fire across tabs in all browsers).

### Mind Map Realtime (`src/hooks/use-mind-map-persistence.ts`)

```typescript
const channel = supabase
  .channel(`mindmap-${mapId}`)
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mindmaps', filter: `id=eq.${mapId}` }, (payload) => {
    // Compare remote updated_at vs local updated_at (1s tolerance)
    // If remote is newer, call onRemoteUpdateRef.current()
  })
  .subscribe();
```

This channel provides live synchronization of mind map edits across tabs. It uses a **1-second timestamp tolerance** to suppress same-save echoes (Bug #11 mitigation): only updates with `remote_updated_at > local_updated_at + 1000ms` trigger a re-render.

---

## Context Provider Nesting (in `layout.tsx`)

```jsx
<AuthProvider>
  <AIConfigProvider>
    <PollinationsAuthHandler />
    <OnboardingWizard />
    <NotificationProvider>
      <ActivityProvider>
        <XPProvider>
          <TooltipProvider>
            <PerformanceMonitor>
              <BackgroundGlow />
              <Navbar />
              <main>{children}</main>
              <Toaster />
              <ChangelogDialog />
            </PerformanceMonitor>
          </TooltipProvider>
        </XPProvider>
      </ActivityProvider>
    </NotificationProvider>
  </AIConfigProvider>
</AuthProvider>
```

Notable nesting decisions:
- `XPProvider` is inside `ActivityProvider` and `NotificationProvider` because it renders `XPToastStack` and `LevelUpOverlay` as children — giving them access to all ancestor contexts
- `PollinationsAuthHandler` and `OnboardingWizard` sit inside `AIConfigProvider` because they need access to auth state and config
- `TooltipProvider` wraps the main content areas for Radix UI tooltip support
- `PerformanceMonitor` is the outermost wrapper inside the main content tree — it measures render performance without affecting app state

---

## Summary: Decision Matrix

| Decision | Chosen Approach | Key Rationale |
|---|---|---|
| Global state library | None (React Contexts) | Simplicity, zero dependencies, SSR-safe, sufficient for 5 small contexts |
| Client persistence | localStorage + sessionStorage | localStorage for config/preferences (survives tab close), sessionStorage for ephemeral data (survives nav only) |
| Large data compression | pako gzip via `lib/storage.ts` | 15 MB soft limit, 20 MB hard limit, auto-compress above threshold |
| Storage utility | `useLocalStorage` hook + `lib/storage.ts` | SSR-safe, typed, error-tolerant |
| Stale closure prevention | Ref-Refresh Pattern | useRef + useEffect sync, read ref.current in callbacks |
| Cross-tab sync | Supabase Realtime | No additional infrastructure, reuses existing Supabase connection |
| Navigation state | URL search params via `useMindMapRouter` | Survives refresh, enables deep linking, SSR-compatible |
| Component memoization | React.memo + useMemo + useCallback | Prevents unnecessary re-renders in large component trees |
| State shape | Explicit, not normalized | No normalized entity store needed — each domain has its own shape |

---

## References

| File | Role |
|---|---|
| `src/lib/auth-context.tsx` | Auth state: Supabase session, admin check |
| `src/contexts/ai-config-context.tsx` | AI config: provider, keys, models, balance, Realtime sync |
| `src/contexts/notification-context.tsx` | Notifications: localStorage-persisted with hydration |
| `src/contexts/activity-context.tsx` | Activity: transient generation state |
| `src/contexts/xp-context.tsx` | XP/gamification: toast stack, level-up overlay |
| `src/hooks/use-local-storage.ts` | Generic localStorage hook (SSR-safe) |
| `src/hooks/use-session-storage.ts` | Session storage accessor hook |
| `src/lib/storage.ts` | Compression utilities (pako), storage limits, bulk cleanup |
| `src/hooks/use-mind-map-persistence.ts` | Persistence coordination, save queue, thumbnail generation |
| `src/hooks/use-chat-persistence.ts` | Chat session CRUD, Realtime subscription |
| `src/components/chat-panel.tsx` | Heavy ref-refresh usage for streaming chat |
| `src/components/mind-map.tsx` | Ref pattern for enrichments, images, explorer syncing |
| `src/hooks/use-mind-map-router.ts` | URL param management |
| `src/hooks/use-mind-map-stack.ts` | Stack-based mind map navigation (breadcrumb model) |
| `src/app/layout.tsx` | Context provider nesting |
| `docs/ARCHITECTURE.md` | System architecture overview |

---

## Changelog

| Date | Change |
|---|---|
| 2026-06-01 | Initial ADR created |
| 2026-07-12 | Expanded with detailed context provider analysis, compression thresholds, Realtime sync detail, and full ref-pattern catalog |
