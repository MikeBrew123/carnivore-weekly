'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import '@/styles/coach.css'
import '@/styles/member.css'

const CONDITIONS = [
  { value: 'type_2_diabetes', label: 'Type 2 diabetes' },
  { value: 'type_1_diabetes', label: 'Type 1 diabetes' },
  { value: 'prediabetes', label: 'Prediabetes' },
  { value: 'hypertension', label: 'High blood pressure' },
  { value: 'high_cholesterol', label: 'High cholesterol' },
  { value: 'pcos', label: 'PCOS' },
  { value: 'thyroid', label: 'Thyroid' },
  { value: 'heart_condition', label: 'Heart condition' },
  { value: 'kidney_disease', label: 'Kidney disease' },
  { value: 'fatty_liver', label: 'Fatty liver' },
  { value: 'gout', label: 'Gout' },
  { value: 'digestive_disorder', label: 'Digestive disorder' },
  { value: 'gallbladder_removed', label: 'Gallbladder removed' },
  { value: 'bariatric_surgery', label: 'Bariatric surgery' },
]

const GOALS = [
  { value: 'weight_loss', label: 'Lose weight' },
  { value: 'body_recomp', label: 'Body recomposition' },
  { value: 'blood_sugar', label: 'Blood sugar support' },
  { value: 'energy_clarity', label: 'Energy & mental clarity' },
  { value: 'athletic', label: 'Athletic performance' },
  { value: 'therapeutic', label: 'Wellness support alongside my doctor' },
]

