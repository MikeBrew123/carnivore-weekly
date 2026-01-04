import { useState, useEffect } from 'react'
import { useFormStore } from '../stores/formStore'
import { updateSessionActivity } from '../lib/session'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import ProgressBar from './ui/ProgressBar'
import MacroPreview from './ui/MacroPreview'
import PricingModal from './ui/PricingModal'
import CompletionScreen from './ui/CompletionScreen'
import ReportGeneratingScreen from './ui/ReportGeneratingScreen'
import ReportViewer from './ui/ReportViewer'
import MealExamples from './ui/MealExamples'
import ElectrolyteGuidance from './ui/ElectrolyteGuidance'
import { MacroResults } from '../types/form'

// Form validation schema - matches FormData interface
const formSchema = z.object({
  sex: z.enum(['male', 'female']),
  age: z.number().min(14).max(99),
  heightFeet: z.number().optional(),
  heightInches: z.number().optional(),
  heightCm: z.number().optional(),
  weight: z.number().min(80).max(500),
  lifestyle: z.string(),
  exercise: z.string(),
  goal: z.enum(['lose', 'maintain', 'gain']),
  deficit: z.number(),
  diet: z.string(),
})

type FormData = z.infer<typeof formSchema>

const STEPS = {
  FREE: ['Your Stats', 'Your Goal', 'Your Results'],
  PREMIUM: ['Your Stats', 'Your Goal', 'Health Details', 'Your Results'],
}

