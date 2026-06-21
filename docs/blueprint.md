# MindScape — Full Website Blueprint

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js 16 (App Router)                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Pages   │  │  API     │  │ Actions   │  │ Layout   │   │
│  │  (10+)   │  │  Routes  │  │ (Server)  │  │ Providers│   │
│  └──────────┘  │  (15+)   │  └──────────┘  └──────────┘   │
│                └──────────┘                                │
├─────────────────────────────────────────────────────────────┤
│  Contexts: Auth → AIConfig → Notifications → Activity → XP │
├─────────────────────────────────────────────────────────────┤
│  External: Supabase (DB/Auth) │ Pollinations.ai (LLM/Img)  │
│            Google APIs │ Jina │ YouTube                     │
└─────────────────────────────────────────────────────────────┘
```

- **Stack**: Next.js 16 + TypeScript + Tailwind CSS + shadcn/ui + Framer Motion
- **State**: Context providers (6 nested) + Custom hooks + localStorage
- **Database**: Supabase PostgreSQL with 10+ tables
- **AI**: Pollinations.ai for text & image generation

---

## 2. User Flows (Starting Points)

### Flow A: First-Time Visitor → Mind Map

```
[Land on /] → See hero + 3 input modes → Enter topic
    ↓
Choose Persona (Teacher|Concise|Creative|Cognitive Sage)
    ↓
Choose Depth (Quick|Balanced|Detailed|Auto)
    ↓
[Optional] Choose Language (30+ languages)
    ↓
Click "Generate" → Server Action → Pollinations.ai API
    ↓
Redirect to /canvas with ?topic=... → Map renders
```

**Key files**: `src/app/page.tsx` → `HomeClient.tsx`, `src/app/actions.ts` → `generateMindMapAction`, `src/app/canvas/page.tsx` → `CanvasClient.tsx`, `src/components/mind-map.tsx`

### Flow B: Source-Based Generation

```
[Home page] → Choose source type (5 options):

  PDF:     Upload file → /api/extract → generateMindMapFromPdfAction
  Image:   Upload file → OCR → generateMindMapFromImageAction
  URL:     Enter URL  → /api/scrape-url → generateMindMapFromWebsiteAction
  Text:    Paste text → generateMindMapFromTextAction
  YouTube: Enter URL  → /api/youtube-transcript → generateYouTubeMindMapAction

All → /canvas?source=...&mode=...
```

### Flow C: Compare Mode

```
[Home page] → Click "Compare" tab → Enter Topic A + Topic B
    ↓
generateComparisonMapAction → AI generates parallel/merged map
    ↓
Canvas renders with side-by-side or merged comparison view
```

### Flow D: Multi-Source Merge

```
[Home page] → Click "Multi-Source" tab → Add multiple sources
    ↓
useMultiSource hook collects items → AI synthesizes into one unified map
```

---

## 3. Authentication System

```
┌──────────────────────────────────────────────────────┐
│                Supabase Auth (SSR)                    │
│                                                       │
│  Options:  [Email + Password]  [Google OAuth]        │
│                                                       │
│  Signup: /signup → signUp() → auto-login             │
│  Login:  Dialog → signIn() or signInWithGoogle()     │
│  OAuth:  → /auth/callback → token exchange → home    │
│                                                       │
│  Session: Cookie-based (1hr JWT, refresh rotation)    │
│  Admin:   env var or is_admin column check           │
└──────────────────────────────────────────────────────┘
```

- **Provider**: `AuthProvider` wraps entire app → exposes `user`, `session`, `signIn`, `signUp`, `signOut`, `resetPassword`
- **Files**: `src/lib/auth-context.tsx`, `src/lib/client.ts`, `src/lib/server.ts`

---

## 4. Canvas Experience (Core — `/canvas`)

`CanvasClient.tsx` (1559 lines) is the orchestrator:

```
┌─────────────────────────────────────────────────────────┐
│  CanvasClient.tsx (orchestrator)                        │
│                                                         │
│  ├── MindMap component (2085 lines)                     │
│  │   ├── Accordion hierarchy (parent → children →       │
│  │   │   nested children)                               │
│  │   ├── Node actions: Explain, Example, Quiz, Image   │
│  │   ├── Persona: Teacher|Concise|Creative|Cognitive    │
│  │   ├── Depth: Quick|Balanced|Detailed|Auto            │
│  │   ├── Language: 30+ language options                 │
│  │   ├── Expand sub-map / collapse all                  │
│  │   ├── Save / Load / Share / Export / Download        │
│  │   ├── Side-by-side compare view                      │
│  │   └── Empty state when no data yet                   │
│  │                                                      │
│  ├── ChatPanel (side drawer)                            │
│  │   ├── AI chat about current map                      │
│  │   ├── Quiz mode (generate + answer quiz)             │
│  │   ├── Pinned messages (CRUD via Supabase)            │
│  │   ├── Chat history (sessions per map)                │
│  │   └── Search references panel                        │
│  │                                                      │
│  ├── Top toolbar: Source type badges, Regen, Save,      │
│  │   Translate, Compare, Export, Share, Pins, Expand    │
│  │                                                      │
│  └── Universal Nested Maps dialog (map hierarchy)       │
└─────────────────────────────────────────────────────────┘
```

### Toolbar Actions

| Button | Action | Implementation |
|---|---|---|
| Regenerate | Dialog → new persona/depth → regenerates | `actions.ts:generateMindMapAction` |
| Save | Persists to `mindmaps` table | `use-mind-map-persistence.ts` |
| Load | Opens library of saved maps | `use-mind-map-persistence.ts` |
| Share | Generates share link, copies to clipboard | `use-map-sharing.ts` |
| Compare | Toggles side-by-side comparison | `CanvasClient.tsx` |
| Translate | Translates entire map via AI | `actions.ts:translateMindMapAction` |
| Audio | TTS summary | `/api/generate-audio` |
| Export | Export as data | `mind-map.tsx` |
| Expand All | Max depth | `mind-map.tsx` |
| Pinned Msgs | Opens pinned panel | `use-mind-map-pinned-messages.ts` |

### Node Interactions

| Action | Description |
|---|---|
| Click | Expand/collapse children accordion |
| Explain | `explainNodeAction` — AI explanation |
| Example | `explainWithExampleAction` — real-life example |
| Image | `/api/generate-image` — Pollinations.ai image |
| Quiz | `generateQuizFlow` — quiz about this node |
| Expand Sub-Map | Nested expansion of this node |
| Copy | Copy node text to clipboard |

---

## 5. AI Generation Pipeline

```
User Input (topic, PDF, URL, image, YouTube, text)
    │
    ▼
