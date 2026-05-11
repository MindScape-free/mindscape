# MindScape: Product Requirements Document (v2.0)

## 1. Executive Summary
**MindScape** is a high-fidelity visual intelligence engine designed to synthesize unstructured data (PDFs, URLs, YouTube, Images, Text) into interactive, multi-dimensional knowledge graphs. Unlike traditional mind-mapping tools, MindScape utilizes a deterministic pre-processing pipeline (**SKEE**) paired with generative AI to ensure structural integrity and grounding, preventing hallucinations in complex knowledge extraction.

## 2. Core Architecture & USP
### 2.1 The SKEE Pipeline (Smart Knowledge Extraction Engine)
MindScape differentiates itself through a 4-stage deterministic processing layer:
1. **Extraction**: Hybrid scraping (Cheerio) and parsing (PDF.js / Tesseract-like OCR via Vision AI).
2. **Structuring**: Automated heading detection and section splitting.
3. **Keyword Mapping**: Semantic keyword extraction and relationship detection.
4. **Synthesis**: LLM-driven schema generation grounded by the extracted structural context.

### 2.2 Cognitive Rendering Engine
- **Radial View**: Dynamic, SVG-based hierarchical visualization with auto-balancing layouts.
- **Canvas View**: Infinite-depth nesting (Recursive Sub-maps) allowing for fractal knowledge exploration.
- **Comparison Synapse**: Side-by-side conceptual analysis with "Unity Nexus" (shared concepts) identification.

## 3. Functional Requirements
### 3.1 Multi-Modal Ingestion
- **[FR-1.1]** Support for raw text (up to 50k tokens).
- **[FR-1.2]** PDF parsing with metadata extraction and structural preserving.
- **[FR-1.3]** Vision-based analysis of images (Infographics, handwritten notes).
- **[FR-1.4]** YouTube transcript synthesis with timestamped context.
- **[FR-1.5]** Multi-source aggregation (merging up to 5 disparate inputs into a unified graph).

### 3.2 AI Interaction Layer
- **[FR-2.1] MindSpark Assistant**: Context-aware RAG (Retrieval-Augmented Generation) chat interface.
- **[FR-2.2] Knowledge Alchemy**: Fusion of two disparate nodes to generate a hybrid "Nexus" concept.
- **[FR-2.3] Automated Pedagogy**: Generation of Micro-Quizzes and Spaced Repetition cues based on map content.

### 3.3 Governance & Telemetry
- **[FR-3.1] Admin Dashboard**: Real-time monitoring of platform-wide node distribution and AI performance.
- **[FR-3.2] Privacy Controls**: granular public/private/unlisted sharing states.

## 4. Technical Constraints & Performance
- **Client-Side Heavy**: Most processing occurs client-side to minimize latency and server costs.
- **Persistence**: Firebase Firestore for graph data; SessionStorage for transient generation state.
- **Latency Target**: <10s for structural extraction; <20s for full LLM synthesis.
- **Scalability**: Capable of rendering up to 500 active nodes per map via virtualized React components.

## 5. Success Metrics
- **Structural Accuracy**: >95% alignment between source headings and root nodes.
- **Engagement Depth**: Average of 2.5 sub-map expansions per root session.
- **Knowledge Retention**: 20% improvement in quiz performance after interacting with visual maps vs. text summaries.

## 6. Technical Debt & Roadmap
### Current Debt
- PDF parsing accuracy for non-structured (scanned) documents.
- Mobile touch-gesture optimization for the Radial view.
### Planned (Next Sprint)
- **PDF Export**: Vector-based PDF generation for offline sharing.
- **Real-time Synapse**: WebSocket-based collaborative editing.
- **Custom Personas**: User-defined system prompts for AI personality tuning.
