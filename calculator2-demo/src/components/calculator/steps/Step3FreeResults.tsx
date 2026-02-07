import { useEffect } from 'react'
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

  // Track free results view
  useEffect(() => {
    if (window.gtag) {
      window.gtag('event', 'calculator_free_results', {
        'event_category': 'calculator',
        'event_label': 'free_results_viewed'
      })
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

        {/* Meal 2 */}
        <div style={{ paddingLeft: '16px', borderLeft: '3px solid #d4a574' }}>
          <p style={{ fontSize: '13px', color: '#d4a574', fontWeight: '600', marginBottom: '4px', fontFamily: "'Playfair Display', Georgia, serif" }}>MEAL 2</p>
          <p style={{ fontSize: '15px', color: '#f5f5f5', fontFamily: "'Merriweather', Georgia, serif" }}>
            <strong style={{ color: '#ffd700' }}>{getMeal2Amount(macros.calories, config.meal1.calories, config.meal2.calPerLb)} lbs</strong> of {config.meal2.protein}
          </p>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '4px', fontFamily: "'Merriweather', Georgia, serif" }}>
            ~{macros.calories - config.meal1.calories} calories to reach your target
          </p>
        </div>
      </div>

      {/* Consolidated Premium Upgrade Card */}
      <div style={{ backgroundColor: '#1a1a1a', border: '2px solid #ffd700', borderRadius: '12px', padding: '28px' }}>
        <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '20px', fontWeight: '700', color: '#ffd700', marginBottom: '8px', textAlign: 'center' }}>
          Get Your Full 30+ Page {config.label} Protocol
        </h3>
        <p style={{ fontSize: '14px', color: '#a0a0a0', textAlign: 'center', marginBottom: '20px', fontFamily: "'Merriweather', Georgia, serif" }}>
          $60 Value for just <span style={{ color: '#ffd700', fontWeight: '600' }}>$9.99</span>
        </p>

        {/* Value Stack */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
            <span style={{ color: '#ffd700', fontSize: '16px', marginTop: '2px' }}>★</span>
            <span style={{ color: '#f5f5f5', fontFamily: "'Merriweather', Georgia, serif", fontSize: '14px' }}>
              Your complete metabolic roadmap — know exactly what to eat, when, and why
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
            <span style={{ color: '#ffd700', fontSize: '16px', marginTop: '2px' }}>★</span>
            <span style={{ color: '#f5f5f5', fontFamily: "'Merriweather', Georgia, serif", fontSize: '14px' }}>
              30 days of meals planned for you — zero guesswork, zero decision fatigue
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
            <span style={{ color: '#ffd700', fontSize: '16px', marginTop: '2px' }}>★</span>
            <span style={{ color: '#f5f5f5', fontFamily: "'Merriweather', Georgia, serif", fontSize: '14px' }}>
              Walk into your doctor's office prepared — a script so they take you seriously
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
            <span style={{ color: '#ffd700', fontSize: '16px', marginTop: '2px' }}>★</span>
            <span style={{ color: '#f5f5f5', fontFamily: "'Merriweather', Georgia, serif", fontSize: '14px' }}>
              Stop waking up drenched at 3am — the exact fix for every adaptation symptom ({config.troubleshooting})
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <span style={{ color: '#ffd700', fontSize: '16px', marginTop: '2px' }}>★</span>
            <span style={{ color: '#f5f5f5', fontFamily: "'Merriweather', Georgia, serif", fontSize: '14px' }}>
              Hit a plateau? The step-by-step protocol to break through and keep losing
            </span>
          </div>
        </div>

        {/* Social proof */}
        <p style={{ fontSize: '13px', color: '#a0a0a0', fontFamily: "'Merriweather', Georgia, serif", textAlign: 'center', marginBottom: '16px' }}>
          Trusted by 500+ {config.socialProof} to dial in their nutrition
        </p>

        {/* CTA Button */}
        <button
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
            backgroundColor: '#ffd700',
            color: '#1a120b',
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '18px',
            fontWeight: '600',
            padding: '16px 32px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '12px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#e6c200';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ffd700';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          Get My Protocol — $9.99
        </button>

        {/* Pricing anchor */}
        <p style={{ fontSize: '12px', color: '#666', textAlign: 'center', fontFamily: "'Merriweather', Georgia, serif" }}>
          Nutritionists charge $150+/hr for this level of personalization. You're getting it for $9.99.
        </p>
      </div>

      {/* Start Over Button */}
      <button
        onClick={() => {
          const confirmed = window.confirm(
            "Are you sure? This will clear your calculations and reset the form to Step 1."
          )
          if (confirmed) {
            resetForm()
          }
        }}
        style={{
          width: '100%',
          backgroundColor: 'transparent',
          border: '2px solid #ffd700',
          color: '#ffd700',
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: '16px',
          fontWeight: '600',
          padding: '12px 24px',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 215, 0, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        Start Over
      </button>
    </div>
  )
}
