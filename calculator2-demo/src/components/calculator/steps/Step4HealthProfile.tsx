import { FormData } from '../../../types/form'
import FormField from '../shared/FormField'
import TextArea from '../shared/TextArea'
import CheckboxGroup from '../shared/CheckboxGroup'
import SelectField from '../shared/SelectField'

interface Step4HealthProfileProps {
  data: FormData
  onDataChange: (data: FormData) => void
  onSubmit: () => void
  onBack: () => void
  onFieldChange?: (fieldName: string) => void
  onSetErrors?: (errors: Record<string, string>) => void
  errors: Record<string, string>
}

export default function Step4HealthProfile({
  data,
  onDataChange,
  onSubmit,
  onBack,
  onFieldChange,
  onSetErrors,
  errors,
}: Step4HealthProfileProps) {
  const handleInputChange = (field: string, value: any) => {
    onDataChange({ ...data, [field]: value })
    // Clear error for this field if it has a value
    if (value !== '' && value !== undefined && value !== null && onFieldChange) {
      onFieldChange(field)
    }
  }

  // Validate email on blur
  const validateEmail = () => {
    if (data.email) {
      const newErrors = { ...errors }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        newErrors.email = 'Please enter a valid email'
      } else {
        delete newErrors.email
      }
      onSetErrors?.(newErrors)
    }
  }

  const handleSubmit = () => {
    console.log('========== Step4HealthProfile handleSubmit CALLED ==========')
    console.log('[Step4HealthProfile] Email:', data.email)

    const newErrors: Record<string, string> = {}

    if (!data.email) {
      newErrors.email = 'Email is required'
      console.log('[Step4HealthProfile] Validation failed: Email is required')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      newErrors.email = 'Please enter a valid email'
      console.log('[Step4HealthProfile] Validation failed: Invalid email format')
    }

    if (Object.keys(newErrors).length > 0) {
      onSetErrors?.(newErrors)
      return
    }

    console.log('[Step4HealthProfile] Validation passed, calling onSubmit()')
    onSubmit()
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Health Profile</h2>
        <p className="text-gray-600">
          This information helps us personalize your nutrition plan and provide better recommendations.
        </p>
      </div>

      {/* SECTION 1: Contact Information */}
      <section className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Contact Information</h3>
        <div className="space-y-4">
          <FormField
            id="email"
            name="email"
            type="email"
            label="Email Address"
            value={data.email || ''}
            onChange={(e) => handleInputChange('email', e.target.value)}
            onBlur={validateEmail}
            error={errors.email}
            placeholder="your@email.com"
            required
          />
          <FormField
            id="firstName"
            name="firstName"
            type="text"
            label="First Name"
            value={data.firstName || ''}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            placeholder="John"
          />
          <FormField
            id="lastName"
            name="lastName"
            type="text"
            label="Last Name"
            value={data.lastName || ''}
            onChange={(e) => handleInputChange('lastName', e.target.value)}
            placeholder="Doe"
          />
        </div>
      </section>

      {/* SECTION 2: Health & Medical */}
      <section className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🏥 Health & Medical</h3>
        <div className="space-y-6">
          {/* Medications Textarea */}
          <TextArea
            id="medications"
            name="medications"
            label="Current Medications"
            value={data.medications || ''}
            onChange={(e) => handleInputChange('medications', e.target.value)}
            placeholder="e.g., Metformin, Lisinopril, etc."
            rows={4}
            maxLength={5000}
            helpText="Optional - Helps us provide safe dietary recommendations"
          />

          {/* Health Conditions Checkboxes */}
          <CheckboxGroup
            name="conditions"
            label="Health Conditions (select all that apply)"
            options={[
              { value: 'diabetes', label: 'Diabetes' },
              { value: 'heart-disease', label: 'Heart Disease' },
              { value: 'thyroid', label: 'Thyroid Disorder' },
              { value: 'pcos', label: 'PCOS' },
              { value: 'arthritis', label: 'Joint Pain/Arthritis' },
              { value: 'none', label: 'None of the above' },
            ]}
            values={data.conditions || []}
            onChange={(values) => handleInputChange('conditions', values)}
            helpText="Optional - Select all that apply"
          />

          {/* Other Conditions Text Input */}
          <FormField
            id="otherConditions"
            name="otherConditions"
            type="text"
            label="Other Conditions"
            value={data.otherConditions || ''}
            onChange={(e) => handleInputChange('otherConditions', e.target.value)}
            placeholder="Specify others not listed above"
          />

          {/* Symptoms Checkboxes */}
          <CheckboxGroup
            name="symptoms"
            label="Current Symptoms (select all that apply)"
            options={[
              { value: 'fatigue', label: 'Fatigue/Low Energy' },
              { value: 'brain-fog', label: 'Brain Fog' },
              { value: 'digestive-issues', label: 'Digestive Issues' },
              { value: 'joint-pain', label: 'Joint Pain' },
              { value: 'muscle-soreness', label: 'Muscle Soreness' },
              { value: 'headaches', label: 'Headaches/Migraines' },
              { value: 'skin-issues', label: 'Skin Problems (acne, rashes)' },
              { value: 'sleep-problems', label: 'Sleep Issues' },
              { value: 'mood-changes', label: 'Mood Changes (anxiety, depression)' },
              { value: 'hormonal-issues', label: 'Hormonal Issues' },
              { value: 'weight-issues', label: 'Weight Management' },
              { value: 'none', label: 'None of the above' },
            ]}
            values={Array.isArray(data.symptoms) ? data.symptoms : []}
            onChange={(values) => handleInputChange('symptoms', values)}
            helpText="Optional - Select all that apply"
          />

          {/* Other Symptoms Text Input */}
          <TextArea
            id="otherSymptoms"
            name="otherSymptoms"
            label="Any Other Symptoms Not Listed Above"
            value={data.otherSymptoms || ''}
            onChange={(e) => handleInputChange('otherSymptoms', e.target.value)}
            placeholder="Describe any other symptoms you experience..."
            rows={3}
            helpText="Optional - Tell us about any symptoms not listed above"
          />
        </div>
      </section>

      {/* SECTION 3: Dietary Restrictions */}
      <section className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🍖 Dietary Restrictions</h3>
        <div className="space-y-4">
          <TextArea
            id="allergies"
            name="allergies"
            label="Allergies"
            value={data.allergies || ''}
            onChange={(e) => handleInputChange('allergies', e.target.value)}
            placeholder="List any food allergies (e.g., shellfish, tree nuts)..."
            rows={2}
          />

          <TextArea
            id="avoidFoods"
            name="avoidFoods"
            label="Foods to Avoid"
            value={data.avoidFoods || ''}
            onChange={(e) => handleInputChange('avoidFoods', e.target.value)}
            placeholder="Any foods you want to avoid (preferences, intolerances, etc.)..."
            rows={2}
          />

          <SelectField
            name="dairyTolerance"
            label="Dairy Tolerance"
            options={[
              { value: '', label: 'Select dairy tolerance', disabled: true },
              { value: 'none', label: 'No dairy at all' },
              { value: 'butter-only', label: 'Butter only' },
              { value: 'some', label: 'Some dairy (cheese, heavy cream)' },
              { value: 'full', label: 'Full dairy tolerance' },
            ]}
            value={data.dairyTolerance || ''}
            onChange={(e) => handleInputChange('dairyTolerance', e.target.value)}
          />
        </div>
      </section>

      {/* SECTION 4: Diet History */}
      <section className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📖 Your Diet Journey</h3>
        <div className="space-y-4">
          <TextArea
            id="previousDiets"
            name="previousDiets"
            label="Previous Diets Tried"
            value={data.previousDiets || ''}
            onChange={(e) => handleInputChange('previousDiets', e.target.value)}
            placeholder="What diets have you tried before? How long? Results?..."
            rows={3}
          />

          <TextArea
            id="whatWorked"
            name="whatWorked"
            label="What Worked for You"
            value={data.whatWorked || ''}
            onChange={(e) => handleInputChange('whatWorked', e.target.value)}
            placeholder="Which approaches gave you the best results?..."
            rows={3}
          />

          <SelectField
            name="carnivoreExperience"
            label="Carnivore Experience"
            options={[
              { value: '', label: 'Select your experience level', disabled: true },
              { value: 'new', label: 'Completely new to carnivore' },
              { value: 'weeks', label: 'A few weeks' },
              { value: 'months', label: 'Several months' },
              { value: 'years', label: 'Over a year' },
            ]}
            value={data.carnivoreExperience || ''}
            onChange={(e) => handleInputChange('carnivoreExperience', e.target.value)}
          />
        </div>
      </section>

      {/* SECTION 5: Lifestyle & Preferences */}
      <section className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🏠 Lifestyle & Preferences</h3>
        <div className="space-y-4">
          <SelectField
            name="cookingSkill"
            label="Cooking Skill"
            options={[
              { value: '', label: 'Select your skill level', disabled: true },
              { value: 'beginner', label: 'Beginner (basic cooking)' },
              { value: 'intermediate', label: 'Intermediate (comfortable in kitchen)' },
              { value: 'advanced', label: 'Advanced (experienced cook)' },
            ]}
            value={data.cookingSkill || ''}
            onChange={(e) => handleInputChange('cookingSkill', e.target.value)}
          />

          <SelectField
            name="mealPrepTime"
            label="Meal Prep Time Available"
            options={[
              { value: '', label: 'Select time availability', disabled: true },
              { value: 'minimal', label: 'Minimal (quick meals only)' },
              { value: 'some', label: 'Some (30-60 min/day)' },
              { value: 'lots', label: 'Plenty (enjoy meal prep)' },
            ]}
            value={data.mealPrepTime || ''}
            onChange={(e) => handleInputChange('mealPrepTime', e.target.value)}
          />

          <SelectField
            name="budget"
            label="Budget"
            options={[
              { value: '', label: 'Select your budget level', disabled: true },
              { value: 'tight', label: 'Tight budget' },
              { value: 'moderate', label: 'Moderate budget' },
              { value: 'flexible', label: 'Flexible budget' },
            ]}
            value={data.budget || ''}
            onChange={(e) => handleInputChange('budget', e.target.value)}
          />

          <SelectField
            name="familySituation"
            label="Family Situation"
            options={[
              { value: '', label: 'Select your situation', disabled: true },
              { value: 'solo', label: 'Cooking for myself' },
              { value: 'partner', label: 'Partner/spouse' },
              { value: 'family-with-kids', label: 'Family with kids' },
              { value: 'large-household', label: 'Large household (4+)' },
            ]}
            value={data.familySituation || ''}
            onChange={(e) => handleInputChange('familySituation', e.target.value)}
          />

          <SelectField
            name="workTravel"
            label="Work Schedule"
            options={[
              { value: '', label: 'Select your schedule', disabled: true },
              { value: 'office', label: 'Regular office hours' },
              { value: 'remote', label: 'Work from home' },
              { value: 'shift-work', label: 'Shift work' },
              { value: 'travel', label: 'Frequent travel' },
            ]}
            value={data.workTravel || ''}
            onChange={(e) => handleInputChange('workTravel', e.target.value)}
          />
        </div>
      </section>

      {/* SECTION 6: Goals & Challenges */}
      <section className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Your Goals</h3>
        <div className="space-y-4">
          <CheckboxGroup
            name="goals"
            label="What are you hoping to achieve?"
            options={[
              { value: 'weightloss', label: 'Weight loss / fat loss' },
              { value: 'mental', label: 'Mental clarity / focus' },
              { value: 'guthealth', label: 'Gut health / digestion' },
              { value: 'inflammation', label: 'Reduce inflammation' },
              { value: 'energy', label: 'More energy' },
              { value: 'athletic', label: 'Athletic performance' },
              { value: 'hormones', label: 'Hormone balance' },
            ]}
            values={data.goals || []}
            onChange={(values) => handleInputChange('goals', values)}
          />

          <TextArea
            id="biggestChallenge"
            name="biggestChallenge"
            label="Biggest Challenge"
            value={data.biggestChallenge || ''}
            onChange={(e) => handleInputChange('biggestChallenge', e.target.value)}
            placeholder="What's your biggest obstacle to sticking with a diet?..."
            rows={3}
          />

          <TextArea
            id="additionalNotes"
            name="additionalNotes"
            label="Anything Else?"
            value={data.additionalNotes || ''}
            onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
            placeholder="Anything else we should know to personalize your protocol?..."
            rows={3}
          />
        </div>
      </section>

      {/* Submit Section */}
      <section className="border-t pt-8 space-y-4">
        <p className="text-sm text-gray-600">
          Your information is secure and will be used only to generate your personalized nutrition protocol.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onBack}
            style={{
              flex: 1,
              background: '#2c1810',
              color: '#ffd700',
              fontWeight: 'bold',
              padding: '14px 24px',
              fontSize: '16px',
              borderRadius: '8px',
              border: '2px solid #ffd700',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: "'Playfair Display', Georgia, serif",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 215, 0, 0.2)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Back
          </button>
          <button
            onClick={handleSubmit}
            style={{
              flex: 1,
              background: 'linear-gradient(135deg, #ffd700 0%, #e6c200 100%)',
              color: '#1a120b',
              fontWeight: 'bold',
              padding: '14px 24px',
              fontSize: '16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: "'Playfair Display', Georgia, serif",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 215, 0, 0.3)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 215, 0, 0.2)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Generate My Protocol
          </button>
        </div>
      </section>
    </div>
  )
}
