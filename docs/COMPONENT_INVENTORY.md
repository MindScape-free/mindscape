# 🧩 MindScape — Component Inventory

A comprehensive catalog of all components in the MindScape codebase, detailing their size, role, dependencies, and code hygiene status.

> **Note**: All sizes are actual byte counts measured from disk (`wc -c`). Previous documentation used approximate KB values which have been corrected.

---

## 🛠️ UI Primitives (`src/components/ui/`)
*These are foundational, design-system-aligned wrappers (built on Radix UI and Tailwind CSS).*

| Component | Size (bytes) | Size (KB) | Purpose | Key Dependencies | Status |
|---|---|---|---|---|---|
| `accordion.tsx` | 2,066 | 2.0 KB | Expandable content panels | `@radix-ui/react-accordion` | Clean |
| `alert-dialog.tsx` | 4,842 | 4.7 KB | Modal confirmation dialogs | `@radix-ui/react-alert-dialog` | Clean |
| `avatar.tsx` | 1,469 | 1.4 KB | Circular user profiles / images | `@radix-ui/react-avatar` | Clean |
| `badge.tsx` | 1,164 | 1.1 KB | Small contextual labeling | `class-variance-authority` | Clean |
| `button.tsx` | 1,936 | 1.9 KB | Interactive button triggers | `@radix-ui/react-slot` | Clean |
| `card.tsx` | 1,929 | 1.9 KB | Framed layout boxes | Vanilla CSS utilities | Clean |
| `checkbox.tsx` | 1,064 | 1.0 KB | Standard form inputs | `@radix-ui/react-checkbox` | Clean |
| `dialog.tsx` | 4,517 | 4.4 KB | Standard modal interfaces | `@radix-ui/react-dialog` | Clean |
| `dropdown-menu.tsx` | 7,643 | 7.5 KB | Context menu popovers | `@radix-ui/react-dropdown-menu` | Clean |
| `input.tsx` | 790 | 0.8 KB | Single-line form entry | standard inputs | Clean |
| `label.tsx` | 750 | 0.7 KB | Typography labels for inputs | `@radix-ui/react-label` | Clean |
| `loading.tsx` | 4,182 | 4.1 KB | Fallback skeleton & progress lines | Lucide icons | Clean |
| `scroll-area.tsx` | 1,719 | 1.7 KB | Scrollable area with custom scrollbars | `@radix-ui/react-scroll-area` | Clean |
| `select.tsx` | 6,169 | 6.0 KB | Form select fields | `@radix-ui/react-select` | Clean |
| `separator.tsx` | 803 | 0.8 KB | Divider lines | `@radix-ui/react-separator` | Clean |
| `sheet.tsx` | 4,515 | 4.4 KB | Slide-out side drawer panels | `@radix-ui/react-dialog` | Clean |
| `skeleton.tsx` | 276 | 0.3 KB | Async visual loading state | standard Tailwind anims | Clean |
| `switch.tsx` | 1,182 | 1.2 KB | Toggle switch controls | `@radix-ui/react-switch` | Clean |
| `table.tsx` | 2,880 | 2.8 KB | Data grids | standard table wrappers | Clean |
| `tabs.tsx` | 1,952 | 1.9 KB | Tabbed interface switcher | `@radix-ui/react-tabs` | Clean |
| `textarea.tsx` | 715 | 0.7 KB | Multi-line form entry | standard inputs | Clean |
| `toast.tsx` | 4,988 | 4.9 KB | Ephemeral popups | `@radix-ui/react-toast` | Clean |
| `toaster.tsx` | 821 | 0.8 KB | Application toast provider | hooks | Clean |
| `tooltip.tsx` | 1,320 | 1.3 KB | Hover labels | `@radix-ui/react-tooltip` | Clean |
| `text-overflow-tooltip.tsx` | 1,635 | 1.6 KB | Auto-tooltip on text truncation | `tooltip.tsx` | Clean |

---

## 🎨 Canvas & Mind Map Components (`src/components/mind-map/`)
*These visual representations of the hierarchical mind map graph form the primary user interface.*

