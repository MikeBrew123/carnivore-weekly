'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { resolvePostAuthDestination } from '@/lib/auth/destination'
import '@/styles/coach.css'
import '@/styles/member.css'

// No password field, anywhere, on purpose. There is nothing to set, nothing to
// reset and nothing for anyone to forget. Two doors:
//
//   1. Continue with Google  (only rendered once the provider is configured,
//      see GOOGLE_ENABLED below)
//   2. Email me a sign-in link  ->  POST /api/auth/link
//
// Both come back through /auth/callback, which is where the session actually
// gets written into cookies.

// Google stays dark until Brew has done the Google Cloud console work and pasted
// the client id and secret into Supabase. Flipping NEXT_PUBLIC_GOOGLE_SIGNIN
// to 'true' in Vercel is the entire switch-on; no code change, no deploy of new
// logic. Until then the button is not rendered, because a button that leads to
// a Supabase "provider is not enabled" error is worse than no button.
const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_SIGNIN === 'true'

const ERROR_COPY: Record<string, string> = {
  nomatch:
    'You are signed in, but we have no purchase under that address. Use the email address you bought with, or reply to your welcome email and we will sort it out.',
  cancelled: 'Sign-in was cancelled. Nothing happened. Try again when you are ready.',
  expired: 'That sign-in link has already been used or has gone stale. Ask for a fresh one below.',
  auth: 'That sign-in did not go through. Ask for a fresh link below.',
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [exchanging, setExchanging] = useState(false)

  // Errors arrive as ?error=... from /auth/callback and from the proxy.
  // Read from window rather than useSearchParams so /login stays statically
  // rendered and needs no Suspense boundary.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('error')
    // Reading the URL on mount is the legitimate "synchronise from an external
    // system" case the rule is written around; there is no server render of
    // window.location to read it from instead.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (code && ERROR_COPY[code]) setError(ERROR_COPY[code])
  }, [])

  // Older email links (anything generated before this change, and anything
  // Supabase sends through its own mailer) come back on the implicit flow: the
  // session is in the URL FRAGMENT, which never reaches the server, so
  // /auth/callback cannot see it. Recover it client-side. New links from
  // /api/auth/link and from the Stripe webhook carry a token_hash on the query
  // string instead and never land here, but links already in the wild must keep
  // working.
  useEffect(() => {
    const hash = window.location.hash
    if (!hash || !hash.includes('access_token')) return
    const p = new URLSearchParams(hash.slice(1))
    const access_token = p.get('access_token')
    const refresh_token = p.get('refresh_token')
    if (!access_token || !refresh_token) return

    setExchanging(true)
    const supabase = createClient()
    supabase.auth.setSession({ access_token, refresh_token }).then(async ({ data, error }) => {
      window.history.replaceState({}, '', '/login')
      if (error || !data.user) {
        setError(ERROR_COPY.expired)
        setExchanging(false)
        return
      }
      const { data: admin } = await supabase
        .from('coach_admins')
        .select('role')
        .eq('auth_user_id', data.user.id)
        .eq('active', true)
        .maybeSingle()
      const { data: member } = await supabase
        .from('coach_members')
        .select('status')
        .eq('id', data.user.id)
        .maybeSingle()

      const destination = resolvePostAuthDestination({
        isAdmin: Boolean(admin),
        memberStatus: member?.status ?? null,
      })
      if (destination === '/login?error=nomatch') {
        await supabase.auth.signOut()
        setError(ERROR_COPY.nomatch)
        setExchanging(false)
        return
      }
      window.location.href = destination
    })
  }, [])

  async function handleGoogle() {
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // Without this the second attempt silently reuses the account that just
        // failed, which is exactly the wrong behaviour after a nomatch bounce.
        queryParams: { prompt: 'select_account' },
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
    // On success the browser is already navigating to Google.
  }

  async function handleLinkRequest(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'That did not go through. Try again in a moment.')
        setLoading(false)
        return
      }
      // Deliberately the same message for every address. Whether an account
      // exists is not this page's news to give.
      setSent(true)
      setLoading(false)
    } catch {
      setError('That did not go through. Check your connection and try again.')
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="kd-word">Keto<b>Dial</b></span>
          <span className="auth-sub">Coach</span>
        </div>

        <h1 className="auth-title">Sign in</h1>
        <p className="auth-lead">No password. Either tap Google, or we email you a link.</p>

        {GOOGLE_ENABLED && (
          <>
            <button type="button" className="btn auth-btn auth-google" onClick={handleGoogle} disabled={loading}>
              Continue with Google
            </button>
            <div className="auth-divider"><span>or</span></div>
          </>
        )}

        {exchanging && <div className="auth-error" style={{ background: 'transparent' }}>Signing you in...</div>}
        {error && <div className="auth-error">{error}</div>}

        {sent ? (
          <div className="auth-note">
            <p><strong>Check your email.</strong></p>
            <p>If that address has an account, a sign-in link is on its way. It can take a minute, and it is worth a look in spam.</p>
            <p><button type="button" className="auth-linkish" onClick={() => setSent(false)}>Use a different address</button></p>
          </div>
        ) : (
          <form onSubmit={handleLinkRequest} className="auth-form">
            <div className="auth-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
                placeholder="the address you bought with"
              />
            </div>

            <button type="submit" className="btn btn-coach auth-btn" disabled={loading}>
              {loading ? 'Sending...' : 'Email me a sign-in link'}
            </button>
          </form>
        )}

        <div className="auth-footer">
          Don&apos;t have an account? <a href="/signup">Get started</a>
        </div>
      </div>
    </div>
  )
}
