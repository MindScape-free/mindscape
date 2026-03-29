# MindScape

> AI-Powered Visual Knowledge Mapping & Learning Platform

MindScape transforms unstructured ideas, documents, websites, and YouTube videos into interactive, multi-layered mind maps powered by AI.

## Problem Statement

Traditional note-taking is linear and often forgettable. When learning complex topics or brainstorming creative projects, users struggle to:
- Visualize connections between concepts
- Explore topics at varying depths
- Maintain engagement with passive learning
- Remember information long-term

MindScape addresses these challenges by automatically generating visual knowledge maps with AI assistance, enabling users to understand and explore information interactively.

## Key Features

### Core Functionality
- **Multi-Source Mind Map Generation** - Create maps from text topics, PDFs, images, websites, and YouTube videos
- **Topic Comparison Mode** - Side-by-side comparison of two topics with similarity analysis
- **Multi-Source Aggregation** - Combine multiple sources into a unified knowledge map
- **Infinite Nesting** - Drill down into any node to create sub-maps recursively

### AI-Powered Features
- **MindSpark Chat Assistant** - Contextual AI that understands your current map
- **Auto-Generated Quizzes** - Test knowledge with AI-generated quizzes
- **Smart Explanations** - Get detailed explanations with real-world examples
- **Translation Support** - Translate maps to 50+ languages

### Learning & Progress
- **Spaced Repetition Quizzes** - AI prioritizes weak areas
- **Progress Tracking** - Streaks, badges, and activity statistics
- **Community Sharing** - Publish and explore public mind maps
- **PDF Export** - Export maps for offline reading

### Customization
- **4 AI Personas** - Teacher, Concise, Creative, Cognitive Sage
- **4 Depth Levels** - Quick, Balanced, Detailed, Auto
- **Multiple View Modes** - Accordion, Radial, Roadmap, Comparison

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16.2.1 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3.4.1 |
| UI Components | Radix UI, shadcn/ui |
| Animation | Framer Motion 11 |
| Database | Firebase Firestore |
| Authentication | Firebase Auth |
| AI Provider | Pollinations.ai (free models) |
| AI Models | Gemini, GPT-5, Claude, DeepSeek, and more |
| Document Processing | PDF.js, Cheerio, jsdom |
| Fonts | Space Grotesk, Orbitron |

## Project Structure

```
MindScape/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # Homepage with hero & input
│   │   ├── layout.tsx         # Root layout with providers
│   │   ├── canvas/            # Mind map workspace
│   │   ├── profile/           # User settings & statistics
│   │   ├── community/         # Public maps gallery
│   │   ├── login/             # Authentication
│   │   ├── admin/             # Admin dashboard
│   │   ├── actions/           # Server actions
│   │   └── api/               # API routes
│   │
│   ├── components/
│   │   ├── ui/                # Base UI components
│   │   ├── mind-map/          # Mind map visualization
│   │   ├── chat/              # Chat panel components
│   │   └── community/         # Community features
│   │
│   ├── ai/
│   │   ├── flows/             # AI generation flows
│   │   ├── search/            # Web search integration
│   │   ├── schemas/           # Zod validation schemas
│   │   ├── pollinations-client.ts
│   │   └── client-dispatcher.ts
│   │
│   ├── knowledge-engine/      # Document analysis pipeline (SKEE)
│   │   ├── heading-detector.ts
│   │   ├── section-splitter.ts
│   │   ├── keyword-extractor.ts
│   │   ├── relationship-detector.ts
│   │   ├── graph-builder.ts
│   │   └── graph-to-mindmap.ts
│   │
│   ├── firebase/              # Firebase config & hooks
│   ├── contexts/              # React contexts
│   ├── hooks/                 # Custom hooks
│   ├── lib/                  # Utilities
│   └── types/                # TypeScript definitions
│
├── public/                   # Static assets
├── firestore.rules           # Firestore security rules
├── tailwind.config.ts
├── next.config.ts
└── package.json
```

## Installation

### Prerequisites
- Node.js 20+
- npm or yarn
- Firebase project (for database & auth)
- Pollinations.ai API key (free, optional for enhanced features)

### Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd MindScape
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
Create a `.env.local` file:
```env
# Firebase (Required)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Optional: Analytics
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=your_analytics_id
```

4. **Run the development server**
```bash
npm run dev
```

5. **Build for production**
```bash
npm run build
npm start
```

## Usage Guide

### Generating a Mind Map

1. **Single Topic Mode**
   - Enter a topic in the input field
   - Optionally attach a file (PDF, image, text)
   - Click the generate button

