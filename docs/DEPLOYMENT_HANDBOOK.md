# 🚀 MindScape — Deployment Handbook

This document covers everything needed to deploy and maintain MindScape in production.

---

## 🏗️ Infrastructure Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  Vercel Edge    │────▶│  Next.js SSR    │────▶│  Supabase        │
│  CDN            │     │  + Serverless    │     │  PostgreSQL +    │
│                 │     │  Functions       │     │  Auth + Realtime │
└─────────────────┘     └─────────────────┘     └──────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │  Pollinations.ai │
                        │  (AI Provider)   │
                        └─────────────────┘
```

| Service | Purpose | Plan | Cost |
|---|---|---|---|
| **Vercel** | Hosting, Edge Functions, SSR | Pro ($20/mo) or Enterprise | Free tier may work |
| **Supabase** | PostgreSQL, Auth, Realtime | Pro ($25/mo) | Free tier for dev |
| **Pollinations.ai** | AI text + image generation | BYOP (user pays) or system key | Free tier available |
| **Google Cloud** | YouTube Data API | Free quota: 10,000 requests/day | Free |

---

## 📦 Prerequisites for Deployment

1. **GitHub repository** with the code pushed to `main` branch
2. **Vercel account** connected to GitHub
3. **Supabase project** (production instance)
4. **Pollinations.ai API key** (system-level)
5. **Google Cloud project** with YouTube Data API v3 enabled

---

## 🔧 Step 1: Configure Supabase (Production)

### Create Production Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Choose a strong database password
3. Select a region close to your users
4. Wait for database provisioning (~2-3 minutes)

### Apply Migrations

```bash
npx supabase link --project-ref <your-production-ref>
npx supabase db push
```

This applies all 17 migrations from `supabase/migrations/`.

### Configure Authentication

1. **Settings** → **Auth** → **Site URL**: Set to `https://your-domain.vercel.app`
2. **Redirect URLs**: Add `https://your-domain.vercel.app/auth/callback`
3. Enable **Google OAuth** (Providers → Google → configure client ID/secret from Google Cloud Console)
4. Email settings: Enable "Confirm email" for production

### Configure pg_cron (for stats recompute)

The migrations in `20260621000002_recompute_cron.sql` enable `pg_cron`. Verify it's working:

```sql
select * from cron.job;
select * from cron.job_run_details order by start_time desc limit 10;
```

> ⚠️ **Important**: `pg_cron` is available on Supabase Pro plan and above.

### Row Level Security

Verify RLS is enabled on all tables:

```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
```

Expected: All application tables should have `rowsecurity = true`.

---

## 🌐 Step 2: Deploy to Vercel

### Option A: Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repository
3. **Framework Preset**: Next.js (auto-detected)
4. **Environment Variables**: Add ALL variables from `.env.example`

### Option B: Vercel CLI

```bash
vercel login
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add NEXT_PUBLIC_ADMIN_USER_IDS
vercel env add POLLINATIONS_API_KEY
vercel env add YOUTUBE_API_KEY
vercel env add NEXT_PUBLIC_APP_URL
vercel --prod
```

### Environment Variables Checklist

| Variable | Where to Set | Production Value |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel env | Project URL from Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Vercel env | Anon key from Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel env (encrypted) | Service role key from Supabase |
| `NEXT_PUBLIC_ADMIN_USER_IDS` | Vercel env | Comma-separated admin UUIDs |
| `POLLINATIONS_API_KEY` | Vercel env (encrypted) | System Pollinations key |
| `YOUTUBE_API_KEY` | Vercel env (encrypted) | Google Cloud API key |
| `NEXT_PUBLIC_APP_URL` | Vercel env | `https://your-domain.vercel.app` |

### Vercel Project Settings

| Setting | Value |
|---|---|
| **Build Command** | `npm run build` |
| **Output Directory** | `.next` |
| **Node.js Version** | 18.x or 20.x |
| **Automatic HTTPS** | Enabled (default) |
| **Function Region** | `iad1` (US East) or nearest to your DB |

---

## 🔄 Step 3: Cron Jobs

### Vercel Cron Jobs (for admin-sync)

Configure a cron job via the **Vercel Dashboard → Project → Cron Jobs** tab:

| Setting | Value |
|---|---|
| **Path** | `/api/admin-sync` |
| **Schedule** | Daily at midnight UTC (`0 0 * * *`) |
| **Method** | POST |

