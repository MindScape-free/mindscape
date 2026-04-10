## [v1.6.7] - 2026-04-09

### ⚡ Real-Time Streaming Chat
- **Streaming API**: New `/api/chat/stream` endpoint using Server-Sent Events (SSE)
- **Streaming Hook**: `useStreamingChat` hook for managing streaming state
- **Progressive Rendering**: AI responses appear word-by-word as they're generated
- **Blinking Cursor**: Visual indicator shows streaming progress
- **Stop Button**: Ability to stop streaming mid-generation
- **Error Handling**: Graceful fallback if streaming fails
- **Regenerate Support**: Streaming works for both new messages and regenerations

### 🎨 Canvas Page Refactor
- **Component Extraction**: Reorganized canvas page with extracted reusable components:
  - `BlobPdfViewer`: Standalone PDF viewer component
  - `SourceFileModal`: Unified source content display modal
  - `SourceParser`: Shared source content parsing utility
- **Code Organization**: Reduced canvas/page.tsx from 1532 to ~1327 lines for better maintainability

### 🎙️ Audio Summary Integration
- **AI TTS Integration**: Full integration of Pollinations TTS API for high-quality audio synthesis
- **Voice Options**: Multiple AI voices (Alloy, Echo, Fable, Onyx, Nova, Shimmer)
- **Toggle Switch**: Easy switching between AI-generated and browser native TTS
- **MP3 Download**: Download AI-generated audio summaries directly
- **Speed Control**: Adjustable playback speed (0.75x, 1x, 1.25x)

### 📱 Mobile Responsiveness
- **Toolbar Optimization**: Collapsible toolbar with adaptive buttons for different screen sizes
- **Hidden on Mobile**: Language selector, expand/collapse, Quiz/Summary buttons (show on sm+)
- **Further Hidden**: File aware toggle, Source button, Nested Maps tools (show on larger screens)
- **Compact Layout**: Reduced gaps and padding on smaller screens
- **Smart Visibility**: Essential actions (Share, Save, Publish, Regenerate) always visible

### 📚 MindScape Self-Reference Update
- **Expanded Architecture Map**: Updated the MindScape Core Architecture mind map with:
  - New SKEE Pipeline section (Heading Detection, Section Splitter, Keyword Extraction, etc.)
  - Enhanced Generation Modes (Multi-Source Aggregation, YouTube Integration)
  - Updated Visualization & UI (Accordion, Radial, Compare views)
  - Expanded Roadmap & Future phases (Phase 2-4 features)
  - Cloud & Persistence improvements
  - Gamification & Progress tracking features
- **Cleanup**: Removed Roadmap View and Trending Maps (not implemented)

## [v1.6.6] - 2026-04-08

### 🛠️ Admin & Infrastructure
- **Admin Dashboard Overhaul**: Completely redesigned the administrative interface with a high-performance **Virtualized Users Tab**. 
- **User Intelligence**: Added advanced searching, multi-criteria sorting (A-Z, Latest, etc.), and deep-fetch capabilities from Firebase.
- **Performance Virtualization**: Implemented a custom virtualization engine for the user list to maintain 60fps performance even with thousands of records.

### 🧩 System & Logic
- **AI Model Synchronization**: Updated internal model references for improved generation consistency.
- **Feedback Loop**: Integrated a new system-wide feedback mechanism for real-time user insights.
- **Structural Fixes**: Resolved edge-case rendering issues in the "Pollen" generation engine.

## [v1.6.5] - 2026-03-29

### 🌟 Modernization & Aesthetics
- **Premium Glassmorphic Dashboard**: Re-imagined the Library and User Profile with a high-end, translucent design system featuring `3xl` backdrop blurs and refined border treatments.
- **Neural Expansion Sidebar**: Optimized the Info panel with a dedicated `ScrollArea` and improved structural hierarchy for better readability of map insights.
- **Enhanced Typography**: Standardized on high-contrast, black-weighted headers for a more professional and modern aesthetic.

### 🧠 Intelligence & Reliability
- **Robust JSON Repair Engine**: Implemented a dual-layered JSON recovery system using the `jsonrepair` library and custom structural "step-back" logic. This ensures that even the most complex, deep mind maps render correctly without errors.
- **Structural Integrity Buffers**: Updated AI generation protocols to prioritize closing data structures correctly when approaching output limits, ensuring 100% valid maps.
- **Multi-Source Logic**: Renamed "Documents" to **TEXT** across the application for clearer differentiation.

### 📊 Analytics & Insights
- **VIBGYOR Analytics Standard**: Standardized the sidebar stats (Depth, Architecture, Nodes, Pathways) with a consistent, color-coded VIBGYOR palette for instant visual assessment.
- **Interactive Source Intelligence**: The Source Badge now supports a multi-source breakdown. Hovering over the badge reveals a detailed VIBGYOR-colored tooltip showing the exact count of IMAGES, PDF, WEBSITES, YOUTUBE, and TEXT sources.
- **Depth Complexity Indicators**: Standardized the Complexity badges (Low, Medium, High) with consistent color-matched iconography.

### 🚀 UX & Workflow
- **Refined Creation Flow**: Suggested topics in the Info sidebar now offer a clear two-path creation choice:
    - **Background Generation**: Build your next map while staying in your current view.
    - **Immediate Creation**: Jump directly to the Canvas to begin working on a specific recommendation right away.
- **Improved Readability**: Fixed text truncation issues in the "Neural Expansion Paths" to ensure long topic titles wrap and remain fully readable.
- **Smart Notification Integration**: Background generation now features real-time success/error alerts and persistent links in the Notification Center.
