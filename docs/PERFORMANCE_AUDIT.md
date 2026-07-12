# ⚡ MindScape — Performance Audit Report

This report evaluates the runtime and bundle performance of the MindScape platform, identifies primary bottleneck elements, reviews server-side caching strategies, and suggests optimization paths.

---

## 📦 Bundle Size & Code Splitting

### Current Status
The production build produces several oversized chunks that delay Time to Interactive (TTI), particularly on the core workspace page (`/canvas`).

```
Route (app)                               Size             First Load JS
┌ src/app/canvas/page.tsx                 182 kB           310 kB
└ src/app/admin/page.tsx                  94 kB            212 kB
```

### Critical Bottleneck Components
1. **`chat-panel.tsx` (152.2 KB)**
   - **Issue**: Bundles markdown parsers (`react-markdown`), math rendering engines (`katex`), and code syntax highlighting (`prismjs`).
   - **Mitigation**: Successfully imported dynamically with `ssr: false` in `CanvasClient.tsx`, preventing blockages during initial canvas loads. However, opening the chat panel causes a heavy 150KB chunk load.
2. **`mind-map.tsx` (73.1 KB) & `compare-view.tsx` (58.6 KB)**
   - **Issue**: Load heavy animation logic (Framer Motion) and drawing libraries.
   - **Mitigation**: Splitting canvas configurations from rendering logic is advised.

---

## 💾 Caching Strategy & Memory Management

MindScape implements a three-tier server caching structure to minimize database reads and external network requests:

```
                  ┌──────────────────────────────┐
                  │          AI Request          │
                  └──────────────┬───────────────┘
                                 │
                   Check server-side memory caches
                                 │
         ┌───────────────────────┼────────────────────────┐
         ▼                       ▼                        ▼
    [apiCache]             [apiKeyCache]           [balanceCache]
 Explanations/Examples    User Keys (5m TTL)     Pollen Balances (15s)
```

- **Sweeper Daemon**: A background timer runs a sweep operation periodically to delete expired cache records, ensuring memory doesn't grow unbounded.
- **Session Storage**: The client caches large input payloads (OCR text, scraped sites) in `sessionStorage` (with a 5MB limit). This enables smooth navigation back and forth between `/` and `/canvas` without repeating scrapers/actions.

---

## 🔄 Rendering Bottlenecks

### 1. Canvas SVG Rendering vs Accordion
- The **Accordion View** (`mind-map-accordion.tsx`) uses native DOM elements and transitions, which renders instantly for hundreds of nodes.
- The **Radial Map View** (`mind-map-tree-view.tsx`) uses a custom SVG graph with pan-and-zoom controls. Re-rendering the SVG on every state update (e.g., node expansion) causes CPU spikes when the node count is high (>100).
- **Optimization**: Debounce layout recalculations on pan/zoom events, or utilize CSS transforms instead of SVG coordinate recomputations.

---

## 🛠️ Optimization Checklist

- [ ] **Dependency Splitting**: Move `react-markdown`, `katex`, and `prismjs` into a shared, vendor chunk loaded *only* when the chat panel or explanation dialog is opened.
- [ ] **React Server Components**: Convert heavy static detail pages like `/changelog` and `/points` into pure Server Components to eliminate client-side JS overhead.
- [ ] **Image Optimization**: Replace local PNG assets with modern WebP files. Configure default Next.js image loading dimensions.
- [ ] **Canvas Rendering**: Migrate from pure SVG rendering to HTML5 Canvas in `mind-map-tree-view.tsx` if node capacity exceeds 200 items.
