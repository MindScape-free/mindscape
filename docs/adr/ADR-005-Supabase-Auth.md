# ADR-005: Authentication & Authorization — Supabase Auth + Application-Layer Access Control

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

MindScape requires authentication and authorization for:

1. **User Identification** — Associate mind maps, chat sessions, and settings with a specific user
2. **API Key Management** — Each user brings their own Pollinations API key (BYOP)
3. **Admin Operations** — Admin dashboard, user management, and system telemetry
4. **Public Content** — Community-published mind maps accessible without auth
5. **Gamification** — Track streaks, XP, and achievements per user
6. **Data Isolation** — Users should only access their own data (maps, chats, settings)

The auth system must work within a Next.js 16 App Router architecture with Server Actions, API routes, middleware, and React Server Components — each with different auth requirements.

---

## Decision Drivers

| Driver | Weight | Description |
|---|---|---|
| **Zero Infrastructure** | 🔴 Critical | Must use Supabase's built-in auth. No custom auth servers, no separate database for sessions. |
| **SSR Compatibility** | 🔴 Critical | Must work with Next.js App Router streaming, Server Actions, and React Server Components. Requires cookie-based session management via `@supabase/ssr`. |
| **Minimal Friction** | 🟠 High | Anonymous users should be able to generate mind maps without signing in. Auth is only required for saving, publishing, and persistent settings. |
| **Admin Security** | 🔴 Critical | Admin API routes must be protected against unauthorized access. A compromised anon key must not expose admin capabilities. |
| **Service Role Access** | 🟠 High | Server-side code (AI generation, telemetry) needs privileged database access that bypasses RLS. |
| **Realtime Sync** | 🟡 Medium | Auth state must integrate with Supabase Realtime for cross-tab sync of AI config and chat sessions. |
| **OAuth Support** | 🟡 Medium | Google OAuth for simplified sign-in alongside email/password. |

---

## Considered Alternatives

### 1. Supabase Auth + Application-Layer Access Control (Chosen)

| Aspect | Assessment |
|---|---|
| **Infrastructure** | ✅ Zero additional infrastructure. Supabase provides auth, session management, and OAuth out of the box. |
| **SSR** | ✅ `@supabase/ssr` package handles cookie-based session management for Next.js App Router. |
| **Anonymous Access** | ✅ Anonymous users can use the app; auth is required only for persistence. UX is handled via conditional UI. |
| **Admin Security** | ✅ Two-tier admin check (env var + DB column). All admin API routes verify Bearer tokens. |
| **Service Role** | ✅ `getSupabaseAdmin()` creates a service-role client that bypasses RLS. Used only in server-side code (Server Actions, API routes). |
| **RLS** | ⚠️ Minimal RLS usage. Most tables rely on application-layer auth (token verification in API routes) rather than database-level policies. |
| **Verdict** | Pragmatic approach for a small team. RLS is used where it adds value; application-layer auth is used where it's simpler. |

### 2. Full RLS-Only Authorization

| Aspect | Assessment |
|---|---|
| **Security Model** | ✅ Every query is scoped at the database level. No way to bypass RLS from client-side code. |
| **Complexity** | ❌ Requires policies for every table, every operation, and every join. Error messages are cryptic. Debugging is difficult. |
| **Service Role** | ❌ Server Actions would still need service role for privileged ops, defeating the purpose of RLS-only. |
| **Admin Access** | ⚠️ Admin users need special RLS policies or a separate admin schema. |
| **Verdict** | Over-engineered for a consumer app where most data access goes through Server Actions (which use service role anyway). |

### 3. Third-Party Auth (Clerk, Auth0)

| Aspect | Assessment |
|---|---|
| **Features** | ✅ Mature auth solutions with rich features (MFA, organizations, webhooks). |
| **Cost** | ❌ $25–$100/mo for production usage. Clerk's free tier is limited. |
| **Integration** | ⚠️ Requires custom integration with Supabase for DB-level user IDs. Adds middleware, webhooks, and sync logic. |
| **RLS Compatibility** | ⚠️ Clerk uses its own user IDs; mapping to Supabase `auth.users` adds complexity. |
| **Verdict** | Unnecessary for current scale. Can migrate later if enterprise features are needed. |

### 4. NextAuth.js (Auth.js)

