# 📡 MindScape — API & Server Actions Reference

This document serves as the technical reference for all API routes and Next.js Server Actions implemented in MindScape.

---

## ⚡ Server Actions (`src/app/actions.ts` & `src/app/actions/`)

All AI-generation and mutation actions are run server-side as Next.js Server Actions. They automatically resolve API keys from database/settings, call appropriate AI flows, validate schema outputs, log events, and award XP.

### Core Map Generation Actions

#### `generateMindMapAction`
- **Purpose**: Generates a standard hierarchical mind map from a text topic.
- **Input**:
  ```typescript
  topic: string,
  depth: 'low' | 'medium' | 'deep' | 'auto',
  persona: 'Teacher' | 'Concise' | 'Creative' | 'Sage',
  language: string,
  options?: AIActionOptions
  ```
- **Returns**: `Promise<{ data?: MindMapData; error?: string }>`
- **XP Awarded**: `MAP_CREATED` (+20 XP)

#### `generateMindMapFromImageAction`
- **Purpose**: Generates a mind map from an uploaded image (extracts context using OCR/vision first).
- **Input**: `base64Image: string, depth: string, persona: string, language: string, options?: AIActionOptions`
- **Returns**: `Promise<{ data?: MindMapData; error?: string }>`
- **XP Awarded**: `MAP_CREATED` (+20 XP)

#### `generateMindMapFromPdfAction`
- **Purpose**: Generates a mind map from parsed PDF text content.
- **Input**: `pdfText: string, depth: string, persona: string, language: string, options?: AIActionOptions`
- **Returns**: `Promise<{ data?: MindMapData; error?: string }>`
- **XP Awarded**: `MAP_CREATED` (+20 XP)

#### `generateMindMapFromTextAction`
- **Purpose**: Generates a mind map from raw pasted text/notes.
- **Input**: `text: string, depth: string, persona: string, language: string, options?: AIActionOptions`
- **Returns**: `Promise<{ data?: MindMapData; error?: string }>`
- **XP Awarded**: `MAP_CREATED` (+20 XP)

#### `generateYouTubeMindMapAction`
- **Purpose**: Generates a mind map from a YouTube video transcript.
- **Input**: `youtubeUrl: string, depth: string, persona: string, language: string, options?: AIActionOptions`
- **Returns**: `Promise<{ data?: MindMapData; error?: string }>`
- **XP Awarded**: `MAP_CREATED` (+20 XP)

#### `generateMindMapFromWebsiteAction`
- **Purpose**: Scrapes a URL and generates a mind map from the scraped content.
- **Input**: `url: string, depth: string, persona: string, language: string, options?: AIActionOptions`
- **Returns**: `Promise<{ data?: MindMapData; error?: string }>`
- **XP Awarded**: `MAP_CREATED` (+20 XP)

#### `generateComparisonMapAction`
- **Purpose**: Generates a side-by-side comparative knowledge structure for two topics.
- **Input**: `topicA: string, topicB: string, depth: string, persona: string, language: string, options?: AIActionOptions`
- **Returns**: `Promise<{ data?: CompareMindMapData; error?: string }>`
- **XP Awarded**: `MAP_COMPARE` (+20 XP)

---

### Node Interaction Actions

#### `explainNodeAction`
- **Purpose**: Generates a 3-level explanation (Beginner, Intermediate, Expert) for a specific concept node.
- **Input**: `topic: string, nodeName: string, nodeContext: string, options?: AIActionOptions`
- **Returns**: `Promise<{ data?: ExplainMindMapNodeOutput; error?: string }>` (Cached using server `apiCache`)
- **XP Awarded**: `EXPLANATION_OPENED` (+5 XP)

#### `explainWithExampleAction`
- **Purpose**: Generates a real-world analogy/example to explain a node.
- **Input**: `nodeName: string, nodeContext: string, options?: AIActionOptions`
- **Returns**: `Promise<{ data?: ExplainWithExampleOutput; error?: string }>`
- **XP Awarded**: `EXPLANATION_COMPLETED` (+5 XP)

#### `synthesizeNodesAction`
- **Purpose**: Integrates/fuses two nodes together to generate a hybrid conceptual node (Knowledge Alchemy).
- **Input**: `nodeA: string, nodeB: string, mapContext: string, options?: AIActionOptions`
- **Returns**: `Promise<{ data?: any; error?: string }>`
- **XP Awarded**: `ALCHEMY_FUSION` (+10 XP)

---

### Chat & Study Actions

#### `chatAction`
- **Purpose**: Single-turn chat QA with the map assistant (non-streaming, mostly fallback).
- **Input**: `messages: any[], mapContext: string, options?: AIActionOptions`
- **Returns**: `Promise<{ data?: ChatWithAssistantOutput; error?: string }>`
- **XP Awarded**: `CHAT_MESSAGE` (+2 XP)

