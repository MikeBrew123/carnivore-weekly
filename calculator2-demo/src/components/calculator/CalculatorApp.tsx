import { useState, useEffect } from 'react'
import { FormData, MacroResults } from '../../types/form'
import { calculateBMR, calculateMacros } from '../../lib/calculations'
import ProgressIndicator from './ProgressIndicator'
import FormContainer from './FormContainer'
import Step1PhysicalStats from './steps/Step1PhysicalStats'
import Step2FitnessDiet from './steps/Step2FitnessDiet'
import Step3FreeResults from './steps/Step3FreeResults'
import Step4HealthProfile from './steps/Step4HealthProfile'
import PricingModal from '../ui/PricingModal'
import ReportGeneratingScreen from '../ui/ReportGeneratingScreen'

interface CalculatorAppProps {
  sessionToken?: string
  onReportGenerated?: (report: string) => void
}

const STEP_LABELS = ['Physical Stats', 'Fitness & Diet', 'Free Results', 'Health Profile']

// Dev-only test data (stripped in production)
const DEV_TEST_DATA: Partial<FormData> = import.meta.env.DEV ? {
  sex: 'male' as const,
  age: 30,
  heightFeet: 6,
  heightInches: 0,
  weight: 200,
  lifestyle: 'moderate',
  exercise: '3-4',
  goal: 'maintain' as const,
  diet: 'carnivore' as const,
} : {}

