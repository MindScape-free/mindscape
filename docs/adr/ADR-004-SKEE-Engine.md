# ADR-004: SKEE — Structural Knowledge Extraction Engine

| Field | Value |
|---|---|
| **Status** | ✅ Accepted (Implemented) |
| **Date** | 2026-06-01 |
| **Author** | Principal Architecture Review Board |
| **Last Reviewed** | 2026-07-12 |
| **Supersedes** | N/A |
| **Superseded By** | N/A |

---

## Context

MindScape generates mind maps from unstructured text (user topics, PDFs, website content, YouTube transcripts). The naive approach — sending raw text directly to an AI model and asking it to generate a structured mind map — has several failure modes:

| Failure Mode | Root Cause | Impact |
|---|---|---|
| **Hallucinated structure** | AI invents sections and sub-topics that don't exist in the source | Map is inaccurate, misleading for educational use |
| **Missed hierarchy** | AI flattens hierarchical documents into a single level | Map loses the original document's organization |
| **Keyword dilution** | AI focuses on superficial terms from the prompt, missing domain-specific concepts buried in the source | Map omits important content |
| **No source anchoring** | AI responses vary wildly between generations for the same source | Inconsistent results, non-reproducible |
| **Hallucinated headings** | Multi-source context loses section boundary information | AI writes incorrect section titles |

The solution is to **extract structural information deterministically** before the AI processes the content, then inject that structure as guidance into the AI prompt.

---

## Decision Drivers

| Driver | Weight | Description |
|---|---|---|
| **Determinism** | 🔴 Critical | Same input must always produce the same structural analysis. No randomness, no AI calls, no external dependencies. |
| **Zero Hallucination** | 🔴 Critical | Extracted headings must be actual text found in the document, not generated labels. |
| **No External Dependencies** | 🟠 High | No external NLP services, no ML models, no language-specific dependencies. Pure JavaScript running in any runtime. |
| **Speed** | 🟠 High | Must complete in <100ms for documents up to 10,000 words. |
| **Source-Type Agnostic** | 🟠 High | Must work equally well on PDF text, website content, YouTube transcripts, and plain text. |
| **Fallback Gracefulness** | 🟡 Medium | If the source has no detectable structure, fall back to paragraph-based splitting without producing misleading results. |
| **Awareness as Guidance** | 🟡 Medium | SKEE output is *guidance* injected into the AI prompt, not a constraint. The AI can override SKEE suggestions if appropriate. |

---

## Considered Alternatives

### 1. LLM-Based Structure Extraction

| Aspect | Assessment |
|---|---|
| **Accuracy** | ✅ Excellent at understanding document structure |
| **Cost** | ❌ Each document would cost $0.01–$0.05 just for structure extraction |
| **Latency** | ❌ 5–15s per document before AI map generation even starts |
| **Determinism** | ❌ Different responses for the same input (temperature, model rotation) |
| **Hallucination** | ❌ Known to invent sections, especially in PDF text with extraction artifacts |
| **Verdict** | Expensive, slow, and non-deterministic. Defeats the purpose of a pre-processing step. |

### 2. SKEE — Rule-Based Extraction (Chosen)

| Aspect | Assessment |
|---|---|
| **Accuracy** | ⚠️ Heuristic-based: good on well-structured documents, less accurate on informal text |
| **Cost** | ✅ $0 — no API calls, no external services |
| **Latency** | ✅ <10ms for typical documents (pure sync JS) |
| **Determinism** | ✅ Same input always produces identical output |
| **Hallucination** | ✅ Impossible — all headings are exact substrings of the input text |
| **Maintainability** | ⚠️ Pattern-based: requires updating regex patterns for new document formats |
| **Verdict** | Ideal for a pre-processing step that must be fast, free, and deterministic. |

---

## Decision Outcome

**SKEE** (Structural Knowledge Extraction Engine) is implemented as a 6-stage deterministic pipeline in `src/knowledge-engine/`. The pipeline is pure, synchronous, and stateless — no AI calls, no database queries, no side effects.

---

## Pipeline Architecture

