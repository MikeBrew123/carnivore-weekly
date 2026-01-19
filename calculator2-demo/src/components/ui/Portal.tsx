import { ReactNode, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface PortalProps {
  children: ReactNode
  containerId?: string
}

export default function Portal({ children, containerId = 'portal-root' }: PortalProps) {
  const [container, setContainer] = useState<HTMLElement | null>(null)

  useEffect(() => {
    // Find or create portal container at document.body level
    let portalRoot = document.getElementById(containerId)

    if (!portalRoot) {
      portalRoot = document.createElement('div')
      portalRoot.id = containerId
      portalRoot.style.position = 'relative'
      portalRoot.style.zIndex = '9999'
      document.body.appendChild(portalRoot)
    }

    setContainer(portalRoot)

    return () => {
      // Don't remove on unmount - other portals might use it
    }
  }, [containerId])

  if (!container) return null

  return createPortal(children, container)
}
