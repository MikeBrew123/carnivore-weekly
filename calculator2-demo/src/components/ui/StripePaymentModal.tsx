import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { useFormStore } from '../../stores/formStore'

declare global {
  interface Window {
    gtag?: (...args: any[]) => void
  }
}

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

// Only while this window is mounted. The calculator slot is its own stacking
// context (z-index 1), so this modal's z-index cannot rise above page chrome
// outside it, and the chat and menu buttons painted over the payment window
// on phones (mobile audit 2026-09-10).
const PAYMENT_OPEN_STYLES = `
  .hamburger-menu-btn, #feedback-button, .feedback-fab, #mobile-calc-cta { visibility: hidden !important; }
  .cw-pay-panel { max-height: calc(100vh - 24px); max-height: calc(100dvh - 24px); }
  .cw-pay-panel:focus { outline: none; }
  .cw-pay-panel button:focus-visible, .cw-pay-panel input:focus-visible { outline: 3px solid #1a120b; outline-offset: 2px; }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`

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
  const [discountApplied, setDiscountApplied] = useState<{ code: string; percent: number; amountOff: number } | null>(null)
  const [couponError, setCouponError] = useState('')
  const [couponOpen, setCouponOpen] = useState(false)
  const { sessionToken } = useFormStore()

  const panelRef = useRef<HTMLDivElement>(null)
  const couponInputRef = useRef<HTMLInputElement>(null)
  const processingRef = useRef(isProcessing)
  processingRef.current = isProcessing
  const cancelRef = useRef(onCancel)
  cancelRef.current = onCancel

  useEffect(() => {
    console.log('[StripePaymentModal] Mounted for tier:', tierId, tierTitle)

    // Pre-fill coupon from URL parameter (e.g. ?coupon=ETSY50)
    const params = new URLSearchParams(window.location.search)
    const urlCoupon = params.get('coupon')
    if (urlCoupon && !couponCode) {
      setCouponCode(urlCoupon.toUpperCase())
    }

    // Track payment modal opened
    if (window.gtag) {
      window.gtag('event', 'calculator_payment_modal_opened', {
        'event_category': 'calculator',
        'event_label': 'payment_modal_opened'
      })
    }
  }, [])

  // Dialog behaviour: focus moves in, Tab stays in, Escape closes while idle,
  // and focus returns to whatever opened the window. Focus lands on the panel
  // rather than the email field, so a phone keyboard does not cover Pay.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    panelRef.current?.focus({ preventScroll: true })

    const onKeyDown = (e: KeyboardEvent) => {
      const panel = panelRef.current
      if (!panel) return
      if (e.key === 'Escape') {
        if (!processingRef.current) {
          e.preventDefault()
          cancelRef.current()
        }
        return
      }
      if (e.key !== 'Tab') return
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>('button, input, a[href], [tabindex]:not([tabindex="-1"])'))
        .filter((el) => !(el as HTMLButtonElement).disabled && el.getClientRects().length > 0)
      if (focusable.length === 0) {
        e.preventDefault()
        panel.focus({ preventScroll: true })
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      const inside = !!active && panel.contains(active)
      if (e.shiftKey) {
        if (!inside || active === first || active === panel) {
          e.preventDefault()
          last.focus()
        }
      } else if (!inside || active === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (opener && opener !== document.body && document.contains(opener)) opener.focus({ preventScroll: true })
    }
  }, [])

  // The coupon field stays tucked away until asked for. A code from the URL, or
  // a standing coupon error, keeps it open so neither is ever hidden.
  const couponExpanded = couponOpen || couponCode !== '' || couponError !== ''
  useEffect(() => {
    if (couponOpen) couponInputRef.current?.focus()
  }, [couponOpen])

  const priceMap: Record<string, number> = {
    bundle: 2900,
  }

  const getDiscountedPrice = () => {
    if (!discountApplied) return priceMap[tierId] || 2900
    const originalPrice = priceMap[tierId] || 2900
    const afterPercent = Math.round(originalPrice * (1 - discountApplied.percent / 100))
    return Math.max(0, afterPercent - discountApplied.amountOff)
  }

  const getDiscountCents = () => {
    if (!discountApplied) return 0
    return (priceMap[tierId] || 2900) - getDiscountedPrice()
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
      setDiscountApplied({ code: couponCode.toUpperCase(), percent: data.percent || 0, amountOff: data.amount_off || 0 })
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
          first_name: formData.firstName || '',
          form_data: formData,
          tier_id: tierId,
          tier_title: tierTitle,
          amount: finalPrice,
          original_amount: priceMap[tierId] || 2900,
          coupon_code: discountApplied?.code || null,
          discount_percent: discountApplied?.percent || 0,
          session_token: sessionToken,
        })
      })

      if (!response.ok) {
        // The payment boundary refuses a suppressed calorie target and anyone
        // under 18. Those are permanent for these answers, so show the server's
        // customer-safe sentence instead of "Failed to create checkout: 422",
        // which reads like a transient glitch worth retrying. No money has moved.
        const body = await response.json().catch(() => ({} as any))
        if (
          response.status === 422 &&
          (body.code === 'CALORIE_TARGET_SUPPRESSED' || body.code === 'UNDER_18_NOT_SUPPORTED')
        ) {
          throw new Error(
            body.code === 'UNDER_18_NOT_SUPPORTED'
              ? 'This calculator is designed for adults 18 and over, so this plan is not available. You have not been charged.'
              : 'We cannot build a self-guided plan from these numbers. Your estimated maintenance '
                + 'calories are at or below the lower limit we use for automated plans, so this needs '
                + 'a dietitian or your doctor rather than this calculator. You have not been charged.'
          )
        }
        throw new Error(body.message || `Failed to create checkout: ${response.status}`)
      }

      const data = await response.json()

      // Track checkout started
      if (window.gtag) {
        window.gtag('event', 'begin_checkout', {
          value: finalPrice / 100,
          currency: 'USD',
          items: [{ item_id: tierId, item_name: tierTitle, price: finalPrice / 100, quantity: 1 }],
          coupon: discountApplied?.code || undefined,
        })
      }

      // Persist actual paid amount for GA4 purchase event after redirect
      localStorage.setItem('amountPaidCents', String(finalPrice))

      // If amount is 0 (100% discount), skip Stripe and go directly to success
      if (finalPrice === 0 || data.amount === 0) {
        window.location.href = data.checkout_url
        return
      }

      // Otherwise, redirect to Stripe checkout
      if (data.url) {
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

  const rowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    color: '#374151',
    marginBottom: '2px',
  }

  return (
    <motion.div
      // No exit variant: this modal is mounted conditionally, never inside
      // <AnimatePresence>, because an exit animation that ran without
      // unmounting left a full-screen overlay at opacity 0 with
      // pointer-events:auto that swallowed every click on the page behind it,
      // the $29 CTA included (audit 2026-09-10). React unmounts it instead.
      // pointerEvents is still declared so the fade-in cannot catch a tap
      // before the modal is actually visible.
      initial={{ opacity: 0, pointerEvents: 'none' }}
      animate={{ opacity: 1, pointerEvents: 'auto' }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000, // Above PricingModal (9999) and site header
        padding: '12px',
        overflow: 'hidden',
      }}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
        tabIndex={-1}
        className="cw-pay-panel"
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '448px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(to right, #ffd700, rgba(255, 215, 0, 0.9))',
          color: '#1a120b',
          padding: '16px 60px 16px 20px',
          position: 'relative',
        }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            aria-label="Close payment window"
            style={{
              position: 'absolute',
              top: '6px',
              right: '6px',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              lineHeight: 1,
              color: '#1a120b',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              opacity: isProcessing ? 0.5 : 1,
            }}
          >
            ✕
          </button>
          <h2 id="payment-modal-title" style={{
            fontSize: '22px',
            fontWeight: 'bold',
            lineHeight: 1.25,
            margin: 0,
            fontFamily: "'Playfair Display', Georgia, serif",
            color: '#1a0d00',
          }}>Complete Payment</h2>
          <p style={{
            opacity: 0.8,
            fontSize: '14px',
            margin: '2px 0 0 0',
            fontFamily: "'Merriweather', Georgia, serif",
          }}>Secure payment via Stripe</p>
        </div>

        {/* Content */}
        <div style={{
          padding: '16px 20px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}>
          {/* Order Summary */}
          <div style={{
            backgroundColor: '#f3f4f6',
            borderRadius: '10px',
            padding: '14px 16px',
            border: '1px solid #e5e7eb',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '12px',
            }}>
              <div>
                <p style={{
                  fontWeight: '600',
                  color: '#1a120b',
                  fontSize: '15px',
                  lineHeight: 1.35,
                  margin: 0,
                }}>{tierTitle}</p>
                <p style={{
                  fontSize: '13px',
                  color: '#4b5563',
                  margin: '2px 0 0 0',
                }}>One-time purchase</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {discountApplied && (
                  <p style={{
                    fontSize: '13px',
                    color: '#4b5563',
                    textDecoration: 'line-through',
                    margin: '0 0 2px 0',
                  }}>${((priceMap[tierId] || 2900) / 100).toFixed(2)}</p>
                )}
                {/* Dark on the light card: gold here measured 1.27:1 */}
                <p style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  lineHeight: 1.2,
                  color: '#1a120b',
                  margin: 0,
                }}>${(getDiscountedPrice() / 100).toFixed(2)}</p>
              </div>
            </div>
            <div style={{
              borderTop: '1px solid #d1d5db',
              paddingTop: '8px',
              marginTop: '10px',
            }}>
              <div style={rowStyle}>
                <span>Subtotal</span>
                <span style={{ fontWeight: '600' }}>${((priceMap[tierId] || 2900) / 100).toFixed(2)}</span>
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
                  marginBottom: '2px',
                }}>
                  <span>Discount ({discountApplied.code})</span>
                  <span style={{ fontWeight: '600' }}>-${(getDiscountCents() / 100).toFixed(2)}</span>
                </div>
              )}
              <div style={rowStyle}>
                <span>Tax</span>
                <span style={{ fontWeight: '600' }}>$0.00</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#1a120b',
                paddingTop: '6px',
                borderTop: '1px solid #d1d5db',
                marginTop: '6px',
              }}>
                <span>Total</span>
                <span>${(getDiscountedPrice() / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Email Section */}
          <div>
            <label htmlFor="payment-email" style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#1a120b',
              marginBottom: '6px',
            }}>Email Address *</label>
            <input
              id="payment-email"
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="your@email.com"
              disabled={isProcessing}
              aria-describedby="payment-email-help"
              style={{
                width: '100%',
                minHeight: '48px',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #6b7280',
                fontSize: '16px',
                color: '#1a120b',
                backgroundColor: '#ffffff',
                fontFamily: "'Merriweather', Georgia, serif",
                boxSizing: 'border-box',
                opacity: isProcessing ? 0.5 : 1,
              }}
            />
            <p id="payment-email-help" style={{
              fontSize: '13px',
              lineHeight: 1.45,
              color: '#4b5563',
              margin: '6px 0 0 0',
            }}>
              {/* Sarah's approved line for the same claim on the health-profile screen,
                  in the future tense because this one is shown before payment. Nothing
                  sends the finished protocol; the reader presses Email My Report for
                  that, and the automatic email is the return link. */}
              We'll email your return link to this address. Nothing else is sent there
              unless you press Email My Report.
            </p>
          </div>

          {/* Coupon Code Section: a compact disclosure, not a permanent card */}
          {!discountApplied && (
            <div>
              <button
                type="button"
                id="payment-coupon-toggle"
                aria-expanded={couponExpanded}
                aria-controls="payment-coupon-panel"
                disabled={isProcessing}
                onClick={() => {
                  if (couponExpanded && !couponCode && !couponError) {
                    setCouponOpen(false)
                  } else {
                    setCouponOpen(true)
                    couponInputRef.current?.focus()
                  }
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  minHeight: '44px',
                  padding: 0,
                  background: 'none',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1a120b',
                  textDecoration: 'underline',
                  textUnderlineOffset: '3px',
                  cursor: 'pointer',
                  fontFamily: "'Merriweather', Georgia, serif",
                }}
              >Have a coupon code?</button>
              {couponExpanded && (
                <div id="payment-coupon-panel">
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                  }}>
                    <input
                      ref={couponInputRef}
                      id="payment-coupon"
                      type="text"
                      aria-labelledby="payment-coupon-toggle"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Enter coupon code"
                      disabled={isProcessing}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        minHeight: '44px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #6b7280',
                        fontSize: '16px',
                        color: '#1a120b',
                        fontFamily: "'Merriweather', Georgia, serif",
                        opacity: isProcessing ? 0.5 : 1,
                      }}
                    />
                    <button
                      type="button"
                      onClick={applyCoupon}
                      disabled={isProcessing || !couponCode.trim()}
                      style={{
                        minHeight: '44px',
                        padding: '10px 16px',
                        borderRadius: '8px',
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
                    <p role="alert" style={{
                      fontSize: '13px',
                      color: '#b91c1c',
                      margin: '8px 0 0 0',
                    }}>⚠️ {couponError}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Applied Coupon Display */}
          {discountApplied && (
            <div style={{
              backgroundColor: '#dcfce7',
              borderRadius: '8px',
              padding: '12px 14px',
              border: '1px solid #86efac',
            }}>
              <p style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#166534',
                margin: 0,
              }}>
                ✓ Coupon applied: {discountApplied.code} ({discountApplied.percent > 0 ? `${discountApplied.percent}% off` : `$${(discountApplied.amountOff / 100).toFixed(0)} off`})
              </p>
              <p style={{
                fontSize: '13px',
                color: '#166534',
                margin: '4px 0 0 0',
              }}>
                Discount: -${(getDiscountCents() / 100).toFixed(2)}
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div role="alert" style={{
              backgroundColor: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: '8px',
              padding: '12px 14px',
              textAlign: 'center',
            }}>
              <p style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#991b1b',
                margin: 0,
              }}>⚠️ {error}</p>
            </div>
          )}

          {/* Processing State */}
          {isProcessing && (
            <div role="status" style={{
              backgroundColor: '#dbeafe',
              border: '1px solid #93c5fd',
              borderRadius: '8px',
              padding: '12px 14px',
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
                margin: '8px 0 0 0',
              }}>
                Redirecting to Stripe...
              </p>
            </div>
          )}

          {/* Payment Form: Pay first and full width, Cancel quieter beneath it */}
          <form onSubmit={handlePayment} style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            <button
              type="submit"
              disabled={isProcessing}
              style={{
                width: '100%',
                minHeight: '52px',
                padding: '14px 16px',
                borderRadius: '10px',
                background: 'linear-gradient(to right, #ffd700, rgba(255, 215, 0, 0.9))',
                color: '#1a120b',
                fontSize: '18px',
                fontWeight: '700',
                border: 'none',
                cursor: 'pointer',
                opacity: isProcessing ? 0.5 : 1,
                fontFamily: "'Playfair Display', Georgia, serif",
                boxShadow: '0 4px 14px rgba(255, 215, 0, 0.3)',
              }}
            >
              {isProcessing ? 'Redirecting...' : `Pay $${(getDiscountedPrice() / 100).toFixed(2)}`}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={isProcessing}
              style={{
                width: '100%',
                minHeight: '44px',
                padding: '10px 16px',
                borderRadius: '10px',
                border: '1px solid #d1d5db',
                color: '#1a120b',
                fontSize: '15px',
                fontWeight: '600',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                opacity: isProcessing ? 0.5 : 1,
                fontFamily: "'Playfair Display', Georgia, serif",
              }}
            >
              Cancel
            </button>
          </form>

          {/* Stripe reassurance, right under the buttons it describes */}
          <div style={{ textAlign: 'center' }}>
            <p style={{
              fontSize: '13px',
              lineHeight: 1.45,
              color: '#374151',
              margin: 0,
            }}>
              🔒 You'll be redirected to Stripe's secure checkout to complete your payment.
            </p>
            <p style={{
              fontSize: '13px',
              lineHeight: 1.45,
              color: '#4b5563',
              margin: '4px 0 0 0',
            }}>
              💳 Payments are processed securely by Stripe. Your data is encrypted and protected.
            </p>
          </div>
        </div>
      </motion.div>

      <style>{PAYMENT_OPEN_STYLES}</style>
    </motion.div>
  )
}
