import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import PricingCard from './PricingCard'
import StripePaymentModal from './StripePaymentModal'
import { useFormStore } from '../../stores/formStore'

interface FormData {
  age?: number
  sex?: string
  weight?: number
  heightFeet?: number
  heightInches?: number
  heightCm?: number
  lifestyle?: string
  exercise?: string
  goal?: string
  diet?: string
  [key: string]: any
}

interface PricingModalProps {
  email: string
  onEmailChange: (email: string) => void
  formData: FormData
  onClose: () => void
  onProceed: (tier: string) => void
}

const pricingOptions = [
  {
    id: 'shopping',
    title: 'Shopping Lists',
    price: '$19',
    description: 'Grocery focused',
    features: [
      '4-week organized grocery lists',
      'Budget-aware shopping options',
      'Macro tracking by store',
      'Category organization',
      'Weekly item breakdowns',
    ],
  },
  {
    id: 'meal_plan',
    title: '30-Day Meal Plan',
    price: '$27',
    description: 'Just meals',
    features: [
      '30-day meal plan with variety',
      'Daily recipe suggestions',
      'Ingredient macros per meal',
      'Prep time estimates',
      'Substitution options',
    ],
  },
  {
    id: 'doctor',
    title: 'Doctor Script',
    price: '$47',
    description: 'Talk to your MD',
    features: [
      'Medication review framework',
      'Lab work discussion talking points',
      'Safety protocols & guidelines',
      'Doctor conversation scripts',
      'Follow-up questions guide',
    ],
  },
  {
    id: 'bundle',
    title: 'Complete Protocol Bundle',
    price: '$9.99',
    popular: true,
    description: 'Everything included',
    features: [
      '13-section personalized protocol',
      '30-day meal plan with recipes',
      'Weekly shopping lists',
      'Doctor consultation guide',
      'Macro & electrolyte calculations',
      'AI-customized obstacle protocol',
      'Adaptation timeline',
    ],
  },
]

