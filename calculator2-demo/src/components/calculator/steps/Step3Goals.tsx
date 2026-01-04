import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const step3Schema = z.object({
  primary_goals: z.array(z.string()).max(3, 'Select up to 3 goals'),
  biggest_challenge: z.string().optional(),
  anything_else: z.string().optional(),
})

type Step3FormData = z.infer<typeof step3Schema>

interface Step3GoalsProps {
  onNext: (data: Step3FormData) => void
  onBack: () => void
}

const GOAL_OPTIONS = [
  'Weight Loss',
  'Build Muscle',
  'More Energy',
  'Mental Clarity / Focus',
  'Fix Gut Health',
  'Reduce Inflammation',
  'Manage Autoimmune Condition',
  'Simplify My Life / End Food Obsession',
]

export default function Step3Goals({ onNext, onBack }: Step3GoalsProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Step3FormData>({
    resolver: zodResolver(step3Schema),
  })

  const selectedGoals = watch('primary_goals') || []

  const onSubmit = (data: Step3FormData) => {
    console.log('Step 3 submitted:', data)
    onNext(data)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#ffd700] font-['Playfair_Display'] mb-2">
          Goals & Priorities
        </h2>
        <p className="text-[#f5f5f5] font-['Merriweather']">
          Select up to 3 primary goals for your carnivore journey.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Primary Goals */}
        <div>
          <label className="block text-sm font-medium text-[#a0a0a0] mb-3 font-['Merriweather']">
            Primary Goals <span className="text-red-500">*</span>
            <span className="text-xs text-[#666] ml-2">
              (Select up to 3)
            </span>
          </label>
          <div className="space-y-3">
            {GOAL_OPTIONS.map((goal) => (
              <label key={goal} className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  value={goal}
                  disabled={selectedGoals.length >= 3 && !selectedGoals.includes(goal)}
                  className="w-4 h-4 mt-1 text-[#ffd700] focus:ring-2 focus:ring-[#ffd700] disabled:opacity-50"
                  {...register('primary_goals')}
                />
                <span className={`ml-3 font-['Merriweather'] ${
                  selectedGoals.length >= 3 && !selectedGoals.includes(goal)
                    ? 'text-[#666]'
                    : 'text-[#f5f5f5]'
                }`}>
                  {goal}
                </span>
              </label>
            ))}
          </div>
          {errors.primary_goals && (
            <p className="text-red-500 text-sm mt-2">{errors.primary_goals.message}</p>
          )}
        </div>

        {/* Biggest Challenge */}
        <div>
          <label className="block text-sm font-medium text-[#a0a0a0] mb-2 font-['Merriweather']">
            Biggest Challenge
          </label>
          <p className="text-xs text-[#666] mb-2">
            What's the main obstacle you anticipate on carnivore?
          </p>
          <textarea
            placeholder="e.g., Staying consistent with meal prep, family meals, food cravings..."
            className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg px-4 py-3 text-lg text-[#f5f5f5] placeholder-[#666] focus:border-[#ffd700] focus:ring-2 focus:ring-[#ffd700]/20 focus:outline-none transition-all font-['Merriweather'] resize-none"
            rows={3}
            {...register('biggest_challenge')}
          />
        </div>

        {/* Anything Else */}
        <div>
          <label className="block text-sm font-medium text-[#a0a0a0] mb-2 font-['Merriweather']">
            Anything Else?
          </label>
          <textarea
            placeholder="Any additional information or context we should know?"
            className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg px-4 py-3 text-lg text-[#f5f5f5] placeholder-[#666] focus:border-[#ffd700] focus:ring-2 focus:ring-[#ffd700]/20 focus:outline-none transition-all font-['Merriweather'] resize-none"
            rows={3}
            {...register('anything_else')}
          />
        </div>

        {/* Navigation */}
        <div className="pt-6 flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 bg-transparent border border-[#ffd700] text-[#ffd700] font-semibold py-4 px-6 rounded-lg text-lg transition-all hover:bg-[#ffd700]/10 font-['Playfair_Display']"
          >
            Back
          </button>
          <button
            type="submit"
            className="flex-1 bg-[#ffd700] hover:bg-[#e6c200] text-[#1a120b] font-semibold py-4 px-6 rounded-lg text-lg transition-all hover:-translate-y-0.5 font-['Playfair_Display']"
          >
            Continue to Step 4
          </button>
        </div>
      </form>
    </div>
  )
}
