import { useForm } from 'react-hook-form'
import { useFormStore } from '../../stores/formStore'
import { motion } from 'framer-motion'

const primaryGoals = [
  { id: 'weightloss', label: 'Weight Loss' },
  { id: 'muscle', label: 'Build Muscle' },
  { id: 'energy', label: 'More Energy' },
  { id: 'mental', label: 'Mental Clarity / Focus' },
  { id: 'guthealth', label: 'Fix Gut Health' },
  { id: 'inflammation', label: 'Reduce Inflammation' },
]

interface Step5PreferencesProps {
  onNext: () => void
  onPrev: () => void
}

export default function Step5Preferences({ onNext, onPrev }: Step5PreferencesProps) {
  const { form, setFormField } = useFormStore()
  const { register, handleSubmit, watch } = useForm({
    defaultValues: {
      previousDiets: form.previousDiets,
      whatWorked: form.whatWorked,
      carnivoreExperience: form.carnivoreExperience,
      selectedProtocol: form.selectedProtocol,
      goals: form.goals || [],
      biggestChallenge: form.biggestChallenge,
      cookingSkill: form.cookingSkill,
      budget: form.budget,
      familySituation: form.familySituation,
      workTravel: form.workTravel,
      additionalNotes: form.additionalNotes,
    },
    mode: 'onChange',
  })

  const goals = watch('goals') || []

  const onSubmit = (data: any) => {
    setFormField('previousDiets', data.previousDiets)
    setFormField('whatWorked', data.whatWorked)
    setFormField('carnivoreExperience', data.carnivoreExperience)
    setFormField('selectedProtocol', data.selectedProtocol)
    setFormField('goals', data.goals)
    setFormField('biggestChallenge', data.biggestChallenge)
    setFormField('cookingSkill', data.cookingSkill)
    setFormField('budget', data.budget)
    setFormField('familySituation', data.familySituation)
    setFormField('workTravel', data.workTravel)
    setFormField('additionalNotes', data.additionalNotes)
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
        <h2 className="text-2xl font-display font-bold text-dark mb-2">Goals & Preferences</h2>
        <p className="text-gray-600">What matters most to you? (optional)</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Previous Diets */}
        <div>
          <label className="block text-sm font-semibold text-dark mb-2">Previous Diets Tried (optional)</label>
          <textarea
            {...register('previousDiets')}
            placeholder="e.g., Keto for 6 months (lost weight but plateaued), vegan (felt terrible)..."
            rows={3}
            className="w-full px-4 py-3 rounded-lg border border-secondary/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20 resize-none"
          />
        </div>

        {/* Carnivore Experience */}
        <div>
          <label className="block text-sm font-semibold text-dark mb-2">Carnivore Experience (optional)</label>
          <select
            {...register('carnivoreExperience')}
            className="w-full px-4 py-3 rounded-lg border border-secondary/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20"
          >
            <option value="">Select one...</option>
            <option value="never">Never tried carnivore</option>
            <option value="dabbled">Tried it briefly (days/weeks)</option>
            <option value="months">Did it for months</option>
            <option value="current">Currently on carnivore</option>
          </select>
        </div>

        {/* Protocol Preference */}
        <div>
          <label className="block text-sm font-semibold text-dark mb-2">Which Protocol Interests You? (optional)</label>
          <select
            {...register('selectedProtocol')}
            className="w-full px-4 py-3 rounded-lg border border-secondary/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20"
          >
            <option value="">Select one...</option>
            <option value="carnivore">Carnivore (beef, poultry, fish, eggs, dairy)</option>
            <option value="pescatarian">Pescatarian Carnivore (fish, eggs, dairy only)</option>
            <option value="lion">Lion Diet (beef, salt, water only)</option>
            <option value="keto">Keto (low-carb, includes some plants)</option>
          </select>
        </div>

        {/* Primary Goals */}
        <div>
          <label className="block text-sm font-semibold text-dark mb-3">Primary Goals - Select Top 3 (optional)</label>
          <div className="space-y-2">
            {primaryGoals.map(({ id, label }) => (
              <label key={id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  value={id}
                  {...register('goals')}
                  disabled={goals.length >= 3 && !goals.includes(id)}
                  className="w-5 h-5 rounded border-secondary text-primary disabled:opacity-50"
                />
                <span className="text-sm text-dark">{label}</span>
              </label>
            ))}
          </div>
          {goals.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">Selected: {goals.length}/3</p>
          )}
        </div>

        {/* What Worked */}
        <div>
          <label className="block text-sm font-semibold text-dark mb-2">What Has Worked Well for You? (optional)</label>
          <textarea
            {...register('whatWorked')}
            placeholder="What dietary or lifestyle changes have worked well in the past? What made them successful?"
            rows={2}
            className="w-full px-4 py-3 rounded-lg border border-secondary/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20 resize-none"
          />
        </div>

        {/* Biggest Challenge */}
        <div>
          <label className="block text-sm font-semibold text-dark mb-2">Biggest Challenge (optional)</label>
          <textarea
            {...register('biggestChallenge')}
            placeholder="What's your biggest challenge with diet or health right now?"
            rows={2}
            className="w-full px-4 py-3 rounded-lg border border-secondary/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20 resize-none"
          />
        </div>

        {/* Cooking Skill */}
        <div>
          <label className="block text-sm font-semibold text-dark mb-2">Cooking Skill Level (optional)</label>
          <select
            {...register('cookingSkill')}
            className="w-full px-4 py-3 rounded-lg border border-secondary/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20"
          >
            <option value="">Select one...</option>
            <option value="beginner">Beginner - Simple recipes only</option>
            <option value="intermediate">Intermediate - Comfortable with most recipes</option>
            <option value="advanced">Advanced - Enjoy complex cooking</option>
            <option value="no-time">Limited - Need quick/easy meals</option>
          </select>
        </div>

        {/* Budget */}
        <div>
          <label className="block text-sm font-semibold text-dark mb-2">Budget Level (optional)</label>
          <select
            {...register('budget')}
            className="w-full px-4 py-3 rounded-lg border border-secondary/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20"
          >
            <option value="">Select one...</option>
            <option value="budget-conscious">Budget Conscious - Affordable options</option>
            <option value="moderate">Moderate - Middle of the road</option>
            <option value="premium">Premium - Quality over price</option>
          </select>
        </div>

        {/* Family Situation */}
        <div>
          <label className="block text-sm font-semibold text-dark mb-2">Family Situation (optional)</label>
          <select
            {...register('familySituation')}
            className="w-full px-4 py-3 rounded-lg border border-secondary/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20"
          >
            <option value="">Select one...</option>
            <option value="single">Single - Cooking for myself</option>
            <option value="partner">Partner/Spouse - Just 2 of us</option>
            <option value="family-with-kids">Family with Kids - Need variety</option>
            <option value="extended">Extended Family - Multiple people</option>
          </select>
        </div>

        {/* Work/Travel */}
        <div>
          <label className="block text-sm font-semibold text-dark mb-2">Work & Travel Schedule (optional)</label>
          <select
            {...register('workTravel')}
            className="w-full px-4 py-3 rounded-lg border border-secondary/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20"
          >
            <option value="">Select one...</option>
            <option value="office">Office-based - Regular schedule</option>
            <option value="work-from-home">Work from Home - Flexible</option>
            <option value="frequent-travel">Frequent Travel - Always on the go</option>
            <option value="shift-work">Shift Work - Variable schedule</option>
          </select>
        </div>

        {/* Additional Notes */}
        <div>
          <label className="block text-sm font-semibold text-dark mb-2">Anything Else We Should Know? (optional)</label>
          <textarea
            {...register('additionalNotes')}
            placeholder="Any other preferences, constraints, or information that would help us personalize your protocol..."
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
