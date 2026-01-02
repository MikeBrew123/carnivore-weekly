import { motion } from 'framer-motion'
import { useState } from 'react'
import { useFormStore } from '../../stores/formStore'

interface StripePaymentModalProps {
  tierId: string
  tierTitle: string
  tierPrice: string
  onSuccess: () => void
  onCancel: () => void
}

export default function StripePaymentModal({
  tierId,
  tierTitle,
  tierPrice,
  onSuccess,
  onCancel,
}: StripePaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [discountApplied, setDiscountApplied] = useState<{ code: string; percent: number } | null>(null)
  const [couponError, setCouponError] = useState('')
  const { sessionToken, form } = useFormStore()

  const priceMap: Record<string, number> = {
    bundle: 999, // $9.99 in cents
    meal_plan: 2700, // $27
    shopping: 1900, // $19
    doctor: 1500, // $15
  }

  const calculateDiscountedPrice = () => {
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
      // Validate coupon against our backend
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
    setIsProcessing(true)
    setError('')

    try {
      // Create Stripe checkout session via our API
      const response = await fetch('https://carnivore-report-api-production.iambrew.workers.dev/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier_id: tierId,
          tier_title: tierTitle,
          amount: calculateDiscountedPrice(),
          original_amount: priceMap[tierId] || 999,
          coupon_code: discountApplied?.code || null,
          discount_percent: discountApplied?.percent || 0,
          customer_email: form.email || 'unknown@example.com',
          session_token: sessionToken,
          success_url: `${window.location.origin}/calculator2-demo.html?payment=success&session=${sessionToken}`,
          cancel_url: `${window.location.origin}/calculator2-demo.html?payment=cancelled`,
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to create checkout: ${errorText}`)
      }

      const data = await response.json()
      
      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed')
      setIsProcessing(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary/90 text-accent p-6 relative">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="absolute top-4 right-4 text-2xl hover:opacity-80 disabled:opacity-50"
          >
            ✕
          </button>
          <h2 className="text-2xl font-display font-bold mb-1">Complete Payment</h2>
          <p className="text-accent/80 text-sm">Secure payment via Stripe</p>
        </div>

        {/* Payment Details */}
        <div className="p-6 space-y-6">
          {/* Order Summary */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-50 rounded-lg p-4 border border-gray-200"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-semibold text-dark">{tierTitle}</p>
                <p className="text-xs text-gray-500 mt-1">Plan ID: {tierId}</p>
              </div>
              <p className="text-lg font-bold text-primary">{tierPrice}</p>
            </div>
            <div className="border-t border-gray-200 pt-2 mt-2 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">{tierPrice}</span>
              </div>
              {discountApplied && (
                <div className="flex justify-between text-sm bg-green-50 -mx-2 px-2 py-1 rounded">
                  <span className="text-green-700">Discount ({discountApplied.code})</span>
                  <span className="font-semibold text-green-700">
                    -${((priceMap[tierId] || 999) * discountApplied.percent / 100 / 100).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax</span>
                <span className="font-semibold">$0.00</span>
              </div>
              <div className="flex justify-between font-bold text-dark pt-2 border-t border-gray-200">
                <span>Total</span>
                <span>${(calculateDiscountedPrice() / 100).toFixed(2)}</span>
              </div>
            </div>
          </motion.div>

          {/* Info Box */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-blue-50 border border-blue-200 rounded-lg p-4"
          >
            <p className="text-sm text-blue-900">
              🔒 You'll be redirected to Stripe's secure checkout to complete your payment.
            </p>
          </motion.div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-red-50 border border-red-200 rounded-lg p-4 text-center"
            >
              <p className="text-sm font-semibold text-red-900">{error}</p>
            </motion.div>
          )}

          {/* Processing State */}
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center"
            >
              <div className="inline-block">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
                />
              </div>
              <p className="text-sm font-semibold text-dark mt-2">
                Redirecting to Stripe...
              </p>
            </motion.div>
          )}

          {/* Coupon Code Section */}
          {!discountApplied && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-secondary/10 rounded-lg p-4 border border-secondary/20"
            >
              <label className="block text-sm font-semibold text-dark mb-3">Have a coupon code?</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter coupon code"
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 rounded-lg border border-secondary/30 text-dark placeholder-gray-500 focus:border-secondary focus:ring-2 focus:ring-secondary/20 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={applyCoupon}
                  disabled={isProcessing || !couponCode.trim()}
                  className="px-4 py-2 rounded-lg bg-secondary text-accent font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Apply
                </button>
              </div>
              {couponError && (
                <p className="text-sm text-red-600 mt-2">⚠️ {couponError}</p>
              )}
            </motion.div>
          )}

          {discountApplied && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-green-50 rounded-lg p-4 border border-green-200"
            >
              <p className="text-sm font-semibold text-green-700">
                ✓ Coupon applied: {discountApplied.code} ({discountApplied.percent}% off)
              </p>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handlePayment} className="space-y-4">
            {/* Email Confirmation */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Confirmation sent to:</p>
              <p className="font-semibold text-dark">{form.email || 'your email'}</p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={isProcessing}
                className="flex-1 px-4 py-3 rounded-lg border-2 border-secondary text-dark font-semibold hover:bg-secondary/10 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-primary to-primary/90 text-accent font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isProcessing ? 'Redirecting...' : 'Pay ' + tierPrice}
              </button>
            </div>
          </form>

          {/* Disclaimer */}
          <p className="text-xs text-gray-500 text-center">
            💳 Payments are processed securely by Stripe. Your data is encrypted and protected.
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}
