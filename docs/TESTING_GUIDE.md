# 🧪 MindScape — Testing Guide

This document covers the testing strategy, test structure, and best practices for the MindScape codebase.

---

## 📊 Current Testing Status

| Metric | Status |
|---|---|
| **Test files** | 6 files |
| **Unit tests** | 4 (depth-analysis, points-engine, map-mappers, mind-map-render) |
| **Integration tests** | 2 (community-actions, mind-map-crud) |
| **E2E tests** | 0 ❌ |
| **AI flow tests** | 0 ❌ |
| **Hook tests** | 0 ❌ |
| **Server action tests** | 0 ❌ |
| **Coverage** | ~5% of total codebase |

---

## 🏗️ Test Structure

```
src/__tests__/
├── unit/                     # Pure logic unit tests
│   ├── map-mappers.test.ts   # DB row → object mapping
│   └── mind-map-render.test.tsx  # Mind map component rendering
├── integration/              # Multi-module integration tests
│   ├── community-actions.test.ts  # Server action + DB
│   └── mind-map-crud.test.ts      # CRUD operations
├── helpers/                  # Shared test utilities
│   ├── supabase-mock.ts      # Mock Supabase client
│   └── test-data.ts          # Fixtures and factories
src/lib/
├── depth-analysis.test.ts    # Topic complexity analysis
└── points-engine.test.ts     # XP points engine logic
```

---

## 🛠️ Setup

### Jest Configuration

The Jest configuration lives in `jest.config.ts` at the project root. See that file for the exact configuration. Key settings:
- **Environment**: `jest-environment-jsdom` (with `jest.setup.ts` for DOM matchers)
- **Transform**: `ts-jest` for TypeScript files
- **Module resolution**: `@/` → `src/` (mirrors `tsconfig.json` paths)

### Running Tests

```bash
npm test                  # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage report (~5% currently)
```

---

## 📝 Writing Tests

### 1. Unit Tests (Pure Logic)

Unit tests should test isolated functions without external dependencies.

```typescript
// Example: testing depth-analysis
import { analyzeTopicComplexity } from '@/lib/depth-analysis';

describe('analyzeTopicComplexity', () => {
  it('detects technical topics', () => {
    const result = analyzeTopicComplexity('React state management patterns');
    expect(result.technical).toBeGreaterThan(0);
    expect(result.complexity).toBeGreaterThanOrEqual(0);
  });

  it('detects comparison questions', () => {
    const result = analyzeTopicComplexity('Python vs JavaScript');
    expect(result.questionType).toBe('comparison');
    expect(result.multiConcept).toBeGreaterThan(0);
  });

  it('handles short simple topics', () => {
    const result = analyzeTopicComplexity('apple');
    expect(result.complexity).toBe(0);
  });
});
```

### 2. Integration Tests (Server Actions + DB)

Integration tests verify that server actions and database operations work together correctly.

```typescript
// Example: testing community actions
import { createMockSupabaseClient } from '@/__tests__/helpers/supabase-mock';

describe('community actions', () => {
  it('publishes a mind map', async () => {
    const supabase = createMockSupabaseClient();
    // ... test publish flow
  });
});
```

### 3. Component Tests (React Testing Library)

Component tests verify UI rendering and user interactions.

```typescript
// Example: testing mind map rendering
import { render, screen } from '@testing-library/react';
import { MindMap } from '@/components/mind-map';

describe('MindMap component', () => {
  it('renders topic hierarchy', () => {
    // ... render with mock data and assert structure
  });
});
```

---

## 📋 Recommended Test Coverage

### Priority 1: Critical Paths (Missing — Should Add ASAP)

| Area | Test Type | Effort | Why |
|---|---|---|---|
| **Server Actions** | Integration | 3 days | No tests for 20+ actions |
| **AI Flows** | Unit/Integration | 2 days | Core business logic is untested |
| **Auth flows** | Integration | 1 day | Login, signup, OAuth callback |
| **Mind map persistence** | Integration | 1 day | Save/load/delete operations |

### Priority 2: Feature Completeness

