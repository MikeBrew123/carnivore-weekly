import { useEffect, useRef } from 'react'
import { FormData, MacroResults } from '../../../types/form'
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

// ── Diet-specific meal configurations ──
const dietConfig: Record<string, {
  label: string
  meal1: { description: string; calories: number }
  meal2: { protein: string; calPerLb: number }
  meal3: { description: string; calories: number; protein: number; fat: number }
  meal4: { description: string; calories: number; protein: number; fat: number }
  snack: { description: string; calories: number; protein: number; fat: number }
  troubleshooting: string
  socialProof: string
}> = {
  'carnivore': {
    label: 'Carnivore',
    meal1: { description: '4 Eggs + 0.5 lb Ground Beef (80/20)', calories: 750 },
    meal2: { protein: 'Ribeye Steak', calPerLb: 1200 },
    meal3: { description: '6 oz NY Strip + 2 tbsp Butter + Bone Broth', calories: 580, protein: 44, fat: 42 },
    meal4: { description: '0.5 lb Ground Beef Patties + 3 Eggs + Tallow', calories: 680, protein: 52, fat: 48 },
    snack: { description: 'Beef Jerky + Hard Cheese + Pork Rinds', calories: 320, protein: 28, fat: 22 },
    troubleshooting: 'Fixes for night sweats and digestive stalls',
    socialProof: 'carnivores'
  },
  'keto': {
    label: 'Keto',
    meal1: { description: '3 Eggs + 1 Avocado + 2 oz Cheddar', calories: 620 },
    meal2: { protein: 'Chicken Thighs (skin-on)', calPerLb: 950 },
    meal3: { description: 'Grilled Chicken Thigh + Spinach Salad + Olive Oil Dressing', calories: 520, protein: 36, fat: 38 },
    meal4: { description: 'Salmon Fillet + Roasted Broccoli + Butter', calories: 540, protein: 38, fat: 32 },
    snack: { description: 'Macadamia Nuts + Hard Cheese', calories: 300, protein: 8, fat: 26 },
    troubleshooting: 'Strategies for keto flu and electrolyte balance',
    socialProof: 'keto dieters'
  },
  'lowcarb': {
    label: 'Low Carb',
    meal1: { description: '3 Eggs + 4 oz Sausage + Sauteed Peppers', calories: 550 },
    meal2: { protein: 'Pork Chops (bone-in)', calPerLb: 1090 },
    meal3: { description: 'Turkey Burger Lettuce Wrap + Avocado + Side Salad', calories: 480, protein: 34, fat: 30 },
    meal4: { description: 'Chicken Thighs + Roasted Zucchini + Olive Oil', calories: 520, protein: 38, fat: 32 },
    snack: { description: 'Almonds + String Cheese', calories: 280, protein: 14, fat: 20 },
    troubleshooting: 'Managing carb cravings and energy dips',
    socialProof: 'low-carb followers'
  },
  'pescatarian': {
    label: 'Pescatarian',
    meal1: { description: '3 Eggs + 4 oz Smoked Salmon + Capers', calories: 480 },
    meal2: { protein: 'Wild Salmon Fillet', calPerLb: 1270 },
    meal3: { description: 'Grilled Shrimp + Cauliflower Rice + Garlic Butter', calories: 420, protein: 38, fat: 22 },
    meal4: { description: 'Seared Tuna Steak + Asparagus + Lemon Butter', calories: 380, protein: 44, fat: 16 },
    snack: { description: 'Sardines + Cream Cheese', calories: 290, protein: 22, fat: 18 },
    troubleshooting: 'Optimizing Omega-3 ratios and mercury safety',
    socialProof: 'pescatarians'
  }
}

const getDietConfig = (diet: string) => dietConfig[diet] || dietConfig['carnivore']

const getMeal2Amount = (totalCalories: number, meal1Calories: number, meal2CalPerLb: number) => {
  const remainingCalories = totalCalories - meal1Calories
  return (remainingCalories / meal2CalPerLb).toFixed(1)
}