export default function CalculatorWizard() {
  const { currentStep, setCurrentStep, isPremium, setIsPremium, macros, sessionToken, form } = useFormStore()
  const [units, setUnits] = useState<'imperial' | 'metric'>('imperial')
  const [showPricingModal, setShowPricingModal] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [resultsData, setResultsData] = useState<MacroResults | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [reportAccessToken, setReportAccessToken] = useState<string | null>(null)

  const steps = isPremium ? STEPS.PREMIUM : STEPS.FREE
  const totalSteps = steps.length

  const { register, handleSubmit, watch, formState: { errors }, setValue } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sex: form.sex || 'male',
      age: form.age,
      heightFeet: form.heightFeet,
      heightInches: form.heightInches,
      heightCm: form.heightCm,
      weight: form.weight,
      lifestyle: form.lifestyle || '1.2',
      exercise: form.exercise || '0.1',
      goal: form.goal || 'lose',
      deficit: form.deficit || 25,
      diet: form.diet || 'carnivore',
    },
    mode: 'onBlur',
  })

  // Auto-save form state
  useEffect(() => {
    const saveTimer = setInterval(() => {
      if (sessionToken) {
        updateSessionActivity(sessionToken, {})
      }
    }, 5000)

    return () => clearInterval(saveTimer)
  }, [sessionToken])

  // Minimal scroll - only if needed
  const scrollToForm = () => {
    setTimeout(() => {
      const formEl = document.querySelector('[data-form]')
      if (formEl) {
        const rect = formEl.getBoundingClientRect()
        if (rect.top > window.innerHeight) {
          formEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
      }
    }, 50)
  }

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
      scrollToForm()
    }
  }

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      scrollToForm()
    }
  }

  const handleShowResults = (results: MacroResults) => {
    setResultsData(results)
    setShowResults(true)
    window.gtag?.('event', 'calculate', {
      event_category: 'Calculator',
      event_label: `${form.diet} - ${form.goal}`
    })
  }

  const handleUpgrade = () => {
    setIsPremium(true)
    setShowPricingModal(true)
  }

  const handleProceedAfterPayment = () => {
    setShowPricingModal(false)
    setCurrentStep(3) // Go to health details
    scrollToForm()
  }

  const handleSubmitPremium = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch(
        'https://carnivore-report-api-production.iambrew.workers.dev/',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            sessionToken: sessionToken,
          }),
        }
      )

      if (!response.ok) throw new Error('Failed to generate report')

      const result = await response.json()

      if (result.success && result.accessToken) {
        setReportAccessToken(result.accessToken)
        setIsComplete(true)
      } else {
        throw new Error(result.error || 'Failed to generate report')
      }
    } catch (error) {
      console.error('Error generating report:', error)
      alert('Failed to generate report. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRestart = () => {
    setCurrentStep(1)
    setIsComplete(false)
    setShowResults(false)
    setIsPremium(false)
  }

  // ===== STEP 1: PHYSICAL STATS =====
  const renderStep1 = () => (
    <form onSubmit={(e) => { e.preventDefault(); handleNext() }} className="space-y-6">
      <h2 className="text-2xl font-bold text-dark">Let's Start with Your Stats</h2>

      {/* Unit Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setUnits('imperial')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
            units === 'imperial'
              ? 'bg-primary text-accent'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          lbs/inches
        </button>
        <button
          type="button"
          onClick={() => setUnits('metric')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
            units === 'metric'
              ? 'bg-primary text-accent'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          kg/cm
        </button>
      </div>

      {/* Sex (Single Column) */}
      <fieldset className="space-y-3">
        <legend className="block text-base font-semibold text-dark">What's your biological sex?</legend>
        <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
          <input type="radio" {...register('sex')} value="male" className="w-4 h-4" />
          <span className="text-base text-gray-700">Male</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
          <input type="radio" {...register('sex')} value="female" className="w-4 h-4" />
          <span className="text-base text-gray-700">Female</span>
        </label>
      </fieldset>

      {/* Age */}
      <div>
        <label htmlFor="age" className="block text-base font-semibold text-dark mb-2">Age</label>
        <input
          id="age"
          type="number"
          {...register('age', { valueAsNumber: true })}
          min="14"
          max="99"
          className="w-full px-4 py-3 text-base rounded-lg border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="35"
        />
        {errors.age && <p className="text-red-500 text-sm mt-1">{errors.age.message}</p>}
      </div>

      {/* Height */}
      <div>
        <label className="block text-base font-semibold text-dark mb-2">
          Height {units === 'imperial' ? '(feet & inches)' : '(centimeters)'}
        </label>
        {units === 'imperial' ? (
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="number"
                {...register('heightFeet', { valueAsNumber: true })}
                min="3"
                max="8"
                className="w-full px-4 py-3 text-base rounded-lg border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="5"
              />
              <span className="text-xs text-gray-500 mt-1 block">Feet</span>
            </div>
            <div className="flex-1">
              <input
                type="number"
                {...register('heightInches', { valueAsNumber: true })}
                min="0"
                max="11"
                className="w-full px-4 py-3 text-base rounded-lg border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="10"
              />
              <span className="text-xs text-gray-500 mt-1 block">Inches</span>
            </div>
          </div>
        ) : (
          <input
            type="number"
            {...register('heightCm', { valueAsNumber: true })}
            min="120"
            max="230"
            className="w-full px-4 py-3 text-base rounded-lg border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="178"
          />
        )}
        {(errors.heightFeet || errors.heightInches || errors.heightCm) && (
          <p className="text-red-500 text-sm mt-1">Please enter a valid height</p>
        )}
      </div>

      {/* Weight */}
      <div>
        <label htmlFor="weight" className="block text-base font-semibold text-dark mb-2">
          Weight ({units === 'imperial' ? 'lbs' : 'kg'})
        </label>
        <input
          id="weight"
          type="number"
          {...register('weight', { valueAsNumber: true })}
          step="0.1"
          min="80"
          max="500"
          className="w-full px-4 py-3 text-base rounded-lg border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="200"
        />
        {errors.weight && <p className="text-red-500 text-sm mt-1">{errors.weight.message}</p>}
      </div>

      {/* CTA: Action-oriented, clear next step */}
      <button
        type="submit"
        className="w-full bg-primary text-accent font-semibold py-3 rounded-lg hover:bg-primary/90 transition-all text-base"
      >
        Continue to Fitness Profile →
      </button>
    </form>
  )

  // ===== STEP 2: GOAL & DIET =====
  const renderStep2 = () => (
    <form onSubmit={(e) => { e.preventDefault(); handleNext() }} className="space-y-6">
      <h2 className="text-2xl font-bold text-dark">Your Goal</h2>

      {/* Goal */}
      <fieldset className="space-y-3">
        <legend className="block text-base font-semibold text-dark">What's your primary goal?</legend>
        {[
          { value: 'lose', label: 'Fat Loss (reduce weight)' },
          { value: 'maintain', label: 'Maintenance (stay at current weight)' },
          { value: 'gain', label: 'Muscle Gain (build muscle)' },
        ].map(option => (
          <label key={option.value} className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="radio"
              {...register('goal')}
              value={option.value}
              className="w-4 h-4 mt-1"
            />
            <span className="text-base text-gray-700">{option.label}</span>
          </label>
        ))}
      </fieldset>

      {/* Calorie Deficit */}
      <div>
        <label htmlFor="deficit" className="block text-base font-semibold text-dark mb-2">
          Target deficit (%)
        </label>
        <select
          id="deficit"
          {...register('deficit', { valueAsNumber: true })}
          className="w-full px-4 py-3 text-base rounded-lg border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value={15}>Conservative (15%)</option>
          <option value={20}>Moderate (20%)</option>
          <option value={25}>Aggressive (25%)</option>
        </select>
      </div>

      {/* Diet Type */}
      <div>
        <label htmlFor="diet" className="block text-base font-semibold text-dark mb-2">
          Diet type
        </label>
        <select
          id="diet"
          {...register('diet')}
          className="w-full px-4 py-3 text-base rounded-lg border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="carnivore">Carnivore</option>
          <option value="pescatarian">Pescatarian</option>
          <option value="keto">Keto</option>
          <option value="lowcarb">Low Carb</option>
        </select>
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handlePrev}
          className="flex-1 bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-300 transition-all text-base"
        >
          ← Back
        </button>
        <button
          type="submit"
          className="flex-1 bg-primary text-accent font-semibold py-3 rounded-lg hover:bg-primary/90 transition-all text-base"
        >
          Calculate Macros →
        </button>
      </div>
    </form>
  )

  // ===== STEP 3: RESULTS & UPGRADE =====
  const renderStep3Results = () => (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-dark mb-6">Your Macro Results</h2>
        {resultsData && <MacroPreview macros={resultsData} />}
      </div>

      {resultsData && (
        <div className="border-t pt-8 space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-dark mb-4">Example Meals to Hit Your Macros</h3>
            <MealExamples macros={resultsData} diet={form.diet} />
          </div>

          <div>
            <ElectrolyteGuidance />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowResults(false)}
              className="flex-1 bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-300 transition-all text-base"
            >
              ← Adjust Macros
            </button>
            {!isPremium ? (
              <button
                onClick={handleUpgrade}
                className="flex-1 bg-gradient-to-r from-primary to-primary/90 text-accent font-semibold py-3 rounded-lg hover:from-primary/90 hover:to-primary/80 transition-all text-base"
              >
                ⭐ Upgrade for Full Protocol
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="flex-1 bg-primary text-accent font-semibold py-3 rounded-lg hover:bg-primary/90 transition-all text-base"
              >
                Continue to Details →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )

  // ===== STEP 3 (PREMIUM): HEALTH DETAILS =====
  const renderStep3Health = () => (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmitPremium() }} className="space-y-6">
      <h2 className="text-2xl font-bold text-dark">Health & Preferences</h2>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">This helps us personalize your full protocol and meal recommendations.</p>
      </div>

      {/* This would be extended with health condition checkboxes from Step4Health */}
      {/* For now, proceed with premium flow */}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handlePrev}
          className="flex-1 bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-300 transition-all text-base"
        >
          ← Back
        </button>
        <button
          type="submit"
          disabled={isGenerating}
          className="flex-1 bg-primary text-accent font-semibold py-3 rounded-lg hover:bg-primary/90 disabled:bg-gray-300 transition-all text-base"
        >
          {isGenerating ? 'Generating Report...' : 'Generate Full Report →'}
        </button>
      </div>
    </form>
  )

  // Main render
  const isReport = isComplete && reportAccessToken
  const isFreeStep3 = currentStep === 3 && !isPremium
  const isShowingResults = isFreeStep3 && showResults
  const isPremiumStep3 = currentStep === 3 && isPremium

  return (
    <div className="w-full" data-form>
      {/* Progress Bar */}
      {!isReport && <ProgressBar currentStep={currentStep} totalSteps={totalSteps} labels={steps} />}

      {/* Main Layout */}
      <div className="w-full">
        {isReport ? (
          // Full-width report
          <ReportViewer accessToken={reportAccessToken} />
        ) : isGenerating ? (
          <ReportGeneratingScreen isComplete={isComplete} />
        ) : isComplete ? (
          <CompletionScreen onRestart={handleRestart} />
        ) : (
          // Form + Sidebar
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Form Section - span 2 cols on desktop */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-lg p-8 lg:p-10">
                {currentStep === 1 && renderStep1()}
                {currentStep === 2 && renderStep2()}
                {currentStep === 3 && !isPremium && renderStep3Results()}
                {currentStep === 3 && isPremium && renderStep3Health()}
              </div>
            </div>

            {/* Sidebar - Hide when showing results or on premium */}
            {!isShowingResults && !isPremiumStep3 && (
              <div className="lg:col-span-1">
                {macros && currentStep !== 3 && <MacroPreview macros={macros} />}

                {/* Trust/Feature Cards */}
                <div className="mt-8 space-y-6">
                  {/* Why Users Love This */}
                  <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
                    <h3 className="font-semibold text-dark text-sm uppercase tracking-wide">Why Users Love This</h3>
                    <div className="space-y-2">
                      {[
                        'Free & instant results',
                        'No email required',
                        'Data encrypted & private',
                        'Used by 50k+ carnivores'
                      ].map(item => (
                        <div key={item} className="flex items-center gap-2 text-sm">
                          <span className="text-green-500 font-bold">✓</span>
                          <span className="text-gray-700">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pro Upgrade */}
                  {currentStep < 3 && (
                    <div className="bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/30 rounded-lg p-6 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">⭐</span>
                        <h3 className="font-semibold text-dark">Ready for More?</h3>
                      </div>
                      <p className="text-sm text-gray-700">Get your free macro report. Then unlock Pro for just $9.99.</p>
                      <ul className="text-xs text-gray-700 space-y-1">
                        <li>• 30-day meal plan</li>
                        <li>• Shopping lists</li>
                        <li>• Doctor's guide</li>
                        <li>• Full protocol</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pricing Modal */}
      {showPricingModal && (
        <PricingModal
          onClose={() => setShowPricingModal(false)}
          onProceed={handleProceedAfterPayment}
        />
      )}
    </div>
  )
}