| Area | Test Type | Effort | Why |
|---|---|---|---|
| **Chat streaming** | Integration | 2 days | SSE endpoint is untested |
| **Quiz engine** | Unit | 1 day | Adaptive deepening logic |
| **Points engine** | Unit | 0.5 days | Already has basic tests, expand |
| **Hooks** | Unit | 2 days | 19 hooks with no tests |
| **XP system (context)** | Integration | 1 day | Award/tracking pipeline |

### Priority 3: Quality Assurance

| Area | Test Type | Effort | Why |
|---|---|---|---|
| **E2E (Playwright)** | E2E | 5 days | No end-to-end test coverage at all |
| **Accessibility** | Automated | 2 days | aXe / Lighthouse CI integration |
| **Performance** | Benchmark | 1 day | Lighthouse budgets |
| **API route handlers** | Integration | 2 days | 14 API routes with minimal tests |

---

## 🎯 Suggested Test Implementation

### Testing Server Actions

Server actions return `{ data, error }` tuples. Test them by calling them directly:

```typescript
import { generateMindMapAction } from '@/app/actions';

describe('generateMindMapAction', () => {
  it('returns error for empty topic', async () => {
    const result = await generateMindMapAction(
      { topic: '', depth: 'low', persona: 'Teacher', language: 'en' },
      { apiKey: 'test-key' }
    );
    expect(result.data).toBeNull();
    expect(result.error).toContain('at least 1 character');
  });

  it('returns data for valid topic', async () => {
    const result = await generateMindMapAction(
      { topic: 'Quantum Computing', depth: 'low', persona: 'Teacher', language: 'en', useSearch: false },
      { apiKey: 'test-key', provider: 'pollinations' }
    );
    expect(result.data).toBeDefined();
    expect(result.data?.topic).toBe('Quantum Computing');
  });
});
```

### Mocking Supabase

Use the mock helpers in `src/__tests__/helpers/supabase-mock.ts`:

```typescript
import { createMockSupabaseClient } from '@/__tests__/helpers/supabase-mock';

const mockSupabase = createMockSupabaseClient({
  user: { id: 'test-user-id' },
  // Optional: override specific table behaviors
  from: (table: string) => ({
    select: () => ({ /* mock chain */ }),
    insert: () => ({ /* mock chain */ }),
  }),
});
```

### E2E with Playwright

```typescript
// e2e/home-page.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should load and display hero section', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText(/MindScape|Knowledge|Visual/);
    await expect(page.locator('input[type="text"]')).toBeVisible();
  });

  test('should navigate to canvas after generating', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[placeholder*="topic"]', 'Quantum Computing');
    await page.click('button:has-text("Generate")');
    await page.waitForURL(/\/canvas/);
    await expect(page.locator('[data-testid="mind-map"]')).toBeVisible();
  });
});
```

---

## 📈 Coverage Targets

| Phase | Target | Timeline |
|---|---|---|
| **Phase 1** | 15% (add server action + AI flow tests) | 1 month |
| **Phase 2** | 30% (add hook + component tests) | 3 months |
| **Phase 3** | 50% (add E2E + integration for all features) | 6 months |
| **Phase 4** | 70% (maintain with CI gate) | 12 months |

---

## 🚦 CI Integration

### Pre-commit Hook (recommended)

```bash
# .husky/pre-commit
npm run typecheck
npm run lint
npm test
```

### GitHub Actions (recommended)

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test
```

---

## 🔍 Debugging Tests

### Common Issues

| Issue | Solution |
|---|---|
| `Cannot find module '@/lib/xxx'` | Check `tsconfig.json` paths — Jest uses `moduleNameMapper` |
| `ReferenceError: window is not defined` | Set `testEnvironment: 'jsdom'` or mock `window` |
| `TextEncoder is not defined` | In Node 18+, use `const { TextEncoder } = require('util')` or add to jest config: `globalThis.TextEncoder = require('util').TextEncoder` |
| `Supabase client error` | Use mock from `src/__tests__/helpers/supabase-mock.ts` |
| `Timer related test flakiness` | Use Jest fake timers: `jest.useFakeTimers()` |
