import { useEffect, useRef } from 'react'
import { FormData, MacroResults } from '../../../types/form'
import { calculateBMR, calculateMacros } from '../../../lib/calculations'
import MacroPreview from '../../ui/MacroPreview'
import { useFormStore } from '../../../stores/formStore'

declare global {
  interface Window {
    gtag?: (...args: any[]) => void
  }
}

interface Step3FreeResultsProps {
  data: FormData
  macros: MacroResults | null
  onUpgrade: () => void
  onBack: () => void
}

// Map raw activity values to readable labels
const activityLabels: Record<string, string> = {
  'sedentary': 'Sedentary',
  'light': 'Lightly Active',
  'moderate': 'Moderately Active',
  'very': 'Very Active',
  'extra': 'Extremely Active'
}

// Map raw goal values to readable labels
const goalLabels: Record<string, string> = {
  'lose': 'Lose Fat',
  'maintain': 'Maintain',
  'gain': 'Build Muscle'
}

// Diet-specific configurations with Default Day meal structure
const dietConfig: Record<string, {
  label: string
  meal1: { description: string; calories: number }
  meal2: { protein: string; calPerLb: number }
  troubleshooting: string
  socialProof: string
}> = {
  'carnivore': {
    label: 'Carnivore',
    meal1: { description: '4 Eggs + 0.5 lb Ground Beef (80/20)', calories: 750 },
    meal2: { protein: 'Ribeye', calPerLb: 1200 },
    troubleshooting: 'Fixes for night sweats and digestive stalls',
    socialProof: 'carnivores'
  },
  'keto': {
    label: 'Keto',
    meal1: { description: '3 Eggs + 1 Avocado + 4 Bacon Strips', calories: 650 },
    meal2: { protein: 'Salmon or Chicken Thighs', calPerLb: 1000 },
    troubleshooting: 'Strategies for keto flu and electrolyte balance',
    socialProof: 'keto dieters'
  },
  'lowcarb': {
    label: 'Low Carb',
    meal1: { description: '3 Eggs + 4 oz Sausage + Veggies', calories: 550 },
    meal2: { protein: 'Chicken Thighs or Pork Chops', calPerLb: 1100 },
    troubleshooting: 'Managing carb cravings and energy dips',
    socialProof: 'low-carb followers'
  },
  'pescatarian': {
    label: 'Pescatarian',
    meal1: { description: '4 Eggs + 4 oz Smoked Salmon', calories: 500 },
    meal2: { protein: 'White Fish + 2 tbsp Butter', calPerLb: 600 },
    troubleshooting: 'Optimizing Omega-3 ratios and mercury safety',
    socialProof: 'pescatarians'
  }
}

// Default to carnivore if diet not found
const getDietConfig = (diet: string) => dietConfig[diet] || dietConfig['carnivore']

// Calculate meal 2 amount based on remaining calories
const getMeal2Amount = (totalCalories: number, meal1Calories: number, meal2CalPerLb: number) => {
  const remainingCalories = totalCalories - meal1Calories
  return (remainingCalories / meal2CalPerLb).toFixed(1)
}

