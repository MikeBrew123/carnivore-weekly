import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import PricingCard from './PricingCard'
import StripePaymentModal from './StripePaymentModal'
import { useFormStore } from '../../stores/formStore'

interface PricingModalProps {
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

export default function PricingModal({ onClose, onProceed }: PricingModalProps) {
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
    setSelectedTier(tierId)
  }

  const handlePaymentSuccess = () => {
    if (!selectedTier) return

    // Proceed to next step (no DB calls - data stays in React state)
    setSelectedTier(null)
    onProceed(selectedTier)
  }

  const handlePaymentCancel = () => {
    setSelectedTier(null)
  }

  const selectedOption = getSelectedOption()

  return (
    <>
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
            background: 'linear-gradient(to right, #ffd700, rgba(255, 215, 0, 0.9))',
            color: '#1a120b',
            padding: '32px',
            borderBottom: '2px solid #333',
            pointerEvents: 'none',
          }}>
            <button
              onClick={onClose}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                fontSize: '24px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                pointerEvents: 'auto',
              }}
            >
              ✕
            </button>
            <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px', fontFamily: "'Playfair Display', Georgia, serif" }}>Choose Your Plan</h2>
            <p style={{ color: 'rgba(26, 18, 11, 0.8)', fontFamily: "'Merriweather', Georgia, serif" }}>Select the features that matter most to you</p>
          </div>

          {/* New Years Sale Banner */}
          <div style={{
            backgroundColor: '#dc2626',
            color: 'white',
            padding: '16px',
            textAlign: 'center',
            borderBottom: '2px solid #991b1b',
          }}>
            <p style={{ fontSize: '18px', fontWeight: 'bold' }}>🎉 NEW YEARS SALE 🎉</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>Complete Bundle was <span style={{ textDecoration: 'line-through' }}>$298</span> → NOW $9.99</p>
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
            <div
              className="bg-gradient-to-r from-secondary/10 to-primary/10 rounded-lg p-6 border border-secondary/30"
            >
              <h3 className="font-bold text-dark mb-4">What You Get</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="font-semibold text-dark mb-2">📋 Every Plan Includes</p>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>✓ Personalized macro calculations</li>
                    <li>✓ Your calorie targets</li>
                    <li>✓ Instant results</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-dark mb-2">💰 Value Breakdown</p>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>Complete bundle: $298 value</li>
                    <li>Your price: $9.99</li>
                    <li>Save: 96.6%</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-dark mb-2">🔒 100% Money Back</p>
                  <p className="text-sm text-gray-600">Not satisfied? Full refund within 7 days, no questions asked.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stripe Payment Modal */}
      <AnimatePresence>
        {selectedTier && selectedOption && (
          <StripePaymentModal
            tierId={selectedTier}
            tierTitle={selectedOption.title}
            tierPrice={selectedOption.price}
            onSuccess={handlePaymentSuccess}
            onCancel={handlePaymentCancel}
          />
        )}
      </AnimatePresence>
    </>
  )
}
