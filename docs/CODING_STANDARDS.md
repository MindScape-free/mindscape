# 📏 MindScape — Coding Standards & Guidelines

This document outlines the coding standards, patterns, and style conventions to be followed by developers working on the MindScape codebase.

---

## 📁 Directory Structure & Code Organization

```
src/
├── app/                  # App Router pages, server actions & API endpoints
│   ├── actions/          # Domain-specific Server Actions (new standard)
│   ├── api/              # API Route Handlers (SSE, scrapers, etc.)
│   └── (routes)/         # Layouts, Loading, Pages
├── components/           # React Components
│   ├── ui/               # Radix/Tailwind basic primitives (PascalCase)
│   ├── mind-map/         # Visual canvas interactive elements (kebab-case)
│   └── [feature]/        # Feature-scoped components
├── hooks/                # Custom React hooks (kebab-case)
├── lib/                  # Stateless pure utilities (kebab-case)
└── types/                # TypeScript interface declarations (kebab-case)
```

---

## ✏️ Naming Conventions

### 1. Files & Directories
- **React Components**: CamelCase or kebab-case (e.g. `recent-maps.tsx` or `RecentMaps.tsx`). The established standard in this repository is **kebab-case** for page sub-components (e.g. `explanation-dialog.tsx`) and **PascalCase** for global helpers (e.g. `LevelUpOverlay.tsx`).
- **Hooks**: Must start with `use-` followed by kebab-case (e.g., `use-mind-map-persistence.ts`).
- **Utilities & Types**: Kebab-case (e.g., `supabase-db.ts`, `mind-map.ts`).
- **Database Migrations**: Standard timestamp-prefixed filenames (e.g., `20260621000001_user_events_tables.sql`).

### 2. TypeScript / JavaScript
- **Interfaces / Types**: PascalCase, named descriptively (e.g., `MindMapData`, `PointEvent`). Avoid suffixing with `Type` or `Interface`.
- **Variables / Functions**: camelCase (e.g., `logUserEvent`, `awardPoints`).
- **Constants**: UPPER_SNAKE_CASE (e.g., `DAILY_CAPS`, `POINT_VALUES`).

---

## 🛡️ TypeScript Rules
- **No Implicit `any`**: All variables, parameters, and return types must be explicitly typed.
- **Type Guarding**: Use Zod schemas or custom validation utilities when handling external JSON payloads from AI or API calls.
- **Null Safety**: Always use optional chaining (`?.`) and nullish coalescing (`??`) when accessing nested properties.

---

## ⚡ Server Actions Pattern

All Next.js Server Actions must adhere to the following template:

```typescript
'use server';

import { getSupabaseClient } from '@/lib/supabase-db';
import { z } from 'zod';

const ActionInputSchema = z.object({
  id: z.string().uuid(),
});

export async function exampleAction(rawInput: unknown) {
  try {
    // 1. Validate Input
    const input = ActionInputSchema.parse(rawInput);

    // 2. Fetch/Write Database
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('items').select('*').eq('id', input.id).single();
    
    if (error) throw new Error(error.message);

    // 3. Return Standard Shape
    return { data, error: null };
  } catch (err) {
    console.error('[Action Error] description:', err);
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
```

---

## 🎨 UI Component Standards

- **Component Size**: Keep component files under 30KB (ideally under 500 LOC). **Current violations**: `chat-panel.tsx` (152KB), `mind-map.tsx` (73KB), `compare-view.tsx` (59KB), `explanation-dialog.tsx` (57KB) are priority refactoring targets.
- **Dynamic Imports**: Use `next/dynamic` with `ssr: false` for heavy, client-only components (e.g. ChatPanel, Canvas Tree Views) to optimize initial page load. Current usage: `ChatPanel` is dynamically imported on both home and canvas pages.
- **Tailwind CSS**: Use utility classes for styling. Avoid inline styles unless calculating dynamic canvas positions. Custom `@layer components` utilities like `glassmorphism`, `neo-convex`, and `neo-button` are defined in `globals.css`.
- **Framer Motion**: Use `AnimatePresence` for exit animations. Keep layout animation configurations simple to maintain render speeds. Avoid layout animations on node-heavy maps (>100 nodes).
- **Error Handling**: All Server Actions must return `{ data, error }` tuple. Never throw from actions — catch and return errors gracefully.
- **Console Logging**: Use `console.log` with emoji prefixes for production logging (e.g. `🔑`, `⚡`, `❌`). Keep console.log in production for debugging — no plan to remove them in the current codebase.
