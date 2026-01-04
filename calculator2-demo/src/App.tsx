import { useEffect, useState } from 'react'
import { getOrCreateSession } from './lib/session'
import CalculatorApp from './components/calculator/CalculatorApp'

export default function App() {
  const [sessionToken, setSessionToken] = useState<string>('')
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    async function initializeApp() {
      try {
        // Get or create session
        const session = await getOrCreateSession()
        setSessionToken(session.session_token)

        // Check if returning from payment
        const params = new URLSearchParams(window.location.search)
        const paymentStatus = params.get('payment')
        const stripeSessionId = params.get('session_id')

        // Helper function to scroll to form
        const scrollToForm = () => {
          setTimeout(() => {
            const formElement = document.querySelector('[data-form-section]') || document.querySelector('form')
            if (formElement) {
              const rect = formElement.getBoundingClientRect()
              if (rect.top > window.innerHeight || rect.top < 0) {
                formElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
              }
            }
          }, 100)
        }

        // Handle free tier with 100% discount
        if (paymentStatus === 'free') {
          scrollToForm()
          console.log('[App] Premium access granted (free tier)')
          window.history.replaceState({}, '', window.location.pathname)
        }
        // Handle paid Stripe payment
        else if (paymentStatus === 'success' && stripeSessionId) {
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
              scrollToForm()
              console.log('[App] Premium access granted after payment verification')
            } else {
              console.warn('[App] Payment verification failed or not paid')
            }
          } catch (verifyError) {
            console.error('[App] Payment verification error:', verifyError)
          }

          window.history.replaceState({}, '', window.location.pathname)
        }

        setIsInitialized(true)
      } catch (error) {
        console.error('Failed to initialize app:', error)
        setIsInitialized(true) // Continue even if initialization fails
      }
    }

    initializeApp()
  }, [])

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CalculatorApp sessionToken={sessionToken} />
    </div>
  )
}