```
Raw Text
   │
   ▼
┌──────────────────────────────────────────────────┐
│  1. Heading Detection        (heading-detector)   │
│     • 6 heuristic patterns                        │
│     • Position-tracking                          │
│     • Deduplication by proximity                 │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│  2. Section Splitting       (section-splitter)    │
│     • Split by heading positions                  │
│     • Preamble capture (text before first heading)│
│     • Fallback: paragraph-grouped chunks of 3     │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│  3. Keyword Extraction      (keyword-extractor)   │
│     • Per-section frequency counting              │
│     • Global frequency aggregation                │
│     • Stopword filtering (100+ English stopwords) │
│     • Min token length: 4 characters              │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│  4. Relationship Detection  (relationship-detector)│
│     • Phrase-based: 5 relational patterns         │
│     • Co-occurrence: keywords in same sentence    │
│     • Max: 20 relationships per document          │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│  5. Knowledge Graph         (graph-builder)       │
│     • 3 node types: section, keyword, concept    │
│     • 3 hierarchy levels                          │
│     • Edge types: contains, co-occurrence,        │
│       subset, component, example, related         │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│  6. Prompt Context         (graph-to-mindmap)     │
│     • Hierarchy tree visualization (ASCII)        │
│     • Relationship summaries                      │
│     • Top 10 global keywords                      │
│     • Injected into AI system prompt              │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
          Structured Context String
     (injected into AI generation prompt)
```

---

## Stage 1: Heading Detection (`src/knowledge-engine/heading-detector.ts`)

Detects document headings using **6 heuristic regex patterns**, run in sequence. Headings are deduplicated by position proximity (within 5 characters) and sorted by their position in the source text.

### Patterns

| # | Pattern | Example Match | Level Assignment |
|---|---|---|---|
| 1 | **Numbered headings** — digits with optional decimal sections | `3.1.2 Machine Learning` | Level = number of dot-separated segments |
| 2 | **Markdown headings** — `#`, `##`, `###` prefixes | `## Architecture Overview` | Level = number of `#` characters |
| 3 | **ALL-CAPS lines** — standalone uppercase lines (3–80 chars, <30 matches) | `INTRODUCTION` | Level = 1 |
| 4 | **Labeled headings** — Chapter/Section/Part/Appendix + number | `Chapter 4: Results` | Level = 1 |
| 5 | **Section colon** — Section/Chapter/Part + number + colon/dash | `Section 2: Entering Text` | Level = 1 |
| 6 | **Title-case between blank lines** — visually separated in PDFs | `The Architecture of Neural Networks` (surrounded by blank lines) | Level = 1 |

### Deduplication & Normalization

- **Position dedup**: Headings within 5 character positions are deduplicated (one pattern may match the same heading that another pattern already found)
- **Length filters**: Titles shorter than 3 chars or longer than 100 chars are rejected
- **ALL-CAPS guard**: Only used if fewer than 30 matches (avoids treating body text in all-caps as headings)
- **Level normalization**: Levels are shifted so the minimum detected level starts at 1 (e.g., if the first heading is `3.1`, all levels are offset by -2)

### Performance

`detectHeadings()` runs 6 regex patterns over the full text sequentially. For a 10,000-word document (~60 KB), execution time is typically <5ms in V8.

---

## Stage 2: Section Splitting (`src/knowledge-engine/section-splitter.ts`)

Uses the detected heading positions to split the text into logical sections.

### With Headings Present

```typescript
for each heading at position P[i]:
  start = text.indexOf(heading.title, P[i]) + heading.title.length
  end = P[i+1] || text.length
  content = text.slice(start, end).trim()
  if (content.length >= 20) → section { title, content, level }
```

- **Preamble capture**: Text before the first heading (if >50 chars) is captured as an "Overview" section
- **Content threshold**: Sections with <20 chars of content are discarded (likely page numbers, headers, or noise)

### Fallback: Paragraph Splitting (No Headings Detected)

If no headings are found, the text is split by double-newline boundaries into paragraphs, then grouped into chunks of 3 paragraphs each. Each chunk becomes a pseudo-section with a title extracted from the first sentence of the first paragraph.

This ensures that even completely unstructured text gets some section-level organization before keyword extraction.

### Edge Cases

| Scenario | Behavior |
|---|---|
| Text with only 1 heading | One section for that heading + preamble before it (if any) |
| Text with no headings and <3 paragraphs | Single section with full text |
| Text with headings but all sections <20 chars | Falls back to paragraph splitting |
| Heading text not found at expected position | Content start = heading position + 1 (skip the heading line) |

---

## Stage 3: Keyword Extraction (`src/knowledge-engine/keyword-extractor.ts`)

Frequency-based extraction with stopword filtering. No NLP dependencies, no TF-IDF, no embeddings.

### Algorithm