| Aspect | Assessment |
|---|---|
| **SSR** | ✅ Native Next.js integration with App Router. |
| **Database** | ⚠️ Requires a separate database adapter or table for sessions. Adds schema complexity. |
| **Supabase** | ⚠️ Not natively integrated with Supabase Auth. Would need Supabase adapter or custom JWT handling. |
| **OAuth** | ✅ Supports 80+ providers. |
| **Verdict** | Good option but adds another service to manage. Supabase Auth already covers the use cases and avoids splitting auth across two systems. |

---

## Decision Outcome

**Supabase Auth** for authentication, with a **hybrid authorization model**: RLS for user-scoped data (visible through the Data API), service role for Server Actions and AI operations, and application-layer Bearer token verification for admin API routes.

---

## Architecture

### Auth Client Hierarchy

```
@supabase/ssr
  ├─ createBrowserClient()        ← src/lib/client.ts
  │    └─ Used by: AuthProvider (React Context)
  │    └─ Key: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (anon key)
  │    └─ Session: Managed by Supabase (httpOnly cookies)
  │
  ├─ createServerClient()         ← src/middleware.ts
  │    └─ Used by: Next.js Middleware
  │    └─ Key: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (anon key)
  │    └─ Session: Reads/writes cookies via request/response
  │
  └─ createServerClient()         ← @supabase/ssr in Server Components
       └─ Used by: Server Actions (implicitly via getUser)

supabase-js (service role)
  └─ createClient()               ← src/lib/supabase-server.ts
       └─ Used by: Server Actions, Admin APIs, Cron Jobs
       └─ Key: SUPABASE_SERVICE_ROLE_KEY (bypasses RLS)
       └─ Session: None (persistSession: false)
```

### Data Access Paths

```
Client-Side (Browser)
  anon key → RLS policies → Database
  ❌ Cannot read other users' data (if RLS is configured)
  ❌ Cannot write to user_events, ai_calls, analytics_events
  ✅ Can read/write own user_settings, chat_sessions, feedback

Server Actions (Next.js)
  service role → bypasses RLS → Database
  ✅ Full read/write access to all tables
  ✅ Used for AI generation, mind map CRUD, event logging
  ⚠️ Must be careful not to expose service role to client

Admin API Routes (/api/admin/*)
  Bearer token → supabase.auth.getUser(token) → isUserAdminServer()
    → service role → Database
  ✅ Two gate checks: valid token + admin status
  ✅ Full read/write access to admin-only tables

Realtime Subscriptions
  anon key + RLS → Database
  ✅ user_settings (user-scoped)
  ✅ chat_sessions (user-scoped)
  ✅ mindmaps (owner-scoped)
```

---

## Layer 1: Client-Side Auth (`src/lib/auth-context.tsx`)

### Provider Pattern

The `AuthProvider` wraps the entire application at the root layout level:

```jsx
<AuthProvider>
  <AIConfigProvider>
    {children}
  </AIConfigProvider>
</AuthProvider>
```

### Initialization Flow

```
App Mount
  ↓
createClient()                          ← Creates Supabase client with anon key
  ↓
useEffect (mount):
  1. supabase.auth.getSession()         ← Restore existing session from cookies
     ↓
     if session exists:
       setUser({ id, email, displayName, photoURL })
       checkAdminStatus(userId):
         a. NEXT_PUBLIC_ADMIN_USER_IDS.includes(userId)  ← Fast path (env var)
         b. SELECT is_admin FROM users WHERE id = userId ← Slow path (DB)
       setIsAdmin(result)
     setIsUserLoading(false)
  
  2. supabase.auth.onAuthStateChange()  ← Subscribe to future auth events
     ↓
     on sign-in:   setUser() + checkAdminStatus()
     on sign-out:  setUser(null) + setIsAdmin(false)
```

### Key Design Decisions

- **`useState` for supabase client**: `const [supabase] = useState(() => createClient())` creates the client once without causing re-renders. The `useState` initializer function pattern ensures it's only called on mount, not on every render.
- **`cancelled` flag**: Prevents state updates after component unmount (strict mode, fast navigation).
- **Dual admin check**: Environment variable is checked first (fast, no DB read). DB column is checked second (auditable, can be managed via Supabase dashboard).
- **Default context values**: AuthContext defaults are `null` supabase, `isUserLoading: true` — components checking auth state can always render safely.

### Auth Methods

