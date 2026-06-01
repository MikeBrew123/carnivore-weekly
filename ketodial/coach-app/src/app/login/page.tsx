'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import '@/styles/coach.css'

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
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
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
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
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