1. **Tokenize**: lowercase, strip non-alpha characters (except hyphens), split on whitespace
2. **Filter**: remove tokens <4 characters, remove tokens matching 100+ English stopwords
3. **Count**: accumulate frequency per term per section and globally
4. **Rank**: sort by frequency descending, take top N per section (default: 8) and globally (default: 15)

### Stopword List

100+ English stopwords filtered, including:
- Common function words: `the`, `and`, `that`, `which`, `about`
- PDF artifacts: `paper`, `study`, `figure`, `table`, `page`, `chapter`
- Vague terms: `important`, `various`, `several`, `different`, `result`

### Output

```typescript
{
  perSection: [
    { sectionTitle: "Introduction", keywords: [["network", 12], ["training", 8], ...] },
    { sectionTitle: "Methodology", keywords: [["algorithm", 15], ["dataset", 10], ...] },
  ],
  global: [["algorithm", 25], ["network", 20], ["training", 15], ...]
}
```

---

## Stage 4: Relationship Detection (`src/knowledge-engine/relationship-detector.ts`)

Two complementary approaches: **phrase-based** (pattern matching) and **co-occurrence** (same-sentence frequency).

### Phrase-Based Patterns (5 Types)

| Pattern | Regex | Relationship Type | Example |
|---|---|---|---|
| "X is a type/kind/form of Y" | `X (?:is a\|are) (?:type\|kind\|form\|subset\|branch) of Y` | `subset` | "CNN is a type of neural network" |
| "X consists of/comprises Y" | `X (?:consists of\|comprises\|contains\|includes) Y` | `component` | "The system consists of three modules" |
| "X such as Y" | `X such as Y` | `example` | "Languages such as Python" |
| "X is based on/relies on Y" | `X (?:is based on\|relies on\|depends on\|builds upon) Y` | `related` | "Gradient descent relies on backpropagation" |
| "X and Y" / "X vs Y" | `X (?:and\|vs\|versus) Y` | `related` | "Python and JavaScript" |

### Co-Occurrence Detection

1. Split text into sentences (by `.!?\n`)
2. For each sentence, check which of the global keywords appear
3. Every pair of keywords in the same sentence creates a `co-occurrence` edge
4. Deduplicated (the pair "A, B" is the same as "B, A")

### Output Cap

Maximum 20 relationships per document to keep the prompt injection compact. Explicit phrase-based relationships are prioritized over co-occurrence.

---

## Stage 5: Knowledge Graph Builder (`src/knowledge-engine/graph-builder.ts`)

Assembles a directed knowledge graph from the extracted sections, keywords, and relationships.

### Node Types

| Type | Level | Description | Example |
|---|---|---|---|
| `section` | 1 | Document section from heading detection | "Introduction", "Results" |
| `keyword` | 2 | Extracted keyword, linked to parent section | "algorithm", "dataset" |
| `concept` | 3 | Entity from relationship detection, not a keyword | "CNN", "Backpropagation" |

### Edge Types

| Type | Source → Target | Source |
|---|---|---|
| `contains` | section → keyword | Section-keyword mapping |
| `subset` | concept A → concept B | Phrase pattern "is a type of" |
| `component` | concept A → concept B | Phrase pattern "consists of" |
| `example` | concept A → concept B | Phrase pattern "such as" |
| `related` | concept A ↔ concept B | Phrase pattern "and"/"vs"/"depends on" |
| `co-occurrence` | concept A ↔ concept B | Same-sentence keyword proximity |

### Node ID Stability

Node IDs are deterministic slugified strings derived from the label: `toNodeId("Neural Networks", "sec")` → `sec_neural-networks`. The same document always produces identical node IDs, enabling cache-friendly graph operations.

---

## Stage 6: Prompt Context Generation (`src/knowledge-engine/graph-to-mindmap.ts`)

Converts the knowledge graph into a structured text string injected into the AI's system prompt.

### Output Format

```
DOCUMENT STRUCTURE DETECTED:
- Introduction (Key concepts: neural, network, learning, training, data)
  - Methodology (Key concepts: algorithm, gradient, backpropagation)
  - Results

CONCEPT RELATIONSHIPS FOUND:
  - CNN → is a type of neural network
  - Training → contains backpropagation
  - Gradient descent ↔ related to backpropagation

SUGGESTED MIND MAP HIERARCHY (use as structural guide):
├─ Introduction
│  ├─ neural
│  └─ network
├─ Methodology
│  ├─ algorithm
│  └─ gradient
│     └─ backpropagation

MOST IMPORTANT CONCEPTS: algorithm, network, training, learning, data, gradient, backpropagation
```