| Component | Size (bytes) | Size (KB) | Purpose | Key Dependencies | Status |
|---|---|---|---|---|---|
| `compare-view.tsx` | 58,651 | 57.3 KB | Parallel Nexus comparison interface | Canvas layouts | ⚠️ **God Component** |
| `depth-badge.tsx` | 1,423 | 1.4 KB | Renders color-coded depth badges | badges | Clean |
| `explanation-dialog.tsx` | 57,574 | 56.2 KB | Detailed node explanation (3 levels + micro-quiz) | XP context, Lucide, Audio hooks | ⚠️ **God Component** |
| `GlobalPinnedMessagesDialog.tsx` | 25,097 | 24.5 KB | View and manage all pinned chat highlights | Supabase Context | Moderate |
| `image-generation-dialog.tsx` | 22,084 | 21.6 KB | Visual Insight Lab image generation UI | `/api/generate-image` | Moderate |
| `insight-card.tsx` | 3,038 | 3.0 KB | Contextual insight details card | badges | Clean |
| `leaf-node-card.tsx` | 15,028 | 14.7 KB | Renders a card for leaf nodes | Tooltip, Lucide | Clean |
| `mindflow-minimap.tsx` | 3,996 | 3.9 KB | Canvas navigation helper map | raw context | Clean |
| `mind-map-accordion.tsx` | 33,260 | 32.5 KB | Collapsible tree renderer for hierarchical nodes | Lucide, Framer Motion | ⚠️ **High Complexity** |
| `mind-map-toolbar.tsx` | 27,775 | 27.1 KB | Actions toolbar (Save, Translate, Export, etc.) | Lucide Icons, persistence hooks | Moderate |
| `mind-map-tree-view.tsx` | 40,220 | 39.3 KB | Radial/Interactive network graph renderer | Canvas, SVGs, Pan/Zoom | ⚠️ **High Complexity** |
| `mode-badge.tsx` | 1,930 | 1.9 KB | Renders color-coded mode badges | badges | Clean |
| `MultiSourceInput.tsx` | 4,034 | 3.9 KB | Input collector for merging multiple files | React Hook Form | Clean |
| `source-badge.tsx` | 5,050 | 4.9 KB | Renders badges for source formats | badges | Clean |
| `SourcePillList.tsx` | 5,517 | 5.4 KB | Render list of uploaded sources in layout | badges | Clean |
| `topic-header.tsx` | 12,476 | 12.2 KB | Title bar showing stats, modes, and metadata | badges | Clean |

Note: The `mind-map.tsx` orchestrator is listed separately in the standalone section below.

---

## 💬 Chat & Conversational Assistant (`src/components/chat/` & `src/components/chat-panel.tsx`)
*These handle real-time Q&A, streaming explanations, quizzes, and pinned messages.*

| Component | Size (bytes) | Size (KB) | Purpose | Key Dependencies | Status |
|---|---|---|---|---|---|
| `CreateMindmapDialog.tsx` | 16,711 | 16.3 KB | Dialog to create a mind map from chat content | Dialog, Button | Clean |
| `entity-action-menu.tsx` | 5,879 | 5.7 KB | Context menu for chat entity actions | motion, Lucide | Clean |
| `markdown-renderer.tsx` | 31,281 | 30.5 KB | Markdown rendering with math & code support | `react-markdown`, `katex`, `prismjs` | Moderate |
| `PinnedMessageChatDialog.tsx` | 12,472 | 12.2 KB | Per-message pinned chat dialog | Dialog, Button | Clean |
| `PinnedMessagesBar.tsx` | 2,256 | 2.2 KB | Top bar showing pinned messages shortcut | motion, Pin icon | Clean |
| `PinnedMessagesDialog.tsx` | 15,940 | 15.6 KB | Full pinned messages management dialog | Dialog, ScrollArea | Clean |
| `quick-explain-dialog.tsx` | 17,601 | 17.2 KB | Quick AI explanation popup for selected text | motion, Dialog | Clean |
| `quiz-card.tsx` | 8,347 | 8.2 KB | Quiz question card with options | motion, Check icon | Clean |
| `quiz-result.tsx` | 13,750 | 13.4 KB | Quiz score breakdown and per-tag performance | motion, Trophy icon | Clean |
| `recall-challenge.tsx` | 2,435 | 2.4 KB | Recall/spaced repetition challenge widget | motion, Brain icon | Clean |
| `text-selection-menu.tsx` | 2,885 | 2.8 KB | Select-to-explain popover overlay | Browser selection APIs | Clean |
| `thought-trace.tsx` | 4,086 | 4.0 KB | Expandable trace showing LLM reasoning steps | Framer Motion | Clean |

