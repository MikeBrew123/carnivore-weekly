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

          // THE RETURN FROM THE EMAILED LINK.
          //
          // The link the webhook sends carries the assessment UUID, and it may be
          // followed days later, on a different device, or in a browser whose payment
          // state has aged out of the six-hour window and been cleared. In all of
          // those the local store is empty, and the reader would see their paid
          // assessment as a blank calculator.
          //
          // The row is the authority, so it is fetched and used as the BASE, with any
          // value this browser actually holds kept on top: same-session returns are
          // the fresher edit, a cold return has nothing to keep. Undefined fields are
          // dropped by JSON.stringify on the way to Step 4, so an empty local field
          // cannot overwrite a stored answer either way.
          if (assessmentId && (payment === 'success' || payment === 'free')) {
            try {
              const res = await fetch(
                `https://carnivore-report-api-production.iambrew.workers.dev/get-session?id=${encodeURIComponent(assessmentId)}`
              )
              if (res.ok) {
                const saved = await res.json()
                const store = useFormStore.getState()
                if (saved?.form_data && typeof saved.form_data === 'object') {
                  const merged: Record<string, unknown> = { ...saved.form_data }
                  // Local values are kept ONLY when this browser's stored progress
                  // belongs to the assessment the link names. The persisted form has no
                  // expiry (the payment flag does), so without that test a later
                  // abandoned run on the same browser, or a second person in the
                  // household, would overwrite the paid row field by field and the
                  // report would be built from the mixture. When they do not match, the
                  // row is the authority and is taken whole.
                  if (store.assessmentId === assessmentId) {
                    for (const [k, v] of Object.entries(store.form || {})) {
                      if (v === undefined || v === null || v === '') continue
                      if (Array.isArray(v) && v.length === 0) continue  // an empty default, not an answer
                      merged[k] = v
                    }
                  }
                  // The session COLUMNS win over form_data for these two: the address
                  // that reached Stripe is the one the resume email went to, and Step 4
                  // tells the reader which address that was. The success screen used to
                  // apply this overlay on its own; it now short-circuits because the
                  // form is already restored, so it has to happen here or the screen
                  // names an address we did not write to.
                  if (saved.email) merged.email = saved.email
                  if (saved.first_name) merged.firstName = saved.first_name
                  store.setForm(merged as Partial<typeof store.form>)
                }
                // They paid; the row says so. Step 4 must not ask them to buy again.
                if (saved?.payment_status === 'completed' || saved?.payment_status === 'success') {
                  store.setIsPremium(true)
                }
                store.setAssessmentId(assessmentId)
                console.log('[App] Restored paid assessment from the server')
              } else {
                console.warn('[App] Could not restore the paid assessment:', res.status)
              }
            } catch (err) {
              // A failed restore must not block the screen. They still reach Step 4,
              // and the server merges their answers into the row it already holds.
              console.warn('[App] Restore request failed:', err)
            }
          }
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
