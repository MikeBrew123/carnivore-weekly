import { motion } from 'framer-motion'
import { useState } from 'react'

interface MockPaymentModalProps {
  tierId: string
  tierTitle: string
  tierPrice: string
  onSuccess: () => void
  onCancel: () => void
}

export default function MockPaymentModal({
  tierId,
  tierTitle,
  tierPrice,
  onSuccess,
  onCancel,
}: MockPaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242')
  const [expiry, setExpiry] = useState('12/25')
  const [cvc, setCvc] = useState('123')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)

    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000))

    setIsProcessing(false)
    onSuccess()
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
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary/90 text-accent p-6">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="absolute top-4 right-4 text-2xl hover:opacity-80 disabled:opacity-50"
          >
            ✕
          </button>
          <h2 className="text-2xl font-display font-bold mb-1">Complete Payment</h2>
          <p className="text-accent/80 text-sm">Mock payment for testing</p>
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
            <div className="border-t border-gray-200 pt-2 mt-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">{tierPrice}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-600">Tax</span>
                <span className="font-semibold">$0.00</span>
              </div>
              <div className="flex justify-between font-bold text-dark mt-2 pt-2 border-t border-gray-200">
                <span>Total</span>
                <span>{tierPrice}</span>
              </div>
            </div>
          </motion.div>

          {/* Card Form */}
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            {/* Card Number */}
            <div>
              <label className="block text-sm font-semibold text-dark mb-2">
                Card Number
              </label>
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                disabled={isProcessing}
                className="w-full px-4 py-3 rounded-lg border border-secondary/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20 disabled:bg-gray-100 disabled:opacity-50"
                placeholder="4242 4242 4242 4242"
              />
              <p className="text-xs text-gray-500 mt-1">
                💡 This is a test form. Use any card number.
              </p>
            </div>

            {/* Expiry & CVC */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-dark mb-2">
                  Expiry
                </label>
                <input
                  type="text"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  disabled={isProcessing}
                  className="w-full px-4 py-3 rounded-lg border border-secondary/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20 disabled:bg-gray-100 disabled:opacity-50"
                  placeholder="MM/YY"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-dark mb-2">
                  CVC
                </label>
                <input
                  type="text"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value)}
                  disabled={isProcessing}
                  className="w-full px-4 py-3 rounded-lg border border-secondary/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20 disabled:bg-gray-100 disabled:opacity-50"
                  placeholder="123"
                />
              </div>
            </div>

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
                  Processing payment...
                </p>
              </motion.div>
            )}

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
                {isProcessing ? 'Processing...' : 'Pay ' + tierPrice}
              </button>
            </div>
          </motion.form>

          {/* Disclaimer */}
          <p className="text-xs text-gray-500 text-center">
            ⚠️ This is a mock payment form for testing. No actual charges will be made.
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}
