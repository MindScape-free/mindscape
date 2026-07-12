# 📓 MindScape — Technical Debt Registry

This registry tracks architectural, structural, and implementation debt in the MindScape codebase, listing each item's impact, complexity, and priority.

---

## 📋 Debt Register

### 1. Monolithic Server Actions File (`src/app/actions.ts`)
- **Description**: A single 1,443-line file contains 30+ server actions handling everything from AI map generation to translate commands and admin functions.
- **Impact**: Poor code readability, high risk of merge conflicts, hard to test, violates Single Responsibility Principle.
- **Remediation**: Split the file into domain-focused server action files (e.g. `src/app/actions/generation.ts`, `src/app/actions/nodes.ts`, `src/app/actions/admin.ts`).
- **Priority**: 🔴 **CRITICAL** | **Effort**: Medium (2 days)

### 2. Giant Component Files
- **Description**: Multiple UI components exceed 50KB in file size:
  - `chat-panel.tsx` (152.2 KB)
  - `mind-map.tsx` (73.1 KB)
  - `compare-view.tsx` (58.6 KB)
  - `explanation-dialog.tsx` (57.4 KB)
- **Impact**: Slow component compilation, high cognitive load for maintainers, performance lags, difficult refactoring.
- **Remediation**: Decompose each component into smaller, single-responsibility files inside subfolders (e.g., `src/components/chat/`).
- **Priority**: 🔴 **CRITICAL** | **Effort**: High (3-4 days)

### 3. Incomplete Test Coverage
- **Description**: The project has only two test suites (`depth-analysis` and `points-engine`). There are zero unit, integration, or E2E tests for core pathways (Auth, Streaming chat, Map rendering, and database transactions).
- **Impact**: Code changes could silently break critical system functions.
- **Remediation**: Add unit tests for server actions and hooks, and configure Cypress or Playwright for critical user flow testing (generation → canvas → chat).
- **Priority**: 🟠 **HIGH** | **Effort**: High (5 days)

### 4. Direct Database Operations in Components
- **Description**: Components occasionally trigger database queries directly via client-side Supabase references instead of relying on custom API routes or server actions.
- **Impact**: Spreads query logic across the UI layer, complicates security policy reviews, couples UI components directly with the database schema.
- **Remediation**: Standardize all database read/write operations through clean database hooks or server actions.
- **Priority**: 🟠 **HIGH** | **Effort**: Medium (2 days)

### 5. Stale / Dead Files
- **Description**: The codebase contains unused utility scripts and configuration files in the root folder (e.g., `test-db.js`, `pmodels.json`, `pollinations_models.json`, `cors.json`), as well as an empty `src/constants/` folder.
- **Impact**: Noise in the repository, confuses new developers, increases disk storage footprint.
- **Remediation**: Delete all unused configuration files and empty directories.
- **Priority**: 🟢 **LOW** | **Effort**: Low (2 hours)

### 6. Dependency Configuration Issues
- **Description**: `@testing-library/dom` is listed under the `dependencies` key in `package.json` rather than `devDependencies`.
- **Impact**: Increases the production bundle size and server container image footprints unnecessarily.
- **Remediation**: Move the testing library packages to `devDependencies`.
- **Priority**: 🟢 **LOW** | **Effort**: Low (10 minutes)

### 7. React Compiler & ESLint Hook Failures
- **Description**: Linter audits (`npm run lint`) identify 92 active compilation errors and 57 hook-related warnings across the codebase.
- **Critical Violations**:
  - **Ref access during render**: `chat-panel.tsx` directly modifies ref values (`latestMindMapDataRef.current = mindMapData`, etc.) during render phases, violating React's rendering idempotence constraints.
  - **Synchronous state update inside effects**: Several components (including `chat-panel.tsx`) call `setState` synchronously within the body of a `useEffect` loop.
  - **Memoization Preservation**: `use-mind-map-persistence.ts` fails to satisfy memoization preservation rules, causing the compiler to skip key optimisations.
- **Impact**: Code fails pipeline builds, bypasses performance optimizations, and risks rendering bugs due to unexpected state updates.
- **Remediation**: Wrap ref updates in `useEffect`, defer synchronous state updates using `setTimeout` or transition events, and clean hook dependencies.
- **Priority**: 🟠 **HIGH** | **Effort**: Medium (2 days)
