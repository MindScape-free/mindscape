export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQCategory {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  items: FAQItem[];
}

export const GENERAL_FAQS: FAQCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    items: [
      {
        question: 'What is MindScape?',
        answer: 'MindScape is an AI-powered visual learning platform that transforms any topic, document, video, or website into an interactive mind map. It helps you learn faster through structured knowledge graphs, adaptive quizzes, multi-source synthesis, and knowledge alchemy — all powered by AI.'
      },
      {
        question: 'Is MindScape free to use?',
        answer: 'Yes! MindScape is completely free. You just need a free API key from Pollinations.ai (BYOP — Bring Your Own Pollen) to generate mind maps and images. This gives you access to high-quality AI models at no platform cost.'
      },
      {
        question: 'Do I need an account?',
        answer: 'No account is needed to generate maps. However, creating a free account lets you save maps to your Library, sync across devices, track XP and rank, publish to the Community Dashboard, and access your full history.'
      },
      {
        question: 'What AI provider does MindScape use?',
        answer: 'MindScape uses Pollinations.ai as its AI provider, which gives you access to a wide range of models including OpenAI, Claude, Gemini, Groq, and more through a single unified API. You can configure your Pollinations API key in Profile > AI Lab and select your preferred reasoning and image models there.'
      },
      {
        question: 'How is MindScape different from ChatGPT?',
        answer: 'ChatGPT gives you text. MindScape gives you an interactive, visual knowledge graph you can explore, expand, quiz yourself on, fuse concepts together, and build upon. Our deterministic engine ensures structural accuracy with no hallucinated headings.'
      },
      {
        question: 'What languages does MindScape support?',
        answer: 'MindScape supports 50+ languages for both mind map generation and the UI. You can enter topics in any language, generate maps in your preferred language, set your preferred language in Profile > Preferences, and translate maps after generation.'
      },
      {
        question: 'Is my data private?',
        answer: 'Your mind maps are private by default and stored securely in your account. Only maps you explicitly publish to the Community Dashboard become visible to others. We do not use your content for training AI models without your consent.'
      },
    ],
  },
  {
    id: 'mind-maps',
    title: 'Mind Maps & Generation',
    items: [
      {
        question: 'How do I generate a mind map?',
        answer: 'Type any topic into the home page input field and click the arrow button. You can also upload a file (PDF, image, text, .doc), paste a YouTube or website URL. MindScape extracts key concepts and builds an interactive mind map automatically.'
      },
      {
        question: 'What generation modes are available?',
        answer: 'Three modes: Single creates a standard mind map from one topic or source. Compare analyzes two topics side-by-side with similarities and differences highlighted, plus features like Clash Arena and Synthetic Hybrid fusion. Multi-Source combines multiple files, links, and topics into one unified mind map.'
      },
      {
        question: 'What does the depth setting do?',
        answer: 'Depth controls map detail: Quick gives a high-level overview, Balanced provides moderate sub-topics, Detailed creates an extensive richly-layered map. Auto lets the AI decide the best depth based on your topic complexity and source type.'
      },
      {
        question: 'What can I upload as a source?',
        answer: 'MindScape accepts PDFs, images (JPG, PNG), text files (.txt, .doc), YouTube video links (auto-transcribed), and any website URL. Multi-Source mode lets you combine multiple formats into one map.'
      },
      {
        question: 'What personas are available?',
        answer: 'Choose from Teacher (structured teaching with examples), Concise (direct, to-the-point), Creative (imaginative, brainstorming), and Cognitive Sage (deep philosophical analysis). Each tailors the map\'s perspective and depth.'
      },
      {
        question: 'Can I generate images within a mind map?',
        answer: 'Yes! The Visual Insight Lab lets you generate AI images for any node. You can set the model, aspect ratio, style preset, composition, mood, color palette, and lighting to create custom visuals that make your maps more engaging.'
      },
    ],
  },
  {
    id: 'canvas-features',
    title: 'Canvas & Exploration',
    items: [
      {
        question: 'How do I navigate a mind map?',
        answer: 'Switch between Explore View (structured accordion tree layout) and Map View (interactive full-screen tree canvas visualization). Click any node to expand sub-topics and use the search bar to find specific concepts.'
      },
      {
        question: 'What is the explanation feature?',
        answer: 'Click any subcategory node to open the Explanation Dialog with three modes: Beginner, Intermediate, and Expert. Each provides a detailed breakdown of the concept. Completing all sections earns XP and deepens your understanding.'
      },
      {
        question: 'How does the quiz system work?',
        answer: 'Click the Quiz button in the toolbar. The Practice Questions dialog generates adaptive questions based on your map. After answering, weak areas (tag + score) are identified, and MindScape can automatically generate new subcategory nodes to reinforce those concepts via quiz adaptive deepening.'
      },
      {
        question: 'What is the AI chat panel?',
        answer: 'The Chat Panel lets you ask follow-up questions about your mind map in natural language. You can dive deeper into topics, request clarifications, or explore tangents without leaving the canvas. Messages can be pinned for later reference.'
      },
      {
        question: 'What is Knowledge Alchemy?',
        answer: 'Knowledge Alchemy lets you select two concepts in your map and fuse them together to synthesize new insights. Toggle Alchemy mode, pick two nodes, and click "FUSE KNOWLEDGE" to generate a combined analysis.'
      },
      {
        question: 'How does Compare mode work?',
        answer: 'Compare mode generates a side-by-side comparison of two topics with a Unity Nexus (shared concepts), Comparison Dimensions (bento grid), Synthesis Horizon (expert verdict + future evolution), and individual Deep Dives for each topic. Special features include Clash Arena debates, Synthetic Hybrid generation, Contrast Quiz, and Evolution Timeline.'
      },
      {
        question: 'How do I generate images for nodes?',
        answer: 'Click any node and open the Visual Insight Lab. You can set the AI model, aspect ratio (Square, Landscape, Portrait), choose from 16+ style presets, composition, mood, color palette, and lighting. Prompt enhancement is available to refine your image.'
      },
      {
        question: 'What are nested maps?',
        answer: 'Nested maps are sub-maps within your main map. Click the Nested Maps button in the toolbar to expand any topic into its own full mind map, creating a hierarchical learning structure without cluttering the main view.'
      },
    ],
  },
  {
    id: 'saving-sharing',
    title: 'Saving, Sharing & Export',
    items: [
      {
        question: 'How do I save a mind map?',
        answer: 'Maps auto-save to your Library when you\'re logged in. You can also click the Save button (floppy disk icon) in the toolbar anytime. The sync indicator shows save status.'
      },
      {
        question: 'How do I share a mind map?',
        answer: 'Two ways: click the Share button to generate an unlisted share link (anyone with the link can view), or click the Publish (Rocket) button to make it visible on the Community Dashboard for all users to discover.'
      },
      {
        question: 'What export formats are supported?',
        answer: 'You can export your mind map as a detailed PDF (Knowledge Pack) or a summary PDF (Mind Map overview). Chat conversations can also be exported as PDFs. Individual images can be downloaded from the gallery.'
      },
      {
        question: 'Can I publish my map to the community?',
        answer: 'Yes! Click the Publish button (Rocket icon) from the canvas toolbar or Library. AI automatically categorizes your map, and it appears in the Community Dashboard. You can unpublish anytime from the Library preview sheet.'
      },
      {
        question: 'What happens when I delete a map?',
        answer: 'Deleting a map removes it from your Library permanently. If the map was published to the community, it is also removed from the Community Dashboard.'
      },
    ],
  },
  {
    id: 'xp-points',
    title: 'XP & Points System',
    items: [
      {
        question: 'How do I earn XP?',
        answer: 'Earn XP by creating mind maps (+20 XP), completing quizzes (+15 XP), scoring 80%+ bonus (+10 XP), perfect score (+20 XP), daily login (+5 XP), maintaining streaks (3-day +15, 7-day +30, 30-day +100), study time on canvas (+3 XP per 10 min), chat messages, generating images, publishing maps, fusing knowledge via Alchemy, and unlocking achievements (up to +500 XP).'
      },
      {
        question: 'What are XP ranks?',
        answer: '10 ranks: Spark (0), Thinker (100), Explorer (300), Mapper (700), Architect (1,500), Scholar (3,000), Sage (6,000), Luminary (12,000), Oracle (25,000), MindMaster (50,000+). Each rank has a unique badge and color displayed in the navbar and profile.'
      },
      {
        question: 'What are daily caps?',
        answer: 'Each XP event has a daily cap to ensure fair play. For example, MAP_CREATED is capped at 10 per day, QUIZ_COMPLETED at 5 per day, CHAT_MESSAGE at 40 per day. Caps reset at midnight UTC.'
      },
      {
        question: 'How do streak multipliers work?',
        answer: 'Your daily login streak applies a multiplier to ALL XP earned, not just login. 7+ days = 1.2x, 30+ days = 1.5x, 100+ days = 2.0x. Breaking your streak removes the multiplier but never deducts earned XP.'
      },
      {
        question: 'Can I lose XP?',
        answer: 'No. XP only goes up. Breaking a streak removes the multiplier bonus but never deducts earned points.'
      },
      {
        question: 'What is Pollen?',
        answer: 'Pollen is your AI usage balance from Pollinations.ai, displayed in the navbar with a mushroom emoji. It powers all AI operations. You can check your balance and connect your Pollinations account in Profile > AI Lab.'
      },
    ],
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting & Support',
    items: [
      {
        question: 'Map generation failed. What should I do?',
        answer: 'Check your Pollen balance in Profile > AI Lab. If low, connect your Pollinations account. Ensure your topic is clear and specific. Try switching to a different AI model or using a simpler depth setting. If it persists, submit feedback.'
      },
      {
        question: 'Why is AI response taking too long?',
        answer: 'Generation time depends on depth and complexity. Detailed maps with multiple sources take longer. Try Quick depth for faster results, or check your internet connection.'
      },
      {
        question: 'My map is not saving properly.',
        answer: 'Ensure you\'re logged in with a stable connection. Maps auto-save, but you can also click Save manually. If issues persist, refresh the page.'
      },
      {
        question: 'How do I change or reset my API key?',
        answer: 'Go to Profile > AI Lab. You can connect/disconnect your Pollinations account, update your API key, or select different AI models (OpenAI, Claude, Gemini, Groq, etc.) through Pollinations. Changes take effect immediately.'
      },
      {
        question: 'How do I report a bug or suggest a feature?',
        answer: 'Use the Feedback page to submit bug reports, suggestions, improvements, or feature requests. You can track your submission status on the Community Insights board.'
      },
    ],
  },
];

