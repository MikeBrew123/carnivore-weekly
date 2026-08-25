'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import '@/styles/coach.css'
import '@/styles/member.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [exchanging, setExchanging] = useState(false)

  // Email links (recovery, magiclink, invite) come back on the implicit flow:
  // Supabase puts a real session in the URL FRAGMENT, which never reaches the
  // server, so /auth/callback cannot see it and bounces here with ?error=auth.
  // Recover it client-side, otherwise no emailed link can ever sign anyone in
  // and members created by the Stripe webhook (who have no password) are locked
  // out entirely.
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
        setError('That sign-in link has expired. Ask for a new one.')
        setExchanging(false)
        return
      }
      const { data: admin } = await supabase
        .from('coach_admins')
        .select('role')
        .eq('auth_user_id', data.user.id)
        .eq('active', true)
        .maybeSingle()
      if (admin) { window.location.href = '/admin'; return }

      // Recovery links mean they have no usable password yet: send them to
      // settings to set one, so they are not locked out on their next visit.
      const isRecovery = p.get('type') === 'recovery'
      const { data: member } = await supabase
        .from('coach_members')
        .select('status')
        .eq('id', data.user.id)
        .maybeSingle()
      if (member?.status === 'onboarding') { window.location.href = '/app/onboarding'; return }
      window.location.href = isRecovery ? '/app/settings' : '/app/dashboard'
    })
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Check if user is admin — redirect to admin queue instead of member dashboard
    if (data.user) {
      const { data: admin } = await supabase
        .from('coach_admins')
        .select('role')
        .eq('auth_user_id', data.user.id)
        .eq('active', true)
        .maybeSingle()

      if (admin) {
        window.location.href = '/admin'
        return
      }
    }

    window.location.href = '/app/dashboard'
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="kd-word">Keto<b>Dial</b></span>
          <span className="auth-sub">Coach</span>
        </div>

        <h1 className="auth-title">Sign in</h1>

        <form onSubmit={handleLogin} className="auth-form">
          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus autoComplete="email" />
          </div>
          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
          </div>

          {exchanging && <div className="auth-error" style={{background:'transparent'}}>Signing you in...</div>}
          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="btn btn-coach auth-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="auth-footer">
          Don&apos;t have an account? <a href="/signup">Get started</a>
        </div>
      </div>
    </div>
  )
}
