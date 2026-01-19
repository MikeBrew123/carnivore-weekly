import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

console.log('[Calculator] Script executing - mounting app...')

const rootEl = document.getElementById('root')
console.log('[Calculator] Root element found:', !!rootEl)

if (!rootEl) {
  console.error('[Calculator] FATAL: #root element not found!')
} else {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
  console.log('[Calculator] App mounted successfully')
}