export default function Step3FreeResults({
  data,
  macros,
  onUpgrade,
  onBack,
}: Step3FreeResultsProps) {
  const { resetForm } = useFormStore()
  const mealLockRef = useRef<HTMLDivElement>(null)
  const hasTrackedMealLock = useRef(false)

  // Track free results view
  useEffect(() => {
    if (window.gtag) {
      window.gtag('event', 'calculator_free_results', {
        'event_category': 'calculator',
        'event_label': 'free_results_viewed'
      })
    }
  }, [])

  // Track meal lock visibility (fire once when scrolled into view)
  useEffect(() => {
    if (!mealLockRef.current || hasTrackedMealLock.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTrackedMealLock.current) {
            if (window.gtag) {
              window.gtag('event', 'calculator_meal_lock_seen', {
                'event_category': 'calculator',
                'event_label': 'meal_lock_viewed'
              })
            }
            hasTrackedMealLock.current = true
            observer.disconnect()
          }
        })
      },
      { threshold: 0.5 }
    )

    observer.observe(mealLockRef.current)

    return () => {
      observer.disconnect()
    }
  }, [])

  if (!macros) {
    return (
      <div className="space-y-6">
        <p className="text-gray-600">Loading your results...</p>
      </div>
    )
  }

  // Get diet-specific config
  const config = getDietConfig(data.diet)

  return (
    <div className="space-y-8">
      {/* Results Header */}
      <div>
        <h2 className="text-2xl md:text-3xl lg:text-4xl" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: '700', color: '#ffd700', marginBottom: '8px' }}>Your Personalized {config.label} Macros</h2>
        <p style={{ fontFamily: "'Merriweather', Georgia, serif", fontSize: '16px', color: '#a0a0a0' }}>Based on your profile and goals</p>
      </div>

      {/* Profile Summary - Dark Card Styling */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '24px' }}>
        <div style={{ fontSize: '14px' }}>
          <span style={{ color: '#a0a0a0', fontFamily: "'Merriweather', Georgia, serif" }}>Sex:</span>
          <span style={{ fontWeight: '600', color: '#f5f5f5', marginLeft: '12px', fontFamily: "'Merriweather', Georgia, serif" }}>{data.sex}</span>
        </div>
        <div style={{ fontSize: '14px' }}>
          <span style={{ color: '#a0a0a0', fontFamily: "'Merriweather', Georgia, serif" }}>Age:</span>
          <span style={{ fontWeight: '600', color: '#f5f5f5', marginLeft: '12px', fontFamily: "'Merriweather', Georgia, serif" }}>{data.age} years</span>
        </div>
        <div style={{ fontSize: '14px' }}>
          <span style={{ color: '#a0a0a0', fontFamily: "'Merriweather', Georgia, serif" }}>Height:</span>
          <span style={{ fontWeight: '600', color: '#f5f5f5', marginLeft: '12px', fontFamily: "'Merriweather', Georgia, serif" }}>
            {data.heightFeet ? `${data.heightFeet}'${data.heightInches}"` : `${data.heightCm}cm`}
          </span>
        </div>
        <div style={{ fontSize: '14px' }}>
          <span style={{ color: '#a0a0a0', fontFamily: "'Merriweather', Georgia, serif" }}>Weight:</span>
          <span style={{ fontWeight: '600', color: '#f5f5f5', marginLeft: '12px', fontFamily: "'Merriweather', Georgia, serif" }}>{data.weight} lbs</span>
        </div>
        <div style={{ fontSize: '14px' }}>
          <span style={{ color: '#a0a0a0', fontFamily: "'Merriweather', Georgia, serif" }}>Activity Level:</span>
          <span style={{ fontWeight: '600', color: '#f5f5f5', marginLeft: '12px', fontFamily: "'Merriweather', Georgia, serif" }}>{activityLabels[data.lifestyle] || data.lifestyle}</span>
        </div>
        <div style={{ fontSize: '14px' }}>
          <span style={{ color: '#a0a0a0', fontFamily: "'Merriweather', Georgia, serif" }}>Goal:</span>
          <span style={{ fontWeight: '600', color: '#f5f5f5', marginLeft: '12px', fontFamily: "'Merriweather', Georgia, serif" }}>{goalLabels[data.goal] || data.goal}</span>
        </div>
      </div>

      {/* Macro Preview - Show Value First */}
      <MacroPreview macros={macros} />

      {/* Your Sample "Default Day" Protocol */}
      <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '24px' }}>
        <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '18px', fontWeight: '600', color: '#ffd700', marginBottom: '16px' }}>Your Sample "Default Day" Protocol</h3>
        <p style={{ fontSize: '14px', color: '#a0a0a0', marginBottom: '16px', fontFamily: "'Merriweather', Georgia, serif" }}>
          To hit your {macros.calories} calorie target:
        </p>

        {/* Meal 1 */}
        <div style={{ marginBottom: '16px', paddingLeft: '16px', borderLeft: '3px solid #d4a574' }}>
          <p style={{ fontSize: '13px', color: '#d4a574', fontWeight: '600', marginBottom: '4px', fontFamily: "'Playfair Display', Georgia, serif" }}>MEAL 1</p>
          <p style={{ fontSize: '15px', color: '#f5f5f5', fontFamily: "'Merriweather', Georgia, serif" }}>
            {config.meal1.description}
          </p>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '4px', fontFamily: "'Merriweather', Georgia, serif" }}>
            ~{config.meal1.calories} calories
          </p>
        </div>

        {/* Blurred Meal Teaser Wrapper */}
        <div ref={mealLockRef} style={{ position: 'relative', overflow: 'hidden', borderRadius: '8px', marginTop: '12px' }}>
          {/* Blurred Content */}
          <div style={{ filter: 'blur(5px)', userSelect: 'none', pointerEvents: 'none' }}>
            {/* Meal 2 */}
            <div style={{ paddingLeft: '16px', borderLeft: '3px solid #d4a574', marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', color: '#d4a574', fontWeight: '600', marginBottom: '4px', fontFamily: "'Playfair Display', Georgia, serif" }}>MEAL 2</p>
              <p style={{ fontSize: '15px', color: '#f5f5f5', fontFamily: "'Merriweather', Georgia, serif" }}>
                <strong style={{ color: '#ffd700' }}>{getMeal2Amount(macros.calories, config.meal1.calories, config.meal2.calPerLb)} lbs</strong> of {config.meal2.protein}
              </p>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '4px', fontFamily: "'Merriweather', Georgia, serif" }}>
                ~{macros.calories - config.meal1.calories} calories to reach your target
              </p>
            </div>

            {/* Meal 3 - Placeholder */}
            <div style={{ paddingLeft: '16px', borderLeft: '3px solid #d4a574', marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', color: '#d4a574', fontWeight: '600', marginBottom: '4px', fontFamily: "'Playfair Display', Georgia, serif" }}>MEAL 3 — AFTERNOON</p>
              <p style={{ fontSize: '15px', color: '#f5f5f5', fontFamily: "'Merriweather', Georgia, serif" }}>
                6 oz Ribeye Steak + 2 tbsp Butter + Bone Broth
              </p>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '4px', fontFamily: "'Merriweather', Georgia, serif" }}>
                ~550 calories | 42g protein | 40g fat
              </p>
            </div>

            {/* Meal 4 - Placeholder */}
            <div style={{ paddingLeft: '16px', borderLeft: '3px solid #d4a574', marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', color: '#d4a574', fontWeight: '600', marginBottom: '4px', fontFamily: "'Playfair Display', Georgia, serif" }}>MEAL 4 — EVENING</p>
              <p style={{ fontSize: '15px', color: '#f5f5f5', fontFamily: "'Merriweather', Georgia, serif" }}>
                0.5 lb Ground Beef Patties + 3 Eggs + Tallow
              </p>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '4px', fontFamily: "'Merriweather', Georgia, serif" }}>
                ~680 calories | 52g protein | 48g fat
              </p>
            </div>

            {/* Daily Snack - Placeholder */}
            <div style={{ paddingLeft: '16px', borderLeft: '3px solid #d4a574' }}>
              <p style={{ fontSize: '13px', color: '#d4a574', fontWeight: '600', marginBottom: '4px', fontFamily: "'Playfair Display', Georgia, serif" }}>DAILY SNACK</p>
              <p style={{ fontSize: '15px', color: '#f5f5f5', fontFamily: "'Merriweather', Georgia, serif" }}>
                Beef Jerky + Hard Cheese + Pork Rinds
              </p>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '4px', fontFamily: "'Merriweather', Georgia, serif" }}>
                ~320 calories | 28g protein | 22g fat
              </p>
            </div>
          </div>

          {/* Lock Overlay */}
          <div
            onClick={() => {
              if (window.gtag) {
                window.gtag('event', 'calculator_lock_overlay_click', {
                  'event_category': 'calculator',
                  'event_label': 'lock_overlay_clicked'
                })
              }
              onUpgrade()
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '8px',
              zIndex: 10,
              cursor: 'pointer'
            }}>
            <span style={{ fontSize: '28px', marginBottom: '8px' }}>🔒</span>
            <p style={{ color: '#ffd700', fontWeight: 600, fontSize: '16px', margin: 0 }}>Your full daily protocol is ready</p>
            <p style={{ color: '#a3a3a3', fontSize: '13px', marginTop: '6px' }}>4 more meals + snack timing — included in your Custom Protocol</p>
            <p style={{ color: 'rgba(245, 158, 11, 0.7)', fontSize: '12px', marginTop: '4px' }}>$29 — Unlock Now</p>
          </div>
        </div>
      </div>

      {/* Premium Upgrade Card — v2 redesign */}
      <style>{`
        .cw-upgrade-card { animation: cwGlow 5s ease-in-out infinite; }
        @keyframes cwGlow {
          0%, 100% { box-shadow: 0 0 0 1px rgba(255,215,0,0.2), 0 0 40px rgba(255,215,0,0.06), 0 24px 60px rgba(0,0,0,0.55); }
          50%       { box-shadow: 0 0 0 1px rgba(255,215,0,0.35), 0 0 60px rgba(255,215,0,0.13), 0 24px 60px rgba(0,0,0,0.55); }
        }
        .cw-upgrade-item + .cw-upgrade-item { border-top: 1px solid rgba(255,215,0,0.08); padding-top: 14px; margin-top: 14px; }
        .cw-upgrade-btn:hover { background: linear-gradient(135deg,#ffe84d,#ffd700,#e8b800) !important; transform: translateY(-2px) !important; box-shadow: 0 8px 32px rgba(255,215,0,0.35) !important; }
      `}</style>
      <div
        className="cw-upgrade-card"
        style={{ background: 'linear-gradient(160deg,#1e1008 0%,#120a02 55%,#0c0701 100%)', borderRadius: '16px', padding: '0', border: '1px solid rgba(255,215,0,0.28)', overflow: 'hidden', position: 'relative' }}
      >
        {/* Gold top bar */}
        <div style={{ height: '3px', background: 'linear-gradient(90deg,transparent,#ffd700 25%,#ffd700 75%,transparent)' }} />

        <div style={{ padding: '28px 28px 28px' }}>
          {/* Headline */}
          <p style={{ color: '#ffd700', fontFamily: "'Playfair Display', Georgia, serif", fontSize: '26px', fontWeight: '700', margin: '0 0 8px 0', textAlign: 'center', lineHeight: '1.25', letterSpacing: '-0.02em' }}>
            A few more questions,<br />then YOUR protocol.
          </p>
          <p style={{ color: 'rgba(244,228,212,0.65)', fontSize: '14px', textAlign: 'center', margin: '0 0 22px 0', fontStyle: 'italic', fontFamily: "'Merriweather', Georgia, serif", lineHeight: '1.6' }}>
            You've got the basics. Twelve more questions and we build the plan around your actual life.
          </p>

          {/* Divider */}
          <div style={{ height: '1px', background: 'linear-gradient(90deg,transparent,rgba(255,215,0,0.3) 20%,rgba(255,215,0,0.3) 80%,transparent)', margin: '0 0 22px 0' }} />

          {/* Testimonial */}
          <div style={{ position: 'relative', background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.12)', borderRadius: '10px', padding: '20px 20px 16px', margin: '0 0 24px 0' }}>
            <span style={{ position: 'absolute', top: '-18px', left: '16px', fontSize: '52px', lineHeight: 1, color: 'rgba(255,215,0,0.25)', fontFamily: 'Georgia,serif', userSelect: 'none' }}>"</span>
            <p style={{ color: 'rgba(244,228,212,0.8)', fontSize: '14px', margin: '6px 0 0 0', lineHeight: '1.7', fontStyle: 'italic', fontFamily: "'Merriweather', Georgia, serif", textAlign: 'center' }}>
              Readers tell us the protocol felt "uncomfortably specific" in a good way. Like we'd been reading their bloodwork over their shoulder.
            </p>
          </div>

          {/* Section label */}
          <p style={{ color: '#ffd700', fontSize: '10px', fontWeight: '700', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.14em', fontFamily: "'Merriweather', Georgia, serif" }}>
            Here's what gets built for YOU:
          </p>

          {/* List items */}
          <div style={{ marginBottom: '24px' }}>
            <div className="cw-upgrade-item" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{ color: '#ffd700', fontSize: '9px', marginTop: '6px', flexShrink: 0 }}>✦</span>
              <p style={{ color: 'rgba(244,228,212,0.82)', fontSize: '14px', margin: 0, lineHeight: '1.65', fontFamily: "'Merriweather', Georgia, serif" }}>
                <strong style={{ color: '#f4e4d4' }}>YOUR 30-day meal plan</strong>, built around your bodyweight and goals. Grocery lists priced for $80–120 a week, swaps for picky eaters, "I cook 3 nights" or "6 nights" versions.{' '}
                <span style={{ display: 'inline-block', color: '#ffd700', fontSize: '11px', background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: '4px', padding: '1px 7px', verticalAlign: 'middle' }}>$97 value</span>
              </p>
            </div>
            <div className="cw-upgrade-item" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{ color: '#ffd700', fontSize: '9px', marginTop: '6px', flexShrink: 0 }}>✦</span>
              <p style={{ color: 'rgba(244,228,212,0.82)', fontSize: '14px', margin: 0, lineHeight: '1.65', fontFamily: "'Merriweather', Georgia, serif" }}>
                <strong style={{ color: '#f4e4d4' }}>YOUR doctor conversation script.</strong> Exact sentences for when LDL jumps and your GP panics, plus four labs to ask for that aren't on a standard panel.{' '}
                <span style={{ display: 'inline-block', color: '#ffd700', fontSize: '11px', background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: '4px', padding: '1px 7px', verticalAlign: 'middle' }}>$79 value</span>
              </p>
            </div>
            <div className="cw-upgrade-item" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{ color: '#ffd700', fontSize: '9px', marginTop: '6px', flexShrink: 0 }}>✦</span>
              <p style={{ color: 'rgba(244,228,212,0.82)', fontSize: '14px', margin: 0, lineHeight: '1.65', fontFamily: "'Merriweather', Georgia, serif" }}>
                <strong style={{ color: '#f4e4d4' }}>YOUR week-by-week adaptation guide.</strong> What week 2 fatigue means, when leg cramps signal sodium vs magnesium, the plateau protocol for week 6.{' '}
                <span style={{ display: 'inline-block', color: '#ffd700', fontSize: '11px', background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: '4px', padding: '1px 7px', verticalAlign: 'middle' }}>$69 value</span>
              </p>
            </div>
            <div className="cw-upgrade-item" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{ color: '#ffd700', fontSize: '9px', marginTop: '6px', flexShrink: 0 }}>✦</span>
              <p style={{ color: 'rgba(244,228,212,0.82)', fontSize: '14px', margin: 0, lineHeight: '1.65', fontFamily: "'Merriweather', Georgia, serif" }}>
                <strong style={{ color: '#f4e4d4' }}>YOUR symptom-to-fix map.</strong> Brain fog, sleep, digestion, hormones. Matched to the likely cause from what you tell us.{' '}
                <span style={{ display: 'inline-block', color: '#ffd700', fontSize: '11px', background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: '4px', padding: '1px 7px', verticalAlign: 'middle' }}>$53 value</span>
              </p>
            </div>
            <div className="cw-upgrade-item" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{ color: '#ffd700', fontSize: '9px', marginTop: '6px', flexShrink: 0 }}>✦</span>
              <p style={{ color: 'rgba(244,228,212,0.82)', fontSize: '14px', margin: 0, lineHeight: '1.65', fontFamily: "'Merriweather', Georgia, serif" }}>
                <strong style={{ color: '#f4e4d4' }}>YOUR bloodwork interpretation guide.</strong> What your numbers should look like at 30, 60, 90 days. Carnivore ranges, not standard-diet ranges.
              </p>
            </div>
            <div className="cw-upgrade-item" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{ color: '#ffd700', fontSize: '9px', marginTop: '6px', flexShrink: 0 }}>✦</span>
              <p style={{ color: 'rgba(244,228,212,0.82)', fontSize: '14px', margin: 0, lineHeight: '1.65', fontFamily: "'Merriweather', Georgia, serif" }}>
                <strong style={{ color: '#f4e4d4' }}>Lifetime access.</strong> Free updates when the science evolves.
              </p>
            </div>
          </div>

          {/* Price box */}
          <div style={{ background: 'rgba(0,0,0,0.45)', borderRadius: '12px', padding: '20px 24px', margin: '0 0 20px 0', textAlign: 'center', border: '1px solid rgba(255,215,0,0.2)' }}>
            <p style={{ color: 'rgba(168,144,128,0.6)', fontSize: '13px', margin: '0 0 4px 0', fontFamily: "'Merriweather', Georgia, serif", textDecoration: 'line-through' }}>Total value: $298</p>
            <p style={{ color: '#ffd700', fontSize: '28px', fontWeight: '700', margin: '0 0 4px 0', fontFamily: "'Playfair Display', Georgia, serif", letterSpacing: '-0.02em' }}>$29 — Yours forever</p>
            <p style={{ color: 'rgba(244,228,212,0.4)', fontSize: '12px', margin: 0, fontFamily: "'Merriweather', Georgia, serif" }}>One-time · No subscription · Instant access</p>
          </div>

          {/* CTA Button */}
          <button
            className="cw-upgrade-btn"
            onClick={(e) => {
              console.log('[Step3FreeResults] Upgrade button clicked, event:', e)
              if (window.gtag) {
                window.gtag('event', 'calculator_upgrade_click', {
                  'event_category': 'calculator',
                  'event_label': 'upgrade_clicked',
                  'diet_type': data.diet
                })
              }
              onUpgrade()
            }}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg,#ffd700 0%,#f0c800 100%)',
              color: '#1a0d00',
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '18px',
              fontWeight: '700',
              padding: '18px 32px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.25s ease',
              marginBottom: '16px',
              letterSpacing: '0.01em',
              boxShadow: '0 4px 20px rgba(255,215,0,0.2), inset 0 1px 0 rgba(255,255,255,0.12)'
            }}
          >
            Build My Personalized Protocol → $29
          </button>

          {/* Guarantee */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: '8px' }}>
            <span style={{ fontSize: '15px', flexShrink: 0, marginTop: '1px' }}>🛡️</span>
            <p style={{ color: 'rgba(244,228,212,0.55)', fontSize: '13px', margin: 0, lineHeight: '1.55', fontFamily: "'Merriweather', Georgia, serif" }}>
              <strong style={{ color: 'rgba(255,215,0,0.75)' }}>30 days to read it, try it, decide.</strong> If it doesn't feel built for you, email us. Same-day refund. No survey, no friction.
            </p>
          </div>
        </div>
      </div>

      {/* Start Over Button */}
      <button
        onClick={() => {
          const confirmed = window.confirm(
            "Are you sure? This will clear your calculations and reset the form to Step 1."
          )
          if (confirmed) {
            if (window.gtag) {
              window.gtag('event', 'calculator_start_over_click', {
                'event_category': 'calculator',
                'event_label': 'start_over_clicked'
              })
            }
            resetForm()
          }
        }}
        style={{
          background: 'none',
          border: 'none',
          color: '#737373',
          fontSize: '14px',
          textDecoration: 'underline',
          cursor: 'pointer',
          padding: '8px',
          marginTop: '16px',
          fontFamily: "'Playfair Display', Georgia, serif"
        }}
      >
        Start Over
      </button>
    </div>
  )
}
