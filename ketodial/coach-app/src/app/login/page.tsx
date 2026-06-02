'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import '@/styles/coach.css'
import '@/styles/member.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
