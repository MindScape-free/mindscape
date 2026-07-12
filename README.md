# 🧠 MindScape

**AI-powered knowledge visualization platform** that transforms unstructured information into interactive, explorable mind maps.

Convert PDFs, YouTube videos, websites, images, and text into structured knowledge graphs using deterministic extraction + AI synthesis.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwindcss)](https://tailwindcss.com/)

---

## ✨ Key Features

| Feature | Description |
|---|---|
| **Multi-Source Ingestion** | Generate mind maps from text, PDF, image, YouTube URL, website URL, or multiple sources combined |
| **Three Modes** | Single topic, Compare (side-by-side), Multi-Source (merge unlimited inputs) |
| **SKEE Engine** | Deterministic structural extraction before AI synthesis — zero hallucinated headings |
| **AI Chat Panel** | Streaming chat assistant with tool calls, voice input, file attachments, and URL auto-scraping |
| **Adaptive Quizzes** | AI-generated quizzes that detect weak areas and auto-expand the mind map with remedial nodes |
| **Visual Insight Lab** | Generate AI images for any concept in the mind map |
| **Knowledge Alchemy** | Select any 2 nodes and AI fuses them into a hybrid concept |
| **Compare Mode** | Side-by-side analysis with shared nexus, dimensional comparison, and synthesis horizon |
| **Gamification (XP)** | 31 event types, 10 ranks (Spark → MindMaster), streak bonuses (1x/1.2x/1.5x/2x), daily caps per event |
| **Community** | Publish maps publicly, browse and explore others' knowledge graphs |
| **Multi-Language** | 50+ language support for map generation and translation |
| **4 AI Personas** | Teacher, Concise, Creative, Cognitive Sage — each shapes the AI's output style |

---

## 🏗️ Architecture Overview

```
User Input → Knowledge Engine (SKEE) → AI Synthesis (Pollinations.ai) → Schema Validation → Interactive Visualization
```

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js 16 (App Router)                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ 16 Pages │  │ 14 API   │  │ Server   │  │ Layout   │   │
│  │          │  │ Routes   │  │ Actions  │  │ Providers│   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
├─────────────────────────────────────────────────────────────┤
│  Contexts: Auth → AIConfig → Notifications → Activity → XP │
├─────────────────────────────────────────────────────────────┤
│  External: Supabase (DB/Auth) │ Pollinations.ai (LLM/Img)  │
│            YouTube API │ Web Scraping (Jina/Cheerio)        │
└─────────────────────────────────────────────────────────────┘
```

For full architecture diagrams, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- **Supabase** project (free tier works)
- **Pollinations.ai** API key ([get one here](https://pollinations.ai))

### 1. Clone & Install

```bash
git clone <repo-url>
cd MindScape
npm install
```

### 2. Configure Environment

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:

| Variable | Description | Source |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only, for admin ops) | Supabase Dashboard → Settings → API (keep secret!) |
| `POLLINATIONS_API_KEY` | System-level Pollinations API key (fallback for users without their own) | [pollinations.ai](https://pollinations.ai) |
| `YOUTUBE_API_KEY` | Google YouTube Data API key (for transcript extraction) | Google Cloud Console |
| `NEXT_PUBLIC_APP_URL` | Your app URL (e.g., `http://localhost:3000`) | Your deployment URL |
| `NEXT_PUBLIC_ADMIN_USER_IDS` | Comma-separated UUIDs of admin users | Your Supabase auth.users IDs |

**Security note:** The hardcoded fallback admin UUID in `src/lib/auth-context.tsx` is a **critical security vulnerability** and has been flagged in the [Security Audit](docs/SECURITY_AUDIT.md). Always set `NEXT_PUBLIC_ADMIN_USER_IDS` to control admin access.

### 3. Set Up Database

#### Option A: Remote Supabase project (recommended)

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

#### Option B: Local Supabase (Docker required)

```bash
npx supabase start
npx supabase db reset
```

This will run all 17 migrations in `supabase/migrations/` to create the full schema including:
- Core tables: `users`, `mindmaps`, `chat_sessions`, `shared_mindmaps`, `public_mindmaps`
- Analytics: `user_events`, `user_profiles`, `platform_stats`
- Gamification: `user_points`, `point_transactions`
- AI Telemetry: `ai_calls`
- Admin: `admin_activity_log`, `feedback`
- Challenges: `user_daily_challenges`

### 4. Run Development Server

```bash
npm run dev
```

The app runs at `http://localhost:3000` with Turbopack for fast HMR.

> ⚠️ **Windows users:** Run with `cross-env NODE_OPTIONS=--max-old-space-size=4096` (the default script handles this).

---

## 📁 Project Structure

```
MindScape/
├── docs/                     # Documentation (18 files)
│   ├── ARCHITECTURE.md       # Full system architecture with Mermaid diagrams
│   ├── blueprint.md          # Feature blueprint, user flows, data schemas
│   ├── PAGE_WISE_WALKTHROUGH.md  # Page-by-page user experience guide
│   ├── ONBOARDING_FLOW.md    # User onboarding paths for 3 personas
│   ├── ADMIN_DATA_FLOW.md    # Admin dashboard data pipeline
│   ├── COMPONENT_INVENTORY.md    # Full inventory of 60+ components
│   ├── API_REFERENCE.md      # All API routes & server action specs
│   ├── SECURITY_AUDIT.md     # Security audit: RLS, CSP, vulnerabilities
│   ├── PERFORMANCE_AUDIT.md  # Bundle sizes, caching, SVG bottlenecks
│   ├── TECHNICAL_DEBT.md     # Prioritized technical & compiler debt
│   ├── IMPROVEMENT_ROADMAP.md    # Strategic 3/6/12-month timeline
│   ├── DOCUMENTATION_COVERAGE_REPORT.md  # Coverage audit & gap analysis
│   ├── CODING_STANDARDS.md   # Code conventions, naming, TypeScript rules
│   └── PITCH_DECK.md         # Product pitch deck
├── public/                   # Static assets (fonts, favicon, PDF worker, icons)
├── scripts/                  # Data migration & backfill scripts
├── supabase/
│   ├── config.toml           # Supabase local development config
│   └── migrations/           # 17 SQL migration files (schema, triggers, cron, fixes)
├── src/
│   ├── ai/                   # AI layer
│   │   ├── flows/            # 23 AI generation flows (generate, chat, quiz, translate, etc.)
│   │   ├── providers/        # Pollinations adapter + orchestrator + post-processor
│   │   ├── schemas/          # Zod schemas for AI output validation
│   │   ├── search/           # Google Search integration
│   │   ├── compare/          # Comparison map generation (flow, schema, prompt)
│   │   ├── agent.ts          # Event-emitter agent class (disabled)
│   │   ├── tools.ts          # AI tool definitions (web search, calculator, time)
│   │   ├── client-dispatcher.ts  # Backward-compatible facade → orchestrator
│   │   ├── mind-map-schema.ts    # Comprehensive Zod schemas for all mind map types
│   │   ├── pollinations-client.ts # Direct Pollinations API client
│   │   └── provider-monitor.ts   # In-memory provider health tracking
│   ├── app/                  # Next.js App Router
│   │   ├── page.tsx + HomeClient.tsx  # Home page with hero, modes, generation
│   │   ├── canvas/           # Core mind map workspace (CanvasClient.tsx) + loading + metadata
│   │   ├── admin/            # Admin dashboard + API routes (unified, debug, stats, recompute)
│   │   ├── api/              # 14 API route handlers (chat/stream, generate-image, scrape, etc.)
│   │   ├── actions.ts        # Monolithic Server Actions file (~1443 lines)
│   │   ├── actions/          # Domain-specific Server Actions (community, feedback, enrich-node, etc.)
│   │   ├── community/        # Community dashboard page
│   │   ├── library/          # User library page
│   │   ├── profile/          # User profile page
│   │   ├── points/           # XP/points explanation page
│   │   ├── changelog/        # Changelog pages
│   │   ├── feedback/         # Feedback submission page
│   │   ├── faq/              # FAQ page
│   │   ├── login/ + signup/  # Auth pages
│   │   ├── auth/callback/    # OAuth callback handler
│   │   ├── use-cases/        # SEO landing pages
│   │   ├── robots.ts + sitemap.ts  # SEO configurations
│   │   ├── error.tsx         # Global error boundary
│   │   └── globals.css       # Tailwind + custom CSS + print styles + animations
│   ├── components/           # 70+ React components
│   │   ├── ui/               # 25 Radix + Tailwind primitives (button, dialog, card, etc.)
│   │   ├── mind-map/         # 17 mind map components (tree, accordion, compare, dialogs)
│   │   ├── chat/             # 9 chat components (markdown, quiz, pinned messages, etc.)
│   │   ├── home/             # 10 home page sections (hero, features, stats, FAQ)
│   │   ├── admin/            # 7 admin dashboard components
│   │   ├── canvas/           # Canvas-specific (BlobPdfViewer, SearchReferences, SourceParser)
│   │   ├── points/           # Gamification (LevelUpOverlay, xp-toast, rank-badge)
│   │   ├── community/        # Community card component
│   │   ├── loading/          # NeuralLoader component
│   │   ├── debug/            # PerformanceMonitor & Profiler
│   │   ├── feedback/         # Feedback form & display components
│   │   ├── seo/              # Structured data components
│   │   └── ...               # Standalone: mind-map, chat-panel, navbar, etc.
│   ├── contexts/             # 5 React context providers
│   │   ├── auth-context.tsx  # User session, login/logout, admin check
│   │   ├── ai-config-context.tsx # Provider config, API keys, model selection
│   │   ├── notification-context.tsx  # Toast notification management
│   │   ├── activity-context.tsx  # Global loading/activity state
│   │   └── xp-context.tsx    # Points engine, ranks, streaks, toasts
│   ├── hooks/                # 19 custom hooks
│   │   ├── use-mind-map-persistence.ts  # DB save/load + auto-save
│   │   ├── use-chat-persistence.ts      # Chat session persistence
│   │   ├── use-streaming-chat.ts        # SSE streaming for AI chat
│   │   ├── use-mind-map-stack.ts        # Breadcrumb navigation stack
│   │   ├── use-mind-map-router.ts       # URL param parsing for canvas
│   │   ├── use-mind-map-pinned-messages.ts # Pinned message CRUD
│   │   ├── use-multi-source.ts          # Multi-file state management
│   │   ├── use-points.ts / use-points-history.ts  # XP ledger
│   │   ├── use-admin-dashboard.ts       # SWR admin data fetching
│   │   ├── use-ai-health.ts             # AI provider health
│   │   ├── use-tracking.ts              # Map view tracking
│   │   ├── use-text-to-speech.ts        # AI voice generation
│   │   ├── use-map-sharing.ts           # Share link generation
│   │   ├── use-local-storage.ts / use-session-storage.ts
│   │   ├── use-render-timing.ts         # Performance measurement
│   │   └── use-toast.ts                 # Toast notifications
│   ├── knowledge-engine/     # SKEE: Deterministic text analysis (8 files)
│   │   ├── heading-detector, section-splitter, concept-extractor
│   │   ├── keyword-extractor, relationship-detector, graph-builder
│   │   └── graph-to-mindmap, index.ts
│   ├── lib/                  # 25+ utility files
│   │   ├── supabase-db.ts    # Client-side DB operations
│   │   ├── supabase-server.ts # Server-side admin DB operations
│   │   ├── auth-context.tsx, client.ts, server.ts  # Auth & Supabase clients
│   │   ├── points-engine.ts + points-engine.test.ts  # XP calculations
│   │   ├── depth-analysis.ts + depth-analysis.test.ts  # Topic complexity analysis
│   │   ├── map-mappers.ts    # DB row → camelCase object mappers
│   │   ├── cache.ts          # In-memory TTL cache
│   │   ├── rate-limit.ts     # In-memory per-endpoint rate limiter
│   │   ├── tracker.ts + tracking/  # Analytics tracking
│   │   ├── achievements.ts   # 15 achievement definitions
│   │   ├── daily-challenges.ts  # 50 deterministic daily challenge topics
│   │   ├── utils.ts          # cn(), formatText(), toPascalCase(), etc.
│   │   └── ...               # pdf-processor, image-processor, text-chunker, etc.
│   ├── types/                # TypeScript type definitions (5 files)
│   │   ├── mind-map.ts       # MindMapData, SubCategory, CompareData, etc.
│   │   ├── points.ts         # PointEventType, ranks, daily caps
│   │   ├── chat.ts, feedback.ts, admin.ts, multi-source.ts
│   ├── server/               # Server-only services
│   │   ├── admin/            # Admin activity service + admin service
│   │   └── cache/            # Admin cache
│   └── __tests__/            # Test suites
│       ├── unit/             # Unit tests (map-mappers, mind-map-render)
│       ├── integration/      # Integration tests (community-actions, mind-map-crud)
│       └── helpers/          # Test mocks & fixtures
├── .gitignore
├── eslint.config.mjs
├── jest.config.ts + jest.setup.ts
├── next.config.ts            # Next.js config (CSP, images, webpack aliases)
├── postcss.config.mjs
├── tailwind.config.ts        # Tailwind config (fonts, colors, animations)
├── tsconfig.json
└── package.json              # Dependencies & 14 scripts
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 |
| **UI Library** | React 18 |
| **Styling** | Tailwind CSS 3.4 + shadcn/ui (Radix UI) |
| **Animations** | Framer Motion 11 |
| **Database** | Supabase PostgreSQL (with RLS) |
| **Auth** | Supabase Auth (Email/Password + Google OAuth) |
| **AI Provider** | Pollinations.ai (text + image generation) |
| **State** | React Context + Custom Hooks + localStorage/sessionStorage |
| **PDF Parsing** | pdfjs-dist |
| **Math Rendering** | KaTeX |
| **Code Highlighting** | Prism.js |
| **Markdown** | react-markdown + remark/rehype plugins |
| **Validation** | Zod |
| **Forms** | React Hook Form |
| **Data Fetching** | SWR (admin), Server Actions (AI) |
| **Deployment** | Vercel |

---

## 📜 Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server with Turbopack (4GB heap) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript type checking |
| `npm run test` | Run Jest tests |
| `npm run test:watch` | Jest in watch mode |
| `npm run test:coverage` | Jest with coverage report |
| `npm run db:migrate` | Push Supabase migrations |
| `npm run db:reset` | Reset local Supabase database |
| `npm run db:types` | Generate TypeScript types from Supabase schema |
| `npm run db:status` | Show pending migration diffs |
| `npm run db:backfill` | Run user events backfill script |

---

## 🔒 Security

> ⚠️ **Current Security Posture** — See the [Full Security Audit](docs/SECURITY_AUDIT.md) for details.

### ✅ Implemented

- **Content Security Policy** — Strict CSP headers configured in `next.config.ts`
- **Row Level Security** — All Supabase tables use RLS for user-scoped data access
- **Server Actions** — AI operations run server-side; API keys never reach the client
- **Input Sanitization** — AI output sanitized through `mapToMindMapData()` (explicit field mapping, no `...spread`)
- **Rate Limiting** — Image generation endpoint is rate-limited (in-memory, best-effort)
- **Supabase Auth** — JWT sessions with refresh token rotation

> **Status Update**: The hardcoded admin UUID vulnerability has been **resolved** (see [Security Audit](docs/SECURITY_AUDIT.md) for details). The `middleware.ts` is fully functional. `.env.example` exists. These items are no longer missing.

### ❌ Still Needs Improvement

- **Server-side RBAC** — Some admin API routes don't verify admin status server-side (only check authentication)
- **No rate limiting on Server Actions** — AI generation actions lack IP-based rate limiting (only `/api/generate-image` is rate-limited)
- **Plaintext API keys in DB** — User API keys stored without encryption in `user_settings`

---

## 📖 Documentation & Handbooks

| Document | Description |
|---|---|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Full system architecture with Mermaid diagrams |
| [blueprint.md](docs/blueprint.md) | Feature blueprint, user flows, data schemas |
| [PAGE_WISE_WALKTHROUGH.md](docs/PAGE_WISE_WALKTHROUGH.md) | Page-by-page user experience guide |
| [ONBOARDING_FLOW.md](docs/ONBOARDING_FLOW.md) | User onboarding paths for 3 personas |
| [ADMIN_DATA_FLOW.md](docs/ADMIN_DATA_FLOW.md) | Admin dashboard data pipeline |
| [COMPONENT_INVENTORY.md](docs/COMPONENT_INVENTORY.md) | Full inventory of 60+ components with sizes and refactor targets |
| [API_REFERENCE.md](docs/API_REFERENCE.md) | Specifications for all API routes and server actions |
| [SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md) | Security audit: RLS, CSP, and vulnerabilities |
| [PERFORMANCE_AUDIT.md](docs/PERFORMANCE_AUDIT.md) | Performance audit: bundle sizes, server caching, SVG bottlenecks |
| [TECHNICAL_DEBT.md](docs/TECHNICAL_DEBT.md) | Prioritized registry of technical and compiler debt |
| [DEVELOPER_ONBOARDING.md](docs/DEVELOPER_ONBOARDING.md) | Step-by-step developer setup and codebase navigation guide |
| [DEPLOYMENT_HANDBOOK.md](docs/DEPLOYMENT_HANDBOOK.md) | Production deployment, Vercel, Supabase configuration |
| [TESTING_GUIDE.md](docs/TESTING_GUIDE.md) | Test strategy, writing tests, CI integration |
| [DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Color tokens, typography, animations, component patterns |
| [IMPROVEMENT_ROADMAP.md](docs/IMPROVEMENT_ROADMAP.md) | Strategic 3/6/12-month development timeline |
| [DOCUMENTATION_COVERAGE_REPORT.md](docs/DOCUMENTATION_COVERAGE_REPORT.md) | Document coverage audit & operational gap analysis |
| [PITCH_DECK.md](docs/PITCH_DECK.md) | Product pitch deck |

---

## 🗺️ User Flow

```
Home Page → Enter topic/upload file → Configure (depth, persona, language)
    ↓
Canvas Page → Interactive mind map (accordion tree / radial graph / compare view)
    ↓
Explore → Click nodes for explanations → Take quizzes → Generate images
    ↓
Chat → Ask follow-ups → Pin insights → Export as PDF
    ↓
Save → Library for later → Publish to Community → Share link
```

---

## 🤝 Contributing

1. Create a feature branch from `main`
2. Follow existing code conventions (TypeScript strict, Tailwind for styling)
3. Ensure `npm run typecheck` and `npm run lint` pass
4. Test your changes locally with `npm run dev`
5. Submit a pull request with a clear description

---

## 📄 License

Private repository. All rights reserved.