Server Action (e.g. generateMindMapAction)
    │
    ├── 1. Resolve depth (resolveDepthWithConfidence)
    │   ├── Quick    → low depth, ~3-5 nodes
    │   ├── Balanced → medium, ~6-10 nodes
    │   ├── Detailed → high, ~12-20 nodes
    │   └── Auto     → analyzeTopicComplexity → AI decides
    │
    ├── 2. Optional Search Context (generateSearchContext)
    │   └── Google Custom Search → top 5 → scraped content
    │
    ├── 3. Build prompt with persona, language, depth, context
    │
    ├── 4. Call Pollinations.ai (text generation)
    │   └── Models: flux-pro, flux-dev, luma, sdxl (rotated)
    │
    ├── 5. Parse JSON → MindMapData (mapToMindMapData validates)
    │
    ├── 6. Award XP (awardPoints action)
    │
    └── 7. Track analytics (trackGenerationComplete)
```

**Files**: `src/app/actions.ts` (1388 lines), `src/ai/` (AI engine), `src/lib/depth-analysis.ts`

---

## 6. Gamification / XP System

```
XPProvider (wraps entire app)
    │
    ├── 28 event types (src/types/points.ts)
    │   ├── MAP_CREATED (+20), MAP_SAVED (+5)
    │   ├── CHAT_MESSAGE (+2), QUIZ_ANSWERED (+3)
    │   ├── FEEDBACK_SUBMITTED (+5), DAILY_LOGIN (+10)
    │   └── STREAK_BONUS (×1.5, ×2.0 for 3/7 day streaks)
    │
    ├── 10 Ranks: Spark → Idea → Explorer → Mapper → ... → MindMaster (10000+ XP)
    │
    ├── Daily caps per event type
    ├── Level-up overlay animation on rank up
    └── Points page at /points explains all rules
```

**Files**: `src/contexts/xp-context.tsx`, `src/lib/points-engine.ts`, `src/app/actions/award-points.ts`

---

## 7. Community Features

```
/community → CommunityClient.tsx
    │
    ├── Browse public mind maps (public_mindmaps table)
    │   ├── Search by keyword
    │   └── Filter by category (Technology, Science, Education, etc.)
    │
    ├── Click map → Opens in /canvas with loaded data
    │
    └── Publish from Canvas → saved as public → appears in community
```

---

## 8. Library & Saving

```
/library → Library page
    │
    ├── Lists user's saved mind maps from mindmaps table
    ├── Search, sort by date/title
    ├── Click → opens in /canvas
    └── Delete maps
```

**Hook**: `use-mind-map-persistence.ts` handles save/load via Supabase.

---

## 9. Profile & Settings

```
/profile → Profile page (2064 lines)
    │
    ├── User info display
    ├── API Key management (user_settings table)
    ├── Model selection (default AI model)
    ├── Pollen balance (checkPollenBalanceAction)
    ├── Points & rank display
    ├── Points history ledger
    └── Account settings
```

**File**: `src/contexts/ai-config-context.tsx` (syncs settings via Supabase Realtime)

---

## 10. Admin Dashboard

```
/admin (gated by auth-context admin check)
    │
    ├── Live metrics (users, maps, sessions, nodes, images)
    ├── Activity log (30s refresh via Realtime)
    ├── User management (list + detail dialog)
    ├── AI Telemetry (token usage, costs, latency)
    ├── Feedback moderation (approve/delete)
    ├── Recompute stats button
    └── Debug panel
