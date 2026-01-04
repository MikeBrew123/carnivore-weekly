import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const step4Schema = z.object({
  email: z.string().email('Please enter a valid email'),
  first_name: z.string().optional(),
  food_allergies: z.string().optional(),
  foods_wont_eat: z.string().optional(),
  dairy_tolerance: z.string().optional(),
})

type Step4FormData = z.infer<typeof step4Schema>

interface Step4ContactProps {
  onNext: (data: Step4FormData) => void
  onBack: () => void
}

export default function Step4Contact({ onNext, onBack }: Step4ContactProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Step4FormData>({
    resolver: zodResolver(step4Schema),
  })

  const onSubmit = (data: Step4FormData) => {
    console.log('Step 4 submitted:', data)
    onNext(data)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#ffd700] font-['Playfair_Display'] mb-2">
          Contact & Restrictions
        </h2>
        <p className="text-[#f5f5f5] font-['Merriweather']">
          Final step. Your email is required to receive your report.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-[#a0a0a0] mb-2 font-['Merriweather']">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            placeholder="you@example.com"
            className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg px-4 py-3 text-lg text-[#f5f5f5] placeholder-[#666] focus:border-[#ffd700] focus:ring-2 focus:ring-[#ffd700]/20 focus:outline-none transition-all font-['Merriweather']"
            {...register('email')}
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
          )}
        </div>

        {/* First Name */}
        <div>
          <label className="block text-sm font-medium text-[#a0a0a0] mb-2 font-['Merriweather']">
            First Name
          </label>
          <input
            type="text"
            placeholder="John (optional)"
            className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg px-4 py-3 text-lg text-[#f5f5f5] placeholder-[#666] focus:border-[#ffd700] focus:ring-2 focus:ring-[#ffd700]/20 focus:outline-none transition-all font-['Merriweather']"
            {...register('first_name')}
          />
        </div>

        {/* Food Allergies */}
        <div>
          <label className="block text-sm font-medium text-[#a0a0a0] mb-2 font-['Merriweather']">
            Food Allergies
          </label>
          <textarea
            placeholder="Any allergies we should be aware of (shellfish, tree nuts, etc.)?"
            className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg px-4 py-3 text-lg text-[#f5f5f5] placeholder-[#666] focus:border-[#ffd700] focus:ring-2 focus:ring-[#ffd700]/20 focus:outline-none transition-all font-['Merriweather'] resize-none"
            rows={3}
            {...register('food_allergies')}
          />
        </div>

        {/* Foods Won't Eat */}
        <div>
          <label className="block text-sm font-medium text-[#a0a0a0] mb-2 font-['Merriweather']">
            Foods You Won't Eat
          </label>
          <textarea
            placeholder="e.g., organ meats, pork, certain fish..."
            className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg px-4 py-3 text-lg text-[#f5f5f5] placeholder-[#666] focus:border-[#ffd700] focus:ring-2 focus:ring-[#ffd700]/20 focus:outline-none transition-all font-['Merriweather'] resize-none"
            rows={3}
            {...register('foods_wont_eat')}
          />
        </div>

        {/* Dairy Tolerance */}
        <div>
          <label className="block text-sm font-medium text-[#a0a0a0] mb-2 font-['Merriweather']">
            Dairy Tolerance
          </label>
          <select
            className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg px-4 py-3 text-lg text-[#f5f5f5] focus:border-[#ffd700] focus:ring-2 focus:ring-[#ffd700]/20 focus:outline-none transition-all font-['Merriweather']"
            {...register('dairy_tolerance')}
          >
            <option value="">Select your tolerance</option>
            <option value="full">Full dairy (butter, cheese, milk, cream)</option>
            <option value="some">Some dairy (butter and hard cheese only)</option>
            <option value="none">No dairy at all</option>
          </select>
        </div>

        {/* Privacy Notice */}
        <div className="bg-[#0f0f0f] border border-[#333] rounded-lg p-4">
          <p className="text-xs text-[#999] font-['Merriweather'] leading-relaxed">
            Your information stays private. We use it solely to generate your personalized
            report and won't share it with anyone. Your report will expire after 48 hours.
          </p>
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
            Review & Pay
          </button>
        </div>
      </form>
    </div>
  )
}
