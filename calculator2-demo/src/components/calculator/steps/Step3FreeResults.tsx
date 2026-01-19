import { useEffect } from 'react'
import { FormData, MacroResults } from '../../../types/form'
import { calculateBMR, calculateMacros } from '../../../lib/calculations'
import MacroPreview from '../../ui/MacroPreview'

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

// Diet-specific configurations
const dietConfig: Record<string, {
  label: string
  foodExamples: { name: string; calPerLb: number; note?: string }[]
  troubleshooting: string
  socialProof: string
}> = {
  'carnivore': {
    label: 'Carnivore',
    foodExamples: [
      { name: 'ground beef', calPerLb: 1500, note: '80/20 blend' },
      { name: 'ribeye steak', calPerLb: 1200 },
      { name: 'beef liver + butter', calPerLb: 700, note: 'nutrient-dense organs' }
    ],
    troubleshooting: 'Fixes for night sweats and digestive stalls',
    socialProof: 'carnivores'
  },
  'keto': {
    label: 'Keto',
    foodExamples: [
      { name: 'ribeye steak', calPerLb: 1200 },
      { name: 'bacon + eggs', calPerLb: 1400, note: '4 strips + 3 eggs' },
      { name: 'avocado + salmon', calPerLb: 900, note: 'healthy fats combo' }
    ],
    troubleshooting: 'Strategies for keto flu and electrolyte balance',
    socialProof: 'keto dieters'
  },
  'lowcarb': {
    label: 'Low Carb',
    foodExamples: [
      { name: 'chicken thighs', calPerLb: 1100, note: 'skin-on' },
      { name: 'pork shoulder', calPerLb: 1300 },
      { name: 'beef + vegetables', calPerLb: 800, note: 'steak with greens' }
    ],
    troubleshooting: 'Managing carb cravings and energy dips',
    socialProof: 'low-carb followers'
  },
  'pescatarian': {
    label: 'Pescatarian',
    foodExamples: [
      { name: 'salmon', calPerLb: 1000, note: 'fatty wild-caught' },
      { name: 'mackerel', calPerLb: 800 },
      { name: 'cod + butter', calPerLb: 500, note: 'leaner fish with added fat' }
    ],
    troubleshooting: 'Optimizing Omega-3 ratios and mercury safety',
    socialProof: 'pescatarians'
  }
}

// Default to carnivore if diet not found
const getDietConfig = (diet: string) => dietConfig[diet] || dietConfig['carnivore']

export default function Step3FreeResults({
  data,
  macros,
  onUpgrade,
  onBack,
}: Step3FreeResultsProps) {
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
        <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '32px', fontWeight: '700', color: '#ffd700', marginBottom: '8px' }}>Your Personalized {config.label} Macros</h2>
        <p style={{ fontFamily: "'Merriweather', Georgia, serif", fontSize: '16px', color: '#a0a0a0' }}>Based on your profile and goals</p>
      </div>

      {/* Profile Summary - Dark Card Styling */}
      <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
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

      {/* What This Looks Like - Dark Card (Diet-Aware) */}
      <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '24px' }}>
        <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '18px', fontWeight: '600', color: '#ffd700', marginBottom: '12px' }}>What This Looks Like in Food</h3>
        <p style={{ fontSize: '14px', color: '#f5f5f5', marginBottom: '12px', fontFamily: "'Merriweather', Georgia, serif" }}>
          To hit your {macros.calories} calorie target, aim for approximately:
        </p>
        <ul style={{ fontSize: '14px', color: '#f5f5f5', fontFamily: "'Merriweather', Georgia, serif", marginLeft: '20px' }}>
          {config.foodExamples.map((food, idx) => (
            <li key={food.name} style={{ marginBottom: idx < config.foodExamples.length - 1 ? '8px' : 0 }}>
              <strong style={{ color: '#d4a574' }}>
                {idx > 0 ? 'OR ' : ''}{(macros.calories / food.calPerLb).toFixed(1)} lbs of {food.name}
              </strong>
              {food.note && ` (${food.note}, ~${food.calPerLb.toLocaleString()} cal/lb)`}
              {!food.note && ` (~${food.calPerLb.toLocaleString()} cal/lb)`}
            </li>
          ))}
        </ul>
      </div>

      {/* Free vs Premium Comparison */}
      <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '24px' }}>
        <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '18px', fontWeight: '600', color: '#ffd700', marginBottom: '16px' }}>What You Get</h3>

        {/* Free tier */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ color: '#22c55e', fontSize: '16px' }}>✓</span>
            <span style={{ color: '#f5f5f5', fontFamily: "'Merriweather', Georgia, serif", fontSize: '14px' }}>Your personalized macros (protein, fat, calories)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#22c55e', fontSize: '16px' }}>✓</span>
            <span style={{ color: '#f5f5f5', fontFamily: "'Merriweather', Georgia, serif", fontSize: '14px' }}>Food examples to hit your targets</span>
          </div>
        </div>

        {/* Premium tier */}
        <div style={{ borderTop: '1px solid #333', paddingTop: '16px' }}>
          <p style={{ color: '#ffd700', fontFamily: "'Playfair Display', Georgia, serif", fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Upgrade for $9.99:</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ color: '#ffd700', fontSize: '14px' }}>★</span>
            <span style={{ color: '#a0a0a0', fontFamily: "'Merriweather', Georgia, serif", fontSize: '14px' }}>30-day personalized {config.label.toLowerCase()} meal plan</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ color: '#ffd700', fontSize: '14px' }}>★</span>
            <span style={{ color: '#a0a0a0', fontFamily: "'Merriweather', Georgia, serif", fontSize: '14px' }}>{config.troubleshooting}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ color: '#ffd700', fontSize: '14px' }}>★</span>
            <span style={{ color: '#a0a0a0', fontFamily: "'Merriweather', Georgia, serif", fontSize: '14px' }}>Doctor conversation script</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#ffd700', fontSize: '14px' }}>★</span>
            <span style={{ color: '#a0a0a0', fontFamily: "'Merriweather', Georgia, serif", fontSize: '14px' }}>Shopping lists & simple recipes</span>
          </div>
        </div>
      </div>

      {/* Upgrade CTA */}
      <div style={{ paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
        {/* Social proof */}
        <p style={{ fontSize: '13px', color: '#a0a0a0', fontFamily: "'Merriweather', Georgia, serif", textAlign: 'center', marginBottom: '8px' }}>
          Trusted by 500+ {config.socialProof} to dial in their nutrition
        </p>
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
            backgroundColor: '#ffd700',
            color: '#1a120b',
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '18px',
            fontWeight: '600',
            padding: '16px 48px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
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
          Get Your 30+ Page {config.label} Protocol
        </button>
        <p style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>
          Unlock your personalized {config.label.toLowerCase()} meal plan, troubleshooting guide, and detailed report
        </p>
      </div>

      {/* Back Button */}
      <button
        onClick={onBack}
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
        Back
      </button>
    </div>
  )
}