// ── Shared styles ──
const sectionCard = {
  backgroundColor: '#1a1a1a',
  border: '1px solid #333',
  borderRadius: '8px',
  padding: '24px',
}
const goldHeading = {
  fontFamily: "'Playfair Display', Georgia, serif",
  fontWeight: '600' as const,
  color: '#ffd700',
}
const bodyFont = {
  fontFamily: "'Merriweather', Georgia, serif",
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
    window.gtag?.('event', 'calculator_free_results', {
      'event_category': 'calculator',
      'event_label': 'free_results_viewed'
    })
  }, [])

  // Track meal lock visibility
  useEffect(() => {
    if (!mealLockRef.current || hasTrackedMealLock.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTrackedMealLock.current) {
            window.gtag?.('event', 'calculator_meal_lock_seen', {
              'event_category': 'calculator',
              'event_label': 'meal_lock_viewed'
            })
            hasTrackedMealLock.current = true
            observer.disconnect()
          }
        })
      },
      { threshold: 0.5 }
    )
    observer.observe(mealLockRef.current)
    return () => { observer.disconnect() }
  }, [])

  if (!macros) {
    return (
      <div className="space-y-6">
        <p className="text-gray-600">Loading your results...</p>
      </div>
    )
  }

  const config = getDietConfig(data.diet)

  return (
    <div className="space-y-8">
      <div id="free-results" style={{ position: 'relative', top: '-16px' }} />

      {/* ════════════════════════════════════════════
          SECTION 1: Results Header
          ════════════════════════════════════════════ */}
      <div>
        <h2 className="text-2xl md:text-3xl lg:text-4xl" style={{ ...goldHeading, fontWeight: '700', marginBottom: '8px' }}>
          Your Personalized {config.label} Macros
        </h2>
        <p style={{ ...bodyFont, fontSize: '16px', color: '#a0a0a0' }}>Based on your profile and goals</p>
      </div>

      {/* ════════════════════════════════════════════
          SECTION 2: Profile Summary
          ════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={sectionCard}>
        <div style={{ fontSize: '14px' }}>
          <span style={{ color: '#a0a0a0', ...bodyFont }}>Sex:</span>
          <span style={{ fontWeight: '600', color: '#f5f5f5', marginLeft: '12px', ...bodyFont }}>{data.sex}</span>
        </div>
        <div style={{ fontSize: '14px' }}>
          <span style={{ color: '#a0a0a0', ...bodyFont }}>Age:</span>
          <span style={{ fontWeight: '600', color: '#f5f5f5', marginLeft: '12px', ...bodyFont }}>{data.age} years</span>
        </div>
        <div style={{ fontSize: '14px' }}>
          <span style={{ color: '#a0a0a0', ...bodyFont }}>Height:</span>
          <span style={{ fontWeight: '600', color: '#f5f5f5', marginLeft: '12px', ...bodyFont }}>
            {data.heightFeet ? `${data.heightFeet}'${data.heightInches}"` : `${data.heightCm}cm`}
          </span>
        </div>
        <div style={{ fontSize: '14px' }}>
          <span style={{ color: '#a0a0a0', ...bodyFont }}>Weight:</span>
          <span style={{ fontWeight: '600', color: '#f5f5f5', marginLeft: '12px', ...bodyFont }}>{data.weight} lbs</span>
        </div>
        <div style={{ fontSize: '14px' }}>
          <span style={{ color: '#a0a0a0', ...bodyFont }}>Activity Level:</span>
          <span style={{ fontWeight: '600', color: '#f5f5f5', marginLeft: '12px', ...bodyFont }}>{activityLabels[data.lifestyle] || data.lifestyle}</span>
        </div>
        <div style={{ fontSize: '14px' }}>
          <span style={{ color: '#a0a0a0', ...bodyFont }}>Goal:</span>
          <span style={{ fontWeight: '600', color: '#f5f5f5', marginLeft: '12px', ...bodyFont }}>{goalLabels[data.goal] || data.goal}</span>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          SECTION 3: Macro Cards
          ════════════════════════════════════════════ */}
      <MacroPreview macros={macros} />

      {/* ════════════════════════════════════════════
          SECTION 4: Value Bridge — right after macros
          "Your macros are ready. Now get your 30-day plan."
          ════════════════════════════════════════════ */}
      <div style={{
        background: 'linear-gradient(160deg, #1e1008 0%, #120a02 100%)',
        borderRadius: '12px',
        border: '1px solid rgba(255,215,0,0.2)',
        padding: '28px 24px',
        textAlign: 'center',
      }}>
        <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.35) 30%, rgba(255,215,0,0.35) 70%, transparent)', marginBottom: '24px', marginTop: '-12px' }} />

        <p style={{ ...bodyFont, color: '#f59e0b', fontSize: '13px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase' as const, margin: '0 0 8px 0' }}>
          Built From Your Results
        </p>
        <h3 style={{ ...goldHeading, fontSize: '22px', fontWeight: '700', margin: '0 0 10px 0', lineHeight: '1.3' }}>
          Your 30-day meal plan is ready.
        </h3>
        <p style={{ ...bodyFont, color: 'rgba(244,228,212,0.6)', fontSize: '14px', lineHeight: '1.7', margin: '0 0 22px 0' }}>
          We built a personalized {config.label.toLowerCase()} plan from your calculator results — exactly what to eat, when to shop, and what to expect your first month.
        </p>

        {/* Value bullets — meal plan and grocery list lead */}
        <div style={{ textAlign: 'left', marginBottom: '24px' }}>
          {[
            { icon: '🍽️', text: '30-day meal plan with portions matched to your macro targets' },
            { icon: '🛒', text: 'Weekly grocery lists you can take to the store this weekend' },
            { icon: '⚡', text: 'Week-by-week guide for your first 30 days (including the tough parts)' },
            { icon: '🔧', text: 'What to do when weight loss stalls, energy drops, or cravings hit' },
            { icon: '🩺', text: 'Doctor-conversation guide if your clinician has questions about your diet' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: i < 4 ? '12px' : 0 }}>
              <span style={{ fontSize: '15px', flexShrink: 0, marginTop: '1px' }}>{item.icon}</span>
              <p style={{ ...bodyFont, color: 'rgba(244,228,212,0.8)', fontSize: '13.5px', margin: 0, lineHeight: '1.6' }}>
                {item.text}
              </p>
            </div>
          ))}
        </div>

        <button
          onClick={() => {
            window.gtag?.('event', 'calculator_bridge_cta_click', {
              'event_category': 'calculator',
              'event_label': 'bridge_cta_clicked',
              'diet_type': data.diet
            })
            onUpgrade()
          }}
          style={{
            background: 'linear-gradient(135deg, #ffd700 0%, #f0c800 100%)',
            color: '#1a0d00',
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '17px',
            fontWeight: '700',
            padding: '16px 32px',
            borderRadius: '10px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.25s ease',
            boxShadow: '0 4px 20px rgba(255,215,0,0.2)',
            width: '100%',
            marginBottom: '10px',
          }}
        >
          Get My 30-Day Plan — $29
        </button>
        <p style={{ ...bodyFont, color: 'rgba(244,228,212,0.4)', fontSize: '12px', margin: 0 }}>
          One-time purchase. No subscription. 30-day money-back guarantee.
        </p>
      </div>

      {/* ════════════════════════════════════════════
          SECTION 5: User-Specific Locked Outline
          Uses actual macro numbers, no fictional persona
          ════════════════════════════════════════════ */}
      <div style={{
        background: 'linear-gradient(160deg, #151008 0%, #0f0a04 100%)',
        borderRadius: '14px',
        border: '1px solid rgba(255,215,0,0.15)',
        overflow: 'hidden',
      }}>
        <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.4) 30%, rgba(255,215,0,0.4) 70%, transparent)' }} />

        <div style={{ padding: '24px 22px' }}>
          <p style={{ ...goldHeading, fontSize: '18px', fontWeight: '700', margin: '0 0 6px 0' }}>
            What's in Your Custom {config.label} Plan
          </p>
          <p style={{ ...bodyFont, color: 'rgba(244,228,212,0.45)', fontSize: '12px', margin: '0 0 20px 0', lineHeight: '1.5' }}>
            Built from your quiz answers. Here's what you'll get:
          </p>

          {/* Visible: user's actual macro targets */}
          <div style={{
            background: 'rgba(255,215,0,0.06)',
            border: '1px solid rgba(255,215,0,0.12)',
            borderRadius: '10px',
            padding: '14px 16px',
            marginBottom: '12px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ ...bodyFont, color: '#f4e4d4', fontSize: '14px', fontWeight: '600', margin: 0 }}>
                Your Macro Targets
              </p>
              <span style={{ ...bodyFont, color: 'rgba(34,197,94,0.8)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>
                Included
              </span>
            </div>
            <p style={{ ...bodyFont, color: 'rgba(244,228,212,0.65)', fontSize: '13px', margin: '6px 0 0 0' }}>
              {macros.calories} cal · {macros.protein}g protein · {macros.fat}g fat · {macros.carbs}g carbs
            </p>
          </div>

          {/* Locked sections — each with teaser description */}
          {[
            {
              title: 'Doctor Conversation Guide',
              desc: 'Plain-English checklist for discussing labs, medications, cholesterol, electrolytes, and diet changes with your clinician.',
              icon: '🩺',
            },
            {
              title: '7-Day Adaptation Plan',
              desc: 'Day-by-day guide for energy dips, cravings, sleep changes, and electrolyte timing during your first week.',
              icon: '📅',
            },
            {
              title: 'Troubleshooting Guide',
              desc: 'What to do when weight stalls, digestion changes, energy drops, or cravings spike after the first week.',
              icon: '🔧',
            },
            {
              title: `${config.label} Meal Structure`,
              desc: `Meals, portions, and timing built around your ${macros.calories}-calorie target and ${macros.protein}g protein goal.`,
              icon: '🍽️',
            },
            {
              title: 'Shopping Lists & Prep Guide',
              desc: 'Weekly grocery lists with estimated costs and simple prep instructions for each meal.',
              icon: '🛒',
            },
            {
              title: 'Lab Markers to Track',
              desc: 'Which labs to request at 30, 60, and 90 days. What to expect and what ranges to discuss with your doctor.',
              icon: '🧪',
            },
          ].map((section, i) => (
            <div key={i} style={{
              background: 'rgba(255,215,0,0.03)',
              border: '1px solid rgba(255,215,0,0.08)',
              borderRadius: '10px',
              padding: '14px 16px',
              marginBottom: i < 5 ? '8px' : 0,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px' }}>{section.icon}</span>
                  <p style={{ ...bodyFont, color: '#f4e4d4', fontSize: '14px', fontWeight: '600', margin: 0 }}>
                    {section.title}
                  </p>
                </div>
                <span style={{ fontSize: '12px', color: 'rgba(255,215,0,0.5)' }}>🔒</span>
              </div>
              <p style={{ ...bodyFont, color: 'rgba(244,228,212,0.4)', fontSize: '12px', margin: '6px 0 0 26px', lineHeight: '1.5' }}>
                {section.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════
          SECTION 6: Diet-Aware Sample Day
          One visible meal + blurred rest (matched to diet)
          ════════════════════════════════════════════ */}
      <div style={sectionCard}>
        <h3 style={{ ...goldHeading, fontSize: '18px', marginBottom: '16px' }}>
          Your Sample {config.label} Day
        </h3>
        <p style={{ fontSize: '14px', color: '#a0a0a0', marginBottom: '16px', ...bodyFont }}>
          To hit your {macros.calories} calorie target:
        </p>

        {/* Meal 1 — visible */}
        <div style={{ marginBottom: '16px', paddingLeft: '16px', borderLeft: '3px solid #d4a574' }}>
          <p style={{ fontSize: '13px', color: '#d4a574', fontWeight: '600', marginBottom: '4px', fontFamily: "'Playfair Display', Georgia, serif" }}>MEAL 1</p>
          <p style={{ fontSize: '15px', color: '#f5f5f5', ...bodyFont }}>{config.meal1.description}</p>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '4px', ...bodyFont }}>~{config.meal1.calories} calories</p>
        </div>

        {/* Blurred meals — diet-aware */}
        <div ref={mealLockRef} style={{ position: 'relative', overflow: 'hidden', borderRadius: '8px', marginTop: '12px' }}>
          <div style={{ filter: 'blur(5px)', userSelect: 'none', pointerEvents: 'none' }}>
            {/* Meal 2 */}
            <div style={{ paddingLeft: '16px', borderLeft: '3px solid #d4a574', marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', color: '#d4a574', fontWeight: '600', marginBottom: '4px', fontFamily: "'Playfair Display', Georgia, serif" }}>MEAL 2</p>
              <p style={{ fontSize: '15px', color: '#f5f5f5', ...bodyFont }}>
                <strong style={{ color: '#ffd700' }}>{getMeal2Amount(macros.calories, config.meal1.calories, config.meal2.calPerLb)} lbs</strong> of {config.meal2.protein}
              </p>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '4px', ...bodyFont }}>
                ~{macros.calories - config.meal1.calories} calories to reach your target
              </p>
            </div>
            {/* Meal 3 */}
            <div style={{ paddingLeft: '16px', borderLeft: '3px solid #d4a574', marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', color: '#d4a574', fontWeight: '600', marginBottom: '4px', fontFamily: "'Playfair Display', Georgia, serif" }}>MEAL 3 — AFTERNOON</p>
              <p style={{ fontSize: '15px', color: '#f5f5f5', ...bodyFont }}>{config.meal3.description}</p>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '4px', ...bodyFont }}>~{config.meal3.calories} calories | {config.meal3.protein}g protein | {config.meal3.fat}g fat</p>
            </div>
            {/* Meal 4 */}
            <div style={{ paddingLeft: '16px', borderLeft: '3px solid #d4a574', marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', color: '#d4a574', fontWeight: '600', marginBottom: '4px', fontFamily: "'Playfair Display', Georgia, serif" }}>MEAL 4 — EVENING</p>
              <p style={{ fontSize: '15px', color: '#f5f5f5', ...bodyFont }}>{config.meal4.description}</p>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '4px', ...bodyFont }}>~{config.meal4.calories} calories | {config.meal4.protein}g protein | {config.meal4.fat}g fat</p>
            </div>
            {/* Snack */}
            <div style={{ paddingLeft: '16px', borderLeft: '3px solid #d4a574' }}>
              <p style={{ fontSize: '13px', color: '#d4a574', fontWeight: '600', marginBottom: '4px', fontFamily: "'Playfair Display', Georgia, serif" }}>DAILY SNACK</p>
              <p style={{ fontSize: '15px', color: '#f5f5f5', ...bodyFont }}>{config.snack.description}</p>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '4px', ...bodyFont }}>~{config.snack.calories} calories | {config.snack.protein}g protein | {config.snack.fat}g fat</p>
            </div>
          </div>

          {/* Lock Overlay */}
          <div
            onClick={() => {
              window.gtag?.('event', 'calculator_lock_overlay_click', {
                'event_category': 'calculator',
                'event_label': 'lock_overlay_clicked'
              })
              onUpgrade()
            }}
            style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.4)', borderRadius: '8px', zIndex: 10, cursor: 'pointer'
            }}
          >
            <span style={{ fontSize: '28px', marginBottom: '8px' }}>🔒</span>
            <p style={{ color: '#ffd700', fontWeight: 600, fontSize: '16px', margin: 0 }}>Your full 30-day meal plan is ready</p>
            <p style={{ color: '#a3a3a3', fontSize: '13px', marginTop: '6px' }}>4 more {config.label.toLowerCase()} meals + snack timing + grocery lists — included in your plan</p>
            <p style={{ color: 'rgba(245, 158, 11, 0.7)', fontSize: '12px', marginTop: '4px' }}>$29 — Yours forever</p>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          SECTION 7: Final Upgrade Card
          ════════════════════════════════════════════ */}
      <div id="upgrade-cta" style={{ position: 'relative', top: '-16px' }} />
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
        <div style={{ height: '3px', background: 'linear-gradient(90deg,transparent,#ffd700 25%,#ffd700 75%,transparent)' }} />

        <div style={{ padding: '28px 28px 28px' }}>
          <p style={{ color: '#f59e0b', fontSize: '12px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase' as const, margin: '0 0 6px 0', textAlign: 'center', ...bodyFont }}>
            Built From Your Results
          </p>
          <p style={{ color: '#ffd700', fontFamily: "'Playfair Display', Georgia, serif", fontSize: '24px', fontWeight: '700', margin: '0 0 8px 0', textAlign: 'center', lineHeight: '1.25', letterSpacing: '-0.02em' }}>
            Your 30-day {config.label.toLowerCase()} meal plan
          </p>
          <p style={{ color: 'rgba(244,228,212,0.6)', fontSize: '13.5px', textAlign: 'center', margin: '0 0 22px 0', ...bodyFont, lineHeight: '1.6' }}>
            Meals, grocery lists, and guidance built from your calculator results.
          </p>

          <div style={{ height: '1px', background: 'linear-gradient(90deg,transparent,rgba(255,215,0,0.3) 20%,rgba(255,215,0,0.3) 80%,transparent)', margin: '0 0 22px 0' }} />

          {/* Value bullets — differentiated, doctor guide leads */}
          <div style={{ marginBottom: '24px' }}>
            <div className="cw-upgrade-item" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{ color: '#ffd700', fontSize: '9px', marginTop: '6px', flexShrink: 0 }}>✦</span>
              <p style={{ color: 'rgba(244,228,212,0.82)', fontSize: '14px', margin: 0, lineHeight: '1.65', ...bodyFont }}>
                <strong style={{ color: '#f4e4d4' }}>30-day meal plan</strong> — portions, timing, and simple meals built around your {macros.calories}-calorie, {macros.protein}g-protein targets.
              </p>
            </div>
            <div className="cw-upgrade-item" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{ color: '#ffd700', fontSize: '9px', marginTop: '6px', flexShrink: 0 }}>✦</span>
              <p style={{ color: 'rgba(244,228,212,0.82)', fontSize: '14px', margin: 0, lineHeight: '1.65', ...bodyFont }}>
                <strong style={{ color: '#f4e4d4' }}>Weekly grocery lists</strong> — take them to the store this weekend. Budget-friendly options included.
              </p>
            </div>
            <div className="cw-upgrade-item" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{ color: '#ffd700', fontSize: '9px', marginTop: '6px', flexShrink: 0 }}>✦</span>
              <p style={{ color: 'rgba(244,228,212,0.82)', fontSize: '14px', margin: 0, lineHeight: '1.65', ...bodyFont }}>
                <strong style={{ color: '#f4e4d4' }}>First-month guide + doctor script</strong> — what to expect, what to do when progress stalls, and what to tell your clinician.
              </p>
            </div>
          </div>

          {/* Price + CTA */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <p style={{ color: '#ffd700', fontSize: '26px', fontWeight: '700', margin: '0 0 4px 0', fontFamily: "'Playfair Display', Georgia, serif", letterSpacing: '-0.02em' }}>$29 — Yours forever</p>
            <p style={{ color: 'rgba(244,228,212,0.4)', fontSize: '12px', margin: 0, ...bodyFont }}>One-time · No subscription · 30-day money-back guarantee</p>
          </div>

          <button
            className="cw-upgrade-btn"
            onClick={() => {
              window.gtag?.('event', 'calculator_upgrade_click', {
                'event_category': 'calculator',
                'event_label': 'upgrade_clicked',
                'diet_type': data.diet
              })
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
            Get My 30-Day Plan — $29
          </button>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: '8px' }}>
            <span style={{ fontSize: '15px', flexShrink: 0, marginTop: '1px' }}>🛡️</span>
            <p style={{ color: 'rgba(244,228,212,0.5)', fontSize: '12.5px', margin: 0, lineHeight: '1.55', ...bodyFont }}>
              30 days to try it. If it doesn't feel useful, email us for a same-day refund.
            </p>
          </div>
        </div>
      </div>

      {/* Start Over */}
      <button
        onClick={() => {
          const confirmed = window.confirm("Are you sure? This will clear your calculations and reset the form to Step 1.")
          if (confirmed) {
            window.gtag?.('event', 'calculator_start_over_click', {
              'event_category': 'calculator',
              'event_label': 'start_over_clicked'
            })
            resetForm()
          }
        }}
        style={{
          background: 'none', border: 'none', color: '#737373', fontSize: '14px',
          textDecoration: 'underline', cursor: 'pointer', padding: '8px', marginTop: '16px',
          fontFamily: "'Playfair Display', Georgia, serif"
        }}
      >
        Start Over
      </button>
    </div>
  )
}