export default function CalculatorApp({
  sessionToken,
  onReportGenerated,
}: CalculatorAppProps) {
  // Form state - pre-filled with test data in dev mode
  const [formData, setFormData] = useState<Partial<FormData>>(
    import.meta.env.DEV ? DEV_TEST_DATA : {
      sex: undefined,
      age: 0,
      weight: 0,
      lifestyle: '',
      exercise: '',
      goal: undefined,
      deficit: undefined,
      diet: undefined,
    }
  )

  // UI state
  const [currentStep, setCurrentStep] = useState(1)
  const [macros, setMacros] = useState<MacroResults | null>(null)
  const [showPricingModal, setShowPricingModal] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isPremium, setIsPremium] = useState(false)

  // Calculate macros whenever step 1-2 data changes
  useEffect(() => {
    if (formData.sex && formData.age && formData.weight && (formData.heightFeet || formData.heightCm) && formData.lifestyle && formData.goal && formData.diet) {
      try {
        const heightCm = formData.heightCm || (formData.heightFeet * 12 + (formData.heightInches || 0)) * 2.54
        const bmr = calculateBMR(formData.sex, formData.age, formData.weight, heightCm)

        // Standard Mifflin-St Jeor activity multipliers
        const activityMultipliers: Record<string, number> = {
          sedentary: 1.2,
          light: 1.375,
          moderate: 1.55,
          very: 1.725,
          extreme: 1.9,
        }

        const activityMultiplier = activityMultipliers[formData.lifestyle] || 1.55
        const tdee = bmr * activityMultiplier

        console.log('[CalculatorApp] BMR:', bmr, 'Activity multiplier:', activityMultiplier, 'TDEE:', tdee)
        console.log('[CalculatorApp] Form goal:', formData.goal, 'Form deficit:', formData.deficit)

        const deficit = formData.deficit || (formData.goal === 'lose' ? 20 : formData.goal === 'gain' ? 10 : 0)

        const weightKg = formData.weight * 0.453592
        const calculatedMacros = calculateMacros(
          tdee,
          formData.goal,
          deficit,
          formData.diet,
          formData.ratio,
          formData.proteinMin,
          formData.netCarbs,
          weightKg
        )

        setMacros(calculatedMacros)
      } catch (error) {
        console.error('Macro calculation error:', error)
      }
    }
  }, [formData.sex, formData.age, formData.weight, formData.heightFeet, formData.heightInches, formData.heightCm, formData.lifestyle, formData.exercise, formData.goal, formData.deficit, formData.diet])

  // Step navigation
  const handleStepContinue = (step: number) => {
    console.log('[CalculatorApp] Advancing to step:', step)
    setCurrentStep(step)
    setErrors({})
  }

  // Clear error for a specific field when it changes
  const handleFieldChange = (fieldName: string) => {
    if (errors[fieldName]) {
      const newErrors = { ...errors }
      delete newErrors[fieldName]
      setErrors(newErrors)
    }
  }

  // Set errors from validation (used by step components on submit/blur)
  const handleSetErrors = (newErrors: Record<string, string>) => {
    setErrors(newErrors)
  }

  const handleUpgradeClick = () => {
    setShowPricingModal(true)
  }

  const handlePaymentSuccess = () => {
    // Payment successful, user has upgraded to premium
    setIsPremium(true)
    setShowPricingModal(false)
    setCurrentStep(4) // Go to premium health profile
  }

  const handleStep4Submit = async () => {
    // Validate email
    if (!formData.email) {
      setErrors({ email: 'Email is required' })
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setErrors({ email: 'Please enter a valid email' })
      return
    }

    setIsGenerating(true)

    try {
      // Call checkout endpoint (Story 3.2) with all form data
      const response = await fetch('https://carnivore-report-api-production.iambrew.workers.dev/api/v1/assessment/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Email (required for checkout)
          email: formData.email,
          first_name: formData.firstName,

          // All form data for report generation
          form_data: {
            age: formData.age,
            sex: formData.sex,
            weight: formData.weight,
            height: formData.heightFeet
              ? `${formData.heightFeet}'${formData.heightInches}"`
              : `${formData.heightCm}cm`,
            goal: formData.goal,
            diet: formData.diet,
            calories: macros?.calories,
            protein: macros?.protein,
            fat: macros?.fat,
            carbs: macros?.carbs,
            activity_level: formData.lifestyle,
            medications: formData.medications,
            health_conditions: formData.conditions,
            other_health_issues: formData.otherConditions,
            current_symptoms: formData.symptoms,
            other_symptoms: formData.otherSymptoms,
            food_allergies: formData.allergies,
            foods_wont_eat: formData.avoidFoods,
            dairy_tolerance: formData.dairyTolerance,
            previous_diets: formData.previousDiets,
            what_worked: formData.whatWorked,
            carnivore_experience: formData.carnivoreExperience,
            cooking_ability: formData.cookingSkill,
            meal_prep_time: formData.mealPrepTime,
            budget: formData.budget,
            family_situation: formData.familySituation,
            work_travel: formData.workTravel,
            primary_goals: formData.goals,
            biggest_challenge: formData.biggestChallenge,
            anything_else: formData.additionalNotes,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`Checkout creation failed: ${response.status}`)
      }

      const data = await response.json()
      setIsGenerating(false)

      // Redirect to Stripe checkout
      if (data.checkout_url) {
        window.location.href = data.checkout_url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      setIsGenerating(false)
      setErrors({ submit: 'Failed to process payment. Please try again.' })
    }
  }

  // Show generating screen
  if (isGenerating) {
    return <ReportGeneratingScreen />
  }

  // Render appropriate step
  const renderStep = () => {
    const dataAsFormData = formData as FormData
    switch (currentStep) {
      case 1:
        return (
          <Step1PhysicalStats
            data={dataAsFormData}
            onDataChange={(data) => setFormData(data as Partial<FormData>)}
            onContinue={() => handleStepContinue(2)}
            onFieldChange={handleFieldChange}
            errors={errors}
          />
        )
      case 2:
        return (
          <Step2FitnessDiet
            data={dataAsFormData}
            onDataChange={(data) => setFormData(data as Partial<FormData>)}
            onContinue={() => handleStepContinue(3)}
            onBack={() => handleStepContinue(1)}
            onFieldChange={handleFieldChange}
            onSetErrors={handleSetErrors}
            errors={errors}
          />
        )
      case 3:
        return (
          <Step3FreeResults
            data={dataAsFormData}
            macros={macros}
            onUpgrade={handleUpgradeClick}
            onBack={() => handleStepContinue(2)}
          />
        )
      case 4:
        return isPremium ? (
          <Step4HealthProfile
            data={dataAsFormData}
            onDataChange={(data) => setFormData(data as Partial<FormData>)}
            onSubmit={handleStep4Submit}
            onBack={() => handleStepContinue(3)}
            onFieldChange={handleFieldChange}
            onSetErrors={handleSetErrors}
            errors={errors}
          />
        ) : (
          // Show upgrade prompt if accessing step 4 without payment
          <div style={{ textAlign: 'center', paddingTop: '48px', paddingBottom: '48px' }}>
            <p style={{ color: '#f5f5f5', marginBottom: '24px', fontSize: '18px', fontFamily: "'Merriweather', Georgia, serif" }}>
              Please upgrade to access the full health profile.
            </p>
            <button
              onClick={handleUpgradeClick}
              style={{
                backgroundColor: '#ffd700',
                color: '#1a120b',
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: '18px',
                fontWeight: '600',
                paddingTop: '12px',
                paddingBottom: '12px',
                paddingLeft: '32px',
                paddingRight: '32px',
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
              Upgrade Now
            </button>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <>
      {/* Dev-only test data banner */}
      {import.meta.env.DEV && (
        <div style={{
          width: '100%',
          backgroundColor: '#ff6b6b',
          color: 'white',
          padding: '12px 16px',
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: '600',
          zIndex: 50,
          borderBottom: '2px solid #cc5555',
        }}>
          ⚠️ TEST DATA LOADED (Dev Mode Only) - Remove before production
        </div>
      )}

      <div style={{ width: '100%', backgroundColor: '#F2F0E6', paddingTop: '32px', paddingBottom: '32px', paddingLeft: '16px', paddingRight: '16px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* Progress indicator */}
          <ProgressIndicator
            currentStep={currentStep}
            totalSteps={isPremium ? 4 : 3}
            stepLabels={isPremium ? STEP_LABELS : STEP_LABELS.slice(0, 3)}
          />

          {/* Form container with sidebar */}
          <FormContainer
            sidebar={null}
            hideSidebar={true}
          >
            {renderStep()}
          </FormContainer>
        </div>
      </div>

      {/* Pricing Modal */}
      {showPricingModal && (
        <PricingModal
          onClose={() => setShowPricingModal(false)}
          onProceed={() => handlePaymentSuccess()}
        />
      )}
    </>
  )
}
