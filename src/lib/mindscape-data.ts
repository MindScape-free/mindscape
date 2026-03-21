import { SingleMindMapData } from "@/types/mind-map";

export const mindscapeMap = {
    mode: "single",
    topic: "MindScape Core Architecture",
    shortTitle: "MindScape",
    summary: "A comprehensive map of MindScape's features, AI integrations, data flows, and user engagement mechanics based on the official PRD.",
    icon: "brain-circuit",
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
                            description: "Automated hierarchical structuring from text queries with customizable depth, persona, and web contexts.",
                            icon: "zap",
                            tags: ["Zod Schemas", "Dynamic Depth"],
                            isExpanded: false
                        },
                        {
                            name: "Comparative Analysis",
                            description: "Dual-topic logic engine producing 'Topic A', 'Topic B', and an automated 'Unity Nexus' cross-analysis.",
                            icon: "git-compare-arrows",
                            tags: ["Compare Mode", "Synthesis"],
                            isExpanded: false
                        },
                        {
                            name: "File-to-Map Extraction",
                            description: "Client-side processing of generic PDFs, images, and raw text files into structured visual knowledge hierarchies.",
                            icon: "file-up",
                            tags: ["PDF", "OCR"],
                            isExpanded: false
                        },
                        {
                            name: "Infinite Nested Expansion",
                            description: "Clicking any sub-node dynamically generates a full contextual sub-map that stacks via a breadcrumb history.",
                            icon: "layers",
                            tags: ["Sub-maps", "Miller Columns"],
                            isExpanded: false
                        }
                    ]
                },
                {
                    name: "AI Dispatch & Architecture",
                    icon: "cpu",
                    subCategories: [
                        {
                            name: "Multi-Model Resiliency",
                            description: "Intelligent fallback system with exponential backoff retries, model rotation, and circuit breakers preventing downtime.",
                            icon: "shield-check",
                            tags: ["Pollinations.ai", "Failover"],
                            isExpanded: false
                        },
                        {
                            name: "Smart Routing",
                            description: "Traffic routed based on specific capabilities: Fast (gemini-fast), Accurate (openai), Vision (llama-vision), Reasoning (deepseek).",
                            icon: "route",
                            tags: ["Model Dispatching"],
                            isExpanded: false
                        },
                        {
                            name: "MindSpark Assistant",
                            description: "Context-aware sidebar chat assistant providing in-depth explanations, real-world examples, and immediate feedback.",
                            icon: "bot",
                            tags: ["Chat", "Contextual"],
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
                            name: "Dual Viewing Modes",
                            description: "Toggle between clean hierarchical Accordions and spatial Radial views based on user preference and data density.",
                            icon: "layout",
                            tags: ["Accordion", "Radial"],
                            isExpanded: false
                        },
                        {
                            name: "Visual Feedback",
                            description: "Premium orbital loading animations, UI skeletons, and Materialized navigation removing all UI lag friction.",
                            icon: "loader-2",
                            tags: ["UI/UX", "Animations"],
                            isExpanded: false
                        },
                        {
                            name: "Multilingual Intelligence",
                            description: "On-the-fly component and node translation into 14+ specific languages without reloading.",
                            icon: "languages",
                            tags: ["Localization", "AI Translate"],
                            isExpanded: false
                        }
                    ]
                },
                {
                    name: "Practice & Export",
                    icon: "graduation-cap",
                    subCategories: [
                        {
                            name: "Interactive Quizzes",
                            description: "Auto-generated 5-10 question multiple-choice tests designed to validate learning for any specific topic cluster.",
                            icon: "swords",
                            tags: ["Active Recall", "Assessment"],
                            isExpanded: false
                        },
                        {
                            name: "Knowledge Pack Export",
                            description: "Compiles full active hierarchies into structured, offline-ready PDF documents via jsPDF integration.",
                            icon: "file-down",
                            tags: ["Export", "jsPDF"],
                            isExpanded: false
                        },
                        {
                            name: "Visual Insight Lab",
                            description: "Generates node-specific thumbnails and high-fidelity prompt imagery using models like Flux and ZImage.",
                            icon: "camera",
                            tags: ["Image Gen", "Styles"],
                            isExpanded: false
                        }
                    ]
                }
            ]
        },
        {
            name: "Cloud & Social Mechanics",
            icon: "database",
            categories: [
                {
                    name: "Data Persistence",
                    icon: "save",
                    subCategories: [
                        {
                            name: "Split Schema Storage",
                            description: "Separates lightweight map metadata from heavy content trees in Firestore, ensuring near-instant dashboard load times.",
                            icon: "split-square-horizontal",
                            tags: ["Firestore", "Optimization"],
                            isExpanded: false
                        },
                        {
                            name: "Auto-Save Engine",
                            description: "Debounced 3-second background saving, protecting work during complex expansions and unexpected closures.",
                            icon: "save",
                            tags: ["Reliability", "Sync"],
                            isExpanded: false
                        },
                        {
                            name: "Real-time Conflict Resolution",
                            description: "Snapshot listeners resolve external changes via 'updatedAt' timestamps safely without overwriting pending content.",
                            icon: "refresh-cw",
                            tags: ["Sync", "Safeguard"],
                            isExpanded: false
                        }
                    ]
                },
                {
                    name: "Community & Sharing",
                    icon: "users",
                    subCategories: [
                        {
                            name: "Community Hub",
                            description: "Public directory where users can publish, explore, and duplicate trend-categorized maps created by others.",
                            icon: "globe",
                            tags: ["Gallery", "Discovery"],
                            isExpanded: false
                        },
                        {
                            name: "Universal Sharing",
                            description: "Creates flat-snapshot documents granting unauthenticated guests identical read-access through unlisted URLs.",
                            icon: "share-2",
                            tags: ["Links", "Snapshot"],
                            isExpanded: false
                        }
                    ]
                }
            ]
        },
        {
            name: "Gamification & Progress",
            icon: "trophy",
            categories: [
                {
                    name: "Performance Tracking",
                    icon: "activity",
                    subCategories: [
                        {
                            name: "Study Time Logs",
                            description: "Invisible background intervals tracking exact minutes spent engaging with content in the visual canvas.",
                            icon: "timer",
                            tags: ["Analytics", "Learning"],
                            isExpanded: false
                        },
                        {
                            name: "Active Streaks",
                            description: "Consecutive day tracker calculated via lastActiveDate parsing, incentivizing daily cognitive engagement.",
                            icon: "flame",
                            tags: ["Retention", "Streaks"],
                            isExpanded: false
                        }
                    ]
                },
                {
                    name: "Achievement System",
                    icon: "medal",
                    subCategories: [
                        {
                            name: "Rank Progression",
                            description: "Unlock up to 15 tier-based badges across distinct usage categories dynamically monitored by the tracking engine.",
                            icon: "award",
                            tags: ["Gamification", "Tiers"],
                            isExpanded: false
                        },
                        {
                            name: "Identities",
                            description: "Equip earned badges (e.g., 'Grand Architect', 'Master Diver') as profile badges visible across the community gallery.",
                            icon: "user-check",
                            tags: ["Identity", "Customization"],
                            isExpanded: false
                        }
                    ]
                }
            ]
        }
    ]
} as SingleMindMapData;