| Method | Provider | Flow |
|---|---|---|
| `signIn(email, password)` | Email/Password | `supabase.auth.signInWithPassword()` |
| `signUp(email, password, username?)` | Email/Password | `supabase.auth.signUp()` with username in `user_metadata` |
| `signInWithGoogle()` | Google OAuth | `supabase.auth.signInWithOAuth()` with redirect to `/auth/callback` |
| `signOut()` | — | `supabase.auth.signOut()` — clears cookies |
| `resetPassword(email)` | Email | `supabase.auth.resetPasswordForEmail()` with redirect to `/auth/reset-password` |

---

## Layer 2: Middleware (`src/middleware.ts`)

The Next.js middleware runs on every request to:

1. **Protect API routes** — Return 401 for unauthenticated requests to `/api/chat`, `/api/admin`, etc.
2. **Protect admin pages** — Redirect `/admin/*` to `/login` if not authenticated
3. **Refresh sessions** — Cookie-based session refresh via `@supabase/ssr`

### Route Protection Matrix

| Route | Auth Required | Auth Method | Response on Failure |
|---|---|---|---|
| `/` (Home) | ❌ | — | — |
| `/login`, `/signup` | ❌ | — | — |
| `/auth/callback` | ❌ | — | — |
| `/canvas` | ❌ | — | Generates maps without saving |
| `/admin` | ✅ | Cookie session | Redirect to `/login` |
| `/profile` | ✅ | Cookie session | Redirect to `/login` |
| `/api/chat/*` | ✅ | Cookie + Bearer fallback | 401 JSON |
| `/api/admin/*` | ✅ | Cookie + Bearer fallback | 401 JSON |
| `/api/stats/public` | ❌ | — | — |
| `/api/generate-image` | ✅ | Cookie + Bearer fallback | 401 JSON |
| Static files | ❌ | — | — |

### Middleware Session Refresh Pattern

```typescript
const supabase = createServerClient(supabaseUrl, supabaseKey, {
  cookies: {
    getAll() {
      return request.cookies.getAll()        // Read cookies from incoming request
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value }) =>
        request.cookies.set(name, value)     // Set on request (for subsequent reads)
      )
      supabaseResponse = NextResponse.next({ request })
      cookiesToSet.forEach(({ name, value, options }) =>
        supabaseResponse.cookies.set(name, value, options)  // Set on response (for browser)
      )
    },
  },
})

const { data: { user } } = await supabase.auth.getUser()
// → If session expired, @supabase/ssr automatically refreshes via cookie setAll
// → If refresh fails, user is null
```

### Bearer Token Fallback for Streaming APIs

The middleware has an additional fallback for API routes that use Bearer tokens (like `/api/chat/stream`):

```typescript
const authHeader = request.headers.get('Authorization')
if (authHeader?.startsWith('Bearer ')) {
  const token = authHeader.substring(7)
  const { data: { user } } = await supabase.auth.getUser(token)
  if (user) return supabaseResponse
}
```

This allows streaming API routes to authenticate via access tokens when cookie-based auth is not available (e.g., EventSource connections).

---

## Layer 3: Admin Authorization

### Two-Tier Admin Check

```typescript
// src/lib/supabase-server.ts
export async function isUserAdminServer(userId: string): Promise<boolean> {
  // 1. Check Env Variable (Master override — fast path)
  const adminIds = process.env.NEXT_PUBLIC_ADMIN_USER_IDS?.split(',').map(s => s.trim()).filter(Boolean) || []
  if (adminIds.includes(userId)) return true

  // 2. Check Database column (auditable — can be managed via Supabase dashboard)
  const { data } = await supabase.from('users').select('is_admin').eq('id', userId).single()
  return data?.is_admin === true
}
```

### API Route Protection Pattern

Every `/api/admin/*` route uses a consistent pattern:

```typescript
async function verifyAdmin(request: Request): Promise<{ authorized: boolean; uid?: string; error?: string }> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return { authorized: false, error: 'Missing Authorization header' }

  const idToken = authHeader.substring(7)
  const supabase = getSupabaseAdmin()
  const { data: { user }, error: authError } = await supabase.auth.getUser(idToken)

  if (authError || !user) return { authorized: false, error: authError?.message || 'Token verification failed' }

  const isAdmin = await isUserAdminServer(user.id)
  if (!isAdmin) return { authorized: false, uid: user.id, error: 'Unauthorized: Not an admin' }

  return { authorized: true, uid: user.id }
}
```