const OBSTACLES = [
  'Cravings', 'Family/social pressure', 'Time', 'Cost', 'Cooking',
  'Eating out', 'Motivation', 'Medical concerns', 'Not sure what to eat',
]

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  // Step 1: Waiver
  const [waiverChecked, setWaiverChecked] = useState(false)
  const [aiChecked, setAiChecked] = useState(false)
  const [responseChecked, setResponseChecked] = useState(false)

  // Step 2: Safety + About You
  const [profile, setProfile] = useState({
    display_name: '',
    age: '',
    sex: 'female',
    height_feet: '',
    height_inches: '',
    current_weight: '',
    goal_weight: '',
    diet_type: 'keto',
    health_conditions: [] as string[],
    other_conditions: '',
    medications: '',
    pregnant_or_nursing: false,
    eating_disorder_history: false,
    eating_disorder_notes: '',
    working_with_doctor: false,
  })

  // Step 3: Goals + Starting Point + Preferences
  const [goals, setGoals] = useState({
    primary_goal: '',
    goal_target: '',
    personal_why: '',
    typical_eating: '',
    activity_level: 'lightly_active',
    keto_experience: 'never',
    food_allergies: '',
    dietary_restrictions: '',
    feedback_tone: 'warm',
    feedback_format: 'detailed',
    confidence_level: 3,
    biggest_obstacle: '',
    biggest_challenge: '',
    sleep_hours: '',
    alcohol_habits: '',
    referral_source: '',
  })

  useEffect(() => {
    async function loadProgress() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const { data: member } = await supabase
        .from('coach_members')
        .select('onboarding_step, display_name, status')
        .eq('id', user.id)
        .single()
      if (member?.status === 'active') { window.location.href = '/app/dashboard'; return }
      if (member?.onboarding_step) setStep(member.onboarding_step)
      if (member?.display_name) setProfile(p => ({ ...p, display_name: member.display_name }))
      setLoading(false)
    }
    loadProgress()
  }, [])

  function toggleCondition(val: string) {
    setProfile(p => ({
      ...p,
      health_conditions: p.health_conditions.includes(val)
        ? p.health_conditions.filter(c => c !== val)
        : [...p.health_conditions, val],
    }))
  }

  async function saveStep(stepNum: number, data: any) {
    setSaving(true)
    setError('')
    const res = await fetch('/api/coach/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: stepNum, ...data }),
    })
    if (res.ok) {
      const result = await res.json()
      if (result.complete) {
        window.location.href = '/app/dashboard'
      } else {
        setStep(result.next_step)
      }
    } else {
      const err = await res.json()
      setError(err.error || 'Something went wrong')
    }
    setSaving(false)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-faint)' }}>Loading...</div>

  return (
    <div className="ob-page">
      <div className="ob">
        <div className="ob-prog">
          <i className={step >= 1 ? 'on' : ''}></i>
          <i className={step >= 2 ? 'on' : ''}></i>
          <i className={step >= 3 ? 'on' : ''}></i>
        </div>

        {error && <div className="auth-error" style={{ marginBottom: 14 }}>{error}</div>}

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
            <label className="check-row" style={{ marginTop: 10 }}>
              <input type="checkbox" checked={aiChecked} onChange={e => setAiChecked(e.target.checked)} />
              <span>I understand coaching is AI-assisted and human-reviewed.</span>
            </label>
            <label className="check-row" style={{ marginTop: 10 }}>
              <input type="checkbox" checked={responseChecked} onChange={e => setResponseChecked(e.target.checked)} />
              <span>I understand responses come within one business day, not in real time.</span>
            </label>
            <button className="btn btn-accent btn-block btn-lg" disabled={!waiverChecked || !aiChecked || !responseChecked || saving} onClick={() => saveStep(1, {})} style={{ marginTop: 18 }}>
              {saving ? 'Saving...' : "Got it, let's go"}
            </button>
          </div>
        )}

        {/* STEP 2: Safety + About You */}
        {step === 2 && (
          <div className="ob-step on">
            <div className="ob-eyebrow">Step 2 of 3 · Safety + About you</div>
            <h2>Let&apos;s get acquainted.</h2>
            <p className="lead">This helps your coach provide relevant accountability and educational support from day one.</p>

            <div className="field">
              <label htmlFor="ob-name">First name</label>
              <div className="inp"><input id="ob-name" name="name" type="text" value={profile.display_name} onChange={e => setProfile(p => ({ ...p, display_name: e.target.value }))} placeholder="Your name" autoComplete="given-name" /></div>
            </div>

            <div className="ob-2col">
              <div className="field">
                <label htmlFor="ob-age">Age</label>
                <div className="inp"><input id="ob-age" type="number" value={profile.age} onChange={e => setProfile(p => ({ ...p, age: e.target.value }))} placeholder="34" /></div>
              </div>
              <div className="field">
                <label htmlFor="ob-sex">Biological sex</label>
                <div className="sel"><select id="ob-sex" value={profile.sex} onChange={e => setProfile(p => ({ ...p, sex: e.target.value }))}>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Prefer not to say</option>
                </select></div>
              </div>
            </div>

            <div className="ob-2col">
              <div className="field">
                <label>Height</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div className="inp" style={{ flex: 1 }}><input type="number" value={profile.height_feet} onChange={e => setProfile(p => ({ ...p, height_feet: e.target.value }))} placeholder="5" /><span className="suffix">ft</span></div>
                  <div className="inp" style={{ flex: 1 }}><input type="number" value={profile.height_inches} onChange={e => setProfile(p => ({ ...p, height_inches: e.target.value }))} placeholder="8" /><span className="suffix">in</span></div>
                </div>
              </div>
              <div className="field">
                <label>How do you eat?</label>
                <div className="sel"><select value={profile.diet_type} onChange={e => setProfile(p => ({ ...p, diet_type: e.target.value }))}>
                  <option value="keto">Keto</option>
                  <option value="carnivore">Carnivore</option>
                  <option value="lowcarb">General low-carb</option>
                </select></div>
              </div>
            </div>

            <div className="ob-2col">
              <div className="field">
                <label>Current weight</label>
                <div className="inp"><input type="number" value={profile.current_weight} onChange={e => setProfile(p => ({ ...p, current_weight: e.target.value }))} placeholder="224" /><span className="suffix">lb</span></div>
              </div>
              <div className="field">
                <label>Goal weight</label>
                <div className="inp"><input type="number" value={profile.goal_weight} onChange={e => setProfile(p => ({ ...p, goal_weight: e.target.value }))} placeholder="185" /><span className="suffix">lb</span></div>
              </div>
            </div>

            <div className="field">
              <label>Health conditions <span className="opt">— check all that apply</span></label>
              <div className="checkchips">
                {CONDITIONS.map(c => (
                  <button key={c.value} type="button" className={`checkchip ${profile.health_conditions.includes(c.value) ? 'on' : ''}`} onClick={() => toggleCondition(c.value)}>{c.label}</button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Anything else? <span className="opt">— conditions not listed above</span></label>
              <div className="inp"><input type="text" value={profile.other_conditions} onChange={e => setProfile(p => ({ ...p, other_conditions: e.target.value }))} placeholder="e.g. sleep apnea, IBS" /></div>
            </div>

            <div className="field">
              <label>Current medications <span className="opt">— type exactly what you take</span></label>
              <textarea className="ta" value={profile.medications} onChange={e => setProfile(p => ({ ...p, medications: e.target.value }))} placeholder="e.g. metformin 500mg twice daily, lisinopril 10mg" />
            </div>

            <div className="field">
              <label>A few more safety questions</label>
              <label className="check-row">
                <input type="checkbox" checked={profile.pregnant_or_nursing} onChange={e => setProfile(p => ({ ...p, pregnant_or_nursing: e.target.checked }))} />
                <span>I am pregnant or breastfeeding</span>
              </label>
              <label className="check-row" style={{ marginTop: 8 }}>
                <input type="checkbox" checked={profile.eating_disorder_history} onChange={e => setProfile(p => ({ ...p, eating_disorder_history: e.target.checked }))} />
                <span>I have a history of disordered eating</span>
              </label>
              {profile.eating_disorder_history && (
                <div className="inp" style={{ marginTop: 8 }}>
                  <input type="text" value={profile.eating_disorder_notes} onChange={e => setProfile(p => ({ ...p, eating_disorder_notes: e.target.value }))} placeholder="Anything you want your coach to know (optional)" />
                </div>
              )}
              <label className="check-row" style={{ marginTop: 8 }}>
                <input type="checkbox" checked={profile.working_with_doctor} onChange={e => setProfile(p => ({ ...p, working_with_doctor: e.target.checked }))} />
                <span>I am currently working with a doctor on my diet/health</span>
              </label>
            </div>

            <button className="btn btn-accent btn-block btn-lg" disabled={!profile.display_name || !profile.age || !profile.current_weight || saving} onClick={() => saveStep(2, {
              ...profile,
              age: parseInt(profile.age) || null,
              height_inches: profile.height_feet ? (parseInt(profile.height_feet) * 12 + (parseInt(profile.height_inches) || 0)) : null,
              current_weight: parseFloat(profile.current_weight) || null,
              goal_weight: parseFloat(profile.goal_weight) || null,
            })} style={{ marginTop: 6 }}>
              {saving ? 'Saving...' : 'Continue'}
            </button>
          </div>
        )}

        {/* STEP 3: Goals + Starting Point + Preferences */}
        {step === 3 && (
          <div className="ob-step on">
            <div className="ob-eyebrow">Step 3 of 3 · Goals + Preferences</div>
            <h2>What does winning look like?</h2>
            <p className="lead">The more honest you are, the better your coaching.</p>

            <div className="field">
              <label>What&apos;s your primary goal?</label>
              <div className="checkchips">
                {GOALS.map(g => (
                  <button key={g.value} type="button" className={`checkchip ${goals.primary_goal === g.value ? 'on' : ''}`} onClick={() => setGoals(prev => ({ ...prev, primary_goal: g.value }))}>{g.label}</button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>What does success look like? <span className="opt">— be specific</span></label>
              <textarea className="ta" value={goals.goal_target} onChange={e => setGoals(g => ({ ...g, goal_target: e.target.value }))} placeholder="Down 20 lbs by October, better energy, fitting my old jeans..." />
            </div>

            <div className="field">
              <label>Your personal why <span className="opt">— what keeps you going when it gets hard</span></label>
              <textarea className="ta" value={goals.personal_why} onChange={e => setGoals(g => ({ ...g, personal_why: e.target.value }))} placeholder="I want to be around for my kids, I'm tired of feeling sluggish..." />
            </div>

            <div className="field">
              <label>What does a typical day of eating look like right now?</label>
              <textarea className="ta" value={goals.typical_eating} onChange={e => setGoals(g => ({ ...g, typical_eating: e.target.value }))} placeholder="Coffee with cream, skipped lunch, big pasta dinner, snacks after 9pm..." />
            </div>

            <div className="ob-2col">
              <div className="field">
                <label>Keto experience</label>
                <div className="sel"><select value={goals.keto_experience} onChange={e => setGoals(g => ({ ...g, keto_experience: e.target.value }))}>
                  <option value="never">Never tried</option>
                  <option value="tried_before">Tried before</option>
                  <option value="currently_doing">Currently doing it</option>
                </select></div>
              </div>
              <div className="field">
                <label>Activity level</label>
                <div className="sel"><select value={goals.activity_level} onChange={e => setGoals(g => ({ ...g, activity_level: e.target.value }))}>
                  <option value="sedentary">Sedentary</option>
                  <option value="lightly_active">Lightly active</option>
                  <option value="active">Active</option>
                  <option value="very_active">Very active</option>
                </select></div>
              </div>
            </div>

            <div className="ob-2col">
              <div className="field">
                <label>Food allergies <span className="opt">— optional</span></label>
                <div className="inp"><input type="text" value={goals.food_allergies} onChange={e => setGoals(g => ({ ...g, food_allergies: e.target.value }))} placeholder="e.g. dairy, shellfish" /></div>
              </div>
              <div className="field">
                <label>Dietary restrictions <span className="opt">— optional</span></label>
                <div className="inp"><input type="text" value={goals.dietary_restrictions} onChange={e => setGoals(g => ({ ...g, dietary_restrictions: e.target.value }))} placeholder="e.g. halal, no pork" /></div>
              </div>
            </div>

            <div className="field">
              <label>What feels like your biggest obstacle?</label>
              <div className="checkchips">
                {OBSTACLES.map(o => (
                  <button key={o} type="button" className={`checkchip ${goals.biggest_obstacle === o ? 'on' : ''}`} onClick={() => setGoals(g => ({ ...g, biggest_obstacle: o }))}>{o}</button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>How confident do you feel about starting? <span className="opt">{goals.confidence_level}/5</span></label>
              <div className="checkchips">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} type="button" className={`checkchip ${goals.confidence_level === n ? 'on' : ''}`} onClick={() => setGoals(g => ({ ...g, confidence_level: n }))} style={{ minWidth: 44, justifyContent: 'center' }}>{n}</button>
                ))}
              </div>
            </div>

            <div className="ob-2col">
              <div className="field">
                <label>How do you like feedback?</label>
                <div className="sel"><select value={goals.feedback_tone} onChange={e => setGoals(g => ({ ...g, feedback_tone: e.target.value }))}>
                  <option value="direct">Direct — no fluff</option>
                  <option value="warm">Warm — encouraging</option>
                  <option value="neutral">Neutral — just the facts</option>
                </select></div>
              </div>
              <div className="field">
                <label>Response format</label>
                <div className="sel"><select value={goals.feedback_format} onChange={e => setGoals(g => ({ ...g, feedback_format: e.target.value }))}>
                  <option value="detailed">Detailed explanations</option>
                  <option value="bullets">Short bullet points</option>
                </select></div>
              </div>
            </div>

            <div className="ob-2col">
              <div className="field">
                <label>Average sleep <span className="opt">— optional</span></label>
                <div className="inp"><input type="number" value={goals.sleep_hours} onChange={e => setGoals(g => ({ ...g, sleep_hours: e.target.value }))} placeholder="7" /><span className="suffix">hrs</span></div>
              </div>
              <div className="field">
                <label>Alcohol <span className="opt">— optional</span></label>
                <div className="sel"><select value={goals.alcohol_habits} onChange={e => setGoals(g => ({ ...g, alcohol_habits: e.target.value }))}>
                  <option value="">Select...</option>
                  <option value="none">None</option>
                  <option value="occasional">Occasional (1-2/week)</option>
                  <option value="regular">Regular (3-5/week)</option>
                  <option value="daily">Daily</option>
                </select></div>
              </div>
            </div>

            <div className="field">
              <label>How did you hear about us?</label>
              <div className="sel"><select value={goals.referral_source} onChange={e => setGoals(g => ({ ...g, referral_source: e.target.value }))}>
                <option value="">Select...</option>
                <option value="ketodial">KetoDial calculator</option>
                <option value="carnivoreweekly">Carnivore Weekly</option>
                <option value="friend">A friend</option>
                <option value="search">Search</option>
                <option value="other">Other</option>
              </select></div>
            </div>

            <button className="btn btn-coach btn-block btn-lg" disabled={saving} onClick={() => saveStep(3, {
              ...goals,
              confidence_level: goals.confidence_level,
              sleep_hours: goals.sleep_hours ? parseFloat(goals.sleep_hours) : null,
            })} style={{ marginTop: 6 }}>
              {saving ? 'Setting up...' : 'Meet Coach Remy →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
