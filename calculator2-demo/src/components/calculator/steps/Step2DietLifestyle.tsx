import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const step2Schema = z.object({
  previous_diets: z.string().optional(),
  carnivore_experience: z.string().optional(),
  diet_protocol: z.string().optional(),
  what_worked: z.string().optional(),
  cooking_ability: z.string().optional(),
  meal_prep_time: z.string().optional(),
  budget: z.string().optional(),
  family_situation: z.string().optional(),
  work_travel: z.string().optional(),
})

type Step2FormData = z.infer<typeof step2Schema>

interface Step2DietLifestyleProps {
  onNext: (data: Step2FormData) => void
  onBack: () => void
}

export default function Step2DietLifestyle({ onNext, onBack }: Step2DietLifestyleProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Step2FormData>({
    resolver: zodResolver(step2Schema),
  })

  const onSubmit = (data: Step2FormData) => {
    console.log('Step 2 submitted:', data)
    onNext(data)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#ffd700] font-['Playfair_Display'] mb-2">
          Diet & Lifestyle
        </h2>
        <p className="text-[#f5f5f5] font-['Merriweather']">
          Tell us about your dietary history and lifestyle.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Previous Diets */}
        <div>
          <label className="block text-sm font-medium text-[#a0a0a0] mb-2 font-['Merriweather']">
            Previous Diets
          </label>
          <textarea
            placeholder="e.g., Low-carb, keto, vegan, Mediterranean..."
            className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg px-4 py-3 text-lg text-[#f5f5f5] placeholder-[#666] focus:border-[#ffd700] focus:ring-2 focus:ring-[#ffd700]/20 focus:outline-none transition-all font-['Merriweather'] resize-none"
            rows={3}
            {...register('previous_diets')}
          />
        </div>

        {/* Carnivore Experience */}
        <div>
          <label className="block text-sm font-medium text-[#a0a0a0] mb-2 font-['Merriweather']">
            Carnivore Experience
          </label>
          <select
            className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg px-4 py-3 text-lg text-[#f5f5f5] focus:border-[#ffd700] focus:ring-2 focus:ring-[#ffd700]/20 focus:outline-none transition-all font-['Merriweather']"
            {...register('carnivore_experience')}
          >
            <option value="">Select experience level</option>
            <option value="never">Never tried carnivore</option>
            <option value="briefly">Tried it briefly (days/weeks)</option>
            <option value="months">Did it for months</option>
            <option value="current">Currently carnivore</option>
          </select>
        </div>

        {/* Diet Protocol */}
        <div>
          <label className="block text-sm font-medium text-[#a0a0a0] mb-2 font-['Merriweather']">
            Preferred Diet Protocol
          </label>
          <select
            className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg px-4 py-3 text-lg text-[#f5f5f5] focus:border-[#ffd700] focus:ring-2 focus:ring-[#ffd700]/20 focus:outline-none transition-all font-['Merriweather']"
            {...register('diet_protocol')}
          >
            <option value="">Select protocol</option>
            <option value="carnivore">Carnivore (beef, poultry, fish, eggs, dairy)</option>
            <option value="pescatarian">Pescatarian Carnivore (fish, eggs, dairy only)</option>
            <option value="lion">Lion Diet (beef, salt, water only)</option>
            <option value="keto">Keto (low-carb, includes some plants)</option>
          </select>
        </div>

        {/* What Worked */}
        <div>
          <label className="block text-sm font-medium text-[#a0a0a0] mb-2 font-['Merriweather']">
            What Worked for You
          </label>
          <textarea
            placeholder="What dietary approaches or strategies have worked best for you in the past?"
            className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg px-4 py-3 text-lg text-[#f5f5f5] placeholder-[#666] focus:border-[#ffd700] focus:ring-2 focus:ring-[#ffd700]/20 focus:outline-none transition-all font-['Merriweather'] resize-none"
            rows={3}
            {...register('what_worked')}
          />
        </div>

        {/* Cooking Ability */}
        <div>
          <label className="block text-sm font-medium text-[#a0a0a0] mb-2 font-['Merriweather']">
            Cooking Ability
          </label>
          <select
            className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg px-4 py-3 text-lg text-[#f5f5f5] focus:border-[#ffd700] focus:ring-2 focus:ring-[#ffd700]/20 focus:outline-none transition-all font-['Merriweather']"
            {...register('cooking_ability')}
          >
            <option value="">Select skill level</option>
            <option value="beginner">Beginner (can barely boil water)</option>
            <option value="basic">Basic (can follow recipes)</option>
            <option value="intermediate">Intermediate (comfortable in kitchen)</option>
            <option value="advanced">Advanced (love cooking)</option>
          </select>
        </div>

        {/* Meal Prep Time */}
        <div>
          <label className="block text-sm font-medium text-[#a0a0a0] mb-2 font-['Merriweather']">
            Meal Prep Time Available
          </label>
          <select
            className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg px-4 py-3 text-lg text-[#f5f5f5] focus:border-[#ffd700] focus:ring-2 focus:ring-[#ffd700]/20 focus:outline-none transition-all font-['Merriweather']"
            {...register('meal_prep_time')}
          >
            <option value="">Select time available</option>
            <option value="minimal">Minimal (less than 1 hour/week)</option>
            <option value="some">Some (1-3 hours/week)</option>
            <option value="moderate">Moderate (3-5 hours/week)</option>
            <option value="plenty">Plenty (5+ hours/week)</option>
          </select>
        </div>

        {/* Budget */}
        <div>
          <label className="block text-sm font-medium text-[#a0a0a0] mb-2 font-['Merriweather']">
            Budget Level
          </label>
          <select
            className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg px-4 py-3 text-lg text-[#f5f5f5] focus:border-[#ffd700] focus:ring-2 focus:ring-[#ffd700]/20 focus:outline-none transition-all font-['Merriweather']"
            {...register('budget')}
          >
            <option value="">Select budget level</option>
            <option value="tight">Tight budget (ground beef, eggs, cheap cuts)</option>
            <option value="moderate">Moderate (some variety)</option>
            <option value="flexible">Flexible (can afford ribeye, salmon)</option>
            <option value="unlimited">No budget concerns</option>
          </select>
        </div>

        {/* Family Situation */}
        <div>
          <label className="block text-sm font-medium text-[#a0a0a0] mb-2 font-['Merriweather']">
            Family Situation
          </label>
          <select
            className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg px-4 py-3 text-lg text-[#f5f5f5] focus:border-[#ffd700] focus:ring-2 focus:ring-[#ffd700]/20 focus:outline-none transition-all font-['Merriweather']"
            {...register('family_situation')}
          >
            <option value="">Select situation</option>
            <option value="solo">Cooking for myself only</option>
            <option value="partner">Cooking for partner too (also carnivore)</option>
            <option value="mixed">Cooking for family (mixed diets)</option>
            <option value="kids">Cooking for kids (need family-friendly options)</option>
          </select>
        </div>

        {/* Work/Travel */}
        <div>
          <label className="block text-sm font-medium text-[#a0a0a0] mb-2 font-['Merriweather']">
            Work & Travel Constraints
          </label>
          <textarea
            placeholder="Any work travel, unusual schedules, or lifestyle constraints we should know about?"
            className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg px-4 py-3 text-lg text-[#f5f5f5] placeholder-[#666] focus:border-[#ffd700] focus:ring-2 focus:ring-[#ffd700]/20 focus:outline-none transition-all font-['Merriweather'] resize-none"
            rows={3}
            {...register('work_travel')}
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
            Continue to Step 3
          </button>
        </div>
      </form>
    </div>
  )
}
