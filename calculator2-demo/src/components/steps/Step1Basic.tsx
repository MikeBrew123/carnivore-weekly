import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useFormStore } from '../../stores/formStore'
import { motion } from 'framer-motion'
import { useState } from 'react'

const step1Schema = z.object({
  sex: z.enum(['male', 'female']),
  age: z.number().min(14).max(99),
  heightUnit: z.enum(['feet-inches', 'cm']),
  heightFeet: z.number().min(3).max(8).optional(),
  heightInches: z.number().min(0).max(11).optional(),
  heightCm: z.number().min(100).max(250).optional(),
  weight: z.number().min(80).max(500),
}).refine((data) => {
  if (data.heightUnit === 'feet-inches') {
    return data.heightFeet !== undefined && data.heightInches !== undefined
  }
  return data.heightCm !== undefined
}, {
  message: 'Please enter a valid height',
  path: ['heightFeet'],
})

type Step1FormData = z.infer<typeof step1Schema>

interface Step1BasicProps {
  onNext: () => void
}

export default function Step1Basic({ onNext }: Step1BasicProps) {
  const { form, units, setFormField, setUnits } = useFormStore()
  const [localUnits, setLocalUnits] = useState(units)
  const [heightUnit, setHeightUnit] = useState<'feet-inches' | 'cm'>('feet-inches')

  const handleUnitToggle = () => {
    const newUnits = localUnits === 'imperial' ? 'metric' : 'imperial'
    setLocalUnits(newUnits)
    setUnits(newUnits)
  }

  const { register, handleSubmit, formState: { errors }, watch } = useForm<Step1FormData>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      sex: form.sex,
      age: form.age,
      heightUnit: form.heightCm ? 'cm' : 'feet-inches',
      heightFeet: form.heightFeet,
      heightInches: form.heightInches,
      heightCm: form.heightCm,
      weight: form.weight,
    },
    mode: 'onBlur',
  })

  const selectedHeightUnit = watch('heightUnit')

  const onSubmit = (data: Step1FormData) => {
    setFormField('sex', data.sex)
    setFormField('age', data.age)
    if (data.heightUnit === 'feet-inches') {
      setFormField('heightFeet', data.heightFeet)
      setFormField('heightInches', data.heightInches)
      setFormField('heightCm', undefined)
    } else {
      setFormField('heightCm', data.heightCm)
      setFormField('heightFeet', undefined)
      setFormField('heightInches', undefined)
    }
    setFormField('weight', data.weight)
    onNext()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-5 w-full"
    >
      {/* Unit Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={handleUnitToggle}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
            localUnits === 'imperial'
              ? 'bg-primary text-accent'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          lbs/in
        </button>
        <button
          type="button"
          onClick={handleUnitToggle}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
            localUnits === 'metric'
              ? 'bg-primary text-accent'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          kg/cm
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Sex */}
        <fieldset className="space-y-3">
          <legend className="block text-base font-semibold text-dark">Sex</legend>
          <div className="grid grid-cols-2 gap-4">
            <label className="relative flex items-center cursor-pointer">
              <input
                type="radio"
                value="male"
                {...register('sex')}
                className="w-4 h-4 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
              />
              <span className="ml-3 text-dark font-medium">Male</span>
            </label>
            <label className="relative flex items-center cursor-pointer">
              <input
                type="radio"
                value="female"
                {...register('sex')}
                className="w-4 h-4 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
              />
              <span className="ml-3 text-dark font-medium">Female</span>
            </label>
          </div>
        </fieldset>

        {/* Age */}
        <div>
          <label htmlFor="age" className="block text-base font-semibold text-dark mb-2">
            Age
          </label>
          <input
            id="age"
            type="number"
            {...register('age', { valueAsNumber: true })}
            min="14"
            max="99"
            placeholder="30"
            className="w-full px-4 py-3 rounded-lg border border-secondary/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all"
          />
          {errors.age && <p className="text-red-500 text-xs mt-1">{errors.age.message}</p>}
        </div>

        {/* Height Section */}
        <fieldset className="space-y-4">
          <legend className="block text-base font-semibold text-dark">Height</legend>

          {/* Height Unit Toggle - Radio Buttons */}
          <div className="flex gap-4 bg-slate-100 p-3 rounded-lg">
            <label className="relative flex items-center cursor-pointer flex-1">
              <input
                type="radio"
                value="feet-inches"
                {...register('heightUnit')}
                className="w-4 h-4 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
              />
              <span className="ml-3 text-dark font-medium">Feet & Inches</span>
            </label>
            <label className="relative flex items-center cursor-pointer flex-1">
              <input
                type="radio"
                value="cm"
                {...register('heightUnit')}
                className="w-4 h-4 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
              />
              <span className="ml-3 text-dark font-medium">Centimeters</span>
            </label>
          </div>

          {/* Feet & Inches Inputs */}
          {selectedHeightUnit === 'feet-inches' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-2 gap-4"
            >
              <div>
                <label htmlFor="heightFeet" className="block text-sm font-medium text-dark mb-2">
                  Feet
                </label>
                <input
                  id="heightFeet"
                  type="number"
                  {...register('heightFeet', { valueAsNumber: true })}
                  min="3"
                  max="8"
                  placeholder="6"
                  className="w-full px-4 py-3 rounded-lg border border-secondary/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all"
                />
              </div>
              <div>
                <label htmlFor="heightInches" className="block text-sm font-medium text-dark mb-2">
                  Inches
                </label>
                <input
                  id="heightInches"
                  type="number"
                  {...register('heightInches', { valueAsNumber: true })}
                  min="0"
                  max="11"
                  placeholder="2"
                  className="w-full px-4 py-3 rounded-lg border border-secondary/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all"
                />
              </div>
            </motion.div>
          )}

          {/* Centimeters Input */}
          {selectedHeightUnit === 'cm' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <label htmlFor="heightCm" className="block text-sm font-medium text-dark mb-2">
                Centimeters
              </label>
              <input
                id="heightCm"
                type="number"
                {...register('heightCm', { valueAsNumber: true })}
                min="100"
                max="250"
                placeholder="180"
                className="w-full px-4 py-3 rounded-lg border border-secondary/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all"
              />
            </motion.div>
          )}

          {errors.heightFeet || errors.heightInches || errors.heightCm ? (
            <p className="text-red-500 text-xs mt-1">Please enter a valid height</p>
          ) : null}
        </fieldset>

        {/* Weight */}
        <div>
          <label htmlFor="weight" className="block text-base font-semibold text-dark mb-2">
            Weight {localUnits === 'imperial' ? '(lbs)' : '(kg)'}
          </label>
          <input
            id="weight"
            type="number"
            {...register('weight', { valueAsNumber: true })}
            step="0.1"
            min="80"
            max="500"
            placeholder={localUnits === 'imperial' ? '200' : '90'}
            className="w-full px-4 py-3 rounded-lg border border-secondary/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all"
          />
          {errors.weight && <p className="text-red-500 text-xs mt-1">{errors.weight.message}</p>}
        </div>

        <button
          type="submit"
          className="w-full btn-primary mt-6"
        >
          Continue to Activity Level
        </button>
      </form>
    </motion.div>
  )
}
