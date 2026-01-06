import { useEffect, useState } from 'react'
import { FormData, MacroResults } from '../../types/form'
import { calculateBMR, calculateMacros } from '../../lib/calculations'
import { useFormStore } from '../../stores/formStore'
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
  paymentStatus?: string | null
  stripeSessionId?: string | null
}

const STEP_LABELS = ['Physical Stats', 'Fitness & Diet', 'Free Results', 'Health Profile']

export default function CalculatorApp({
  sessionToken,
  onReportGenerated,
  paymentStatus,
  stripeSessionId,
}: CalculatorAppProps) {
  // DEBUG: Log payment status from props
  console.log('========== CalculatorApp RENDER ==========');
  console.log('Payment status (from props):', paymentStatus);
  console.log('Stripe session ID (from props):', stripeSessionId);
  console.log('URL search:', window.location.search);

  // Form state from Zustand (consolidate state to single source of truth)
  const {
    form: formData,
    setForm: setFormData,
    isDirty,
    markDirty,
    markClean,
  } = useFormStore()

  // UI state (non-form state stays in React)
  const [currentStep, setCurrentStep] = useState(1)
  const [macros, setMacros] = useState<MacroResults | null>(null)
  const [showPricingModal, setShowPricingModal] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isPremium, setIsPremium] = useState(false)
  const [email, setEmail] = useState('')
  const [reportHtml, setReportHtml] = useState<string | null>(null)

  // Helper: Scroll to calculator on step changes
  const scrollToCalculator = () => {
    setTimeout(() => {
      document.getElementById('root')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  // Derived state for success page - use props from App.tsx
  const isPaymentSuccess = paymentStatus === 'success' || paymentStatus === 'free'

  // Also check URL as fallback (for direct navigation)
  useEffect(() => {
    if (!paymentStatus) {
      const urlParams = new URLSearchParams(window.location.search)
      const urlPayment = urlParams.get('payment')
      if (urlPayment) {
        console.log('[CalculatorApp] Found payment in URL (fallback):', urlPayment)
      }
    }
  }, [])

  // Mark as premium when returning from payment
  useEffect(() => {
    if (isPaymentSuccess && !isPremium) {
      console.log('[CalculatorApp] Payment success detected - setting isPremium = true')
      setIsPremium(true)
      scrollToCalculator()
    }
  }, [isPaymentSuccess, isPremium])

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
    scrollToCalculator()
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
    console.log('[CalculatorApp] Upgrade button clicked')
    console.log('[CalculatorApp] Setting showPricingModal to true')
    setShowPricingModal(true)
  }

  const handlePaymentSuccess = () => {
    // Payment successful, user has upgraded to premium
    setIsPremium(true)
    setShowPricingModal(false)
    setCurrentStep(4) // Go to premium health profile
    scrollToCalculator()
  }

  const handleStep4Submit = async () => {
    console.log('========== GENERATE PROTOCOL BUTTON CLICKED ==========')
    console.log('[Step4] stripeSessionId:', stripeSessionId)
    console.log('[Step4] email:', formData.email)
    console.log('[Step4] isGenerating:', isGenerating)
    console.log('[Step4] isPremium:', isPremium)
    console.log('[Step4] paymentStatus:', paymentStatus)
    console.log('[Step4] currentStep:', currentStep)
    console.log('[Step4] Full formData:', formData)

    // Validate email
    if (!formData.email) {
      setErrors({ email: 'Email is required' })
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setErrors({ email: 'Please enter a valid email' })
      return
    }

    if (!stripeSessionId) {
      console.error('[Step4] No assessment session ID available')
      setErrors({ submit: 'Session error. Please refresh and try again.' })
      return
    }

    setIsGenerating(true)

    try {
      // Call step 4 submission endpoint (user already paid)
      const response = await fetch('https://carnivore-report-api-production.iambrew.workers.dev/api/v1/calculator/step/4', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Assessment session UUID
          assessment_id: stripeSessionId,

          // Step 4 - send complete form data (includes Steps 1-2 fields + Step 4 health profile)
          // The backend will merge this with existing form_data for complete report generation
          data: formData,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Step 4 submission failed: ${errorData.message || response.status}`)
      }

      const data = await response.json()
      console.log('[Step4] Submission successful:', data)

      // Step 4 data saved, now trigger report generation
      console.log('[Step4] Triggering report generation for assessment:', stripeSessionId)
      const reportInitResponse = await fetch(
        'https://carnivore-report-api-production.iambrew.workers.dev/api/v1/calculator/report/init',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: stripeSessionId, // assessment UUID
          }),
        }
      )

      if (!reportInitResponse.ok) {
        const reportError = await reportInitResponse.json()
        console.warn('[Step4] Report init warning:', reportError)
        // Don't fail - let user see generating screen anyway
      } else {
        const reportData = await reportInitResponse.json()
        console.log('[Step4] Report generation successful:', reportData)

        // If report HTML is included, store it for "View Report" button
        if (reportData.report_html) {
          console.log('[Step4] Report HTML received, storing for view button...')
          try {
            // Store report HTML in state for "View Report" button
            setReportHtml(reportData.report_html)
            setIsGenerating(false)
            return
          } catch (e) {
            console.error('[Step4] Report display error:', e)
            // Fall through to generating screen
          }
        }
      }

      // Show generating screen - report is generating or being processed
      // User will see progress animation while Claude API generates the report
    } catch (error) {
      console.error('[Step4] Submission error:', error)
      setIsGenerating(false)
      setErrors({ submit: `Failed to submit: ${error instanceof Error ? error.message : 'Unknown error'}` })
    }
  }

  // Show generating screen
  if (isGenerating) {
    return <ReportGeneratingScreen />
  }

  // Show payment success screen (but not if user has proceeded to Step 4)
  if (isPaymentSuccess && currentStep !== 4) {
    return (
      <div style={{ width: '100%', backgroundColor: '#F2F0E6', paddingTop: '64px', paddingBottom: '64px', paddingLeft: '16px', paddingRight: '16px', minHeight: '100vh' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '24px',
          }}>✅</div>

          <h1 style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#ffd700',
            marginBottom: '8px',
            fontFamily: "'Playfair Display', Georgia, serif",
          }}>Payment Successful!</h1>

          <p style={{
            fontSize: '16px',
            color: '#a0a0a0',
            marginBottom: '32px',
            fontFamily: "'Merriweather', Georgia, serif",
          }}>
            {paymentStatus === 'free'
              ? 'Your 100% discount coupon has been applied.'
              : 'Your payment has been processed.'}
          </p>

          <div style={{
            backgroundColor: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '8px',
            padding: '32px',
            marginBottom: '32px',
            textAlign: 'left',
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#ffd700',
              marginBottom: '16px',
              fontFamily: "'Playfair Display', Georgia, serif",
            }}>What's Next?</h2>

            <ul style={{
              listStyle: 'none',
              padding: 0,
              color: '#f5f5f5',
              fontFamily: "'Merriweather', Georgia, serif",
              fontSize: '14px',
            }}>
              <li style={{ marginBottom: '12px', display: 'flex', gap: '12px' }}>
                <span style={{ color: '#ffd700', fontWeight: 'bold' }}>✓</span>
                <span>Your personalized protocol is being generated</span>
              </li>
              <li style={{ marginBottom: '12px', display: 'flex', gap: '12px' }}>
                <span style={{ color: '#ffd700', fontWeight: 'bold' }}>✓</span>
                <span>Check your email for your download link (may take 1-2 minutes)</span>
              </li>
              <li style={{ marginBottom: '12px', display: 'flex', gap: '12px' }}>
                <span style={{ color: '#ffd700', fontWeight: 'bold' }}>✓</span>
                <span>Your protocol includes meal plans, shopping lists, and personalized guidance</span>
              </li>
              <li style={{ display: 'flex', gap: '12px' }}>
                <span style={{ color: '#ffd700', fontWeight: 'bold' }}>✓</span>
                <span>Questions? Reply to your email or contact support</span>
              </li>
            </ul>
          </div>

          <button
            onClick={async () => {
              console.log('[Success Page] Continue to Health Profile clicked')
              console.log('[Success Page] stripeSessionId:', stripeSessionId)

              if (!stripeSessionId) {
                console.error('[Success Page] No stripe session ID')
                return
              }

              try {
                // GUARD: If form is dirty (user edited), don't overwrite with Supabase data
                if (isDirty) {
                  console.log('[Success Page] Form is dirty - skipping Supabase restore, proceeding with current data')
                  markClean()
                  setCurrentStep(4)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                  return
                }

                // Fetch the saved session from Supabase using the stripeSessionId
                console.log('[Success Page] Fetching session from Supabase:', stripeSessionId)
                const fetchResponse = await fetch(
                  `https://carnivore-report-api-production.iambrew.workers.dev/get-session?id=${stripeSessionId}`,
                  {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                  }
                )

                const sessionData = await fetchResponse.json()
                console.log('[Success Page] Session data:', sessionData)

                if (sessionData && sessionData.form_data && !isDirty) {
                  // Load the saved form data into the form, including email from session
                  const mergedFormData = {
                    ...sessionData.form_data,
                    email: sessionData.email || sessionData.form_data.email, // Use session email as default
                    firstName: sessionData.first_name || sessionData.form_data.firstName,
                  }
                  setFormData(mergedFormData)
                  console.log('[Success Page] Form data restored with email:', mergedFormData.email)
                  markClean()  // Mark clean after successful restore
                  // Jump to Step 4 (Health Profile)
                  setCurrentStep(4)
                  scrollToCalculator()
                } else {
                  console.error('[Success Page] No form data in session')
                }
              } catch (error) {
                console.error('[Success Page] Error fetching session:', error)
              }

              // Clear payment status from localStorage
              localStorage.removeItem('paymentStatus')
              localStorage.removeItem('stripeSessionId')
            }}
            style={{
              backgroundColor: '#ffd700',
              color: '#1a120b',
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '16px',
              fontWeight: '600',
              padding: '12px 32px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e6c200'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ffd700'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            Continue to Health Profile
          </button>
        </div>
      </div>
    )
  }

  // Show "View Report" button if report is ready
  if (reportHtml) {
    return (
      <div style={{ width: '100%', backgroundColor: '#F2F0E6', paddingTop: '64px', paddingBottom: '64px', paddingLeft: '16px', paddingRight: '16px', minHeight: '100vh' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>🎉</div>

          <h1 style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#ffd700',
            marginBottom: '8px',
            fontFamily: "'Playfair Display', Georgia, serif",
          }}>Your Protocol is Ready!</h1>

          <p style={{
            fontSize: '16px',
            color: '#666',
            marginBottom: '32px',
            fontFamily: "'Merriweather', Georgia, serif",
          }}>
            Click below to view your personalized carnivore protocol.
          </p>

          <button
            onClick={() => {
              const printWindow = window.open('', '_blank')
              if (printWindow) {
                printWindow.document.write(reportHtml)
                printWindow.document.close()

                // Clear URL params and localStorage
                const cleanUrl = window.location.pathname
                window.history.replaceState({}, '', cleanUrl)
                localStorage.removeItem('paymentStatus')
                localStorage.removeItem('stripeSessionId')

                // Reset report state
                setReportHtml(null)
              }
            }}
            style={{
              backgroundColor: '#ffd700',
              color: '#1a120b',
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '18px',
              fontWeight: '600',
              padding: '16px 48px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 15px rgba(255, 215, 0, 0.2)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e6c200'
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 215, 0, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ffd700'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 215, 0, 0.2)'
            }}
          >
            📄 View Your Report
          </button>
        </div>
      </div>
    )
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
      <div style={{ width: '100%', backgroundColor: '#F2F0E6', paddingTop: '32px', paddingBottom: '32px', paddingLeft: '16px', paddingRight: '16px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* Form container with sidebar */}
          <FormContainer
            sidebar={null}
            hideSidebar={true}
          >
            {/* Progress indicator - inside form container, above form */}
            <ProgressIndicator
              currentStep={currentStep}
              totalSteps={isPremium ? 4 : 3}
              stepLabels={isPremium ? STEP_LABELS : STEP_LABELS.slice(0, 3)}
            />
            {renderStep()}
          </FormContainer>
        </div>
      </div>

      {/* Pricing Modal */}
      {showPricingModal && (
        <PricingModal
          email={email}
          onEmailChange={setEmail}
          formData={formData as FormData}
          onClose={() => setShowPricingModal(false)}
          onProceed={() => handlePaymentSuccess()}
        />
      )}
    </>
  )
}