#### `generateQuizAction`
- **Purpose**: Generates a multi-question quiz based on the map's concepts.
- **Input**: `topic: string, mapData: any, difficulty: string, options?: AIActionOptions`
- **Returns**: `Promise<{ data?: Quiz; error?: string }>`
- **XP Awarded**: `QUIZ_COMPLETED` (+15 XP)

#### `generateQuizDepthNodesAction`
- **Purpose**: Generates remedial sub-nodes to help the user learn weak quiz areas (Adaptive Deepening).
- **Input**: `mapData: any, weakTags: string[], options?: AIActionOptions`
- **Returns**: `Promise<{ data?: any; error?: string }>`

---

### Utility Actions

#### `checkPollenBalanceAction`
- **Purpose**: Fetches the user's current Pollen balance from Pollinations.ai.
- **Input**: `apiKey: string`
- **Returns**: `Promise<{ balance: number }>`

#### `translateMindMapAction`
- **Purpose**: Translates an entire mind map structure into a target language.
- **Input**: `mapData: any, targetLanguage: string, options?: AIActionOptions`
- **Returns**: `Promise<{ data?: MindMapData; error?: string }>`
- **XP Awarded**: `MAP_TRANSLATED` (+10 XP)

#### `awardPointsAction` (`src/app/actions/award-points.ts`)
- **Purpose**: Direct client trigger to award XP for gamified activities.
- **Input**: `userId: string, eventType: PointEventType, metadata?: any`
- **Returns**: `Promise<{ data?: AwardResult; error?: string }>`

---

## 🌐 API Routes (`src/app/api/`)

These endpoints handle streaming chat sessions, external integrations (scraping, audio), client-side telemetry ingestion, and admin actions.

### 1. Streaming Chat (`POST /api/chat/stream`)
- **Purpose**: Server-Sent Events (SSE) streaming endpoint for the AI Chat Panel.
- **Payload**:
  ```json
  {
    "messages": [ { "role": "user", "content": "..." } ],
    "mapId": "uuid",
    "useSourceContext": true,
    "sourceText": "optional parsed file content"
  }
  ```
- **Response**: `text/event-stream` stream containing raw tokens, tool execution tags, and recommended follow-up questions.

### 2. Conceptual Image Generation (`POST /api/generate-image`)
- **Purpose**: Generates an image representing a concept node via Pollinations Flux.
- **Payload**: `{ "prompt": "concept description" }`
- **Response**: JSON containing the generated image URL. Rate-limited per IP.

### 3. Text-to-Speech (`POST /api/generate-audio`)
- **Purpose**: Generates an audio reading of the mind map summary.
- **Payload**: `{ "text": "summary content" }`
- **Response**: Audio stream (mp3/wav) for immediate browser playback.
- **XP Awarded**: `AUDIO_GENERATED` (+10 XP)

### 4. Website Content Scraper (`POST /api/scrape-url`)
- **Purpose**: Extract text content from URLs using Jina or Cheerio fallback.
- **Payload**: `{ "url": "https://example.com" }`
- **Response**: `{ "text": "raw markdown or text contents", "title": "page title" }`

### 5. YouTube Transcript Extractor (`POST /api/youtube-transcript`)
- **Purpose**: Retrieves transcripts/captions from a video ID.
- **Payload**: `{ "url": "https://youtube.com/watch?v=..." }`
- **Response**: `{ "transcript": "video captions text concatenated" }`

### 6. PDF Extractor (`POST /api/extract`)
- **Purpose**: Backend file parser fallback for document analysis.
- **Payload**: Multi-part form data containing a file.
- **Response**: `{ "text": "extracted document text" }`

### 7. Ingest Telemetry (`POST /api/analytics/track`)
- **Purpose**: Client-side AnalyticsTracker flush destination. Ingests page performance and event logs in batches.
- **Payload**: `{ "events": [ { "eventName": "...", "properties": {} } ] }`
- **Response**: `{ "status": "success", "processed": N }`

---

## 🔒 Admin API Routes (`src/app/api/admin/`)

*All requests must be accompanied by a Supabase JWT Bearer token verifying the user's Admin status in the custom admin UUID list.*

### 1. Admin Dashboard Metrics (`GET /api/admin/unified`)
- **Purpose**: Aggregates users list, activity logs, public feedback lists, health logs, and platform counters in one unified response.
- **Query Params**: `scope=full` or `userId=<uuid>`
- **Response**: Combined dashboard payload (cached with 60s TTL).

### 2. Manual Recompute (`POST /api/admin/recompute`)
- **Purpose**: Triggers database execution of `recompute_all_user_profiles()` and/or `recompute_platform_stats()`.
- **Response**: `{ "status": "success", "message": "recompute completed" }`

### 3. Realtime Stats Sync (`POST /api/admin-sync`)
- **Purpose**: Target for Cron execution to sync stats metrics every 24h.
- **Response**: `{ "status": "success" }`
