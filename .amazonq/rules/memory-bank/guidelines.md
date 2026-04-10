# MindScape - Development Guidelines

## Code Quality Standards

### File Directives
- Client components MUST start with `'use client'` as the first line
- Server actions MUST start with `'use server'` as the first line
- These directives are non-negotiable and always the very first line

### TypeScript Conventions
- Strict mode is enabled — no implicit `any` in new code
- Always define explicit interfaces for props, options, and return types
- Use discriminated unions for variant types (e.g., `MindMapData = SingleMindMapData | CompareMindMapData`)
- Export input/output types alongside functions: `export interface AIActionOptions { ... }`
- Use `type` for aliases, `interface` for object shapes
- Avoid `as any` casts; use proper type narrowing or explicit interfaces

### Naming Conventions
- **Files**: kebab-case (`use-mind-map-persistence.ts`, `ai-config-context.tsx`)
- **Components**: PascalCase (`MindMapAccordion`, `ChatPanel`)
- **Hooks**: camelCase with `use` prefix (`useMindMapPersistence`, `useAIConfig`)
- **Server Actions**: camelCase with `Action` suffix (`generateMindMapAction`, `chatAction`)
- **Contexts**: PascalCase with `Context`/`Provider` suffix (`AIConfigContext`, `AIConfigProvider`)
- **Constants**: SCREAMING_SNAKE_CASE for module-level (`TOAST_LIMIT`, `API_KEY_CACHE_TTL`, `EMPTY_ARRAY`)
- **Interfaces**: PascalCase, no `I` prefix (`PersistenceOptions`, `AIConfig`)

---

## Architectural Patterns

### Server Actions Pattern
All AI calls happen server-side in `src/app/actions.ts`. Every action follows this exact pattern:

```typescript
export async function generateMindMapAction(
  input: GenerateMindMapInput,
  options: AIActionOptions = {}
): Promise<{ data: MindMapData | null; error: string | null }> {
  try {
    const effectiveApiKey = await resolveApiKey(options);
    // ... call AI flow ...
    const sanitized = await mapToMindMapData(result, depth);
    return { data: sanitized, error: null };
  } catch (error) {
    console.error('Error in generateMindMapAction:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { data: null, error: `Failed to generate mind map: ${errorMessage}` };
  }
}
```

Key rules:
- Always return `{ data: T | null; error: string | null }` — never throw from actions
- Always call `resolveApiKey(options)` first to get the effective API key
- Always call `mapToMindMapData()` to sanitize AI output before returning
- Always set `sanitized.aiPersona = input.persona || 'Teacher'`
- Log errors with `console.error('Error in [ActionName]:', error)`

### API Key Resolution Chain
Always use `resolveApiKey(options)` — never access keys directly. The chain is:
1. Explicitly provided `options.apiKey`
2. User's Firestore profile (`getUserImageSettingsAdmin`)
3. Server environment variable (`process.env.POLLINATIONS_API_KEY`)

Server-side cache (5 min TTL) prevents repeated Firestore reads:
```typescript
const apiKeyCache = new Map<string, { key: string | undefined; timestamp: number }>();
const API_KEY_CACHE_TTL = 5 * 60 * 1000;
```

### Response Caching Pattern
Use `apiCache` from `@/lib/cache` for expensive AI operations:
```typescript
const cacheKey = `explain_${input.subCategoryName}_${input.mainTopic}_${input.explanationMode}`;
const cached = apiCache.get<ExplainMindMapNodeOutput>(cacheKey);
if (cached) return { explanation: cached, error: null };
// ... generate ...
if (result) apiCache.set(cacheKey, result);
```

### Custom Hook Pattern
Hooks follow a consistent structure:
1. Declare dependencies (user, firestore, toast, router)
2. Declare refs for stable callbacks (`useRef`)
3. Declare state
4. Define effects (load preferences, set up listeners)
5. Define callbacks with `useCallback`
6. Return a named object (not array)

```typescript
export function useMindMapPersistence(options: PersistenceOptions = {}) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const isSavingRef = useRef(false);
  
  // ... effects and callbacks ...
  
  return { aiPersona, updatePersona, subscribeToMap, saveMap, setupAutoSave };
}
```