export const HOME_FAQS: FAQItem[] = [
  {
    question: 'How do I start generating a mind map?',
    answer: 'Type any topic into the input field and click the arrow button. You can also upload a file (PDF, image, text) or paste a YouTube/website URL. Select your mode (Single, Compare, Multi-Source), set depth, persona, and language, then MindScape builds your interactive mind map.'
  },
  {
    question: 'What source types can I use?',
    answer: 'Enter a text topic, upload PDFs/images/text/.doc files, paste a YouTube link (auto-transcribed), or any website URL. Multi-Source mode combines any of these into one unified map.'
  },
  {
    question: 'What is the difference between Single, Compare, and Multi-Source modes?',
    answer: 'Single creates a map from one topic or source. Compare generates a side-by-side comparison of two topics with Clash Arena debates, Synthetic Hybrid fusion, Contrast Quiz, and Evolution Timeline. Multi-Source combines multiple files, links, and topics into a single unified knowledge graph.'
  },
  {
    question: 'What do the depth options mean?',
    answer: 'Quick = concise high-level overview. Balanced = moderate detail with sub-topics. Detailed = extensive, richly layered map. Auto = AI picks the best depth based on your topic and source type (PDFs auto-select Detailed, YouTube auto-select Balanced, etc.).'
  },
  {
    question: 'How does file upload work?',
    answer: 'Click the upload icon and select a file. MindScape extracts key concepts and builds a mind map. PDFs get text and structure extracted, images get visual content analyzed. YouTube links are auto-transcribed.'
  },
  {
    question: 'What personas are available?',
    answer: 'Teacher (structured with examples), Concise (direct and brief), Creative (imaginative brainstorming), and Cognitive Sage (deep philosophical analysis). Default is Teacher.'
  },
];

