import { SingleMindMapData } from "@/types/mind-map";

export const mindscapeMap = {
    mode: "single",
    topic: "MindScape Core Architecture",
    shortTitle: "MindScape",
    summary: "A comprehensive map of MindScape's features, AI integrations, data flows, and user engagement mechanics based on the official PRD.",
    icon: "brain-circuit",
    thought: "Unlock the full potential of AI-powered visual knowledge mapping",
    subTopics: [
        {
            name: "Core AI Engine",
            icon: "sparkles",
            categories: [
                {
                    name: "Generation Modes",
                    icon: "network",
                    subCategories: [
                        {
                            name: "Single Topic Generation",
                            description: "Automated hierarchical structuring from text queries with customizable depth, persona, and web contexts. Supports topics up to 500 characters.",
                            icon: "zap",
                            tags: ["Zod Schemas", "Dynamic Depth", "Structured Output"],
                            isExpanded: false
                        },
                        {
                            name: "Comparative Analysis",
                            description: "Dual-topic logic engine producing 'Topic A', 'Topic B', 'Unity Nexus' (similarities), and 'Dimensions' (differences) cross-analysis with expert synthesis.",
                            icon: "git-compare-arrows",
                            tags: ["Compare Mode", "Synthesis", "Side-by-Side"],
                            isExpanded: false
                        },
                        {
                            name: "File-to-Map Extraction",
                            description: "Client-side processing of PDFs up to 10MB, images via vision AI, and raw text files into structured visual knowledge hierarchies.",
                            icon: "file-up",
                            tags: ["PDF.js", "Vision AI", "Text Extraction"],
                            isExpanded: false
                        },
                        {
                            name: "YouTube Integration",
                            description: "Fetches transcripts from YouTube videos and generates contextual mind maps with video-specific metadata and timestamps.",
                            icon: "youtube",
                            tags: ["Transcript API", "Video Context"],
                            isExpanded: false
                        },
                        {
                            name: "Website Scraping",
                            description: "Extracts content from URLs using Cheerio for structured web content, generating maps from any accessible webpage.",
                            icon: "globe",
                            tags: ["Cheerio", "Web Scraping", "URL Parsing"],
                            isExpanded: false
                        },
                        {
                            name: "Infinite Nested Expansion",
                            description: "Clicking any sub-node dynamically generates a full contextual sub-map that stacks via a breadcrumb history, supporting Miller Columns navigation.",
                            icon: "layers",
                            tags: ["Sub-maps", "Breadcrumbs", "Miller Columns"],
                            isExpanded: false
                        },
                        {
                            name: "Multi-Source Aggregation",
                            description: "Combines multiple sources (text snippets, URLs, uploaded files) into a unified synthesized knowledge map with cross-reference detection.",
                            icon: "merge",
                            tags: ["Synthesis", "Cross-Reference", "Aggregation"],
                            isExpanded: false
                        }
                    ]
                },
                {
                    name: "SKEE Pipeline",
                    icon: "cpu",
                    subCategories: [
                        {
                            name: "Heading Detection",
                            description: "Identifies structural headings and sections in documents to maintain semantic hierarchy during map generation.",
                            icon: "heading",
                            tags: ["NLP", "Document Structure"],
                            isExpanded: false
                        },
                        {
                            name: "Section Splitter",
                            description: "Divides large documents into logical sections for granular processing and visualization.",
                            icon: "scissors",
                            tags: ["Chunking", "Segmentation"],
                            isExpanded: false
                        },
                        {
                            name: "Keyword Extraction",
                            description: "Extracts key terms and concepts per section using AI-powered keyword identification.",
                            icon: "key",
                            tags: ["AI", "Terminology"],
                            isExpanded: false
                        },
                        {
                            name: "Relationship Detection",
                            description: "Finds semantic connections and relationships between extracted terms for cross-linking.",
                            icon: "link",
                            tags: ["Graph Theory", "Relationships"],
                            isExpanded: false
                        },
                        {
                            name: "Graph Builder",
                            description: "Constructs knowledge graphs from extracted relationships, enabling rich node connections.",
                            icon: "graph",
                            tags: ["Knowledge Graph", "Nodes & Edges"],
                            isExpanded: false
                        },
                        {
                            name: "Graph-to-Mindmap",
                            description: "Converts final knowledge graphs into structured hierarchical context for AI prompts.",
                            icon: "git-branch",
                            tags: ["Conversion", "Hierarchy"],
                            isExpanded: false
                        }
                    ]
                },
                {
                    name: "AI Dispatch & Routing",
                    icon: "route",
                    subCategories: [
                        {
                            name: "Multi-Model Resiliency",
                            description: "Intelligent fallback system with exponential backoff retries, model rotation, and circuit breakers preventing downtime.",
                            icon: "shield-check",
                            tags: ["Pollinations.ai", "Failover", "Circuit Breaker"],
                            isExpanded: false
                        },
                        {
                            name: "Smart Routing",
                            description: "Traffic routed based on specific capabilities: Fast (gemini-fast), Accurate (openai), Vision (llama-vision), Reasoning (deepseek).",
                            icon: "route",
                            tags: ["Model Dispatching", "Load Balancing"],
                            isExpanded: false
                        },
                        {
                            name: "MindSpark Assistant",
                            description: "Context-aware sidebar chat assistant providing in-depth explanations, real-world examples, and immediate feedback.",
                            icon: "bot",
                            tags: ["Chat", "Contextual AI", "RAG"],
                            isExpanded: false
                        },
                        {
                            name: "Quiz Generation",
                            description: "Auto-generates 5-10 question multiple-choice tests with weak area focus and performance tracking.",
                            icon: "swords",
                            tags: ["Active Recall", "Assessment", "Spaced Repetition"],
                            isExpanded: false
                        }
                    ]
                }
            ]
        },
        {
            name: "Interactive Experiences",
            icon: "monitor",
            categories: [
                {
                    name: "Visualization & UI",
                    icon: "palette",
                    subCategories: [
                        {
                            name: "Accordion View",
                            description: "Clean hierarchical collapsible tree structure with smooth expand/collapse animations and persistent state.",
                            icon: "list",
                            tags: ["Tree View", "Collapsible", "Hierarchy"],
                            isExpanded: false
                        },
                        {
                            name: "Radial View",
                            description: "Spatial circular mind map visualization with central topic and orbital branching for spatial learners.",
                            icon: "circle-dot",
                            tags: ["Orbital", "Spatial", "Visual"],
                            isExpanded: false
                        },

                        {
                            name: "Compare View",
                            description: "Side-by-side comparison with Unity Nexus (similarities) and Dimensions (differences) panels.",
                            icon: "columns",
                            tags: ["Comparison", "Diff", "Synthesis"],
                            isExpanded: false
                        },
                        {
                            name: "Visual Feedback",
                            description: "Premium orbital loading animations, UI skeletons, and materialized navigation removing all UI lag friction.",
                            icon: "loader-2",
                            tags: ["Animations", "Skeleton", "UX"],
                            isExpanded: false
                        },
                        {
                            name: "Multilingual Intelligence",
                            description: "On-the-fly component and node translation into 50+ languages without reloading, powered by AI translation.",
                            icon: "languages",
                            tags: ["i18n", "Localization", "AI Translate"],
                            isExpanded: false
                        }
                    ]
                },
                {
                    name: "Practice & Assessment",
                    icon: "graduation-cap",
                    subCategories: [
                        {
                            name: "Interactive Quizzes",
                            description: "Auto-generated multiple-choice tests designed to validate learning for any specific topic cluster with instant feedback.",
                            icon: "swords",
                            tags: ["MCQ", "Feedback", "Scoring"],
                            isExpanded: false
                        },
                        {
                            name: "Quiz History",
                            description: "Track performance over time with detailed analytics on weak areas and improvement metrics.",
                            icon: "history",
                            tags: ["Analytics", "Progress", "Metrics"],
                            isExpanded: false
                        },
                        {
                            name: "Weak Area Focus",
                            description: "AI prioritizes topics that users struggle with, adapting quiz content to reinforce difficult concepts.",
                            icon: "target",
                            tags: ["Adaptive", "Spaced Repetition", "ML"],
                            isExpanded: false
                        },
                        {
                            name: "Practice Questions",
                            description: "Drill mode for specific nodes with immediate explanations and real-world examples.",
                            icon: "pencil",
                            tags: ["Drill", "Practice", "Reinforcement"],
                            isExpanded: false
                        }
                    ]
                },
                {
                    name: "Export & Sharing",
                    icon: "download",
                    subCategories: [
                        {
                            name: "PDF Export",
                            description: "Compiles full active hierarchies into structured, offline-ready PDF documents via jsPDF integration.",
                            icon: "file-down",
                            tags: ["Export", "jsPDF", "Download"],
                            isExpanded: false
                        },
                        {
                            name: "Visual Insight Lab",
                            description: "Generates node-specific thumbnails and high-fidelity prompt imagery using Flux and ZImage models.",
                            icon: "camera",
                            tags: ["Image Gen", "Thumbnails", "AI Art"],
                            isExpanded: false
                        },
                        {
                            name: "Public Publishing",
                            description: "Publish maps to community gallery with category tagging and search for discovery by other users.",
                            icon: "globe",
                            tags: ["Community", "Gallery", "Discovery"],
                            isExpanded: false
                        },
                        {
                            name: "Universal Sharing",
                            description: "Creates flat-snapshot documents granting unauthenticated guests identical read-access through unlisted URLs.",
                            icon: "share-2",
                            tags: ["Links", "Snapshot", "Unlisted"],
                            isExpanded: false
                        }
                    ]
                }
            ]
        },
        {
            name: "Cloud & Persistence",
            icon: "database",
            categories: [
                {
                    name: "Data Architecture",
                    icon: "server",
                    subCategories: [
                        {
                            name: "Split Schema Storage",
                            description: "Separates lightweight map metadata from heavy content trees in Firestore, ensuring near-instant dashboard load times.",
                            icon: "split-square-horizontal",
                            tags: ["Firestore", "Optimization", "Schema"],
                            isExpanded: false
                        },
                        {
                            name: "Firebase Auth",
                            description: "Secure authentication via email/password and Google OAuth with JWT token management.",
                            icon: "lock",
                            tags: ["Auth", "OAuth", "JWT"],
                            isExpanded: false
                        },
                        {
                            name: "Real-time Listeners",
                            description: "Firestore snapshot listeners for live updates and multi-device synchronization.",
                            icon: "radio",
                            tags: ["WebSocket", "Live Updates", "Sync"],
                            isExpanded: false
                        }
                    ]
                },
                {
                    name: "Sync & Reliability",
                    icon: "refresh-cw",
                    subCategories: [
                        {
                            name: "Auto-Save Engine",
                            description: "Debounced 3-second background saving, protecting work during complex expansions and unexpected closures.",
                            icon: "save",
                            tags: ["Debounce", "Background", "Reliability"],
                            isExpanded: false
                        },
                        {
                            name: "Conflict Resolution",
                            description: "Snapshot listeners resolve external changes via 'updatedAt' timestamps safely without overwriting pending content.",
                            icon: "git-merge",
                            tags: ["Merge", "Timestamps", "Safeguard"],
                            isExpanded: false
                        },
                        {
                            name: "JSON Repair Engine",
                            description: "Dual-layered JSON recovery using jsonrepair library and custom structural 'step-back' logic for 100% valid maps.",
                            icon: "wrench",
                            tags: ["Error Recovery", "Robustness", "Parsing"],
                            isExpanded: false
                        }
                    ]
                },
                {
                    name: "Community Hub",
                    icon: "users",
                    subCategories: [
                    {
                        name: "Public Directory",
                        description: "Browse, search, and filter public maps by category with view counts and popularity metrics.",
                        icon: "search",
                        tags: ["Discovery", "Browse", "Categories"],
                        isExpanded: false
                    },
                    {
                        name: "Map Duplication",
                        description: "Copy any public map to your personal library with one click for modification and study.",
                        icon: "copy",
                        tags: ["Clone", "Fork", "Reuse"],
                        isExpanded: false
                    }
                    ]
                }
            ]
        },
        {
            name: "User Management",
            icon: "user",
            categories: [
                {
                    name: "Profile & Settings",
                    icon: "settings",
                    subCategories: [
                        {
                            name: "User Profile",
                            description: "Customizable profile with display name, avatar, bio, and public contribution stats.",
                            icon: "user-circle",
                            tags: ["Identity", "Profile", "Settings"],
                            isExpanded: false
                        },
                        {
                            name: "API Key Management",
                            description: "User-provided AI API keys for enhanced features with Pollinations.ai integration.",
                            icon: "key",
                            tags: ["API Keys", "Pollinations", "Config"],
                            isExpanded: false
                        },
                        {
                            name: "Preferences",
                            description: "Default depth, persona, language, and UI preferences persisted across sessions.",
                            icon: "sliders",
                            tags: ["Defaults", "Customization", "Persistence"],
                            isExpanded: false
                        }
                    ]
                },
                {
                    name: "Progress Tracking",
                    icon: "activity",
                    subCategories: [
                        {
                            name: "Study Time Logs",
                            description: "Invisible background intervals tracking exact minutes spent engaging with content in the visual canvas.",
                            icon: "timer",
                            tags: ["Analytics", "Learning", "Metrics"],
                            isExpanded: false
                        },
                        {
                            name: "Active Streaks",
                            description: "Consecutive day tracker calculated via lastActiveDate parsing, incentivizing daily cognitive engagement.",
                            icon: "flame",
                            tags: ["Gamification", "Retention", "Streaks"],
                            isExpanded: false
                        },
                        {
                            name: "Maps Created Counter",
                            description: "Total count of maps generated by user across all modes and sources.",
                            icon: "map",
                            tags: ["Stats", "Counter", "Activity"],
                            isExpanded: false
                        }
                    ]
                },
                {
                    name: "Gamification",
                    icon: "trophy",
                    subCategories: [
                        {
                            name: "Rank Progression",
                            description: "Unlock up to 15 tier-based badges across distinct usage categories dynamically monitored by tracking engine.",
                            icon: "award",
                            tags: ["Badges", "Tiers", "Achievements"],
                            isExpanded: false
                        },
                        {
                            name: "Badge Categories",
                            description: "Categories include Explorer, Architect, Scholar, and more with unique visual designs.",
                            icon: "medal",
                            tags: ["Categories", "Visual", "Diversity"],
                            isExpanded: false
                        },
                        {
                            name: "Profile Identities",
                            description: "Equip earned badges as profile badges visible across the community gallery and on shared maps.",
                            icon: "user-check",
                            tags: ["Identity", "Display", "Customization"],
                            isExpanded: false
                        }
                    ]
                }
            ]
        },
        {
            name: "Roadmap & Future",
            icon: "rocket",
            categories: [
                {
                    name: "Phase 2: Polish",
                    icon: "polish",
                    subCategories: [
                        {
                            name: "Mobile Responsiveness",
                            description: "Optimized touch interactions with collapsible toolbar, responsive layouts for phone/tablet, and adaptive UI components for canvas and mind map views.",
                            icon: "smartphone",
                            tags: ["Mobile", "Touch", "Responsive", "Tablet"],
                            isExpanded: false
                        },
                        {
                            name: "Audio Summary",
                            description: "AI-powered text-to-speech narration with multiple voice options and adjustable speed. Download summaries as MP3 for offline listening.",
                            icon: "volume-2",
                            tags: ["TTS", "Audio", "Accessibility", "MP3"],
                            isExpanded: false
                        },
                        {
                            name: "Performance Optimization",
                            description: "Client bundle reduction, virtualized rendering for 500+ nodes, and improved load times.",
                            icon: "gauge",
                            tags: ["Speed", "Bundle", "Virtualization"],
                            isExpanded: false
                        }
                    ]
                },
                {
                    name: "Phase 3: Growth",
                    icon: "trending-up",
                    subCategories: [
                        {
                            name: "Real-time Collaboration",
                            description: "Multiple users editing the same map simultaneously with live cursor tracking and presence indicators.",
                            icon: "users",
                            tags: ["Collab", "Live", "Presence"],
                            isExpanded: false
                        },
                        {
                            name: "Offline Mode (PWA)",
                            description: "Service worker for offline access to previously generated maps with sync-on-reconnect.",
                            icon: "wifi-off",
                            tags: ["PWA", "Offline", "Service Worker"],
                            isExpanded: false
                        },
                        {
                            name: "Team Workspaces",
                            description: "Shared team libraries with role-based permissions and collaborative map creation.",
                            icon: "building",
                            tags: ["Teams", "Shared", "RBAC"],
                            isExpanded: false
                        },
                        {
                            name: "Advanced Search",
                            description: "Full-text search across user's maps with semantic similarity matching.",
                            icon: "search",
                            tags: ["Search", "Semantic", "Index"],
                            isExpanded: false
                        },
                        {
                            name: "Mobile App",
                            description: "Native iOS and Android applications for on-the-go learning and map creation.",
                            icon: "smartphone",
                            tags: ["iOS", "Android", "Native"],
                            isExpanded: false
                        }
                    ]
                },
                {
                    name: "Phase 4: Scale",
                    icon: "scale",
                    subCategories: [
                        {
                            name: "Enterprise Features",
                            description: "Custom branding, SSO integration, audit logs, and advanced analytics for organizations.",
                            icon: "building-2",
                            tags: ["Enterprise", "SSO", "Admin"],
                            isExpanded: false
                        },
                        {
                            name: "API Access",
                            description: "Programmatic map generation API for developers with SDK and documentation.",
                            icon: "code",
                            tags: ["API", "SDK", "Developers"],
                            isExpanded: false
                        },
                        {
                            name: "Marketplace",
                            description: "Template marketplace where users can buy, sell, and share map templates.",
                            icon: "store",
                            tags: ["Templates", "Marketplace", "Monetization"],
                            isExpanded: false
                        }
                    ]
                }
            ]
        }
    ]
} as SingleMindMapData;
