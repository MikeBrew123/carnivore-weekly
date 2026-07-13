import { useEffect, useState } from 'react'
import { getOrCreateSession } from './lib/session'
import CalculatorApp from './components/calculator/CalculatorApp'
import AssessmentSuccess from './components/AssessmentSuccess'
import { useFormStore } from './stores/formStore'

// How long a persisted "payment success" state is honored on a fresh visit.
// Long enough to finish the health profile after paying, short enough that a
// later visit starts a clean run instead of being stranded on the success
// screen (or the "snag loading your saved answers" error) forever.
const PAYMENT_STATE_TTL_MS = 6 * 60 * 60 * 1000

export default function App() {
  const [sessionToken, setSessionToken] = useState<string>('')
  const [isInitialized, setIsInitialized] = useState(false)
  const [currentPath, setCurrentPath] = useState(window.location.pathname)
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null)
  const [stripeSessionId, setStripeSessionId] = useState<string | null>(null)

  useEffect(() => {
    async function initializeApp() {
      try {
        // Get or create session
        const session = await getOrCreateSession()
        setSessionToken(session.session_token)

        // Check if returning from payment
        const params = new URLSearchParams(window.location.search)
        const payment = params.get('payment')
        // Accept both 'session_id' (from Stripe redirect) and 'assessment_id' (legacy)
        const assessmentId = params.get('session_id') || params.get('assessment_id')

        // Store payment params in state AND localStorage (to persist across re-renders)
        // DON'T strip query params - let CalculatorApp also read them
        if (payment || assessmentId) {
          setPaymentStatus(payment)
          setStripeSessionId(assessmentId)
          // Persist to localStorage in case of re-renders, stamped with the
          // time so a stale success state from an earlier visit expires.
          localStorage.setItem('paymentStatus', payment || '')
          localStorage.setItem('stripeSessionId', assessmentId || '')
          localStorage.setItem('paymentStateSavedAt', String(Date.now()))
          console.log('[App] Payment params detected:', { payment, assessmentId })
        } else {
          // Check localStorage as fallback, but only within the TTL window.
          // Without this, any browser that ever completed a payment booted
          // straight into the "Payment Successful" screen on every future
          // visit and could get stranded on the saved-answers error.
          const storedPaymentStatus = localStorage.getItem('paymentStatus')
          const storedSessionId = localStorage.getItem('stripeSessionId')
          const savedAtRaw = localStorage.getItem('paymentStateSavedAt')
          const savedAt = savedAtRaw ? parseInt(savedAtRaw, 10) : 0
          const isFresh = savedAt > 0 && (Date.now() - savedAt) < PAYMENT_STATE_TTL_MS

          if (storedPaymentStatus && isFresh) {
            setPaymentStatus(storedPaymentStatus)
            setStripeSessionId(storedSessionId)
            console.log('[App] Restored payment params from localStorage:', { storedPaymentStatus, storedSessionId })
          } else if (storedPaymentStatus) {
            // Stale (or un-stamped pre-fix) payment state. Clear it AND reset the
            // persisted calculator so this visit starts clean at Step 1 rather
            // than resuming a paid step. resetForm keeps isPremium/assessmentId
            // for paid users, so drop those first to fully clear the slate.
            console.log('[App] Stale payment state expired — resetting to a fresh calculator')
            localStorage.removeItem('paymentStatus')
            localStorage.removeItem('stripeSessionId')
            localStorage.removeItem('paymentStateSavedAt')
            useFormStore.setState({ isPremium: false, assessmentId: null })
            useFormStore.getState().resetForm()
          }
        }

        setIsInitialized(true)
      } catch (error) {
        console.error('Failed to initialize app:', error)
        setIsInitialized(true) // Continue even if initialization fails
      }
    }

    initializeApp()

    // Listen for popstate events to update current path
    const handlePopState = () => {
      setCurrentPath(window.location.pathname)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  // Route to success page if path is /assessment/success
  if (currentPath === '/assessment/success') {
    return (
      <div className="min-h-screen">
        <AssessmentSuccess />
      </div>
    )
  }

  // Detect if embedded in another page (calculator.html has other content)
  const isEmbedded = document.querySelector('header') !== null || document.querySelector('.layout-wrapper-2026') !== null;

  return (
    <div className={isEmbedded ? "" : "min-h-screen bg-gray-50"}>
      <CalculatorApp
        sessionToken={sessionToken}
        paymentStatus={paymentStatus}
        stripeSessionId={stripeSessionId}
      />
    </div>
  )
}
