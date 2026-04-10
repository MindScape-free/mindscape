# MindScape - Technology Stack

## Core Framework & Language
| Technology | Version | Role |
|------------|---------|------|
| Next.js | ^16.2.1 | Full-stack React framework (App Router) |
| React | ^18.3.1 | UI library |
| TypeScript | ^5 | Language (strict mode, ES2017 target) |
| Node.js | 20+ | Runtime requirement |

## Styling
| Technology | Version | Role |
|------------|---------|------|
| Tailwind CSS | ^3.4.1 | Utility-first CSS |
| tailwind-merge | ^3.0.1 | Conditional class merging (`cn()`) |
| tailwindcss-animate | ^1.0.7 | Animation utilities |
| class-variance-authority | ^0.7.1 | Component variant management |
| Framer Motion | ^11.3.19 | Animations and transitions |

## UI Components
| Technology | Version | Role |
|------------|---------|------|
| Radix UI | various | Headless accessible primitives |
| shadcn/ui | — | Pre-built component library (via components.json) |
| lucide-react | ^0.475.0 | Icon library |
| next-themes | ^0.4.6 | Dark/light theme management |

## Database & Authentication
| Technology | Version | Role |
|------------|---------|------|
| Firebase | ^11.9.1 | Client SDK (Auth + Firestore) |
| firebase-admin | ^10.3.0 | Server SDK for admin operations |
| Firestore | — | NoSQL document database |
| Firebase Auth | — | User authentication |

## AI & External APIs
| Technology | Role |
|------------|------|
| Pollinations.ai | Free AI model provider (Gemini, GPT-5, Claude, DeepSeek) |
| `pollinations-client.ts` | Custom HTTP client for Pollinations API |
| `client-dispatcher.ts` | Routes to correct model based on config |
| Upstash Redis | Rate limiting (`@upstash/ratelimit` ^2.0.8) |
| `@upstash/redis` | ^1.37.0 |

## Document Processing
| Technology | Version | Role |
|------------|---------|------|
| pdfjs-dist | ^5.5.207 | PDF text extraction (client-side) |
| cheerio | ^1.2.0 | HTML parsing for web scraping |
| jsdom | ^29.0.1 | DOM simulation for content extraction |
| @mozilla/readability | ^0.6.0 | Article content extraction |
| youtube-transcript | ^1.2.1 | YouTube caption fetching |
| jsonrepair | ^3.13.3 | Fix malformed AI JSON responses |
| jspdf | ^4.2.1 | PDF export |
| pako | ^2.1.0 | Compression utilities |

## Forms & Validation
| Technology | Version | Role |
|------------|---------|------|
| Zod | ^3.25.76 | Schema validation for AI I/O and forms |
| react-hook-form | ^7.72.0 | Form state management |
| @hookform/resolvers | ^5.2.2 | Zod integration for react-hook-form |

## Data Fetching
| Technology | Version | Role |
|------------|---------|------|
| SWR | ^2.4.1 | Client-side data fetching with caching |
| Next.js Server Actions | — | Primary server communication pattern |
| Fetch API (SSE) | — | Streaming chat responses |

## Analytics & Monitoring
| Technology | Version | Role |
|------------|---------|------|
| @vercel/analytics | ^2.0.1 | Page view and event analytics |
| Custom analytics-tracker | — | Internal event tracking to Firestore |

## Testing
| Technology | Version | Role |
|------------|---------|------|
| Jest | ^30.3.0 | Test runner |
| jest-environment-jsdom | ^30.3.0 | Browser environment simulation |
| @testing-library/react | ^16.3.2 | React component testing |
| @testing-library/jest-dom | ^6.9.1 | DOM matchers |
| ts-jest | ^29.4.6 | TypeScript Jest transformer |
| @playwright/test | ^1.58.2 | E2E testing (configured, not primary) |

## Fonts
- **Space Grotesk** (regular, 500, 700) — Body text
- **Orbitron** (700, 900) — Display/brand headings
- Self-hosted in `public/fonts/` as `.woff2`

## Build & Deployment
| Tool | Config File | Notes |
|------|-------------|-------|
| Next.js build | `next.config.ts` | Turbopack for dev, webpack for prod |
| Vercel | `vercel.json` | Primary deployment target |
| Firebase Hosting | `firebase.json` | Alternative hosting |
| PostCSS | `postcss.config.mjs` | Tailwind processing |
| ESLint | `.eslintrc.json` | Linting |

## TypeScript Configuration
- **Strict mode**: enabled
- **Target**: ES2017
- **Module resolution**: bundler
- **Path alias**: `@/*` → `./src/*`
- **Build errors**: `ignoreBuildErrors: true` in next.config.ts (allows deployment with type errors)

## Security Headers (next.config.ts)
Applied globally to all routes:
- Content-Security-Policy (strict, allows Pollinations.ai and Firebase)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera/microphone/geolocation disabled

## Environment Variables
```env
# Firebase (Required - client)
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID

# Firebase Admin (Server-side)
FIREBASE_ADMIN_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY

# Upstash Redis (Rate limiting)
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN

# Optional
NEXT_PUBLIC_VERCEL_ANALYTICS_ID
POLLINATIONS_API_KEY
```

## Development Commands
```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npm start            # Start production server
npm run lint         # ESLint check
npm run typecheck    # tsc --noEmit (type checking only)
npm test             # Run Jest tests
npm run test:watch   # Jest watch mode
npm run test:coverage # Jest with coverage report
npm run db:reset     # Full database reset (ts-node script)
```

## Key Webpack/Turbopack Aliases
- `canvas` → `./src/lib/empty.ts` (prevents canvas module errors in SSR)
- `encoding` → `false` (prevents encoding module errors)
