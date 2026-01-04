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
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form area */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-lg p-8 lg:p-10">
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