export default function PricingModal({ email, onEmailChange, formData, onClose, onProceed }: PricingModalProps) {
  console.log('[PricingModal] Component rendering')
  const { sessionToken } = useFormStore()
  const [selectedTier, setSelectedTier] = useState<string | null>(null)

  const stripePriceIds: Record<string, string> = {
    bundle: 'price_1QgE8QFjwYzqK4YJ9sZcV2xt',
    meal_plan: 'price_1QgE8hFjwYzqK4YJ9sZcXyEn',
    shopping: 'price_1QgE9EFjwYzqK4YJ9sZcYZxJ',
    doctor: 'price_1QgE9aFjwYzqK4YJ9sZcZAKm',
  }

  const getSelectedOption = () => {
    return pricingOptions.find((opt) => opt.id === selectedTier)
  }

  const handleSelectTier = (tierId: string) => {
    console.log('[PricingModal] handleSelectTier called with:', tierId)
    setSelectedTier(tierId)
  }

  const handlePaymentSuccess = () => {
    if (!selectedTier) return

    // Proceed to next step (no DB calls - data stays in React state)
    setSelectedTier(null)
    onProceed(selectedTier)
  }

  const handlePaymentCancel = () => {
    console.log('[PricingModal] Payment cancelled')
    setSelectedTier(null)
  }

  const selectedOption = getSelectedOption()

  return (
    <>
      {!selectedTier && (
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 150,
          padding: '16px',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            maxWidth: '1200px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}
        >
          {/* Header */}
          <div style={{
            position: 'sticky',
            top: 0,
            zIndex: 20,
            backgroundColor: '#1a1a1a',
            padding: '32px',
            borderBottom: '2px solid #ffd700',
            pointerEvents: 'none',
          }}>
            <button
              onClick={onClose}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                fontSize: '24px',
                color: '#ffd700',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                pointerEvents: 'auto',
              }}
            >
              ✕
            </button>
            <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px', fontFamily: "'Playfair Display', Georgia, serif", color: '#ffd700' }}>Choose Your Plan</h2>
            <p style={{ color: '#a0a0a0', fontFamily: "'Merriweather', Georgia, serif" }}>Select the features that matter most to you</p>
          </div>

          {/* Limited Launch Pricing Banner */}
          <div style={{
            backgroundColor: '#2c1810',
            color: '#ffd700',
            padding: '16px',
            textAlign: 'center',
            borderBottom: '2px solid #ffd700',
          }}>
            <p style={{ fontSize: '16px', fontWeight: '600', fontFamily: "'Playfair Display', Georgia, serif" }}>Limited Launch Pricing</p>
            <p style={{ fontSize: '13px', marginTop: '6px', color: '#a0a0a0', fontFamily: "'Merriweather', Georgia, serif" }}>Complete Protocol Bundle: <span style={{ color: '#ffd700', fontWeight: 'bold' }}>$9.99</span></p>
          </div>

          {/* Pricing Cards */}
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {pricingOptions.map((option) => (
                <div
                  key={option.id}
                  className={option.id === 'bundle' ? 'lg:col-span-1 relative' : ''}
                >
                  {option.id === 'bundle' && (
                    <div className="absolute -inset-2 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 rounded-xl blur opacity-60 -z-10 pointer-events-none"></div>
                  )}
                  <PricingCard
                    title={option.title}
                    price={option.price}
                    description={option.description}
                    features={option.features}
                    popular={option.popular}
                    onClick={() => handleSelectTier(option.id)}
                  />
                </div>
              ))}
            </div>

            {/* Value Stack */}
            <div style={{
              backgroundColor: '#2c1810',
              borderRadius: '8px',
              padding: '24px',
              border: '2px solid #ffd700',
            }}>
              <h3 style={{
                fontWeight: 'bold',
                color: '#ffd700',
                marginBottom: '16px',
                fontSize: '18px',
                fontFamily: "'Playfair Display', Georgia, serif",
              }}>What You Get</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '24px',
              }}>
                <div>
                  <p style={{
                    fontWeight: '600',
                    color: '#ffd700',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontFamily: "'Playfair Display', Georgia, serif",
                  }}>📋 Every Plan Includes</p>
                  <ul style={{
                    fontSize: '14px',
                    listStyle: 'none',
                    padding: 0,
                    color: '#f5f5f5',
                    fontFamily: "'Merriweather', Georgia, serif",
                  }}>
                    <li style={{ marginBottom: '4px' }}>✓ Personalized macro calculations</li>
                    <li style={{ marginBottom: '4px' }}>✓ Your calorie targets</li>
                    <li>✓ Instant results</li>
                  </ul>
                </div>
                <div>
                  <p style={{
                    fontWeight: '600',
                    color: '#ffd700',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontFamily: "'Playfair Display', Georgia, serif",
                  }}>💰 Value Breakdown</p>
                  <ul style={{
                    fontSize: '14px',
                    listStyle: 'none',
                    padding: 0,
                    color: '#f5f5f5',
                    fontFamily: "'Merriweather', Georgia, serif",
                  }}>
                    <li style={{ marginBottom: '4px' }}>Complete bundle: $298 value</li>
                    <li style={{ marginBottom: '4px' }}>Your price: <span style={{ color: '#ffd700', fontWeight: 'bold' }}>$9.99</span></li>
                    <li>Save: <span style={{ color: '#ffd700', fontWeight: 'bold' }}>96.6%</span></li>
                  </ul>
                </div>
                <div>
                  <p style={{
                    fontWeight: '600',
                    color: '#ffd700',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontFamily: "'Playfair Display', Georgia, serif",
                  }}>🔒 100% Money Back</p>
                  <p style={{
                    fontSize: '14px',
                    color: '#f5f5f5',
                    fontFamily: "'Merriweather', Georgia, serif",
                  }}>Not satisfied? Full refund within 7 days, no questions asked.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Stripe Payment Modal */}
      <AnimatePresence>
        {selectedTier && selectedOption && (
          <StripePaymentModal
            tierId={selectedTier}
            tierTitle={selectedOption.title}
            tierPrice={selectedOption.price}
            email={email}
            onEmailChange={onEmailChange}
            formData={formData}
            onSuccess={handlePaymentSuccess}
            onCancel={handlePaymentCancel}
          />
        )}
      </AnimatePresence>
    </>
  )
}
