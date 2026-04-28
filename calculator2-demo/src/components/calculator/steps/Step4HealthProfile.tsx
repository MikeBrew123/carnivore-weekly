import { useState } from 'react'
import { FormData } from '../../../types/form'
import FormField from '../shared/FormField'
import TextArea from '../shared/TextArea'
import CheckboxGroup from '../shared/CheckboxGroup'
import SelectField from '../shared/SelectField'

interface Step4HealthProfileProps {
  data: FormData
  onDataChange: (data: FormData) => void
  onSubmit: () => void
  onFieldChange?: (fieldName: string) => void
  onSetErrors?: (errors: Record<string, string>) => void
  errors: Record<string, string>
}

export default function Step4HealthProfile({
  data,
  onDataChange,
  onSubmit,
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

  const [showOptional, setShowOptional] = useState(false)

  const handleSubmit = (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault() // Prevent form submission/page reload
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
      {/* V2 lock overlay — Sarah's conversion-focused copy (deployed 2026-04-27) */}
      <div style={{ background: '#1a120b', borderRadius: '10px', padding: '24px 28px', border: '2px solid #ffd700', boxShadow: '0 10px 15px -3px rgba(245, 158, 11, 0.2)' }}>
        <p style={{ color: '#ffd700', fontFamily: "'Playfair Display', Georgia, serif", fontSize: '22px', fontWeight: 'bold', margin: '0 0 6px 0', textAlign: 'center' }}>
          A few more questions, then YOUR protocol.
        </p>
        <p style={{ color: '#f4e4d4', fontSize: '14px', textAlign: 'center', margin: '0 0 18px 0', fontStyle: 'italic' }}>
          You've got the basics. Twelve more questions and we build the plan around your actual life.
        </p>

        {/* Hero testimonial — third-person community framing */}
        <div style={{ background: 'rgba(255, 215, 0, 0.07)', borderLeft: '3px solid #ffd700', padding: '12px 16px', margin: '0 0 18px 0', borderRadius: '4px' }}>
          <p style={{ color: '#f4e4d4', fontSize: '14px', margin: 0, lineHeight: '1.6', fontStyle: 'italic' }}>
            Readers tell us the protocol felt "uncomfortably specific" in a good way. Like we'd been reading their bloodwork over their shoulder.
          </p>
        </div>

        <p style={{ color: '#ffd700', fontSize: '14px', fontWeight: 'bold', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Here's what gets built for YOU:
        </p>
        <ul style={{ margin: 0, paddingLeft: '18px', color: '#f4e4d4', fontSize: '14px', lineHeight: '1.7' }}>
          <li><strong>YOUR 30-day meal plan</strong>, built around your bodyweight and goals. Grocery lists priced for $80–120 a week, swaps for picky eaters, "I cook 3 nights" or "6 nights" versions. <span style={{ color: '#a89080' }}>($97 value)</span></li>
          <li><strong>YOUR doctor conversation script.</strong> Exact sentences for when LDL jumps and your GP panics, plus four labs to ask for that aren't on a standard panel. <span style={{ color: '#a89080' }}>($79 value)</span></li>
          <li><strong>YOUR week-by-week adaptation guide.</strong> What week 2 fatigue means, when leg cramps signal sodium vs magnesium, the plateau protocol for week 6. <span style={{ color: '#a89080' }}>($69 value)</span></li>
          <li><strong>YOUR symptom-to-fix map.</strong> Brain fog, sleep, digestion, hormones. Matched to the likely cause from what you tell us. <span style={{ color: '#a89080' }}>($53 value)</span></li>
          <li><strong>YOUR bloodwork interpretation guide.</strong> What your numbers should look like at 30, 60, 90 days. Carnivore ranges, not standard-diet ranges.</li>
          <li><strong>Lifetime access.</strong> Free updates when the science evolves.</li>
        </ul>

        <div style={{ background: '#0d0a07', borderRadius: '8px', padding: '14px 18px', margin: '18px 0 14px 0', textAlign: 'center', border: '1px solid #ffd700' }}>
          <p style={{ color: '#a89080', fontSize: '13px', margin: '0 0 4px 0' }}>Total value: $298</p>
          <p style={{ color: '#ffd700', fontSize: '20px', fontWeight: 'bold', margin: 0, fontFamily: "'Playfair Display', Georgia, serif" }}>Today: $29 · Yours forever</p>
        </div>

        <p style={{ color: '#f4e4d4', fontSize: '13px', margin: '0', textAlign: 'center', lineHeight: '1.5' }}>
          <strong style={{ color: '#ffd700' }}>30 days to read it, try it, decide.</strong> If it doesn't feel built for you, email us. Same-day refund. No survey, no friction.
        </p>
      </div>

      {/* What we'll ask after payment — preview only, no answering before paywall */}
      <div style={{ background: '#0d0a07', borderRadius: '8px', padding: '18px 22px', border: '1px solid #3a2818' }}>
        <p style={{ color: '#d4a574', fontSize: '14px', fontWeight: 'bold', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          After you complete your purchase, we'll ask 12 quick questions:
        </p>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#a89080', fontSize: '13px', lineHeight: '1.8', listStyle: 'none' }}>
          <li>✓ Your health conditions (diabetes, thyroid, PCOS, etc.)</li>
          <li>✓ Your symptoms (fatigue, brain fog, joint pain, etc.)</li>
          <li>✓ Your dietary preferences and tolerances</li>
          <li>✓ Your cooking skill and meal prep time</li>
          <li>✓ Your budget range</li>
          <li>✓ Your family situation</li>
          <li>✓ Your specific goals</li>
        </ul>
        <p style={{ color: '#666666', fontSize: '12px', margin: '12px 0 0 0', fontStyle: 'italic' }}>
          Each answer changes what's in your plan. Generic plans don't work. Yours will be built around the answers above.
        </p>
      </div>

      <div>
        <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#d4a574', marginBottom: '8px', fontFamily: "'Playfair Display', Georgia, serif" }}>
          Where should we send your protocol?
        </h2>
        <p style={{ color: '#a89080', fontSize: '14px' }}>
          Your email is where we send the final protocol. The $29 unlocks the next 12 questions and the personalized plan they build. Both happen on the next screen, together.
        </p>
      </div>

      {/* SECTION 1: Contact Information */}
      <section className="border-t pt-6">
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#d4a574', marginBottom: '16px', fontFamily: "'Playfair Display', Georgia, serif" }}>📋 Contact Information</h3>
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

      {/* Optional sections toggle */}
      <div className="border-t pt-4">
        <button
          type="button"
          onClick={() => setShowOptional(!showOptional)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d4a574', fontFamily: "'Inter', sans-serif", fontSize: '14px', padding: 0, display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span>{showOptional ? '▼' : '▶'}</span>
          <span>{showOptional ? 'Hide optional details' : 'Add optional details to further personalize your protocol'}</span>
        </button>
      </div>

      {showOptional && <>

      {/* SECTION 2: Health & Medical */}
      <section className="border-t pt-6">
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#d4a574', marginBottom: '16px', fontFamily: "'Playfair Display', Georgia, serif" }}>🏥 Health & Medical</h3>
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
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#d4a574', marginBottom: '16px', fontFamily: "'Playfair Display', Georgia, serif" }}>🍖 Dietary Restrictions</h3>
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
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#d4a574', marginBottom: '16px', fontFamily: "'Playfair Display', Georgia, serif" }}>📖 Your Diet Journey</h3>
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
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#d4a574', marginBottom: '16px', fontFamily: "'Playfair Display', Georgia, serif" }}>🏠 Lifestyle & Preferences</h3>
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
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#d4a574', marginBottom: '16px', fontFamily: "'Playfair Display', Georgia, serif" }}>🎯 Your Goals</h3>
        <div className="space-y-4">
          <div style={{ paddingLeft: '8px' }}>
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
          </div>

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

      </>}

      {/* Submit Section */}
      <section className="border-t pt-8 space-y-4">
        <p className="text-sm text-gray-600">
          Your information is secure and will be used only to generate your personalized nutrition protocol.
        </p>

        <button
            type="button"
            onClick={handleSubmit}
            style={{
              width: '100%',
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
            Build My Personalized Protocol → $29
          </button>
      </section>
    </div>
  )
}
