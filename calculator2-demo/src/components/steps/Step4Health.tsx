import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useFormStore } from '../../stores/formStore'
import { motion } from 'framer-motion'
import { useEffect } from 'react'

const step4Schema = z.object({
  email: z.string().email('Valid email required'),
  firstName: z.string().optional(),
  medications: z.string().optional(),
  conditions: z.array(z.string()).optional(),
  allergies: z.string().optional(),
  avoidFoods: z.string().optional(),
})

type Step4FormData = z.infer<typeof step4Schema>

const healthConditions = [
  { id: 'diabetes', label: 'Type 2 Diabetes / Pre-diabetes' },
  { id: 'thyroid', label: 'Thyroid Issues (Hashimoto\'s, hypothyroid)' },
  { id: 'autoimmune', label: 'Autoimmune Condition' },
  { id: 'gut', label: 'Digestive Issues (IBS, Crohn\'s, colitis)' },
  { id: 'heart', label: 'Heart/Cardiovascular Condition' },
  { id: 'weight', label: 'Significant Weight Issues' },
]

interface Step4HealthProps {
  onNext: () => void
  onPrev: () => void
}

export default function Step4Health({ onNext, onPrev }: Step4HealthProps) {
  const { form, setFormField } = useFormStore()
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<Step4FormData>({
    resolver: zodResolver(step4Schema),
    defaultValues: {
      email: form.email,
      firstName: form.firstName,
      medications: form.medications,
      conditions: form.conditions || [],
      allergies: form.allergies,
      avoidFoods: form.avoidFoods,
    },
    mode: 'onBlur',
  })

  const conditions = watch('conditions') || []

  // Update form when stored data changes (e.g., after payment)
  useEffect(() => {
    console.log('[Step4] Form data from store:', {
      email: form.email,
      firstName: form.firstName,
      lastName: form.lastName,
      medications: form.medications,
    })
    // Use setValue to update individual fields
    if (form.email) {
      setValue('email', form.email)
      console.log('[Step4] Set email to:', form.email)
    }
    if (form.firstName) {
      setValue('firstName', form.firstName)
      console.log('[Step4] Set firstName to:', form.firstName)
    }
    if (form.medications) {
      setValue('medications', form.medications)
    }
    if (form.conditions) {
      setValue('conditions', form.conditions)
    }
    if (form.allergies) {
      setValue('allergies', form.allergies)
    }
    if (form.avoidFoods) {
      setValue('avoidFoods', form.avoidFoods)
    }
  }, [form.email, form.firstName, form.medications, form.conditions, form.allergies, form.avoidFoods, setValue])

  const onSubmit = (data: Step4FormData) => {
    setFormField('email', data.email)
    setFormField('firstName', data.firstName)
    setFormField('medications', data.medications)
    setFormField('conditions', data.conditions)
    setFormField('allergies', data.allergies)
    setFormField('avoidFoods', data.avoidFoods)
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
        <h2 className="text-2xl font-display font-bold text-dark mb-2">Health & Medical Info</h2>
        <p className="text-gray-600">Help us personalize your protocol (optional)</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Email */}
        <div>
          <label className="block text-sm font-semibold text-dark mb-2">Email Address *</label>
          <input
            type="email"
            {...register('email')}
            placeholder="your@email.com"
            className="w-full px-4 py-3 rounded-lg border border-secondary/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20"
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>

        {/* First Name */}
        <div>
          <label className="block text-sm font-semibold text-dark mb-2">First Name (optional)</label>
          <input
            type="text"
            {...register('firstName')}
            placeholder="e.g., John"
            className="w-full px-4 py-3 rounded-lg border border-secondary/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20"
          />
        </div>

        {/* Medications */}
        <div>
          <label className="block text-sm font-semibold text-dark mb-2">Current Medications (optional)</label>
          <textarea
            {...register('medications')}
            placeholder="e.g., Metformin for diabetes, levothyroxine for thyroid..."
            rows={3}
            className="w-full px-4 py-3 rounded-lg border border-secondary/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20 resize-none"
          />
        </div>

        {/* Health Conditions */}
        <div>
          <label className="block text-sm font-semibold text-dark mb-3">Existing Health Conditions (optional)</label>
          <div className="space-y-2">
            {healthConditions.map(({ id, label }) => (
              <label key={id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  value={id}
                  {...register('conditions')}
                  className="w-5 h-5 rounded border-secondary text-primary"
                />
                <span className="text-sm text-dark">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Allergies */}
        <div>
          <label className="block text-sm font-semibold text-dark mb-2">Food Allergies (optional)</label>
          <textarea
            {...register('allergies')}
            placeholder="e.g., Shellfish allergy, lactose intolerant, egg allergy"
            rows={3}
            className="w-full px-4 py-3 rounded-lg border border-secondary/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20 resize-none"
          />
        </div>

        {/* Foods to Avoid */}
        <div>
          <label className="block text-sm font-semibold text-dark mb-2">Foods You Can't/Won't Eat (optional)</label>
          <textarea
            {...register('avoidFoods')}
            placeholder="e.g., Don't like fish, can't digest dairy, won't eat organ meat"
            rows={3}
            className="w-full px-4 py-3 rounded-lg border border-secondary/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20 resize-none"
          />
        </div>

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
            Continue
          </button>
        </div>
      </form>
    </motion.div>
  )
}
