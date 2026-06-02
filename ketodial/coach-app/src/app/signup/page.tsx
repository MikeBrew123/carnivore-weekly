'use client'

import { useState } from 'react'
import '@/styles/coach.css'
import '@/styles/member.css'

export default function SignupPage() {
  const [tier] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('tier') || 'weekly'
    }
    return 'weekly'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCheckout() {
    setLoading(true)
    setError('')

    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier }),
    })

    if (res.ok) {
      const { url } = await res.json()
      window.location.href = url
    } else {
      setError('Something went wrong. Please try again.')
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

        <h1 className="auth-title">Join KetoDial Coach</h1>
        <p className="auth-lead">
          {tier === 'daily'
            ? 'Daily check-ins with Coach Remy. $129/month.'
            : 'Weekly check-ins with Coach Remy. $49/month.'}
        </p>

        {error && <div className="auth-error">{error}</div>}

        <button className="btn btn-coach auth-btn" onClick={handleCheckout} disabled={loading}>
          {loading ? 'Setting up...' : 'Start coaching'}
        </button>

        <div className="auth-footer">
          Already a member? <a href="/login">Sign in</a>
        </div>
      </div>
    </div>
  )
}