Note: `chat-message.tsx` was previously listed as ~25KB but has been decomposed into separate files (`markdown-renderer.tsx`, `entity-action-menu.tsx`, etc.). The monolithic `chat-panel.tsx` is listed in the standalone section.

---

## 🏆 Gamification & XP Ledger (`src/components/points/`)
*These render achievements, level bars, and custom XP animations.*

| Component | Size (bytes) | Size (KB) | Purpose | Key Dependencies | Status |
|---|---|---|---|---|---|
| `points-drawer.tsx` | 22,198 | 21.7 KB | Display ranks, streak calendars, and points history | `XPContext`, canvas stats | Moderate |
| `LevelUpOverlay.tsx` | 5,117 | 5.0 KB | Particle explosion animation overlay when user levels up | Framer Motion | Clean |
| `xp-toast.tsx` | 3,593 | 3.5 KB | Animated floating toast indicating "+15 XP" | Framer Motion | Clean |
| `rank-badge.tsx` | 1,377 | 1.3 KB | Contextual rank icon with color coding | Points Engine | Clean |

---

## 🔬 Admin & Dashboard Components (`src/components/admin/`)
*Server-moderated analytics dashboards and real-time trackers.*

| Component | Size (bytes) | Size (KB) | Purpose | Key Dependencies | Status |
|---|---|---|---|---|---|
| `DashboardTab.tsx` | 50,541 | 49.4 KB | Global stats graphs and visual activity heatmaps | Recharts, SWR | ⚠️ **Hygiene Issue** |
| `UsersTab.tsx` | 13,260 | 12.9 KB | User ledger with search and export | SWR | Clean |
| `UserDetailDialog.tsx` | 84,734 | 82.7 KB | Interactive drill-down of specific user's activity | Recharts | 🚨 **Severe** |
| `LogsTab.tsx` | 6,751 | 6.6 KB | Real-time audit logs feed | Supabase Realtime | Clean |
| `AITelemetryTab.tsx` | 16,180 | 15.8 KB | Performance / AI error logs tracking | Recharts | Moderate |
| `ActivityLogCard.tsx` | 10,984 | 10.7 KB | Individual activity log entry display | Copy, Check icons | Clean |
| `AdminCommon.tsx` | 4,004 | 3.9 KB | Shared admin UI utilities (loading, stats cards) | Loader2 icon | Clean |
| `AdminSkeletons.tsx` | 9,852 | 9.6 KB | Loading skeleton placeholders for admin panels | Skeleton | Clean |
| `ModerationCards.tsx` | 6,373 | 6.2 KB | Feedback moderation approve/delete cards | Supabase, User context | Clean |

> ⚠️ **Correction**: `UserDetailDialog.tsx` is **82.7 KB** (not ~25 KB as previously documented). It's the largest admin component and a prime refactoring target.

---

## 🏠 Homepage & Layout Components (`src/components/home/`)
*Hero sections, feature grids, stats counters, and input configurations.*

| Component | Size (bytes) | Size (KB) | Purpose | Key Dependencies | Status |
|---|---|---|---|---|---|
| `community-showcase.tsx` | 5,643 | 5.5 KB | Displays popular public maps on the landing page | Supabase | Clean |
| `daily-challenge-widget.tsx` | 4,688 | 4.6 KB | Renders current daily challenge criteria | XP Context | Clean |
| `faq-section.tsx` | 331 | 0.3 KB | FAQ section on home page (wraps global FAQSection) | FAQSection component | Clean |
| `feature-block.tsx` | 1,304 | 1.3 KB | Feature grid item card | LucideIcon | Clean |
| `process-step.tsx` | 1,869 | 1.8 KB | Step-by-step pipeline display (4-step) | LucideIcon | Clean |
| `quick-start-grid.tsx` | 25,037 | 24.5 KB | Hero input layout supporting PDF/YouTube drops | React Hook Form | Moderate |
| `recent-maps.tsx` | 5,822 | 5.7 KB | Displays user's recent mind maps as shortcuts | Persistence Hook | Clean |
| `section-container.tsx` | 941 | 0.9 KB | Section wrapper with title and subtitle | cn utility | Clean |
| `source-type-cards.tsx` | 8,177 | 8.0 KB | Home page grid cards describing input options | Lucide, motion | Clean |
| `stats-counter.tsx` | 5,376 | 5.3 KB | Dynamic counter animations showing platform totals | Framer Motion | Clean |

