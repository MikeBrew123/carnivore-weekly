import { useEffect } from 'react'
import { useFormStore } from './stores/formStore'
import { getOrCreateSession, detectCountryFromHeaders } from './lib/session'
import { detectUnits } from './lib/calculations'
import CalculatorWizard from './components/CalculatorWizard'

export default function App() {
  const { setSessionToken, setUnits, setIsPremium } = useFormStore()

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
        const sessionId = params.get('session')

        if (paymentStatus === 'success' && sessionId) {
          setIsPremium(true)
          // Clean up URL
          window.history.replaceState({}, '', window.location.pathname)
        }
      } catch (error) {
        console.error('Failed to initialize app:', error)
      }
    }

    initializeApp()
  }, [setSessionToken, setUnits, setIsPremium])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <CalculatorWizard />
    </div>
  )
}
