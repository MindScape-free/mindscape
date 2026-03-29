# MindScape: Product Requirements Document

## 1. Product Overview

**MindScape** is an AI-powered visual knowledge mapping platform that transforms unstructured content (text, documents, websites, videos) into interactive, hierarchical mind maps with integrated AI learning assistance.

### Product Vision
To democratize knowledge visualization and active learning by making AI-powered mind mapping accessible to everyone—from students to professionals—through an intuitive, feature-rich web application.

### Core Value Proposition
MindScape bridges the gap between passive information consumption and active learning by automatically structuring knowledge into explorable visual maps, enabling users to understand complex topics faster and retain information longer.

---

## 2. Target Users / Personas

### Primary Personas

| Persona | Description | Use Case |
|---------|-------------|----------|
| **Student** | High school or university student preparing for exams | Create maps from lecture notes, textbooks, or study materials |
| **Lifelong Learner** | Curious individual exploring new topics | Discover and visualize connections in subjects of interest |
| **Professional** | Knowledge worker needing to understand complex domains | Map out project requirements, technical documentation, or industry trends |

### Secondary Personas

| Persona | Description | Use Case |
|---------|-------------|----------|
| **Teacher/Educator** | Instructor creating visual learning materials | Generate teaching aids and study guides |
| **Content Creator** | Writer, blogger, or YouTuber researching topics | Organize research and outline content |
| **Team Lead/Manager** | Leader needing to communicate complex plans | Create visual presentations and roadmaps |

---

## 3. Problem Statement

### User Pain Points

1. **Information Overload** - Modern learners face an overwhelming amount of content across multiple sources (articles, videos, documents) with no efficient way to synthesize and explore relationships.

2. **Passive Learning** - Reading and watching content leads to poor retention. Studies show active recall and visualization significantly improve learning outcomes.

3. **Linear Thinking** - Traditional note-taking produces linear outlines that fail to capture the interconnected nature of knowledge.

4. **Depth Navigation** - Existing mind mapping tools require manual structuring. Users cannot easily "drill down" into sub-topics or adjust the granularity of their maps.

5. **Disconnected Tools** - Separate applications for note-taking, AI chat, quizzes, and knowledge management create friction and context-switching overhead.

### Solution

MindScape solves these by:
- **Automating structure** - AI generates hierarchical maps from any content source
- **Enabling exploration** - Infinite nesting allows users to go as deep as needed
- **Integrating learning** - Built-in chat, quizzes, and explanations eliminate tool-switching
- **Supporting multiple inputs** - Single platform handles text, PDFs, URLs, images, and videos

---

## 4. Goals & Objectives

### Primary Goals

| Goal | Success Metric | Target |
|------|---------------|--------|
| Map Generation | % of users who successfully generate a map | >85% |
| User Engagement | Average session duration | >5 minutes |
| Learning Effectiveness | Quiz pass rate improvement | >20% over baseline |
| Retention | 7-day active user rate | >40% |
| Community Growth | Public maps shared per month | >500 |

### Secondary Goals

- Achieve NPS score >50
- Support 50+ languages
- Reduce map generation time to <10 seconds
- 99.5% uptime SLA

---

## 5. Features Breakdown

### Core Features (Implemented)

#### 5.1 Mind Map Generation

| Feature | Description | Status |
|---------|-------------|--------|
| Text-to-Map | Generate map from text topic | ✅ Complete |
| PDF-to-Map | Extract and map PDF content | ✅ Complete |
| Image-to-Map | Analyze images using vision AI | ✅ Complete |
| Website-to-Map | Scrape and map web content | ✅ Complete |
| YouTube-to-Map | Transcribe and map video content | ✅ Complete |
| Topic Comparison | Side-by-side similarity/difference map | ✅ Complete |
| Multi-Source Aggregation | Combine multiple sources into one map | ✅ Complete |

#### 5.2 Navigation & Exploration

| Feature | Description | Status |
|---------|-------------|--------|
| Accordion View | Hierarchical collapsible tree | ✅ Complete |
| Radial View | Circular mind map visualization | ✅ Complete |
| Roadmap View | Timeline-based sequential map | ✅ Partial |
| Node Expansion | Click to expand/collapse | ✅ Complete |
| Sub-Map Generation | Drill down into any node | ✅ Complete |
| Breadcrumb Navigation | Jump between hierarchy levels | ✅ Complete |
| View Mode Toggle | Switch between view styles | ✅ Complete |