---

## 🧩 Standalone Components (`src/components/`)
*Major application-level components that don't belong to a specific feature folder.*

| Component | Size (bytes) | Size (KB) | Purpose | Key Dependencies | Status |
|---|---|---|---|---|---|
| `mind-map.tsx` | 74,142 | 72.4 KB | Core orchestrator for the mind map views | Framer Motion, Custom Hooks | ⚠️ **God Component** |
| `chat-panel.tsx` | 152,779 | 149.2 KB | Core sliding sheet for chat, quizzes, and history | `useStreamingChat`, `react-markdown` | 🚨 **Severe** |
| `navbar.tsx` | 12,788 | 12.5 KB | Global navigation bar + login triggers | Auth Context | Clean |
| `auth-form.tsx` | 17,194 | 16.8 KB | Sign in / Sign up form with email + Google OAuth | motion, AnimatePresence | Clean |
| `model-selector.tsx` | 12,124 | 11.8 KB | AI model selection dropdown (image/text) | Select, Badge | Clean |
| `onboarding-wizard.tsx` | 23,667 | 23.1 KB | 4-step guided walkthrough for first-time visitors | Framer Motion | Moderate |
| `notification-center.tsx` | 16,468 | 16.1 KB | Notification bell + dropdown panel | Sheet, ScrollArea | Clean |
| `pollinations-auth-handler.tsx` | 3,003 | 2.9 KB | Handles Pollinations API key auth flow | AIConfigContext | Clean |
| `breadcrumb-navigation.tsx` | 4,477 | 4.4 KB | Breadcrumb trail for nested map navigation | Button, Lucide | Clean |
| `error-boundary.tsx` | 3,121 | 3.0 KB | React error boundary with retry/home buttons | Class component | Clean |
| `changelog-dialog.tsx` | 5,980 | 5.8 KB | Version history changelog viewer | Dialog, ScrollArea | Clean |
| `login-dialog.tsx` | 2,044 | 2.0 KB | Login modal container | AuthForm | Clean |
| `example-dialog.tsx` | 5,334 | 5.2 KB | Real-world example display for concepts | Dialog, Copy | Clean |
| `ai-content-dialog.tsx` | 19,250 | 18.8 KB | All AI-generated content in one dialog | Dialog, ScrollArea | Clean |
| `summary-dialog.tsx` | 20,332 | 19.9 KB | AI-generated text summary + audio TTS | Dialog, TTS hook | Clean |
| `practice-questions-dialog.tsx` | 10,003 | 9.8 KB | Related practice questions dialog | motion, Dialog | Clean |
| `nested-maps-dialog.tsx` | 39,346 | 38.4 KB | Sub-map tree browser with hierarchy | Dialog, Lucide | Moderate |
| `image-gallery-dialog.tsx` | 16,216 | 15.8 KB | Generated image gallery view | Dialog, Image | Clean |
| `icons.tsx` | 1,767 | 1.7 KB | Custom icon components (logo, shields) | LucideProps, Image | Clean |
| `faq-section.tsx` | 6,084 | 5.9 KB | Reusable FAQ accordion component | Accordion, Search | Clean |

---

## 🖼️ Canvas-Specific Components (`src/components/canvas/`)
*Components used exclusively within the canvas/workspace page.*

| Component | Size (bytes) | Size (KB) | Purpose | Key Dependencies | Status |
|---|---|---|---|---|---|
| `BlobPdfViewer.tsx` | 3,081 | 3.0 KB | Inline PDF viewer for uploaded documents | object tag | Clean |
| `SearchReferencesPanel.tsx` | 4,754 | 4.6 KB | Search source references panel display | Lucide, motion | Clean |
| `SourceFileModal.tsx` | 4,044 | 3.9 KB | Source file preview/upload modal | Dialog, Lucide | Clean |

---

## 🔬 Debug & Monitoring (`src/components/debug/`)
*Development tools for performance profiling and monitoring.*

