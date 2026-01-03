import { useEffect } from 'react'
import { useFormStore } from './stores/formStore'
import { getOrCreateSession, detectCountryFromHeaders } from './lib/session'
import { detectUnits } from './lib/calculations'
import CalculatorWizard from './components/CalculatorWizard'

export default function App() {
  const { setSessionToken, setUnits, setIsPremium, setCurrentStep } = useFormStore()

  useEffect(() => {
    async function initializeApp() {
      try {
        // Get or create session
        const session = await getOrCreateSession()
        setSessionToken(session.session_token)

        // Detect user's preferred units from country/Cloudflare headers
        const country = detectCountryFromHeaders()
        const units = detectUnits(country)
        setUnits(units)

        // Check if returning from payment
        const params = new URLSearchParams(window.location.search)
        const paymentStatus = params.get('payment')
        const stripeSessionId = params.get('session_id')

        // Helper function to scroll to top after step change
        const scrollToForm = () => {
          window.scrollTo({
            top: 0,
            behavior: 'smooth'
          })
        }

        // Handle free tier with 100% discount
        if (paymentStatus === 'free') {
          setIsPremium(true)
          setCurrentStep(4) // Jump to Health step (Step 4)
          scrollToForm()
          console.log('[App] Premium access granted (free tier)')
          window.history.replaceState({}, '', window.location.pathname)
        }
        // Handle paid Stripe payment
        else if (paymentStatus === 'success' && stripeSessionId) {
          // Verify payment with Stripe before granting premium access
          try {
            const verifyResponse = await fetch(
              'https://carnivore-report-api-production.iambrew.workers.dev/verify-payment',
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  stripeSessionId: stripeSessionId,
                  sessionToken: session.session_token
                })
              }
            )

            const verifyResult = await verifyResponse.json()
            console.log('[App] Payment verification result:', verifyResult)

            if (verifyResult.success && verifyResult.paid) {
              setIsPremium(true)
              setCurrentStep(4) // Jump to Health step (Step 4)
              scrollToForm()
              console.log('[App] Premium access granted after payment verification')
            } else {
              console.warn('[App] Payment verification failed or not paid')
            }
          } catch (verifyError) {
            console.error('[App] Payment verification error:', verifyError)
          }

          // Clean up URL regardless of verification result
          window.history.replaceState({}, '', window.location.pathname)
        }
      } catch (error) {
        console.error('Failed to initialize app:', error)
      }
    }

    initializeApp()
  }, [setSessionToken, setUnits, setIsPremium, setCurrentStep])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <CalculatorWizard />
    </div>
  )
}
