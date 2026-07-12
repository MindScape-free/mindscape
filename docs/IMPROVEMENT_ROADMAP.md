# 🚀 MindScape — Product Improvement Roadmap

A strategic development plan detailing recommended steps for refactoring technical debt, updating dependencies, and expanding the feature set.

---

## 📅 Roadmap Overview

```
  Short-Term (1-3 Months)      Medium-Term (3-6 Months)       Long-Term (6-12 Months)
┌─────────────────────────┐   ┌──────────────────────────┐   ┌───────────────────────────┐
│ • Secure Admin API      │   │ • Upgrade to React 19    │   │ • Real-time Collaboration │
│ • Refactor God Files    │   │ • OpenRouter Fallback    │   │ • Mobile Wrapper (Tauri)  │
│ • Write Server Tests    │   │ • Canvas Render Update   │   │ • Custom Model Tuning     │
│ • Fix Dev Dependencies  │   │ • Action Rate Limiting   │   │ • Offline Mode Support    │
└─────────────────────────┘   └──────────────────────────┘   └───────────────────────────┘
```

---

## 🛠️ Phases & Deliverables

### Phase 1: Security & Stability (1-3 Months)

The focus of this phase is resolving immediate security concerns, structural debt, and developer friction.

- [ ] **Secure Admin endpoints**: Add server-side validation using `isUserAdminServer()` inside all `/api/admin/*` handlers to block client-side bypass attempts.
- [ ] **Refactor `actions.ts`**: Split the 1,440-line monolithic file into domain-specific actions (e.g. `actions/maps.ts`, `actions/chat.ts`, `actions/admin.ts`).
- [ ] **Refactor `chat-panel.tsx`**: Decompose the 152KB chatbot interface into individual sub-components (e.g. `chat-input.tsx`, `quiz-module.tsx`, `history-sidebar.tsx`).
- [ ] **Dependency cleanup**: Move `@testing-library/dom` and unused development assets out of production dependencies in `package.json`.
- [ ] **Add server tests**: Write unit tests for core server actions (`actions.ts`) to enable safe refactoring in later phases.

---

### Phase 2: Platform Modernization & Scaling (3-6 Months)

This phase aims to upgrade underlying dependencies, optimize rendering performance, and establish redundancy.

- [ ] **Upgrade to React 19**: Clean up the current package version mismatch. Resolve package discrepancies to officially support React 19's rendering enhancements and async transitions.
- [ ] **Implement OpenRouter fallback**: Write the planned OpenRouter client integration to ensure automatic fallback routes if Pollinations.ai experiences latency or downtime.
- [ ] **HTML5 Canvas migration**: Upgrade the visual tree renderer in `mind-map-tree-view.tsx` from SVG to HTML5 Canvas to support high-density mind maps (>200 nodes) without frame rate drops.
- [ ] **Action Rate-Limiting**: Implement IP-based rate limiting on server generation actions using Redis to protect against bot spamming and balance depletion.

---

### Phase 3: Collaborative & Mobile Ecosystems (6-12 Months)

This phase expands the product's reach and introduces collaboration tools.

- [ ] **Real-time collaboration**: Introduce operational transformation or CRDTs (using Yjs or Supabase Broadcast channels) to enable multiple users to edit the same mind map concurrently.
- [ ] **Tauri Mobile wrapper**: Package the web application into a desktop and mobile app wrapper using Tauri, enabling offline caching and local database synchronization.
- [ ] **Custom AI Model Tuning**: Add a developer dashboard allowing teams to select custom models or link their own OpenAI/Anthropic keys for generation.

---

## 📚 Reference Handbooks

For detailed implementation and operational information, refer to:
- [System Architecture Diagram](ARCHITECTURE.md) — System layers and provider maps
- [Technical Debt Registry](TECHNICAL_DEBT.md) — Current refactoring logs and priorities
- [Coding Standards & Guidelines](CODING_STANDARDS.md) — Code convention and folder standards
- [Security Audit Register](SECURITY_AUDIT.md) — Hardening goals and RLS policies
