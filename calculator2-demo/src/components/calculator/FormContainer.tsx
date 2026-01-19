import { ReactNode, useEffect, useState } from 'react'

interface FormContainerProps {
  children: ReactNode
  sidebar?: ReactNode
  hideSidebar?: boolean
}

/**
 * FormContainer - Layout wrapper for calculator form
 *
 * BOMBPROOF MODE: When mounted inside .calculator-slot (calculator.html),
 * this component strips its outer padding/background to avoid double-wrapping.
 * The parent page handles the layout; we just render the form card.
 */
export default function FormContainer({
  children,
  sidebar,
  hideSidebar = false,
}: FormContainerProps) {
  // Detect if we're embedded in the bombproof calculator slot
  const [isEmbedded, setIsEmbedded] = useState(false)

  useEffect(() => {
    // Check if parent is .calculator-slot (bombproof mode)
    const root = document.getElementById('root')
    const inCalculatorSlot = root?.closest('.calculator-slot') !== null
    const hasPageHeader = document.querySelector('.header-2026') !== null

    setIsEmbedded(inCalculatorSlot || hasPageHeader)
  }, [])

  // BOMBPROOF MODE: Minimal wrapper when embedded
  if (isEmbedded) {
    return (
      <div className="w-full" style={{ padding: '0', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: '650px', margin: '0 auto', boxSizing: 'border-box' }}>
          {/* Form card only - no outer background/padding */}
          <div
            className="px-6 md:px-12 py-8 md:py-10"
            style={{
              backgroundColor: '#1a1a1a',
              borderTop: '3px solid #ffd700',
              borderLeft: '1px solid #333',
              borderRight: '1px solid #333',
              borderBottom: '1px solid #333',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25), 0 2px 8px rgba(0, 0, 0, 0.15)',
              boxSizing: 'border-box',
            }}
          >
            {children}
          </div>
        </div>
      </div>
    )
  }

  // STANDALONE MODE: Full layout with background (for /assets/calculator2/index.html)
  return (
    <div className="w-full" style={{ backgroundColor: '#F2F0E6', minHeight: '100vh', padding: '40px 20px', boxSizing: 'border-box' }}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ boxSizing: 'border-box' }}>
        {/* Main form area */}
        <div className="lg:col-span-2" style={{ boxSizing: 'border-box' }}>
          <div style={{ maxWidth: '650px', margin: '0 auto', boxSizing: 'border-box' }}>
            {/* Progress indicator and form card */}
            <div
              className="px-6 md:px-12 py-8 md:py-10"
              style={{
                backgroundColor: '#1a1a1a',
                borderTop: '3px solid #ffd700',
                borderLeft: '1px solid #333',
                borderRight: '1px solid #333',
                borderBottom: '1px solid #333',
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25), 0 2px 8px rgba(0, 0, 0, 0.15)',
                boxSizing: 'border-box',
              }}
            >
              {children}
            </div>
          </div>
        </div>

        {/* Sidebar - hidden on mobile, optional on desktop */}
        {sidebar && !hideSidebar && (
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              {sidebar}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