This pattern is used in:
- `src/app/api/admin/debug/route.ts`
- `src/app/api/admin/unified/route.ts`
- `src/app/api/admin/stats/route.ts`
- `src/app/api/admin/dashboard/route.ts`
- `src/app/api/admin/recompute/route.ts`
- `src/app/api/admin-sync/route.ts`

---

## Layer 4: Service Role Access (`src/lib/supabase-server.ts`)

### Cached Singleton Pattern

```typescript
let cachedAdmin: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (cachedAdmin) return cachedAdmin                     // ← Singleton: avoid multiple connections
  const { supabaseUrl, supabaseServiceRoleKey, supabaseAnonKey } = getEnv()
  const key = supabaseServiceRoleKey || supabaseAnonKey    // ← Graceful fallback: anon key if no service role
  cachedAdmin = createClient(supabaseUrl, key, {
    auth: { persistSession: false },                       // ← No session management for server
  })
  return cachedAdmin
}
```

### Where Service Role Is Used

| Operation | Code Path | Tables Accessed |
|---|---|---|
| AI generation & telemetry | `src/ai/providers/orchestrator.ts` | `ai_calls` |
| API key resolution | `src/app/actions.ts` — `resolveApiKey()` | `user_settings` |
| Map fetching (admin) | `src/lib/supabase-server.ts` — `getMindMapAdmin()` | `mindmaps` |
| Admin activity logging | `src/app/actions.ts` — `logAdminActivityAction()` | `admin_activity_log` |
| Points/awards | `src/lib/points-engine.ts` | `user_profiles` |
| Community operations | `src/app/actions/community.ts` | `public_mindmaps` |
| Feedback operations | `src/app/actions/feedback.ts` | `feedback` |
| Public stats | `src/app/api/stats/public/route.ts` | `platform_stats` |
| Analytics tracking | `src/lib/tracker.ts` | `analytics_events` |
| Admin sync | `src/app/api/admin-sync/route.ts` | `user_profiles`, `platform_stats`, `user_events` |

---

## Layer 5: Row Level Security (RLS)

### RLS Strategy

MindScape uses a **selective RLS approach**: policies exist on all tables but most are intentionally permissive (`USING (true)`), relying on application-layer auth for access control. This is a deliberate trade-off:

| Approach | When Used | Rationale |
|---|---|---|
| `USING (true)` — permissive | Most tables: `user_events`, `user_profiles`, `platform_stats`, `ai_calls`, `analytics_events` | These tables are only accessed via service role (server-side). RLS is enabled for defense-in-depth, but the real access control happens in code. |
| `auth.uid() = user_id` — user-scoped | `user_daily_challenges` | This table is queried from client-side code. RLS prevents users from seeing/modifying other users' challenges. |
| No RLS | `mindmaps`, `chat_sessions`, `public_mindmaps` | Accessed from both client and server. Server Actions use service role (bypasses RLS). Client-side reads for own data are scoped by application code (`eq('user_id', userId)` filters in `supabase-db.ts`). |

### Complete RLS Policy Inventory

| Table | Policy Name | Operation | Check | Notes |
|---|---|---|---|---|
| `user_events` | Admins can read user_events | SELECT | `true` | Auth via token verification |
| `user_events` | Service role can insert | INSERT | `true` (WITH CHECK) | Service role bypasses RLS |
| `user_profiles` | Admins can read user_profiles | SELECT | `true` | Auth via token verification |
| `user_profiles` | Service role can upsert | ALL | `true` (USING + CHECK) | Service role bypasses RLS |
| `platform_stats` | Admins can read platform_stats | SELECT | `true` | Auth via token verification |
| `platform_stats` | Service role can upsert | ALL | `true` (USING + CHECK) | Service role bypasses RLS |
| `ai_calls` | service_role_all | ALL | `true` | Service role only — no user access |
| `analytics_events` | service_role_all | ALL | `true` | Service role only — no user access |
| `user_daily_challenges` | Users can view their own | SELECT | `auth.uid() = user_id` | User-scoped |
| `user_daily_challenges` | Users can insert their own | INSERT | `auth.uid() = user_id` (WITH CHECK) | User-scoped |

### Why Not Full RLS?

The decision to minimize RLS is based on the project's architecture:

1. **Most data access goes through Server Actions** — Server Actions use the service role client, which bypasses RLS anyway. RLS policies would never be evaluated for the majority of database operations.
2. **Admin operations use service role** — Admin APIs need to read all users' data. RLS policies would need complex admin-detection logic or an admin role.
3. **Client-side access is minimal** — Client-side code only directly queries `user_settings`, `chat_sessions`, `feedback`, and `public_mindmaps`. Application code already scopes these by `user_id`.
4. **Complex RLS is hard to debug** — Supabase RLS errors return generic 401/403 responses. Application-layer auth errors include descriptive messages.

---

## Layer 6: Environment Configuration

### Auth-Related Environment Variables

| Variable | Purpose | Used By |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `client.ts`, `middleware.ts`, `supabase-server.ts` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Anon key (public, safe for client) | `client.ts`, `middleware.ts` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (secret, server-only) | `supabase-server.ts` |
| `NEXT_PUBLIC_ADMIN_USER_IDS` | Comma-separated admin user IDs (master override) | `auth-context.tsx`, `supabase-server.ts` |
| `NEXT_PUBLIC_APP_URL` | Application URL (for OAuth redirects) | `auth-context.tsx` |

### Configuration from `supabase/config.toml`

```
[auth]
enabled = true
site_url = "http://127.0.0.1:3000"
jwt_expiry = 3600              # 1 hour
enable_refresh_token_rotation = true
refresh_token_reuse_interval = 10  # seconds
enable_signup = true
enable_anonymous_sign_ins = false
minimum_password_length = 6

[auth.email]
enable_signup = true
enable_confirmations = false     # No email confirmation required
otp_length = 6
otp_expiry = 3600

[auth.rate_limit]
email_sent = 2                  # Per hour
sign_in_sign_ups = 30            # Per 5 minutes per IP
token_refresh = 150              # Per 5 minutes per IP
```

---

## Edge Cases & Failure Scenarios