#### 5.3 AI Assistant (MindSpark)

| Feature | Description | Status |
|---------|-------------|--------|
| Contextual Chat | Chat understands current map | ✅ Complete |
| Node Explanations | Get details on specific nodes | ✅ Complete |
| Real-World Examples | AI provides use cases | ✅ Complete |
| Related Questions | Generate follow-up questions | ✅ Complete |
| Topic Summarization | Brief summary of map/section | ✅ Complete |
| Translation | Translate map to 50+ languages | ✅ Complete |

#### 5.4 Active Learning

| Feature | Description | Status |
|---------|-------------|--------|
| Quiz Generation | AI creates quizzes from maps | ✅ Complete |
| Quiz History | Track performance over time | ✅ Complete |
| Weak Area Focus | AI prioritizes difficult topics | ✅ Complete |
| Practice Questions | Drill mode for specific nodes | ✅ Complete |

#### 5.5 Community & Sharing

| Feature | Description | Status |
|---------|-------------|--------|
| Public Publishing | Share maps with community | ✅ Complete |
| Map Discovery | Browse/search public maps | ✅ Complete |
| Category Filtering | Filter by topic areas | ✅ Complete |
| View Counts | Track map popularity | ✅ Complete |
| Unlisted Sharing | Share via direct link | ✅ Complete |

#### 5.6 User Management

| Feature | Description | Status |
|---------|-------------|--------|
| Firebase Authentication | Email/password, Google OAuth | ✅ Complete |
| User Profile | Settings and preferences | ✅ Complete |
| Progress Statistics | Maps created, streaks, badges | ✅ Complete |
| API Key Management | User-provided AI keys | ✅ Complete |
| Auto-Save | Background persistence | ✅ Complete |

### Secondary Features (Partially Implemented)

| Feature | Description | Status |
|---------|-------------|--------|
| Image Generation | AI-generated illustrations | ⚠️ Dialog exists, partial |
| Audio Summary | Text-to-speech map overview | ⚠️ API exists, partial |
| PDF Export | Download maps as PDF | ⚠️ Library included, partial |
| Admin Dashboard | User/content moderation | ⚠️ Basic implementation |

### Missing but Implied Features

Based on code analysis, the following are needed for production:

| Feature | Description | Priority |
|---------|-------------|----------|
| Real-time Collaboration | Multiple users editing simultaneously | High |
| Mobile Responsive Improvements | Better touch interactions | High |
| Offline Mode | Service worker for offline access | Medium |
| Advanced Search | Full-text search across user's maps | Medium |
| Team Workspaces | Shared team libraries | Medium |
| API Access | Programmatic map generation | Low |
| Custom Personas | User-defined AI personas | Low |

---

## 6. User Flows

### Flow 1: Quick Mind Map Creation

```
1. User lands on homepage
2. Types topic in search bar
3. (Optional) Attaches file or enters URL
4. Selects depth/persona/language
5. Clicks Generate
6. Sees loading animation
7. Map renders in canvas view
8. User explores nodes
9. (Optional) Chat with MindSpark
10. (Optional) Saves/shares map
```

### Flow 2: Document Learning

```
1. User uploads PDF
2. System parses document (SKEE pipeline)
3. AI generates structured map
4. User reviews and explores
5. Clicks "Generate Quiz"
6. Takes quiz
7. Views results and weak areas
8. Asks MindSpark for clarification
9. Saves progress
```

### Flow 3: Topic Comparison

```
1. User selects Compare mode
2. Enters two topics (e.g., "React vs Vue")
3. Clicks Generate
4. Sees comparison view with:
   - Unity Nexus (similarities)
   - Dimensions (differences)
   - Synthesis Horizon (expert verdict)
   - Related Links
5. User explores specific dimensions
6. (Optional) Drills into shared concepts
```

### Flow 4: Multi-Source Research

```
1. User selects Multi-Source mode
2. Adds multiple sources:
   - Text snippets
   - URLs
   - Uploaded files
3. System processes and aggregates
4. Generates unified knowledge map
5. User explores synthesized view
```

---

## 7. Functional Requirements

