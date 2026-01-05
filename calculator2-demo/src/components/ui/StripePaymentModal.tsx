import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
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

interface StripePaymentModalProps {
  tierId: string
  tierTitle: string
  tierPrice: string
  email: string
  onEmailChange: (email: string) => void
  formData: FormData
  onSuccess: () => void
  onCancel: () => void
}

export default function StripePaymentModal({
  tierId,
  tierTitle,
  tierPrice,
  email,
  onEmailChange,
  formData,
  onSuccess,
  onCancel,
}: StripePaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [discountApplied, setDiscountApplied] = useState<{ code: string; percent: number } | null>(null)
  const [couponError, setCouponError] = useState('')
  const { sessionToken } = useFormStore()

  useEffect(() => {
    console.log('[StripePaymentModal] Mounted for tier:', tierId, tierTitle)
  }, [])

  const priceMap: Record<string, number> = {
    bundle: 999,
    meal_plan: 2700,
    shopping: 1900,
    doctor: 1500,
  }

  const getDiscountedPrice = () => {
    if (!discountApplied) return priceMap[tierId] || 999
    const originalPrice = priceMap[tierId] || 999
    return Math.round(originalPrice * (1 - discountApplied.percent / 100))
  }

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Enter a coupon code')
      return
    }

    setCouponError('')
    try {
      const response = await fetch('https://carnivore-report-api-production.iambrew.workers.dev/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.toUpperCase() })
      })

      if (!response.ok) {
        const errorData = await response.json()
        setCouponError(errorData.message || 'Invalid coupon code')
        setDiscountApplied(null)
        return
      }

      const data = await response.json()
      setDiscountApplied({ code: couponCode.toUpperCase(), percent: data.percent })
      setCouponError('')
    } catch (err) {
      setCouponError('Failed to validate coupon. Try again.')
      setDiscountApplied(null)
    }
  }

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate email before payment
    if (!email || !email.trim()) {
      setError('Email is required')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    setIsProcessing(true)

    try {
      const finalPrice = getDiscountedPrice()
      console.log('[StripePaymentModal] Initiating payment for:', tierId, 'Price:', finalPrice, 'Coupon:', discountApplied?.code, 'Email:', email)

      const response = await fetch('https://carnivore-report-api-production.iambrew.workers.dev/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          first_name: '',
          form_data: formData,
          tier_id: tierId,
          tier_title: tierTitle,
          amount: finalPrice,
          original_amount: priceMap[tierId] || 999,
          coupon_code: discountApplied?.code || null,
          discount_percent: discountApplied?.percent || 0,
          session_token: sessionToken,
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to create checkout: ${response.status}`)
      }

      const data = await response.json()

      // If amount is 0 (100% discount), skip Stripe and go directly to success
      if (finalPrice === 0 || data.amount === 0) {
        console.log('[StripePaymentModal] 100% discount - bypassing Stripe, redirecting to success page')
        const sessionUuid = data.session_uuid || data.session_id || 'free'
        window.location.href = `/?payment=free&assessment_id=${sessionUuid}`
        return
      }

      // Otherwise, redirect to Stripe checkout
      if (data.url) {
        console.log('[StripePaymentModal] Redirecting to Stripe:', data.url)
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (err) {
      console.error('[StripePaymentModal] Payment error:', err)
      setError(err instanceof Error ? err.message : 'Payment failed')
      setIsProcessing(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 51,
        padding: '16px',
        overflow: 'hidden',
      }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '448px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(to right, #ffd700, rgba(255, 215, 0, 0.9))',
          color: '#1a120b',
          padding: '24px',
          position: 'relative',
        }}>
          <button
            onClick={onCancel}
            disabled={isProcessing}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              fontSize: '24px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              opacity: isProcessing ? 0.5 : 1,
            }}
          >
            ✕
          </button>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '4px',
            fontFamily: "'Playfair Display', Georgia, serif",
          }}>Complete Payment</h2>
          <p style={{
            opacity: 0.8,
            fontSize: '14px',
            fontFamily: "'Merriweather', Georgia, serif",
          }}>Secure payment via Stripe</p>
        </div>

        {/* Content */}
        <div style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}>
          {/* Order Summary */}
          <div style={{
            backgroundColor: '#f3f4f6',
            borderRadius: '8px',
            padding: '16px',
            border: '1px solid #e5e7eb',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '8px',
            }}>
              <div>
                <p style={{
                  fontWeight: '600',
                  color: '#1a120b',
                  fontSize: '14px',
                }}>{tierTitle}</p>
                <p style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  marginTop: '4px',
                }}>Plan ID: {tierId}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                {discountApplied && (
                  <p style={{
                    fontSize: '12px',
                    color: '#6b7280',
                    textDecoration: 'line-through',
                    marginBottom: '2px',
                  }}>${((priceMap[tierId] || 999) / 100).toFixed(2)}</p>
                )}
                <p style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#ffd700',
                }}>${(getDiscountedPrice() / 100).toFixed(2)}</p>
              </div>
            </div>
            <div style={{
              borderTop: '1px solid #d1d5db',
              paddingTop: '8px',
              marginTop: '8px',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '14px',
                color: '#374151',
                marginBottom: '4px',
              }}>
                <span>Subtotal</span>
                <span style={{ fontWeight: '600' }}>${((priceMap[tierId] || 999) / 100).toFixed(2)}</span>
              </div>
              {discountApplied && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '14px',
                  backgroundColor: '#dcfce7',
                  color: '#166534',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  marginBottom: '4px',
                }}>
                  <span>Discount ({discountApplied.code})</span>
                  <span style={{ fontWeight: '600' }}>-${(((priceMap[tierId] || 999) * discountApplied.percent / 100) / 100).toFixed(2)}</span>
                </div>
              )}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '14px',
                color: '#374151',
                marginBottom: '4px',
              }}>
                <span>Tax</span>
                <span style={{ fontWeight: '600' }}>$0.00</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#1a120b',
                paddingTop: '8px',
                borderTop: '1px solid #d1d5db',
                marginTop: '8px',
              }}>
                <span>Total</span>
                <span>${(getDiscountedPrice() / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div style={{
            backgroundColor: '#dbeafe',
            border: '1px solid #93c5fd',
            borderRadius: '8px',
            padding: '16px',
          }}>
            <p style={{
              fontSize: '14px',
              color: '#1e40af',
            }}>
              🔒 You'll be redirected to Stripe's secure checkout to complete your payment.
            </p>
          </div>

          {/* Email Section */}
          <div style={{
            backgroundColor: '#f3f4f6',
            borderRadius: '8px',
            padding: '16px',
            border: '1px solid #e5e7eb',
          }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#1a120b',
              marginBottom: '8px',
            }}>Email Address *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="your@email.com"
              disabled={isProcessing}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                fontSize: '14px',
                fontFamily: "'Merriweather', Georgia, serif",
                boxSizing: 'border-box',
                opacity: isProcessing ? 0.5 : 1,
              }}
            />
            <p style={{
              fontSize: '12px',
              color: '#6b7280',
              marginTop: '6px',
            }}>
              We'll send your personalized protocol to this email.
            </p>
          </div>

          {/* Coupon Code Section */}
          {!discountApplied && (
            <div style={{
              backgroundColor: '#f3f4f6',
              borderRadius: '8px',
              padding: '16px',
              border: '1px solid #e5e7eb',
            }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#1a120b',
                marginBottom: '12px',
              }}>Have a coupon code?</label>
              <div style={{
                display: 'flex',
                gap: '8px',
              }}>
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter coupon code"
                  disabled={isProcessing}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    fontSize: '14px',
                    fontFamily: "'Merriweather', Georgia, serif",
                    opacity: isProcessing ? 0.5 : 1,
                  }}
                />
                <button
                  type="button"
                  onClick={applyCoupon}
                  disabled={isProcessing || !couponCode.trim()}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '6px',
                    backgroundColor: '#ffd700',
                    color: '#1a120b',
                    border: 'none',
                    fontWeight: '600',
                    cursor: isProcessing || !couponCode.trim() ? 'not-allowed' : 'pointer',
                    opacity: isProcessing || !couponCode.trim() ? 0.5 : 1,
                    fontFamily: "'Playfair Display', Georgia, serif",
                  }}
                >
                  Apply
                </button>
              </div>
              {couponError && (
                <p style={{
                  fontSize: '13px',
                  color: '#dc2626',
                  marginTop: '8px',
                }}>⚠️ {couponError}</p>
              )}
            </div>
          )}

          {/* Applied Coupon Display */}
          {discountApplied && (
            <div style={{
              backgroundColor: '#dcfce7',
              borderRadius: '8px',
              padding: '16px',
              border: '1px solid #86efac',
            }}>
              <p style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#166534',
              }}>
                ✓ Coupon applied: {discountApplied.code} ({discountApplied.percent}% off)
              </p>
              <p style={{
                fontSize: '12px',
                color: '#15803d',
                marginTop: '4px',
              }}>
                Discount: -${(((priceMap[tierId] || 999) * discountApplied.percent / 100) / 100).toFixed(2)}
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={{
              backgroundColor: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
            }}>
              <p style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#991b1b',
              }}>⚠️ {error}</p>
            </div>
          )}

          {/* Processing State */}
          {isProcessing && (
            <div style={{
              backgroundColor: '#dbeafe',
              border: '1px solid #93c5fd',
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
            }}>
              <div style={{
                display: 'inline-block',
                width: '20px',
                height: '20px',
                border: '2px solid #ffd700',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }} />
              <p style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#1a120b',
                marginTop: '8px',
              }}>
                Redirecting to Stripe...
              </p>
            </div>
          )}

          {/* Payment Form */}
          <form onSubmit={handlePayment} style={{
            display: 'flex',
            gap: '12px',
          }}>
            <button
              type="button"
              onClick={onCancel}
              disabled={isProcessing}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '8px',
                border: '2px solid #ffd700',
                color: '#1a120b',
                fontWeight: '600',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                opacity: isProcessing ? 0.5 : 1,
                fontFamily: "'Playfair Display', Georgia, serif",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '8px',
                background: 'linear-gradient(to right, #ffd700, rgba(255, 215, 0, 0.9))',
                color: '#1a120b',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer',
                opacity: isProcessing ? 0.5 : 1,
                fontFamily: "'Playfair Display', Georgia, serif",
              }}
            >
              {isProcessing ? 'Redirecting...' : `Pay $${(getDiscountedPrice() / 100).toFixed(2)}`}
            </button>
          </form>

          {/* Disclaimer */}
          <p style={{
            fontSize: '12px',
            color: '#9ca3af',
            textAlign: 'center',
          }}>
            💳 Payments are processed securely by Stripe. Your data is encrypted and protected.
          </p>
        </div>
      </motion.div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  )
}
