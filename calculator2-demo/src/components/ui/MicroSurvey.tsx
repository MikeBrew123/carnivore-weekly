import { useState } from 'react'
import { useFormStore } from '../../stores/formStore'

// EXP-004 micro-survey — asked right below the $29 offer so it never pushes the
// paid CTA down the page, and it captures the intent of people who just saw the
// offer and scrolled past. Answer feeds offer-message fit for the paid report.

const API_BASE = 'https://carnivore-report-api-production.iambrew.workers.dev'

const OPTIONS: { value: string; label: string }[] = [
  { value: 'eat_this_week', label: 'What to eat this week' },
  { value: 'fat_protein_target', label: 'How much fat and protein to hit' },
  { value: 'lose_without_stalling', label: 'How to lose weight without stalling' },
  { value: 'meal_plan_grocery', label: 'A full meal plan and grocery list' },
  { value: 'starting_from_zero', label: 'Starting carnivore from zero' },
  { value: 'not_sure', label: 'Not sure yet' },
]

export default function MicroSurvey() {
  const sessionToken = useFormStore((s) => s.sessionToken)
  const [done, setDone] = useState(false)

  const handleSelect = (value: string) => {
    if (done) return
    setDone(true)
    // GA4 signal (fires even if the DB write is skipped or fails)
    window.gtag?.('event', 'calculator_survey_response', {
      event_category: 'calculator',
      event_label: 'next_step',
      next_step: value,
    })
    // Persist to the funnel row, best-effort and non-blocking
    if (sessionToken) {
      fetch(`${API_BASE}/api/v1/calculator/survey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_token: sessionToken, next_step: value }),
      }).catch(() => {})
    }
  }

  return (
    <div style={{ backgroundColor: '#141414', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '20px 22px', marginTop: '20px' }}>
      {done ? (
        <p style={{ color: 'rgba(244,228,212,0.75)', fontSize: '14px', margin: 0, textAlign: 'center', fontFamily: "'Merriweather', Georgia, serif" }}>
          Thanks. That helps us build a better plan for you.
        </p>
      ) : (
        <>
          <p style={{ color: '#e8dcc8', fontSize: '15px', fontWeight: 600, margin: '0 0 4px 0', textAlign: 'center', fontFamily: "'Playfair Display', Georgia, serif" }}>
            One quick question
          </p>
          <p style={{ color: 'rgba(244,228,212,0.55)', fontSize: '13.5px', margin: '0 0 16px 0', textAlign: 'center', fontFamily: "'Merriweather', Georgia, serif" }}>
            What are you trying to figure out next?
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
            {OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => handleSelect(o.value)}
                style={{
                  background: '#1e1e1e',
                  border: '1px solid #3a3a3a',
                  color: 'rgba(244,228,212,0.85)',
                  fontSize: '13.5px',
                  padding: '9px 14px',
                  borderRadius: '999px',
                  cursor: 'pointer',
                  fontFamily: "'Merriweather', Georgia, serif",
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ffd700'; e.currentTarget.style.color = '#ffd700' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#3a3a3a'; e.currentTarget.style.color = 'rgba(244,228,212,0.85)' }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