| Scenario | Behavior | Rationale |
|---|---|---|
| **Session expires during AI generation** (10–30s) | Middleware refreshes session via `@supabase/ssr` cookie rotation. If refresh fails, generation still completes (it uses service role which doesn't depend on user session). | AI generation is long-lived; session expiry is handled separately. |
| **User logs out while on canvas page** | Auth state resets to null. Components check `isUserLoading` and `user` to conditionally render. The mind map remains in-memory but cannot be saved. | Auth is orthogonal to in-memory state. |
| **Service role key is not set** | `getSupabaseAdmin()` falls back to anon key (`supabaseServiceRoleKey || supabaseAnonKey`). Admin operations will fail with permission errors. | Graceful degradation for local development. |
| **OAuth callback race condition** | Auth callback page at `/auth/callback` redirects to home. The `onAuthStateChange` listener in `AuthProvider` picks up the new session. | No client-side token handling needed — Supabase handles it via cookies. |
| **Multiple browser tabs** | Each tab has independent auth state via React Context. Realtime subscriptions keep data in sync (AI config, chat sessions). | Cookies are shared across tabs; Supabase session is the same. |
| **Middleware cold start** | First request after deployment creates a fresh `createServerClient`. Cookie refresh may fail if refresh token is stale. User sees 401 and retries. | Serverless cold starts are a known limitation; retry is safe. |
| **Admin token expires** | Admin API routes verify Bearer token via `supabase.auth.getUser(token)`. If expired, returns 403. Client is expected to refresh the access token and retry. | Standard JWT expiry handling. |
| **Anonymous user saves a map** | Not possible — save operations require `user.id`. Anonymous users are prompted to sign in. | Core constraint: persistence requires auth. |
| **Concurrent admin token verification** | Every `/api/admin/*` request independently verifies the token with `supabase.auth.getUser()`. No caching of token validity (5–15ms overhead per request). | Acceptable overhead for admin operations (not user-facing). |
| **CORS for auth operations** | Not applicable — all auth flows are same-origin (Next.js handles both client and API). | No CORS configuration needed. |

---

## Auth Flow Diagrams

### Login Flow

```
User clicks "Sign In"
  ↓
/login page
  ↓
auth-form.tsx → signIn(email, password)
  ↓
supabase.auth.signInWithPassword({ email, password })
  ↓
Supabase validates credentials, sets httpOnly cookies
  ↓
onAuthStateChange fires in AuthProvider
  ↓
setUser({ id, email, displayName, ...
checkAdminStatus(userId)
  ├─ Check NEXT_PUBLIC_ADMIN_USER_IDS → fast path
  └─ SELECT is_admin FROM users → slow path
setIsAdmin(result)
setIsUserLoading(false)
  ↓
React re-renders → Navbar shows user info
router.push(redirect || '/')
```

### Google OAuth Flow

```
User clicks "Sign in with Google"
  ↓
signInWithGoogle() in auth-context.tsx
  ↓
supabase.auth.signInWithOAuth({ provider: 'google' })
  ↓
Redirect to Google consent screen
  ↓
User authorizes → Redirect to /auth/callback?code=...
  ↓
Next.js middleware passes through (public route)
  ↓
/auth/callback page mounts
  ↓
Supabase handles code exchange via URL hash
onAuthStateChange fires with session
  ↓
Same as login flow above
```

### Server Action Auth Flow

```
Client calls serverAction()
  ↓
Server Action runs with service role client
  ↓
No user session check at this layer
  ↓
Operates on database via service role (bypasses RLS)
  ↓
Returns response to client
```

### Admin API Auth Flow

```
Client sends GET /api/admin/unified
  Headers: { Authorization: Bearer <access_token> }
  ↓
Next.js Middleware:
  ├─ Checks cookie session (supabase.auth.getUser())
  ├─ Falls back to Bearer token verification
  └─ Returns 401 if both fail
  ↓
API Route handler:
  1. Extract Bearer token from Authorization header
  2. supabase.auth.getUser(token) → verify token is valid
  3. isUserAdminServer(user.id) → check admin status
  4. Return 403 if not admin
  5. Proceed with service role operations
```

---

## Comparison: Chosen Approach vs Alternatives

| Aspect | Supabase Auth + App-Layer | Full RLS | Third-Party (Clerk/Auth0) |
|---|---|---|---|
| **Setup complexity** | Low (built into Supabase) | Medium (policies per table) | High (integration + webhooks) |
| **Session management** | Automatic (cookies) | Automatic (cookies) | Managed by provider |
| **User isolation** | App-layer (filters) | DB-layer (RLS) | App-layer |
| **Admin access** | Env var + DB flag | Complex RLS or separate schema | Roles/groups |
| **Offline/cold start** | Session refresh on first request | Same | Depends on provider |
| **Cost** | $0 (included) | $0 | $25–100/mo |
| **Migration difficulty** | — | Low (add policies) | High (change user IDs) |
| **Auditability** | Medium (app-layer logs) | Low (DB audit logs) | High (provider logs) |

---

## References

| File | Role |
|---|---|
| `src/lib/auth-context.tsx` | AuthProvider React context — session management, admin check, auth methods |
| `src/lib/client.ts` | Browser client creation via `@supabase/ssr` |
| `src/middleware.ts` | Next.js middleware — route protection, session refresh, Bearer fallback |
| `src/lib/supabase-server.ts` | Service role client — `getSupabaseAdmin()`, `isUserAdminServer()`, `getUserImageSettingsAdmin()` |
| `src/lib/env.ts` | Environment variable validation for auth-related vars |
| `src/components/auth-form.tsx` | Login/signup form component |
| `src/app/auth/callback/page.tsx` | OAuth callback handler |
| `src/app/api/admin/*/route.ts` | Admin API routes — consistent Bearer token + admin check |
| `src/app/api/chat/stream/route.ts` | Streaming API — Bearer token auth |
| `src/app/layout.tsx` | Provider nesting — AuthProvider wraps entire app |
| `src/lib/points-engine.ts` | Server-side points operations (uses service role) |
| `supabase/migrations/20260621000001_user_events_tables.sql` | RLS policies on user_events, user_profiles, platform_stats |
| `supabase/migrations/20260705000001_forking_and_challenges.sql` | RLS policies on user_daily_challenges (user-scoped) |
| `supabase/config.toml` | Auth configuration (rate limits, email, JWT expiry, OAuth) |
| `.env.example` | Environment variable documentation |
| `docs/DATABASE_DICTIONARY.md` | Complete RLS policy table in Section 10 |

---

## Changelog

| Date | Change |
|---|---|
| 2026-06-01 | Initial ADR created |
| 2026-07-12 | Expanded with detailed middleware flow, admin route protection pattern, RLS strategy analysis, service role usage catalog, and auth flow diagrams |