```

**Files**: `src/app/admin/page.tsx`, `src/components/admin/*`

---

## 11. Support Pages

| Page | Purpose |
|---|---|
| `/feedback` | Submit feedback (stored in `feedback` table) |
| `/changelog` | Version history (MDX from `docs/changelog/`) |
| `/points` | Explains XP system, ranks, earning rules |
| `/use-cases/visual-learning-tool` | SEO landing page |
| `/use-cases/ai-mind-map-generator` | SEO landing page |
| `/signup` | Registration form |

---

## 12. Knowledge Engine (SKEE)

```
src/knowledge-engine/index.ts
    │
    ├── Deterministic text analysis pipeline
    ├── Heading detection → section splitting
    ├── Keyword extraction (TF-IDF-like)
    ├── Relationship detection (co-occurrence, proximity)
    └── Output → structured context for AI prompts
```

Used as a quality gate — deterministic analysis output augments AI prompts with structured context.

---

## 13. API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/chat/stream` | POST | SSE streaming chat with search context |
| `/api/generate-image` | POST/GET | Pollinations image gen (rate-limited) |
| `/api/generate-audio` | POST | TTS audio summary |
| `/api/generate-quiz-direct` | POST | Direct quiz generation |
| `/api/extract` | POST | PDF/content extraction |
| `/api/scrape-url` | POST | Website scraping via Jina |
| `/api/youtube-transcript` | POST | YouTube transcript fetch |
| `/api/models` | GET | Available AI models list |
| `/api/admin/*` | Various | Dashboard data, stats, recompute |
| `/api/analytics/track` | POST | Client-side analytics |
| `/api/stats/public` | GET | Public platform stats |
| `/api/og` | GET | Open Graph image generation |

---

## 14. Database Schema

```
users (extends auth.users)
  id, email, display_name, avatar_url, is_admin, created_at, updated_at

user_settings
  user_id FK, pollinations_api_key, default_model, preferences

mindmaps
  id UUID PK, user_id FK, title, topic, source_type,
  content JSONB, language, persona, depth,
  created_at, updated_at, shared

chat_sessions
  id UUID PK, mindmap_id FK, user_id FK, title,
  messages JSONB[], pinned_messages JSONB[], created_at

public_mindmaps
  id UUID PK, mindmap_id FK, user_id FK,
  title, description, category, tags, likes, views, created_at

feedback
  id UUID PK, user_id FK, type, message, status, created_at, resolved_at

user_points
  user_id PK FK, total_points, rank, current_streak, last_daily_reset

point_transactions
  id UUID PK, user_id FK, event_type, points, metadata JSONB, created_at

ai_calls
  Telemetry records per AI call

admin_activity_log
  Admin audit trail
```

**Migrations**: `supabase/migrations/` (12 migration files)

---

## 15. Component Hierarchy

```
RootLayout (src/app/layout.tsx)
  ├── AuthProvider → AIConfigProvider → PollinationsAuthHandler
  │   → OnboardingWizard → NotificationProvider → ActivityProvider
  │   → XPProvider → TooltipProvider
  │
  ├── Navbar (global)
  │   ├── Logo, Links (Canvas, Community, Library, Changelog)
  │   ├── Points display (if logged in)
  │   └── Auth buttons (Login / User menu)
  │
  ├── Page Content (varies by route)
  │
  └── Toaster (notification stack)
```

---

## 16. Data Flow (Typical Generation)

```
1. User enters "Quantum Computing" on Home page
2. Selects persona "Teacher", depth "Balanced", language "English"
3. Clicks Generate
4. HomeClient.tsx:
   a. Generates search context (Google results)
   b. Calls generateMindMapAction (server action)
5. Server Action:
   a. Resolves depth → Balanced = 8-12 nodes
   b. Retrieves user's API key from cache or DB
   c. Builds prompt with persona, depth, search context
   d. Calls Pollinations.ai text API
   e. Parses JSON → MindMapData
   f. Awards XP (MAP_CREATED +20)
   g. Tracks analytics event
6. Client receives MindMapData
7. Router navigates to /canvas?topic=quantum-computing&...
8. CanvasClient renders MindMap component with data
9. User interacts: expand, explain, chat, quiz, etc.
```

---

## 17. Key Technical Patterns

| Pattern | Where |
|---|---|
| Server Actions | All mind map generation (`actions.ts`) |
| Streaming (SSE) | `/api/chat/stream` for real-time chat |
| Dynamic Import | ChatPanel loaded lazily |
| Error Boundary | Canvas wrapped in `ErrorBoundary` |
| In-Memory Cache | API responses, user API keys, balances |
| Rate Limiting | Image generation endpoint |
| Supabase Realtime | Activity log, user_settings sync |
| CSP | Strict policy via `next.config.ts` |
| Cron (Vercel) | Daily admin sync at midnight UTC |

---

## 18. Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_ADMIN_USER_IDS
POLLINATIONS_API_KEY
YOUTUBE_API_KEY
NEXT_PUBLIC_APP_URL
```