### Context Pattern
Contexts always export both the Provider and a typed hook:
```typescript
const AIConfigContext = createContext<AIConfigContextType | undefined>(undefined);

export function AIConfigProvider({ children }: { children: React.ReactNode }) { ... }

export function useAIConfig() {
  const context = useContext(AIConfigContext);
  if (context === undefined) {
    throw new Error('useAIConfig must be used within an AIConfigProvider');
  }
  return context;
}
```

---

## React Patterns

### Stable Callback References
Use `useRef` to hold mutable values that shouldn't trigger re-renders or stale closures:
```typescript
const handleUpdateRef = useRef<(data: Partial<MindMapData>) => void>(() => {});
// Sync ref with actual function
useEffect(() => {
  handleUpdateRef.current = handleUpdateCurrentMap;
}, [handleUpdateCurrentMap]);
```

### Memoization Strategy
- `useMemo` for derived objects passed as props (prevents child re-renders):
  ```typescript
  const persistenceOptions = useMemo(() => ({
    onRemoteUpdate: (data: MindMapData) => handleUpdateRef.current(data),
    userApiKey: config.pollinationsApiKey,
  }), [config.pollinationsApiKey]);
  ```
- `useCallback` for all event handlers and callbacks passed to children
- Stable empty arrays as constants: `const EMPTY_ARRAY: never[] = [];`

### Dynamic Imports
Use `next/dynamic` for heavy client-only components:
```typescript
const ChatPanel = dynamic(() => import('@/components/chat-panel').then(mod => mod.ChatPanel), {
  ssr: false,
  loading: () => null
});
```

### Effect Cleanup
Always return cleanup functions from effects:
```typescript
useEffect(() => {
  let isCancelled = false;
  // async work...
  return () => { isCancelled = true; };
}, [deps]);
```

### Race Condition Prevention
Use refs to track in-progress operations:
```typescript
const isSavingRef = useRef(false);
if (isSavingRef.current) return;
isSavingRef.current = true;
try { ... } finally { isSavingRef.current = false; }
```

---

## Firestore Patterns

### Split Schema
Large mind maps use a split metadata/content schema:
- **Metadata doc**: `users/{uid}/mindmaps/{id}` — topic, stats, flags, thumbnailUrl
- **Content doc**: `users/{uid}/mindmaps/{id}/content/tree` — subTopics, compareData, explanations

Always check `hasSplitContent` flag when loading:
```typescript
if (meta.hasSplitContent) {
  const contentSnap = await getDoc(contentRef);
  result.data = { ...contentSnap.data(), ...meta, id: docSnap.id };
} else {
  result.data = { ...meta, id: docSnap.id };
}
```

### Atomic Writes
Use `writeBatch` for metadata + content updates:
```typescript
const batch = writeBatch(firestore);
batch.set(metadataRef, metadataFinal, { merge: true });
batch.set(contentRef, contentFinal);
await batch.commit();
```

### Undefined Field Sanitization
Firestore rejects `undefined` values. Always clean objects before saving:
```typescript
const clean = (obj: any, seen = new WeakSet()): any => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (seen.has(obj)) return undefined;
  // Skip Firestore FieldValues
  if (obj._methodName === 'serverTimestamp') return obj;
  seen.add(obj);
  // ... recursively clean ...
};
```

### Real-time Sync
Use `onSnapshot` for real-time listeners. Always check `hasPendingWrites` to avoid echo:
```typescript
const unsubMetadata = onSnapshot(metadataRef, (snapshot) => {
  if (snapshot.metadata.hasPendingWrites) return; // Skip local writes
  // ... process remote update ...
});
return () => { unsubMetadata(); unsubContent(); };
```

### Timestamp Comparison
Normalize Firestore Timestamps before comparing:
```typescript
const getMillis = (ts: any) => {
  if (!ts) return 0;
  if (typeof ts === 'number') return ts;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.toDate === 'function') return ts.toDate().getTime();
  return 0;
};
```

---

## AI Integration Patterns

### mapToMindMapData Normalization
Always pass raw AI output through `mapToMindMapData()` before use. It:
- Assigns stable IDs (`topic-${Math.random().toString(36).substr(2, 9)}`)
- Strips trailing punctuation from names: `.trim().replace(/[:.!?]$/, '')`
- Ensures `tags` is always an array
- Sets `isExpanded: false` on all SubCategories
- Handles both `single` and `compare` modes

### Depth Resolution
Use `resolveDepthFast()` for rule-based depth (no LLM call):
```typescript
const depth = (input.depth === 'auto' || !input.depth)
  ? await resolveDepthFast(topic)
  : input.depth as 'low' | 'medium' | 'deep';
```

