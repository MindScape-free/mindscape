# 🛡️ MindScape — Security Audit Report

This report documents the security posture of the MindScape codebase, identifies architectural vulnerabilities, reviews database policies, and outlines recommendations for hardening the production environment.

---

## 🔍 Vulnerability Register

### 1. Administrator Overrides (Previously: Hardcoded Fallback — Severity: 🟢 RESOLVED)
- **Status**: **✅ RESOLVED** — No hardcoded UUID exists in the current codebase.
- **Verification**: Both `src/lib/supabase-server.ts` (`isUserAdminServer()`) and `src/lib/auth-context.tsx` use:
  ```typescript
  const adminIds = (process.env.NEXT_PUBLIC_ADMIN_USER_IDS || '').split(',').filter(Boolean);
  ```
- **Remediation applied**: Previous hardcoded fallback UUID was removed. Admin access now strictly requires setting `NEXT_PUBLIC_ADMIN_USER_IDS` in environment variables or the `is_admin` column in the `users` table.
- **Ongoing risk**: If `NEXT_PUBLIC_ADMIN_USER_IDS` is left empty, no users will have admin access via the env var path (the DB `is_admin` check still applies).

### 2. Plaintext Credentials in Workspace (Severity: 🔴 CRITICAL)
- **Vulnerability**: Plaintext secrets (service role keys, API keys) were present in `.env` inside the workspace.
- **Impact**: Developers could accidentally leak credentials if they change git settings.
- **Remediation**: Rotate all service keys. Move all parameters into a strictly ignored `.env.local` file and distribute configuration variables via a secure vault (Vercel Integration / Vault). `.env` and `.env.local` are already in `.gitignore`.

### 3. Missing Server-Side Admin Checks on API Endpoints (Severity: 🟠 HIGH)
- **Vulnerability**: Several `/api/admin/*` routes may verify administrative permissions only client-side via React context components, without validating on the server inside the route handler.
- **Impact**: An authenticated non-admin user could execute state-modifying actions by mimicking `/api/admin` requests directly.
- **Remediation**: Use `isUserAdminServer()` inside every admin route handler before serving requests. The middleware.ts already protects admin API routes from unauthenticated access, but does not check admin role.

### 4. Lack of Rate Limiting on Server Actions (Severity: 🟠 HIGH)
- **Vulnerability**: Mind map generation server actions (`generateMindMapAction`, etc.) call external AI APIs but have no rate-limiting middleware.
- **Impact**: A script can spam the action, creating thousands of maps and depleting the platform's Pollen balance.
- **Remediation**: Implement a Redis or database-backed rate-limiter inside `actions.ts`. The existing in-memory rate limiter (`src/lib/rate-limit.ts`) currently only protects the image generation API endpoint.

---

## 🏗️ Architectural Controls

### Content Security Policy (CSP)
MindScape implements a strict Content Security Policy defined in `next.config.ts`.
- **Allowed Script Sources**: `'self'`, `'unsafe-eval'` (needed for Next.js dev server), `'unsafe-inline'`, `https://cdn.pollinations.ai`, `https://cdnjs.cloudflare.com`, `https://apis.google.com`
- **Allowed Image Sources**: `'self'`, `data:`, `blob:`, `https://gen.pollinations.ai`, `https://image.pollinations.ai`, `https://*.pollinations.ai`, `https://*.googleusercontent.com`, `https://placehold.co`, `https://picsum.photos`, `https://grainy-gradients.vercel.app`
- **Allowed Connect Sources**: `'self'`, `https://text.pollinations.ai`, `https://gen.pollinations.ai`, `https://*.supabase.co` (with WebSocket for Realtime), `https://r.jina.ai`, `https://*.googleapis.com`, `https://apis.google.com`
- **Frame Ancestors**: `'none'` (prevents clickjacking)
- **Form Action**: `'self'`
- **Base URI**: `'self'`

### Row Level Security (RLS)
Supabase tables enforce Row Level Security at the database level:
- **`mindmaps`**: Enforces `auth.uid() = user_id`. Users can only read, write, or delete their own maps.
- **`chat_sessions`**: Enforces `auth.uid() = user_id`.
- **`user_settings`**: Private settings are restricted to the owner's UUID.
- **`user_events`**: Admins can read; service role can insert.
- **`user_profiles`**: Admins can read; service role can upsert.
- **`platform_stats`**: Admins can read; service role can upsert.
- **`ai_calls`** & **`analytics_events`**: Service role only.
- **`user_daily_challenges`**: Users can view and insert their own.
- **`public_mindmaps`**: Read operations are allowed for anonymous users, but updates require owner session verification.

### Auth Middleware
A fully functional `src/middleware.ts` protects the application:
- **Public routes** (no auth required): `/`, `/auth/callback`, `/signup`, `/login`, `/api/stats/public`, `/api/models`, `/robots.txt`, `/sitemap.xml`
- **Protected API routes** (401 if unauthenticated): `/api/chat/*`, `/api/scrape-url`, `/api/extract`, `/api/generate-image`, `/api/generate-audio`, `/api/generate-quiz-direct`, `/api/youtube-transcript`, `/api/analytics/*`, `/api/admin/*`, `/api/admin-sync`
- **Admin page** (`/admin`): Redirects to `/login` if not authenticated
- **Auth strategy**: Cookie-based Supabase SSR session with Bearer token fallback for streaming endpoints

---

## 🔒 Action Plan & Guidelines

1. **Rotate Keys**: Immediately rotate all database service keys and Pollinations API keys. They were previously exposed in `.env` files.
2. **Admin Endpoint Validation**: Audit all API routes in `src/app/api/admin/` and ensure they call `isUserAdminServer()` explicitly. The middleware only checks authentication, not admin role.
3. **Rate Limit Server Actions**: Extend the existing rate limiter from `/api/generate-image` to cover all AI generation server actions.
4. **Encrypt User API Keys**: User API keys stored in `user_settings.pollinations_api_key` are plaintext. Consider encryption at rest using Supabase Vault or `pgcrypto`.
5. **Input Sanitization**: Maintain the sanitization pattern in `mapToMindMapData()` which strips out arbitrary attributes to block prompt injection payload attacks.
6. **Secret Scanning**: Add a pre-commit hook to detect accidental secret commits using tools like `git-secrets` or `talisman`.

---

## 🏁 Security Scoring Summary

*Scores are rough estimates based on the current codebase state, intended to highlight areas needing attention. See individual sections above for specific issues and remediations.*

| Area | Score (0-100) | Key Issues |
|---|---|---|
| **Authentication** | 85 | Supabase Auth is robust; middleware protects routes; password and OAuth options |
| **Authorization (RBAC)** | 60 | Admin check is partially functional but some API endpoints lack server-side admin validation |
| **Data Protection (RLS)** | 80 | Strong RLS on user data; some telemetry tables rely on service role only |
| **Input Sanitization** | 90 | `mapToMindMapData()` is exemplary — no raw spreads from AI output |
| **Secrets Management** | 50 | Keys were in plaintext `.env`; user API keys stored unencrypted in DB |
| **Rate Limiting** | 40 | Only image generation endpoint is rate-limited; server actions are unprotected |
| **CSP & Headers** | 80 | Strict CSP; X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy configured (no explicit HSTS) |
