import { useEffect, useRef, useState } from 'react'
import { FormData, MacroResults } from '../../types/form'
import { calculateBMR, calculateMacros } from '../../lib/calculations'
import { useFormStore } from '../../stores/formStore'
import { usePaymentState } from '../../hooks/usePaymentState'
import ProgressIndicator from './ProgressIndicator'
import FormContainer from './FormContainer'
import Step1PhysicalStats from './steps/Step1PhysicalStats'
import Step2FitnessDiet from './steps/Step2FitnessDiet'
import Step3FreeResults from './steps/Step3FreeResults'
import Step4HealthProfile from './steps/Step4HealthProfile'

declare global {
  interface Window {
    gtag?: (...args: any[]) => void
  }
}
import StripePaymentModal from '../ui/StripePaymentModal'
import { AnimatePresence } from 'framer-motion'
import ReportGeneratingScreen from '../ui/ReportGeneratingScreen'

interface CalculatorAppProps {
  sessionToken?: string
  onReportGenerated?: (report: string) => void
  paymentStatus?: string | null
  stripeSessionId?: string | null
}

const STEP_LABELS = ['Physical Stats', 'Fitness & Diet', 'Free Results', 'Unlock Your Protocol']

const API_BASE = 'https://carnivore-report-api-production.iambrew.workers.dev'

function trackCalculatorEvent(eventName: string, params: Record<string, string | undefined> = {}) {
  window.gtag?.('event', eventName, {
    page_path: window.location.pathname,
    calculator_version: window.location.pathname.includes('keto') ? 'keto_calculator' : 'carnivore_calculator',
    ...params,
  })
}