### Parallel Operations
Use `Promise.all` for independent async operations:
```typescript
const [searchResultA, searchResultB] = await Promise.all([
  generateSearchContext({ query: input.topic1, ... }),
  generateSearchContext({ query: input.topic2, ... }),
]);
```

### AI Options Propagation
Always spread options into AI flow calls:
```typescript
const result = await generateMindMap({
  ...input,
  topic,
  depth,
  ...options,
  apiKey: effectiveApiKey,
});
```

---

## UI & Styling Patterns

### Class Merging
Always use `cn()` from `@/lib/utils` for conditional classes:
```typescript
import { cn } from '@/lib/utils';
className={cn("base-classes", condition && "conditional-class", props.className)}
```

### Glassmorphism Style
Dialogs and panels use consistent glassmorphism:
```
className="glassmorphism border-white/10"
```

### Orbitron Font for Labels
UI labels, dialog titles, and uppercase text use the Orbitron font:
```
className="font-orbitron uppercase tracking-widest text-[10px] font-bold"
```

### Rounded Corners
- Buttons: `rounded-2xl`
- Dialogs/Cards: `rounded-[2rem]`
- Small elements: `rounded-full`

### Color Palette
- Primary gradient: `from-purple-600 to-indigo-600`
- Hover gradient: `from-purple-500 to-indigo-500`
- Destructive: `text-red-500`, `bg-red-500/10`, `border-red-500/20`
- Muted text: `text-zinc-400`, `text-zinc-500`
- Borders: `border-white/10`, `border-white/5`
- Backgrounds: `bg-black/60`, `bg-white/5`

### Error State Pattern
```tsx
if (error) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 ... animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/20 ...">
        <ZapOff className="h-10 w-10 text-red-500" />
      </div>
      {/* error message + action buttons */}
    </div>
  );
}
```

### Loading State Pattern
```tsx
if (isLoading) return <NeuralLoader />;
```

---

## Toast Notification Pattern
The toast system uses a global singleton (not React Context):
```typescript
const { toast } = useToast();

// Success
toast({ title: 'Map Saved!', description: 'Your mind map has been saved.' });

// Error
toast({ variant: 'destructive', title: 'Save Failed', description: err.message });

// Achievement (with duration)
toast({ title: '🏆 Achievement Unlocked!', description: '...', duration: 6000 });
```

---

## Import Path Conventions
- Always use `@/` alias for src imports: `import { cn } from '@/lib/utils'`
- Group imports: external libs → internal types → internal components → internal hooks/utils
- Barrel exports via `index.ts` for component directories (`@/components/canvas`, `@/components/mind-map`)

---

## Background Operations Pattern
Non-blocking operations (thumbnail generation, analytics) use fire-and-forget:
```typescript
// Start background task — don't await
generateThumbnailInBackground(finalId);

// Log analytics — don't block main flow
logAdminActivityAction({ type: 'MAP_CREATED', ... }).catch(e => console.error(e));
```

---

## Auto-Save Pattern
3-second debounced auto-save via `setupAutoSave`:
```typescript
const timer = setTimeout(() => {
  persistFn(true); // silent = true (no toast)
}, 3000);
return () => clearTimeout(timer);
```

---

## Session Storage Pattern
Use `safeGetItem`/`safeRemoveItem` from `@/lib/storage` (never raw `sessionStorage`):
```typescript
const sessionContent = safeGetItem<{file?: string; text?: string}>(`session-content-${sessionId}`);
safeRemoveItem(`session-type-${sessionId}`);
```

---

## Suspense Wrapping
Pages that use `useSearchParams` or other client hooks must be wrapped in Suspense:
```tsx
export default function MindMapPage() {
  return (
    <TooltipProvider delayDuration={300}>
      <Suspense fallback={<NeuralLoader />}>
        <MindMapPageContent />
      </Suspense>
    </TooltipProvider>
  );
}
```

---

## Testing Conventions
- Test files in `__tests__/` subdirectories alongside source
- Use `@testing-library/react` for component tests
- Use `jest-environment-jsdom` for DOM tests
- Module alias `@/` maps to `<rootDir>/src/` in Jest config
- Coverage collected from `src/**/*.{js,jsx,ts,tsx}` excluding `.d.ts` and `.stories.*`