export const CANVAS_FAQS: FAQItem[] = [
  {
    question: 'How do I switch between Explore View and Map View?',
    answer: 'Use the toggle buttons in the toolbar. Explore View shows a structured accordion tree layout with expandable sections. Map View displays your map as a full-screen interactive tree canvas visualization.'
  },
  {
    question: 'How do I explore nodes and sub-topics?',
    answer: 'Click any node to expand its sub-topics and drill down into specific concepts. Use the search bar to quickly find any node. Breadcrumb navigation shows your current position in the tree.'
  },
  {
    question: 'How does the explanation system work?',
    answer: 'Click any subcategory node to open the Explanation Dialog. Choose from Beginner, Intermediate, or Expert mode for a detailed breakdown covering key ideas, context, and applications. Completing sections earns XP. You can also rate your confidence on each node.'
  },
  {
    question: 'How do I take a quiz on my map?',
    answer: 'Click the Quiz button in the toolbar. AI generates practice questions based on your map. After answering, weak areas (tag + score) are identified and can be used to automatically generate new subcategory nodes to reinforce those concepts.'
  },
  {
    question: 'Can I chat with AI about my map?',
    answer: 'Yes! The Chat Panel lets you ask follow-up questions, request clarifications, explore tangents, or dive deeper into concepts — all in natural language without leaving the canvas. You can pin important messages for later.'
  },
  {
    question: 'How do I save my progress?',
    answer: 'Maps auto-save when logged in. Click the Save button in the toolbar anytime. The sync indicator shows save status.'
  },
  {
    question: 'How do I generate images?',
    answer: 'Open the Visual Insight Lab from any node. Configure the model, aspect ratio (Square/Landscape/Portrait), style preset (16+ options like Cinematic, Anime, Oil Painting, Cyberpunk), composition, mood, color palette, and lighting. Use prompt enhancement for better results.'
  },
  {
    question: 'What are nested maps?',
    answer: 'Click the Nested Maps button (Network icon) to expand any topic into its own full mind map. This creates hierarchical learning without cluttering the main view.'
  },
  {
    question: 'What is Knowledge Alchemy?',
    answer: 'Toggle Alchemy mode, select two concepts, and click "FUSE KNOWLEDGE" to synthesize new insights combining both topics. This is an advanced learning feature for creating connections between ideas.'
  },
  {
    question: 'What features are available in Compare mode?',
    answer: 'Compare mode includes Unity Nexus (shared concepts), Comparison Dimensions (bento grid), Synthesis Horizon (verdict + future), Clash Arena (AI debate), Synthetic Hybrid (topic fusion), Contrast Quiz, Evolution Timeline, and individual Deep Dives for each topic.'
  },
];

