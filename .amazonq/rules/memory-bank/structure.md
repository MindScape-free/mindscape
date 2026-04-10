# MindScape - Project Structure

## Root Directory
```
MindScape/
├── src/                    # All application source code
├── public/                 # Static assets (fonts, images, pdf.worker)
├── scripts/                # DB admin/maintenance scripts (ts-node)
├── .amazonq/rules/         # Amazon Q memory bank rules
├── .env / .env.local       # Environment variables
├── firebase.json           # Firebase hosting config
├── firestore.rules         # Firestore security rules
├── firestore.indexes.json  # Composite index definitions
├── next.config.ts          # Next.js configuration
├── tailwind.config.ts      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
├── jest.config.ts          # Jest test configuration
└── vercel.json             # Vercel deployment config
```

## Source Tree (`src/`)

### `src/app/` — Next.js App Router Pages
```
app/
├── page.tsx               # Homepage: hero, input, mode selector
├── layout.tsx             # Root layout with all providers
├── globals.css            # Global styles + CSS variables
├── actions.ts             # All server actions (main entry point)
├── canvas/page.tsx        # Mind map workspace (primary UI)
├── profile/page.tsx       # User settings, stats, preferences
├── community/page.tsx     # Public maps gallery
├── library/page.tsx       # Personal saved maps
├── admin/page.tsx         # Admin dashboard
├── about/page.tsx         # About page
├── changelog/             # Versioned changelog entries
├── feedback/page.tsx      # User feedback submission
├── signup/page.tsx        # Registration page
├── login/ (via dialog)    # Auth handled via login-dialog component
└── api/                   # API route handlers
    ├── youtube-transcript/ # GET: fetch YT captions
    ├── scrape-url/         # POST: web page extraction
    ├── generate-image/     # POST: AI image generation
    ├── generate-audio/     # POST: text-to-speech
    ├── chat/stream/        # Streaming chat endpoint
    ├── extract/            # Content extraction
    ├── models/             # Available AI models list
    ├── generate-quiz-direct/
    ├── analytics/track/
    ├── admin/              # Admin data endpoints
    ├── admin-sync/
    └── balance-stream/
```

### `src/ai/` — AI Layer
```
ai/
├── flows/                 # One file per AI capability
│   ├── generate-mind-map.ts           # Core map generation
│   ├── generate-mind-map-from-text.ts
│   ├── generate-mind-map-from-pdf.ts
│   ├── generate-mind-map-from-image.ts
│   ├── generate-mind-map-from-website.ts
│   ├── youtube-mindmap.ts
│   ├── chat-with-assistant.ts
│   ├── generate-quiz.ts
│   ├── translate-mind-map.ts
│   ├── explain-mind-map-node.ts
│   ├── explain-with-example.ts
│   ├── suggest-related-topics.ts
│   ├── generate-related-questions.ts
│   ├── summarize-topic.ts
│   ├── summarize-chunk.ts
│   ├── summarize-chat.ts
│   ├── categorize-mind-map.ts
│   ├── analyze-image-content.ts
│   └── enhance-image-prompt.ts
├── compare/               # Comparison mode flow
│   ├── flow.ts
│   ├── prompt.ts
│   └── schema.ts
├── schemas/               # Zod schemas for AI I/O validation
├── search/                # Web search integration
│   ├── google-search.ts
│   ├── search-normalizer.ts
│   └── search-schema.ts
├── pollinations-client.ts # HTTP client for Pollinations.ai API
├── client-dispatcher.ts   # Routes requests to correct AI model
├── mind-map-schema.ts     # Core Zod schema for MindMap output
└── provider-monitor.ts    # AI provider health monitoring
```

### `src/components/` — React Components
```
components/
├── ui/                    # shadcn/ui base components (accordion, button, dialog, etc.)
├── mind-map/              # Mind map visualization components
│   ├── mind-map-accordion.tsx    # Primary accordion view
│   ├── mind-map-radial-view.tsx  # Radial/graph view
│   ├── compare-view.tsx          # Side-by-side comparison
│   ├── mind-map-toolbar.tsx      # Actions toolbar
│   ├── leaf-node-card.tsx        # Terminal node display
│   ├── topic-header.tsx          # Map title/header
│   ├── explanation-dialog.tsx    # Node explanation modal
│   ├── image-generation-dialog.tsx
│   ├── mindflow-minimap.tsx      # Navigation minimap
│   └── MultiSourceInput.tsx      # Multi-source input UI
├── chat/                  # MindSpark chat components
│   ├── quiz-card.tsx
│   ├── quiz-result.tsx
│   ├── PinnedMessageChatDialog.tsx
│   └── PinnedMessagesBar.tsx
├── canvas/                # Canvas-specific utilities
│   ├── BlobPdfViewer.tsx
│   ├── SearchReferencesPanel.tsx
│   ├── SourceFileModal.tsx
│   └── SourceParser.ts
├── community/             # Community gallery card
├── admin/                 # Admin dashboard tabs/cards
├── feedback/              # Feedback form and display
├── loading/               # Neural loader animation
├── mind-map.tsx           # Main mind map orchestrator component
├── chat-panel.tsx         # MindSpark chat panel
├── navbar.tsx             # Top navigation
├── breadcrumb-navigation.tsx
├── model-selector.tsx     # AI model picker
├── onboarding-wizard.tsx
├── notification-center.tsx
└── [various dialogs]      # summary, example, nested-maps, etc.
```