> Note: No `vercel.json` file exists in this project. Cron jobs must be configured through the Vercel Dashboard UI. Alternatively, create a `vercel.json` with a `crons` array if you prefer infrastructure-as-code.

### Supabase Cron Jobs (pg_cron)

Managed by migration `20260621000002_recompute_cron.sql`:

| Job | Schedule | Function |
|---|---|---|
| `recompute-active-user-profiles` | Every 5 min | `recompute_active_user_profiles()` |
| `recompute-platform-stats` | Every 5 min | `recompute_platform_stats()` |
| `recompute-all-user-profiles` | Every 6 hours | `recompute_all_user_profiles()` |

---

## 🔒 Step 4: Security Hardening

### Pre-Deployment Checklist

- [ ] All secrets rotated from development defaults
- [ ] `NEXT_PUBLIC_ADMIN_USER_IDS` set to actual admin UUIDs (not empty)
- [ ] `.env` and `.env.local` in `.gitignore`
- [ ] Supabase RLS enabled on all tables
- [ ] Service role key only used server-side
- [ ] CSP headers configured in `next.config.ts`

### Production-Only Concerns

| Concern | Mitigation |
|---|---|
| **Cold starts** | AI generation actions may take 2-5s on first call after inactivity |
| **API key abuse** | Only `/api/generate-image` is rate-limited; other endpoints are not |
| **No Redis cache** | In-memory caches reset on every function cold start |
| **No OpenRouter fallback** | If Pollinations.ai is down, the app loses AI capabilities |
| **User API keys in plaintext** | `user_settings.pollinations_api_key` is not encrypted |

---

## 📊 Step 5: Post-Deployment Verification

### Smoke Test Checklist

- [ ] Home page loads and is interactive
- [ ] Can generate a mind map from a text topic
- [ ] Canvas renders with accordion tree
- [ ] AI chat works (streaming responses)
- [ ] Quiz generation works
- [ ] Save/load map from library works
- [ ] Admin dashboard loads (if admin user)
- [ ] Community page shows published maps
- [ ] Auth: login, signup, Google OAuth all work
- [ ] `/api/stats/public` returns valid JSON

### Monitoring

- **Vercel Dashboard**: Deployment logs, function duration, error rates
- **Supabase Dashboard**: Database logs, Auth logs, Realtime connections
- **Pollinations Dashboard**: API usage and remaining balance
- **Site24x7/UptimeRobot**: External uptime monitoring (optional)

---

## ⚡ Performance Checklist

- [ ] Enable Vercel Edge Caching for static assets
- [ ] Verify dynamic imports work (chat-panel is lazy-loaded)
- [ ] Check bundle sizes: `/canvas` should be ~310KB first-load JS
- [ ] Verify image optimization (next/image remote patterns configured)
- [ ] Ensure fonts are preloaded (Orbitron, Space Grotesk)

---

## ♻️ Rollback Procedure

### If a deployment breaks production:

1. **Vercel Dashboard**: Go to Deployments → find the last working deployment
2. Click the "..." menu → **Promote to Production**
3. Verify the rollback is live (usually <30 seconds)
4. Investigate the broken deployment locally before retrying

### If database migration fails:

1. **Supabase Dashboard**: Go to Database → Migrations
2. Identify the failing migration
3. Either fix the migration or restore from backup
4. Re-apply: `vercel env pull && npx supabase db push`

### If Pollinations.ai is down:

The app will show generation errors. Users with their own API keys can still use the app. No automatic failover to OpenRouter exists yet.

---

## 🔐 Production URLs

| Environment | URL | Purpose |
|---|---|---|
| **Production** | `https://mindscape-free.vercel.app` | Live production |
| **Preview** | `https://<branch>.vercel.app` | Per-branch preview (auto-deployed for PRs) |
| **Local** | `http://localhost:3000` | Development |

---

## 📝 Release Checklist

### Before Every Release

- [ ] Run `npm run typecheck` — 0 errors
- [ ] Run `npm run lint` — 0 errors, minimal warnings
- [ ] Run `npm test` — all tests passing
- [ ] Run `npm run build` — successful production build
- [ ] Verify all environment variables are set in Vercel
- [ ] Check Supabase migration status: `npx supabase db diff`
- [ ] Smoke test on preview deployment before promoting to production

### Release Process

1. Merge feature branch into `main`
2. Vercel automatically deploys preview
3. Smoke test preview deployment
4. Promote preview to production in Vercel Dashboard
5. Run post-deployment smoke test on production URL
6. Monitor error rates for 15 minutes post-deployment