export const LIBRARY_FAQS: FAQItem[] = [
  {
    question: 'How do I organize my saved maps?',
    answer: 'Maps are displayed in a grid sorted by most recent. Search by topic name, sort by A-Z or oldest first. The preview sheet shows depth, architecture mode, node count, pathways, and publication status.'
  },
  {
    question: 'What actions can I take on a map?',
    answer: 'Each map card has buttons for: Quick Details (info sheet), Share to Community (Rocket), Create Share Link (unlisted link), New Thumbnail (Image Lab), Delete Forever (with confirmation), and Open Full Map (canvas).'
  },
  {
    question: 'How do I share or publish a map from the library?',
    answer: 'Click the Share button (Share2 icon) to generate an unlisted link. Click the Publish button (Rocket icon) to make it visible on the Community Dashboard. Published maps show a "PUBLISHED" badge and "Live on Community" status.'
  },
  {
    question: 'What is the Image Lab in the library?',
    answer: 'The Image Lab lets you regenerate thumbnails for your maps using AI. Click the image icon on any map card to open it. You can set the model, style, composition, mood, and other parameters for the new thumbnail.'
  },
  {
    question: 'Can I download maps from my library?',
    answer: 'Yes! The preview sheet offers two PDF options: "Knowledge Pack" (detailed full export) and "Mind Map overview" (summary export). Files are saved as `{topic}_Knowledge_Pack.pdf` and `{topic}_MindMap.pdf`.'
  },
  {
    question: 'What is the Neural Expansion Paths section?',
    answer: 'In the preview sheet, AI suggests related topics for expansion. Each suggestion has two options: "Generate in Background" (via notifications) or "Start Creation Now" (immediate canvas redirect).'
  },
];

