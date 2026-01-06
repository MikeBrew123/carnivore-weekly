import { useEffect, useState } from 'react'
import { getOrCreateSession } from './lib/session'
import CalculatorApp from './components/calculator/CalculatorApp'
import AssessmentSuccess from './components/AssessmentSuccess'

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
          // Persist to localStorage in case of re-renders
          localStorage.setItem('paymentStatus', payment || '')
          localStorage.setItem('stripeSessionId', assessmentId || '')
          console.log('[App] Payment params detected:', { payment, assessmentId })
        } else {
          // Check localStorage as fallback
          const storedPaymentStatus = localStorage.getItem('paymentStatus')
          const storedSessionId = localStorage.getItem('stripeSessionId')
          if (storedPaymentStatus) {
            setPaymentStatus(storedPaymentStatus)
            setStripeSessionId(storedSessionId)
            console.log('[App] Restored payment params from localStorage:', { storedPaymentStatus, storedSessionId })
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
