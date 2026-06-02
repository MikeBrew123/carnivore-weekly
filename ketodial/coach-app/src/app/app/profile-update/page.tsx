'use client'

import { useState, useEffect } from 'react'
import '@/styles/coach.css'
import '@/styles/member.css'

export default function ProfileUpdatePage() {
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [form, setForm] = useState({
    stress_level: '',
    sleep_hours: '',
    alcohol_habits: '',
    cooking_ability: '',
    food_budget: '',
    previous_diets: '',
    trigger_foods: '',
    eating_out: '',
    wearable: '',
    feedback_tone: 'warm',
    feedback_format: 'detailed',
  })

  useEffect(() => {
    fetch('/api/member/enrichment').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.completed) setDone(true)
      if (d?.current) {
        setForm(f => ({
          ...f,
          feedback_tone: d.current.feedback_tone || 'warm',
          feedback_format: d.current.feedback_format || 'detailed',
        }))
      }
    })
  }, [])

  async function handleSave() {
    setSaving(true)
    const res = await fetch('/api/member/enrichment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        sleep_hours: form.sleep_hours ? parseFloat(form.sleep_hours) : null,
      }),
    })
    if (res.ok) setDone(true)
    setSaving(false)
  }

  if (done) return (
    <div className="ob-page">
      <div className="ob" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <h2>Thanks for sharing</h2>
        <p className="lead">Coach Remy now has a fuller picture. This will make your coaching more personal.</p>
        <a href="/app/dashboard" className="btn btn-coach" style={{ marginTop: 16 }}>Back to dashboard</a>
      </div>
    </div>
  )

  return (
    <div className="ob-page">
      <div className="ob">
        <div className="ob-eyebrow">Help your coach help you</div>
        <h2>A few more details</h2>
        <p className="lead">These are optional but they sharpen your coaching. Skip anything you don&apos;t want to answer.</p>

        <div className="ob-2col">
          <div className="field">
            <label>Stress level right now</label>
            <div className="sel"><select value={form.stress_level} onChange={e => setForm(f => ({ ...f, stress_level: e.target.value }))}>
              <option value="">Skip</option>
              <option value="low">Low — life is chill</option>
              <option value="moderate">Moderate — some pressure</option>
              <option value="high">High — pretty stressed</option>
              <option value="very_high">Very high — survival mode</option>
            </select></div>
          </div>
          <div className="field">
            <label>Average sleep</label>
            <div className="inp"><input type="number" value={form.sleep_hours} onChange={e => setForm(f => ({ ...f, sleep_hours: e.target.value }))} placeholder="7" /><span className="suffix">hrs</span></div>
          </div>
        </div>

        <div className="ob-2col">
          <div className="field">
            <label>Alcohol</label>
            <div className="sel"><select value={form.alcohol_habits} onChange={e => setForm(f => ({ ...f, alcohol_habits: e.target.value }))}>
              <option value="">Skip</option>
              <option value="none">None</option>
              <option value="occasional">Occasional (1-2/week)</option>
              <option value="regular">Regular (3-5/week)</option>
              <option value="daily">Daily</option>
            </select></div>
          </div>
          <div className="field">
            <label>Cooking ability</label>
            <div className="sel"><select value={form.cooking_ability} onChange={e => setForm(f => ({ ...f, cooking_ability: e.target.value }))}>
              <option value="">Skip</option>
              <option value="beginner">Beginner — basics only</option>
              <option value="comfortable">Comfortable — can follow recipes</option>
              <option value="confident">Confident — enjoy cooking</option>
            </select></div>
          </div>
        </div>

        <div className="ob-2col">
          <div className="field">
            <label>Food budget</label>
            <div className="sel"><select value={form.food_budget} onChange={e => setForm(f => ({ ...f, food_budget: e.target.value }))}>
              <option value="">Skip</option>
              <option value="tight">Tight — need to keep costs down</option>
              <option value="moderate">Moderate — reasonable spending</option>
              <option value="flexible">Flexible — quality over cost</option>
            </select></div>
          </div>
          <div className="field">
            <label>Eating out frequency</label>
            <div className="sel"><select value={form.eating_out} onChange={e => setForm(f => ({ ...f, eating_out: e.target.value }))}>
              <option value="">Skip</option>
              <option value="rarely">Rarely (1-2x/month)</option>
              <option value="weekly">Weekly (1-2x/week)</option>
              <option value="frequent">Frequent (3+/week)</option>
            </select></div>
          </div>
        </div>

        <div className="field">
          <label>Previous diets tried <span className="opt">— what worked, what didn&apos;t</span></label>
          <textarea className="ta" value={form.previous_diets} onChange={e => setForm(f => ({ ...f, previous_diets: e.target.value }))} placeholder="Tried Whole30 for a month, lost weight but couldn't sustain. Did keto 2 years ago, felt great but fell off after a vacation..." />
        </div>

        <div className="field">
          <label>Trigger or craving foods <span className="opt">— the ones that derail you</span></label>
          <div className="inp"><input type="text" value={form.trigger_foods} onChange={e => setForm(f => ({ ...f, trigger_foods: e.target.value }))} placeholder="e.g. chips, bread, ice cream, pizza" /></div>
        </div>

        <div className="field">
          <label>Do you use a wearable or CGM?</label>
          <div className="sel"><select value={form.wearable} onChange={e => setForm(f => ({ ...f, wearable: e.target.value }))}>
            <option value="">Skip</option>
            <option value="none">No</option>
            <option value="fitness_tracker">Fitness tracker (Fitbit, Garmin, etc.)</option>
            <option value="apple_watch">Apple Watch</option>
            <option value="cgm">CGM (Dexcom, Libre, etc.)</option>
            <option value="both">Fitness tracker + CGM</option>
          </select></div>
        </div>

        <div className="ob-2col">
          <div className="field">
            <label>Update feedback tone?</label>
            <div className="sel"><select value={form.feedback_tone} onChange={e => setForm(f => ({ ...f, feedback_tone: e.target.value }))}>
              <option value="direct">Direct — no fluff</option>
              <option value="warm">Warm — encouraging</option>
              <option value="neutral">Neutral — just the facts</option>
            </select></div>
          </div>
          <div className="field">
            <label>Update response format?</label>
            <div className="sel"><select value={form.feedback_format} onChange={e => setForm(f => ({ ...f, feedback_format: e.target.value }))}>
              <option value="detailed">Detailed explanations</option>
              <option value="bullets">Short bullet points</option>
            </select></div>
          </div>
        </div>

        <button className="btn btn-coach btn-block btn-lg" onClick={handleSave} disabled={saving} style={{ marginTop: 10 }}>
          {saving ? 'Saving...' : 'Save & close'}
        </button>
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <a href="/app/dashboard" style={{ color: 'var(--ink-faint)', fontSize: 13 }}>Skip for now</a>
        </div>
      </div>
    </div>
  )
}