export const COMMUNITY_FAQS: FAQItem[] = [
  {
    question: 'How do I publish a map to the community?',
    answer: 'Open any map from your Library or Canvas, click the Publish button (Rocket icon). AI automatically categorizes it. Once published, it appears on the Community Dashboard for all users to discover.'
  },
  {
    question: 'How do I remove my map from the community?',
    answer: 'From the Library preview sheet, click "UNPUBLISH" in the Publication Hub card. The map stays in your Library as private.'
  },
  {
    question: 'How can I browse and discover maps?',
    answer: 'Search by keyword, filter by AI-generated categories, and sort by Latest or Trending (most views). Click any map card to open it in read-only mode on the canvas.'
  },
  {
    question: 'Can I see who created a community map?',
    answer: 'Yes, each card shows the author\'s name and avatar. Maps open in read-only mode — you cannot edit unless you are the original author.'
  },
  {
    question: 'Are community maps moderated?',
    answer: 'Maps are auto-categorized by AI on publication. Admins can review and remove content. Report issues via the Feedback page.'
  },
];

export const PROFILE_FAQS: FAQItem[] = [
  {
    question: 'What tabs are on my profile?',
    answer: 'Four tabs: Dashboard (stats, heatmap, achievements, activity), AI Lab (Pollinations connection, API keys), Preferences (language, persona, AI models), and Security (password, sign out, account deletion).'
  },
  {
    question: 'What stats are shown on the Dashboard?',
    answer: 'Eight stat cards: Current maps, All Time maps, Expansions, Nodes, Avg Nodes, Images, Streak (days), and Study time. A 12-week activity heatmap shows daily breakdowns. There\'s also a Mindmap Index table and Achievements grid.'
  },
  {
    question: 'How do I connect my Pollinations account?',
    answer: 'Go to Profile > AI Lab. Click "Connect to Pollinations" for OAuth authorization. You can also manually enter an API key and verify it. The status shows your Link State (BOUND/SHARED) and Pollen balance.'
  },
  {
    question: 'What can I configure in Preferences?',
    answer: 'Set your preferred language, default AI persona (Teacher, Concise, Creative, Cognitive Sage), Reasoning Model, and Image Model.'
  },
  {
    question: 'What is study time tracking?',
    answer: 'MindScape tracks time spent on the canvas and in chat. Every 10 minutes in either earns study time XP (+3 for canvas, +2 for chat). Total study time shows on your profile.'
  },
  {
    question: 'How do I view my activity history?',
    answer: 'The Dashboard tab shows recent activity with a timeline of actions. The 84-day heatmap visualizes daily activity including maps, sub-maps, images, nodes, and study minutes.'
  },
  {
    question: 'How do I sync my profile data?',
    answer: 'Click the "Sync Neural Core" button on the Dashboard tab to refresh your stats, achievements, and activity data.'
  },
];

