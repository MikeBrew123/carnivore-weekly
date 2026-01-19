import { FormData } from '../../../types/form'
import SelectField from '../shared/SelectField'
import RadioGroup from '../shared/RadioGroup'

interface Step2FitnessDietProps {
  data: FormData
  onDataChange: (data: FormData) => void
  onContinue: () => void
  onBack: () => void
  onFieldChange?: (fieldName: string) => void
  onSetErrors?: (errors: Record<string, string>) => void
  errors: Record<string, string>
}

export default function Step2FitnessDiet({
  data,
  onDataChange,
  onContinue,
  onBack,
  onFieldChange,
  onSetErrors,
  errors,
}: Step2FitnessDietProps) {
  const handleInputChange = (field: string, value: any) => {
    onDataChange({ ...data, [field]: value })
    // Clear error for this field if it has a value
    if (value !== '' && value !== undefined && value !== null && onFieldChange) {
      onFieldChange(field)
    }
  }

  const handleContinue = () => {
    console.log('[Step2] Continue clicked. Current data:', data)
    const newErrors: Record<string, string> = {}

    if (!data.lifestyle) newErrors.lifestyle = 'Please select your activity level'
    if (!data.exercise) newErrors.exercise = 'Please select your exercise frequency'
    if (!data.goal) newErrors.goal = 'Please select your goal'
    if ((data.goal === 'lose' || data.goal === 'gain') && !data.deficit) newErrors.deficit = 'Please select your deficit percentage'
    if (!data.diet) newErrors.diet = 'Please select your diet type'

    console.log('[Step2] Validation errors:', newErrors)

    if (Object.keys(newErrors).length > 0) {
      console.log('[Step2] Validation failed, setting errors')
      onSetErrors?.(newErrors)
      return
    }

    console.log('[Step2] Validation passed, calling onContinue()')
    onContinue()
  }

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '28px', color: '#ffd700', fontWeight: '600', marginBottom: '8px' }}>Your Activity & Goals</h2>
        <p style={{ fontFamily: "'Merriweather', Georgia, serif", fontSize: '18px', color: '#f5f5f5' }}>These help us tailor your macros to your lifestyle.</p>
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
      <div style={{ marginTop: '12px' }}>
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
      </div>

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
        <div style={{ backgroundColor: '#0f0f0f', border: '1px solid #333', borderRadius: '8px', padding: '16px' }}>
          <p style={{ fontSize: '14px', color: '#f5f5f5', fontFamily: "'Merriweather', Georgia, serif" }}>
            ℹ️ At maintenance, you'll eat at your TDEE (Total Daily Energy Expenditure).
          </p>
        </div>
      )}

      {/* Diet Type */}
      <div style={{ marginTop: '12px' }}>
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
      </div>

      {/* Navigation Buttons */}
      <div style={{ paddingTop: '24px', display: 'flex', gap: '12px' }}>
        <button
          onClick={onBack}
          style={{
            flex: 1,
            backgroundColor: 'transparent',
            border: '2px solid #ffd700',
            color: '#ffd700',
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '16px',
            fontWeight: '600',
            padding: '12px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 215, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          style={{
            flex: 1,
            backgroundColor: '#ffd700',
            color: '#1a120b',
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '16px',
            fontWeight: '600',
            padding: '12px 16px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#e6c200';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ffd700';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          See Your Results
        </button>
      </div>
    </div>
  )
}
