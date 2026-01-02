import { motion } from 'framer-motion'
import { useFormStore } from '../../stores/formStore'

interface CompletionScreenProps {
  onRestart: () => void
}

export default function CompletionScreen({ onRestart }: CompletionScreenProps) {
  const { form, macros } = useFormStore()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8 text-center"
    >
      {/* Success Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="flex justify-center"
      >
        <div className="w-24 h-24 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center">
          <span className="text-5xl">✓</span>
        </div>
      </motion.div>

      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h1 className="text-4xl font-display font-bold text-dark mb-2">
          Your Protocol is Ready!
        </h1>
        <p className="text-lg text-gray-600">
          We're generating your personalized carnivore protocol
        </p>
      </motion.div>

      {/* Details */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg p-8 border-2 border-primary/30"
      >
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div>
            <p className="text-sm text-gray-600 mb-2">Your Calorie Target</p>
            <p className="text-3xl font-bold text-primary">
              {macros?.calories || '—'}
            </p>
            <p className="text-xs text-gray-500">kcal/day</p>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-2">Protein</p>
            <p className="text-3xl font-bold text-primary">
              {macros?.protein || '—'}g
            </p>
            <p className="text-xs text-gray-500">per day</p>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-2">Fat</p>
            <p className="text-3xl font-bold text-primary">
              {macros?.fat || '—'}g
            </p>
            <p className="text-xs text-gray-500">per day</p>
          </div>
        </div>

        <div className="border-t border-primary/30 pt-6">
          <p className="text-sm text-gray-600 mb-4">Your Report Includes:</p>
          <div className="grid grid-cols-2 gap-4 text-left">
            <div className="flex items-start gap-2">
              <span className="text-primary font-bold">✓</span>
              <span className="text-sm text-gray-700">13-section protocol</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary font-bold">✓</span>
              <span className="text-sm text-gray-700">30-day meal plan</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary font-bold">✓</span>
              <span className="text-sm text-gray-700">Shopping lists</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary font-bold">✓</span>
              <span className="text-sm text-gray-700">Doctor script</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary font-bold">✓</span>
              <span className="text-sm text-gray-700">Personalized tips</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary font-bold">✓</span>
              <span className="text-sm text-gray-700">Adaptation guide</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Email Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-blue-50 rounded-lg p-6 border border-blue-200"
      >
        <p className="text-sm text-gray-700 mb-2">
          <span className="font-semibold">Email:</span> {form.email || 'Not provided'}
        </p>
        <p className="text-xs text-gray-600">
          Your complete protocol will be sent to this email within 1 minute
        </p>
      </motion.div>

      {/* CTA Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="flex flex-col gap-3"
      >
        <button
          onClick={onRestart}
          className="btn-primary w-full"
        >
          Create Another Protocol
        </button>
        <p className="text-xs text-gray-500">
          Check your email for your complete personalized protocol
        </p>
      </motion.div>

      {/* Progress Animation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="pt-4"
      >
        <div className="flex justify-center gap-2">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-2 h-2 bg-primary rounded-full"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
            className="w-2 h-2 bg-secondary rounded-full"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.4 }}
            className="w-2 h-2 bg-primary rounded-full"
          />
        </div>
        <p className="text-xs text-gray-500 mt-4">Generating your report...</p>
      </motion.div>
    </motion.div>
  )
}
