import { FormData, MacroResults } from '../../../types/form'
import { calculateBMR, calculateMacros } from '../../../lib/calculations'
import MacroPreview from '../../ui/MacroPreview'

interface Step3FreeResultsProps {
  data: FormData
  macros: MacroResults | null
  onUpgrade: () => void
  onBack: () => void
}

export default function Step3FreeResults({
  data,
  macros,
  onUpgrade,
  onBack,
}: Step3FreeResultsProps) {
  if (!macros) {
    return (
      <div className="space-y-6">
        <p className="text-gray-600">Loading your results...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Results Header */}
      <div>
        <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '32px', fontWeight: '700', color: '#ffd700', marginBottom: '8px' }}>Your Personalized Carnivore Macros</h2>
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
          <span style={{ fontWeight: '600', color: '#f5f5f5', marginLeft: '12px', fontFamily: "'Merriweather', Georgia, serif" }}>{data.lifestyle}</span>
        </div>
        <div style={{ fontSize: '14px' }}>
          <span style={{ color: '#a0a0a0', fontFamily: "'Merriweather', Georgia, serif" }}>Goal:</span>
          <span style={{ fontWeight: '600', color: '#f5f5f5', marginLeft: '12px', fontFamily: "'Merriweather', Georgia, serif" }}>{data.goal}</span>
        </div>
      </div>

      {/* Macro Preview - Show Value First */}
      <MacroPreview macros={macros} />

      {/* What This Looks Like - Dark Card */}
      <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '24px' }}>
        <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '18px', fontWeight: '600', color: '#ffd700', marginBottom: '12px' }}>What This Looks Like in Food</h3>
        <p style={{ fontSize: '14px', color: '#f5f5f5', marginBottom: '12px', fontFamily: "'Merriweather', Georgia, serif" }}>
          To hit your {macros.calories} calorie target, aim for approximately:
        </p>
        <ul style={{ fontSize: '14px', color: '#f5f5f5', fontFamily: "'Merriweather', Georgia, serif", marginLeft: '20px' }}>
          <li style={{ marginBottom: '8px' }}><strong>{(macros.calories / 1500).toFixed(1)} lbs of ground beef</strong> (80/20 blend, ~1,500 cal/lb)</li>
          <li style={{ marginBottom: '8px' }}><strong>OR {(macros.calories / 1200).toFixed(1)} lbs of ribeye steak</strong> (~1,200 cal/lb)</li>
          <li><strong>OR {(macros.calories / 700).toFixed(1)} lbs of organs</strong> (liver, kidney) (~700 cal/lb)</li>
        </ul>
      </div>

      {/* Upgrade CTA */}
      <div className="pt-6 flex flex-col gap-3">
        <button
          onClick={onUpgrade}
          style={{
            backgroundColor: '#ffd700',
            color: '#1a120b',
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '18px',
            fontWeight: '600',
            padding: '16px 24px',
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
          Upgrade for Full Personalized Protocol
        </button>
        <p style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>
          Unlock personalized guidance, meal plans, and detailed recommendations
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
