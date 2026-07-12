# ADR-001: AI Provider Decision — Pollinations.ai as Primary Inference Backend

| Field | Value |
|---|---|
| **Status** | ✅ Accepted (Implemented) |
| **Date** | 2026-06-01 |
| **Author** | Principal Architecture Review Board |
| **Last Reviewed** | 2026-07-12 |
| **Supersedes** | None |
| **Superseded By** | N/A |

---

## Context

MindScape requires AI inference for the following capabilities:

1. **Structured mind map generation** from unstructured text, PDFs, images, YouTube transcripts, and websites
2. **Comparison map generation** — side-by-side analysis of two topics
3. **Streaming chat** with tool-use (web search, calculator, time)
4. **Image generation** — conceptual diagrams per mind-map node (Visual Insight Lab)
5. **Node enrichment** — 3-level explanations (Beginner/Intermediate/Expert) with real-world examples
6. **Adaptive quiz generation** with weak-area detection and remediation node synthesis
7. **Node synthesis (Knowledge Alchemy)** — fusing two nodes into a hybrid concept
8. **Multi-language translation** (50+ languages)
9. **FAQ and question generation** from generated mind maps
10. **Search-backed grounding** — real-time web search context for up-to-date maps

These workloads span **text generation** (structured JSON output), **vision** (image analysis), **search-grounded generation**, and **image synthesis** — each with different model suitability profiles.

---

## Decision Drivers

| Driver | Weight | Description |
|---|---|---|
| **Cost** | 🔴 Critical | Zero- or near-zero cost for a consumer product with no revenue model. Per-user AI credits must not create platform liability. |
| **BYOP Feasibility** | 🔴 Critical | Users must be able to bring their own API key without the platform paying for inference. |
| **Model Diversity** | 🟠 High | Need models for: fast/chat, creative/map, reasoning/depth, coding/safety, vision, image gen, search. |
| **Latency** | 🟠 High | Mind map generation (10–30s), streaming chat (<5s first token). |
| **JSON Reliability** | 🟠 High | Structured output (mind maps, comparisons, quizzes) requires reliable JSON generation. |
| **Image Generation** | 🟡 Medium | Concept diagrams per node — quality matters but not production-grade. |
| **Multi-Language** | 🟡 Medium | 50+ language support for both map content and UI. |
| **Vendor Lock-In** | 🟡 Medium | Should be able to switch providers with minimal code changes. |
| **Fallback Redundancy** | 🟢 Low | Acceptable to have a single provider if reliable enough; planned fallback for future. |

---

## Considered Alternatives

### 1. Direct OpenAI API

| Aspect | Assessment |
|---|---|
| **Cost** | ❌ $0.01–$0.10 per generation. For a consumer app with no subscription, this is prohibitive. |
| **BYOP** | ✅ Users can bring their own OpenAI key. |
| **Models** | ✅ GPT-4o (vision, structured output, streaming, image gen via DALL-E). |
| **JSON** | ✅ Market-leading structured output via `response_format`. |
| **Latency** | ✅ Sub-2s first token on GPT-4o-mini. |
| **Image Gen** | ✅ DALL-E 3 high quality. |
| **Lock-In** | ⚠️ OpenAI-specific API shape requires adapter. |
| **Verdict** | High quality but prohibitive cost for platform-subsidized usage. |

### 2. Direct Anthropic API

| Aspect | Assessment |
|---|---|
| **Cost** | ❌ $0.015–$0.075 per generation. Even more expensive than OpenAI. |
| **BYOP** | ✅ Users can bring their own Anthropic key. |
| **Models** | ✅ Claude 4 Sonnet (vision, streaming, long context). |
| **JSON** | ⚠️ Weaker structured output than OpenAI. |
| **Latency** | ✅ Sub-2s first token on Claude Haiku. |
| **Image Gen** | ❌ No image generation. |
| **Lock-In** | ⚠️ Anthropic-specific API shape. |
| **Verdict** | Excellent text/vision but expensive and no image gen. |

### 3. OpenRouter (Multi-Provider Gateway)

