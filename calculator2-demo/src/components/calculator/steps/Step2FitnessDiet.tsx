import { FormData } from '../../../types/form'
import SelectField from '../shared/SelectField'
import RadioGroup from '../shared/RadioGroup'

interface Step2FitnessDietProps {
  data: FormData
  onDataChange: (data: FormData) => void
  onContinue: () => void
  onBack: () => void
  errors: Record<string, string>
}

export default function Step2FitnessDiet({
  data,
  onDataChange,
  onContinue,
  onBack,
  errors,
}: Step2FitnessDietProps) {
  const handleInputChange = (field: string, value: any) => {
    onDataChange({ ...data, [field]: value })
  }

  const handleContinue = () => {
    const newErrors: Record<string, string> = {}

    if (!data.lifestyle) newErrors.lifestyle = 'Please select your activity level'
    if (!data.exercise) newErrors.exercise = 'Please select your exercise frequency'
    if (!data.goal) newErrors.goal = 'Please select your goal'
    if (!data.deficit) newErrors.deficit = 'Please select your deficit percentage'
    if (!data.diet) newErrors.diet = 'Please select your diet type'

    if (Object.keys(newErrors).length > 0) {
      Object.entries(newErrors).forEach(([key, msg]) => {
        errors[key] = msg
      })
      return
    }

    onContinue()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Activity & Goals</h2>
        <p className="text-gray-600">These help us tailor your macros to your lifestyle.</p>
      </div>

      {/* Lifestyle Activity Level */}
      <SelectField
        name="lifestyle"
        label="Activity Level"
        options={[
          { value: '', label: 'Select activity level', disabled: true },
          { value: 'sedentary', label: '🪑 Sedentary (desk job, little exercise)' },
          { value: 'light', label: '🚶 Lightly Active (light exercise 1-3 days/week)' },
          { value: 'moderate', label: '🏃 Moderately Active (exercise 3-5 days/week)' },
          { value: 'very', label: '💪 Very Active (hard exercise 6-7 days/week)' },
          { value: 'extreme', label: '🔥 Extremely Active (physical job + hard exercise)' },
        ]}
        value={data.lifestyle || ''}
        onChange={(e) => handleInputChange('lifestyle', e.target.value)}
        error={errors.lifestyle}
        required
      />

      {/* Exercise Frequency */}
      <SelectField
        name="exercise"
        label="Exercise Frequency"
        options={[
          { value: '', label: 'Select frequency', disabled: true },
          { value: 'none', label: 'No structured exercise' },
          { value: '1-2', label: '1-2 days per week' },
          { value: '3-4', label: '3-4 days per week' },
          { value: '5-6', label: '5-6 days per week' },
          { value: '7', label: '7 days per week' },
        ]}
        value={data.exercise || ''}
        onChange={(e) => handleInputChange('exercise', e.target.value)}
        error={errors.exercise}
        required
      />

      {/* Goal */}
      <RadioGroup
        name="goal"
        label="What's Your Goal?"
        options={[
          { value: 'lose', label: 'Fat Loss', description: 'Lose weight while preserving muscle' },
          { value: 'maintain', label: 'Maintenance', description: 'Maintain current weight' },
          { value: 'gain', label: 'Muscle Gain', description: 'Build muscle mass' },
        ]}
        value={data.goal || ''}
        onChange={(value) => handleInputChange('goal', value)}
        error={errors.goal}
        required
      />

      {/* Deficit/Surplus Percentage */}
      {(data.goal === 'lose' || data.goal === 'gain') && (
        <SelectField
          name="deficit"
          label={data.goal === 'lose' ? 'Deficit Target' : 'Surplus Target'}
          options={[
            { value: '', label: `Select ${data.goal === 'lose' ? 'deficit' : 'surplus'}`, disabled: true },
            { value: '10', label: '10% (Conservative, sustainable)' },
            { value: '15', label: '15% (Moderate)' },
            { value: '20', label: '20% (Aggressive)' },
            { value: '25', label: '25% (Very aggressive)' },
          ]}
          value={data.deficit?.toString() || ''}
          onChange={(e) => handleInputChange('deficit', parseInt(e.target.value) || '')}
          error={errors.deficit}
          required
        />
      )}

      {data.goal === 'maintain' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            ℹ️ At maintenance, you'll eat at your TDEE (Total Daily Energy Expenditure).
          </p>
        </div>
      )}

      {/* Diet Type */}
      <SelectField
        name="diet"
        label="Diet Preference"
        options={[
          { value: '', label: 'Select diet type', disabled: true },
          { value: 'carnivore', label: '🥩 Carnivore (beef, lamb, organs only)' },
          { value: 'pescatarian', label: '🐟 Pescatarian (add fish & seafood)' },
          { value: 'keto', label: '⚡ Keto (low-carb, fat-focused)' },
          { value: 'lowcarb', label: '🥕 Low-Carb (moderate carbs)' },
        ]}
        value={data.diet || ''}
        onChange={(e) => handleInputChange('diet', e.target.value)}
        error={errors.diet}
        required
      />

      {/* Navigation Buttons */}
      <div className="pt-6 flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium py-3 rounded-lg transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors"
        >
          See Your Results
        </button>
      </div>
    </div>
  )
}
