import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import StripePaymentModal from './StripePaymentModal'
import Portal from './Portal'
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

const bundleOption = {
  id: 'bundle',
  title: 'Your 30-Day Meal Plan',
  price: '$14.99',
  originalPrice: '$29',
  description: 'Summer Sale',
  features: [
    '30-day meal plan matched to your macros',
    'Weekly grocery lists (take them to the store)',
    'Simple meals that take less than 15 minutes',
    'Week-by-week guide for your first month',
    'What to tell your doctor about your diet',
    'Electrolyte & supplement guidance',
    'Stall-breaker troubleshooting protocol',
  ],
}

export default function PricingModal({ email, onEmailChange, formData, onClose, onProceed }: PricingModalProps) {
  console.log('[PricingModal] Component rendering')
  const { sessionToken } = useFormStore()
  const [selectedTier, setSelectedTier] = useState<string | null>(null)

  const pricingStyles = `
    .pricing-hero-card {
      max-width: 480px;
      width: 100%;
      margin: 0 auto;
    }

    @media (max-width: 768px) {
      .pricing-hero-card {
        max-width: 100% !important;
      }
    }
  `

  const stripePriceIds: Record<string, string> = {
    bundle: 'price_1ThzEIEVDfkpGz8wgEUuuXnQ',     // $14.99 USD - Summer Sale
  }

  const getSelectedOption = () => {
    if (selectedTier === 'bundle') return bundleOption
    return undefined
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
    <Portal>
      <style>{pricingStyles}</style>
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
          zIndex: 9999,
          padding: '16px',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: '#1a1a1a',
            borderRadius: '16px',
            maxWidth: '640px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div style={{
            position: 'sticky',
            top: 0,
            zIndex: 20,
            backgroundColor: '#1a1a1a',
            padding: '32px 32px 24px',
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
            <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px', fontFamily: "'Playfair Display', Georgia, serif", color: '#ffd700', textAlign: 'center' }}>Your 30-Day Meal Plan</h2>
            <p style={{ color: '#a0a0a0', fontFamily: "'Merriweather', Georgia, serif", textAlign: 'center' }}>Built from your calculator results</p>
          </div>

          {/* Limited Launch Pricing Banner */}
          <div style={{
            backgroundColor: '#2c1810',
            color: '#ffd700',
            padding: '16px',
            textAlign: 'center',
            borderBottom: '2px solid #ffd700',
          }}>
            <p style={{ fontSize: '16px', fontWeight: '600', fontFamily: "'Playfair Display', Georgia, serif" }}>Summer Sale</p>
            <p style={{ fontSize: '13px', marginTop: '6px', color: '#a0a0a0', fontFamily: "'Merriweather', Georgia, serif" }}>Your 30-Day Meal Plan: <span style={{ textDecoration: 'line-through', opacity: 0.5 }}>$29</span> <span style={{ color: '#ffd700', fontWeight: 'bold' }}>$14.99</span></p>
          </div>

          {/* Single Product Card */}
          <div style={{
            padding: '32px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            <div
              className="pricing-hero-card"
              style={{
                backgroundColor: '#2c1810',
                borderRadius: '16px',
                padding: '40px 32px',
                border: '2px solid #ffd700',
                boxShadow: '0 10px 40px rgba(255, 215, 0, 0.15)',
                textAlign: 'center',
              }}
            >
              <h3 style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#ffd700',
                fontFamily: "'Playfair Display', Georgia, serif",
                marginBottom: '8px',
              }}>Your 30-Day Meal Plan</h3>

              <p style={{
                color: '#a0a0a0',
                fontFamily: "'Merriweather', Georgia, serif",
                fontSize: '14px',
                marginBottom: '24px',
              }}>Exactly what to eat, when to shop, what to expect</p>

              {/* Price */}
              <div style={{ marginBottom: '32px' }}>
                <span style={{
                  fontSize: '28px',
                  fontWeight: 'bold',
                  color: '#a0a0a0',
                  fontFamily: "'Playfair Display', Georgia, serif",
                  lineHeight: 1,
                  textDecoration: 'line-through',
                  opacity: 0.5,
                }}>$29</span>
                <span style={{
                  fontSize: '56px',
                  fontWeight: 'bold',
                  color: '#ffd700',
                  fontFamily: "'Playfair Display', Georgia, serif",
                  lineHeight: 1,
                  marginLeft: '12px',
                }}>$14.99</span>
                <span style={{
                  fontSize: '16px',
                  color: '#a0a0a0',
                  fontFamily: "'Merriweather', Georgia, serif",
                  marginLeft: '8px',
                }}>one-time</span>
              </div>

              {/* Features */}
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: '0 0 32px 0',
                textAlign: 'left',
              }}>
                {bundleOption.features.map((feature, i) => (
                  <li key={i} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    marginBottom: '12px',
                    fontSize: '15px',
                    color: '#f5f5f5',
                    fontFamily: "'Merriweather', Georgia, serif",
                  }}>
                    <span style={{ color: '#ffd700', fontWeight: 'bold', flexShrink: 0 }}>✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => handleSelectTier('bundle')}
                style={{
                  width: '100%',
                  padding: '16px 32px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  backgroundColor: '#ffd700',
                  color: '#1a120b',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontFamily: "'Playfair Display', Georgia, serif",
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e6c200'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 215, 0, 0.4)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffd700'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 215, 0, 0.3)'
                }}
              >
                Get My 30-Day Plan →
              </button>
            </div>

            {/* Value Stack */}
            <div style={{
              backgroundColor: '#2c1810',
              borderRadius: '12px',
              padding: '32px',
              border: '2px solid #ffd700',
              maxWidth: '480px',
              width: '100%',
              marginTop: '24px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
            }}>
              <h3 style={{
                fontWeight: 'bold',
                color: '#ffd700',
                marginBottom: '24px',
                fontSize: '22px',
                fontFamily: "'Playfair Display', Georgia, serif",
                textAlign: 'center',
              }}>What You Get</h3>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
              }}>
                <div>
                  <p style={{
                    fontWeight: '600',
                    color: '#ffd700',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontFamily: "'Playfair Display', Georgia, serif",
                  }}>📋 Included In Your Protocol</p>
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
                    <li style={{ marginBottom: '4px' }}>Regular price: <span style={{ textDecoration: 'line-through', opacity: 0.5 }}>$29</span></li>
                    <li style={{ marginBottom: '4px' }}>Summer Sale: <span style={{ color: '#ffd700', fontWeight: 'bold' }}>$14.99</span></li>
                    <li>Save: <span style={{ color: '#ffd700', fontWeight: 'bold' }}>48%</span></li>
                  </ul>
                </div>
                <div>
                  <p style={{
                    fontWeight: '600',
                    color: '#ffd700',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontFamily: "'Playfair Display', Georgia, serif",
                  }}>🔒 30-Day Money-Back Guarantee</p>
                  <p style={{
                    fontSize: '14px',
                    color: '#f5f5f5',
                    fontFamily: "'Merriweather', Georgia, serif",
                  }}>Not satisfied? Full refund within 30 days, no questions asked.</p>
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
    </Portal>
  )
}
