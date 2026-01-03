import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useFormStore } from '../../stores/formStore'
import { motion } from 'framer-motion'
import { useState } from 'react'

const step1Schema = z.object({
  sex: z.enum(['male', 'female']),
  age: z.number().min(14).max(99),
  heightFeet: z.number().min(3).max(8).optional(),
  heightInches: z.number().min(0).max(11).optional(),
  heightCm: z.number().min(120).max(230).optional(),
  weight: z.number().min(80).max(500),
})

type Step1FormData = z.infer<typeof step1Schema>

interface Step1BasicProps {
  onNext: () => void
}

export default function Step1Basic({ onNext }: Step1BasicProps) {
  const { form, units, setFormField, setUnits } = useFormStore()
  const [localUnits, setLocalUnits] = useState(units)

  const handleUnitToggle = () => {
    const newUnits = localUnits === 'imperial' ? 'metric' : 'imperial'
    setLocalUnits(newUnits)
    setUnits(newUnits)
  }

  const { register, handleSubmit, formState: { errors } } = useForm<Step1FormData>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      sex: form.sex,
      age: form.age,
      heightFeet: form.heightFeet,
      heightInches: form.heightInches,
      heightCm: form.heightCm,
      weight: form.weight,
    },
    mode: 'onBlur',
  })

  const onSubmit = (data: Step1FormData) => {
    setFormField('sex', data.sex)
    setFormField('age', data.age)
    if (localUnits === 'imperial') {
      setFormField('heightFeet', data.heightFeet)
      setFormField('heightInches', data.heightInches)
    } else {
      setFormField('heightCm', data.heightCm)
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
      <div className="flex gap-2 mb-2">
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Sex */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="sex" className="block text-sm font-semibold text-dark mb-2">Sex</label>
            <select
              id="sex"
              {...register('sex')}
              className="w-full px-4 py-3 rounded-lg border border-secondary/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          <div>
            <label htmlFor="age" className="block text-sm font-semibold text-dark mb-2">Age</label>
            <input
              id="age"
              type="number"
              {...register('age', { valueAsNumber: true })}
              min="14"
              max="99"
              className="w-full px-4 py-3 rounded-lg border border-secondary/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20"
            />
            {errors.age && <p className="text-red-500 text-xs mt-1">{errors.age.message}</p>}
          </div>
        </div>

        {/* Height */}
        <div>
          <label htmlFor="heightCm" className="block text-sm font-semibold text-dark mb-2">
            Height {localUnits === 'imperial' ? '(feet & inches)' : '(cm)'}
          </label>
          {localUnits === 'imperial' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  id="heightFeet"
                  type="number"
                  {...register('heightFeet', { valueAsNumber: true })}
                  min="3"
                  max="8"
                  placeholder="Feet"
                  className="w-full px-4 py-3 rounded-lg border border-secondary/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                />
              </div>
              <div>
                <input
                  id="heightInches"
                  type="number"
                  {...register('heightInches', { valueAsNumber: true })}
                  min="0"
                  max="11"
                  placeholder="Inches"
                  className="w-full px-4 py-3 rounded-lg border border-secondary/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                />
              </div>
            </div>
          ) : (
            <input
              id="heightCm"
              type="number"
              {...register('heightCm', { valueAsNumber: true })}
              min="120"
              max="230"
              placeholder="Centimeters"
              className="w-full px-4 py-3 rounded-lg border border-secondary/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20"
            />
          )}
          {(errors.heightFeet || errors.heightInches || errors.heightCm) && (
            <p className="text-red-500 text-xs mt-1">Please enter valid height</p>
          )}
        </div>

        {/* Weight */}
        <div>
          <label htmlFor="weight" className="block text-sm font-semibold text-dark mb-2">
            Weight {localUnits === 'imperial' ? '(lbs)' : '(kg)'}
          </label>
          <input
            id="weight"
            type="number"
            {...register('weight', { valueAsNumber: true })}
            step="0.1"
            min="80"
            max="500"
            className="w-full px-4 py-3 rounded-lg border border-secondary/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20"
          />
          {errors.weight && <p className="text-red-500 text-xs mt-1">{errors.weight.message}</p>}
        </div>


        <button
          type="submit"
          className="w-full btn-primary"
        >
          Continue to Activity Level
        </button>
      </form>
    </motion.div>
  )
}