export const POINTS_FAQS: FAQItem[] = [
  {
    question: 'Do I lose points?',
    answer: 'No. Points only go up. Breaking a streak removes the multiplier bonus but never deducts earned XP.'
  },
  {
    question: 'What do points unlock?',
    answer: 'Ranks and badges with unique colors and titles: Spark, Thinker, Explorer, Mapper, Architect, Scholar, Sage, Luminary, Oracle, and MindMaster. Future updates will add profile customization and community perks.'
  },
  {
    question: 'Why are there daily caps?',
    answer: 'Caps keep the system fair. Without them, someone could spam 500 maps in a day and skip 10 levels. Caps reward consistent daily use over one-day farming.'
  },
  {
    question: 'Can I see my full history?',
    answer: 'Your profile Dashboard shows an 84-day (12-week) activity heatmap with daily breakdowns of maps, images, expansions, and study time. The Points dialog shows a 14-day XP sparkline with daily point totals and category-level daily cap progress.'
  },
  {
    question: 'When do streak bonuses apply?',
    answer: 'The multiplier applies to every point you earn while the streak is active, not just login. A 30-day streak (1.5x) turns a +20 XP map into +30 XP. 100-day streak gives 2.0x on everything.'
  },
  {
    question: 'How do I check my current rank?',
    answer: 'Your rank badge and XP total are displayed in the navbar. Click the badge to open the Points dialog for a detailed breakdown, including next rank requirements.'
  },
];

export const FEEDBACK_FAQS: FAQItem[] = [
  {
    question: 'How do I submit feedback?',
    answer: 'Fill out the form on the Feedback page. Select the type (Bug Report, Suggestion, Improvement, or Feature Request), provide a title and detailed description, and submit. Your feedback is logged with a tracking ID.'
  },
  {
    question: 'Can I track my feedback status?',
    answer: 'Yes! The Community Insights board shows all submissions with their status: Open, In Progress, Resolved, or Closed. You can see what\'s being worked on.'
  },
  {
    question: 'How do I report a bug?',
    answer: 'Select "Bug Report" as the type, provide a clear title, and include steps to reproduce. Screenshots or error messages help us resolve it faster.'
  },
  {
    question: 'How do I suggest a new feature?',
    answer: 'Select "Feature Request" as the type, give it a descriptive title, and explain what it does and why it would be valuable. Check existing suggestions first to avoid duplicates.'
  },
];

export const ADMIN_FAQS: FAQItem[] = [
  {
    question: 'What tabs are on the admin page?',
    answer: 'Five tabs: Overview (platform metrics, health score, growth charts), Users (search, manage accounts), Activity (live event stream), Telemetry (AI call logs and performance), and Feedback (user reports).'
  },
  {
    question: 'What metrics are shown in Overview?',
    answer: 'New users today/this week, new maps today/this week, active users (24h/7d), engagement rate, total mindmaps ever, average maps per user, health score, top contributors, user/map growth, and daily snapshot heatmap.'
  },
  {
    question: 'How do I manage users?',
    answer: 'Go to the Users tab. Search by display name or email. Sort by latest, oldest, A-Z, or Z-A. Click any user to open a detail dialog with full profile info and delete capability.'
  },
  {
    question: 'How do I sync or recompute platform stats?',
    answer: 'Click "Full refresh: recompute + sync source tables" on the Overview tab. Or use the dropdown for "Rebuild stats from raw events" only. Stats also auto-recompute via cron every 5 minutes.'
  },
  {
    question: 'What AI telemetry is available?',
    answer: 'The Telemetry tab shows AI usage stats: total calls, success/failure rates, provider distribution, model usage, and performance metrics to monitor AI provider health.'
  },
];