### FR-1: Mind Map Generation

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| FR-1.1 | Generate map from text topic | Map generated within 15s, contains 20-90 items based on depth |
| FR-1.2 | Generate map from PDF | Extract text, map structure within 30s |
| FR-1.3 | Generate map from image | Vision AI identifies content, generates map |
| FR-1.4 | Generate map from URL | Scrape content, extract key concepts |
| FR-1.5 | Generate map from YouTube | Fetch transcript, generate map with video context |
| FR-1.6 | Compare two topics | Show similarities, differences, synthesis |

### FR-2: Navigation & Exploration

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| FR-2.1 | Expand/collapse nodes | Smooth animation, state persists |
| FR-2.2 | Generate sub-maps | Nested expansion creates new map level |
| FR-2.3 | Switch view modes | Instant switch between Accordion/Radial/Roadmap |
| FR-2.4 | Navigate hierarchy | Breadcrumbs update on navigation |

### FR-3: AI Features

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| FR-3.1 | Contextual chat | Responses reference current map context |
| FR-3.2 | Explain nodes | Detailed explanation with examples |
| FR-3.3 | Generate quizzes | Valid quiz with 4 options per question |
| FR-3.4 | Translate maps | Full translation maintaining structure |

### FR-4: Persistence & Sharing

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| FR-4.1 | Auto-save maps | Save to Firestore every 30s |
| FR-4.2 | Load saved maps | Retrieve and render within 3s |
| FR-4.3 | Publish public maps | Visible in community within 1min |
| FR-4.4 | Share via link | Direct link loads map correctly |

---

## 8. Non-Functional Requirements

### Performance

| Metric | Target | Current |
|--------|--------|---------|
| First Contentful Paint | <1.5s | ~1.2s |
| Time to Interactive | <3s | ~2.5s |
| Map Generation Time | <15s (simple), <30s (complex) | Varies |
| Client Bundle Size | <500KB (initial) | ~350KB |
| Firestore Reads | <50 per session | ~30 avg |

### Scalability

| Scenario | Target | Approach |
|----------|--------|----------|
| Concurrent Users | 1000+ | Firestore scales automatically |
| Map Size | Up to 500 nodes | Virtualized rendering |
| File Upload | Up to 10MB PDF | Chunked processing |
| Session Data | Up to 5MB | Compress, paginate |

### Security

| Concern | Mitigation |
|---------|------------|
| Authentication | Firebase Auth with secure tokens |
| Authorization | Firestore rules enforce ownership |
| API Keys | Server-side only, never exposed to client |
| XSS | Input sanitization in markdown rendering |
| Data Privacy | Users own their data, can delete |
| Rate Limiting | Client-side throttle + server monitoring |

### Accessibility

| Requirement | Status |
|-------------|--------|
| WCAG 2.1 AA compliance | In progress |
| Keyboard navigation | Partial |
| Screen reader support | Partial |
| Color contrast | Meets minimum |

---

## 9. API / System Design Overview

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (Browser)                      │
├─────────────────────────────────────────────────────────────┤
│  Next.js 16 App Router                                       │
│  ├── React Components (Mind Map, Chat Panel)                │
│  ├── State Management (React Context + Hooks)               │
│  └── Server Actions (API calls)                             │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     External Services                        │
├─────────────────────────────────────────────────────────────┤
│  Firebase                    Pollinations.ai                │
│  ├── Firestore (DB)         ├── Text Generation API        │
│  ├── Auth (Auth)            ├── Vision API                  │
│  ├── Storage (Files)        └── Image Generation API       │
│  └── Functions (Optional)                                  │
│                                                              │
│  Third-Party APIs                                           │
│  ├── YouTube Transcript API                                 │
│  ├── Web Scraping (Cheerio)                                 │
│  └── PDF.js (Client-side parsing)                           │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Input → Client Validation → Server Action → AI Processing → Firestore → Client Render
     │              │                    │              │              │            │
     ▼              ▼                    ▼              ▼              ▼            ▼
  Topic/File    Schema Check      Route Handler   SKEE Pipeline   Persist     Update UI
                Zod Parser         Actions         LLM Call        Data        React
```

### Knowledge Engine (SKEE) Pipeline

```
Document Text
     │
     ▼
┌─────────────────┐
│ Heading Detector │ → Find structural headings
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Section Splitter │ → Divide into logical sections
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Keyword Extract  │ → Extract key terms per section
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│Relationship Det │ → Find connections between terms
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Graph Builder    │ → Create knowledge graph
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Graph-to-Mindmap │ → Convert to structured context
└────────┬────────┘
         │
         ▼
   Prompt Context (injected into AI prompt)
