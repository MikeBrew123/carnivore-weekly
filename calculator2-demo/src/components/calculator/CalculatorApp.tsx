import { useState, useEffect } from 'react'
import { FormData, MacroResults } from '../../types/form'
import { calculateBMR, calculateMacros } from '../../lib/calculations'
import ProgressIndicator from './ProgressIndicator'
import FormContainer from './FormContainer'
import Step1PhysicalStats from './steps/Step1PhysicalStats'
import Step2FitnessDiet from './steps/Step2FitnessDiet'
import Step3FreeResults from './steps/Step3FreeResults'
import Step4HealthProfile from './steps/Step4HealthProfile'
import MacroPreview from '../ui/MacroPreview'
import PricingModal from '../ui/PricingModal'
import ReportGeneratingScreen from '../ui/ReportGeneratingScreen'

interface CalculatorAppProps {
  sessionToken?: string
  onReportGenerated?: (report: string) => void
}

const STEP_LABELS = ['Physical Stats', 'Fitness & Diet', 'Free Results', 'Health Profile']

export default function CalculatorApp({
  sessionToken,
  onReportGenerated,
}: CalculatorAppProps) {
  // Form state
  const [formData, setFormData] = useState<Partial<FormData>>({
    sex: undefined,
    age: 0,
    weight: 0,
    lifestyle: '',
    exercise: '',
    goal: undefined,
    deficit: 0,
    diet: undefined,
  })

  // UI state
  const [currentStep, setCurrentStep] = useState(1)
  const [macros, setMacros] = useState<MacroResults | null>(null)
  const [showPricingModal, setShowPricingModal] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isPremium, setIsPremium] = useState(false)

  // Calculate macros whenever step 1-2 data changes
  useEffect(() => {
    if (formData.sex && formData.age && formData.weight && formData.heightFeet && formData.lifestyle && formData.goal && formData.diet) {
      try {
        const heightCm = formData.heightCm || (formData.heightFeet * 12 + (formData.heightInches || 0)) * 2.54
        const bmr = calculateBMR(formData.sex, formData.age, formData.weight, heightCm)

        const lifestyleMultipliers: Record<string, number> = {
          sedentary: 0.2,
          light: 0.375,
          moderate: 0.55,
          very: 0.725,
          extreme: 0.9,
        }

        const exerciseMultipliers: Record<string, number> = {
          'none': 0,
          '1-2': 0.1,
          '3-4': 0.2,
          '5-6': 0.3,
          '7': 0.4,
        }

        const baseTdee = 1.2 // base multiplier
        const lifestyle = lifestyleMultipliers[formData.lifestyle] || 0.55
        const exercise = formData.exercise ? (exerciseMultipliers[formData.exercise] || 0.2) : 0.2
        const tdee = bmr * (baseTdee + lifestyle + exercise)

        const deficit = formData.deficit || (formData.goal === 'lose' ? 20 : formData.goal === 'gain' ? 10 : 0)

        const calculatedMacros = calculateMacros(
          tdee,
          formData.goal,
          deficit,
          formData.diet,
          formData.ratio,
          formData.proteinMin,
          formData.netCarbs
        )

        setMacros(calculatedMacros)
      } catch (error) {
        console.error('Macro calculation error:', error)
      }
    }
  }, [formData.sex, formData.age, formData.weight, formData.heightFeet, formData.heightInches, formData.heightCm, formData.lifestyle, formData.exercise, formData.goal, formData.deficit, formData.diet])

  // Step navigation
  const handleStepContinue = (step: number) => {
    setCurrentStep(step)
    setErrors({})
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

    // Start report generation
    setIsGenerating(true)

    try {
      // Call backend API to generate report
      const response = await fetch('https://carnivore-report-api-production.iambrew.workers.dev/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Core profile
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          age: formData.age,
          sex: formData.sex,
          weight: formData.weight,
          height: formData.heightFeet
            ? `${formData.heightFeet}'${formData.heightInches}"`
            : `${formData.heightCm}cm`,
          goal: formData.goal,
          diet: formData.diet,

          // Macros
          calories: macros?.calories,
          protein: macros?.protein,
          fat: macros?.fat,
          carbs: macros?.carbs,
          activityLevel: formData.lifestyle,

          // Health conditions
          medications: formData.medications,
          conditions: formData.conditions,
          otherConditions: formData.otherConditions,
          symptoms: formData.symptoms,
          otherSymptoms: formData.otherSymptoms,

          // Dietary restrictions
          allergies: formData.allergies,
          avoidFoods: formData.avoidFoods,
          dairyTolerance: formData.dairyTolerance,

          // Diet history
          previousDiets: formData.previousDiets,
          whatWorked: formData.whatWorked,
          carnivoreExperience: formData.carnivoreExperience,

          // Lifestyle
          cookingSkill: formData.cookingSkill,
          mealPrepTime: formData.mealPrepTime,
          budget: formData.budget,
          familySituation: formData.familySituation,
          workTravel: formData.workTravel,

          // Goals
          goals: formData.goals,
          biggestChallenge: formData.biggestChallenge,
          additionalNotes: formData.additionalNotes,

          // Session
          sessionToken: sessionToken,
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const result = await response.json()
      setIsGenerating(false)

      if (onReportGenerated) {
        onReportGenerated(result.report)
      }
    } catch (error) {
      console.error('Report generation error:', error)
      setIsGenerating(false)
      setErrors({ submit: 'Failed to generate report. Please try again.' })
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
            errors={errors}
          />
        ) : (
          // Show upgrade prompt if accessing step 4 without payment
          <div className="text-center py-12">
            <p className="text-gray-600 mb-6">Please upgrade to access the full health profile.</p>
            <button
              onClick={handleUpgradeClick}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg"
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
      <div className="w-full bg-gray-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Progress indicator */}
          <ProgressIndicator
            currentStep={currentStep}
            totalSteps={isPremium ? 4 : 3}
            stepLabels={isPremium ? STEP_LABELS : STEP_LABELS.slice(0, 3)}
          />

          {/* Form container with sidebar */}
          <FormContainer
            sidebar={
              macros && currentStep < 4 ? (
                <div className="space-y-4">
                  <MacroPreview macros={macros} />
                  {currentStep === 3 && (
                    <div className="bg-white rounded-xl shadow-lg p-6">
                      <p className="text-sm text-gray-600 text-center">
                        ℹ️ Click "Upgrade" below to unlock your complete health profile and personalized protocol.
                      </p>
                    </div>
                  )}
                </div>
              ) : null
            }
            hideSidebar={currentStep === 4 || currentStep > 3}
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