### Quality Gate

The orchestrator (`src/knowledge-engine/index.ts`) applies a quality gate before injecting SKEE context:

```typescript
const isLongDoc = text.length > 5000;
const isMeaningful = isLongDoc
  ? (headings.length >= 1 || sections.length >= 2 || totalKeywords >= 8)   // lenient
  : (headings.length >= 2 || sections.length >= 3 || totalKeywords >= 15);  // strict
```

If the analysis falls below threshold, an empty string is returned and no SKEE context is injected into the AI prompt. This prevents noisy, low-quality guidance from degrading AI generation.

---

## Integration Points

### Text-to-Map Flow (`src/ai/flows/generate-mind-map-from-text.ts`)

```typescript
const skeeResult = analyzeDocument(sourceToAnalyze);
const hasStructure = skeeResult.structuredContext.length > 0;
// Log stats for monitoring
if (hasStructure) console.log(`🧠 SKEE (text):`, skeeResult.stats);
// Inject into system prompt
const systemPrompt = `
${skeeSection}

Generate a comprehensive mind map with the following structure...`;
```

### PDF-to-Map Flow (`src/ai/flows/generate-mind-map-from-pdf.ts`)

```typescript
// Step 1: Clean PDF text
const cleaned = cleanPDFText(rawText);

// Step 2: SKEE structural analysis (deterministic)
const skeeResult = analyzeDocument(cleaned);

// Step 3: Adjust minSubTopics based on detected sections
const skeeSections = hasStructure ? skeeResult.stats.sectionsCreated : 0;
const minSubTopics = depth === 'low' ? Math.max(4, skeeSections) : ...;

// Step 4: Inject SKEE context into prompt
const skeeSection = hasStructure
  ? `CONTEXT FROM SOURCE DOCUMENT:\n${skeeResult.structuredContext}`
  : '';
```

### Separated: AI Concept Extraction (`src/knowledge-engine/concept-extractor.ts`)

**Note:** The `concept-extractor.ts` module is **not part of the deterministic SKEE pipeline**. It is an AI-powered module that uses `orchestrate()` to extract concepts from document chunks via LLM. It is used separately in:

- `src/ai/flows/summarize-chunk.ts` — parallel concept extraction during large PDF processing
- `src/ai/flows/generate-mind-map-from-pdf.ts` — concept extraction for enriched prompts

This module exists in the `knowledge-engine/` directory for organizational proximity but follows a completely different execution model (async, AI-backed, non-deterministic).

---

## Performance Characteristics

| Stage | Estimated Time (10K words) | Memory Allocation |
|---|---|---|
| Heading Detection | ~5ms | ~20 KB (regex state + matches) |
| Section Splitting | ~1ms | ~10 KB (section array) |
| Keyword Extraction | ~8ms | ~50 KB (frequency maps) |
| Relationship Detection | ~3ms | ~15 KB (edge array) |
| Graph Building | ~1ms | ~8 KB (node + edge structures) |
| Prompt Context | ~0.5ms | ~4 KB (output string) |
| **Total** | **~18.5ms** | **~107 KB** |

> **Note**: Times are estimated from logical operation complexity (regex passes × text length, Map operations × token count). Actual measurements on a modern V8 runtime (Node 22, MacBook M1) should be within ±30% of these estimates. All stages are synchronous and blocking — no async boundaries, no microtask scheduling.

---

## Edge Cases & Failure Scenarios

| Scenario | Behavior | Rationale |
|---|---|---|
| **Empty text / <100 chars** | Returns empty context with zeroed stats | Cannot extract meaningful structure |
| **Text with only body text, no headings** | Falls back to paragraph-by-paragraph splitting | Ensures sections exist for keyword extraction |
| **All-CAPS body text (e.g., legal documents)** | ALL-CAPS pattern matches many false positives; <30 match cap prevents flooding | Threshold tuned for typical academic/business documents |
| **Non-English text** | Stopwords are English-only; keyword extraction includes non-English tokens (min 4 chars) | Stopword filtering has no effect on non-English, but frequency counting still works |
| **Very short document (200–500 chars)** | May fall below quality threshold → no SKEE injection | Short docs don't need structural guidance; AI can handle them directly |
| **Document with only 1 heading** | One section + preamble; quality gate requires ≥1 heading for long docs (pass) | Single-heading documents still benefit from section boundary |
| **Table-heavy PDF text** | Extraction artifacts (numbers, scattered text) → poor heading/keyword detection | SKEE degrades gracefully (falls to paragraph mode, low keyword counts → below threshold → no injection) |
| **YouTube transcript (speaker turns)** | No headings → paragraph fallback; keywords from transcript content | Transcripts are inherently unstructured; keyword extraction helps AI identify topics |

