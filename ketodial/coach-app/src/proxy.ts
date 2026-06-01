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
  const publicPaths = ['/', '/login', '/signup', '/auth/callback', '/api/stripe/webhook']
  if (publicPaths.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return supabaseResponse
  }

  // API routes that need service role (handled internally)
  if (pathname.startsWith('/api/')) {
    return supabaseResponse
  }

  // /app/* routes — require authenticated user
  if (pathname.startsWith('/app/')) {
    if (!user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return supabaseResponse
  }

  // /admin/* routes — require authenticated admin
  if (pathname.startsWith('/admin/')) {
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
