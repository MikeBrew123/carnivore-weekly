import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useFormStore } from '../../stores/formStore'
import { motion } from 'framer-motion'

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
  const { form, units, setFormField } = useFormStore()
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
    if (units === 'imperial') {
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
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-display font-bold text-dark mb-2">Let's Get Started</h2>
        <p className="text-gray-600">Basic information about you</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Sex */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-dark mb-2">Sex</label>
            <select
              {...register('sex')}
              className="w-full px-4 py-3 rounded-lg border border-secondary/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-dark mb-2">Age</label>
            <input
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
          <label className="block text-sm font-semibold text-dark mb-2">
            Height {units === 'imperial' ? '(feet & inches)' : '(cm)'}
          </label>
          {units === 'imperial' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
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
          <label className="block text-sm font-semibold text-dark mb-2">
            Weight {units === 'imperial' ? '(lbs)' : '(kg)'}
          </label>
          <input
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
