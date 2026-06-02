'use client'

import { useState } from 'react'

const INTERESTS = [
  'Weight loss',
  'Blood sugar support',
  'Energy & mental clarity',
  'Body recomposition',
  'Staying consistent',
  'Accountability',
]

export default function WaitlistForm({ variant = 'full' }: { variant?: 'full' | 'inline' }) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  function toggleInterest(val: string) {
    setInterests(prev => prev.includes(val) ? prev.filter(i => i !== val) : [...prev, val])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.includes('@')) { setError('Please enter a valid email'); return }
    setLoading(true)
    setError('')

    const res = await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, first_name: name || null, interests, note: note || null }),
    })

    if (res.ok) {
      setDone(true)
    } else {
      const err = await res.json()
      setError(err.error || 'Something went wrong')
    }
    setLoading(false)
  }

  if (done) {
    return (
      <div className="wl-done">
        <div className="wl-check">✓</div>
        <div className="wl-done-title">You&apos;re on the list</div>
        <div className="wl-done-sub">We&apos;ll reach out when early access opens. Keep an eye on your inbox.</div>
      </div>
    )
  }

  if (variant === 'inline') {
    return (
      <form onSubmit={handleSubmit} className="wl-inline">
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email" className="wl-input" required />
        <button type="submit" className="btn btn-accent" disabled={loading}>
          {loading ? '...' : 'Join the list'}
        </button>
        {error && <div className="wl-error">{error}</div>}
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="wl-form">
      <div className="wl-header">
        <div className="wl-badge">Founding cohort · limited to 25 members</div>
        <h3 className="wl-title">Join the interest list</h3>
        <p className="wl-lead">We&apos;re preparing a small founding cohort for people who want structured keto accountability, weekly check-ins, and coach-reviewed progress. We&apos;ll reach out when early access opens.</p>
      </div>

      <div className="wl-fields">
        <div className="wl-row">
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="First name" className="wl-input" />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="wl-input" required />
        </div>

        <div className="wl-label">What interests you most?</div>
        <div className="wl-chips">
          {INTERESTS.map(i => (
            <button key={i} type="button" className={`checkchip ${interests.includes(i) ? 'on' : ''}`} onClick={() => toggleInterest(i)}>{i}</button>
          ))}
        </div>

        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Anything else you want us to know? (optional)" className="wl-note" />
      </div>

      {error && <div className="wl-error">{error}</div>}

      <button type="submit" className="btn btn-accent btn-block btn-lg" disabled={loading}>
        {loading ? 'Joining...' : 'Join the founding cohort'}
      </button>

      <div className="wl-fine">We&apos;ll only email you about early access. No spam.</div>
    </form>
  )
}
