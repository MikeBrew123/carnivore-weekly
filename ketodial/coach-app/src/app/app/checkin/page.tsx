'use client'

import { useState } from 'react'
import { KdLogo } from '@/components/landing/KdBrand'
import '@/styles/coach.css'
import '@/styles/member.css'
import '@/styles/dashboard.css'

export default function CheckInPage() {
  const [weight, setWeight] = useState('')
  const [steps, setSteps] = useState('')
  const [sleep, setSleep] = useState(0)
  const [energy, setEnergy] = useState(0)
  const [cravings, setCravings] = useState(0)
  const [adherence, setAdherence] = useState(7)
  const [wins, setWins] = useState('')
  const [struggles, setStruggles] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit() {
    if (submitting) return
    setSubmitting(true)

    const res = await fetch('/api/coach/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weight: parseFloat(weight) || null,
        steps_avg: parseInt(steps) || null,
        sleep_quality: sleep || null,
        energy_level: energy || null,
        cravings_level: cravings || null,
        adherence,
        wins,
        struggles,
        symptoms: notes,
      }),
    })

    if (res.ok) {
      setSubmitted(true)
    }
    setSubmitting(false)
  }

  if (submitted) {
    return (
      <div className="dash-page">
        <div className="appbar">
          <a href="/app/dashboard" className="ic-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </a>
          <div style={{ fontWeight: 800, fontSize: '17px' }}>Check-in sent</div>
          <div style={{ width: 38 }}></div>
        </div>
        <div className="dash" style={{ textAlign: 'center', paddingTop: '60px' }}>
          <div className="coach-av lg" style={{ margin: '0 auto 16px', width: '72px', height: '72px', fontSize: '30px' }}>R</div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '10px' }}>Got it!</h2>
          <p style={{ color: 'var(--ink-soft)', lineHeight: 1.5, maxWidth: '320px', margin: '0 auto 24px' }}>
            Coach Remy will review your check-in and send your coached response within 24 hours.
          </p>
          <a className="btn btn-accent btn-lg" href="/app/dashboard">Back to dashboard</a>
        </div>
      </div>
    )
  }

  return (
    <div className="dash-page">
      {/* App bar */}
      <div className="appbar">
        <a href="/app/dashboard" className="ic-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </a>
        <div style={{ fontWeight: 800, fontSize: '17px' }}>New check-in</div>
        <div style={{ width: 38 }}></div>
      </div>

      <div className="ci" style={{ padding: '18px 18px 120px', maxWidth: '480px', margin: '0 auto' }}>
        <p className="ci-intro">How&apos;d the week actually go? A few taps and a couple of honest sentences — takes about two minutes.</p>

        <div className="ci-sec">The numbers</div>

        <div className="field">
          <label>Current weight</label>
          <div className="inp">
            <input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="186" />
            <span className="suffix">lb</span>
          </div>
        </div>

        <div className="field">
          <label>Average daily steps <span className="opt">— or leave blank</span></label>
          <div className="inp">
            <input type="text" value={steps} onChange={e => setSteps(e.target.value)} placeholder="8,200" />
          </div>
        </div>

        <div className="ci-q" style={{ marginTop: '6px' }}>Sleep quality</div>
        <ScaleInput value={sleep} onChange={setSleep} options={[
          { v: 1, emoji: '😩', label: 'terrible' },
          { v: 2, emoji: '😕', label: 'poor' },
          { v: 3, emoji: '😐', label: 'okay' },
          { v: 4, emoji: '🙂', label: 'good' },
          { v: 5, emoji: '😄', label: 'great' },
        ]} />

        <div className="ci-q" style={{ marginTop: '18px' }}>Energy level</div>
        <ScaleInput value={energy} onChange={setEnergy} options={[
          { v: 1, emoji: '🔋', label: 'crashed' },
          { v: 2, emoji: '😴', label: 'low' },
          { v: 3, emoji: '😐', label: 'normal' },
          { v: 4, emoji: '⚡', label: 'good' },
          { v: 5, emoji: '🔥', label: 'fired up' },
        ]} />

        <div className="ci-q" style={{ marginTop: '18px' }}>Cravings</div>
        <ScaleInput value={cravings} onChange={setCravings} options={[
          { v: 1, emoji: '😌', label: 'none' },
          { v: 2, emoji: '🙂', label: 'mild' },
          { v: 3, emoji: '😬', label: 'moderate' },
          { v: 4, emoji: '😖', label: 'strong' },
          { v: 5, emoji: '🥵', label: 'intense' },
        ]} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '22px' }}>
          <span className="ci-q" style={{ margin: 0 }}>Adherence to plan</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '22px', fontWeight: 700, color: 'var(--accent-deep)' }}>
            {adherence}<span style={{ fontSize: '13px', color: 'var(--ink-faint)' }}>/10</span>
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          value={adherence}
          onChange={e => setAdherence(parseInt(e.target.value))}
          className="kd-slider"
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--ink-faint)', marginTop: '6px' }}>
          <span>fell off</span><span>nailed it</span>
        </div>

        <div className="ci-sec">The story</div>

        <div className="field">
          <label>What went well this week?</label>
          <textarea className="ta" value={wins} onChange={e => setWins(e.target.value)} placeholder="Any wins, even small ones"></textarea>
        </div>

        <div className="field">
          <label>What was hard?</label>
          <textarea className="ta" value={struggles} onChange={e => setStruggles(e.target.value)} placeholder="Struggles, slip-ups, frustrations — be honest"></textarea>
        </div>

        <div className="field">
          <label>Anything your coach should know?</label>
          <textarea className="ta" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Symptoms, life stuff, questions — whatever's on your mind"></textarea>
        </div>

        <button
          className="btn btn-coach btn-block btn-lg"
          onClick={handleSubmit}
          disabled={submitting}
          style={{ marginTop: '8px' }}
        >
          {submitting ? 'Sending...' : 'Submit check-in'}
          {!submitting && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}>
              <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/>
            </svg>
          )}
        </button>
        <p style={{ textAlign: 'center', fontSize: '11.5px', color: 'var(--ink-faint)', marginTop: '11px' }}>
          Coach Remy reviews this and sends your response within a day.
        </p>
      </div>
    </div>
  )
}

function ScaleInput({ value, onChange, options }: {
  value: number
  onChange: (v: number) => void
  options: { v: number; emoji: string; label: string }[]
}) {
  return (
    <div className="scale">
      {options.map(o => (
        <button
          key={o.v}
          className={value === o.v ? 'on' : ''}
          onClick={() => onChange(o.v)}
          type="button"
        >
          <span className="emo">{o.emoji}</span>
          <span className="lb">{o.label}</span>
        </button>
      ))}
    </div>
  )
}
