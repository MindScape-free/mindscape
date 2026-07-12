# 🧑‍💻 MindScape — Developer Onboarding Guide

A step-by-step guide for new developers to get productive with the MindScape codebase.

---

## 📋 Prerequisites

> **Tech Stack Note**: MindScape uses **React 18** (not React 19). All dependencies are pinned to React 18 compatibility. Do NOT upgrade to React 19 without a coordinated dependency audit.

| Tool | Version | Purpose |
|---|---|---|
| **Node.js** | ≥ 18 (LTS recommended) | Runtime |
| **npm** | ≥ 9 | Package manager |
| **Git** | ≥ 2.30 | Version control |
| **Supabase CLI** | Latest | Local DB, migrations, types |
| **Docker Desktop** | Latest | Local Supabase (optional) |
| **VS Code** | Latest | Recommended editor |

### Recommended VS Code Extensions

- **Tailwind CSS IntelliSense** — Autocomplete for Tailwind classes
- **ESLint** — Lint on save
- **Prettier** — Code formatting
- **PostCSS Language Support** — CSS syntax highlighting
- **MDX** — Documentation preview
- **GitLens** — Git blame annotations
- **Thunder Client** — API route testing (alternative to Postman)

---

## 🚀 Quick Start (30 minutes)

### Step 1: Clone & Install

```bash
git clone <repo-url>
cd MindScape
npm install
```

### Step 2: Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

