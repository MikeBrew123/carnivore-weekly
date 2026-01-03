import { useForm } from 'react-hook-form'
import { useFormStore } from '../../stores/formStore'
import { calculateBMR, calculateTDEE, calculateMacros, imperialToCm } from '../../lib/calculations'
import { motion } from 'framer-motion'
import { useEffect } from 'react'

interface Step3GoalsProps {
  onNext: () => void
  onPrev: () => void
  onShowResults: (macros: any) => void
}

export default function Step3Goals({ onNext, onPrev, onShowResults }: Step3GoalsProps) {
  const { form, units, setFormField, setMacros } = useFormStore()
  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      goal: form.goal,
      deficit: form.deficit,
      diet: form.diet,
      ratio: form.ratio,
      proteinMin: form.proteinMin,
      netCarbs: form.netCarbs,
    },
    mode: 'onChange',
  })

  const goal = watch('goal')
  const deficit = watch('deficit')
  const diet = watch('diet')
  const ratio = watch('ratio')
  const netCarbs = watch('netCarbs')

  // Auto-populate deficit/surplus based on goal selection
  useEffect(() => {
    if (goal === 'lose') {
      setValue('deficit', 20)
    } else if (goal === 'gain') {
      setValue('deficit', 10)
    } else {
      setValue('deficit', 0)
    }
  }, [goal, setValue])

  // Calculate macros in real-time
  const heightCm = units === 'imperial'
    ? imperialToCm(form.heightFeet || 5, form.heightInches || 10)
    : form.heightCm || 178

  const bmr = calculateBMR(form.sex as 'male' | 'female', form.age, form.weight, heightCm)
  const tdee = calculateTDEE(bmr, parseFloat(form.lifestyle), parseFloat(form.exercise))

  const deficitNum = typeof deficit === 'string' ? parseFloat(deficit) : deficit || 0
  const netCarbsNum = typeof netCarbs === 'string' ? parseFloat(netCarbs) : netCarbs

  const macros = calculateMacros(
    tdee,
    goal as 'lose' | 'maintain' | 'gain',
    deficitNum,
    diet as 'carnivore' | 'keto' | 'lowcarb',
    ratio,
    form.proteinMin,
    netCarbsNum
  )

  const onSubmit = (data: any) => {
    setFormField('goal', data.goal)
    setFormField('deficit', data.deficit)
    setFormField('diet', data.diet)
    if (diet === 'carnivore' || diet === 'pescatarian') {
      setFormField('ratio', data.ratio)
    } else {
      setFormField('netCarbs', data.netCarbs)
    }
    setMacros(macros)
    // Track goal submission
    window.gtag?.('event', 'submit_goals', {
      event_category: 'Calculator',
      event_label: `${data.diet} - ${data.goal}`,
      deficit: data.deficit,
      ratio: data.ratio || data.netCarbs
    })
    onShowResults(macros)
  }

  const deficitLabel = goal === 'lose'
    ? 'Calorie Deficit (%)'
    : goal === 'gain'
    ? 'Calorie Surplus (%)'
    : 'Adjustment (%)'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-5 w-full"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Goal */}
        <div>
          <label className="block text-sm font-semibold text-dark mb-2">Goal</label>
          <select
            {...register('goal')}
            className="w-full px-4 py-3 rounded-lg border border-secondary/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20"
          >
            <option value="lose">Lose Fat</option>
            <option value="maintain">Maintain Weight</option>
            <option value="gain">Gain Muscle</option>
          </select>
        </div>

        {/* Deficit/Surplus */}
        <div>
          <label className="block text-sm font-semibold text-dark mb-2">{deficitLabel}</label>
          <input
            type="number"
            {...register('deficit', { valueAsNumber: true })}
            min="0"
            max="40"
            step="5"
            className="w-full px-4 py-3 rounded-lg border border-secondary/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20"
          />
          <p className="text-xs text-gray-500 mt-2">15-25% is sustainable for most people</p>
        </div>

        {/* Diet Style */}
        <div>
          <label className="block text-sm font-semibold text-dark mb-2">Diet Style</label>
          <select
            {...register('diet')}
            className="w-full px-4 py-3 rounded-lg border border-secondary/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20"
          >
            <option value="carnivore">Carnivore (0-5g carbs)</option>
            <option value="pescatarian">Pescatarian Carnivore (0-5g carbs)</option>
            <option value="keto">Keto (~20g net carbs)</option>
            <option value="lowcarb">Low-Carb (~75g net carbs)</option>
          </select>
        </div>

        {/* Carnivore Options */}
        {(diet === 'carnivore' || diet === 'pescatarian') && (
          <div className="space-y-4 p-4 bg-secondary/10 rounded-lg border border-secondary/30">
            <div>
              <label className="block text-sm font-semibold text-dark mb-2">Fat/Protein Ratio</label>
              <select
                {...register('ratio')}
                className="w-full px-4 py-3 rounded-lg border border-secondary/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20"
              >
                <option value="65-35">65% fat / 35% protein (leaner)</option>
                <option value="70-30">70% fat / 30% protein (standard)</option>
                <option value="80-20">80% fat / 20% protein (therapeutic)</option>
              </select>
            </div>
          </div>
        )}

        {/* Keto/Low-Carb Options */}
        {(diet === 'keto' || diet === 'lowcarb') && (
          <div className="space-y-4 p-4 bg-secondary/10 rounded-lg border border-secondary/30">
            <div>
              <label className="block text-sm font-semibold text-dark mb-2">Net Carbs (g/day)</label>
              <input
                type="number"
                {...register('netCarbs', { valueAsNumber: true })}
                min="0"
                max="150"
                className="w-full px-4 py-3 rounded-lg border border-secondary/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20"
              />
            </div>
          </div>
        )}

        {/* Live Macro Preview */}
        <motion.div
          layout
          className="bg-gradient-to-r from-primary/5 to-secondary/5 border-2 border-primary rounded-lg p-6 space-y-4"
        >
          <h3 className="font-semibold text-dark text-center">Your Personalized Macros</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-xs text-gray-600 mb-1">Calories</p>
              <p className="text-3xl font-bold text-primary">{macros.calories}</p>
              <p className="text-xs text-gray-500 mt-1">kcal/day</p>
            </div>

            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-xs text-gray-600 mb-1">TDEE</p>
              <p className="text-3xl font-bold text-secondary">{macros.tdee}</p>
              <p className="text-xs text-gray-500 mt-1">maintenance</p>
            </div>

            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-xs text-gray-600 mb-1">Protein</p>
              <p className="text-2xl font-bold text-primary">{macros.protein}g</p>
            </div>

            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-xs text-gray-600 mb-1">Fat</p>
              <p className="text-2xl font-bold text-primary">{macros.fat}g</p>
            </div>

            <div className="bg-white rounded-lg p-4 text-center col-span-2">
              <p className="text-xs text-gray-600 mb-1">Net Carbs</p>
              <p className="text-2xl font-bold text-primary">{macros.carbs}g</p>
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
            See Results
          </button>
        </div>
      </form>
    </motion.div>
  )
}
