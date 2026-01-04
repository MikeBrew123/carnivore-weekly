import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// Validation schema
const step1Schema = z.object({
  current_medications: z.string().optional(),
  health_conditions: z.array(z.string()).optional(),
  other_health_issues: z.string().optional(),
  current_symptoms: z.array(z.string()).optional(),
  other_symptoms: z.string().optional(),
})

type Step1FormData = z.infer<typeof step1Schema>

interface Step1HealthSymptomsProps {
  onNext: (data: Step1FormData) => void
}

const HEALTH_CONDITIONS = [
  'Type 2 Diabetes / Pre-diabetes',
  'Thyroid Issues (Hashimoto\'s, hypothyroid)',
  'Autoimmune Condition',
  'Digestive Issues (IBS, Crohn\'s, colitis)',
  'Heart Disease / High Blood Pressure',
  'Mental Health (depression, anxiety)',
]

const CURRENT_SYMPTOMS = [
  'Bloating / Gas',
  'Brain Fog / Poor Focus',
  'Chronic Fatigue / Low Energy',
  'Joint Pain / Inflammation',
  'Skin Issues (acne, eczema, rosacea)',
  'Poor Sleep Quality',
  'Sugar Cravings / Food Addiction',
]

export default function Step1HealthSymptoms({ onNext }: Step1HealthSymptomsProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<Step1FormData>({
    resolver: zodResolver(step1Schema),
  })

  const onSubmit = (data: Step1FormData) => {
    console.log('Step 1 submitted:', data)
    onNext(data)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#ffd700] font-['Playfair_Display'] mb-2">
          Health & Symptoms
        </h2>
        <p className="text-[#f5f5f5] font-['Merriweather']">
          Help us understand your current health status. All fields are optional.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Current Medications */}
        <div>
          <label className="block text-sm font-medium text-[#a0a0a0] mb-2 font-['Merriweather']">
            Current Medications
          </label>
          <p className="text-xs text-[#666] mb-2">
            We ask about medications to ensure your macros account for any metabolic effects.
          </p>
          <textarea
            placeholder="List any medications you're currently taking..."
            className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg px-4 py-3 text-lg text-[#f5f5f5] placeholder-[#666] focus:border-[#ffd700] focus:ring-2 focus:ring-[#ffd700]/20 focus:outline-none transition-all font-['Merriweather'] resize-none"
            rows={3}
            {...register('current_medications')}
          />
        </div>

        {/* Health Conditions */}
        <div>
          <label className="block text-sm font-medium text-[#a0a0a0] mb-2 font-['Merriweather']">
            Health Conditions
          </label>
          <p className="text-xs text-[#666] mb-3">
            Your health conditions help us customize recommendations.
          </p>
          <div className="space-y-3">
            {HEALTH_CONDITIONS.map((condition) => (
              <label key={condition} className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  value={condition}
                  className="w-4 h-4 mt-1 text-[#ffd700] focus:ring-2 focus:ring-[#ffd700]"
                  {...register('health_conditions')}
                />
                <span className="ml-3 text-[#f5f5f5] font-['Merriweather']">{condition}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Other Health Issues */}
        <div>
          <label className="block text-sm font-medium text-[#a0a0a0] mb-2 font-['Merriweather']">
            Other Health Issues
          </label>
          <textarea
            placeholder="Any other health concerns not listed above..."
            className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg px-4 py-3 text-lg text-[#f5f5f5] placeholder-[#666] focus:border-[#ffd700] focus:ring-2 focus:ring-[#ffd700]/20 focus:outline-none transition-all font-['Merriweather'] resize-none"
            rows={3}
            {...register('other_health_issues')}
          />
        </div>

        {/* Current Symptoms */}
        <div>
          <label className="block text-sm font-medium text-[#a0a0a0] mb-2 font-['Merriweather']">
            Current Symptoms
          </label>
          <p className="text-xs text-[#666] mb-3">
            Select any symptoms you're currently experiencing.
          </p>
          <div className="space-y-3">
            {CURRENT_SYMPTOMS.map((symptom) => (
              <label key={symptom} className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  value={symptom}
                  className="w-4 h-4 mt-1 text-[#ffd700] focus:ring-2 focus:ring-[#ffd700]"
                  {...register('current_symptoms')}
                />
                <span className="ml-3 text-[#f5f5f5] font-['Merriweather']">{symptom}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Other Symptoms */}
        <div>
          <label className="block text-sm font-medium text-[#a0a0a0] mb-2 font-['Merriweather']">
            Other Symptoms
          </label>
          <textarea
            placeholder="Any other symptoms not listed above..."
            className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg px-4 py-3 text-lg text-[#f5f5f5] placeholder-[#666] focus:border-[#ffd700] focus:ring-2 focus:ring-[#ffd700]/20 focus:outline-none transition-all font-['Merriweather'] resize-none"
            rows={3}
            {...register('other_symptoms')}
          />
        </div>

        {/* Navigation Buttons */}
        <div className="pt-6 flex gap-3">
          <button
            type="submit"
            className="flex-1 bg-[#ffd700] hover:bg-[#e6c200] text-[#1a120b] font-semibold py-4 px-6 rounded-lg text-lg transition-all hover:-translate-y-0.5 font-['Playfair_Display']"
          >
            Continue to Step 2
          </button>
        </div>
      </form>
    </div>
  )
}
