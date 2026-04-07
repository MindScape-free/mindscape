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
