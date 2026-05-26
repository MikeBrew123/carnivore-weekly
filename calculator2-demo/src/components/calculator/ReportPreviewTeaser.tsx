/**
 * ReportPreviewTeaser.tsx
 *
 * Static protocol preview for Step 3 — shows a masked sample of what
 * the paid report looks like using a realistic fictional user profile.
 *
 * No API calls. No backend. Pure static content.
 *
 * Fictional profile: "Sarah M." — Type 2 diabetes context, egg/dairy-free,
 * budget-conscious, sedentary, weight-loss goal, limited cooking skill.
 */

interface ReportPreviewTeaserProps {
  onUpgrade: () => void
  dietType?: string
}

export default function ReportPreviewTeaser({ onUpgrade, dietType }: ReportPreviewTeaserProps) {
  const dietLabel = dietType === 'keto' ? 'Keto'
    : dietType === 'lowcarb' ? 'Low-Carb'
    : dietType === 'pescatarian' ? 'Pescatarian'
    : 'Carnivore'

  return (
    <div style={{ margin: '32px 0 28px 0' }}>
      {/* Section label */}
      <p style={{
        color: 'rgba(244,228,212,0.45)',
        fontSize: '11px',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        marginBottom: '12px',
        fontFamily: "'Merriweather', Georgia, serif",
        textAlign: 'center'
      }}>
        Sample protocol preview
      </p>

      {/* Preview container */}
      <div style={{
        background: 'linear-gradient(160deg, #151008 0%, #0f0a04 100%)',
        borderRadius: '14px',
        border: '1px solid rgba(255,215,0,0.15)',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Thin gold top accent */}
        <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.4) 30%, rgba(255,215,0,0.4) 70%, transparent)' }} />

        <div style={{ padding: '24px 22px 0' }}>
          {/* Preview heading */}
          <p style={{
            color: '#ffd700',
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '19px',
            fontWeight: '700',
            margin: '0 0 4px 0',
            lineHeight: '1.3'
          }}>
            Preview: Your Custom {dietLabel} Protocol
          </p>
          <p style={{
            color: 'rgba(244,228,212,0.45)',
            fontSize: '12px',
            margin: '0 0 20px 0',
            fontFamily: "'Merriweather', Georgia, serif",
            lineHeight: '1.5'
          }}>
            Based on a sample profile — yours will be built from your answers.
          </p>

          {/* ── VISIBLE SECTION: Executive Summary excerpt ── */}
          <div style={{
            background: 'rgba(255,215,0,0.04)',
            border: '1px solid rgba(255,215,0,0.1)',
            borderRadius: '10px',
            padding: '16px 18px',
            marginBottom: '16px'
          }}>
            <p style={{
              color: 'rgba(255,215,0,0.7)',
              fontSize: '10px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              margin: '0 0 10px 0',
              fontFamily: "'Merriweather', Georgia, serif"
            }}>
              § Executive Summary
            </p>
            <p style={{
              color: 'rgba(244,228,212,0.78)',
              fontSize: '13.5px',
              lineHeight: '1.7',
              margin: '0 0 10px 0',
              fontFamily: "'Merriweather', Georgia, serif"
            }}>
              This protocol is designed for a 42-year-old woman managing insulin resistance, with egg and dairy intolerances, a sedentary desk job, and a weekly grocery budget under $100. The focus is on simple, one-pan meals using affordable cuts — ground beef, chuck roast, and chicken thighs — with targeted electrolyte support for the first 6 weeks.
            </p>
            <p style={{
              color: 'rgba(244,228,212,0.55)',
              fontSize: '13px',
              lineHeight: '1.7',
              margin: 0,
              fontFamily: "'Merriweather', Georgia, serif",
              fontStyle: 'italic'
            }}>
              Starting targets: 1,680 cal · 130g protein · 122g fat · &lt;20g carbs
            </p>
          </div>

          {/* ── VISIBLE SECTION: Sample day snippet ── */}
          <div style={{
            background: 'rgba(255,215,0,0.04)',
            border: '1px solid rgba(255,215,0,0.1)',
            borderRadius: '10px',
            padding: '16px 18px',
            marginBottom: '16px'
          }}>
            <p style={{
              color: 'rgba(255,215,0,0.7)',
              fontSize: '10px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              margin: '0 0 10px 0',
              fontFamily: "'Merriweather', Georgia, serif"
            }}>
              § Week 1, Day 1 — Sample
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <p style={{ color: 'rgba(244,228,212,0.78)', fontSize: '13px', margin: 0, fontFamily: "'Merriweather', Georgia, serif" }}>
                  <strong style={{ color: '#f4e4d4' }}>Meal 1</strong> — 0.5 lb ground beef patties + 2 tbsp tallow
                </p>
                <span style={{ color: 'rgba(244,228,212,0.4)', fontSize: '12px', whiteSpace: 'nowrap', marginLeft: '8px' }}>~620 cal</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <p style={{ color: 'rgba(244,228,212,0.78)', fontSize: '13px', margin: 0, fontFamily: "'Merriweather', Georgia, serif" }}>
                  <strong style={{ color: '#f4e4d4' }}>Meal 2</strong> — Slow-cooker chuck roast + bone broth
                </p>
                <span style={{ color: 'rgba(244,228,212,0.4)', fontSize: '12px', whiteSpace: 'nowrap', marginLeft: '8px' }}>~710 cal</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <p style={{ color: 'rgba(244,228,212,0.78)', fontSize: '13px', margin: 0, fontFamily: "'Merriweather', Georgia, serif" }}>
                  <strong style={{ color: '#f4e4d4' }}>Snack</strong> — Beef jerky (no sugar) + electrolyte water
                </p>
                <span style={{ color: 'rgba(244,228,212,0.4)', fontSize: '12px', whiteSpace: 'nowrap', marginLeft: '8px' }}>~350 cal</span>
              </div>
            </div>
            <p style={{
              color: 'rgba(139,92,246,0.6)',
              fontSize: '11px',
              margin: '10px 0 0 0',
              fontFamily: "'Merriweather', Georgia, serif",
              fontStyle: 'italic'
            }}>
              ✦ No eggs or dairy — swaps built around your intolerances
            </p>
          </div>

          {/* ── VISIBLE SECTION: Adaptation glimpse ── */}
          <div style={{
            background: 'rgba(255,215,0,0.04)',
            border: '1px solid rgba(255,215,0,0.1)',
            borderRadius: '10px',
            padding: '16px 18px',
            marginBottom: '6px'
          }}>
            <p style={{
              color: 'rgba(255,215,0,0.7)',
              fontSize: '10px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              margin: '0 0 10px 0',
              fontFamily: "'Merriweather', Georgia, serif"
            }}>
              § Adaptation Timeline — Week 2 Preview
            </p>
            <p style={{
              color: 'rgba(244,228,212,0.78)',
              fontSize: '13px',
              lineHeight: '1.7',
              margin: 0,
              fontFamily: "'Merriweather', Georgia, serif"
            }}>
              Energy dips are normal in days 8-14. For someone with insulin resistance, blood sugar may swing lower than expected as your body shifts fuel sources. Keep sodium at 5-7g/day (about 2 tsp salt) and add 400mg magnesium glycinate before bed. If afternoon crashes persist past day 10, increase fat at Meal 1 by 1 tbsp.
            </p>
          </div>
        </div>

        {/* ── MASKED/LOCKED SECTIONS ── */}
        <div style={{ position: 'relative' }}>
          {/* Gradient fade overlay */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '60px',
            background: 'linear-gradient(to bottom, rgba(15,10,4,1) 0%, rgba(15,10,4,0) 100%)',
            zIndex: 2,
            pointerEvents: 'none'
          }} />

          <div style={{ padding: '30px 22px 0', opacity: 0.35, filter: 'blur(1.5px)', userSelect: 'none' }}>
            {/* Skeleton locked sections */}
            {[
              { icon: '📅', title: '30-Day Meal Calendar', desc: '4 weeks of daily meals matched to your calorie and macro targets' },
              { icon: '🛒', title: 'Weekly Shopping Lists', desc: 'Budget-optimized grocery lists with per-meal cost breakdown' },
              { icon: '⚡', title: 'Electrolyte & Supplement Protocol', desc: 'Sodium, magnesium, potassium dosing by week and symptom' },
              { icon: '🩺', title: 'Doctor Conversation Guide', desc: 'Lab markers to request, what to expect, scripts for LDL questions' },
              { icon: '📉', title: 'Plateau & Stall Breaker', desc: 'Week-by-week troubleshooting when progress stalls' },
              { icon: '🍽️', title: 'Restaurant & Travel Playbook', desc: 'How to eat out without breaking protocol' },
            ].map((section, i) => (
              <div key={i} style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
                padding: '10px 0',
                borderTop: i > 0 ? '1px solid rgba(255,215,0,0.06)' : 'none'
              }}>
                <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '2px' }}>{section.icon}</span>
                <div>
                  <p style={{ color: '#f4e4d4', fontSize: '14px', fontWeight: '600', margin: '0 0 3px 0', fontFamily: "'Merriweather', Georgia, serif" }}>
                    {section.title}
                  </p>
                  <p style={{ color: 'rgba(244,228,212,0.5)', fontSize: '12px', margin: 0, fontFamily: "'Merriweather', Georgia, serif", lineHeight: '1.5' }}>
                    {section.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Lock overlay */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            top: '40px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 3,
            background: 'linear-gradient(to bottom, rgba(15,10,4,0) 0%, rgba(15,10,4,0.85) 25%, rgba(15,10,4,0.95) 100%)',
            padding: '0 28px 28px'
          }}>
            <div style={{
              background: 'rgba(255,215,0,0.08)',
              border: '1px solid rgba(255,215,0,0.25)',
              borderRadius: '10px',
              padding: '18px 24px',
              textAlign: 'center',
              maxWidth: '340px',
              backdropFilter: 'blur(4px)'
            }}>
              <p style={{ fontSize: '22px', margin: '0 0 8px 0' }}>🔒</p>
              <p style={{
                color: '#ffd700',
                fontSize: '15px',
                fontWeight: '700',
                margin: '0 0 8px 0',
                fontFamily: "'Playfair Display', Georgia, serif"
              }}>
                6 more sections in your full protocol
              </p>
              <p style={{
                color: 'rgba(244,228,212,0.55)',
                fontSize: '12.5px',
                margin: '0 0 16px 0',
                lineHeight: '1.6',
                fontFamily: "'Merriweather', Georgia, serif"
              }}>
                30-day meal calendar, shopping lists, doctor conversation guide, plateau breaker, and more — all built for your profile.
              </p>
              <button
                onClick={() => {
                  if (window.gtag) {
                    window.gtag('event', 'calculator_preview_unlock_click', {
                      'event_category': 'calculator',
                      'event_label': 'preview_unlock_clicked'
                    })
                  }
                  onUpgrade()
                }}
                style={{
                  background: 'linear-gradient(135deg, #ffd700 0%, #f0c800 100%)',
                  color: '#1a0d00',
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: '15px',
                  fontWeight: '700',
                  padding: '12px 28px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 16px rgba(255,215,0,0.2)'
                }}
              >
                Unlock My Full Protocol — $29
              </button>
            </div>
          </div>
        </div>

        {/* Bottom spacer for overlay */}
        <div style={{ height: '220px' }} />
      </div>
    </div>
  )
}