---

## Testing Strategy

| Test Category | What to Test | File |
|---|---|---|
| **Heading detection** | Each of 6 patterns with positive and negative examples | `src/__tests__/unit/` *(planned)* |
| **Section splitting** | Correct boundary placement, preamble capture, fallback path | `src/__tests__/unit/` *(planned)* |
| **Keyword extraction** | Frequency accuracy, stopword filtering, per-section vs global | `src/__tests__/unit/` *(planned)* |
| **Relationship detection** | Phrase patterns, co-occurrence, deduplication, max cap | `src/__tests__/unit/` *(planned)* |
| **Graph building** | Node/edge creation, ID stability, hierarchy levels | `src/__tests__/unit/` *(planned)* |
| **Quality gate** | Above/below threshold for long and short docs | `src/__tests__/unit/` *(planned)* |
| **Integration** | Full pipeline: raw text → structured context, injection in text-to-map flow | `src/__tests__/integration/` *(planned)* |
| **Regression** | Same input across versions produces identical output | `src/__tests__/unit/` *(planned)* |

---

## Comparison: SKEE vs AI-Only Approach

| Aspect | AI-Only | SKEE + AI |
|---|---|---|
| **Heading accuracy** | Hallucinates headings | Zero hallucination — all headings from source text |
| **Cost** | Full AI cost per generation | SKEE is free (<20ms CPU) |
| **Latency** | 10–30s end-to-end | ~20ms SKEE + 5–15s AI = same or faster (better prompts → fewer retries) |
| **Determinism** | Different output each run | Identical SKEE output each run (AI still varies, but guided by stable structure) |
| **Large document handling** | Loses structure in long context | Sections extracted before AI, preserving hierarchy |
| **Multi-source merging** | Confuses sources | Each source analyzed independently, structure merged |
| **Code complexity** | Simple (one prompt) | Moderate (6 pipeline stages) |
| **Maintainability** | Low (prompt tuning) | Medium (pattern updates for new doc formats) |

---

## References

| File | Role |
|---|---|
| `src/knowledge-engine/index.ts` | Orchestrator: `analyzeDocument()` — runs the full 6-stage pipeline |
| `src/knowledge-engine/heading-detector.ts` | Stage 1: `detectHeadings()` — 6 heuristic patterns |
| `src/knowledge-engine/section-splitter.ts` | Stage 2: `splitSections()` — heading-based + paragraph fallback |
| `src/knowledge-engine/keyword-extractor.ts` | Stage 3: `extractKeywords()` — frequency + stopword filtering |
| `src/knowledge-engine/relationship-detector.ts` | Stage 4: `detectRelationships()` — 5 phrase patterns + co-occurrence |
| `src/knowledge-engine/graph-builder.ts` | Stage 5: `buildGraph()` — 3 node types, 6 edge types |
| `src/knowledge-engine/graph-to-mindmap.ts` | Stage 6: `graphToPromptContext()` — structured text for AI prompts |
| `src/knowledge-engine/concept-extractor.ts` | **Separate**: AI-powered concept extraction (not part of deterministic SKEE) |
| `src/ai/flows/generate-mind-map-from-text.ts` | Integration: SKEE context injected into text-to-map system prompt |
| `src/ai/flows/generate-mind-map-from-pdf.ts` | Integration: SKEE context + min sub-topics calculation for PDF-to-map |
| `src/ai/flows/summarize-chunk.ts` | Integration: AI-powered concept extraction for large documents |
| `src/lib/text-cleaner.ts` | Pre-processing: `cleanPDFText()` — removes PDF artifacts before SKEE |
| `src/lib/text-chunker.ts` | Pre-processing: `chunkText()` — sentence-boundary-aware chunking |
| `src/lib/depth-analysis.ts` | Related: rule-based topic complexity analysis (not part of SKEE) |
| `docs/ARCHITECTURE.md` | System architecture overview showing SKEE in the processing pipeline |

---

## Changelog

| Date | Change |
|---|---|
| 2026-06-01 | Initial ADR created |
| 2026-07-12 | Expanded with detailed pattern descriptions, quality gate thresholds, timing benchmarks, edge case catalog, and integration point analysis |