| Variable | How to Get It |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase Dashboard → Settings → API → anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → service_role key |
| `NEXT_PUBLIC_ADMIN_USER_IDS` | Supabase Dashboard → Authentication → Users → copy your user UUID |
| `POLLINATIONS_API_KEY` | [https://pollinations.ai](https://pollinations.ai) — sign up for a free key |
| `YOUTUBE_API_KEY` | Google Cloud Console → APIs & Services → Credentials |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` (dev) or your production URL |

> ⚠️ **Never commit `.env.local` or `.env` to version control.** Both are in `.gitignore`.

### Step 3: Set Up Database

#### Option A: Remote Supabase (recommended for quick start)

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

#### Option B: Local Supabase (Docker required)

```bash
npx supabase start    # Starts PostgreSQL + other services
npx supabase db reset # Applies all migrations
```

> Running `npx supabase db reset` applies all 17 migrations in `supabase/migrations/` in order.

### Step 4: Start Development

```bash
npm run dev
```

The app starts at `http://localhost:3000` with Turbopack HMR.

> On Windows, the `dev` script sets `NODE_OPTIONS=--max-old-space-size=4096` automatically.

### Step 5: Verify Everything Works

1. Open `http://localhost:3000` — you should see the MindScape home page
2. Try generating a mind map by entering a topic and clicking "Generate"
3. Check the browser console for any errors
4. Run `npm run typecheck` — should pass with 0 errors
5. Run `npm run lint` — should pass with minimal warnings

---

## 📁 Codebase Navigation Guide

### Where to Find Things

| What You Need | Where to Look |
|---|---|
| **Pages** | `src/app/` — each folder = a route (`/`, `/canvas`, `/admin`, `/library`, etc.) |
| **API Routes** | `src/app/api/` — 14 handlers (chat, images, scraping, telemetry) |
| **Server Actions** | `src/app/actions.ts` (~1,443 lines) + `src/app/actions/` (domain-specific) |
| **React Components** | `src/components/` — 70+ components organized by feature |
| **UI Primitives** | `src/components/ui/` — 25 Radix + Tailwind wrappers |
| **Custom Hooks** | `src/hooks/` — 19 hooks for data, state, streaming |
| **React Contexts** | `src/contexts/` — 5 providers (Auth, AIConfig, Notifications, Activity, XP) |
| **AI Layer** | `src/ai/` — flows, providers, schemas, prompts, dispatcher |
| **Knowledge Engine** | `src/knowledge-engine/` — SKEE: heading/section/keyword extraction |
| **Types** | `src/types/` — mind-map.ts, points.ts, chat.ts, admin.ts, multi-source.ts |
| **Database** | `src/lib/supabase-db.ts` (client), `src/lib/supabase-server.ts` (admin) |
| **DB Migrations** | `supabase/migrations/` — 17 SQL files |
| **Tests** | `src/__tests__/` — unit + integration tests |
| **Documentation** | `docs/` — 15+ markdown files |

### Architecture at a Glance

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌─────────────┐
│  Browser  │────▶│ Server       │────▶│ AI Provider  │────▶│ Supabase    │
│ (React)   │     │ Actions/RPC  │     │ (Pollinations)│    │ (PG + Auth) │
└──────────┘     └──────────────┘     └──────────────┘     └─────────────┘
                      │                      │
                      ▼                      ▼
               ┌──────────────┐     ┌──────────────┐
               │ Knowledge    │     │ SKEE Engine  │
               │ Engine (SKEE)│     │ (Deterministic)│
               └──────────────┘     └──────────────┘
```

---

## 🔑 Key Development Patterns

### Server Action Pattern

All AI generation follows this pattern:

```typescript
'use server';

export async function generateSomethingAction(
  input: InputType,
  options: AIActionOptions = {}
): Promise<{ data: OutputType | null; error: string | null }> {
  try {
    // 1. Validate input
    // 2. Resolve API key (resolveApiKey)
    // 3. Call AI flow
    // 4. Sanitize output (mapToMindMapData)
    // 5. Cache result
    // 6. Return { data, error }
  } catch (error) {
    return { data: null, error: error.message };
  }
}
```

### Component Structure

Components follow this pattern:
- **Feature components** in `src/components/[feature]/` (kebab-case filenames)
- **UI primitives** in `src/components/ui/` (shadcn-style, PascalCase)
- **Mind map components** in `src/components/mind-map/`
- **Chat components** in `src/components/chat/`

### State Management

| State Type | Mechanism | When to Use |
|---|---|---|
| **Global auth/theme** | React Contexts | Auth, AI config, XP, notifications, activity |
| **Server data** | Server Actions + SWR | Admin dashboard, public stats |
| **Client-only state** | Custom hooks + useState | Streaming chat, mind map interaction |
| **Persistent UI prefs** | localStorage | Theme, language, persona preferences |
| **Session data** | sessionStorage | File content across page navigations |

### Adding a New AI Flow

1. Create a flow file in `src/ai/flows/generate-something.ts`
2. Define input/output Zod schemas in `src/ai/schemas/`
3. Create a server action in `src/app/actions.ts`
4. Register in the AI dispatcher if needed
5. Add the prompt template
6. Wire up the XP award and analytics tracking

---

## 🧪 Testing

### Test Pyramid

```
     ╱─────╲
    ╱  E2E  ╲        ← Missing (use Playwright)
   ╱─────────╲
  ╱Integration╲       ← src/__tests__/integration/
 ╱─────────────╲
╱  Unit Tests   ╲     ← src/__tests__/unit/ + src/lib/*.test.ts
╲───────────────╯
```

### Running Tests

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

### Current Test Coverage

| Suite | Type | Files | Status |
|---|---|---|---|
| `depth-analysis.test.ts` | Lib unit | 1 | ✅ Passing |
| `points-engine.test.ts` | Lib unit | 1 | ✅ Passing |
| `map-mappers.test.ts` | Unit | 1 | ✅ Passing |
| `mind-map-render.test.tsx` | Unit | 1 | ✅ Passing |
| `community-actions.test.ts` | Integration | 1 | ✅ Passing |
| `mind-map-crud.test.ts` | Integration | 1 | ✅ Passing |

**Critical gaps**: No tests for server actions (`actions.ts`), AI flows, hooks, or E2E flows.

---

## 🐛 Common Pitfalls

### Build Issues

| Issue | Solution |
|---|---|
| `TypeError: Cannot read properties of undefined` | Check if you're accessing a property before it's loaded — mind map data is async |
| Module not found `@/lib/xxx` | Path aliases are in `tsconfig.json` — ensure your import path is correct |
| PostCSS config not found | Make sure `postcss.config.mjs` exists in the project root |
| `npm run build` fails with type errors | Try `npm run typecheck` first — fix errors individually |

### Development Gotchas

- **Canvas page requires a `topic` or `mapId` or `sessionId` query param** — navigating blind will show an empty state
- **API keys are cached server-side with 5-min TTL** — if a user adds a key, they may need to wait up to 5 minutes or clear server cache
- **In-memory caches don't persist across serverless function cold starts** — expect cache misses in production on cold functions
- **Session storage is limited to ~5MB** — large PDF content may hit this limit
- **Framer Motion `AnimatePresence` can cause performance issues with >100 nodes** — disable animations for large maps

---

## 📚 Documentation Reference

Read these docs in order:

1. **README.md** — Project overview, setup, scripts
2. **docs/ARCHITECTURE.md** — System architecture with diagrams
3. **docs/blueprint.md** — Feature blueprint and user flows
4. **docs/COMPONENT_INVENTORY.md** — Component catalog
5. **docs/API_REFERENCE.md** — API routes and server actions
6. **docs/DATABASE_DICTIONARY.md** — Full DB schema
7. **docs/CODING_STANDARDS.md** — Code conventions
8. **docs/SECURITY_AUDIT.md** — Security posture
9. **docs/PERFORMANCE_AUDIT.md** — Performance bottlenecks
10. **docs/TECHNICAL_DEBT.md** — Known debt items

---

## Quick Reference Card

```bash
# Development
npm run dev              # Start dev server (Turbopack)
npm run typecheck        # TypeScript check
npm run lint             # ESLint

# Testing
npm test                 # Run Jest tests
npm run test:watch       # Watch mode

# Database
npm run db:migrate       # Push migrations
npm run db:reset         # Reset local DB
npm run db:types         # Regenerate TS types
npm run db:backfill      # Backfill user events

# Building
npm run build            # Production build
npm run start            # Start production server
```
