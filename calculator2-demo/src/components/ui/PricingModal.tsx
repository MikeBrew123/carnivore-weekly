import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import PricingCard from './PricingCard'
import StripePaymentModal from './StripePaymentModal'
import { useFormStore } from '../../stores/formStore'
import { supabase } from '../../lib/supabase'

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

  const handlePaymentSuccess = async () => {
    if (!selectedTier) return

    // Update session with selected tier
    await supabase
      .from('user_sessions')
      .update({ pricing_tier: selectedTier })
      .eq('session_token', sessionToken)

    // Proceed to next step
    setSelectedTier(null)
    onProceed(selectedTier)
  }

  const handlePaymentCancel = () => {
    setSelectedTier(null)
  }

  const selectedOption = getSelectedOption()

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-[150] p-4"
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 z-20 bg-gradient-to-r from-primary to-primary/90 text-accent p-8 border-b-2 border-secondary pointer-events-none">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-2xl hover:opacity-80 pointer-events-auto"
            >
              ✕
            </button>
            <h2 className="text-3xl font-display font-bold mb-2">Choose Your Plan</h2>
            <p className="text-accent/80">Select the features that matter most to you</p>
          </div>

          {/* New Years Sale Banner */}
          <div className="bg-red-600 text-white p-4 text-center border-b-2 border-red-700">
            <p className="text-lg font-bold">🎉 NEW YEARS SALE 🎉</p>
            <p className="text-sm mt-1">Complete Bundle was <span className="line-through">$298</span> → NOW $9.99</p>
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
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
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
            </motion.div>
          </div>
        </motion.div>
      </motion.div>

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
