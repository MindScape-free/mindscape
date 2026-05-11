# MindScape

**Visual Intelligence Engine for Cognitive Synthesis**

MindScape is a professional-grade knowledge mapping platform that transforms unstructured data into multi-dimensional, interactive knowledge graphs. Built for deep learners, researchers, and knowledge architects.

## 🚀 Key Capabilities
- **Deterministic Synthesis (SKEE)**: Proprietary pipeline that extracts structural metadata before AI synthesis to eliminate hallucinations.
- **Multi-Modal Ingestion**: Create complex maps from **PDFs, YouTube, Web URLs, Images, and Raw Text**.
- **Neural Expansion**: Recursive sub-map generation for infinite-depth knowledge exploration.
- **Cognitive Tools**: Contextual AI Chat (MindSpark), Knowledge Alchemy (Concept Fusion), and Automated Micro-Quizzes.

## 🛠 Tech Stack
- **Framework**: Next.js 16.2 (App Router)
- **Engine**: TypeScript + SVG Radial Rendering
- **Database**: Firebase Firestore
- **Auth**: Firebase Auth + RBAC Logic
- **AI Core**: Pollinations.ai (Distributed Model Dispatcher)
- **Document Logic**: PDF.js + Cheerio

## 📂 Project Architecture
```bash
MindScape/
├── src/app/              # Next.js App Router (Admin, Canvas, Library)
├── src/components/       # UI Primitives & MindMap Rendering Logic
├── src/knowledge-engine/ # SKEE Pipeline (Deterministic Extraction)
├── src/ai/flows/         # AI Generation & Synthesis Logic
└── src/lib/              # Core Utilities & RAG implementation
```

## ⚙️ Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   Create `.env.local` with your Firebase credentials:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   ```

3. **Development Mode**
   ```bash
   npm run dev
   ```

## 🏗 Admin & Governance
MindScape includes a robust **Admin Console** at `/admin` for tracking platform telemetry, AI model performance, and user engagement metrics across the global knowledge graph.

## ⚖️ License
MIT License. Built for the future of learning.
