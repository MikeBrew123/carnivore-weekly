import { ReactNode } from 'react'

interface FormContainerProps {
  children: ReactNode
  sidebar?: ReactNode
  hideSidebar?: boolean
}

export default function FormContainer({
  children,
  sidebar,
  hideSidebar = false,
}: FormContainerProps) {
  return (
    <div className="w-full" style={{ backgroundColor: '#F2F0E6', minHeight: '100vh', padding: '40px 20px' }}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form area */}
        <div className="lg:col-span-2">
          <div
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '12px',
              padding: '2rem',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
              maxWidth: '600px',
              margin: '0 auto'
            }}
          >
            {children}
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