### `src/contexts/` — React Contexts
| Context | Purpose |
|---------|---------|
| `ai-config-context.tsx` | AI model, persona, depth, language settings |
| `activity-context.tsx` | User activity tracking state |
| `notification-context.tsx` | In-app notification system |

### `src/hooks/` — Custom React Hooks
| Hook | Purpose |
|------|---------|
| `use-mind-map-persistence.ts` | Save/load maps to Firestore + sessionStorage |
| `use-mind-map-stack.ts` | Navigation stack for nested sub-maps |
| `use-mind-map-router.ts` | URL-based map routing |
| `use-mind-map-sync.ts` | Real-time Firestore sync |
| `use-chat-persistence.ts` | Chat history persistence |
| `use-streaming-chat.ts` | SSE streaming chat responses |
| `use-expansion-state.ts` | Node expand/collapse state |
| `use-multi-source.ts` | Multi-source input management |
| `use-session-storage.ts` | Browser sessionStorage wrapper |
| `use-local-storage.ts` | Browser localStorage wrapper |
| `use-toast.ts` | Toast notification system |
| `use-ai-health.ts` | AI provider health checks |
| `use-map-sharing.ts` | Public/shared map operations |
| `use-text-to-speech.ts` | Audio synthesis |
| `use-map-tracking.ts` | Map view/interaction analytics |

### `src/firebase/` — Firebase Integration
```
firebase/
├── config.ts              # Firebase app initialization
├── provider.tsx           # Auth context provider
├── client-provider.tsx    # Client-side Firebase provider
├── server.ts              # Firebase Admin SDK (server-side)
├── index.ts               # Exports
├── errors.ts              # Firebase error types
├── error-emitter.ts       # Error event bus
├── non-blocking-login.tsx # Background auth operations
├── non-blocking-updates.tsx
└── firestore/
    ├── use-collection.tsx # Firestore collection hook
    └── use-doc.tsx        # Firestore document hook
```

### `src/knowledge-engine/` — SKEE Document Pipeline
Processes raw documents into structured mind map data:
1. `heading-detector.ts` → Detect document headings
2. `section-splitter.ts` → Split into logical sections
3. `keyword-extractor.ts` → Extract key terms
4. `relationship-detector.ts` → Find concept relationships
5. `graph-builder.ts` → Build concept graph
6. `graph-to-mindmap.ts` → Convert graph to MindMap format
7. `concept-extractor.ts` → High-level concept extraction

### `src/lib/` — Utilities & Helpers
Key utilities:
- `utils.ts` — `cn()` class merger, general helpers
- `constants.ts` — App-wide constants
- `firestore-helpers.ts` — Client Firestore CRUD
- `firestore-server-helpers.ts` — Server Firestore operations
- `pdf-processor.ts` — PDF.js text extraction
- `text-chunker.ts` — Split large text for AI processing
- `json-repair.ts` — Fix malformed AI JSON responses
- `rate-limit.ts` — Upstash Redis rate limiting
- `cache.ts` — Response caching layer
- `storage.ts` — sessionStorage map persistence
- `serialize.ts` — Firestore timestamp serialization
- `achievements.ts` — Badge/achievement logic
- `analytics-tracker.ts` — Event tracking

### `src/types/` — TypeScript Definitions
| File | Key Types |
|------|-----------|
| `mind-map.ts` | `MindMapData`, `SubTopic`, `Category`, `SubCategory`, `CompareData` |
| `chat.ts` | `ChatMessage`, `PinnedMessage` |
| `admin.ts` | Admin dashboard types |
| `feedback.ts` | Feedback submission types |
| `multi-source.ts` | Multi-source input types |

## Architectural Patterns

### Data Flow
```
User Input → Server Action (actions.ts)
  → AI Flow (src/ai/flows/)
    → Pollinations Client (pollinations-client.ts)
      → AI Model API
    → Zod Schema Validation (mind-map-schema.ts)
  → MindMapData returned to client
    → Stored in sessionStorage + Firestore
    → Rendered by mind-map.tsx
```

### Server/Client Boundary
- Server Actions in `src/app/actions.ts` — all AI calls happen server-side
- API Routes in `src/app/api/` — streaming and external integrations
- Client components use hooks to call server actions via form actions or direct invocation

### State Management
- No Redux/Zustand — uses React Context + custom hooks
- Map data: sessionStorage (fast) + Firestore (persistent)
- UI state: local component state + React Context
- Auth state: Firebase Auth via context provider

### Firestore Collections
```
users/{userId}/
  settings/preferences
  mindmaps/{mindmapId}
  chatSessions/{sessionId}
  statistics/

publicMindmaps/{mindmapId}
sharedMindmaps/{mindmapId}
adminStats/{docId}
monthlyStats/{docId}
adminActivityLog/{docId}
```