```

---

## 10. Data Model

### Entity Relationship Diagram

```
┌──────────────┐       ┌─────────────────┐       ┌──────────────────┐
│    User      │       │    MindMap      │       │   ChatSession    │
├──────────────┤       ├─────────────────┤       ├──────────────────┤
│ uid (PK)     │───┐   │ id (PK)         │       │ id (PK)          │
│ email        │   │   │ userId (FK)     │───┐   │ mapId (FK)       │
│ displayName  │   │   │ topic           │   │   │ messages[]       │
│ photoURL     │   │   │ mode            │   │   │ weakTags[]       │
│ preferences  │   │   │ subTopics[]     │   │   │ quizHistory[]    │
│ statistics   │   │   │ isPublic        │   │   │ createdAt        │
│ apiSettings  │   │   │ createdAt       │   │   │ updatedAt        │
└──────────────┘   │   │ updatedAt       │   │   └──────────────────┘
                   │   └─────────────────┘   │
                   │          │              │
                   │          │              │
                   │   ┌──────┴───────┐      │
                   │   │              │      │
                   │   ▼              ▼      │
                   │ ┌────────┐  ┌─────────┐│
                   └──│ SubTopic│  │Category ││
                      └────────┘  └─────────┘│
                             │
                             ▼
                      ┌─────────────┐
                      │ SubCategory │
                      └─────────────┘
```

### Firestore Schema

```typescript
// users/{userId}
interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  preferences: UserPreferences;
  statistics: UserStatistics;
  apiSettings: ApiSettings;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// users/{userId}/mindmaps/{mindmapId}
interface MindMap {
  id: string;
  userId: string;
  topic: string;
  mode: 'single' | 'compare' | 'multi';
  shortTitle: string;
  icon: string;
  thought: string;
  subTopics: SubTopic[];
  summary?: string;
  isPublic: boolean;
  views: number;
  originalAuthorId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  sourceType?: string;
  sourceUrl?: string;
  depth?: 'low' | 'medium' | 'deep';
}

// publicMindmaps/{mindmapId}
interface PublicMindMap extends Omit<MindMap, 'userId'> {
  authorName: string;
  authorAvatar?: string;
  publicCategories: string[];
}

