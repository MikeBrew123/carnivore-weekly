import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Refresh Supabase auth session on every request
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Public routes — no auth required
  // /api/auth/link is listed explicitly even though the /api/ branch below would
  // let it through anyway: a signed-out person asking for a sign-in link is the
  // most ordinary thing that happens on this app and it should not depend on a
  // catch-all.
  const publicPaths = ['/', '/login', '/signup', '/auth/callback', '/api/auth/link', '/api/stripe/webhook']
  if (publicPaths.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return supabaseResponse
  }

  // API routes that need service role (handled internally)
  if (pathname.startsWith('/api/')) {
    return supabaseResponse
  }

  // /app/* routes — require an authenticated user who is actually a member.
  //
  // Authentication alone is not enough. Supabase signup is open on this project
  // and OAuth creates a brand new user whenever the provider's email does not
  // match an existing one, so "has a session" and "bought the thing" are two
  // different questions. Same shape as the coach_admins check below: the query
  // runs with the anon key under RLS (members_read_own), and a missing row or a
  // failed query both mean no entry.
  if (pathname === '/app' || pathname.startsWith('/app/')) {
    if (!user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    const { data: member } = await supabase
      .from('coach_members')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (!member) {
      return NextResponse.redirect(new URL('/login?error=nomatch', request.url))
    }

    return supabaseResponse
  }

  // /admin/* routes — require authenticated admin
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (!user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Check admin status via query (runs with anon key + RLS)
    const { data: admin } = await supabase
      .from('coach_admins')
      .select('role')
      .eq('auth_user_id', user.id)
      .eq('active', true)
      .single()

    if (!admin) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    return supabaseResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
