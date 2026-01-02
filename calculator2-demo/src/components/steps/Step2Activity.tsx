import { useForm } from 'react-hook-form'
import { useFormStore } from '../../stores/formStore'
import { calculateBMR, calculateTDEE, imperialToCm } from '../../lib/calculations'
import { motion } from 'framer-motion'

interface Step2ActivityProps {
  onNext: () => void
  onPrev: () => void
}

export default function Step2Activity({ onNext, onPrev }: Step2ActivityProps) {
  const { form, units, setFormField } = useFormStore()
  const { register, handleSubmit, watch } = useForm({
    defaultValues: {
      lifestyle: form.lifestyle,
      exercise: form.exercise,
    },
    mode: 'onChange',
  })

  const lifestyle = watch('lifestyle')
  const exercise = watch('exercise')

  // Calculate TDEE in real-time
  const heightCm = units === 'imperial'
    ? imperialToCm(form.heightFeet || 5, form.heightInches || 10)
    : form.heightCm || 178

  const bmr = calculateBMR(form.sex as 'male' | 'female', form.age, form.weight, heightCm)
  const tdee = calculateTDEE(bmr, parseFloat(lifestyle), parseFloat(exercise))
  const totalActivityMultiplier = (parseFloat(lifestyle) + parseFloat(exercise)).toFixed(2)

  const onSubmit = (data: any) => {
    setFormField('lifestyle', data.lifestyle)
    setFormField('exercise', data.exercise)
    onNext()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-display font-bold text-dark mb-2">Your Activity Level</h2>
        <p className="text-gray-600">How active is your daily life?</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Daily Lifestyle */}
        <div>
          <label className="block text-sm font-semibold text-dark mb-2">Daily Lifestyle</label>
          <select
            {...register('lifestyle')}
            className="w-full px-4 py-3 rounded-lg border border-secondary/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20"
          >
            <option value="1.2">Desk job, minimal walking</option>
            <option value="1.3">Desk job, walk 30-60 min/day</option>
            <option value="1.4">Standing job (retail, teaching)</option>
            <option value="1.5">Active job (server, nurse, on feet)</option>
            <option value="1.6">Physical labor (construction, farming)</option>
          </select>
          <p className="text-xs text-gray-500 mt-2">Your occupation, not gym time</p>
        </div>

        {/* Structured Exercise */}
        <div>
          <label className="block text-sm font-semibold text-dark mb-2">Structured Exercise</label>
          <select
            {...register('exercise')}
            className="w-full px-4 py-3 rounded-lg border border-secondary/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20"
          >
            <option value="0">None</option>
            <option value="0.1">1-2x/week, light (walking, yoga)</option>
            <option value="0.2">3-4x/week, moderate (lifting, jogging)</option>
            <option value="0.3">4-5x/week, intense (CrossFit, HIIT)</option>
            <option value="0.4">6-7x/week, athlete (serious training)</option>
          </select>
          <p className="text-xs text-gray-500 mt-2">Gym sessions only, not daily movement</p>
        </div>

        {/* Real-time Activity Display */}
        <motion.div
          layout
          className="bg-gradient-to-r from-secondary/20 to-secondary/10 border border-secondary/30 rounded-lg p-4 space-y-3"
        >
          <p className="text-sm text-dark">
            <span className="font-semibold">Total Activity Multiplier:</span> {totalActivityMultiplier}x BMR
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded p-3 text-center">
              <p className="text-xs text-gray-500">BMR</p>
              <p className="text-lg font-bold text-primary">{Math.round(bmr)}</p>
              <p className="text-xs text-gray-500">cal/day</p>
            </div>
            <div className="bg-white rounded p-3 text-center">
              <p className="text-xs text-gray-500">TDEE</p>
              <p className="text-lg font-bold text-primary">{Math.round(tdee)}</p>
              <p className="text-xs text-gray-500">cal/day</p>
            </div>
            <div className="bg-white rounded p-3 text-center">
              <p className="text-xs text-gray-500">Multiplier</p>
              <p className="text-lg font-bold text-primary">{totalActivityMultiplier}x</p>
            </div>
          </div>
        </motion.div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onPrev}
            className="flex-1 btn-secondary"
          >
            Back
          </button>
          <button
            type="submit"
            className="flex-1 btn-primary"
          >
            Continue to Diet
          </button>
        </div>
      </form>
    </motion.div>
  )
}