2. **Compare Mode**
   - Select "Compare" from the mode selector
   - Enter two topics to compare
   - Click generate to see similarities and differences

3. **Multi-Source Mode**
   - Select "Multi-Source" from the mode selector
   - Add multiple sources (text, URLs, files)
   - Click generate to aggregate information

### Navigating Mind Maps

- **Expand nodes** - Click any node to expand its children
- **Drill down** - Click "Expand" on any node to create a sub-map
- **Navigate hierarchy** - Use breadcrumbs to jump between levels
- **Switch views** - Toggle between Accordion, Radial, and Roadmap views

### Using MindSpark

1. Click the chat icon (bottom-right)
2. Ask questions about your current map
3. Request explanations, examples, or related questions
4. Generate quizzes to test your knowledge

## API Documentation

### Server Actions

| Action | Purpose |
|--------|---------|
| `generateMindMapAction` | Generate map from text topic |
| `generateMindMapFromWebsiteAction` | Generate map from URL |
| `generateMindMapFromPdfAction` | Generate map from PDF |
| `generateMindMapFromImageAction` | Generate map from image |
| `generateYouTubeMindMapAction` | Generate map from YouTube video |
| `generateComparisonMapAction` | Compare two topics |
| `chatAction` | Chat with MindSpark assistant |
| `generateQuizAction` | Generate quiz from map |
| `translateMindMapAction` | Translate map to different language |

### API Routes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/youtube-transcript` | GET | Fetch YouTube video transcript |
| `/api/scrape-url` | POST | Extract content from web pages |
| `/api/generate-image` | POST | Generate AI images |
| `/api/generate-audio` | POST | Text-to-speech synthesis |

## Configuration

### AI Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `POLLINATIONS_API_KEY` | Pollinations.ai API key for enhanced AI | Optional |
| `NEXT_PUBLIC_DEFAULT_MODEL` | Default AI model | auto |

### User Preferences (Firestore)

```typescript
interface UserPreferences {
  preferredLanguage: string;      // e.g., "en", "es"
  defaultAIPersona: string;       // "teacher" | "concise" | "creative" | "sage"
  defaultDepth: string;            // "low" | "medium" | "deep" | "auto"
  defaultExplanationMode: string;  // "Beginner" | "Intermediate" | "Expert"
  autoGenerateImages: boolean;
  deepExpansionMode: boolean;
  defaultMapView: string;
  autoSaveFrequency: number;       // seconds
}
```

## Known Limitations

1. **Session Storage Constraints** - Large maps may hit browser sessionStorage limits (2MB soft, 5MB hard)
2. **PDF Parsing** - Complex PDFs with images/scans may have reduced accuracy
3. **YouTube Transcripts** - Not all videos have captions available
4. **Rate Limiting** - Free AI models have usage quotas
5. **No Real-Time Collaboration** - Currently single-user editing only
6. **Web Scraping** - Some websites block automated access
7. **Image Size Limit** - Maximum 2MB for image uploads

## Future Improvements

Based on code analysis, the following features are planned or partially implemented:

- [ ] Real-time collaboration with multiplayer editing
- [ ] Mobile app (React Native or PWA enhancements)
- [ ] Enhanced image generation with style presets
- [ ] Integration with external note-taking apps (Notion, Obsidian)
- [ ] API for programmatic mind map generation
- [ ] Team workspaces and shared libraries
- [ ] Advanced analytics dashboard for community
- [ ] Offline mode with service worker
- [ ] Custom persona creation
- [ ] Bulk export (CSV, JSON, Markdown)

## Data Model

### Firestore Collections

```
users/{userId}
├── settings/
├── mindmaps/{mindmapId}
│   ├── nodes/{nodeId}
│   └── content/{docId}
├── chatSessions/{sessionId}
└── statistics/

publicMindmaps/{mindmapId}
sharedMindmaps/{mindmapId}
adminStats/{docId}
monthlyStats/{docId}
adminActivityLog/{docId}
```

### Security Rules

- Users can only access their own private data
- Public maps are readable by all, writable by author only
- Admin access restricted to specific UID
- API keys stored server-side only

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Standards

- Use TypeScript strict mode
- Run `npm run lint` before committing
- Run `npm run typecheck` to verify types
- Follow existing component patterns
- Add Zod schemas for new API payloads

## License

MIT License - See LICENSE file for details.

## Credits

- Built with [Pollinations.ai](https://pollinations.ai) - Free open-source AI models
- UI components from [shadcn/ui](https://ui.shadcn.com)
- Animations powered by [Framer Motion](https://www.framer.com/motion/)
