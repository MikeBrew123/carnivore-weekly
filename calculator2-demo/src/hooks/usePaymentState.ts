import { useEffect, useState, useCallback } from 'react'

export interface PaymentState {
  paymentStatus: string | null
  stripeSessionId: string | null
  isPremium: boolean
  isPaymentSuccess: boolean
  isLoading: boolean
}

export interface PaymentActions {
  setIsPremium: (value: boolean) => void
  clearPaymentState: () => void
  restoreFromSession: (sessionId: string) => Promise<any>
}

interface UsePaymentStateProps {
  initialPaymentStatus?: string | null
  initialStripeSessionId?: string | null
}

/**
 * usePaymentState - Isolated payment state management hook
 *
 * Responsibilities:
 * 1. Check URL for session_id and payment params
 * 2. Manage isPremium state (free -> paid transition)
 * 3. Persist payment state to localStorage
 * 4. Restore form data from Supabase after payment
 *
 * This hook is STRUCTURALLY INDEPENDENT of the calculator UI.
 * It can be tested in isolation and won't break if CSS changes.
 */
export function usePaymentState({
  initialPaymentStatus,
  initialStripeSessionId,
}: UsePaymentStateProps = {}): [PaymentState, PaymentActions] {
  // Core payment state
  const [paymentStatus, setPaymentStatus] = useState<string | null>(initialPaymentStatus || null)
  const [stripeSessionId, setStripeSessionId] = useState<string | null>(initialStripeSessionId || null)
  const [isPremium, setIsPremium] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Derived state
  const isPaymentSuccess = paymentStatus === 'success' || paymentStatus === 'free'

  // Initialize from URL params and localStorage on mount
  useEffect(() => {
    const initPaymentState = () => {
      console.log('[usePaymentState] Initializing...')

      // 1. Check URL params first (highest priority - direct from Stripe redirect)
      const urlParams = new URLSearchParams(window.location.search)
      const urlPayment = urlParams.get('payment')
      const urlSessionId = urlParams.get('session_id') || urlParams.get('assessment_id')

      if (urlPayment || urlSessionId) {
        setPaymentStatus(urlPayment)
        setStripeSessionId(urlSessionId)

        // Persist to localStorage, stamped with the time so a stale success
        // state from an earlier visit expires instead of showing forever.
        if (urlPayment) localStorage.setItem('paymentStatus', urlPayment)
        if (urlSessionId) localStorage.setItem('stripeSessionId', urlSessionId)
        localStorage.setItem('paymentStateSavedAt', String(Date.now()))

        // Mark as premium if payment succeeded
        if (urlPayment === 'success' || urlPayment === 'free') {
          setIsPremium(true)
        }

        // Track payment cancel and scroll to upgrade CTA
        if (urlPayment === 'cancelled') {
          if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('event', 'calculator_payment_cancelled', {
              event_category: 'calculator',
              event_label: 'payment_cancelled',
            })
          }
          // Post-hydration scroll fallback
          setTimeout(() => {
            document.getElementById('upgrade-cta')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }, 300)
        }

        setIsLoading(false)
        return
      }

      // 2. Check props (passed from parent App.tsx)
      if (initialPaymentStatus || initialStripeSessionId) {
        console.log('[usePaymentState] Using props:', { initialPaymentStatus, initialStripeSessionId })
        setPaymentStatus(initialPaymentStatus || null)
        setStripeSessionId(initialStripeSessionId || null)

        if (initialPaymentStatus === 'success' || initialPaymentStatus === 'free') {
          setIsPremium(true)
        }

        setIsLoading(false)
        return
      }

      // 3. Check localStorage (fallback for page refreshes), but only honor it
      // for a short window. Without this, any browser that ever completed a
      // payment booted straight into the "Payment Successful" screen on every
      // future visit (and hit the "snag loading your saved answers" error once
      // the session row was gone) — the calculator became unusable for repeat
      // visitors. 6h is long enough to finish the health profile after paying,
      // short enough that a later visit starts a fresh run.
      const storedPaymentStatus = localStorage.getItem('paymentStatus')
      const storedSessionId = localStorage.getItem('stripeSessionId')
      const savedAtRaw = localStorage.getItem('paymentStateSavedAt')
      const savedAt = savedAtRaw ? parseInt(savedAtRaw, 10) : 0
      const PAYMENT_STATE_TTL_MS = 6 * 60 * 60 * 1000
      const isFresh = savedAt > 0 && (Date.now() - savedAt) < PAYMENT_STATE_TTL_MS

      if (storedPaymentStatus && isFresh) {
        console.log('[usePaymentState] Restored from localStorage:', { storedPaymentStatus, storedSessionId })
        setPaymentStatus(storedPaymentStatus)
        setStripeSessionId(storedSessionId)

        if (storedPaymentStatus === 'success' || storedPaymentStatus === 'free') {
          setIsPremium(true)
        }
      } else if (storedPaymentStatus) {
        // Stale (or un-stamped pre-fix) payment state — clear it plus the
        // persisted calculator progress so the visitor gets a clean Step 1
        // next load instead of being stranded.
        console.log('[usePaymentState] Stale payment state expired — clearing for a fresh start')
        localStorage.removeItem('paymentStatus')
        localStorage.removeItem('stripeSessionId')
        localStorage.removeItem('paymentStateSavedAt')
        localStorage.removeItem('carnivore-calculator-form')
      }

      setIsLoading(false)
    }

    initPaymentState()
  }, [initialPaymentStatus, initialStripeSessionId])

  // Auto-upgrade to premium when payment succeeds
  useEffect(() => {
    if (isPaymentSuccess && !isPremium) {
      console.log('[usePaymentState] Payment success detected - upgrading to premium')
      setIsPremium(true)
    }
  }, [isPaymentSuccess, isPremium])

  // Clear payment state (after user completes flow)
  const clearPaymentState = useCallback(() => {
    console.log('[usePaymentState] Clearing payment state')
    localStorage.removeItem('paymentStatus')
    localStorage.removeItem('stripeSessionId')
    localStorage.removeItem('paymentStateSavedAt')
    setPaymentStatus(null)
    setStripeSessionId(null)
    // Note: isPremium stays true - user paid, they keep premium access
  }, [])

  // Restore form data from Supabase session
  const restoreFromSession = useCallback(async (sessionId: string) => {
    console.log('[usePaymentState] Restoring session from Supabase:', sessionId)

    try {
      const response = await fetch(
        `https://carnivore-report-api-production.iambrew.workers.dev/get-session?id=${sessionId}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch session: ${response.status}`)
      }

      const sessionData = await response.json()
      console.log('[usePaymentState] Session restored:', sessionData)

      return sessionData
    } catch (error) {
      console.error('[usePaymentState] Failed to restore session:', error)
      throw error
    }
  }, [])

  // Return state and actions
  const state: PaymentState = {
    paymentStatus,
    stripeSessionId,
    isPremium,
    isPaymentSuccess,
    isLoading,
  }

  const actions: PaymentActions = {
    setIsPremium,
    clearPaymentState,
    restoreFromSession,
  }

  return [state, actions]
}

export default usePaymentState
