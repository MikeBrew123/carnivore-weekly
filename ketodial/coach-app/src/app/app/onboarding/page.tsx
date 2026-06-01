'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import '@/styles/coach.css'
import '@/styles/member.css'

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  // Waiver state
  const [waiverChecked, setWaiverChecked] = useState(false)
  const [aiChecked, setAiChecked] = useState(false)
  const [responseChecked, setResponseChecked] = useState(false)

  // Profile state
  const [profile, setProfile] = useState({
    display_name: '',
    age: '',
    sex: 'Male',
    current_weight: '',
    goal_weight: '',
    diet_type: 'keto',
    health_conditions: [] as string[],
    medications: '',
  })

  // Goals state
  const [goals, setGoals] = useState({
    biggest_challenge: '',
    success_vision: '',
    referral_source: '',
  })

  // Resume from saved step
  useEffect(() => {
    async function loadProgress() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const { data: member } = await supabase
        .from('coach_members')
        .select('onboarding_step, display_name, status')
        .eq('id', user.id)
        .single()

      if (member?.status === 'active') {
        window.location.href = '/app/dashboard'
        return
      }

      if (member?.onboarding_step) {
        setStep(member.onboarding_step)
      }
      if (member?.display_name) {
        setProfile(p => ({ ...p, display_name: member.display_name }))
      }
      setLoading(false)
    }
    loadProgress()
  }, [])

  async function saveStep1() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Use service-role RPC or direct update via admin policy
    // For onboarding, we use a dedicated RPC
    await fetch('/api/coach/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        step: 1,
        waiver_consented: true,
        ai_disclosure_consented: true,
        response_time_consented: true,
      }),
    })

    setStep(2)
    setSaving(false)
  }

  async function saveStep2() {
    setSaving(true)
    await fetch('/api/coach/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        step: 2,
        ...profile,
        age: parseInt(profile.age) || null,
        current_weight: parseFloat(profile.current_weight) || null,
        goal_weight: parseFloat(profile.goal_weight) || null,
      }),
    })

    setStep(3)
    setSaving(false)
  }

  async function saveStep3() {
    setSaving(true)
    const res = await fetch('/api/coach/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 3, ...goals }),
    })

    if (res.ok) {
      window.location.href = '/app/dashboard'
    }
    setSaving(false)
  }

  function toggleCondition(val: string) {
    if (val === 'none') {
      setProfile(p => ({ ...p, health_conditions: [] }))
      return
    }
    setProfile(p => ({
      ...p,
      health_conditions: p.health_conditions.includes(val)
        ? p.health_conditions.filter(c => c !== val)
        : [...p.health_conditions, val],
    }))
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--ink-faint)' }}>Loading...</div>

  return (
    <div className="ob-page">
      <div className="ob">
        {/* Progress dots */}
        <div className="ob-prog">
          <i className={step >= 1 ? 'on' : ''}></i>
          <i className={step >= 2 ? 'on' : ''}></i>
          <i className={step >= 3 ? 'on' : ''}></i>
        </div>

        {/* STEP 1: Waiver */}
        {step === 1 && (
          <div className="ob-step on">
            <div className="ob-eyebrow">Welcome to KetoDial Coach</div>
            <h2>Before we start, a quick note.</h2>
            <div className="waiver">
              KetoDial Coach is <b>low-carb accountability coaching, not medical care</b>.
              We help you stay consistent and spot patterns. For medications, symptoms,
              diagnoses, or a medical condition, we&apos;ll always point you to your
              healthcare provider.<br /><br />
              That&apos;s not a cop-out. It&apos;s just the right thing to do.
            </div>
            <label className="check-row">
              <input type="checkbox" checked={waiverChecked} onChange={e => setWaiverChecked(e.target.checked)} />
              <span>I understand this is coaching, not medical care.</span>
            </label>
            <label className="check-row" style={{ marginTop: '10px' }}>
              <input type="checkbox" checked={aiChecked} onChange={e => setAiChecked(e.target.checked)} />
              <span>I understand coaching is AI-assisted and human-reviewed.</span>
            </label>
            <label className="check-row" style={{ marginTop: '10px' }}>
              <input type="checkbox" checked={responseChecked} onChange={e => setResponseChecked(e.target.checked)} />
              <span>I understand responses come within one business day, not in real time.</span>
            </label>
            <button
              className="btn btn-accent btn-block btn-lg"
              disabled={!waiverChecked || !aiChecked || !responseChecked || saving}
              onClick={saveStep1}
              style={{ marginTop: '18px' }}
            >
              {saving ? 'Saving...' : "Got it, let's go"}
            </button>
          </div>
        )}

        {/* STEP 2: About You */}
        {step === 2 && (
          <div className="ob-step on">
            <div className="ob-eyebrow">Step 2 of 3 &middot; About you</div>
            <h2>Let&apos;s get acquainted.</h2>
            <p className="lead">Your coach starts knowing who you are — not a blank slate.</p>

            <div className="field">
              <label>First name</label>
              <div className="inp">
                <input type="text" value={profile.display_name} onChange={e => setProfile(p => ({ ...p, display_name: e.target.value }))} placeholder="Your name" />
              </div>
            </div>
            <div className="ob-2col">
              <div className="field">
                <label>Age</label>
                <div className="inp"><input type="number" value={profile.age} onChange={e => setProfile(p => ({ ...p, age: e.target.value }))} placeholder="41" /></div>
              </div>
              <div className="field">
                <label>Sex</label>
                <div className="sel">
                  <select value={profile.sex} onChange={e => setProfile(p => ({ ...p, sex: e.target.value }))}>
                    <option>Female</option>
                    <option>Male</option>
                    <option>Prefer not to say</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="ob-2col">
              <div className="field">
                <label>Current weight</label>
                <div className="inp"><input type="number" value={profile.current_weight} onChange={e => setProfile(p => ({ ...p, current_weight: e.target.value }))} placeholder="224" /><span className="suffix">lb</span></div>
              </div>
              <div className="field">
                <label>Goal weight</label>
                <div className="inp"><input type="number" value={profile.goal_weight} onChange={e => setProfile(p => ({ ...p, goal_weight: e.target.value }))} placeholder="195" /><span className="suffix">lb</span></div>
              </div>
            </div>
            <div className="field">
              <label>How do you eat?</label>
              <div className="sel">
                <select value={profile.diet_type} onChange={e => setProfile(p => ({ ...p, diet_type: e.target.value }))}>
                  <option value="keto">Keto</option>
                  <option value="carnivore">Carnivore</option>
                  <option value="lowcarb">General low-carb</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label>Anything your coach should know about? <span className="opt">— optional</span></label>
              <div className="checkchips">
                {['Type 2 diabetes', 'PCOS', 'Thyroid', 'Blood pressure'].map(c => (
                  <button key={c} className={`checkchip ${profile.health_conditions.includes(c) ? 'on' : ''}`} onClick={() => toggleCondition(c)}>{c}</button>
                ))}
                <button className={`checkchip ${profile.health_conditions.length === 0 ? 'on' : ''}`} onClick={() => toggleCondition('none')}>None of these</button>
              </div>
            </div>
            <div className="field">
              <label>Current medications <span className="opt">— optional, helps your coach</span></label>
              <div className="inp"><input type="text" value={profile.medications} onChange={e => setProfile(p => ({ ...p, medications: e.target.value }))} placeholder="e.g. metformin" /></div>
            </div>
            <button className="btn btn-accent btn-block btn-lg" onClick={saveStep2} disabled={!profile.display_name || saving} style={{ marginTop: '6px' }}>
              {saving ? 'Saving...' : 'Continue'}
            </button>
          </div>
        )}

        {/* STEP 3: Goals */}
        {step === 3 && (
          <div className="ob-step on">
            <div className="ob-eyebrow">Step 3 of 3 &middot; Your goals</div>
            <h2>What does winning look like?</h2>
            <p className="lead">The more honest you are here, the better your coaching.</p>

            <div className="field">
              <label>What&apos;s your biggest challenge right now?</label>
              <textarea className="ta" value={goals.biggest_challenge} onChange={e => setGoals(g => ({ ...g, biggest_challenge: e.target.value }))} placeholder="Be honest — late-night cravings, falling off after week 3, eating out for work..."></textarea>
            </div>
            <div className="field">
              <label>What does success look like in 3 months?</label>
              <textarea className="ta" value={goals.success_vision} onChange={e => setGoals(g => ({ ...g, success_vision: e.target.value }))} placeholder="Down 20 lbs, off one medication, fitting the old jeans..."></textarea>
            </div>
            <div className="field">
              <label>How did you hear about us?</label>
              <div className="sel">
                <select value={goals.referral_source} onChange={e => setGoals(g => ({ ...g, referral_source: e.target.value }))}>
                  <option value="">Select...</option>
                  <option value="ketodial">KetoDial calculator</option>
                  <option value="carnivoreweekly">Carnivore Weekly</option>
                  <option value="friend">A friend</option>
                  <option value="search">Search</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <button className="btn btn-coach btn-block btn-lg" onClick={saveStep3} disabled={saving} style={{ marginTop: '6px' }}>
              {saving ? 'Setting up...' : 'Meet Coach Remy →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
