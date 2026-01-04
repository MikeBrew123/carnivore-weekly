import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import FormField from './shared/FormField'
import SelectField from './shared/SelectField'
import RadioGroup from './shared/RadioGroup'

// Validation schema for the free calculator
const freeCalculatorSchema = z.object({
  weight: z.number().min(50).max(500, 'Weight must be between 50 and 500'),
  weight_unit: z.enum(['lbs', 'kg']),
  height_feet: z.number().min(3).max(8, 'Feet must be between 3 and 8'),
  height_inches: z.number().min(0).max(11, 'Inches must be between 0 and 11'),
  age: z.number().min(18).max(100, 'Age must be between 18 and 100'),
  sex: z.enum(['male', 'female']),
  activity_level: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']),
  goal: z.enum(['fat_loss', 'maintenance', 'muscle_gain']),
})

type FreeCalculatorData = z.infer<typeof freeCalculatorSchema>

interface FreeCalculatorProps {
  onCalculate?: (data: FreeCalculatorData) => void
}

export default function FreeCalculator({ onCalculate }: FreeCalculatorProps) {
  const [submitted, setSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
  } = useForm<FreeCalculatorData>({
    resolver: zodResolver(freeCalculatorSchema),
    defaultValues: {
      weight: 0,
      weight_unit: 'lbs',
      height_feet: 5,
      height_inches: 10,
      age: 35,
      sex: 'male',
      activity_level: 'moderate',
      goal: 'fat_loss',
    },
  })

  const weight_unit = watch('weight_unit')

  const onSubmit = (data: FreeCalculatorData) => {
    console.log('Form submitted:', data)
    setSubmitted(true)
    if (onCalculate) {
      onCalculate(data)
    }
  }

  return (
    <div className="min-h-screen bg-[#F2F0E6] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-[#ffd700] font-['Playfair_Display'] mb-2">
            🥩 Carnivore Macro Calculator
          </h1>
          <p className="text-lg text-[#666] font-['Merriweather']">
            No email required. Get your personalized macros in minutes.
          </p>
        </div>

        {/* Form Container - Dark Card Style */}
        <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-8 shadow-lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            {/* Physical Stats Section */}
            <div>
              <h2 className="text-xl font-semibold text-[#ffd700] font-['Playfair_Display'] mb-6">
                Your Stats
              </h2>

              {/* Weight & Unit */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[#a0a0a0] mb-2 font-['Merriweather']">
                    Weight <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="e.g., 180"
                    className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg px-4 py-3 text-lg text-[#f5f5f5] placeholder-[#666] focus:border-[#ffd700] focus:ring-2 focus:ring-[#ffd700]/20 focus:outline-none transition-all font-['Merriweather']"
                    {...register('weight', { valueAsNumber: true })}
                  />
                  {errors.weight && <p className="text-red-500 text-sm mt-1">{errors.weight.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#a0a0a0] mb-2 font-['Merriweather']">
                    Unit <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg px-4 py-3 text-lg text-[#f5f5f5] focus:border-[#ffd700] focus:ring-2 focus:ring-[#ffd700]/20 focus:outline-none transition-all font-['Merriweather']"
                    {...register('weight_unit')}
                  >
                    <option value="lbs">lbs</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
              </div>

              {/* Height */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-[#a0a0a0] mb-2 font-['Merriweather']">
                    Height (Feet) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="5"
                    className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg px-4 py-3 text-lg text-[#f5f5f5] placeholder-[#666] focus:border-[#ffd700] focus:ring-2 focus:ring-[#ffd700]/20 focus:outline-none transition-all font-['Merriweather']"
                    {...register('height_feet', { valueAsNumber: true })}
                  />
                  {errors.height_feet && <p className="text-red-500 text-sm mt-1">{errors.height_feet.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#a0a0a0] mb-2 font-['Merriweather']">
                    Inches <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="10"
                    className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg px-4 py-3 text-lg text-[#f5f5f5] placeholder-[#666] focus:border-[#ffd700] focus:ring-2 focus:ring-[#ffd700]/20 focus:outline-none transition-all font-['Merriweather']"
                    {...register('height_inches', { valueAsNumber: true })}
                  />
                  {errors.height_inches && <p className="text-red-500 text-sm mt-1">{errors.height_inches.message}</p>}
                </div>
              </div>

              {/* Age */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-[#a0a0a0] mb-2 font-['Merriweather']">
                  Age <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="35"
                  className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg px-4 py-3 text-lg text-[#f5f5f5] placeholder-[#666] focus:border-[#ffd700] focus:ring-2 focus:ring-[#ffd700]/20 focus:outline-none transition-all font-['Merriweather']"
                  {...register('age', { valueAsNumber: true })}
                />
                {errors.age && <p className="text-red-500 text-sm mt-1">{errors.age.message}</p>}
              </div>
            </div>

            {/* Goals Section */}
            <div>
              <h2 className="text-xl font-semibold text-[#ffd700] font-['Playfair_Display'] mb-6">
                Your Goals
              </h2>

              {/* Sex */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-[#a0a0a0] mb-4 font-['Merriweather']">
                  Biological Sex <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3">
                  {[
                    { value: 'male', label: 'Male' },
                    { value: 'female', label: 'Female' },
                  ].map((option) => (
                    <label key={option.value} className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        value={option.value}
                        className="w-4 h-4 text-[#ffd700] focus:ring-2 focus:ring-[#ffd700]"
                        {...register('sex')}
                      />
                      <span className="ml-3 text-[#f5f5f5] font-['Merriweather']">
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
                {errors.sex && <p className="text-red-500 text-sm mt-1">{errors.sex.message}</p>}
              </div>

              {/* Activity Level */}
              <div className="mb-6">
                <FormField
                  label="Activity Level"
                  error={errors.activity_level?.message}
                  required
                >
                  <select
                    className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg px-4 py-3 text-lg text-[#f5f5f5] focus:border-[#ffd700] focus:ring-2 focus:ring-[#ffd700]/20 focus:outline-none transition-all font-['Merriweather']"
                    {...register('activity_level')}
                  >
                    <option value="">Select activity level</option>
                    <option value="sedentary">Sedentary (little to no exercise)</option>
                    <option value="light">Light (exercise 1-3 days/week)</option>
                    <option value="moderate">Moderate (exercise 3-5 days/week)</option>
                    <option value="active">Active (exercise 5-6 days/week)</option>
                    <option value="very_active">Very Active (exercise 6-7 days/week)</option>
                  </select>
                </FormField>
              </div>

              {/* Goal */}
              <div className="mb-6">
                <FormField
                  label="Primary Goal"
                  error={errors.goal?.message}
                  required
                >
                  <select
                    className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg px-4 py-3 text-lg text-[#f5f5f5] focus:border-[#ffd700] focus:ring-2 focus:ring-[#ffd700]/20 focus:outline-none transition-all font-['Merriweather']"
                    {...register('goal')}
                  >
                    <option value="">Select your goal</option>
                    <option value="fat_loss">Fat Loss</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="muscle_gain">Muscle Gain</option>
                  </select>
                </FormField>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-[#ffd700] hover:bg-[#e6c200] text-[#1a120b] font-semibold py-4 px-6 rounded-lg text-lg transition-all hover:-translate-y-0.5 font-['Playfair_Display']"
            >
              Calculate My Macros
            </button>
          </form>
        </div>

        {/* Info */}
        <p className="text-center text-[#666] text-sm mt-8 font-['Merriweather']">
          Your data stays private. No account or email required.
        </p>
      </div>
    </div>
  )
}