// users/{userId}/chatSessions/{sessionId}
interface ChatSession {
  id: string;
  mapId: string | null;
  mapTitle: string;
  title: string;
  messages: ChatMessage[];
  weakTags: string[];
  quizHistory: QuizResult[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 11. Assumptions

1. **User Intent** - Users want to learn and understand topics, not just collect information
2. **Device Capability** - Users access via modern browsers with JavaScript enabled
3. **Network Reliability** - Users have stable internet for AI generation (required)
4. **Language Support** - Primary audience is English-speaking, but translation is desired
5. **Content Rights** - Users have rights to content they upload
6. **AI Trust** - Users trust AI-generated content (with appropriate disclaimers)
7. **Privacy Awareness** - Users understand public sharing implications
8. **API Key Economics** - Users willing to get free Pollinations key for enhanced features
9. **Mobile as Secondary** - Desktop is primary experience; mobile is supplementary
10. **No Offline Requirement** - Users expect always-online experience

---

## 12. Constraints

### Technical Constraints

| Constraint | Impact |
|------------|--------|
| Browser sessionStorage limit (5MB) | Limits client-side caching |
| Firestore free tier limits | 50K reads/day, 20K writes/day |
| Pollinations rate limits | Varies by model; no guarantees |
| No server-side rendering for AI | All AI calls client-initiated |
| Next.js App Router limitations | Some patterns require client components |

### Business Constraints

| Constraint | Impact |
|------------|--------|
| Free tier only (no paid plans) | Limited infrastructure budget |
| No dedicated ops team | Self-hosted monitoring |
| Open source (MIT) | Limited monetization options |
| Single developer | Slow feature velocity |

### Regulatory Constraints

| Constraint | Impact |
|------------|--------|
| GDPR compliance | Users can delete data |
| COPPA (no children under 13) | No minors features |
| AI content disclaimer | Must disclose AI-generated content |

---

## 13. Risks & Edge Cases

### High Priority Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| AI Hallucination | Medium | High | Content grounding, user verification |
| Firestore Costs | Medium | Medium | Usage monitoring, tier alerts |
| API Key Abuse | Low | High | Rate limiting, usage caps |
| Data Loss | Low | High | Auto-save, backup retention |

### Medium Priority Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| YouTube API Changes | Medium | Medium | Fallback to manual transcript |
| Browser Compatibility | Low | Medium | Test across major browsers |
| Large Map Performance | Medium | Low | Virtualization, pagination |
| Concurrent Edits | Low | Low | Lock warnings, merge strategy |

### Edge Cases

| Scenario | Handling |
|----------|----------|
| Empty PDF | Show error: "No text content found" |
| YouTube without captions | Show error: "Transcript unavailable" |
| Very long topic (>500 chars) | Truncate with warning |
| Duplicate map creation | Show "Similar map exists" prompt |
| Network timeout during save | Retry 3x, then show error |
| Session storage full | Prompt to save or clear old data |
| Malformed AI response | Retry with different model |
| Rate limit hit | Queue requests, show progress |

---

## 14. Success Metrics (KPIs)

### Acquisition Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| Monthly Active Users (MAU) | Unique users in 30 days | 1,000 |
| Weekly Active Users (WAU) | Unique users in 7 days | 500 |
| New User Signups | New accounts per month | 200 |
| Installation Conversion | Signups / visits | 10% |

### Engagement Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| Avg Session Duration | Time per session | 5+ minutes |
| Maps Created / User | Avg maps per active user | 2+ |
| Expansion Rate | Sub-maps / map | 1.5+ |
| Chat Interactions | Messages per session | 5+ |
| Quiz Completion Rate | Started / completed quizzes | 70% |

### Retention Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| D1 Retention | Return day 1 | 40% |
| D7 Retention | Return day 7 | 20% |
| D30 Retention | Return day 30 | 10% |
| Churn Rate | Users lost / total | <5% monthly |

### Health Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| Map Success Rate | Successful / attempted | 85%+ |
| Error Rate | Errors / total requests | <5% |
| P99 Latency | 99th percentile response | <5s |
| Uptime | Availability | 99.5% |

---

## 15. Roadmap

### Phase 1: Foundation (Complete ✅)

- [x] Core mind map generation (text, PDF, image, URL)
- [x] YouTube integration
- [x] Topic comparison mode
- [x] MindSpark chat assistant
- [x] Quiz generation
- [x] User authentication
- [x] Community sharing

### Phase 2: Polish (Current)

- [ ] Improve mobile responsiveness
- [ ] PDF export functionality
- [ ] Image generation integration
- [ ] Audio summary feature
- [ ] Admin dashboard improvements
- [ ] Performance optimization

### Phase 3: Growth (Planned)

- [ ] Real-time collaboration
- [ ] Offline mode (PWA)
- [ ] Team workspaces
- [ ] Advanced search
- [ ] Mobile app
- [ ] API access

### Phase 4: Scale (Future)

- [ ] Enterprise features
- [ ] Custom branding
- [ ] Analytics dashboard (advanced)
- [ ] Integration ecosystem
- [ ] Marketplace for templates

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **Mind Map** | Hierarchical visualization of concepts |
| **Sub-Map** | Nested mind map generated from a parent node |
| **MindSpark** | AI chat assistant within MindScape |
| **SKEE** | Smart Knowledge Extraction Engine - document analysis pipeline |
| **Pollinations.ai** | Free AI API provider used by MindScape |
| **Radial View** | Circular mind map visualization with central topic |
| **Accordion View** | Expandable tree structure view |
| **Depth** | Level of detail in generated maps (Quick/Balanced/Detailed) |
| **Persona** | AI conversation style (Teacher/Concise/Creative/Sage) |

## Appendix B: Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| next | ^16.2.1 | React framework |
| react | ^18.3.1 | UI library |
| firebase | ^11.9.1 | Backend services |
| framer-motion | ^11.3.19 | Animations |
| zod | ^3.25.76 | Schema validation |
| tailwindcss | ^3.4.1 | Styling |
| pdfjs-dist | ^5.5.207 | PDF parsing |
| cheerio | ^1.2.0 | Web scraping |

---

*Document Version: 1.0*  
*Last Updated: March 2026*  
*Author: MindScape Development Team*
