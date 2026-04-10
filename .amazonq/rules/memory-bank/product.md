# MindScape - Product Overview

## Purpose & Value Proposition
MindScape is an AI-powered visual knowledge mapping and learning platform (v1.6.7) that transforms unstructured ideas, documents, websites, and YouTube videos into interactive, multi-layered mind maps. It addresses the limitations of linear note-taking by enabling users to visualize concept connections, explore topics at varying depths, and retain information through active engagement.

## Key Features

### Mind Map Generation (Multi-Source)
- **Text/Topic** - Generate from any topic or free-form text
- **PDF** - Extract and map content from PDF documents
- **Image** - Analyze images and generate concept maps
- **Website/URL** - Scrape and map web page content
- **YouTube Video** - Transcribe and map video content
- **Multi-Source Aggregation** - Combine multiple sources into one unified map
- **Topic Comparison** - Side-by-side comparison with similarity analysis

### Map Structure
- 3-level hierarchy: SubTopics → Categories → SubCategories
- Infinite nesting via drill-down (sub-maps with breadcrumb navigation)
- 4 view modes: Accordion, Radial, Roadmap, Comparison
- 4 depth levels: Quick (low), Balanced (medium), Detailed (deep), Auto

### AI Features
- **MindSpark Chat** - Contextual AI assistant aware of current map
- **Auto-Generated Quizzes** - Spaced repetition with weak-area prioritization
- **Smart Explanations** - Node explanations at Beginner/Intermediate/Expert levels
- **Translation** - Translate maps to 50+ languages
- **Related Questions** - AI-suggested follow-up exploration
- **4 AI Personas** - Teacher, Concise, Creative, Cognitive Sage

### Learning & Community
- Progress tracking: streaks, badges, activity statistics
- Community gallery: publish, explore, and clone public maps
- Personal library with saved maps
- PDF export for offline reading
- Text-to-speech audio summaries

### Admin & Analytics
- Admin dashboard with user management, moderation, and activity logs
- Analytics tracking for map generation and user engagement
- Rate limiting via Upstash Redis

## Target Users
- **Students** - Visual learners studying complex topics
- **Researchers** - Mapping literature and concepts
- **Content Creators** - Brainstorming and organizing ideas
- **Professionals** - Knowledge management and onboarding
- **Educators** - Creating visual teaching materials

## Use Cases
1. Study a YouTube lecture → generate a structured mind map → quiz yourself
2. Upload a research PDF → extract key concepts → drill into sub-topics
3. Compare two competing technologies side-by-side
4. Aggregate multiple web sources into a unified knowledge map
5. Share a public map with the community for collaborative learning

## Modes
| Mode | Description |
|------|-------------|
| `single` | Standard mind map from one source |
| `compare` | Dual-topic comparison with CompareData structure |
| `multi` | Aggregated map from multiple sources |
