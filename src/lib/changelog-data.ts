
import { Sparkles, Zap, Palette, Layout, Network, Image as ImageIcon, FastForward, Info, Shield, Brain, Cpu, RefreshCw, Trash2, Eye, FileText, MessageSquare, Search, Youtube, Layers, Globe, Folders, SlidersHorizontal, ListFilter } from 'lucide-react';

export interface ChangelogHighlight {
    icon: any;
    color: string;
    title: string;
    description: string;
}

export interface ChangelogVersion {
    version: string;
    slug: string;
    date: string;
    title: string;
    description?: string;
    summary: string;
    coverImage: string;
    tags: string[];
    impact: 'major' | 'minor' | 'patch';
    highlights: ChangelogHighlight[];
    content: string[];
}

export const CHANGELOG_DATA: ChangelogVersion[] = [
    {
        version: '1.6.0',
        slug: 'multi-source-auto-depth',
        date: 'March 20, 2026',
        title: 'Multi-Source Mode & Auto Depth Intelligence',
        summary: 'Merge PDFs, URLs, text, and images into one mind map. AI now auto-selects the ideal depth. New image models, multi-file upload, and a polished source management UI.',
        coverImage: '/changelog/homepage-hero.png',
        tags: ['AI', 'Multi-Source', 'UI/UX', 'Image Models'],
        impact: 'major',
        highlights: [
            {
                icon: Folders,
                color: 'text-violet-400 bg-violet-500/10',
                title: 'Multi-Source Mode',
                description: 'Combine PDFs, URLs, plain text, and images into a single merged mind map. Sources are delimited and fed as unified context to the AI.',
            },
            {
                icon: Sparkles,
                color: 'text-pink-400 bg-pink-500/10',
                title: 'Auto Depth Intelligence',
                description: 'A new "Auto" depth option lets the AI analyze your topic and decide whether Low, Medium, or Deep is the ideal exploration level.',
            },
            {
                icon: ImageIcon,
                color: 'text-amber-400 bg-amber-500/10',
                title: 'Updated Image Model Roster',
                description: 'Dirtberry Pro and FLUX.2 Klein 4B added to the Visual Insight Lab and AI Lab model selectors, matching the current Pollinations free model list.',
            },
            {
                icon: SlidersHorizontal,
                color: 'text-emerald-400 bg-emerald-500/10',
                title: 'Source Management UI',
                description: 'New Sources pill list with a context usage progress bar, percentage label, and a Clear All button. Multi-file upload now supports selecting multiple files at once.',
            },
        ],
        content: [
            "This is the biggest input-layer upgrade MindScape has ever received. You can now feed the AI from multiple sources simultaneously, let it decide how deep to go, and manage everything from a polished source panel.",
            "## Multi-Source Mode",
            "The new **Multi-Source** mode (marked NEW in the mode selector) lets you combine any mix of PDFs, website URLs, plain text, and images into a single generation. Each source is processed and merged into a `--- SOURCE: label (TYPE) ---` delimited string, giving the AI full context from all your materials at once. A 100,000 character (~25K token) budget ceiling is enforced with a live progress bar so you always know how much context you've used.",
            "## Auto Depth Intelligence",
            "Choosing the right depth used to be a manual guess. The new **Auto** option (with a pink Sparkles icon in the depth selector) makes a fast AI call before generation to analyze your topic's complexity. Simple topics like 'Apple fruit' resolve to Quick, moderately complex ones like 'Machine Learning' resolve to Balanced, and vast multi-disciplinary topics like 'Quantum Computing' resolve to Detailed. This works across all generation paths — topic, PDF, text, and website.",
            "## Updated Image Model Roster",
            "The Visual Insight Lab dialog and the AI Lab model selector on the profile page now reflect the current free Pollinations model list. Two models were missing and have been added: **Dirtberry Pro** (api.airforce, 650 imgs/pollen, $0.0015/img) and **FLUX.2 Klein 4B** (100 imgs/pollen, $0.01/img). A stale legacy remap (`flux-pro` → `klein-large`) in the profile page was also corrected to properly remap to `flux`.",
            "## Source Management UI",
            "The SourcePillList component received several quality-of-life improvements. The header now shows `Sources : {count}` for clarity. A **Clear All** button appears as a pill next to the count, styled subtly and turning red on hover. The context usage progress bar now includes a percentage label at the right end, color-matched to the bar's fill state (green → amber → red as you approach the limit).",
            "## Multi-File Upload",
            "The hidden file input in Multi-Source mode now has the `multiple` attribute, allowing you to select several PDFs, images, or text files in a single file picker dialog. Each file is processed and added as a separate source automatically.",
            "## Scroll & Layout Fix",
            "Multi-Source mode previously locked the page scroll, making the source pill list unreachable on smaller screens. The root wrapper now switches between `overflow-hidden` (single/compare) and `overflow-y-auto` (multi) based on the active mode, and the body overflow lock is keyed to the same state.",
        ],
    },
    {
        version: '1.5.5',
        slug: 'library-badge-youtube-fix',
        date: 'March 11, 2026',
        title: 'Library Badge & YouTube Intelligence Fix',
        summary: 'Consistent badge terminology, horizontal source/depth alignment, and fixed depth detection for YouTube mind maps.',
        coverImage: '/changelog/library-badges-refinement.png',
        tags: ['UI/UX', 'YouTube', 'Refinement', 'Library'],
        impact: 'minor',
        highlights: [
            {
                icon: Layers,
                color: 'text-blue-400 bg-blue-500/10',
                title: 'Quick, Balanced, Detailed',
                description: 'Standardized depth terminology across the platform for better clarity on generation intensity.',
            },
            {
                icon: Youtube,
                color: 'text-red-400 bg-red-500/10',
                title: 'YouTube Data Tracking',
                description: 'Fixed a critical issue where YouTube-sourced mind maps were missing depth information and source badges.',
            },
            {
                icon: Layout,
                color: 'text-purple-400 bg-purple-500/10',
                title: 'Perfect Badge Alignment',
                description: 'Refined Library cards with a grid-based badge system, ensuring uniform horizontal alignment and readability.',
            },
            {
                icon: Globe,
                color: 'text-emerald-400 bg-emerald-500/10',
                title: 'Community Centering',
                description: 'Public mind maps now feature a perfectly centered community badge for a symmetrical and balanced card UI.',
            },
        ],
        content: [
            "This refinement update focuses on visual harmony and data consistency across your mind map library, with a special emphasis on YouTube-sourced intelligence.",
            "## Standardized Terminology",
            "We've moved away from generic 'Low/Medium/Deep' labels. All mind maps now clearly state their complexity level as **Quick**, **Balanced**, or **Detailed**. This change is reflected in both the library cards and the quick-details preview sheet for a unified experience.",
            "## Architectural Badge Alignment",
            "The top of each mind map card has been redesigned with a 3-column grid system. This ensures that the Depth badge (left), Community badge (center), and Source badge (right) are always perfectly aligned horizontally, maintaining a consistent height of 20px even when multiple badges are present.",
            "## YouTube Intelligence Fix",
            "We resolved a data-passing issue in the YouTube AI flow that caused videos to lose their 'Depth' metadata after generation. YouTube sources are now correctly identified and display their corresponding depth intensity and source icons in the library.",
            "## Readability Upgrades",
            "All badges now feature enhanced backdrop blurs (`backdrop-blur-xl`), increased background opacity, and subtle text shadows. This ensures that labels remain razor-sharp and legible even when positioned over vibrant or complex map thumbnails.",
        ],
    },
    {
        version: '1.5.0',
        slug: 'pdf-mastery-ai-image-lab',
        date: 'March 9, 2026',
        title: 'PDF Mastery & AI Image Lab Rework',
        summary: 'Deep PDF data extraction, a completely rebuilt AI Image Lab, and AI chat with real-time web search and document context.',
        coverImage: '/changelog/pdf-ai-lab.png',
        tags: ['AI', 'PDF', 'UI/UX', 'Knowledge'],
        impact: 'major',
        highlights: [
            {
                icon: FileText,
                color: 'text-blue-400 bg-blue-500/10',
                title: 'PDF Deep Extraction',
                description: 'Generate comprehensive mind maps directly from PDF raw data with a new specialized extraction engine.',
            },
            {
                icon: ImageIcon,
                color: 'text-amber-400 bg-amber-500/10',
                title: 'AI Image Lab Rework',
                description: 'A completely redesigned interface for generating and enhancing AI images with improved prompt intelligence.',
            },
            {
                icon: MessageSquare,
                color: 'text-purple-400 bg-purple-500/10',
                title: 'Contextual AI Chat',
                description: 'AI chat now supports real-time web search and integrates PDF context for highly accurate responses.',
            },
            {
                icon: Layout,
                color: 'text-emerald-400 bg-emerald-500/10',
                title: 'UI & Profile Rework',
                description: 'A cleaner profile page and massive performance cleanup, removing redundant legacy modules.',
            },
        ],
        content: [
            "This major update (synchronizing with v.7.x development) represents a massive leap in how MindScape handles deep knowledge and creative workflows.",
            "## PDF Deep Extraction & Mastery",
            "We've implemented a 'Deep Mode' for PDF analysis. Instead of just reading text, the system now performs structured raw data extraction. This allows MindScape to build extremely detailed mind maps from complex documents, maintaining hierarchies and technical context that simple LLM parsing often misses.",
            "## AI Image Lab Overhaul",
            "The Image Lab has been completely rebuilt from the ground up. We've introduced a more intuitive manual and automatic prompting system, better model selection (Respecting your preferred providers), and a sleek gallery-style interface for previewing and regenerating visuals.",
            "## Smarter AI Chat",
            "Your AI assistant is now more capable than ever. It can now reference 'Raw PDF Data' directly in its chat responses. We've also integrated a standard web search feature, allowing the assistant to pull in real-world facts and news to supplement your mind maps and study sessions.",
            "## Platform Consolidation",
            "In this cycle, we've also performed a massive 'spring cleaning' of the codebase. We removed several legacy modules like the Pollen tracker and experimental DOC features, resulting in a significantly faster and more stable platform. The profile page was also redesigned for better accessibility and clarity.",
        ],
    },
    {
        version: '1.4.0',
        slug: 'intelligence-engine-overhaul',
        date: 'February 28, 2026',
        title: 'Intelligence Engine Overhaul',
        summary: 'Major AI reliability improvements — smarter model selection, template echo protection, and real-time thumbnail updates for nested maps.',
        coverImage: '/changelog/canvas-mindmap.png',
        tags: ['AI', 'Reliability', 'UX', 'Performance'],
        impact: 'major',
        highlights: [
            {
                icon: Brain,
                color: 'text-purple-400 bg-purple-500/10',
                title: 'Consistent Model Selection',
                description: 'Your chosen AI model is now respected across all generation modes — single, compare, and sub-maps. No more silent overrides.',
            },
            {
                icon: Shield,
                color: 'text-emerald-400 bg-emerald-500/10',
                title: 'Template Echo Protection',
                description: 'New validation layer detects when AI echoes prompt templates instead of generating real content. Auto-retries with model rotation for guaranteed results.',
            },
            {
                icon: Eye,
                color: 'text-blue-400 bg-blue-500/10',
                title: 'Live Thumbnail Refresh',
                description: 'Nested map thumbnails now update in real-time when generated — no more manual page refresh needed.',
            },
            {
                icon: Trash2,
                color: 'text-red-400 bg-red-500/10',
                title: 'Codebase Cleanup',
                description: 'Removed experimental Warp and Mentor features. Deprecated deepseek-chat model removed with automatic fallback for users with stale preferences.',
            },
        ],
        content: [
            "This release focuses on the invisible but critical infrastructure that powers every mind map you generate. We've rebuilt the model selection pipeline to be more predictable, more reliable, and fully respectful of your preferences.",
            "## Smarter Model Selection",
            "Previously, when you selected a specific AI model in your profile, the system would silently override your choice for certain generation modes like Compare or deep-dive maps. This happened because the internal 'capability' system would discard your model when it decided a different capability (like 'reasoning') was needed.",
            "Now, your model choice is always passed through first. The capability hint is still sent for auto-select fallback, but it never overrides an explicit user selection. This means consistent output quality across single mode, compare mode, and all sub-map generations.",
            "## Template Echo Protection",
            "We discovered a rare but frustrating bug where some AI models would echo back the JSON template from our prompt instead of generating real content. The result was a mind map filled with placeholder text like 'Subtopic Name' and 'Category Name'.",
            "The new template detection system checks every generation against a set of known placeholder markers. If 2+ markers are found, the generation is automatically retried with a different model — up to 3 attempts with automatic model rotation. The system prompt was also enhanced with explicit anti-template instructions.",
            "## Real-Time Thumbnail Updates",
            "The nested maps dialog (Knowledge Navigator) now reflects thumbnail changes instantly. Previously, when you generated a new thumbnail for a sub-map, the card in the navigator would still show the old image until you refreshed the browser. The fix was a priority resolution change — the dialog now reads from the live `thumbnailOverrides` state before falling back to persisted Firestore data.",
            "## Cleanup & Deprecations",
            "The experimental **Warp** (Perspective Warp) and **Mentor Roleplay** features have been fully removed. These were partially wired handlers with no clear product surface. The deprecated `deepseek-chat` model was also removed from the available models list, with a sanitization layer added to gracefully handle users whose saved preferences reference it.",
        ],
    },
    {
        version: '1.3.0',
        slug: 'quantum-navigation-skeletons',
        date: 'February 26, 2026',
        title: 'Quantum Navigation & Skeletons',
        summary: 'Massive performance upgrade for navigation and loading states with instant canvas transitions.',
        coverImage: '/changelog/library-thumbnails.png',
        tags: ['Performance', 'UX', 'Navigation'],
        impact: 'major',
        highlights: [
            {
                icon: FastForward,
                color: 'text-emerald-400 bg-emerald-500/10',
                title: 'Instant Navigation',
                description: 'We removed blocking home page overlays. Click "Generate" and jump straight to the canvas instantly.',
            },
            {
                icon: Network,
                color: 'text-primary bg-primary/10',
                title: 'Mind Map Skeletons',
                description: 'New specialized radial skeletons show a pulsing "building" state for your maps while AI works.',
            },
            {
                icon: Layout,
                color: 'text-blue-400 bg-blue-500/10',
                title: 'Page Recovery',
                description: 'Added high-fidelity skeletons for Community and Profile pages for a flicker-free experience.',
            },
        ],
        content: [
            "This release is all about speed and perceived performance. We've fundamentally changed how navigation works in MindScape to eliminate the feeling of 'waiting'.",
            "## Instant Canvas Navigation",
            "Previously, clicking 'Generate' on the home page would show a full-screen overlay while the AI started working. This blocked all interaction and felt slow. Now, you're immediately routed to the canvas page where a beautiful radial skeleton animation plays while your map generates in the background.",
            "## Skeleton Loading States",
            "Every major page now has purpose-built skeleton states. The mind map canvas shows an animated radial network, the Community page shows card placeholders, and the Profile page shows a structured layout skeleton. These are designed to match the final UI layout, so the transition from loading to loaded feels seamless.",
            "## Technical Details",
            "The navigation change was achieved by moving the generation trigger from the home page to the canvas page's `useEffect`. The canvas now reads URL parameters to determine what to generate, and the generation happens client-side after mount. This eliminates the need for any blocking overlay.",
        ],
    },
    {
        version: '1.2.5',
        slug: 'nested-maps-miller-columns',
        date: 'February 20, 2026',
        title: 'Nested Maps: Miller Columns',
        summary: 'The Knowledge Navigator gets a powerful Miller Columns interface for deep, multi-level exploration.',
        coverImage: '/changelog/nested-maps-miller.png',
        tags: ['Navigation', 'UX', 'Nested Maps'],
        impact: 'minor',
        highlights: [
            {
                icon: Network,
                color: 'text-purple-400 bg-purple-500/10',
                title: 'Miller Columns',
                description: 'The Nested Maps explorer now uses a smooth, multi-column Miller Columns interface for deep navigation.',
            },
            {
                icon: ImageIcon,
                color: 'text-amber-400 bg-amber-500/10',
                title: 'Visual Insight Lab',
                description: 'Generate and enhance high-resolution thumbnails for your nested maps directly from the new Insight Lab.',
            },
        ],
        content: [
            "This release introduces a completely new way to navigate your knowledge graph. The flat list of nested maps has been replaced with an elegant Miller Columns interface — the same pattern used by macOS Finder.",
            "## Miller Columns Navigation",
            "Each level of your mind map hierarchy gets its own scrollable column. Click a node to reveal its children in the next column. This makes it intuitive to explore deep, multi-level structures without losing context of where you are.",
            "## Visual Insight Lab",
            "Every nested map card now has a sparkle button that opens the Visual Insight Lab. Here you can generate high-resolution AI thumbnails for your sub-maps, making the Knowledge Navigator visually rich and easier to scan.",
        ],
    },
    {
        version: '1.2.0',
        slug: 'visual-polish-stability',
        date: 'February 15, 2026',
        title: 'Visual Polish & Stability',
        summary: 'Redesigned toolbar, improved persistence, and squashed circular reference bugs.',
        coverImage: '/changelog/toolbar-polish.png',
        tags: ['Design', 'Stability', 'Persistence'],
        impact: 'minor',
        highlights: [
            {
                icon: Palette,
                color: 'text-pink-400 bg-pink-500/10',
                title: 'Redesigned Toolbar',
                description: 'Fresh look for the MindMap toolbar with distinct colors for Imaging, Challenge, and Summary.',
            },
            {
                icon: Zap,
                color: 'text-amber-400 bg-amber-500/10',
                title: 'Better Persistence',
                description: 'Fixed issues with map saving and circular reference errors during complex AI generations.',
            },
        ],
        content: [
            "A focused polish release that improves the visual quality of the toolbar and fixes several data persistence bugs.",
            "## Redesigned Toolbar",
            "The mind map toolbar has been completely refreshed with distinct color-coded sections. The Imaging tools use violet, Challenge/Quiz uses amber, and Summary uses blue. Each tool now has a more prominent icon and label with hover effects that feel premium.",
            "## Persistence Fixes",
            "We fixed a critical bug where complex mind maps with deeply nested sub-maps would fail to save due to circular reference errors in the JSON serialization. The fix uses a custom serializer that strips circular references before saving to Firestore.",
        ],
    },
];

export const CURRENT_VERSION = CHANGELOG_DATA[0].version;
export const STORAGE_KEY = 'mindscape_changelog_version';