export default function CalculatorApp({
  sessionToken,
  onReportGenerated,
  paymentStatus: propPaymentStatus,
  stripeSessionId: propStripeSessionId,
}: CalculatorAppProps) {
  // ATOMIC REHYDRATION: Wait for Zustand to hydrate from localStorage before rendering
  const [isHydrated, setIsHydrated] = useState(false)

  // Payment state from isolated hook (handles URL, localStorage, and Supabase restore)
  const [paymentState, paymentActions] = usePaymentState({
    initialPaymentStatus: propPaymentStatus,
    initialStripeSessionId: propStripeSessionId,
  })

  // Form state from Zustand (consolidated, persisted)
  const {
    form: formData,
    setForm: setFormData,
    currentStep,
    setCurrentStep,
    isPremium,
    setIsPremium,
    macros,
    setMacros,
    assessmentId: storedAssessmentId,
    setAssessmentId,
    sessionToken: storedSessionToken,
    setSessionToken,
    isDirty,
    markDirty,
    markClean,
  } = useFormStore()

  // Rehydration effect - runs once on mount
  useEffect(() => {
    // Small delay to ensure Zustand persist has loaded from localStorage
    const timer = setTimeout(() => {
      // Preselect diet from URL query param (?mode=keto, etc).
      // Runs after hydration so it overrides persisted value on initial load.
      try {
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search)
          const mode = params.get('mode')
          const validDiets = ['carnivore', 'pescatarian', 'keto', 'lowcarb'] as const
          // Accept a couple common aliases so links like ?mode=low-carb or ?mode=animal-based work
          const aliasMap: Record<string, typeof validDiets[number]> = {
            'low-carb': 'lowcarb',
            'lowcarb': 'lowcarb',
            'animal-based': 'carnivore',
            'lion': 'carnivore',
          }
          if (mode) {
            const normalized = (validDiets as readonly string[]).includes(mode)
              ? (mode as typeof validDiets[number])
              : aliasMap[mode]
            if (normalized) {
              setFormData({ diet: normalized })
            }
          }
        }
      } catch (e) {
        console.warn('[CalculatorApp] URL param preselect failed:', e)
      }
      setIsHydrated(true)
      console.log('[CalculatorApp] Hydration complete')
    }, 50)
    return () => clearTimeout(timer)
  }, [])

  // Derived: stripeSessionId - prefer payment hook, fall back to stored
  const stripeSessionId = paymentState.stripeSessionId || storedAssessmentId

  // Sync stripeSessionId to Zustand store for persistence across refreshes
  useEffect(() => {
    if (paymentState.stripeSessionId && paymentState.stripeSessionId !== storedAssessmentId) {
      console.log('[CalculatorApp] Persisting assessmentId to store:', paymentState.stripeSessionId)
      setAssessmentId(paymentState.stripeSessionId)
    }
  }, [paymentState.stripeSessionId, storedAssessmentId, setAssessmentId])

  // Track diet selection changes (only user-initiated, not hydration defaults)
  const prevDiet = useRef(formData.diet)
  useEffect(() => {
    if (isHydrated && formData.diet && prevDiet.current !== formData.diet) {
      prevDiet.current = formData.diet
      trackCalculatorEvent('calculator_diet_selected', {
        diet_type: formData.diet,
      })
    }
  }, [formData.diet, isHydrated])


  // UI state (non-persisted, transient)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [email, setEmail] = useState('')
  const [reportHtml, setReportHtml] = useState<string | null>(null)
  const [isEmailingSent, setIsEmailingSent] = useState(false)
  const [isEmailingReport, setIsEmailingReport] = useState(false)

  // Helper: Scroll to a specific anchor after React render settles
  const scrollToAnchor = (anchorId: string, delay = 100) => {
    setTimeout(() => {
      const element = document.getElementById(anchorId)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, delay)
  }

  // Derived state for success page - use payment hook
  const isPaymentSuccess = paymentState.isPaymentSuccess

  // Sync payment hook's isPremium to Zustand store and fire GA4 purchase event
  useEffect(() => {
    if (paymentState.isPremium && !isPremium) {
      setIsPremium(true)
      handlePaymentSuccess()
      scrollToAnchor('payment-success')
    }
  }, [paymentState.isPremium, isPremium, setIsPremium])

  // Scroll to success message when success page shows after payment redirect
  useEffect(() => {
    if (isPaymentSuccess && currentStep !== 4) {
      scrollToAnchor('payment-success', 200)
    }
  }, [isPaymentSuccess, currentStep]);

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

  // Persist step data to backend (fire-and-forget, don't block UI)
  const saveStepToBackend = async (completedStep: number) => {
    try {
      let token = storedSessionToken
      if (!token) {
        const params = new URLSearchParams(window.location.search)
        const gaCookie = document.cookie.split(';').find(c => c.trim().startsWith('_ga='))
        const gaClientId = gaCookie ? gaCookie.split('.').slice(-2).join('.') : undefined
        const res = await fetch(`${API_BASE}/api/v1/calculator/session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ga_client_id: gaClientId,
            utm_source: params.get('utm_source') || undefined,
            utm_medium: params.get('utm_medium') || undefined,
            utm_campaign: params.get('utm_campaign') || undefined,
            utm_content: params.get('utm_content') || undefined,
            utm_term: params.get('utm_term') || undefined,
            referrer: document.referrer || undefined,
            landing_page: window.location.pathname + window.location.search,
            device_type: window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop',
          }),
        })
        if (!res.ok) return
        const data = await res.json()
        token = data.session_token
        setSessionToken(token)
      }

      if (completedStep === 1) {
        await fetch(`${API_BASE}/api/v1/calculator/step/1`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_token: token,
            data: {
              sex: formData.sex,
              age: formData.age,
              height_feet: formData.heightFeet || null,
              height_inches: formData.heightInches || null,
              height_cm: formData.heightCm || null,
              weight_value: formData.weight,
              weight_unit: 'lbs',
            },
          }),
        })
      } else if (completedStep === 2) {
        await fetch(`${API_BASE}/api/v1/calculator/step/2`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_token: token,
            data: {
              lifestyle_activity: formData.lifestyle,
              exercise_frequency: formData.exercise,
              goal: formData.goal,
              deficit_percentage: formData.deficit || null,
              diet_type: formData.diet,
            },
          }),
        })
      }
    } catch (err) {
      console.warn('[CalculatorApp] Step save failed (non-blocking):', err)
    }
  }

  // Step navigation
  const handleStepContinue = (step: number) => {
    console.log('[CalculatorApp] Advancing to step:', step)
    if (step === 3) {
      trackCalculatorEvent('calculator_completed', {
        diet_type: formData.diet || 'unknown',
        goal: formData.goal || 'unknown',
      })
    }
    // Save completed step data (step param is the NEXT step, so completed = step - 1)
    saveStepToBackend(step - 1)
    setCurrentStep(step)
    setErrors({})
    scrollToAnchor('calculator-start')
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
    console.log('[CalculatorApp] Setting showPaymentModal to true')
    setShowPaymentModal(true)
  }

  const handlePaymentSuccess = () => {
    const sessionId = paymentState.stripeSessionId || 'unknown'
    const dedupKey = `purchase_fired_${sessionId}`
    if (window.gtag && !localStorage.getItem(dedupKey)) {
      const paidCents = parseInt(localStorage.getItem('amountPaidCents') || '2900', 10)
      const paidDollars = paidCents / 100
      window.gtag('event', 'purchase', {
        transaction_id: sessionId,
        value: paidDollars,
        currency: 'USD',
        items: [{
          item_id: 'carnivore-protocol',
          item_name: 'Personalized Carnivore Protocol',
          price: paidDollars,
          quantity: 1
        }]
      })
      localStorage.setItem(dedupKey, '1')
    }
    setIsPremium(true)
    setShowPaymentModal(false)
    setCurrentStep(4) // Go to premium health profile
    scrollToAnchor('health-profile-start')
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

    if (!stripeSessionId) {
      console.error('[Step4] No assessment session ID available')
      setErrors({ submit: 'Session error. Please refresh and try again.' })
      return
    }

    setIsGenerating(true)
    scrollToAnchor('calculator-start')

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

      // Track Step 4 submission
      if (window.gtag) {
        window.gtag('event', 'calculator_step4_submitted', {
          event_category: 'calculator',
          event_label: 'health_profile_submitted',
        })
      }

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
            if (window.gtag) {
              window.gtag('event', 'calculator_report_generated', {
                'event_category': 'calculator',
                'event_label': 'report_generated'
              })
            }
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

  // ATOMIC REHYDRATION GUARD: Show loading until Zustand has hydrated
  if (!isHydrated || paymentState.isLoading) {
    return (
      <div style={{ width: '100%', backgroundColor: '#F2F0E6', paddingTop: '64px', paddingBottom: '64px', minHeight: '100vh' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ color: '#666', fontFamily: "'Merriweather', Georgia, serif" }}>Loading...</p>
        </div>
      </div>
    )
  }

  // Show generating screen
  if (isGenerating) {
    return <ReportGeneratingScreen />
  }

  // Show payment success screen (but not if user has proceeded to Step 4)
  if (isPaymentSuccess && currentStep !== 4) {
    return (
      <div id="payment-success" style={{ width: '100%', backgroundColor: '#F2F0E6', paddingTop: '64px', paddingBottom: '64px', paddingLeft: '16px', paddingRight: '16px', minHeight: '100vh', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', width: '100%' }}>
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
            {paymentState.paymentStatus === 'free'
              ? 'Your 100% discount coupon has been applied.'
              : 'Your payment has been processed.'}
          </p>

          <div style={{
            backgroundColor: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '8px',
            padding: '24px',
            marginBottom: '32px',
            textAlign: 'left',
            boxSizing: 'border-box',
            maxWidth: '100%',
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
                  markClean()
                  setCurrentStep(4)
                  scrollToAnchor('health-profile-start', 200)
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
                    email: sessionData.email || sessionData.form_data.email,
                    firstName: sessionData.first_name || sessionData.form_data.firstName,
                  }
                  setFormData(mergedFormData)
                  markClean()
                  setCurrentStep(4)
                  scrollToAnchor('health-profile-start', 200)
                } else {
                  console.error('[Success Page] No form data in session')
                }
              } catch (error) {
                console.error('[Success Page] Error fetching session:', error)
              }

              // Clear payment status from localStorage using the hook
              paymentActions.clearPaymentState()
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
        <div style={{
          maxWidth: '500px',
          margin: '0 auto',
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '48px 32px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          border: '1px solid rgba(212, 165, 116, 0.2)',
        }}>
          <div style={{ textAlign: 'center' }}>
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
              marginBottom: '40px',
              fontFamily: "'Merriweather', Georgia, serif",
            }}>
              Click below to view your personalized carnivore protocol.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => {
                const printWindow = window.open('', '_blank')
                if (printWindow) {
                  // Inject PDF button into the report HTML
                  const buttonHtml = `
                    <button class="save-pdf-button" onclick="setTimeout(function() { window.print(); }, 500);" style="
                      position: fixed;
                      top: 20px;
                      right: 20px;
                      background: linear-gradient(135deg, #ffd700 0%, #e6c200 100%);
                      color: #1a120b;
                      font-family: 'Georgia', serif;
                      font-size: 14pt;
                      font-weight: bold;
                      padding: 12pt 24pt;
                      border: none;
                      border-radius: 8px;
                      cursor: pointer;
                      box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
                      transition: all 0.2s;
                      z-index: 1000;
                    " onmouseover="this.style.background='linear-gradient(135deg, #e6c200 0%, #d4af00 100%)'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(255, 215, 0, 0.4)'" onmouseout="this.style.background='linear-gradient(135deg, #ffd700 0%, #e6c200 100%)'; this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(255, 215, 0, 0.3)'">
                      💾 Save as PDF
                    </button>
                    <style>
                      @media print {
                        .save-pdf-button { display: none !important; }
                      }
                    </style>
                  `

                  // Inject button after <body> tag
                  const htmlWithButton = reportHtml.replace(/<body([^>]*)>/, `<body$1>${buttonHtml}`)

                  printWindow.document.write(htmlWithButton)
                  printWindow.document.close()
                }
              }}
              style={{
                background: 'linear-gradient(135deg, #ffd700 0%, #e6c200 100%)',
                color: '#1a120b',
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: '18px',
                fontWeight: 'bold',
                padding: '16px 40px',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 6px 25px rgba(255, 215, 0, 0.4)',
                width: '100%',
                maxWidth: '350px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #e6c200 0%, #d4af00 100%)'
                e.currentTarget.style.transform = 'translateY(-3px)'
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(255, 215, 0, 0.5)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #ffd700 0%, #e6c200 100%)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 6px 25px rgba(255, 215, 0, 0.4)'
              }}
            >
              📄 View Your Report
            </button>

            <button
              onClick={async () => {
                if (!stripeSessionId || !formData.email) return

                setIsEmailingReport(true)
                try {
                  const emailResponse = await fetch(
                    'https://carnivore-report-api-production.iambrew.workers.dev/api/v1/calculator/email-report',
                    {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        session_id: stripeSessionId,
                        email: formData.email,
                      }),
                    }
                  )

                  if (emailResponse.ok) {
                    setIsEmailingSent(true)
                    setTimeout(() => setIsEmailingSent(false), 3000)
                  }
                } catch (error) {
                  console.error('[Email Report] Error:', error)
                } finally {
                  setIsEmailingReport(false)
                }
              }}
              disabled={isEmailingReport || isEmailingSent}
              style={{
                backgroundColor: isEmailingSent ? '#4caf50' : '#f9f8f5',
                color: isEmailingSent ? 'white' : '#1a120b',
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: '18px',
                fontWeight: '600',
                padding: '16px 40px',
                borderRadius: '12px',
                border: isEmailingSent ? 'none' : '2px solid #d4a574',
                cursor: isEmailingReport || isEmailingSent ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)',
                opacity: isEmailingReport || isEmailingSent ? 0.7 : 1,
                width: '100%',
                maxWidth: '350px',
              }}
              onMouseEnter={(e) => {
                if (!isEmailingReport && !isEmailingSent) {
                  e.currentTarget.style.backgroundColor = 'white'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.12)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isEmailingReport && !isEmailingSent) {
                  e.currentTarget.style.backgroundColor = '#f9f8f5'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.08)'
                }
              }}
            >
              {isEmailingSent ? '✓ Email Sent!' : isEmailingReport ? '📧 Sending...' : '📧 Email My Report'}
            </button>

            {isEmailingSent && (
              <p style={{
                fontSize: '13px',
                color: '#999',
                fontFamily: "'Merriweather', Georgia, serif",
                fontStyle: 'italic',
                marginTop: '12px',
                textAlign: 'center',
              }}>
                Check your spam folder if you don't see it within a few minutes
              </p>
            )}
          </div>

          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <button
              onClick={() => {
                window.location.href = '/calculator.html'
              }}
              style={{
                backgroundColor: 'transparent',
                color: '#999',
                fontFamily: "'Merriweather', Georgia, serif",
                fontSize: '13px',
                fontWeight: '400',
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textDecoration: 'underline',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#666'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#999'
              }}
            >
              ✓ Done
            </button>
          </div>
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
            onSetErrors={handleSetErrors}
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
          <><div id="health-profile-start" style={{ position: 'relative', top: '-16px' }} /><Step4HealthProfile
            data={dataAsFormData}
            onDataChange={(data) => setFormData(data as Partial<FormData>)}
            onSubmit={handleStep4Submit}
            onBack={() => handleStepContinue(3)}
            onFieldChange={handleFieldChange}
            onSetErrors={handleSetErrors}
            errors={errors}
          /></>
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
      <div id="calculator-app" style={{ width: '100%', backgroundColor: '#F2F0E6', paddingTop: '32px', paddingBottom: '32px', paddingLeft: '16px', paddingRight: '16px', boxSizing: 'border-box' }}>
        {/* calculator-start anchor lives in static HTML (calculator.html) to avoid duplicate IDs */}
        <div style={{ maxWidth: '1400px', margin: '0 auto', boxSizing: 'border-box' }}>
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

      {/* Stripe Payment Modal — direct from Step 3 CTA (no intermediate PricingModal) */}
      <AnimatePresence>
        {showPaymentModal && (
          <StripePaymentModal
            tierId="bundle"
            tierTitle="Complete Carnivore Protocol"
            tierPrice="$29"
            email={email}
            onEmailChange={setEmail}
            formData={formData as FormData}
            onSuccess={() => handlePaymentSuccess()}
            onCancel={() => setShowPaymentModal(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
