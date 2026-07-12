import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ── Configuration ───────────────────────────────────────────────

/** Routes accessible without authentication (exact path match). */
const publicRoutes = new Set([
  '/',
  '/auth/callback',
  '/auth/reset-password',
  '/signup',
  '/signin',
  '/login',
  '/api/auth',
  '/api/stats/public',
  '/api/models',
  '/api/analytics/track', // Public analytics — handles anonymous events (user_id = null)
  '/robots.txt',
  '/sitemap.xml',
])

/** Route prefixes that REQUIRE authentication. */
const protectedApiPrefixes = [
  '/api/chat',
  '/api/scrape-url',
  '/api/extract',
  '/api/generate-image',
  '/api/generate-audio',
  '/api/generate-quiz-direct',
  '/api/youtube-transcript',
  '/api/analytics',
  '/api/admin',
  '/api/admin-sync',
]

// ── Middleware ───────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Skip middleware for known public routes
  if (publicRoutes.has(pathname)) {
    return NextResponse.next()
  }

  // 2. Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/fonts') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api/og') ||
    pathname.startsWith('/images/')
  ) {
    return NextResponse.next()
  }

  // 3. Build the Supabase SSR client for cookie-based session
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('[Middleware] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
    if (process.env.NODE_ENV === 'production') {
      return new NextResponse('Server configuration error', { status: 500 })
    }
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // 4. Refresh the session and get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 5. Protect API routes — return 401 if unauthenticated
  //    Checks cookie session first, then falls back to Bearer token in Authorization header
  //    (some API routes like /api/chat/stream use token-based auth for streaming)
  const isProtectedApi = protectedApiPrefixes.some((prefix) =>
    pathname.startsWith(prefix)
  )

  if (isProtectedApi) {
    if (user) {
      return supabaseResponse
    }

    // Fallback: check for a valid Bearer token in Authorization header
    // This handles cases where the cookie session expired but the access_token is still valid
    const authHeader = request.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7)
        const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(token)
        if (tokenUser && !tokenError) {
          return supabaseResponse
        }
      } catch (e) {
        console.warn('[Middleware] Bearer token verification failed:', e)
      }
    }

    return NextResponse.json(
      { error: 'Unauthorized', message: 'Authentication required' },
      { status: 401 }
    )
  }

  // 6. For admin page, redirect to login if not authenticated
  if (pathname.startsWith('/admin') && !user) {
    const signInUrl = new URL('/login', request.url)
    signInUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(signInUrl)
  }

  // 7. For all other pages, let the page component handle auth state
  return supabaseResponse
}

// ── Matcher ──────────────────────────────────────────────────────

export const config = {
  matcher: [
    // Match all routes except:
    // - Next.js internals (_next/static, _next/image)
    // - Static assets (fonts, favicon, images)
    // - Files with common extensions
    '/((?!_next/static|_next/image|fonts|favicon|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json|woff2?|css|js)).*)',
  ],
}
