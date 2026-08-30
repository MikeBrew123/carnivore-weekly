import { useEffect, useRef, useState } from 'react'
import { FormData, MacroResults } from '../../types/form'
import { calculateMacrosCanonical } from '../../lib/calculations'
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

const STEP_LABELS = ['Physical Stats', 'Fitness & Diet', 'Free Results', 'Unlock Your Plan']

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


  // Funnel events must count unique progress, not navigation churn — Back +
  // forward used to refire calculator_completed (inflating completions) and
  // Steps 1-2 had no events at all, leaving the mandatory-email-gate
  // drop-off (live since 2026-06-29) invisible in GA4.
  const firedFunnelEvents = useRef<Set<string>>(new Set())
  const trackFunnelOnce = (eventName: string, params: Record<string, string | undefined> = {}) => {
    if (firedFunnelEvents.current.has(eventName)) return
    firedFunnelEvents.current.add(eventName)
    trackCalculatorEvent(eventName, params)
  }
  // Drip subscribe fires once per distinct email, not on every pass through Step 1
  const lastSubscribedEmail = useRef<string | null>(null)

  // Funnel: Step 1 seen (fires once per page load, incl. after Start Over)
  useEffect(() => {
    if (isHydrated && currentStep === 1) {
      trackFunnelOnce('calculator_step1_viewed')
    }
  }, [isHydrated, currentStep])

  // UI state (non-persisted, transient)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [email, setEmail] = useState('')
  const [reportHtml, setReportHtml] = useState<string | null>(null)
  // Error shown on the payment-success screen if resuming the session fails —
  // the user has PAID at that point, so failures must never be silent
  const [successScreenError, setSuccessScreenError] = useState<string | null>(null)
  const [isEmailingSent, setIsEmailingSent] = useState(false)
  const [isEmailingReport, setIsEmailingReport] = useState(false)

  // Helper: Scroll to a specific anchor after React render settles.
  // Polls for the element instead of firing once on a blind timeout — the old
  // single-shot version raced React's re-render (screen swaps like
  // payment-success -> Step 4), so on slow devices the scroll fired against
  // whichever screen happened to exist at that instant and the user was left
  // stranded. Retries every 100ms for up to 2s, then gives up silently.
  const scrollRetryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollToAnchor = (anchorId: string, delay = 100) => {
    // A newer scroll request always supersedes a pending one — never let a
    // stale retry loop fight the latest transition for the scroll position.
    if (scrollRetryTimer.current) {
      clearTimeout(scrollRetryTimer.current)
      scrollRetryTimer.current = null
    }
    const deadline = Date.now() + 2000
    const attempt = () => {
      const element = document.getElementById(anchorId)
      if (element) {
        // Scroll the WINDOW explicitly (immune to ancestors becoming scroll
        // containers), then verify the smooth animation actually ran — some
        // webviews/emulators silently drop smooth programmatic scrolls. If
        // nothing moved after 700ms and the user hasn't scrolled, snap.
        const y = element.getBoundingClientRect().top + window.scrollY
        window.scrollTo({ top: y, behavior: 'smooth' })
        const startY = window.scrollY
        setTimeout(() => {
          const stillFar = Math.abs(element.getBoundingClientRect().top) > 8
          const neverMoved = Math.abs(window.scrollY - startY) < 4
          if (stillFar && neverMoved) {
            window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY, behavior: 'auto' })
          }
        }, 700)
        scrollRetryTimer.current = null
      } else if (Date.now() < deadline) {
        scrollRetryTimer.current = setTimeout(attempt, 100)
      } else {
        scrollRetryTimer.current = null
      }
    }
    scrollRetryTimer.current = setTimeout(attempt, delay)
  }

  // Derived state for success page - use payment hook
  const isPaymentSuccess = paymentState.isPaymentSuccess

  // Sync payment hook's isPremium to Zustand store and fire GA4 purchase event.
  // NOTE: no scroll here — handlePaymentSuccess() already advances to Step 4 and
  // scrolls to health-profile-start. A second scrollToAnchor('payment-success')
  // used to race it (two targets, blind timers) and could strand the user on
  // whichever screen won the race. The payment-success screen scroll lives in
  // the effect below, which only fires when that screen actually renders.
  useEffect(() => {
    if (paymentState.isPremium && !isPremium) {
      setIsPremium(true)
      handlePaymentSuccess()
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
        // Single source of truth: the same math that generates the paid
        // report (see calculateMacrosCanonical). CI enforces parity with the
        // worker, so what this screen shows is what the report will say.
        setMacros(calculateMacrosCanonical(formData as unknown as Record<string, unknown>))
      } catch (error) {
        console.error('Macro calculation error:', error)
      }
    }
  }, [formData.sex, formData.age, formData.weight, formData.heightFeet, formData.heightInches, formData.heightCm, formData.lifestyle, formData.exercise, formData.goal, formData.deficit, formData.diet])

  // Persist step data to backend. Navigation is never blocked on this (the
  // caller does not await), but each write now retries once so a transient
  // failure does not silently drop the email — the main cause of emailless
  // session rows (post-gate capture was ~74%, not the ~100% the gate implies).
  const saveStepToBackend = async (completedStep: number) => {
    const postWithRetry = async (url: string, body: unknown): Promise<Response | null> => {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
          if (res.ok) return res
        } catch (err) {
          console.warn(`[CalculatorApp] POST ${url} attempt ${attempt + 1} failed:`, err)
        }
      }
      return null
    }

    try {
      let token = storedSessionToken
      if (!token) {
        const params = new URLSearchParams(window.location.search)
        const gaCookie = document.cookie.split(';').find(c => c.trim().startsWith('_ga='))
        const gaClientId = gaCookie ? gaCookie.split('.').slice(-2).join('.') : undefined
        const res = await postWithRetry(`${API_BASE}/api/v1/calculator/session`, {
          ga_client_id: gaClientId,
          utm_source: params.get('utm_source') || undefined,
          utm_medium: params.get('utm_medium') || undefined,
          utm_campaign: params.get('utm_campaign') || undefined,
          utm_content: params.get('utm_content') || undefined,
          utm_term: params.get('utm_term') || undefined,
          referrer: document.referrer || undefined,
          landing_page: window.location.pathname + window.location.search,
          device_type: window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop',
          // Include email at creation so the row is never stored emailless if the
          // step/1 write below fails. NOTE: the worker's /session handler must
          // persist this field for the belt-and-suspenders path to take effect.
          email: formData.email || null,
        })
        if (!res) return
        const data = await res.json()
        token = data.session_token
        setSessionToken(token)
      }

      if (completedStep === 1) {
        await postWithRetry(`${API_BASE}/api/v1/calculator/step/1`, {
          session_token: token,
          data: {
            sex: formData.sex,
            age: formData.age,
            height_feet: formData.heightFeet || null,
            height_inches: formData.heightInches || null,
            height_cm: formData.heightCm || null,
            weight_value: formData.weight,
            weight_unit: 'lbs',
            email: formData.email || null,
          },
        })
      } else if (completedStep === 2) {
        await postWithRetry(`${API_BASE}/api/v1/calculator/step/2`, {
          session_token: token,
          data: {
            lifestyle_activity: formData.lifestyle,
            exercise_frequency: formData.exercise,
            goal: formData.goal,
            deficit_percentage: formData.deficit || null,
            diet_type: formData.diet,
          },
        })
      }
    } catch (err) {
      console.warn('[CalculatorApp] Step save failed (non-blocking):', err)
    }
  }

  // Step navigation — both forward (Continue) and backward (Back) land here,
  // so completion side effects are gated on FORWARD moves only. They used to
  // fire on any entry: Back from Step 4 counted as another calculator_completed
  // and Back to Step 1 re-POSTed the drip subscribe.
  const handleStepContinue = (step: number) => {
    const isForward = step > currentStep
    console.log('[CalculatorApp] Moving to step:', step, isForward ? '(forward)' : '(back)')

    if (isForward) {
      if (step === 2) {
        trackFunnelOnce('calculator_step1_completed')
      }
      if (step === 3) {
        trackFunnelOnce('calculator_step2_completed', {
          diet_type: formData.diet || 'unknown',
          goal: formData.goal || 'unknown',
        })
        trackFunnelOnce('calculator_completed', {
          diet_type: formData.diet || 'unknown',
          goal: formData.goal || 'unknown',
        })
      }

      // Save completed step data (step param is the NEXT step, so completed = step - 1)
      saveStepToBackend(step - 1)

      // Auto-subscribe when completing Step 2 — diet is chosen there, and the worker
      // routes by diet_type (keto/low-carb → KD newsletter, carnivore → CW drip).
      // Subscribing on the Step 1→2 transition sent no diet and mis-filed keto users
      // into the CW drip. Once per distinct email so re-passes don't re-POST.
      if (step === 3 && formData.email && lastSubscribedEmail.current !== formData.email) {
        lastSubscribedEmail.current = formData.email
        fetch(`${API_BASE}/api/v1/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email, source: 'calculator', diet_type: formData.diet || '' }),
        }).catch(() => {})
      }
    }

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
    // Already-paid users (arriving via Back from Step 4 or Start Over) must
    // never see the payment modal again — $29 buys exactly one report, and
    // the server enforces that via the already_generated check on report/init
    if (isPremium && stripeSessionId) {
      setCurrentStep(4)
      scrollToAnchor('health-profile-start')
      return
    }
    // Prefill checkout with the email already captured in Step 1 — retyping it
    // is pure friction, and a typo here would split the report and the drip
    // subscription across two different addresses. Still editable in the modal.
    if (!email && formData.email) {
      setEmail(formData.email)
    }
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

      // The generating screen is a pure animation with no polling — every path
      // out of here MUST end in either report HTML or a visible, retryable
      // error. Falling through used to strand paying customers at "98%… 1s
      // remaining" forever.
      if (!reportInitResponse.ok) {
        const reportError = await reportInitResponse.json().catch(() => ({} as any))
        console.error('[Step4] Report init failed:', reportError)
        throw new Error(reportError.message || `Report generation failed (${reportInitResponse.status})`)
      }

      const reportData = await reportInitResponse.json()
      console.log('[Step4] Report init response status:', reportData.status)

      let html: string | null = reportData.report_html || null

      // 'already_generated' returns an access_token but no HTML (e.g. the user
      // retried after a hiccup) — fetch the stored report instead of stalling
      if (!html && reportData.access_token) {
        console.log('[Step4] Report already generated, fetching stored copy...')
        const contentResponse = await fetch(
          `https://carnivore-report-api-production.iambrew.workers.dev/api/v1/calculator/report/${reportData.access_token}/content`
        )
        if (contentResponse.ok) {
          html = await contentResponse.text()
        }
      }

      if (!html) {
        throw new Error('The report did not come back from the server')
      }

      setReportHtml(html)
      if (window.gtag) {
        window.gtag('event', 'calculator_report_generated', {
          'event_category': 'calculator',
          'event_label': 'report_generated'
        })
      }
      setIsGenerating(false)
    } catch (error) {
      console.error('[Step4] Submission error:', error)
      setIsGenerating(false)
      setErrors({
        submit: `We hit a problem generating your report (${error instanceof Error ? error.message : 'unknown error'}). ` +
          `Your payment is safe and your answers are saved — click "Generate My Protocol" to try again. ` +
          `A copy will also be emailed to you; if it doesn't arrive, reply to that email thread or use the site's feedback button.`,
      })
      // Bring the error into view — the generating screen scrolled to the top
      scrollToAnchor('step4-submit-error', 200)
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
              setSuccessScreenError(null)

              // Advance to Step 4 and only THEN clear the payment flag. Clearing
              // it on a failure path used to evaporate this screen and drop the
              // paid user back on Step 3 with two more "$29" buy buttons.
              const advanceToStep4 = () => {
                markClean()
                setCurrentStep(4)
                scrollToAnchor('health-profile-start', 200)
                paymentActions.clearPaymentState()
              }

              try {
                // GUARD: If form is dirty (user edited), don't overwrite with Supabase data
                if (isDirty) {
                  advanceToStep4()
                  return
                }

                if (!stripeSessionId) {
                  // No session id to restore from — if the answers are still in
                  // this browser, keep going with those rather than dead-ending
                  console.error('[Success Page] No stripe session ID')
                  if (formData.email) {
                    advanceToStep4()
                  } else {
                    setSuccessScreenError(
                      'We could not find your session in this browser. Your payment went through and your report will be emailed to you. ' +
                      'If it does not arrive within a few minutes, use the feedback button or reply to your receipt email.'
                    )
                  }
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

                if (sessionData && sessionData.form_data) {
                  // Load the saved form data into the form, including email from session
                  const mergedFormData = {
                    ...sessionData.form_data,
                    email: sessionData.email || sessionData.form_data.email,
                    firstName: sessionData.first_name || sessionData.form_data.firstName,
                  }
                  setFormData(mergedFormData)
                  advanceToStep4()
                } else if (formData.email) {
                  // Session row came back empty — the locally saved answers are
                  // still good enough to continue
                  console.warn('[Success Page] No form data in session, using local answers')
                  advanceToStep4()
                } else {
                  throw new Error('No form data in session')
                }
              } catch (error) {
                // Do NOT clear payment state here — keep the paid screen alive
                // so the user can retry instead of seeing buy buttons again
                console.error('[Success Page] Error fetching session:', error)
                setSuccessScreenError(
                  'We hit a snag loading your saved answers. Your payment is safe — click the button to try again. ' +
                  'Your report will also be emailed to you within a few minutes either way.'
                )
              }
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

          {successScreenError && (
            <div
              role="alert"
              style={{
                marginTop: '20px',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid #ef4444',
                borderRadius: '8px',
                padding: '14px 16px',
                color: '#ef8a8a',
                fontSize: '14px',
                lineHeight: 1.6,
                textAlign: 'left',
                fontFamily: "'Merriweather', Georgia, serif",
              }}
            >
              {successScreenError}
            </div>
          )}
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
            alreadyPaid={isPremium && !!stripeSessionId}
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