| Aspect | Assessment |
|---|---|
| **Cost** | ⚠️ Variable per model. Cheapest models (DeepSeek, Llama) are ~$0.001–$0.005 per generation. Free models available but limited. |
| **BYOP** | ✅ Users can bring their own OpenRouter key. |
| **Models** | ✅ Aggregates 200+ models across all providers. |
| **JSON** | ⚠️ Depends on underlying model. Some models (DeepSeek, Llama) produce less reliable JSON. |
| **Latency** | ⚠️ Varies by model and provider; generally 1–5s first token. |
| **Image Gen** | ✅ Supports multiple image providers (Flux, DALL-E via providers). |
| **Lock-In** | ✅ Unified API reduces lock-in to OpenRouter itself. |
| **Verdict** | Excellent as a fallback/aggregator. Higher complexity for primary provider. |

### 4. Google AI (Gemini API)

| Aspect | Assessment |
|---|---|
| **Cost** | ⚠️ Free tier available (60 req/min) but rate-limited. Paid tier $0.002–$0.01 per generation. |
| **BYOP** | ✅ Users can bring their own Google AI key. |
| **Models** | ✅ Gemini 2.5 Flash (vision, streaming, search grounding). |
| **JSON** | ⚠️ Structured output available but less reliable than OpenAI. |
| **Latency** | ⚠️ 2–5s first token; highly variable. |
| **Image Gen** | ❌ Imagen requires separate API. |
| **Lock-In** | ⚠️ Google-specific API shape. |
| **Verdict** | Viable but image gen requires a second provider. |

### 5. Self-Hosted (Ollama / vLLM)

| Aspect | Assessment |
|---|---|
| **Cost** | ⚠️ Server cost only ($20–$200/mo GPU required). |
| **BYOP** | ❌ Users can't bring self-hosted keys. |
| **Models** | ⚠️ Limited to open-weight models (Llama, Mistral, DeepSeek). |
| **JSON** | ⚠️ Weaker than API-provided structured output. |
| **Latency** | ❌ 5–30s per generation on consumer GPUs. |
| **Image Gen** | ⚠️ Stable Diffusion possible but separate setup. |
| **Lock-In** | ✅ Fully portable. |
| **Verdict** | Impractical for cloud-hosted multi-tenant app. |

### 6. Pollinations.ai ✅ (Chosen)