| Component | Size (bytes) | Size (KB) | Purpose | Key Dependencies | Status |
|---|---|---|---|---|---|
| `performance-monitor.tsx` | 3,916 | 3.8 KB | Render timing dashboard overlay | render-timing hook | Clean |
| `profiler.tsx` | 2,427 | 2.4 KB | React Profiler wrapper for measuring renders | React Profiler | Clean |

---

## 💬 Feedback (`src/components/feedback/`)
*User feedback form and display components.*

| Component | Size (bytes) | Size (KB) | Purpose | Key Dependencies | Status |
|---|---|---|---|---|---|
| `FeedbackForm.tsx` | 36,641 | 35.8 KB | Feedback submission form with type/category selection | Dialog, Form | Clean |
| `FeedbackCards.tsx` | 32,699 | 31.9 KB | Public feedback display with status tracking | Card, Badge | Moderate |

---

## 🌐 Community (`src/components/community/`)
*Community dashboard card components.*

| Component | Size (bytes) | Size (KB) | Purpose | Key Dependencies | Status |
|---|---|---|---|---|---|
| `community-card.tsx` | 18,888 | 18.4 KB | Public mind map card with author, views, actions | Auth context, Lucide | Clean |

---

## 🧠 Loading & AI (`src/components/loading/`)
*Animated loading states and neural network visuals.*

| Component | Size (bytes) | Size (KB) | Purpose | Key Dependencies | Status |
|---|---|---|---|---|---|
| `neural-loader.tsx` | 3,385 | 3.3 KB | Animated neural network pulse loader | motion | Clean |

---

## 🔎 SEO (`src/components/seo/`)
*Structured data and meta components for search engines.*

| Component | Size (bytes) | Size (KB) | Purpose | Key Dependencies | Status |
|---|---|---|---|---|---|
| `structured-data.tsx` | 1,576 | 1.5 KB | JSON-LD structured data injection for SEO | Script tag | Clean |

---

## 🚨 Critical Hygiene Summary

### God Components (≥30 KB, ranked by size)
These components are priority refactoring targets due to high coupling and bundle impact:

| Rank | Component | Size (KB) | Issues |
|---|---|---|---|
| 🥇 | `chat-panel.tsx` | **149.2 KB** | Bundles chat, quiz, PDF viewer, speech input, history, pinned messages, and export |
| 🥈 | `UserDetailDialog.tsx` | **82.7 KB** | Massively oversized (previously documented as ~25 KB); merges stats, maps, activity in one file |
| 🥉 | `mind-map.tsx` | **72.4 KB** | Canvas orchestration, sub-map handlers, export, sharing, context providers |
| 4 | `compare-view.tsx` | **57.3 KB** | Layout calculations + user event handlers for side-by-side maps |
| 5 | `explanation-dialog.tsx` | **56.2 KB** | Three sub-panels: explanations, micro-quizzes, Visual Insight Lab |
| 6 | `DashboardTab.tsx` | **49.4 KB** | Global stats, heatmaps, breakdowns (previously documented as ~30 KB) |
| 7 | `mind-map-tree-view.tsx` | **39.3 KB** | Custom pan/zoom + manual SVG rendering |
| 8 | `nested-maps-dialog.tsx` | **38.4 KB** | Sub-map tree browser |

### Action Plan for Component Hygiene
- **Extract sub-features** from god components into standalone files (e.g., extract quiz engine from `chat-panel.tsx`, extract stats grid from `UserDetailDialog.tsx`)
- **Move heavy math/SVG calculations** into pure-utility modules (`src/lib/`)
- **Use React hooks** for sharing rendering logic between components
- **Dynamic import** the heaviest components (`chat-panel.tsx` is already lazy-loaded; extend to `UserDetailDialog.tsx` and `DashboardTab.tsx`)

### Previously Listed but Status Uncertain

| Component | Size | Status | Reason |
|---|---|---|---|
| `chat-message.tsx` | — | ❌ No longer exists | Decomposed into `markdown-renderer.tsx`, `entity-action-menu.tsx`, and other chat sub-components |
| `remark-entity-link.ts` | 1,307 bytes (1.3 KB) | ✅ Still exists at `src/components/chat/remark-entity-link.ts` | Custom remark plugin for entity link mapping |
| `community-card.tsx` | 18,888 bytes (18.4 KB) | ✅ Added | Now listed under the Community section |
