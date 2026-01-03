import { useState, useEffect } from 'react'
import { useFormStore } from '../stores/formStore'
import { updateSessionActivity } from '../lib/session'
import { motion, AnimatePresence } from 'framer-motion'

import Step1Basic from './steps/Step1Basic'
import Step2Activity from './steps/Step2Activity'
import Step3Goals from './steps/Step3Goals'
import Step4Health from './steps/Step4Health'
import Step5Preferences from './steps/Step5Preferences'

import ProgressBar from './ui/ProgressBar'
import MacroPreview from './ui/MacroPreview'
import PricingModal from './ui/PricingModal'
import CompletionScreen from './ui/CompletionScreen'
import ReportGeneratingScreen from './ui/ReportGeneratingScreen'
import ReportViewer from './ui/ReportViewer'
import MealExamples from './ui/MealExamples'
import ElectrolyteGuidance from './ui/ElectrolyteGuidance'
import { MacroResults } from '../types/form'

const STEPS = {
  FREE: ['Basics', 'Activity', 'Results'],
  PREMIUM: ['Basics', 'Activity', 'Results', 'Health', 'Goals'],
}

export default function CalculatorWizard() {
  const { currentStep, setCurrentStep, isPremium, setIsPremium, macros, sessionToken, form } = useFormStore()
  const [showPricingModal, setShowPricingModal] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [resultsData, setResultsData] = useState<MacroResults | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [reportAccessToken, setReportAccessToken] = useState<string | null>(null)

  const steps = isPremium ? STEPS.PREMIUM : STEPS.FREE
  const totalSteps = steps.length

  // Auto-save form state every 5 seconds
  useEffect(() => {
    const saveTimer = setInterval(() => {
      if (sessionToken) {
        updateSessionActivity(sessionToken, {})
      }
    }, 5000)

    return () => clearInterval(saveTimer)
  }, [sessionToken])

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleShowResults = (results: MacroResults) => {
    setResultsData(results)
    setShowResults(true)
    setCurrentStep(3) // Go to results step
  }

  const handleUpgrade = async () => {
    setIsPremium(true)
    setShowPricingModal(true)
  }

  const handleContinueToResults = async () => {
    setShowResults(false)
    setCurrentStep(4) // Skip to health form for premium
  }

  const handleProceedAfterPayment = async () => {
    setShowPricingModal(false)
    setCurrentStep(4)
  }

  const handleSubmitPremium = async () => {
    setIsGenerating(true)
    try {
      console.log('Submitting premium form to API...')

      // Call the report generation API
      const response = await fetch(
        'https://carnivore-report-api-production.iambrew.workers.dev/',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...form,
            sessionToken: sessionToken,
          }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to generate report')
      }

      const result = await response.json()

      if (result.success && result.accessToken) {
        console.log('Report generated successfully:', result.accessToken)
        setReportAccessToken(result.accessToken)
        setIsComplete(true)
        setIsGenerating(false)
      } else {
        throw new Error(result.error || 'Failed to generate report')
      }
    } catch (error) {
      console.error('Error generating report:', error)
      alert('Failed to generate report. Please try again.')
      setIsGenerating(false)
    }
  }

  const handleRestart = () => {
    setCurrentStep(1)
    setIsComplete(false)
    setShowResults(false)
    setIsPremium(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Progress Bar */}
        <ProgressBar currentStep={currentStep} totalSteps={totalSteps} labels={steps} />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2">
            <motion.div
              key={`step-${currentStep}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-xl shadow-lg p-10"
            >
              <AnimatePresence mode="wait">
                {currentStep === 1 && (
                  <Step1Basic key="step1" onNext={handleNext} />
                )}
                {currentStep === 2 && (
                  <Step2Activity key="step2" onNext={handleNext} onPrev={handlePrev} />
                )}
                {currentStep === 3 && !showResults && (
                  <Step3Goals
                    key="step3"
                    onNext={handleNext}
                    onPrev={handlePrev}
                    onShowResults={handleShowResults}
                  />
                )}
                {currentStep === 3 && showResults && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-8"
                  >
                    <div>
                      <h2 className="text-2xl font-display font-bold text-dark mb-6">Your Results</h2>
                      <MacroPreview macros={resultsData} />
                    </div>

                    {/* Meal Examples */}
                    {resultsData && (
                      <div className="border-t pt-8">
                        <MealExamples macros={resultsData} diet={form.diet} />
                      </div>
                    )}

                    {/* Electrolyte Guidance */}
                    <div className="border-t pt-8">
                      <ElectrolyteGuidance />
                    </div>

                    {/* Action Buttons */}
                    <div className="border-t pt-8 space-y-3">
                      <button
                        onClick={() => setShowResults(false)}
                        className="w-full btn-secondary text-sm"
                      >
                        ← Adjust Macros
                      </button>
                      {!isPremium ? (
                        <button
                          onClick={handleUpgrade}
                          className="w-full bg-gradient-to-r from-primary to-primary/90 text-accent font-semibold py-3 px-4 rounded-lg hover:from-primary/90 hover:to-primary/80 transition-all"
                        >
                          ⚡ Upgrade for Full Protocol
                        </button>
                      ) : (
                        <button
                          onClick={handleContinueToResults}
                          className="w-full btn-primary"
                        >
                          Continue to Details →
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
                {currentStep === 4 && isPremium && (
                  <Step4Health key="step4" onNext={handleNext} onPrev={handlePrev} />
                )}
                {currentStep === 5 && isPremium && !isComplete && !isGenerating && (
                  <Step5Preferences
                    key="step5"
                    onNext={handleSubmitPremium}
                    onPrev={handlePrev}
                  />
                )}
                {isGenerating && (
                  <ReportGeneratingScreen key="generating" isComplete={isComplete} />
                )}
                {isComplete && reportAccessToken && (
                  <ReportViewer key="report" accessToken={reportAccessToken} />
                )}
                {isComplete && !reportAccessToken && !isGenerating && (
                  <CompletionScreen key="completion" onRestart={handleRestart} />
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {macros && currentStep !== 3 && <MacroPreview macros={macros} />}

            {/* Confidence Badges */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8 bg-white rounded-lg shadow-lg p-6 space-y-3"
            >
              <h3 className="font-semibold text-dark mb-4">Why Trust Us</h3>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-500 font-bold">✓</span>
                <span className="text-gray-700">Data encrypted & private</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-500 font-bold">✓</span>
                <span className="text-gray-700">Used by 50k+ carnivores</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-500 font-bold">✓</span>
                <span className="text-gray-700">⭐ 4.9/5 stars</span>
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="space-y-6"
            >
              {/* Sidebar Trust Badges */}
              <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
                <h3 className="font-semibold text-dark text-sm uppercase tracking-wide">Why Users Love This</h3>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-green-500 font-bold">✓</span>
                  <span className="text-gray-700">Free & instant results</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-green-500 font-bold">✓</span>
                  <span className="text-gray-700">No email required</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-green-500 font-bold">✓</span>
                  <span className="text-gray-700">Data encrypted & private</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-green-500 font-bold">✓</span>
                  <span className="text-gray-700">Used by 50k+ carnivores</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
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