| Aspect | Assessment |
|---|---|
| **Cost** | ✅ **Free** for all models. Platform pays zero. Users pay via "Pollen" credits if they bring their own key. |
| **BYOP** | ✅ Native "Bring Your Own Pollen" model. Users create an account at [pollinations.ai](https://pollinations.ai), get a key, and paste it in settings. The key is stored in `user_config.pollinations_api_key` in Supabase. |
| **Models** | ✅ 20+ open-source models across 4 capability tiers: fast (Gemini Flash Lite, GPT-5 Nano, Step Flash), creative (Llama 4, Grok 3, Claude Haiku, MiniMax), reasoning (DeepSeek V3, Kimi K2), coding (Qwen3 Coder, Mistral). All accessible via a single OpenAI-compatible endpoint at `https://gen.pollinations.ai/v1/chat/completions`. |
| **JSON** | ✅ Models produce JSON reliably with proper prompting. Built-in JSON repair pipeline (`jsonrepair` → deep extraction → stack-based structural closure) ensures output consistency. |
| **Latency** | ✅ Fast models (gemini-fast, openai-fast, step-flash) achieve <3s first token. 10s timeout per attempt with 2 retries and automatic model rotation. |
| **Image Gen** | ✅ **Flux** via `https://gen.pollinations.ai/image` — free, high-quality concept art per mind-map node. Served via Pollinations' `image.pollinations.ai` CDN. |
| **Lock-In** | ✅ API is OpenAI-compatible. Dispatcher abstraction (`@/ai/client-dispatcher.ts` → `@/ai/providers/orchestrator.ts`) allows swapping providers with a config change. The `IAIProvider` interface (`@/ai/providers/types.ts`) supports multi-provider natively. |
| **Reliability** | ⚠️ Single provider risk. Provider monitor (`@/ai/provider-monitor.ts`) tracks degradation (25% failure threshold, 10-min cooldown). Automatic model rotation on 400/5xx with retry backoff. Planned OpenRouter fallback (see Future section). |

---

## Decision Outcome

**Pollinations.ai** is selected as the **sole production AI provider** for MindScape.

### Architecture

```
User Config (Supabase)
  └─ user_config.pollinations_api_key  ← user's own API key ("Bring Your Own Pollen")
  └─ user_config.image_model
  └─ user_config.text_model
         │
         ▼
resolveApiKey()                    ← @/app/actions.ts
  ├─ 1. Check user's stored API key in `user_config.pollinations_api_key`
  ├─ 2. Fall back to `POLLINATIONS_API_KEY` env var (system-level)
  └─ 3. Error if neither available → user prompted to add key
         │
         ▼
generateContent()                  ← @/ai/client-dispatcher.ts
  └─ orchestrate()                 ← @/ai/providers/orchestrator.ts
       └─ PollinationsAdapter      ← @/ai/providers/pollinations-adapter.ts
            └─ POST https://gen.pollinations.ai/v1/chat/completions
                 Headers: { Authorization: Bearer <key> }
                 Body: { messages, model, stream, response_format, max_tokens }

Model Selection (automatic, per capability):
  ├─ fast:    gemini-fast, openai-fast, step-flash, step-3.5-flash
  ├─ creative: llama, grok, minimax, claude-fast
  ├─ reasoning: deepseek, kimi-k2.6
  ├─ coding:  qwen-coder, mistral
  └─ vision:  openai (GPT-5 Mini), gemini, qwen-vl (rotated per attempt)

Image Generation:                    ← @/app/actions.ts, @/app/canvas/CanvasClient.tsx
  └─ GET https://gen.pollinations.ai/image/<prompt>
  └─ CDN: https://image.pollinations.ai/prompt/<prompt>

Health Monitoring:                   ← @/ai/provider-monitor.ts
  ├─ Tracks: { failures, successes, lastFailureAt, degradedUntil }
  ├─ Degradation threshold: 25% failure rate across sliding window of 20 calls
  ├─ Degrade duration: 10 minutes
  └─ Statuses: healthy → degraded → down

JSON Post-Processing Pipeline:       ← @/ai/pollinations-client.ts (inline) + @/ai/providers/post-processor.ts (exports)
  1. Strip markdown fences (```json ... ```)
  2. JSON.parse() — fast path
  3. jsonrepair() — library-based repair
  4. `_stripParameters` retry — on 400 errors, remove `response_format` & `max_tokens` to salvage response
  5. Manual structural repair — remove truncated fragments from incomplete generations
  6. Stack-based structural closure — close open brackets/braces with bracket-pair stack
  7. Deep extraction — recursive search through nested object for valid content (topic, mode, similarities, etc.)
  8. StructuredOutputError thrown on complete failure — exported from `post-processor.ts`, re-exported from `client-dispatcher.ts`

  Telemetry:                             ← @/ai/providers/orchestrator.ts → `ai_calls` table (Supabase)
  Every AI generation is recorded with:
  ├─ provider, model, prompt tokens, completion tokens
  ├─ success/failure status, error type, latency ms
  └─ user_id, task_type for per-user cost tracking
```

### Configuration Surface

| Variable | Purpose | Source |
|---|---|---|
| `POLLINATIONS_API_KEY` | System-level fallback API key (used when user hasn't provided their own) | `.env` (server) |
| `user_config.pollinations_api_key` | User's personal API key (BYOP) | Supabase DB |
| `user_config.image_model` | Preferred image model (default: Flux via Pollinations) | Supabase DB |
| `user_config.text_model` | Preferred text model override | Supabase DB |
| `AI_PROVIDER_TIMEOUT` | Request timeout in ms (default: 30000) | `.env` (server) |

### Content Security Policy

The CSP in `next.config.ts` explicitly allows Pollinations.ai domains:

```
img-src:      https://gen.pollinations.ai https://image.pollinations.ai https://pollinations.ai
connect-src:  https://gen.pollinations.ai https://image.pollinations.ai https://pollinations.ai
script-src:   https://cdn.pollinations.ai
```

---

## Trade-offs & Risks

### Trade-offs

| Decision | What We Gained | What We Gave Up |
|---|---|---|
| Pollinations as sole provider | Zero platform cost for AI inference | Single point of failure (no automatic failover) |
| BYOP model | No platform AI bill; users pay their own usage | Friction: every user must create a Pollinations account before generating maps |
| Free open-source models | Zero cost per generation | Occasional JSON quality issues requiring complex post-processing pipeline |
| OpenAI-compatible API shape | Easy to migrate to other providers | Pollinations-specific behavior (model availability, rate limits) still leaks through |
| Model auto-rotation | Graceful degradation on individual model failures | Inconsistent output quality across different models |

### Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Pollinations downtime** | Low | 🔴 Critical — no AI generation | Planned OpenRouter fallback; in-memory provider monitor detects degradation |
| **Model deprecation** | Medium | 🟡 Medium — map quality degrades | Model registry in `AVAILABLE_MODELS` array; periodic sync with Pollinations API |
| **API key exhaustion** | Medium | 🟡 Medium — user can't generate | Pre-generation key balance check (`checkPollinationsBalance`); user notified in settings |
| **Rate limiting** | Low | 🟢 Low — slow generation | Automatic retry with backoff (1s for 5xx, 2s for 429); model rotation on repeated 400s |
| **JSON parsing failures** | Medium | 🟡 Medium — map generation fails | 5-stage post-processing pipeline; `StructuredOutputError` with salvageable partial data |
| **Latency spikes** | Low-medium | 🟡 Medium — poor UX | 10s timeout per attempt; 2 retries; model rotation to faster alternatives |

---

## Future: OpenRouter Fallback (Planned)

An OpenRouter adapter is planned but not yet implemented. The architecture supports it:

- `client-dispatcher.ts` exports `type AIProvider = 'pollinations'` — this type will be extended to `'pollinations' | 'openrouter'`
- `orchestrator.ts` already has the routing infrastructure for multi-provider
- `provider-monitor.ts` tracks health per provider and can auto-failover
- The `IAIProvider` interface (`@/ai/providers/types.ts`) is the contract for new providers

**Implementation priority**: Medium (Roadmap Q3 2026)

**Trigger conditions**:
- Pollinations returns 5xx errors for >25% of requests in a 5-minute window
- Pollinates returns 402 (Insufficient Balance) for the system API key
- User explicitly selects OpenRouter in provider settings

---

## References

| File | Role |
|---|---|
| `@/ai/client-dispatcher.ts` | Backward-compatible facade — routes all AI requests through orchestrator |
| `@/ai/pollinations-client.ts` | Direct Pollinations API client with model selection, retry, JSON repair, deep extraction |
| `@/ai/providers/pollinations-adapter.ts` | Pollinations implementation of the `IAIProvider` interface |
| `@/ai/providers/orchestrator.ts` | Multi-provider orchestration, routing, and telemetry |
| `@/ai/providers/post-processor.ts` | JSON repair, schema validation, and mind map normalization |
| `@/ai/providers/types.ts` | `IAIProvider` interface and type definitions |
| `@/ai/provider-monitor.ts` | In-memory health tracking per provider |
| `@/lib/env.ts` | Environment variable validation |
| `next.config.ts` | CSP headers allowing Pollinations domains |
| `@/app/actions.ts` — `resolveApiKey()` | API key resolution (user key → system fallback → error) |
| `@/contexts/ai-config-context.tsx` | Client-side AI configuration context with balance refresh |
| `docs/ARCHITECTURE.md` | System architecture diagrams showing AI provider layer |

---

## Changelog

| Date | Change |
|---|---|
| 2026-06-01 | Initial ADR created |
| 2026-07-12 | Updated with production metrics, expanded `AVAILABLE_MODELS` registry, added post-processor pipeline reference, fixed use-text-to-speech reference |
